import difficultyConfig from '../config/difficulty.json';
import { computeScaledRoundDifficulty } from './rules';
import type {
  DifficultyLevel,
  DifficultyPresetConfig,
  EffectiveRoundDifficulty,
  RoundDifficultyProfile,
} from './types';

export class DifficultyManager {
  private presets = difficultyConfig.presets as Record<DifficultyLevel, DifficultyPresetConfig>;
  private roundProfiles = difficultyConfig.roundProfiles as RoundDifficultyProfile[];
  private currentPreset: DifficultyLevel = 'normal';
  private adaptiveEnabled = difficultyConfig.adaptiveAssist.enabledByDefault;
  private consecutivePoorRuns = 0;

  setDifficulty(level: DifficultyLevel): void {
    if (this.presets[level]) {
      this.currentPreset = level;
    }
  }

  getDifficulty(): DifficultyLevel {
    return this.currentPreset;
  }

  getPresetLabel(): string {
    return this.presets[this.currentPreset]?.label ?? 'Thường';
  }

  getAllPresets(): DifficultyPresetConfig[] {
    return Object.values(this.presets);
  }

  /**
   * Silent adaptive adjustment based on recent run outcomes.
   * Never disclosed in the UI; gently relieves pressure after consecutive early eliminations.
   */
  recordRunOutcome(params: { won: boolean; roundsCleared: number }): void {
    if (!this.adaptiveEnabled) return;
    if (params.won) {
      this.consecutivePoorRuns = 0;
    } else if (params.roundsCleared <= 1) {
      this.consecutivePoorRuns = Math.min(2, this.consecutivePoorRuns + 1);
    }
  }

  getEffectiveProfile(
    roundNumber: number,
    playerBaseRunSpeed = 8.6
  ): EffectiveRoundDifficulty {
    const base =
      this.roundProfiles.find((r) => r.roundNumber === roundNumber) ??
      this.roundProfiles[this.roundProfiles.length - 1];
    const preset = this.presets[this.currentPreset] ?? this.presets.normal;

    const relief = this.adaptiveEnabled
      ? Math.min(
          difficultyConfig.adaptiveAssist.maxSpeedRelief,
          this.consecutivePoorRuns * difficultyConfig.adaptiveAssist.lossStreakStep
        )
      : 0;

    const scaled = computeScaledRoundDifficulty({
      playerBaseRunSpeed,
      crocSpeedRatio: base.crocSpeedRatio,
      crocBurstSpeedRatio: base.crocBurstSpeedRatio,
      crocDetectRange: base.crocDetectRange,
      debuffBudget: base.debuffBudget,
      maxPickupsActive: base.maxPickupsActive,
      presetCrocSpeedMul: preset.crocSpeedMul,
      presetDetectMul: preset.detectRangeMul,
      presetDebuffDurMul: preset.debuffDurationMul,
      presetBuffDensityMul: preset.buffDensityMul,
      presetDebuffBudgetMul: preset.debuffBudgetMul,
      adaptiveReliefRatio: relief,
    });

    return {
      ...base,
      presetId: preset.id,
      crocSpeed: scaled.crocSpeed,
      crocBurstSpeed: scaled.crocBurstSpeed,
      crocDetectRange: scaled.crocDetectRange,
      debuffDurationMul: scaled.debuffDurationMul,
      debuffBudget: scaled.debuffBudget,
      maxPickupsActive: scaled.maxPickupsActive,
      reactionTimeSec: Number((base.reactionTimeSec * preset.reactionWindowMul).toFixed(2)),
      reactionWindowMul: preset.reactionWindowMul,
    };
  }
}
