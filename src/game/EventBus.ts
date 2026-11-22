import type {
  BuffId,
  BuffRarity,
  CrocodileState,
  SkillId,
  StatusEffectId,
  StatusEffectKind,
  ToastItem,
} from './types';

export interface GameEvents {
  'round:start': { roundNumber: number; roundName: string };
  'round:clear': { roundNumber: number; dotPhaEarned: number };
  'signal:issued': { text: string; isValid: boolean };
  'skill:activated': { actorId: string; skillId: SkillId; slot: 'Q' | 'R' | 'P' };
  'skill:cooldown': { actorId: string; skillId: SkillId; remaining: number };
  'skill:blocked': { actorId: string; skillId: SkillId; reason: string };
  'pickup:spawned': { pickupId: string; buffId: BuffId; rarity: BuffRarity; x: number; z: number };
  'pickup:collected': { pickupId: string; buffId: BuffId; rarity: BuffRarity; actorId: string };
  'effect:applied': { actorId: string; effectId: StatusEffectId; kind: StatusEffectKind; duration: number };
  'effect:refreshed': { actorId: string; effectId: StatusEffectId; kind: StatusEffectKind; duration: number };
  'effect:expired': { actorId: string; effectId: StatusEffectId; kind: StatusEffectKind };
  'contestant:eliminated': { actorId: string; name: string; reason: string; isPlayer: boolean };
  'croc:state': { state: CrocodileState; targetId: string | null };
  'game:victory': { winnerName: string; survivalTimeSec: number };
  'game:over': { reason: string; roundNumber: number };
  'toast:push': Omit<ToastItem, 'id' | 'createdAt'>;
}

type Handler<T> = (payload: T) => void;

export class EventBus {
  private listeners = new Map<keyof GameEvents, Set<Handler<never>>>();

  on<K extends keyof GameEvents>(event: K, handler: Handler<GameEvents[K]>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler as Handler<never>);
    return () => {
      set?.delete(handler as Handler<never>);
    };
  }

  emit<K extends keyof GameEvents>(event: K, payload: GameEvents[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const fn of set) {
      (fn as Handler<GameEvents[K]>)(payload);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
