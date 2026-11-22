import roundsData from '../config/rounds.json';
import { AudioManager } from './AudioManager';
import { DifficultyManager } from './DifficultyManager';
import { EventBus } from './EventBus';
import { calculateDotPhaPoints, evaluateContestantSurvival } from './rules';
import { SafeZoneManager } from './SafeZoneManager';
import { SkillManager } from './SkillManager';
import { StatusEffectManager } from './StatusEffectManager';
import type { NPCAgent } from './NPCController';
import type { PlayerController } from './PlayerController';
import type { EliminationManager } from './EliminationManager';
import type {
  EffectiveRoundDifficulty,
  RoundConfig,
  RoundSubState,
  SignalSpec,
} from './types';

export class RoundManager {
  public rounds: RoundConfig[] = roundsData.rounds as RoundConfig[];
  public currentRoundIndex = 0;
  public subState: RoundSubState = 'PREPARATION';
  public timer = 0;
  public currentTotalTime = 4;
  public currentSignal: SignalSpec | null = null;
  public signalActive = false;
  public dotPhaPoints = 0;

  private effectiveRound: RoundConfig;
  private effectiveProfile: EffectiveRoundDifficulty;
  private signalCycleTimer = 0;
  private zoneShiftTimer = 0;

  constructor(
    private bus: EventBus,
    private safeZones: SafeZoneManager,
    private skills: SkillManager,
    private elimination: EliminationManager,
    private audio: AudioManager,
    private difficulty: DifficultyManager,
    private statusEffects: StatusEffectManager
  ) {
    this.effectiveRound = this.rounds[0];
    this.effectiveProfile = this.difficulty.getEffectiveProfile(1);
  }

  getCurrentRound(): RoundConfig {
    return this.effectiveRound;
  }

  getEffectiveProfile(): EffectiveRoundDifficulty {
    return this.effectiveProfile;
  }

  startRun(): void {
    this.currentRoundIndex = 0;
    this.dotPhaPoints = 0;
    this.statusEffects.clearAll();
    this.startRound(0);
  }

  startRound(index: number): void {
    this.currentRoundIndex = Math.max(0, Math.min(this.rounds.length - 1, index));
    const baseRound = this.rounds[this.currentRoundIndex] ?? this.rounds[this.rounds.length - 1];
    this.effectiveProfile = this.difficulty.getEffectiveProfile(baseRound.roundNumber);
    const p = this.effectiveProfile;

    this.effectiveRound = {
      ...baseRound,
      prepDuration: p.reactionTimeSec,
      actionDuration: p.actionDuration,
      safeZoneCount: p.safeZoneCount,
      safeZoneCapacity: p.safeZoneCapacity,
      crocSpeed: p.crocSpeed,
      crocDetectRange: p.crocDetectRange,
      crocVisionAngleDeg: p.crocVisionAngleDeg,
      platformMoveSpeed: p.platformMoveSpeed,
      shrinkArenaFactor: p.shrinkArenaFactor,
    };

    const round = this.effectiveRound;
    this.subState = 'PREPARATION';
    this.timer = round.prepDuration;
    this.currentTotalTime = round.prepDuration;
    this.signalActive = false;
    this.currentSignal = null;
    this.signalCycleTimer = 0;
    this.zoneShiftTimer = 8.5;

    this.statusEffects.clearRoundEffects();
    this.skills.resetRoundUses();
    this.skills.setAllowedSkills(round.allowedSkills);
    this.safeZones.configureForRound(round);

    this.audio.playDrum(0.95);
    this.bus.emit('round:start', {
      roundNumber: round.roundNumber,
      roundName: round.name,
    });
    this.bus.emit('toast:push', {
      message: `${round.name}: ${round.subtitle}`,
      priority: 'medium',
      tone: 'info',
      durationMs: 3600,
    });
  }

  update(
    dt: number,
    player: PlayerController,
    npcs: NPCAgent[],
    onSignalIssued: (sig: SignalSpec) => void,
    onRoundCleared: (dotPhaEarned: number, hasNextRound: boolean) => void,
    onVictory: (winnerName: string) => void
  ): void {
    const round = this.getCurrentRound();
    const profile = this.effectiveProfile;
    this.timer = Math.max(0, this.timer - dt);

    if (this.subState === 'PREPARATION') {
      if (this.timer <= 0) {
        this.issueSignal(round, onSignalIssued);
        this.subState = 'ACTION';
        this.timer = round.actionDuration;
        this.currentTotalTime = round.actionDuration;
        this.signalCycleTimer =
          round.roundNumber === 3 ? 6.4 : round.roundNumber === 4 ? 5.6 : 99;
      }
      return;
    }

    if (this.subState === 'ACTION') {
      // Round 3 & Final: Periodically emit fake or valid signals per difficulty profile
      const fakePool =
        round.fakeSignals.length > 0 ? round.fakeSignals : this.rounds[2]?.fakeSignals ?? [];
      if (profile.fakeSignalRate > 0 && fakePool.length > 0) {
        this.signalCycleTimer -= dt;
        if (this.signalCycleTimer <= 0) {
          this.signalCycleTimer = round.roundNumber === 4 ? 5.8 : 7.0;
          const useFake = Math.random() < profile.fakeSignalRate && this.timer > 7.5;
          if (useFake) {
            const fake = fakePool[Math.floor(Math.random() * fakePool.length)];
            this.currentSignal = fake;
            this.signalActive = true;
            this.audio.playClapper();
            onSignalIssued(fake);
          } else {
            this.issueSignal(round, onSignalIssued);
          }
        }
      }

      // Final round: Safe zone shifts periodically
      if (round.roundNumber === 4 && this.timer > 6.0) {
        this.zoneShiftTimer -= dt;
        if (this.zoneShiftTimer <= 0) {
          this.zoneShiftTimer = 9.0;
          this.safeZones.shiftActiveZones(round);
          this.audio.playDrum(1.1);
          this.bus.emit('toast:push', {
            message: 'Vùng an toàn vừa dịch chuyển!',
            priority: 'high',
            tone: 'signal',
            durationMs: 2600,
          });
        }
      }

      // If all NPCs eliminated and player alive -> immediate Victory!
      const aliveNpcs = npcs.filter((n) => n.alive);
      if (player.alive && aliveNpcs.length === 0) {
        this.audio.playVictoryFanfare();
        onVictory('Bạn (Thí Sinh #01)');
        return;
      }

      if (this.timer <= 0) {
        this.subState = 'RESOLVE';
        this.resolveRound(round, player, npcs, onRoundCleared, onVictory);
      }
    }
  }

  private issueSignal(round: RoundConfig, onSignalIssued: (sig: SignalSpec) => void): void {
    const sig =
      round.validSignals[Math.floor(Math.random() * round.validSignals.length)];
    this.currentSignal = sig;
    this.signalActive = true;
    this.safeZones.configureForRound(
      round,
      sig.targetType === 'trap' ? 'island' : sig.targetType
    );
    this.audio.playGong(295);
    this.bus.emit('signal:issued', { text: sig.text, isValid: sig.isValid });
    onSignalIssued(sig);
  }

  private resolveRound(
    round: RoundConfig,
    player: PlayerController,
    npcs: NPCAgent[],
    onRoundCleared: (dotPhaEarned: number, hasNextRound: boolean) => void,
    onVictory: (winnerName: string) => void
  ): void {
    // Evaluate all alive NPCs
    for (const npc of npcs) {
      if (!npc.alive) continue;
      const res = evaluateContestantSurvival({
        isAlive: npc.alive,
        inActiveSafeZone: npc.inSafeZone,
        inWater: npc.inWater,
        followedFakeSignal: npc.followedFakeSignal,
        roundConfig: round,
      });
      if (!res.survived) {
        this.elimination.eliminateNPC(npc, res.reason);
      }
    }

    // Evaluate player
    if (player.alive) {
      const pRes = evaluateContestantSurvival({
        isAlive: player.alive,
        inActiveSafeZone: player.inSafeZone,
        inWater: player.inWater,
        followedFakeSignal: player.followedFakeSignal,
        roundConfig: round,
      });

      if (!pRes.survived) {
        this.elimination.eliminatePlayer(player, pRes.reason, () => {});
        return;
      }

      // Player survived!
      const earned = calculateDotPhaPoints({
        roundNumber: round.roundNumber,
        timeRemaining: 5,
        escapedCrocCount: player.escapedCrocCount,
        helpedTeammateCount: player.helpedTeammateCount,
      });
      this.dotPhaPoints += earned;
      this.bus.emit('round:clear', {
        roundNumber: round.roundNumber,
        dotPhaEarned: earned,
      });

      const hasNext = this.currentRoundIndex < this.rounds.length - 1;
      if (!hasNext) {
        this.audio.playVictoryFanfare();
        onVictory('Bạn (Thí Sinh #01)');
      } else {
        this.audio.playGong(392);
        onRoundCleared(earned, true);
      }
    } else {
      // Spectator mode continues or ends if 1 survivor left
      const aliveNpcs = npcs.filter((n) => n.alive);
      if (aliveNpcs.length <= 1) {
        const winner = aliveNpcs[0]?.name ?? 'Không có người thắng';
        onVictory(winner);
      } else if (this.currentRoundIndex < this.rounds.length - 1) {
        this.startRound(this.currentRoundIndex + 1);
      } else {
        onVictory(aliveNpcs[0]?.name ?? 'Thí sinh sống sót');
      }
    }
  }
}
