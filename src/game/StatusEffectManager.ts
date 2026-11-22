import buffsConfig from '../config/buffs.json';
import { EventBus } from './EventBus';
import {
  applyPureStatusEffect,
  computeEffectiveSpeedMultiplier,
  computeEffectiveVisionRange,
  type PureActorEffects,
} from './rules';
import type {
  ActiveEffectHUD,
  BuffDefinition,
  BuffId,
  DebuffDefinition,
  DebuffId,
  StoredItemHUD,
} from './types';

interface ActorStatusRecord extends PureActorEffects {
  storedItem: BuffId | null;
  silencedSlot: 'Q' | 'R' | null;
}

export class StatusEffectManager {
  private buffDefs = new Map<BuffId, BuffDefinition>();
  private debuffDefs = new Map<DebuffId, DebuffDefinition>();
  private actors = new Map<string, ActorStatusRecord>();

  constructor(private bus: EventBus) {
    for (const b of buffsConfig.buffs) {
      this.buffDefs.set(b.id as BuffId, b as BuffDefinition);
    }
    for (const d of buffsConfig.debuffs) {
      this.debuffDefs.set(d.id as DebuffId, d as DebuffDefinition);
    }
  }

  getBuffDef(id: BuffId): BuffDefinition | undefined {
    return this.buffDefs.get(id);
  }

  getDebuffDef(id: DebuffId): DebuffDefinition | undefined {
    return this.debuffDefs.get(id);
  }

  private ensureActor(actorId: string): ActorStatusRecord {
    let rec = this.actors.get(actorId);
    if (!rec) {
      rec = {
        buffs: [],
        debuffs: [],
        debuffImmunityRemaining: 0,
        storedItem: null,
        silencedSlot: null,
      };
      this.actors.set(actorId, rec);
    }
    return rec;
  }

  clearAll(): void {
    this.actors.clear();
  }

  /**
   * Buffs and debuffs always expire between rounds (including unused Lá Chắn Sen).
   */
  clearRoundEffects(): void {
    for (const [actorId, rec] of this.actors.entries()) {
      for (const b of rec.buffs) {
        this.bus.emit('effect:expired', { actorId, effectId: b.id as BuffId, kind: 'buff' });
      }
      for (const d of rec.debuffs) {
        this.bus.emit('effect:expired', { actorId, effectId: d.id as DebuffId, kind: 'debuff' });
      }
      rec.buffs = [];
      rec.debuffs = [];
      rec.debuffImmunityRemaining = 0;
      rec.storedItem = null;
      rec.silencedSlot = null;
    }
  }

  /**
   * Collects or applies a buff. Storable items (Bùa Giải, Lá Chắn Sen) go to [F] slot for player
   * (replacing any previous stored item with notice), or activate smartly for NPCs.
   */
  collectBuff(
    actorId: string,
    buffId: BuffId
  ): { appliedImmediately: boolean; replacedStored?: BuffId | null } {
    const def = this.buffDefs.get(buffId);
    if (!def) return { appliedImmediately: false };
    const rec = this.ensureActor(actorId);

    if (def.storable) {
      if (actorId === 'player') {
        const prev = rec.storedItem;
        rec.storedItem = buffId;
        return { appliedImmediately: false, replacedStored: prev };
      }
      // NPC smart usage: Bùa Giải cleanses immediately if debuffed, otherwise store; Lá Chắn Sen equips shield
      if (buffId === 'bua_giai') {
        if (rec.debuffs.length > 0) {
          this.applyBuffEffect(actorId, buffId);
          return { appliedImmediately: true };
        }
        rec.storedItem = buffId;
        return { appliedImmediately: false };
      }
      this.applyBuffEffect(actorId, buffId);
      return { appliedImmediately: true };
    }

    this.applyBuffEffect(actorId, buffId);
    return { appliedImmediately: true };
  }

  applyBuffEffect(actorId: string, buffId: BuffId): void {
    const def = this.buffDefs.get(buffId);
    if (!def) return;
    const rec = this.ensureActor(actorId);
    const dur = def.duration > 0 ? def.duration : 0.1;
    const res = applyPureStatusEffect(rec, buffId, 'buff', dur);

    if (buffId === 'bua_giai') {
      rec.silencedSlot = null;
    }

    if (res.status === 'applied') {
      this.bus.emit('effect:applied', { actorId, effectId: buffId, kind: 'buff', duration: dur });
    } else if (res.status === 'refreshed') {
      this.bus.emit('effect:refreshed', { actorId, effectId: buffId, kind: 'buff', duration: dur });
    }
  }

  useStoredItem(actorId: string): { ok: boolean; buffId?: BuffId; message?: string } {
    const rec = this.ensureActor(actorId);
    if (!rec.storedItem) {
      return { ok: false, message: 'Ô vật phẩm [F] đang trống' };
    }
    const used = rec.storedItem;
    const def = this.buffDefs.get(used);
    rec.storedItem = null;
    this.applyBuffEffect(actorId, used);
    return {
      ok: true,
      buffId: used,
      message:
        used === 'bua_giai'
          ? 'Đã dùng Bùa Giải — xóa toàn bộ bất lợi!'
          : `Kích hoạt ${def?.name ?? 'Vật phẩm'}!`,
    };
  }

  applyDebuff(actorId: string, debuffId: DebuffId, durationMul = 1.0): boolean {
    const def = this.debuffDefs.get(debuffId);
    if (!def) return false;
    const rec = this.ensureActor(actorId);
    const dur = Number((def.duration * durationMul).toFixed(2));
    const res = applyPureStatusEffect(rec, debuffId, 'debuff', dur);

    if (res.status === 'blocked') return false;

    if (debuffId === 'cam_lang' && !rec.silencedSlot) {
      rec.silencedSlot = Math.random() < 0.65 ? 'Q' : 'R';
    }

    if (res.status === 'applied') {
      this.bus.emit('effect:applied', {
        actorId,
        effectId: debuffId,
        kind: 'debuff',
        duration: dur,
      });
    } else if (res.status === 'refreshed') {
      this.bus.emit('effect:refreshed', {
        actorId,
        effectId: debuffId,
        kind: 'debuff',
        duration: dur,
      });
    }
    return true;
  }

  /**
   * Consumes active Lá Chắn Sen shield (never stacks with Phao Tre on the same bite).
   */
  tryConsumeLotusShield(actorId: string): boolean {
    const rec = this.actors.get(actorId);
    if (!rec) return false;
    const idx = rec.buffs.findIndex((b) => b.id === 'la_chan_sen');
    if (idx >= 0) {
      rec.buffs.splice(idx, 1);
      this.bus.emit('effect:expired', { actorId, effectId: 'la_chan_sen', kind: 'buff' });
      return true;
    }
    return false;
  }

  update(dt: number): void {
    for (const [actorId, rec] of this.actors.entries()) {
      rec.debuffImmunityRemaining = Math.max(0, rec.debuffImmunityRemaining - dt);

      const nextBuffs = [];
      for (const b of rec.buffs) {
        b.remaining -= dt;
        if (b.remaining > 0) {
          nextBuffs.push(b);
        } else {
          this.bus.emit('effect:expired', { actorId, effectId: b.id as BuffId, kind: 'buff' });
        }
      }
      rec.buffs = nextBuffs;

      const nextDebuffs = [];
      for (const d of rec.debuffs) {
        d.remaining -= dt;
        if (d.remaining > 0) {
          nextDebuffs.push(d);
        } else {
          if (d.id === 'cam_lang') {
            rec.silencedSlot = null;
          }
          this.bus.emit('effect:expired', { actorId, effectId: d.id as DebuffId, kind: 'debuff' });
        }
      }
      rec.debuffs = nextDebuffs;

      // NPC auto-cleanses with stored Bùa Giải if debuffed
      if (actorId !== 'player' && rec.storedItem === 'bua_giai' && rec.debuffs.length > 0) {
        this.useStoredItem(actorId);
      }
    }
  }

  hasBuff(actorId: string, buffId: BuffId): boolean {
    return this.actors.get(actorId)?.buffs.some((b) => b.id === buffId) ?? false;
  }

  hasDebuff(actorId: string, debuffId: DebuffId): boolean {
    return this.actors.get(actorId)?.debuffs.some((d) => d.id === debuffId) ?? false;
  }

  getSpeedMultiplier(
    actorId: string,
    skillBonus: number,
    hasBambooBalancePassive: boolean
  ): number {
    const rec = this.actors.get(actorId);
    return computeEffectiveSpeedMultiplier({
      skillBonus,
      activeBuffIds: rec ? rec.buffs.map((b) => b.id) : [],
      activeDebuffIds: rec ? rec.debuffs.map((d) => d.id) : [],
      hasBambooBalancePassive,
    });
  }

  getKhiLucRegenMultiplier(actorId: string): number {
    const hasBinhKhi = this.hasBuff(actorId, 'binh_khi');
    const hasKietSuc = this.hasDebuff(actorId, 'kiet_suc');
    let mul = 1.0;
    if (hasKietSuc) mul *= hasBinhKhi ? 0.85 : 0.5;
    if (hasBinhKhi) mul *= 1.65;
    return mul;
  }

  getCooldownMultiplier(actorId: string): number {
    return this.hasBuff(actorId, 'trong_hoi') ? 0.7 : 1.0;
  }

  getSilencedSlot(actorId: string): 'Q' | 'R' | null {
    return this.hasDebuff(actorId, 'cam_lang')
      ? this.actors.get(actorId)?.silencedSlot ?? null
      : null;
  }

  getBlindAndDizziness(params: {
    actorId: string;
    hasMatCuSkill: boolean;
    reduceBlindnessSetting: boolean;
    disableDizzinessSetting: boolean;
  }): { visibleRange: number; blindIntensity: number; dizzinessIntensity: number; deafened: boolean } {
    const vision = computeEffectiveVisionRange({
      baseRange: 58,
      hasBlindDebuff: this.hasDebuff(params.actorId, 'mu'),
      hasMatSangBuff: this.hasBuff(params.actorId, 'mat_sang'),
      hasMatCuSkill: params.hasMatCuSkill,
      reduceBlindnessSetting: params.reduceBlindnessSetting,
    });
    const hasDizzy = this.hasDebuff(params.actorId, 'chong_mat');
    const dizzy =
      hasDizzy && !params.disableDizzinessSetting
        ? params.reduceBlindnessSetting
          ? 0.45
          : 1.0
        : 0;
    return {
      visibleRange: vision.visibleRange,
      blindIntensity: vision.blindIntensity,
      dizzinessIntensity: dizzy,
      deafened: this.hasDebuff(params.actorId, 'u_tai'),
    };
  }

  getHUDData(actorId: string): {
    activeBuffs: ActiveEffectHUD[];
    activeDebuffs: ActiveEffectHUD[];
    storedItem: StoredItemHUD | null;
    silencedSlot: 'Q' | 'R' | null;
  } {
    const rec = this.actors.get(actorId);
    if (!rec) {
      return { activeBuffs: [], activeDebuffs: [], storedItem: null, silencedSlot: null };
    }
    const activeBuffs: ActiveEffectHUD[] = rec.buffs.slice(0, 3).map((b) => {
      const def = this.buffDefs.get(b.id as BuffId);
      return {
        id: b.id as BuffId,
        kind: 'buff',
        name: def?.name ?? b.id,
        rarity: def?.rarity ?? 'common',
        remaining: b.remaining,
        totalDuration: b.duration,
        icon: def?.icon ?? 'lotus',
        description: def?.description ?? '',
      };
    });
    const activeDebuffs: ActiveEffectHUD[] = rec.debuffs.slice(0, 2).map((d) => {
      const def = this.debuffDefs.get(d.id as DebuffId);
      return {
        id: d.id as DebuffId,
        kind: 'debuff',
        name: def?.name ?? d.id,
        remaining: d.remaining,
        totalDuration: d.duration,
        icon: def?.icon ?? 'mud',
        description: def?.source ?? '',
      };
    });
    const storedDef = rec.storedItem ? this.buffDefs.get(rec.storedItem) : undefined;
    const storedItem: StoredItemHUD | null = storedDef
      ? {
          id: storedDef.id,
          name: storedDef.name,
          icon: storedDef.icon,
          description: storedDef.description,
        }
      : null;
    return {
      activeBuffs,
      activeDebuffs,
      storedItem,
      silencedSlot: this.getSilencedSlot(actorId),
    };
  }
}
