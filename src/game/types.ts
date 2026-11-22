export type GamePhase =
  | 'title'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'skill_draft'
  | 'eliminated'
  | 'victory';

export type RoundSubState = 'PREPARATION' | 'SIGNAL' | 'ACTION' | 'RESOLVE';

export type SkillId =
  | 'nuoc_rut'
  | 'nhay_sen'
  | 'thang_bang_tre'
  | 'mat_cu'
  | 'tieng_trong'
  | 'giu_cho'
  | 'keo_ban'
  | 'phao_tre';

export type SkillType = 'active' | 'passive';

export interface SkillDefinition {
  id: SkillId;
  name: string;
  type: SkillType;
  khiLucCost: number;
  cooldown: number;
  duration: number;
  speedMultiplier?: number;
  jumpMultiplier?: number;
  forwardBoost?: number;
  knockbackResist?: number;
  slipResist?: number;
  lureRadius?: number;
  pullRange?: number;
  usesPerRound?: number;
  crocStunDuration?: number;
  description: string;
  bestRounds: number[];
  icon: string;
}

export interface SignalSpec {
  id: string;
  text: string;
  isValid: boolean;
  targetType: 'island' | 'temple' | 'platform' | 'trap';
}

export interface RoundConfig {
  roundNumber: number;
  id: string;
  name: string;
  subtitle: string;
  prepDuration: number;
  actionDuration: number;
  safeZoneCount: number;
  safeZoneRadius: number;
  safeZoneCapacity: number;
  crocSpeed: number;
  crocDetectRange: number;
  crocVisionAngleDeg: number;
  crocDirectionSwapInterval: number;
  platformMoveSpeed: number;
  shrinkArenaFactor: number;
  mechanics: string[];
  allowedSkills: SkillId[];
  validSignals: SignalSpec[];
  fakeSignals: SignalSpec[];
}

export type NPCPersonality =
  | 'Aggressive'
  | 'Cautious'
  | 'Strategic'
  | 'Panicked'
  | 'Cooperative';

export type CrocodileState =
  | 'IDLE'
  | 'PATROL'
  | 'DETECT'
  | 'CHASE'
  | 'ATTACK'
  | 'RETURN'
  | 'STUNNED'
  | 'LURED';

export type SafeZoneType = 'island' | 'temple' | 'platform';

export interface SafeZoneInfo {
  id: string;
  name: string;
  type: SafeZoneType;
  x: number;
  y: number;
  z: number;
  radius: number;
  capacity: number;
  occupants: string[];
  reservedBy: string[];
  active: boolean;
}

export interface SkillSlotHUD {
  slot: 'Q' | 'R' | 'P';
  skill: SkillDefinition | null;
  level: number;
  cooldownRemaining: number;
  cooldownTotal: number;
  activeRemaining: number;
  allowedInRound: boolean;
  canAfford: boolean;
  usesLeft: number;
}

export interface ToastItem {
  id: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  tone: 'danger' | 'signal' | 'info' | 'success';
  createdAt: number;
  durationMs: number;
}

export interface SkillDraftOption {
  skill: SkillDefinition;
  isUpgrade: boolean;
  nextLevel: number;
  effectiveCooldown: number;
  effectiveDuration: number;
}

export type DifficultyLevel = 'easy' | 'normal' | 'hard';

export type BuffId =
  | 'gio_nhe'
  | 'mat_sang'
  | 're_vung'
  | 'binh_khi'
  | 'trong_hoi'
  | 'la_chan_sen'
  | 'bua_giai';

export type DebuffId =
  | 'giam_toc'
  | 'mu'
  | 'u_tai'
  | 'reu_tron'
  | 'kiet_suc'
  | 'chong_mat'
  | 'cam_lang';

export type StatusEffectId = BuffId | DebuffId;
export type StatusEffectKind = 'buff' | 'debuff';
export type BuffRarity = 'common' | 'rare';

export interface BuffDefinition {
  id: BuffId;
  name: string;
  rarity: BuffRarity;
  duration: number;
  storable: boolean;
  channelTime: number;
  speedBonus?: number;
  khiLucRegenBonus?: number;
  cooldownReduction?: number;
  description: string;
  icon: string;
  color: string;
}

export interface DebuffDefinition {
  id: DebuffId;
  name: string;
  duration: number;
  speedPenalty: number;
  source: string;
  telegraphText: string;
  icon: string;
  color: string;
}

export interface DifficultyPresetConfig {
  id: DifficultyLevel;
  label: string;
  description: string;
  crocSpeedMul: number;
  detectRangeMul: number;
  reactionWindowMul: number;
  debuffDurationMul: number;
  buffDensityMul: number;
  debuffBudgetMul: number;
}

export interface RoundDifficultyProfile {
  roundNumber: number;
  learningGoal: string;
  crocCount: number;
  crocSpeedRatio: number;
  crocBurstSpeedRatio: number;
  crocDetectRange: number;
  crocVisionAngleDeg: number;
  reactionTimeSec: number;
  actionDuration: number;
  safeZoneCount: number;
  safeZoneCapacity: number;
  fakeSignalRate: number;
  platformMoveSpeed: number;
  shrinkArenaFactor: number;
  debuffBudget: number;
  debuffIntervalSec: number;
  allowedDebuffs: DebuffId[];
  maxPickupsActive: number;
  pickupRespawnSec: number;
  rareBuffChance: number;
  hearingCueEnabled: boolean;
}

export interface EffectiveRoundDifficulty extends RoundDifficultyProfile {
  presetId: DifficultyLevel;
  crocSpeed: number;
  crocBurstSpeed: number;
  debuffDurationMul: number;
  reactionWindowMul: number;
}

export interface ActiveEffectHUD {
  id: StatusEffectId;
  kind: StatusEffectKind;
  name: string;
  rarity?: BuffRarity;
  remaining: number;
  totalDuration: number;
  icon: string;
  description: string;
}

export interface StoredItemHUD {
  id: BuffId;
  name: string;
  icon: string;
  description: string;
}

export interface PickupPromptHUD {
  name: string;
  rarity: BuffRarity;
  progress: number; // 0..1 while holding E
  requiresHold: boolean;
  replaceWarning: boolean;
}

export interface GameSettings {
  sensitivity: number;
  volume: number;
  muted: boolean;
  graphicsQuality: 'high' | 'medium' | 'low';
  language: 'vi' | 'en';
  difficulty: DifficultyLevel;
  reduceBlindness: boolean;
  disableDizziness: boolean;
  fullVisualAudioSignals: boolean;
}

export interface RunStats {
  roundsCleared: number;
  survivalTimeSec: number;
  skillsUsed: number;
  dotPhaPoints: number;
  survivorsRemaining: number;
  winnerName: string;
  eliminationReason: string;
}

export interface HUDSnapshot {
  phase: GamePhase;
  roundSubState: RoundSubState;
  roundNumber: number;
  totalRounds: number;
  roundName: string;
  difficultyLabel: string;
  timeRemaining: number;
  timeTotal: number;
  aliveCount: number;
  totalContestants: number;
  crocState: CrocodileState;
  crocDistance: number;
  signalText: string;
  signalIsFake: boolean;
  signalActive: boolean;
  stamina: number;
  maxStamina: number;
  khiLuc: number;
  maxKhiLuc: number;
  inSafeZone: boolean;
  inWater: boolean;
  nearestSafeZoneLabel: string;
  nearestSafeZoneOccupants: number;
  nearestSafeZoneCapacity: number;
  skillSlots: SkillSlotHUD[];
  silencedSlot: 'Q' | 'R' | null;
  activeBuffs: ActiveEffectHUD[];
  activeDebuffs: ActiveEffectHUD[];
  storedItem: StoredItemHUD | null;
  pickupPrompt: PickupPromptHUD | null;
  blindIntensity: number; // 0..1 applied only to 3D canvas post-process
  dizzinessIntensity: number; // 0..1 applied only to 3D camera
  deafened: boolean;
  draftOptions: SkillDraftOption[];
  spectatingName: string;
  stats: RunStats;
  keyHintsVisible: boolean;
  matCuActive: boolean;
  pointerLocked: boolean;
}
