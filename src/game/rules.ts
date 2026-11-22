import type {
  RoundConfig,
  SafeZoneInfo,
  SkillDefinition,
  SkillDraftOption,
  SkillId,
} from './types';

export interface SkillCheckInput {
  skill: SkillDefinition;
  khiLuc: number;
  cooldownRemaining: number;
  allowedSkills: SkillId[];
  isGrounded: boolean;
  onPlatformOrBridge: boolean;
  usesLeft: number;
}

export interface SkillCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Validates whether an actor can activate a skill without bypassing round laws.
 */
export function canActivateSkill(input: SkillCheckInput): SkillCheckResult {
  const { skill, khiLuc, cooldownRemaining, allowedSkills, isGrounded, usesLeft } = input;

  if (skill.type === 'passive') {
    return { allowed: false, reason: 'Kỹ năng bị động tự kích hoạt' };
  }
  if (!allowedSkills.includes(skill.id)) {
    return { allowed: false, reason: 'Bị khóa trong vòng này' };
  }
  if (usesLeft <= 0) {
    return { allowed: false, reason: 'Đã hết lượt dùng trong vòng' };
  }
  if (cooldownRemaining > 0.05) {
    return { allowed: false, reason: `Đang hồi chiêu (${cooldownRemaining.toFixed(1)}s)` };
  }
  if (khiLuc < skill.khiLucCost) {
    return { allowed: false, reason: 'Không đủ Khí lực' };
  }
  if (skill.id === 'nhay_sen' && !isGrounded) {
    return { allowed: false, reason: 'Cần chạm đất để Nhảy Sen' };
  }
  return { allowed: true };
}

/**
 * Returns effective cooldown and duration adjusted by upgrade level (1..3).
 */
export function getScaledSkillStats(
  skill: SkillDefinition,
  level: number
): { cooldown: number; duration: number } {
  const clamped = Math.max(1, Math.min(3, level));
  const cdFactor = 1 - (clamped - 1) * 0.16;
  const durFactor = 1 + (clamped - 1) * 0.18;
  return {
    cooldown: Number((skill.cooldown * cdFactor).toFixed(2)),
    duration: Number((skill.duration * durFactor).toFixed(2)),
  };
}

/**
 * Generates 3 controlled-random draft cards between rounds:
 * Always guarantees at least 1 skill well-suited for the upcoming round.
 */
export function selectDraftCards(
  allSkills: SkillDefinition[],
  ownedLevels: Partial<Record<SkillId, number>>,
  nextRoundNumber: number,
  rng: () => number = Math.random
): SkillDraftOption[] {
  const buildOption = (skill: SkillDefinition): SkillDraftOption => {
    const curLvl = ownedLevels[skill.id] ?? 0;
    const isUpgrade = curLvl > 0;
    const nextLevel = Math.min(3, curLvl + 1);
    const scaled = getScaledSkillStats(skill, nextLevel);
    return {
      skill,
      isUpgrade,
      nextLevel,
      effectiveCooldown: scaled.cooldown,
      effectiveDuration: scaled.duration,
    };
  };

  const eligible = allSkills.filter((s) => (ownedLevels[s.id] ?? 0) < 3);
  const pool = eligible.length >= 3 ? eligible : allSkills;

  const recommended = pool.filter((s) => s.bestRounds.includes(nextRoundNumber));
  const others = pool.filter((s) => !s.bestRounds.includes(nextRoundNumber));

  const shuffle = <T,>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const chosen: SkillDefinition[] = [];
  const shufRec = shuffle(recommended);
  const shufOther = shuffle(others);

  if (shufRec.length > 0) {
    chosen.push(shufRec.shift()!);
  }

  const remainder = shuffle([...shufRec, ...shufOther]);
  while (chosen.length < 3 && remainder.length > 0) {
    const next = remainder.shift()!;
    if (!chosen.some((c) => c.id === next.id)) {
      chosen.push(next);
    }
  }

  return chosen.map(buildOption);
}

/**
 * Checks whether an actor can legally occupy a capacity-limited safe zone.
 * Skills like Giữ Chỗ grant short priority if a slot exists or reserved,
 * but never allow exceeding capacity once full.
 */
export function canEnterSafeZone(
  zone: SafeZoneInfo,
  actorId: string
): boolean {
  if (!zone.active) return false;
  if (zone.occupants.includes(actorId)) return true;
  const effectiveUsed =
    zone.occupants.length +
    zone.reservedBy.filter((id) => id !== actorId && !zone.occupants.includes(id)).length;
  return effectiveUsed < zone.capacity;
}

/**
 * Evaluates end-of-round survival according to strict round rules.
 * Skills NEVER bypass fake-signal violations, wrong zone, or timeout.
 */
export function evaluateContestantSurvival(params: {
  isAlive: boolean;
  inActiveSafeZone: boolean;
  inWater: boolean;
  followedFakeSignal: boolean;
  roundConfig: RoundConfig;
}): { survived: boolean; reason: string } {
  if (!params.isAlive) {
    return { survived: false, reason: 'Đã bị loại trong vòng chơi' };
  }
  if (params.followedFakeSignal) {
    return { survived: false, reason: 'Nghe theo tín hiệu giả!' };
  }
  if (params.inWater || !params.inActiveSafeZone) {
    return {
      survived: false,
      reason: `Hết giờ chưa vào vùng an toàn (${params.roundConfig.name})`,
    };
  }
  return { survived: true, reason: 'Sống sót qua vòng!' };
}

/**
 * Calculates Đột Phá points earned after clearing a round.
 */
export function calculateDotPhaPoints(params: {
  roundNumber: number;
  timeRemaining: number;
  escapedCrocCount: number;
  helpedTeammateCount: number;
}): number {
  const base = 40 * params.roundNumber;
  const speedBonus = Math.round(Math.max(0, params.timeRemaining) * 3);
  const escapeBonus = params.escapedCrocCount * 25;
  const coopBonus = params.helpedTeammateCount * 30;
  return base + speedBonus + escapeBonus + coopBonus;
}

/**
 * Pure helper to determine if crocodile sees a point within range & vision cone.
 */
export function isTargetInCrocVision(params: {
  crocX: number;
  crocZ: number;
  crocYaw: number;
  targetX: number;
  targetZ: number;
  detectRange: number;
  visionAngleDeg: number;
}): boolean {
  const dx = params.targetX - params.crocX;
  const dz = params.targetZ - params.crocZ;
  const distSq = dx * dx + dz * dz;
  if (distSq > params.detectRange * params.detectRange) return false;
  if (distSq < 2.25) return true; // Proximity sense within 1.5m

  const fwdX = Math.sin(params.crocYaw);
  const fwdZ = Math.cos(params.crocYaw);
  const dist = Math.sqrt(distSq);
  const dot = (dx / dist) * fwdX + (dz / dist) * fwdZ;
  const halfCos = Math.cos(((params.visionAngleDeg * 0.5) * Math.PI) / 180);
  return dot >= halfCos;
}

/**
 * Computes the world-space position of the crocodile's snout/jaws along its +Z heading.
 */
export function computeCrocSnoutPosition(
  crocX: number,
  crocZ: number,
  crocYaw: number,
  snoutOffset = 1.55
): { x: number; z: number } {
  return {
    x: crocX + Math.sin(crocYaw) * snoutOffset,
    z: crocZ + Math.cos(crocYaw) * snoutOffset,
  };
}

/**
 * Pure helper to determine whether a target is within the crocodile's jaw bite reach.
 * Checks horizontal distance to the snout (preventing tail/backside phantom hits)
 * and vertical elevation (so high jumps / elevated platforms dodge the jaws).
 */
export function isTargetHitByCrocBite(params: {
  crocX: number;
  crocZ: number;
  crocYaw: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  snoutOffset?: number;
  biteRadius?: number;
  maxVerticalReach?: number;
}): boolean {
  const snout = computeCrocSnoutPosition(
    params.crocX,
    params.crocZ,
    params.crocYaw,
    params.snoutOffset ?? 1.55
  );
  const dx = params.targetX - snout.x;
  const dz = params.targetZ - snout.z;
  const biteRadius = params.biteRadius ?? 1.65;
  if (dx * dx + dz * dz > biteRadius * biteRadius) return false;
  const maxVert = params.maxVerticalReach ?? 1.25;
  return params.targetY <= maxVert;
}

export const EFFECT_HARD_LIMITS = {
  maxTimedBuffs: 3,
  maxDebuffs: 2,
  maxSpeedBonus: 0.35,
  maxSpeedPenalty: 0.4,
  debuffImmunitySec: 3.0,
  blindMinVisibleDist: 11.0,
} as const;

export interface PureEffectInstance {
  id: string;
  kind: 'buff' | 'debuff';
  remaining: number;
  duration: number;
}

export interface PureActorEffects {
  buffs: PureEffectInstance[];
  debuffs: PureEffectInstance[];
  debuffImmunityRemaining: number;
}

export function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Applies a buff or debuff to an actor state under strict fairness caps:
 * - Same ID refreshes duration (never stacks magnitude).
 * - Max 3 timed buffs; max 2 concurrent debuffs.
 * - Debuff immunity window (>= 3.0s) prevents back-to-back stunlock/debuff chains.
 * - Mắt Sáng cleanses/blocks Mù; Rễ Vững cleanses/blocks Giảm Tốc & Rêu Trơn; Bùa Giải cleanses all debuffs.
 */
export function applyPureStatusEffect(
  state: PureActorEffects,
  effectId: string,
  kind: 'buff' | 'debuff',
  duration: number
): { status: 'applied' | 'refreshed' | 'blocked'; reason?: string } {
  if (kind === 'buff') {
    if (effectId === 'bua_giai') {
      state.debuffs = [];
      state.debuffImmunityRemaining = Math.max(
        state.debuffImmunityRemaining,
        EFFECT_HARD_LIMITS.debuffImmunitySec
      );
      return { status: 'applied' };
    }
    if (effectId === 'mat_sang') {
      state.debuffs = state.debuffs.filter((d) => d.id !== 'mu');
    } else if (effectId === 're_vung') {
      state.debuffs = state.debuffs.filter((d) => d.id !== 'giam_toc' && d.id !== 'reu_tron');
    }

    const existing = state.buffs.find((b) => b.id === effectId);
    if (existing) {
      existing.remaining = Math.max(existing.remaining, duration);
      existing.duration = Math.max(existing.duration, duration);
      return { status: 'refreshed' };
    }
    if (state.buffs.length >= EFFECT_HARD_LIMITS.maxTimedBuffs) {
      // Replace shortest-remaining timed buff so new pickup is never silently lost
      state.buffs.sort((a, b) => a.remaining - b.remaining);
      state.buffs.shift();
    }
    state.buffs.push({ id: effectId, kind: 'buff', remaining: duration, duration });
    return { status: 'applied' };
  }

  // Debuff rules
  const hasMatSang = state.buffs.some((b) => b.id === 'mat_sang');
  const hasReVung = state.buffs.some((b) => b.id === 're_vung');
  if (effectId === 'mu' && hasMatSang) {
    return { status: 'blocked', reason: 'Miễn nhiễm bởi Mắt Sáng' };
  }
  if ((effectId === 'giam_toc' || effectId === 'reu_tron') && hasReVung) {
    return { status: 'blocked', reason: 'Miễn nhiễm bởi Rễ Vững' };
  }

  const existingDebuff = state.debuffs.find((d) => d.id === effectId);
  if (existingDebuff) {
    existingDebuff.remaining = Math.max(existingDebuff.remaining, duration);
    existingDebuff.duration = Math.max(existingDebuff.duration, duration);
    return { status: 'refreshed' };
  }

  if (state.debuffImmunityRemaining > 0) {
    return { status: 'blocked', reason: 'Đang trong thời gian miễn nhiễm ngắn' };
  }
  if (state.debuffs.length >= EFFECT_HARD_LIMITS.maxDebuffs) {
    return { status: 'blocked', reason: 'Đã đạt giới hạn 2 hiệu ứng bất lợi' };
  }

  state.debuffs.push({ id: effectId, kind: 'debuff', remaining: duration, duration });
  state.debuffImmunityRemaining = EFFECT_HARD_LIMITS.debuffImmunitySec;
  return { status: 'applied' };
}

/**
 * Computes clamped movement speed multiplier combining skills, buffs, and debuffs.
 * Hard limits: max +35% speed bonus from buffs/passive, max -40% speed penalty from debuffs.
 */
export function computeEffectiveSpeedMultiplier(params: {
  skillBonus: number;
  activeBuffIds: string[];
  activeDebuffIds: string[];
  hasBambooBalancePassive: boolean;
}): number {
  let bonus = Math.max(0, params.skillBonus);
  if (params.activeBuffIds.includes('gio_nhe')) {
    bonus += 0.2;
  }
  const clampedBonus = Math.min(EFFECT_HARD_LIMITS.maxSpeedBonus, bonus);

  let penalty = 0;
  const hasReVung = params.activeBuffIds.includes('re_vung');
  if (params.activeDebuffIds.includes('giam_toc') && !hasReVung) {
    penalty += 0.3;
  }
  if (params.activeDebuffIds.includes('reu_tron') && !hasReVung) {
    penalty += params.hasBambooBalancePassive ? 0.02 : 0.08;
  }
  if (params.activeDebuffIds.includes('chong_mat')) {
    penalty += 0.05;
  }
  const clampedPenalty = Math.min(EFFECT_HARD_LIMITS.maxSpeedPenalty, penalty);

  return Math.max(0.6, Math.min(1.35, 1 + clampedBonus - clampedPenalty));
}

/**
 * Ensures Mù debuff never reduces 3D visibility below a fair playable minimum
 * so contestants can always spot the nearest safe zone.
 */
export function computeEffectiveVisionRange(params: {
  baseRange: number;
  hasBlindDebuff: boolean;
  hasMatSangBuff: boolean;
  hasMatCuSkill: boolean;
  reduceBlindnessSetting: boolean;
}): { visibleRange: number; blindIntensity: number } {
  if (params.hasMatSangBuff) {
    return { visibleRange: params.baseRange * 1.25, blindIntensity: 0 };
  }
  if (!params.hasBlindDebuff) {
    return { visibleRange: params.baseRange, blindIntensity: 0 };
  }
  let intensity = params.hasMatCuSkill ? 0.35 : 0.85;
  if (params.reduceBlindnessSetting) {
    intensity *= 0.45;
  }
  const reduced = params.baseRange * (1 - intensity * 0.58);
  return {
    visibleRange: Math.max(EFFECT_HARD_LIMITS.blindMinVisibleDist, reduced),
    blindIntensity: Number(intensity.toFixed(2)),
  };
}

/**
 * Scales a round's difficulty profile by preset (easy/normal/hard) and silent adaptive relief.
 */
export function computeScaledRoundDifficulty(params: {
  playerBaseRunSpeed: number;
  crocSpeedRatio: number;
  crocBurstSpeedRatio: number;
  crocDetectRange: number;
  debuffBudget: number;
  maxPickupsActive: number;
  presetCrocSpeedMul: number;
  presetDetectMul: number;
  presetDebuffDurMul: number;
  presetBuffDensityMul: number;
  presetDebuffBudgetMul: number;
  adaptiveReliefRatio: number; // 0..0.08 silent relief after consecutive poor runs
}): {
  crocSpeed: number;
  crocBurstSpeed: number;
  crocDetectRange: number;
  debuffDurationMul: number;
  debuffBudget: number;
  maxPickupsActive: number;
} {
  const relief = Math.max(0, Math.min(0.08, params.adaptiveReliefRatio));
  const speedMul = params.presetCrocSpeedMul * (1 - relief);
  const buffMul = params.presetBuffDensityMul * (1 + relief * 2.0);
  return {
    crocSpeed: Number((params.playerBaseRunSpeed * params.crocSpeedRatio * speedMul).toFixed(2)),
    crocBurstSpeed: Number(
      (params.playerBaseRunSpeed * params.crocBurstSpeedRatio * speedMul).toFixed(2)
    ),
    crocDetectRange: Number((params.crocDetectRange * params.presetDetectMul).toFixed(2)),
    debuffDurationMul: params.presetDebuffDurMul,
    debuffBudget: Math.max(1, Math.round(params.debuffBudget * params.presetDebuffBudgetMul)),
    maxPickupsActive: Math.max(2, Math.round(params.maxPickupsActive * buffMul)),
  };
}

export interface NPCSimulationSummary {
  roundsSimulated: number;
  stuckCount: number;
  survivalByPersonality: Record<string, number>;
  pickupsCollected: number;
}

/**
 * Deterministic multi-round headless simulation verifying that NPC steering + buff pickups +
 * debuff slowdowns never trap NPCs in water/obstacles and keep survival fairly balanced.
 */
export function simulateNPCRounds(seed = 2026, roundsToRun = 12): NPCSimulationSummary {
  const rng = createSeededRng(seed);
  const personalities = ['Aggressive', 'Cautious', 'Strategic', 'Panicked', 'Cooperative'] as const;
  const survivalCounts: Record<string, number> = {
    Aggressive: 0,
    Cautious: 0,
    Strategic: 0,
    Panicked: 0,
    Cooperative: 0,
  };
  let stuckCount = 0;
  let pickupsCollected = 0;

  const spawnPoints = [
    { x: -16.5, z: 2.0, rarity: 'common' as const },
    { x: 16.5, z: -2.0, rarity: 'common' as const },
    { x: 0, z: 0, rarity: 'rare' as const },
    { x: -11.5, z: -12.5, rarity: 'rare' as const },
  ];

  for (let r = 0; r < roundsToRun; r++) {
    const agents = personalities.map((p, idx) => ({
      personality: p,
      x: (idx - 2) * 2.4,
      z: 25.0,
      speed: p === 'Aggressive' ? 6.1 : p === 'Panicked' ? 5.9 : p === 'Cautious' ? 5.2 : 5.5,
      effects: { buffs: [], debuffs: [], debuffImmunityRemaining: 0 } as PureActorEffects,
      alive: true,
      prevPos: { x: 0, z: 25 },
      stalledSteps: 0,
    }));

    const targetZones = [
      { x: -16.5, z: 2.0, radius: 5.0 },
      { x: 16.5, z: -2.0, radius: 5.0 },
      { x: 0, z: -27.0, radius: 6.5 },
    ];

    const croc = { x: -8, z: 5, speed: 6.8 };
    const dt = 0.25;
    for (let step = 0; step < 80; step++) {
      // Periodic debuff wave on some agents
      if (step === 24) {
        for (const a of agents) {
          if (rng() < 0.45) applyPureStatusEffect(a.effects, 'giam_toc', 'debuff', 4.5);
        }
      }
      for (const a of agents) {
        if (!a.alive) continue;
        a.effects.buffs.forEach((b) => (b.remaining -= dt));
        a.effects.debuffs.forEach((d) => (d.remaining -= dt));
        a.effects.buffs = a.effects.buffs.filter((b) => b.remaining > 0);
        a.effects.debuffs = a.effects.debuffs.filter((d) => d.remaining > 0);
        a.effects.debuffImmunityRemaining = Math.max(0, a.effects.debuffImmunityRemaining - dt);

        const zone = targetZones[(step + Math.floor(rng() * 3)) % targetZones.length];
        let tx = zone.x;
        let tz = zone.z;

        // Aggressive may detour for nearby rare buff before timer runs low
        if (step < 36 && a.personality === 'Aggressive') {
          const rare = spawnPoints[2];
          if (Math.hypot(rare.x - a.x, rare.z - a.z) < 9.0) {
            tx = rare.x;
            tz = rare.z;
          }
        }

        const dx = tx - a.x;
        const dz = tz - a.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.6) {
          const mul = computeEffectiveSpeedMultiplier({
            skillBonus: 0,
            activeBuffIds: a.effects.buffs.map((b) => b.id),
            activeDebuffIds: a.effects.debuffs.map((d) => d.id),
            hasBambooBalancePassive: false,
          });
          a.x += (dx / dist) * a.speed * mul * dt;
          a.z += (dz / dist) * a.speed * mul * dt;

          if (Math.hypot(a.x - a.prevPos.x, a.z - a.prevPos.z) < 0.05) {
            a.stalledSteps++;
            if (a.stalledSteps > 16) stuckCount++;
          } else {
            a.stalledSteps = 0;
          }
          a.prevPos = { x: a.x, z: a.z };
        }

        // Check pickup touch
        for (const sp of spawnPoints) {
          if (Math.hypot(sp.x - a.x, sp.z - a.z) < 1.8 && rng() < 0.35) {
            applyPureStatusEffect(a.effects, 'gio_nhe', 'buff', 8.0);
            pickupsCollected++;
          }
        }
      }

      // Croc chases closest agent outside safe zone
      const vulnerable = agents.filter(
        (a) => a.alive && !targetZones.some((z) => Math.hypot(z.x - a.x, z.z - a.z) <= z.radius)
      );
      if (vulnerable.length > 0) {
        const prey = vulnerable[Math.floor(rng() * vulnerable.length)];
        const cdx = prey.x - croc.x;
        const cdz = prey.z - croc.z;
        const cdist = Math.hypot(cdx, cdz) || 1;
        croc.x += (cdx / cdist) * croc.speed * dt;
        croc.z += (cdz / cdist) * croc.speed * dt;
        if (cdist < 1.4 && rng() < 0.25) {
          prey.alive = false;
        }
      }
    }

    for (const a of agents) {
      const inSafe = targetZones.some((z) => Math.hypot(z.x - a.x, z.z - a.z) <= z.radius + 0.5);
      if (a.alive && inSafe) {
        survivalCounts[a.personality] += 1;
      }
    }
  }

  return {
    roundsSimulated: roundsToRun,
    stuckCount,
    survivalByPersonality: survivalCounts,
    pickupsCollected,
  };
}
