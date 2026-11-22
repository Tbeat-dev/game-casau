import * as THREE from 'three';
import {
  animateContestantRig,
  CONTESTANT_VARIANTS,
  createContestantRig,
  type ContestantAnimState,
  type ContestantRig,
} from './models/ContestantModel';
import type { ActivePickup } from './PickupManager';
import { canEnterSafeZone } from './rules';
import { SafeZoneManager } from './SafeZoneManager';
import { SkillManager } from './SkillManager';
import { StatusEffectManager } from './StatusEffectManager';
import type { NPCPersonality, RoundConfig, SkillId } from './types';

export interface NPCAgent {
  id: string;
  name: string;
  personality: NPCPersonality;
  rig: ContestantRig;
  x: number;
  y: number;
  z: number;
  vy: number;
  yaw: number;
  baseSpeed: number;
  intelligence: number;
  fearRadius: number;
  alive: boolean;
  inWater: boolean;
  inSafeZone: boolean;
  followedFakeSignal: boolean;
  reactionTimer: number;
  gaitDistance: number;
  targetZoneId: string | null;
  skillId: SkillId;
}

const PERSONALITY_CYCLE: NPCPersonality[] = [
  'Aggressive',
  'Cautious',
  'Strategic',
  'Panicked',
  'Cooperative',
];

const PERSONALITY_SKILL: Record<NPCPersonality, SkillId> = {
  Aggressive: 'nuoc_rut',
  Cautious: 'mat_cu',
  Strategic: 'giu_cho',
  Panicked: 'phao_tre',
  Cooperative: 'keo_ban',
};

export class NPCController {
  public agents: NPCAgent[] = [];
  private elapsed = 0;

  constructor(
    private safeZones: SafeZoneManager,
    private skills: SkillManager,
    private statusEffects: StatusEffectManager
  ) {}

  spawnAll(scene: THREE.Scene): void {
    for (const a of this.agents) {
      scene.remove(a.rig.root);
      a.rig.dispose();
    }
    this.agents = [];

    for (let i = 1; i <= 11; i++) {
      const variant = CONTESTANT_VARIANTS[i];
      const personality = PERSONALITY_CYCLE[(i - 1) % PERSONALITY_CYCLE.length];
      const skillId = PERSONALITY_SKILL[personality];
      const id = `npc_${String(i).padStart(2, '0')}`;
      const rig = createContestantRig(variant);

      const side = i % 2 === 0 ? -1 : 1;
      const rank = Math.floor((i - 1) / 2);
      const sx = side * (2.3 + (rank % 3) * 1.45);
      const sz = 25.0 + Math.floor(rank / 3) * 2.1;

      rig.root.position.set(sx, 0.48, sz);
      rig.root.rotation.y = Math.PI;
      scene.add(rig.root);

      const isPassive = skillId === 'phao_tre' || skillId === 'thang_bang_tre';
      this.skills.registerActor(id, {
        Q: isPassive ? 'nuoc_rut' : skillId,
        P: isPassive ? skillId : null,
      });

      this.agents.push({
        id,
        name: variant.name,
        personality,
        rig,
        x: sx,
        y: 0.48,
        z: sz,
        vy: 0,
        yaw: Math.PI,
        baseSpeed:
          personality === 'Aggressive'
            ? 6.1
            : personality === 'Panicked'
            ? 5.9
            : personality === 'Cautious'
            ? 5.2
            : 5.5,
        intelligence:
          personality === 'Strategic'
            ? 0.92
            : personality === 'Cautious'
            ? 0.85
            : personality === 'Panicked'
            ? 0.55
            : 0.72,
        fearRadius: personality === 'Panicked' ? 14 : personality === 'Cautious' ? 11 : 7.5,
        alive: true,
        inWater: false,
        inSafeZone: false,
        followedFakeSignal: false,
        reactionTimer: 0.25 + (i % 4) * 0.14,
        gaitDistance: 0,
        targetZoneId: null,
        skillId,
      });
    }
  }

  resetForRound(): void {
    this.agents.forEach((a, idx) => {
      if (!a.alive) return;
      const i = idx + 1;
      const side = i % 2 === 0 ? -1 : 1;
      const rank = Math.floor((i - 1) / 2);
      a.x = side * (2.3 + (rank % 3) * 1.45);
      a.z = 25.0 + Math.floor(rank / 3) * 2.1;
      a.y = 0.48;
      a.vy = 0;
      a.yaw = Math.PI;
      a.inWater = false;
      a.inSafeZone = false;
      a.followedFakeSignal = false;
      a.targetZoneId = null;
      a.reactionTimer = 0.2 + (idx % 4) * 0.16;
      a.rig.root.position.set(a.x, a.y, a.z);
    });
  }

  onSignalIssued(isValid: boolean): void {
    for (const a of this.agents) {
      if (!a.alive) continue;
      if (!isValid) {
        const foolChance = 1 - a.intelligence;
        a.followedFakeSignal = Math.random() < foolChance * 0.65;
      } else {
        a.followedFakeSignal = false;
      }
    }
  }

  update(
    dt: number,
    round: RoundConfig,
    signalActive: boolean,
    signalIsFake: boolean,
    crocX: number,
    crocZ: number,
    timeRemaining = 20,
    activePickups: readonly ActivePickup[] = []
  ): void {
    this.elapsed += dt;
    const activeZones = this.safeZones.getActiveZones();

    for (const a of this.agents) {
      if (!a.alive) {
        animateContestantRig(a.rig, 'eliminated', this.elapsed, a.gaitDistance);
        continue;
      }

      if (a.reactionTimer > 0 && signalActive) {
        a.reactionTimer -= dt;
      }

      const isBlinded = this.statusEffects.hasDebuff(a.id, 'mu');
      const isDebuffed =
        isBlinded ||
        this.statusEffects.hasDebuff(a.id, 'giam_toc') ||
        this.statusEffects.hasDebuff(a.id, 'chong_mat');
      const hasShield = this.statusEffects.hasBuff(a.id, 'la_chan_sen');

      const effectiveFear = a.fearRadius + (isBlinded ? 2.8 : 0);
      const crocDist = Math.hypot(crocX - a.x, crocZ - a.z);
      const terrified = crocDist < effectiveFear;

      let tx = a.x;
      let tz = a.z;
      let wantsMove = false;

      if (signalActive && a.reactionTimer <= 0) {
        if (signalIsFake && a.followedFakeSignal) {
          tx = 0;
          tz = 0;
          wantsMove = true;
        } else if (!signalIsFake && activeZones.length > 0) {
          let targetZone = activeZones.find((z) => z.id === a.targetZoneId);
          if (!targetZone || !canEnterSafeZone(targetZone, a.id)) {
            const open = activeZones
              .filter((z) => canEnterSafeZone(z, a.id))
              .sort(
                (z1, z2) =>
                  Math.hypot(z1.x - a.x, z1.z - a.z) - Math.hypot(z2.x - a.x, z2.z - a.z)
              );
            targetZone = open[0] ?? activeZones[0];
            a.targetZoneId = targetZone?.id ?? null;
          }

          // Opportunistic pickup seeking when safe time remains (> 7.5s) & not terrified
          let pickedRoute = false;
          if (!terrified && timeRemaining > 7.5 && activePickups.length > 0 && !a.inSafeZone) {
            const maxSeek = a.personality === 'Aggressive' ? 10.5 : a.personality === 'Cautious' ? 4.5 : 6.0;
            const candidate = activePickups.find((pk) => {
              if (a.personality === 'Cautious' && pk.buff.rarity === 'rare') return false;
              const dPk = Math.hypot(pk.x - a.x, pk.z - a.z);
              const dCroc = Math.hypot(pk.x - crocX, pk.z - crocZ);
              return dPk <= maxSeek && dCroc > 6.0;
            });
            if (candidate) {
              tx = candidate.x;
              tz = candidate.z;
              wantsMove = true;
              pickedRoute = true;
            }
          }

          if (!pickedRoute && targetZone) {
            const distToZone = Math.hypot(targetZone.x - a.x, targetZone.z - a.z);
            if (distToZone > targetZone.radius * 0.55) {
              if (
                a.z > 18 &&
                targetZone.z < 10 &&
                (a.personality === 'Cautious' || a.personality === 'Strategic' || isBlinded)
              ) {
                const useLeft = a.x < 0;
                tx = useLeft ? -10.5 : 10.5;
                tz = 14.5;
              } else {
                tx = targetZone.x;
                tz = targetZone.z;
              }
              wantsMove = true;
            }
          }
        }
      }

      if (terrified && round.allowedSkills.includes('nuoc_rut')) {
        this.skills.activateSlot(a.id, 'Q', {
          isGrounded: a.vy === 0,
          onPlatformOrBridge: false,
          worldX: a.x,
          worldZ: a.z,
          dirX: Math.sin(a.yaw),
          dirZ: Math.cos(a.yaw),
        });
      } else if (
        a.personality === 'Strategic' &&
        a.targetZoneId &&
        round.allowedSkills.includes('giu_cho')
      ) {
        const tzObj = activeZones.find((z) => z.id === a.targetZoneId);
        if (tzObj && Math.hypot(tzObj.x - a.x, tzObj.z - a.z) < tzObj.radius + 2.5) {
          const res = this.skills.activateSlot(a.id, 'Q', {
            isGrounded: true,
            onPlatformOrBridge: false,
            worldX: a.x,
            worldZ: a.z,
            dirX: 0,
            dirZ: 1,
          });
          if (res.ok) this.safeZones.reserveSpot(tzObj.id, a.id);
        }
      }

      let moveX = 0;
      let moveZ = 0;
      if (wantsMove) {
        const dx = tx - a.x;
        const dz = tz - a.z;
        const len = Math.hypot(dx, dz) || 1;
        moveX += dx / len;
        moveZ += dz / len;
      }

      if (terrified && crocDist > 0.1) {
        const fx = (a.x - crocX) / crocDist;
        const fz = (a.z - crocZ) / crocDist;
        moveX += fx * 1.35;
        moveZ += fz * 1.35;
        wantsMove = true;
      }

      const speedMul = this.skills.isSkillActive(a.id, 'nuoc_rut') ? 1.7 : 1.0;
      const effectMul = this.statusEffects.getSpeedMultiplier(a.id, 0, false);
      const waterSlow = a.inWater ? 0.72 : 1.0;
      const curSpeed = wantsMove ? a.baseSpeed * speedMul * effectMul * waterSlow : 0;

      if (wantsMove) {
        const mLen = Math.hypot(moveX, moveZ) || 1;
        moveX /= mLen;
        moveZ /= mLen;
        a.x += moveX * curSpeed * dt;
        a.z += moveZ * curSpeed * dt;
        a.gaitDistance += curSpeed * dt;

        const targetYaw = Math.atan2(moveX, moveZ);
        let diff = targetYaw - a.yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        a.yaw += diff * Math.min(1, dt * 10);
      }

      const maxR = this.safeZones.getArenaRadius() - 0.8;
      const rDist = Math.hypot(a.x, a.z);
      if (rDist > maxR) {
        a.x = (a.x / rDist) * maxR;
        a.z = (a.z / rDist) * maxR;
      }

      const surf = this.safeZones.getSurfaceAt(a.x, a.z);
      if (surf.isMovingPlatform) {
        a.x += surf.platformVelX * dt;
        a.z += surf.platformVelZ * dt;
      }
      a.inWater = surf.surfaceType === 'water';
      a.y = THREE.MathUtils.lerp(a.y, surf.height, 1 - Math.exp(-14 * dt));

      if (surf.inActiveSafeZone && surf.zoneId) {
        a.inSafeZone = this.safeZones.registerOccupant(surf.zoneId, a.id);
      } else {
        a.inSafeZone = false;
      }

      a.rig.root.position.set(a.x, a.y, a.z);
      a.rig.root.rotation.y = a.yaw;
      a.rig.shadowDisc.visible = !a.inWater || hasShield || isDebuffed;
      const discMat = a.rig.shadowDisc.material as THREE.MeshBasicMaterial;
      if (hasShield) {
        discMat.color.setHex(0xe0a526);
        discMat.opacity = 0.72;
      } else if (isDebuffed) {
        discMat.color.setHex(0xb3261e);
        discMat.opacity = 0.58;
      } else {
        discMat.color.setHex(0x16120d);
        discMat.opacity = 0.35;
      }

      let anim: ContestantAnimState = 'idle';
      if (terrified) anim = 'panic';
      else if (this.skills.isSkillActive(a.id, 'nuoc_rut')) anim = 'dash';
      else if (curSpeed > 4.5) anim = 'run';
      else if (curSpeed > 0.5) anim = 'walk';
      animateContestantRig(a.rig, anim, this.elapsed, a.gaitDistance);
    }
  }
}
