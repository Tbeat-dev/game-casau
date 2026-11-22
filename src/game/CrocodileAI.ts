import * as THREE from 'three';
import { ArenaManager } from './ArenaManager';
import { AudioManager } from './AudioManager';
import { EventBus } from './EventBus';
import { animateCrocodileRig, createCrocodileRig, type CrocodileRig } from './models/CrocodileModel';
import { isTargetHitByCrocBite, isTargetInCrocVision } from './rules';
import { SafeZoneManager } from './SafeZoneManager';
import { SkillManager } from './SkillManager';
import type { CrocodileState, EffectiveRoundDifficulty, RoundConfig } from './types';

export interface CrocTargetCandidate {
  id: string;
  x: number;
  y: number;
  z: number;
  inWater: boolean;
  alive: boolean;
}

const PATROL_WAYPOINTS: [number, number][] = [
  [-12, 10],
  [0, 12],
  [12, 8],
  [11, -8],
  [0, -14],
  [-12, -8],
];

const MAX_LAKE_RADIUS = 29.6;

export class CrocodileAI {
  public rig: CrocodileRig;
  public x = 0;
  public z = 6;
  public yaw = Math.PI;
  public state: CrocodileState = 'PATROL';
  public targetId: string | null = null;

  private waypointIndex = 0;
  private patrolDir = 1;
  private swapTimer = 6;
  private stateTimer = 0;
  private attackCooldown = 0;
  private stunTimer = 0;
  private chaseMemoryTimer = 0;
  private attackHitTriggered = false;
  private nearMissTriggered = false;
  private burstTimer = 0;
  private burstCooldown = 9.0;
  private elapsed = 0;
  private splashTimer = 0;

  constructor(
    private bus: EventBus,
    private safeZones: SafeZoneManager,
    private skills: SkillManager,
    private arena: ArenaManager,
    private audio: AudioManager
  ) {
    this.rig = createCrocodileRig();
    this.rig.root.position.set(this.x, -0.08, this.z);
  }

  addToScene(scene: THREE.Scene): void {
    scene.add(this.rig.root);
  }

  resetForRound(round: RoundConfig): void {
    this.x = -8;
    this.z = 5;
    this.yaw = 0.5;
    this.state = 'PATROL';
    this.targetId = null;
    this.swapTimer = round.crocDirectionSwapInterval;
    this.attackCooldown = 0;
    this.stunTimer = 0;
    this.chaseMemoryTimer = 0;
    this.stateTimer = 0;
    this.attackHitTriggered = false;
    this.nearMissTriggered = false;
    this.burstTimer = 0;
    this.burstCooldown = 9.0;
    this.rig.root.position.set(this.x, -0.08, this.z);
    this.rig.root.rotation.y = this.yaw;
  }

  stun(duration: number): void {
    this.stunTimer = duration;
    this.chaseMemoryTimer = 0;
    this.setState('STUNNED', null);
    this.arena.spawnParticles(this.x, 0.5, this.z, 14, 0xf3e8cf, 5.2, 0.25);
  }

  private setState(next: CrocodileState, targetId: string | null): void {
    if (this.state !== next || this.targetId !== targetId) {
      this.state = next;
      this.targetId = targetId;
      this.bus.emit('croc:state', { state: next, targetId });
    }
  }

  update(
    dt: number,
    round: RoundConfig,
    candidates: CrocTargetCandidate[],
    matCuActive: boolean,
    onAttackHit: (targetId: string) => void,
    options?: {
      profile?: EffectiveRoundDifficulty;
      playerNoisy?: boolean;
      onNearMissSplash?: (targetId: string) => void;
    }
  ): void {
    this.elapsed += dt;
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.chaseMemoryTimer = Math.max(0, this.chaseMemoryTimer - dt);

    // Periodic short speed burst (especially Final round 110% short waves)
    const burstCap = options?.profile?.crocBurstSpeed ?? round.crocSpeed;
    if (this.burstTimer > 0) {
      this.burstTimer = Math.max(0, this.burstTimer - dt);
    } else if (burstCap > round.crocSpeed + 0.15) {
      this.burstCooldown -= dt;
      if (this.burstCooldown <= 0 && (this.state === 'CHASE' || this.state === 'DETECT')) {
        this.burstTimer = 2.4;
        this.burstCooldown = 10.5;
        this.arena.spawnParticles(this.x, 0.15, this.z, 8, 0xa8e4e6, 3.6, 0.2);
      }
    }
    const activeCrocSpeed = this.burstTimer > 0 ? burstCap : round.crocSpeed;

    // Update Mắt Cú vision cone visualization (aligned along +Z snout heading)
    this.rig.visionCone.visible = matCuActive;
    if (matCuActive) {
      const halfAngleRad = ((round.crocVisionAngleDeg * 0.5) * Math.PI) / 180;
      const widthScale = Math.sin(halfAngleRad) / Math.SQRT1_2;
      this.rig.visionCone.scale.set(
        round.crocDetectRange * widthScale,
        1,
        round.crocDetectRange
      );
    }

    let moveSpeed = 0;
    let attackProgress = 0;

    // 1. Stunned state (Phao Tre counter-hit)
    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      if (this.stunTimer <= 0) {
        this.setState('PATROL', null);
      }
    } else {
      // 2. Check Tiếng Trống lure (active unless already mid-lunge ATTACK)
      const lure = this.skills.getActiveDrumLure();
      const dLure = lure ? Math.hypot(lure.x - this.x, lure.z - this.z) : Infinity;

      if (lure && lure.remaining > 0 && this.state !== 'ATTACK' && dLure <= 24) {
        this.setState('LURED', null);
        this.chaseMemoryTimer = 0;
        if (dLure > 1.4) {
          moveSpeed = round.crocSpeed * 0.92;
          this.moveToward(lure.x, lure.z, moveSpeed, dt, true);
        } else {
          moveSpeed = 1.4;
          this.turnToward(lure.x, lure.z, dt * 4.5);
        }
      } else {
        // Direction swap mechanic for patrol
        this.swapTimer -= dt;
        if (this.swapTimer <= 0) {
          this.swapTimer = round.crocDirectionSwapInterval;
          this.patrolDir *= -1;
          this.waypointIndex =
            (this.waypointIndex + this.patrolDir + PATROL_WAYPOINTS.length) %
            PATROL_WAYPOINTS.length;
        }

        // Find best visible target (or keep tracking current chase target briefly)
        let detected: CrocTargetCandidate | null = null;
        let bestScore = Infinity;

        for (const c of candidates) {
          if (!c.alive || c.y > 1.35) continue;
          const dist = Math.hypot(c.x - this.x, c.z - this.z);
          const isCurrentTarget = this.targetId === c.id && this.chaseMemoryTimer > 0;
          const heardPlayer =
            Boolean(options?.profile?.hearingCueEnabled) &&
            c.id === 'player' &&
            Boolean(options?.playerNoisy) &&
            dist <= round.crocDetectRange * 0.92;
          const visible =
            heardPlayer ||
            isTargetInCrocVision({
              crocX: this.x,
              crocZ: this.z,
              crocYaw: this.yaw,
              targetX: c.x,
              targetZ: c.z,
              detectRange: round.crocDetectRange * (c.inWater ? 1.2 : 0.78),
              visionAngleDeg: round.crocVisionAngleDeg,
            }) ||
            (isCurrentTarget &&
              dist <= round.crocDetectRange * 1.15 &&
              (dist <= 5.5 ||
                isTargetInCrocVision({
                  crocX: this.x,
                  crocZ: this.z,
                  crocYaw: this.yaw,
                  targetX: c.x,
                  targetZ: c.z,
                  detectRange: round.crocDetectRange * 1.15,
                  visionAngleDeg: 145,
                })));

          if (visible) {
            const score = dist * (c.inWater ? 0.65 : 1.25) * (isCurrentTarget ? 0.8 : 1.0);
            if (score < bestScore) {
              bestScore = score;
              detected = c;
            }
          }
        }

        if (this.state === 'ATTACK') {
          this.stateTimer += dt;
          attackProgress = Math.min(1, this.stateTimer / 0.66);
          const target = candidates.find((c) => c.id === this.targetId && c.alive);

          // Windup 0.30s (track target & open jaws) then lunge bite 0.30..0.66s
          if (this.stateTimer < 0.30) {
            moveSpeed = activeCrocSpeed * 0.28;
            if (target) {
              this.moveToward(target.x, target.z, moveSpeed, dt, false);
            }
          } else {
            moveSpeed = activeCrocSpeed * 1.5;
            if (target) {
              this.moveToward(target.x, target.z, moveSpeed, dt, false);
              if (
                !this.attackHitTriggered &&
                isTargetHitByCrocBite({
                  crocX: this.x,
                  crocZ: this.z,
                  crocYaw: this.yaw,
                  targetX: target.x,
                  targetY: target.y,
                  targetZ: target.z,
                  snoutOffset: 1.55,
                  biteRadius: 1.65,
                  maxVerticalReach: 1.25,
                })
              ) {
                this.attackHitTriggered = true;
                this.audio.playCrocSnap();
                const sx = this.x + Math.sin(this.yaw) * 1.55;
                const sz = this.z + Math.cos(this.yaw) * 1.55;
                this.arena.spawnParticles(sx, 0.4, sz, 16, 0x9ad8e0, 5.5, 0.24);
                onAttackHit(target.id);
              } else if (
                !this.attackHitTriggered &&
                !this.nearMissTriggered &&
                this.stateTimer >= 0.48
              ) {
                const distToSnout = Math.hypot(
                  target.x - (this.x + Math.sin(this.yaw) * 1.55),
                  target.z - (this.z + Math.cos(this.yaw) * 1.55)
                );
                if (distToSnout <= 3.6 && target.y <= 0.75) {
                  this.nearMissTriggered = true;
                  this.arena.spawnParticles(this.x, 0.2, this.z, 10, 0x9ad8e0, 4.4, 0.2);
                  options?.onNearMissSplash?.(target.id);
                }
              }
            } else {
              // Lunge straight ahead if target vanished
              this.x += Math.sin(this.yaw) * moveSpeed * dt;
              this.z += Math.cos(this.yaw) * moveSpeed * dt;
            }
          }

          if (this.stateTimer >= 0.68) {
            this.attackCooldown = 1.45;
            this.chaseMemoryTimer = 0;
            this.setState('RETURN', null);
          }
        } else if (detected && this.attackCooldown <= 0) {
          this.chaseMemoryTimer = 1.1;
          const dist = Math.hypot(detected.x - this.x, detected.z - this.z);
          if (this.state === 'PATROL' || this.state === 'RETURN' || this.state === 'IDLE') {
            this.setState('DETECT', detected.id);
            this.stateTimer = 0;
          } else if (this.state === 'DETECT') {
            this.stateTimer += dt;
            moveSpeed = activeCrocSpeed * 0.3;
            this.moveToward(detected.x, detected.z, moveSpeed, dt, false);
            if (this.stateTimer >= 0.25) {
              this.setState('CHASE', detected.id);
            }
          } else if (this.state === 'CHASE' || this.state === 'LURED') {
            this.setState('CHASE', detected.id);
            moveSpeed = activeCrocSpeed * (detected.inWater ? 1.15 : 0.92);
            this.moveToward(detected.x, detected.z, moveSpeed, dt, false);
            if (dist <= 3.15) {
              this.setState('ATTACK', detected.id);
              this.stateTimer = 0;
              this.attackHitTriggered = false;
              this.nearMissTriggered = false;
            }
          }
        } else {
          // PATROL / RETURN
          if (this.state === 'CHASE' || this.state === 'DETECT' || this.state === 'LURED') {
            this.setState('RETURN', null);
          }
          const [wx, wz] = PATROL_WAYPOINTS[this.waypointIndex];
          const dWp = Math.hypot(wx - this.x, wz - this.z);
          if (dWp < 2.2) {
            this.waypointIndex =
              (this.waypointIndex + this.patrolDir + PATROL_WAYPOINTS.length) %
              PATROL_WAYPOINTS.length;
            if (this.state === 'RETURN') this.setState('PATROL', null);
          }
          moveSpeed = activeCrocSpeed * 0.65;
          this.moveToward(wx, wz, moveSpeed, dt, true);
        }
      }
    }

    // Clamp inside lake perimeter (never crawl onto outer grandstands/trees)
    const radial = Math.hypot(this.x, this.z);
    if (radial > MAX_LAKE_RADIUS) {
      this.x = (this.x / radial) * MAX_LAKE_RADIUS;
      this.z = (this.z / radial) * MAX_LAKE_RADIUS;
    }

    // Unified transform & surface sync (runs in ALL states including LURED & STUNNED)
    const surf = this.safeZones.getSurfaceAt(this.x, this.z);
    const targetY =
      surf.surfaceType === 'water'
        ? -0.08
        : surf.surfaceType === 'bridge'
        ? -0.14 // swim underneath wooden bridges instead of clipping through deck
        : Math.min(0.16, surf.height - 0.18);

    this.rig.root.position.set(
      this.x,
      THREE.MathUtils.lerp(this.rig.root.position.y, targetY, 1 - Math.exp(-8 * dt)),
      this.z
    );
    this.rig.root.rotation.y = this.yaw;

    // Periodic water wake splash
    this.splashTimer += dt;
    if ((surf.surfaceType === 'water' || surf.surfaceType === 'bridge') && moveSpeed > 0.5 && this.splashTimer > 0.28) {
      this.splashTimer = 0;
      this.arena.spawnParticles(this.x, 0.05, this.z, 3, 0xa8e4e6, 2.2, 0.14);
    }

    animateCrocodileRig(this.rig, this.elapsed, moveSpeed, this.state, attackProgress);
  }

  private turnToward(tx: number, tz: number, rate: number): void {
    const desired = Math.atan2(tx - this.x, tz - this.z);
    let diff = desired - this.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.yaw += diff * Math.min(1, rate);
  }

  private moveToward(
    tx: number,
    tz: number,
    speed: number,
    dt: number,
    strongIslandAvoidance: boolean
  ): void {
    let steerX = tx - this.x;
    let steerZ = tz - this.z;
    const len = Math.hypot(steerX, steerZ);
    if (len < 0.01) return;
    steerX /= len;
    steerZ /= len;

    // Deflect away from raised land islands / temple so crocodile skirts shorelines
    for (const z of this.safeZones.getAllZones()) {
      if (z.type === 'platform') continue;
      const dx = this.x - z.x;
      const dz = this.z - z.z;
      const dist = Math.hypot(dx, dz);
      const buffer = strongIslandAvoidance ? z.radius + 1.8 : z.radius - 0.15;
      if (dist < buffer && dist > 0.01) {
        const weight = strongIslandAvoidance ? 1.45 : 1.1;
        steerX += (dx / dist) * weight;
        steerZ += (dz / dist) * weight;
      }
    }

    const nLen = Math.hypot(steerX, steerZ) || 1;
    steerX /= nLen;
    steerZ /= nLen;

    this.x += steerX * speed * dt;
    this.z += steerZ * speed * dt;
    this.turnToward(this.x + steerX, this.z + steerZ, dt * 7.5);
  }
}
