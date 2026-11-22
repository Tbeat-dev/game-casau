import * as THREE from 'three';
import { ArenaManager } from './ArenaManager';
import { AudioManager } from './AudioManager';
import type { NPCAgent } from './NPCController';
import { SafeZoneManager } from './SafeZoneManager';
import { SkillManager } from './SkillManager';
import { StatusEffectManager } from './StatusEffectManager';
import type { SkillId } from './types';

export class PlayerController {
  public x = 0;
  public y = 0.48;
  public z = 28.0;
  public vy = 0;
  public yaw = 0; // 0 looks toward -Z (across the lake toward Đình Làng)
  public pitch = -0.06;

  public stamina = 100;
  public maxStamina = 100;
  public alive = true;
  public inWater = false;
  public inSafeZone = false;
  public onPlatformOrBridge = false;
  public followedFakeSignal = false;
  public escapedCrocCount = 0;
  public helpedTeammateCount = 0;

  private isGrounded = true;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private dashDirX = 0;
  private dashDirZ = -1;
  private velX = 0;
  private velZ = 0;
  private stepDist = 0;
  private headBobY = 0;
  private sensitivity = 1.0;
  private mudCheckTimer = 0;

  private keysHeld = new Set<string>();
  private jumpJustPressed = false;
  private draggingLook = false;
  private lastMouseX = 0;
  private lastMouseY = 0;

  constructor(
    private safeZones: SafeZoneManager,
    private skills: SkillManager,
    private arena: ArenaManager,
    private audio: AudioManager,
    private statusEffects: StatusEffectManager
  ) {}

  setSensitivity(val: number): void {
    this.sensitivity = Math.max(0.2, Math.min(2.5, val));
  }

  resetRun(): void {
    this.alive = true;
    this.stamina = this.maxStamina;
    this.escapedCrocCount = 0;
    this.helpedTeammateCount = 0;
    this.skills.registerActor('player', { Q: 'nuoc_rut', R: null, P: null });
    this.resetForRound();
  }

  resetForRound(): void {
    this.x = 0;
    this.y = 0.48;
    this.z = 28.0;
    this.vy = 0;
    this.velX = 0;
    this.velZ = 0;
    this.yaw = 0;
    this.pitch = -0.06;
    this.isGrounded = true;
    this.inWater = false;
    this.inSafeZone = false;
    this.followedFakeSignal = false;
    this.stamina = this.maxStamina;
    this.mudCheckTimer = 0;
    this.keysHeld.clear();
  }

  clearInputs(): void {
    this.keysHeld.clear();
    this.jumpJustPressed = false;
    this.draggingLook = false;
  }

  handleKeyDown(code: string): void {
    if (!this.keysHeld.has(code)) {
      if (code === 'Space') {
        this.jumpJustPressed = true;
        this.jumpBufferTimer = 0.12;
      }
    }
    this.keysHeld.add(code);
  }

  handleKeyUp(code: string): void {
    this.keysHeld.delete(code);
  }

  isKeyHeld(code: string): boolean {
    return this.keysHeld.has(code);
  }

  handleMouseMove(dx: number, dy: number): void {
    const scale = 0.0022 * this.sensitivity;
    this.yaw -= dx * scale;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * scale, -1.15, 1.05);
  }

  handleMouseDown(x: number, y: number): void {
    this.draggingLook = true;
    this.lastMouseX = x;
    this.lastMouseY = y;
  }

  handleMouseUp(): void {
    this.draggingLook = false;
  }

  handlePointerDrag(x: number, y: number): void {
    if (!this.draggingLook) return;
    this.handleMouseMove(x - this.lastMouseX, y - this.lastMouseY);
    this.lastMouseX = x;
    this.lastMouseY = y;
  }

  triggerSkill(
    slot: 'Q' | 'R',
    npcs: NPCAgent[]
  ): { ok: boolean; skillId?: SkillId; reason?: string } {
    if (!this.alive) return { ok: false };
    const fwdX = -Math.sin(this.yaw);
    const fwdZ = -Math.cos(this.yaw);
    const res = this.skills.activateSlot('player', slot, {
      isGrounded: this.isGrounded,
      onPlatformOrBridge: this.onPlatformOrBridge,
      worldX: this.x,
      worldZ: this.z,
      dirX: fwdX,
      dirZ: fwdZ,
    });

    if (res.ok && res.skillId) {
      this.audio.playSkill(res.skillId);
      this.applySkillImmediateEffect(res.skillId, fwdX, fwdZ, npcs);
    }
    return res;
  }

  private applySkillImmediateEffect(
    skillId: SkillId,
    fwdX: number,
    fwdZ: number,
    npcs: NPCAgent[]
  ): void {
    if (skillId === 'nuoc_rut') {
      const { moveX, moveZ } = this.computeMoveInput();
      if (Math.hypot(moveX, moveZ) > 0.1) {
        this.dashDirX = moveX;
        this.dashDirZ = moveZ;
      } else {
        this.dashDirX = fwdX;
        this.dashDirZ = fwdZ;
      }
      this.arena.spawnParticles(this.x, this.y + 0.4, this.z, 10, 0xf3e8cf, 3.8, 0.18);
    } else if (skillId === 'nhay_sen') {
      this.vy = 10.6;
      this.isGrounded = false;
      this.coyoteTimer = 0;
      this.x += fwdX * 0.45;
      this.z += fwdZ * 0.45;
      this.arena.spawnParticles(this.x, this.y + 0.2, this.z, 12, 0xe0a526, 4.2, 0.2);
    } else if (skillId === 'tieng_trong') {
      const lure = this.skills.getActiveDrumLure();
      if (lure) {
        this.arena.triggerDrumPulse(lure.x, lure.z);
        this.arena.spawnParticles(lure.x, 0.35, lure.z, 14, 0xe0a526, 5.0, 0.22);
      }
    } else if (skillId === 'giu_cho') {
      const nearest = this.safeZones.findNearestActiveZone(this.x, this.z);
      if (nearest && Math.hypot(nearest.x - this.x, nearest.z - this.z) <= nearest.radius + 2.8) {
        this.safeZones.reserveSpot(nearest.id, 'player');
        this.arena.spawnParticles(nearest.x, nearest.y + 0.4, nearest.z, 10, 0x4f6f3a, 3.0, 0.18);
      }
    } else if (skillId === 'keo_ban') {
      let closest: NPCAgent | null = null;
      let minD = 7.5;
      for (const n of npcs) {
        if (!n.alive) continue;
        const d = Math.hypot(n.x - this.x, n.z - this.z);
        if (d < minD) {
          minD = d;
          closest = n;
        }
      }
      if (closest) {
        closest.x = THREE.MathUtils.lerp(closest.x, this.x, 0.72);
        closest.z = THREE.MathUtils.lerp(closest.z, this.z, 0.72);
        this.helpedTeammateCount += 1;
        this.arena.spawnParticles(closest.x, closest.y + 0.5, closest.z, 12, 0x45e08a, 4.0, 0.2);
      }
    }
  }

  private computeMoveInput(): { moveX: number; moveZ: number } {
    let f = 0;
    let r = 0;
    if (this.keysHeld.has('KeyW') || this.keysHeld.has('ArrowUp')) f += 1;
    if (this.keysHeld.has('KeyS') || this.keysHeld.has('ArrowDown')) f -= 1;
    if (this.keysHeld.has('KeyD') || this.keysHeld.has('ArrowRight')) r += 1;
    if (this.keysHeld.has('KeyA') || this.keysHeld.has('ArrowLeft')) r -= 1;

    if (f === 0 && r === 0) return { moveX: 0, moveZ: 0 };
    const fwdX = -Math.sin(this.yaw);
    const fwdZ = -Math.cos(this.yaw);
    const rightX = Math.cos(this.yaw);
    const rightZ = -Math.sin(this.yaw);

    let mx = fwdX * f + rightX * r;
    let mz = fwdZ * f + rightZ * r;
    const len = Math.hypot(mx, mz) || 1;
    mx /= len;
    mz /= len;
    return { moveX: mx, moveZ: mz };
  }

  update(
    dt: number,
    signalIsFake: boolean,
    signalActive: boolean,
    debuffDurationMul = 1.0
  ): { movedDist: number; isNoisy: boolean } {
    if (!this.alive) return { movedDist: 0, isNoisy: false };

    const isDashing = this.skills.isSkillActive('player', 'nuoc_rut');
    const isLotusJump = this.skills.isSkillActive('player', 'nhay_sen');
    const hasBalance = this.skills.hasPassive('player', 'thang_bang_tre');

    const { moveX, moveZ } = this.computeMoveInput();
    const isMoving = Math.hypot(moveX, moveZ) > 0.05;

    const wantsSprint =
      (this.keysHeld.has('ShiftLeft') || this.keysHeld.has('ShiftRight')) &&
      isMoving &&
      this.stamina > 2;

    const regenMul = this.statusEffects.getKhiLucRegenMultiplier('player');
    if (wantsSprint && !isDashing) {
      this.stamina = Math.max(0, this.stamina - 24 * dt);
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + 16 * regenMul * dt);
    }

    const baseSpeed = wantsSprint ? 8.6 : 5.7;
    const waterPenalty = this.inWater ? 0.68 : 1.0;
    const lotusBoost = isLotusJump && !this.isGrounded ? 1.35 : 1.0;
    const effectMul = this.statusEffects.getSpeedMultiplier('player', 0, hasBalance);

    let targetVx = 0;
    let targetVz = 0;
    if (isDashing) {
      const dashBoost = this.statusEffects.getSpeedMultiplier('player', 0.15, hasBalance);
      targetVx = this.dashDirX * 11.4 * waterPenalty * dashBoost;
      targetVz = this.dashDirZ * 11.4 * waterPenalty * dashBoost;
    } else if (isMoving) {
      targetVx = moveX * baseSpeed * waterPenalty * lotusBoost * effectMul;
      targetVz = moveZ * baseSpeed * waterPenalty * lotusBoost * effectMul;
    }

    // Rêu Trơn reduces ground friction on platforms/bridges unless resisted by Thăng Bằng Tre or Rễ Vững
    const hasSlip =
      this.statusEffects.hasDebuff('player', 'reu_tron') &&
      !this.statusEffects.hasBuff('player', 're_vung') &&
      this.onPlatformOrBridge &&
      this.isGrounded;
    const frictionRate = hasSlip ? (hasBalance ? 10 : 3.2) : 22;
    const lerpK = 1 - Math.exp(-frictionRate * dt);
    this.velX = THREE.MathUtils.lerp(this.velX, targetVx, lerpK);
    this.velZ = THREE.MathUtils.lerp(this.velZ, targetVz, lerpK);

    // Track if player intentionally moved into water during a fake signal in Round 3
    if (signalActive && signalIsFake && this.inWater && Math.hypot(this.x, this.z) < 20) {
      this.followedFakeSignal = true;
    }

    // Coyote time & Jump buffer
    if (this.isGrounded) {
      this.coyoteTimer = 0.11;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }
    this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);

    if ((this.jumpJustPressed || this.jumpBufferTimer > 0) && this.coyoteTimer > 0) {
      this.vy = 7.4;
      this.isGrounded = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      this.audio.playJump();
    }
    this.jumpJustPressed = false;

    // Gravity & vertical integration
    this.vy -= 20.5 * dt;
    this.x += this.velX * dt;
    this.z += this.velZ * dt;
    this.y += this.vy * dt;

    // Clamp to arena boundary
    const maxR = this.safeZones.getArenaRadius() - 0.8;
    const curR = Math.hypot(this.x, this.z);
    if (curR > maxR) {
      this.x = (this.x / curR) * maxR;
      this.z = (this.z / curR) * maxR;
    }

    // Surface & safe-zone collision
    const surf = this.safeZones.getSurfaceAt(this.x, this.z);
    this.onPlatformOrBridge =
      surf.surfaceType === 'platform' || surf.surfaceType === 'bridge';

    if (surf.isMovingPlatform && this.isGrounded) {
      const carry = hasBalance ? 1.0 : 0.92;
      this.x += surf.platformVelX * dt * carry;
      this.z += surf.platformVelZ * dt * carry;
    }

    if (this.y <= surf.height) {
      this.y = surf.height;
      this.vy = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }

    const wasWater = this.inWater;
    this.inWater = surf.surfaceType === 'water' && this.y <= 0.05;
    if (!wasWater && this.inWater) {
      this.audio.playSplash();
      this.arena.spawnParticles(this.x, 0.05, this.z, 8, 0x9ad8e0, 3.2, 0.16);
    }

    // Mud patches on shore apply Giảm Tốc fairly (subject to immunity window & Rễ Vững)
    this.mudCheckTimer = Math.max(0, this.mudCheckTimer - dt);
    if (this.isGrounded && this.mudCheckTimer <= 0 && this.arena.isInMudZone(this.x, this.z)) {
      this.mudCheckTimer = 0.6;
      if (this.statusEffects.applyDebuff('player', 'giam_toc', debuffDurationMul)) {
        this.audio.playDebuffApplied();
        this.arena.spawnParticles(this.x, this.y + 0.15, this.z, 8, 0x5b3a24, 3.0, 0.18);
      }
    }

    if (surf.inActiveSafeZone && surf.zoneId && this.isGrounded) {
      this.inSafeZone = this.safeZones.registerOccupant(surf.zoneId, 'player');
    } else {
      this.inSafeZone = false;
    }

    // Distance-synced head-bob & footsteps
    const movedDist = Math.hypot(this.velX, this.velZ) * dt;
    if (this.isGrounded && movedDist > 0.001) {
      const prevStep = Math.floor(this.stepDist / 2.2);
      this.stepDist += movedDist;
      const nextStep = Math.floor(this.stepDist / 2.2);
      if (nextStep !== prevStep) {
        this.audio.playFootstep(this.inWater);
      }
      this.headBobY = Math.sin(this.stepDist * 3.1) * (wantsSprint ? 0.065 : 0.038);
    } else {
      this.headBobY = THREE.MathUtils.lerp(this.headBobY, 0, 1 - Math.exp(-10 * dt));
    }

    const isNoisy = (wantsSprint || this.inWater || isDashing) && movedDist > 0.02;
    return { movedDist, isNoisy };
  }

  applyCamera(
    camera: THREE.PerspectiveCamera,
    shakeX: number,
    shakeY: number,
    dizzinessIntensity = 0,
    elapsed = 0
  ): void {
    const swayX = dizzinessIntensity > 0 ? Math.sin(elapsed * 3.4) * 0.09 * dizzinessIntensity : 0;
    const swayRoll = dizzinessIntensity > 0 ? Math.sin(elapsed * 2.6) * 0.045 * dizzinessIntensity : 0;
    camera.position.set(this.x + shakeX + swayX, this.y + 1.62 + this.headBobY + shakeY, this.z);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = this.yaw;
    camera.rotation.x = this.pitch;
    camera.rotation.z = swayRoll;
  }
}
