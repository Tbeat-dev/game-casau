import test from 'node:test';
import assert from 'node:assert/strict';
import skillsData from '../config/skills.json';
import roundsData from '../config/rounds.json';
import {
  EFFECT_HARD_LIMITS,
  applyPureStatusEffect,
  canActivateSkill,
  canEnterSafeZone,
  calculateDotPhaPoints,
  computeCrocSnoutPosition,
  computeEffectiveSpeedMultiplier,
  computeEffectiveVisionRange,
  computeScaledRoundDifficulty,
  evaluateContestantSurvival,
  getScaledSkillStats,
  isTargetHitByCrocBite,
  isTargetInCrocVision,
  selectDraftCards,
  simulateNPCRounds,
  type PureActorEffects,
} from './rules';
import type { RoundConfig, SafeZoneInfo, SkillDefinition } from './types';

const skills = skillsData.skills as SkillDefinition[];
const rounds = roundsData.rounds as RoundConfig[];

test('canActivateSkill enforces round whitelist, Khí lực, cooldown, and grounded rules', () => {
  const nuocRut = skills.find((s) => s.id === 'nuoc_rut')!;
  const nhaySen = skills.find((s) => s.id === 'nhay_sen')!;
  const keoBan = skills.find((s) => s.id === 'keo_ban')!;
  const thangBang = skills.find((s) => s.id === 'thang_bang_tre')!;

  // Allowed when valid
  assert.equal(
    canActivateSkill({
      skill: nuocRut,
      khiLuc: 50,
      cooldownRemaining: 0,
      allowedSkills: rounds[0].allowedSkills,
      isGrounded: true,
      onPlatformOrBridge: false,
      usesLeft: 99,
    }).allowed,
    true
  );

  // Blocked if passive
  assert.equal(
    canActivateSkill({
      skill: thangBang,
      khiLuc: 100,
      cooldownRemaining: 0,
      allowedSkills: rounds[1].allowedSkills,
      isGrounded: true,
      onPlatformOrBridge: true,
      usesLeft: 99,
    }).allowed,
    false
  );

  // Blocked if disallowed in Round 1 (Kéo Bạn is not allowed in R1)
  const r1Block = canActivateSkill({
    skill: keoBan,
    khiLuc: 100,
    cooldownRemaining: 0,
    allowedSkills: rounds[0].allowedSkills,
    isGrounded: true,
    onPlatformOrBridge: false,
    usesLeft: 99,
  });
  assert.equal(r1Block.allowed, false);

  // Nhảy Sen blocked in mid-air
  const midAir = canActivateSkill({
    skill: nhaySen,
    khiLuc: 100,
    cooldownRemaining: 0,
    allowedSkills: rounds[1].allowedSkills,
    isGrounded: false,
    onPlatformOrBridge: false,
    usesLeft: 99,
  });
  assert.equal(midAir.allowed, false);

  // Blocked when Khí lực insufficient
  const lowEnergy = canActivateSkill({
    skill: nuocRut,
    khiLuc: 10,
    cooldownRemaining: 0,
    allowedSkills: rounds[0].allowedSkills,
    isGrounded: true,
    onPlatformOrBridge: false,
    usesLeft: 99,
  });
  assert.equal(lowEnergy.allowed, false);
});

test('selectDraftCards returns 3 unique cards with at least 1 recommended for next round', () => {
  const options = selectDraftCards(skills, { nuoc_rut: 1 }, 2, () => 0.42);
  assert.equal(options.length, 3);
  const ids = new Set(options.map((o) => o.skill.id));
  assert.equal(ids.size, 3);
  assert.equal(
    options.some((o) => o.skill.bestRounds.includes(2)),
    true
  );
});

test('getScaledSkillStats reduces cooldown and increases duration with level', () => {
  const nuocRut = skills.find((s) => s.id === 'nuoc_rut')!;
  const lvl1 = getScaledSkillStats(nuocRut, 1);
  const lvl2 = getScaledSkillStats(nuocRut, 2);
  assert.ok(lvl2.cooldown < lvl1.cooldown);
  assert.ok(lvl2.duration > lvl1.duration);
});

test('canEnterSafeZone enforces Limited Capacity and reservations', () => {
  const zone: SafeZoneInfo = {
    id: 'plat_1',
    name: 'Bục 1',
    type: 'platform',
    x: 0,
    y: 0.4,
    z: 0,
    radius: 4.5,
    capacity: 2,
    occupants: ['npc_1'],
    reservedBy: ['npc_2'],
    active: true,
  };
  assert.equal(canEnterSafeZone(zone, 'player'), false);
  assert.equal(canEnterSafeZone(zone, 'npc_1'), true);
  assert.equal(canEnterSafeZone(zone, 'npc_2'), true);
});

test('evaluateContestantSurvival strictly enforces fake signal and safe zone rules', () => {
  const r3 = rounds[2];
  assert.equal(
    evaluateContestantSurvival({
      isAlive: true,
      inActiveSafeZone: true,
      inWater: false,
      followedFakeSignal: true,
      roundConfig: r3,
    }).survived,
    false
  );
  assert.equal(
    evaluateContestantSurvival({
      isAlive: true,
      inActiveSafeZone: false,
      inWater: true,
      followedFakeSignal: false,
      roundConfig: r3,
    }).survived,
    false
  );
  assert.equal(
    evaluateContestantSurvival({
      isAlive: true,
      inActiveSafeZone: true,
      inWater: false,
      followedFakeSignal: false,
      roundConfig: r3,
    }).survived,
    true
  );
});

test('isTargetInCrocVision detects within angle and rejects behind', () => {
  assert.equal(
    isTargetInCrocVision({
      crocX: 0,
      crocZ: 0,
      crocYaw: 0, // facing +Z
      targetX: 0,
      targetZ: 10,
      detectRange: 16,
      visionAngleDeg: 90,
    }),
    true
  );
  assert.equal(
    isTargetInCrocVision({
      crocX: 0,
      crocZ: 0,
      crocYaw: 0,
      targetX: 0,
      targetZ: -10,
      detectRange: 16,
      visionAngleDeg: 90,
    }),
    false
  );
});

test('calculateDotPhaPoints rewards speed, escapes, and cooperation', () => {
  const pts = calculateDotPhaPoints({
    roundNumber: 2,
    timeRemaining: 10,
    escapedCrocCount: 1,
    helpedTeammateCount: 1,
  });
  assert.equal(pts, 80 + 30 + 25 + 30);
});

test('computeCrocSnoutPosition projects forward along +Z when yaw=0 and rotates correctly', () => {
  const s0 = computeCrocSnoutPosition(0, 0, 0, 1.55);
  assert.ok(Math.abs(s0.x) < 1e-6);
  assert.ok(Math.abs(s0.z - 1.55) < 1e-6);

  const s90 = computeCrocSnoutPosition(1, 2, Math.PI / 2, 2.0);
  assert.ok(Math.abs(s90.x - 3.0) < 1e-6);
  assert.ok(Math.abs(s90.z - 2.0) < 1e-6);
});

test('isTargetHitByCrocBite hits in front of snout, ignores behind tail, and respects jump height', () => {
  assert.equal(
    isTargetHitByCrocBite({
      crocX: 0,
      crocZ: 0,
      crocYaw: 0,
      targetX: 0,
      targetY: -0.18,
      targetZ: 2.3,
    }),
    true
  );

  assert.equal(
    isTargetHitByCrocBite({
      crocX: 0,
      crocZ: 0,
      crocYaw: 0,
      targetX: 0,
      targetY: -0.18,
      targetZ: -1.4,
    }),
    false
  );

  assert.equal(
    isTargetHitByCrocBite({
      crocX: 0,
      crocZ: 0,
      crocYaw: 0,
      targetX: 0,
      targetY: 1.8,
      targetZ: 1.6,
    }),
    false
  );
});

test('applyPureStatusEffect enforces caps, refresh, >=3s immunity, and cleanses', () => {
  const state: PureActorEffects = {
    buffs: [],
    debuffs: [],
    debuffImmunityRemaining: 0,
  };

  // Max 3 timed buffs
  assert.equal(applyPureStatusEffect(state, 'gio_nhe', 'buff', 8).status, 'applied');
  assert.equal(applyPureStatusEffect(state, 'mat_sang', 'buff', 10).status, 'applied');
  assert.equal(applyPureStatusEffect(state, 're_vung', 'buff', 8).status, 'applied');
  assert.equal(state.buffs.length, 3);

  // Debuffs blocked by active Mắt Sáng / Rễ Vững
  assert.equal(applyPureStatusEffect(state, 'mu', 'debuff', 5).status, 'blocked');
  assert.equal(applyPureStatusEffect(state, 'giam_toc', 'debuff', 4).status, 'blocked');

  // Same buff refreshes instead of stacking
  assert.equal(applyPureStatusEffect(state, 'gio_nhe', 'buff', 12).status, 'refreshed');
  assert.equal(state.buffs.length, 3);
  // 4th distinct buff replaces shortest (re_vung with 8s)
  assert.equal(applyPureStatusEffect(state, 'binh_khi', 'buff', 10).status, 'applied');
  assert.equal(state.buffs.length, 3);
  assert.equal(state.buffs.some((b) => b.id === 're_vung'), false);
  assert.equal(applyPureStatusEffect(state, 'mu', 'debuff', 5).status, 'blocked');

  // Clear buffs and test debuff immunity + max 2 cap
  state.buffs = [];
  assert.equal(applyPureStatusEffect(state, 'u_tai', 'debuff', 5).status, 'applied');
  assert.ok(state.debuffImmunityRemaining >= EFFECT_HARD_LIMITS.debuffImmunitySec);
  // Different debuff blocked during immunity window
  assert.equal(applyPureStatusEffect(state, 'kiet_suc', 'debuff', 5).status, 'blocked');
  // Same debuff refreshes duration
  assert.equal(applyPureStatusEffect(state, 'u_tai', 'debuff', 6).status, 'refreshed');
  // After immunity expires, 2nd debuff applies, 3rd is blocked
  state.debuffImmunityRemaining = 0;
  assert.equal(applyPureStatusEffect(state, 'kiet_suc', 'debuff', 5).status, 'applied');
  state.debuffImmunityRemaining = 0;
  assert.equal(applyPureStatusEffect(state, 'chong_mat', 'debuff', 4).status, 'blocked');
  assert.equal(state.debuffs.length, 2);

  // Bùa Giải cleanses all debuffs and grants immunity
  assert.equal(applyPureStatusEffect(state, 'bua_giai', 'buff', 0.1).status, 'applied');
  assert.equal(state.debuffs.length, 0);
  assert.ok(state.debuffImmunityRemaining >= 3.0);
});

test('computeEffectiveSpeedMultiplier and computeEffectiveVisionRange enforce hard safety caps', () => {
  const maxBoosted = computeEffectiveSpeedMultiplier({
    skillBonus: 0.4,
    activeBuffIds: ['gio_nhe'],
    activeDebuffIds: [],
    hasBambooBalancePassive: true,
  });
  assert.ok(maxBoosted <= 1.35);

  const maxSlowed = computeEffectiveSpeedMultiplier({
    skillBonus: 0,
    activeBuffIds: [],
    activeDebuffIds: ['giam_toc', 'reu_tron', 'chong_mat'],
    hasBambooBalancePassive: false,
  });
  assert.ok(maxSlowed >= 0.6);

  const blind = computeEffectiveVisionRange({
    baseRange: 58,
    hasBlindDebuff: true,
    hasMatSangBuff: false,
    hasMatCuSkill: false,
    reduceBlindnessSetting: false,
  });
  assert.ok(blind.visibleRange >= EFFECT_HARD_LIMITS.blindMinVisibleDist);

  const reducedBlind = computeEffectiveVisionRange({
    baseRange: 58,
    hasBlindDebuff: true,
    hasMatSangBuff: false,
    hasMatCuSkill: false,
    reduceBlindnessSetting: true,
  });
  assert.ok(reducedBlind.blindIntensity < blind.blindIntensity);
});

test('computeScaledRoundDifficulty scales presets and applies silent adaptive relief', () => {
  const normal = computeScaledRoundDifficulty({
    playerBaseRunSpeed: 8.6,
    crocSpeedRatio: 0.9,
    crocBurstSpeedRatio: 0.96,
    crocDetectRange: 18.5,
    debuffBudget: 2,
    maxPickupsActive: 5,
    presetCrocSpeedMul: 1.0,
    presetDetectMul: 1.0,
    presetDebuffDurMul: 1.0,
    presetBuffDensityMul: 1.0,
    presetDebuffBudgetMul: 1.0,
    adaptiveReliefRatio: 0,
  });
  const relieved = computeScaledRoundDifficulty({
    playerBaseRunSpeed: 8.6,
    crocSpeedRatio: 0.9,
    crocBurstSpeedRatio: 0.96,
    crocDetectRange: 18.5,
    debuffBudget: 2,
    maxPickupsActive: 5,
    presetCrocSpeedMul: 1.0,
    presetDetectMul: 1.0,
    presetDebuffDurMul: 1.0,
    presetBuffDensityMul: 1.0,
    presetDebuffBudgetMul: 1.0,
    adaptiveReliefRatio: 0.08,
  });
  assert.ok(relieved.crocSpeed < normal.crocSpeed);
  assert.ok(relieved.maxPickupsActive >= normal.maxPickupsActive);
});

test('simulateNPCRounds verifies zero stuck NPCs and active buff pickups across 12 rounds', () => {
  const sim = simulateNPCRounds(2026, 12);
  assert.equal(sim.roundsSimulated, 12);
  assert.equal(sim.stuckCount, 0);
  assert.ok(sim.pickupsCollected > 0);
  const totalSurvivors = Object.values(sim.survivalByPersonality).reduce((a, b) => a + b, 0);
  assert.ok(totalSurvivors > 0);
});
