import { ArenaManager } from './ArenaManager';
import { AudioManager } from './AudioManager';
import { EventBus } from './EventBus';
import type { NPCAgent } from './NPCController';
import type { PlayerController } from './PlayerController';

export class EliminationManager {
  public eliminationReason = '';
  private spectateIndex = 0;

  constructor(
    private bus: EventBus,
    private arena: ArenaManager,
    private audio: AudioManager
  ) {}

  reset(): void {
    this.eliminationReason = '';
    this.spectateIndex = 0;
  }

  eliminatePlayer(player: PlayerController, reason: string, onHeavyImpact: () => void): void {
    if (!player.alive) return;
    player.alive = false;
    this.eliminationReason = reason;
    this.audio.playDefeatSting();
    this.arena.spawnParticles(player.x, player.y + 1.0, player.z, 24, 0xb3261e, 6.0, 0.26);
    onHeavyImpact();
    this.bus.emit('contestant:eliminated', {
      actorId: 'player',
      name: 'Bạn',
      reason,
      isPlayer: true,
    });
  }

  eliminateNPC(npc: NPCAgent, reason: string): void {
    if (!npc.alive) return;
    npc.alive = false;
    this.audio.playGong(185);
    // Stylized folk smoke + petal burst (zero gore)
    this.arena.spawnParticles(npc.x, npc.y + 0.9, npc.z, 18, 0xf3e8cf, 4.8, 0.24);
    this.arena.spawnParticles(npc.x, npc.y + 1.1, npc.z, 8, 0xb3261e, 3.6, 0.18);
    this.bus.emit('contestant:eliminated', {
      actorId: npc.id,
      name: npc.name,
      reason,
      isPlayer: false,
    });
  }

  getSpectateTarget(npcs: NPCAgent[]): NPCAgent | null {
    const alive = npcs.filter((n) => n.alive);
    if (alive.length === 0) return null;
    this.spectateIndex = this.spectateIndex % alive.length;
    return alive[this.spectateIndex];
  }

  cycleSpectator(npcs: NPCAgent[], dir = 1): NPCAgent | null {
    const alive = npcs.filter((n) => n.alive);
    if (alive.length === 0) return null;
    this.spectateIndex = (this.spectateIndex + dir + alive.length) % alive.length;
    return alive[this.spectateIndex];
  }
}
