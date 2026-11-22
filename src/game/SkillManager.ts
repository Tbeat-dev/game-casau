import skillsConfig from '../config/skills.json';
import { EventBus } from './EventBus';
import { canActivateSkill, getScaledSkillStats, selectDraftCards } from './rules';
import type { StatusEffectManager } from './StatusEffectManager';
import type {
  SkillDefinition,
  SkillDraftOption,
  SkillId,
  SkillSlotHUD,
} from './types';

export interface ActorSkillState {
  actorId: string;
  khiLuc: number;
  maxKhiLuc: number;
  slotQ: SkillId | null;
  slotR: SkillId | null;
  slotP: SkillId | null;
  levels: Partial<Record<SkillId, number>>;
  cooldowns: Partial<Record<SkillId, number>>;
  activeTimers: Partial<Record<SkillId, number>>;
  usesThisRound: Partial<Record<SkillId, number>>;
  drumUsesInRound: number;
}

export interface DrumLureEvent {
  x: number;
  z: number;
  remaining: number;
  effectiveness: number;
  actorId: string;
}

export class SkillManager {
  private definitions = new Map<SkillId, SkillDefinition>();
  private actors = new Map<string, ActorSkillState>();
  private allowedInRound: SkillId[] = ['nuoc_rut'];
  private activeLure: DrumLureEvent | null = null;

  constructor(
    private bus: EventBus,
    private statusEffects?: StatusEffectManager
  ) {
    for (const raw of skillsConfig.skills) {
      this.definitions.set(raw.id as SkillId, raw as SkillDefinition);
    }
  }

  getAllDefinitions(): SkillDefinition[] {
    return Array.from(this.definitions.values());
  }

  getDefinition(id: SkillId): SkillDefinition | undefined {
    return this.definitions.get(id);
  }

  setAllowedSkills(allowed: SkillId[]): void {
    this.allowedInRound = allowed;
  }

  registerActor(
    actorId: string,
    initialSlots: { Q?: SkillId | null; R?: SkillId | null; P?: SkillId | null }
  ): ActorSkillState {
    const levels: Partial<Record<SkillId, number>> = {};
    if (initialSlots.Q) levels[initialSlots.Q] = 1;
    if (initialSlots.R) levels[initialSlots.R] = 1;
    if (initialSlots.P) levels[initialSlots.P] = 1;

    const state: ActorSkillState = {
      actorId,
      khiLuc: skillsConfig.maxKhiLuc,
      maxKhiLuc: skillsConfig.maxKhiLuc,
      slotQ: initialSlots.Q ?? null,
      slotR: initialSlots.R ?? null,
      slotP: initialSlots.P ?? null,
      levels,
      cooldowns: {},
      activeTimers: {},
      usesThisRound: {},
      drumUsesInRound: 0,
    };
    this.actors.set(actorId, state);
    return state;
  }

  getActor(actorId: string): ActorSkillState | undefined {
    return this.actors.get(actorId);
  }

  resetRoundUses(): void {
    this.activeLure = null;
    for (const actor of this.actors.values()) {
      actor.usesThisRound = {};
      actor.drumUsesInRound = 0;
      actor.cooldowns = {};
      actor.activeTimers = {};
      actor.khiLuc = actor.maxKhiLuc;
    }
  }

  update(dt: number): void {
    if (this.activeLure) {
      this.activeLure.remaining -= dt;
      if (this.activeLure.remaining <= 0) {
        this.activeLure = null;
      }
    }

    for (const actor of this.actors.values()) {
      let anyActive = false;
      for (const k of Object.keys(actor.activeTimers) as SkillId[]) {
        const rem = (actor.activeTimers[k] ?? 0) - dt;
        if (rem > 0) {
          actor.activeTimers[k] = rem;
          anyActive = true;
        } else {
          delete actor.activeTimers[k];
        }
      }

      for (const k of Object.keys(actor.cooldowns) as SkillId[]) {
        const rem = (actor.cooldowns[k] ?? 0) - dt;
        if (rem > 0) {
          actor.cooldowns[k] = rem;
        } else {
          delete actor.cooldowns[k];
        }
      }

      // Khí lực regenerates only when not actively channeling a skill (modulated by Bình Khí / Kiệt Sức)
      if (!anyActive && actor.khiLuc < actor.maxKhiLuc) {
        const regenMul = this.statusEffects?.getKhiLucRegenMultiplier(actor.actorId) ?? 1.0;
        actor.khiLuc = Math.min(
          actor.maxKhiLuc,
          actor.khiLuc + skillsConfig.khiLucRegenPerSec * regenMul * dt
        );
      }
    }
  }

  isSkillActive(actorId: string, skillId: SkillId): boolean {
    const actor = this.actors.get(actorId);
    if (!actor) return false;
    return (actor.activeTimers[skillId] ?? 0) > 0;
  }

  hasPassive(actorId: string, skillId: SkillId): boolean {
    const actor = this.actors.get(actorId);
    if (!actor) return false;
    if (!this.allowedInRound.includes(skillId)) return false;
    return actor.slotP === skillId;
  }

  tryTriggerPhaoTre(actorId: string): boolean {
    const actor = this.actors.get(actorId);
    const def = this.definitions.get('phao_tre');
    if (!actor || !def || actor.slotP !== 'phao_tre') return false;
    if (!this.allowedInRound.includes('phao_tre')) return false;
    const used = actor.usesThisRound['phao_tre'] ?? 0;
    if (used >= (def.usesPerRound ?? 1)) return false;
    if (actor.khiLuc < def.khiLucCost) return false;

    actor.khiLuc -= def.khiLucCost;
    actor.usesThisRound['phao_tre'] = used + 1;
    actor.activeTimers['phao_tre'] = def.duration;
    this.bus.emit('skill:activated', { actorId, skillId: 'phao_tre', slot: 'P' });
    return true;
  }

  activateSlot(
    actorId: string,
    slot: 'Q' | 'R',
    ctx: { isGrounded: boolean; onPlatformOrBridge: boolean; worldX: number; worldZ: number; dirX: number; dirZ: number }
  ): { ok: boolean; skillId?: SkillId; reason?: string } {
    const actor = this.actors.get(actorId);
    if (!actor) return { ok: false, reason: 'No actor' };

    const skillId = slot === 'Q' ? actor.slotQ : actor.slotR;
    if (!skillId) return { ok: false, reason: 'Ô kỹ năng trống' };

    if (this.statusEffects?.getSilencedSlot(actorId) === slot) {
      const reason = `Ô [${slot}] đang bị Câm Lặng!`;
      if (actorId === 'player') {
        this.bus.emit('skill:blocked', { actorId, skillId, reason });
      }
      return { ok: false, skillId, reason };
    }

    const def = this.definitions.get(skillId);
    if (!def) return { ok: false, reason: 'Không tìm thấy kỹ năng' };

    const cdRem = actor.cooldowns[skillId] ?? 0;
    const used = actor.usesThisRound[skillId] ?? 0;
    const usesLeft = def.usesPerRound ? def.usesPerRound - used : 99;

    const check = canActivateSkill({
      skill: def,
      khiLuc: actor.khiLuc,
      cooldownRemaining: cdRem,
      allowedSkills: this.allowedInRound,
      isGrounded: ctx.isGrounded,
      onPlatformOrBridge: ctx.onPlatformOrBridge,
      usesLeft,
    });

    if (!check.allowed) {
      if (actorId === 'player') {
        this.bus.emit('skill:blocked', {
          actorId,
          skillId,
          reason: check.reason ?? 'Không thể dùng',
        });
      }
      return { ok: false, skillId, reason: check.reason };
    }

    const level = actor.levels[skillId] ?? 1;
    const scaled = getScaledSkillStats(def, level);
    const cdMul = this.statusEffects?.getCooldownMultiplier(actorId) ?? 1.0;
    const finalCooldown = Number((scaled.cooldown * cdMul).toFixed(2));

    actor.khiLuc -= def.khiLucCost;
    actor.cooldowns[skillId] = finalCooldown;
    actor.activeTimers[skillId] = scaled.duration;
    actor.usesThisRound[skillId] = used + 1;

    if (skillId === 'tieng_trong') {
      actor.drumUsesInRound += 1;
      const effectiveness = Math.max(0.35, 1 - (actor.drumUsesInRound - 1) * 0.3);
      this.activeLure = {
        x: ctx.worldX + ctx.dirX * 8,
        z: ctx.worldZ + ctx.dirZ * 8,
        remaining: scaled.duration * effectiveness,
        effectiveness,
        actorId,
      };
    }

    this.bus.emit('skill:activated', { actorId, skillId, slot });
    this.bus.emit('skill:cooldown', { actorId, skillId, remaining: finalCooldown });
    return { ok: true, skillId };
  }

  getActiveDrumLure(): DrumLureEvent | null {
    return this.activeLure;
  }

  generateDraftOptions(actorId: string, nextRoundNumber: number): SkillDraftOption[] {
    const actor = this.actors.get(actorId);
    return selectDraftCards(
      this.getAllDefinitions(),
      actor?.levels ?? {},
      nextRoundNumber
    );
  }

  applyDraftChoice(actorId: string, skillId: SkillId): void {
    const actor = this.actors.get(actorId);
    const def = this.definitions.get(skillId);
    if (!actor || !def) return;

    const cur = actor.levels[skillId] ?? 0;
    actor.levels[skillId] = Math.min(3, cur + 1);

    if (def.type === 'passive') {
      actor.slotP = skillId;
    } else if (actor.slotQ !== skillId && actor.slotR !== skillId) {
      if (!actor.slotQ) actor.slotQ = skillId;
      else if (!actor.slotR) actor.slotR = skillId;
      else actor.slotR = skillId; // Replace secondary active slot
    }
  }

  getHUDSlots(actorId: string): SkillSlotHUD[] {
    const actor = this.actors.get(actorId);
    const slots: ('Q' | 'R' | 'P')[] = ['Q', 'R', 'P'];
    return slots.map((slot) => {
      const skillId =
        slot === 'Q' ? actor?.slotQ : slot === 'R' ? actor?.slotR : actor?.slotP;
      const def = skillId ? this.definitions.get(skillId) ?? null : null;
      if (!def || !actor) {
        return {
          slot,
          skill: null,
          level: 0,
          cooldownRemaining: 0,
          cooldownTotal: 0,
          activeRemaining: 0,
          allowedInRound: true,
          canAfford: false,
          usesLeft: 0,
        };
      }
      const level = actor.levels[def.id] ?? 1;
      const scaled = getScaledSkillStats(def, level);
      const used = actor.usesThisRound[def.id] ?? 0;
      const usesLeft = def.usesPerRound ? Math.max(0, def.usesPerRound - used) : 99;
      return {
        slot,
        skill: def,
        level,
        cooldownRemaining: actor.cooldowns[def.id] ?? 0,
        cooldownTotal: scaled.cooldown,
        activeRemaining: actor.activeTimers[def.id] ?? 0,
        allowedInRound: this.allowedInRound.includes(def.id),
        canAfford: actor.khiLuc >= def.khiLucCost && usesLeft > 0,
        usesLeft,
      };
    });
  }
}
