import * as THREE from 'three';
import buffsConfig from '../config/buffs.json';
import { AssetRegistry } from '../assets/AssetRegistry';
import { AudioManager } from './AudioManager';
import { EventBus } from './EventBus';
import type { NPCAgent } from './NPCController';
import { createSeededRng } from './rules';
import { StatusEffectManager } from './StatusEffectManager';
import type {
  BuffDefinition,
  BuffId,
  BuffRarity,
  EffectiveRoundDifficulty,
  PickupPromptHUD,
} from './types';

interface SpawnAnchor {
  id: string;
  x: number;
  y: number;
  z: number;
  rarity: BuffRarity;
}

export interface ActivePickup {
  id: string;
  anchorId: string;
  buff: BuffDefinition;
  x: number;
  y: number;
  z: number;
  mesh: THREE.Group;
  labelSprite: THREE.Sprite | null;
}

const SPAWN_ANCHORS: SpawnAnchor[] = [
  // Common pickups along start path, bridges & safe islands
  { id: 'sp_c_start_l', x: -3.2, y: 0.65, z: 22.8, rarity: 'common' },
  { id: 'sp_c_start_r', x: 3.2, y: 0.65, z: 22.8, rarity: 'common' },
  { id: 'sp_c_bridge_l', x: -10.5, y: 0.62, z: 15.0, rarity: 'common' },
  { id: 'sp_c_bridge_r', x: 10.5, y: 0.62, z: 14.2, rarity: 'common' },
  { id: 'sp_c_isle_w', x: -16.5, y: 0.65, z: 2.0, rarity: 'common' },
  { id: 'sp_c_isle_e', x: 16.5, y: 0.65, z: -2.0, rarity: 'common' },
  { id: 'sp_c_temple', x: 0.0, y: 0.72, z: -23.8, rarity: 'common' },

  // Rare pickups in riskier zones: center water/platforms & outer lake edge
  { id: 'sp_r_center', x: 0.0, y: 0.45, z: 0.0, rarity: 'rare' },
  { id: 'sp_r_nw', x: -11.5, y: 0.45, z: -12.5, rarity: 'rare' },
  { id: 'sp_r_ne', x: 11.5, y: 0.45, z: -12.5, rarity: 'rare' },
  { id: 'sp_r_mid_w', x: -7.5, y: 0.25, z: -4.5, rarity: 'rare' },
  { id: 'sp_r_mid_e', x: 7.5, y: 0.25, z: 4.5, rarity: 'rare' },
];

export class PickupManager {
  private group = new THREE.Group();
  private activePickups: ActivePickup[] = [];
  private respawnTimer = 3.0;
  private rng = createSeededRng(202605);
  private spawnSeq = 0;

  // Channeling state for rare buff [E] hold (~0.8s)
  private channelingPickupId: string | null = null;
  private channelProgress = 0;

  private buffDefs = buffsConfig.buffs as BuffDefinition[];
  private commonBuffs = this.buffDefs.filter((b) => b.rarity === 'common');
  private rareBuffs = this.buffDefs.filter((b) => b.rarity === 'rare');

  private templateModels: Partial<Record<'flower3' | 'flower4' | 'mushroom' | 'petal', THREE.Group>> =
    {};

  constructor(
    private bus: EventBus,
    private registry: AssetRegistry,
    private effects: StatusEffectManager,
    private audio: AudioManager
  ) {
    this.group.name = 'pickups_group';
  }

  async init(scene: THREE.Scene, seed = 202605): Promise<void> {
    this.rng = createSeededRng(seed);
    scene.add(this.group);

    const [f3, f4, mush, petal] = await Promise.all([
      this.registry.loadModel('env.flower.3'),
      this.registry.loadModel('env.flower.4'),
      this.registry.loadModel('env.mushroom.1'),
      this.registry.loadModel('vfx.petal.1'),
    ]);
    if (f3) this.templateModels.flower3 = f3;
    if (f4) this.templateModels.flower4 = f4;
    if (mush) this.templateModels.mushroom = mush;
    if (petal) this.templateModels.petal = petal;
  }

  resetForRound(profile: EffectiveRoundDifficulty, crocX: number, crocZ: number, roundSeedOffset: number): void {
    this.clearAll();
    this.rng = createSeededRng(202605 + roundSeedOffset * 97);
    this.respawnTimer = 2.0;
    this.channelingPickupId = null;
    this.channelProgress = 0;

    // Seed initial round pickups away from immediate crocodile position
    const initialCount = Math.min(SPAWN_ANCHORS.length, Math.max(2, profile.maxPickupsActive - 1));
    for (let i = 0; i < initialCount; i++) {
      this.trySpawnPickup(profile, crocX, crocZ);
    }
  }

  clearAll(): void {
    for (const p of this.activePickups) {
      this.group.remove(p.mesh);
      this.disposePickupMesh(p.mesh);
    }
    this.activePickups = [];
    this.channelingPickupId = null;
    this.channelProgress = 0;
  }

  private disposePickupMesh(mesh: THREE.Group): void {
    mesh.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.geometry?.dispose();
        if (Array.isArray(m.material)) m.material.forEach((mm) => mm.dispose());
        else m.material?.dispose();
      } else if ((obj as THREE.Sprite).isSprite) {
        const s = obj as THREE.Sprite;
        s.material.map?.dispose();
        s.material.dispose();
      }
    });
  }

  private createLabelSprite(text: string, rarity: BuffRarity): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = rarity === 'rare' ? 'rgba(48,30,18,0.92)' : 'rgba(24,42,26,0.9)';
    ctx.strokeStyle = rarity === 'rare' ? '#e0a526' : '#45e08a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(8, 10, 240, 44, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f3e8cf';
    ctx.font = 'bold 22px "Be Vietnam Pro", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2.1, 0.52, 1);
    sprite.position.y = 1.25;
    sprite.visible = false;
    return sprite;
  }

  private buildPickupVisual(buff: BuffDefinition): { root: THREE.Group; labelSprite: THREE.Sprite } {
    const root = new THREE.Group();
    const isRare = buff.rarity === 'rare';
    const auraColor = isRare ? 0xe0a526 : 0x45e08a;

    // Reuse Quaternius repo model (Flower_*, Mushroom_*, Petal_*) with subtle emissive boost
    let model: THREE.Group | null = null;
    if (buff.id === 'binh_khi' && this.templateModels.mushroom) {
      model = this.templateModels.mushroom.clone(true);
    } else if (buff.id === 'la_chan_sen' && this.templateModels.flower4) {
      model = this.templateModels.flower4.clone(true);
    } else if (isRare && this.templateModels.petal) {
      model = this.templateModels.petal.clone(true);
    } else if (this.templateModels.flower3) {
      model = this.templateModels.flower3.clone(true);
    }

    if (model) {
      model.scale.setScalar(isRare ? 1.55 : 1.35);
      model.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          if (mesh.material) {
            const cloned = (mesh.material as THREE.MeshStandardMaterial).clone();
            cloned.emissive = new THREE.Color(auraColor);
            cloned.emissiveIntensity = isRare ? 0.45 : 0.28;
            mesh.material = cloned;
          }
        }
      });
      root.add(model);
    } else {
      // Procedural lotus / lantern fallback if GLB hasn't loaded
      const core = new THREE.Mesh(
        new THREE.OctahedronGeometry(isRare ? 0.34 : 0.28, 1),
        new THREE.MeshStandardMaterial({
          color: auraColor,
          emissive: auraColor,
          emissiveIntensity: 0.65,
          roughness: 0.25,
        })
      );
      core.position.y = 0.45;
      root.add(core);
    }

    // Glowing ground/halo ring
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.66, 20),
      new THREE.MeshBasicMaterial({
        color: auraColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: isRare ? 0.85 : 0.68,
        depthWrite: false,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.08;
    root.add(ring);

    const labelSprite = this.createLabelSprite(
      isRare ? `[E] ${buff.name}` : buff.name,
      buff.rarity
    );
    root.add(labelSprite);

    return { root, labelSprite };
  }

  private trySpawnPickup(profile: EffectiveRoundDifficulty, crocX: number, crocZ: number): void {
    if (this.activePickups.length >= profile.maxPickupsActive) return;

    const occupied = new Set(this.activePickups.map((p) => p.anchorId));
    const wantRare = this.rng() < profile.rareBuffChance;
    const pool = SPAWN_ANCHORS.filter((a) => {
      if (occupied.has(a.id)) return false;
      // Never spawn right next to the crocodile
      if (Math.hypot(a.x - crocX, a.z - crocZ) < 6.5) return false;
      return a.rarity === (wantRare ? 'rare' : 'common');
    });

    const fallbackPool =
      pool.length > 0
        ? pool
        : SPAWN_ANCHORS.filter(
            (a) => !occupied.has(a.id) && Math.hypot(a.x - crocX, a.z - crocZ) >= 5.5
          );
    if (fallbackPool.length === 0) return;

    const anchor = fallbackPool[Math.floor(this.rng() * fallbackPool.length)];
    const buffList = anchor.rarity === 'rare' ? this.rareBuffs : this.commonBuffs;
    const buff = buffList[Math.floor(this.rng() * buffList.length)];

    const { root, labelSprite } = this.buildPickupVisual(buff);
    root.position.set(anchor.x, anchor.y, anchor.z);
    this.group.add(root);

    const pickupId = `pk_${++this.spawnSeq}`;
    this.activePickups.push({
      id: pickupId,
      anchorId: anchor.id,
      buff,
      x: anchor.x,
      y: anchor.y,
      z: anchor.z,
      mesh: root,
      labelSprite,
    });

    this.bus.emit('pickup:spawned', {
      pickupId,
      buffId: buff.id,
      rarity: buff.rarity,
      x: anchor.x,
      z: anchor.z,
    });
  }

  private collect(pickup: ActivePickup, actorId: string): void {
    const idx = this.activePickups.findIndex((p) => p.id === pickup.id);
    if (idx < 0) return;
    this.activePickups.splice(idx, 1);
    this.group.remove(pickup.mesh);
    this.disposePickupMesh(pickup.mesh);

    const result = this.effects.collectBuff(actorId, pickup.buff.id);
    this.bus.emit('pickup:collected', {
      pickupId: pickup.id,
      buffId: pickup.buff.id,
      rarity: pickup.buff.rarity,
      actorId,
    });

    if (actorId === 'player') {
      this.audio.playPickup(pickup.buff.rarity === 'rare');
      const msg = result.replacedStored
        ? `Nhặt ${pickup.buff.name} (đã thay thế vật phẩm ô [F])`
        : pickup.buff.storable
        ? `Nhặt ${pickup.buff.name} — nhấn [F] để dùng!`
        : `Nhận buff ${pickup.buff.name}!`;
      this.bus.emit('toast:push', {
        message: msg,
        priority: 'medium',
        tone: 'success',
        durationMs: 2400,
      });
    }
  }

  update(params: {
    dt: number;
    elapsed: number;
    profile: EffectiveRoundDifficulty;
    crocX: number;
    crocZ: number;
    playerAlive: boolean;
    playerX: number;
    playerY: number;
    playerZ: number;
    eHeld: boolean;
    npcs: NPCAgent[];
  }): PickupPromptHUD | null {
    const { dt, elapsed, profile, crocX, crocZ, playerAlive, playerX, playerY, playerZ, eHeld, npcs } =
      params;

    // Periodic respawn
    this.respawnTimer -= dt;
    if (this.respawnTimer <= 0) {
      this.respawnTimer = profile.pickupRespawnSec;
      this.trySpawnPickup(profile, crocX, crocZ);
    }

    let nearestPrompt: PickupPromptHUD | null = null;
    let nearestDist = Infinity;
    let channelingCandidate: ActivePickup | null = null;

    for (let i = this.activePickups.length - 1; i >= 0; i--) {
      const p = this.activePickups[i];
      // Floating bob + rotation
      p.mesh.position.y = p.y + Math.sin(elapsed * 2.6 + i) * 0.14;
      p.mesh.rotation.y = elapsed * (p.buff.rarity === 'rare' ? 1.5 : 0.9);

      const dPlayer = playerAlive ? Math.hypot(playerX - p.x, playerZ - p.z) : Infinity;

      // Show floating name label ONLY when player approaches (< 6.5m) to prevent clutter
      if (p.labelSprite) {
        p.labelSprite.visible = dPlayer <= 6.5;
      }

      // Common instant pickup on touch
      if (playerAlive && p.buff.rarity === 'common' && dPlayer <= 1.65 && Math.abs(playerY - p.y) <= 1.8) {
        this.collect(p, 'player');
        continue;
      }

      // Rare pickup candidate for [E] hold
      if (playerAlive && p.buff.rarity === 'rare' && dPlayer <= 2.35 && dPlayer < nearestDist) {
        nearestDist = dPlayer;
        channelingCandidate = p;
      }

      // NPC pickup checks (touch collection; NPCs wait briefly on rare pickups naturally)
      for (const npc of npcs) {
        if (!npc.alive) continue;
        const dNpc = Math.hypot(npc.x - p.x, npc.z - p.z);
        if (dNpc <= 1.45) {
          this.collect(p, npc.id);
          break;
        }
      }
    }

    if (channelingCandidate) {
      const needHold = channelingCandidate.buff.channelTime || buffsConfig.limits.rareChannelDurationSec;
      if (eHeld) {
        if (this.channelingPickupId !== channelingCandidate.id) {
          this.channelingPickupId = channelingCandidate.id;
          this.channelProgress = 0;
        }
        this.channelProgress = Math.min(1, this.channelProgress + dt / needHold);
        if (this.channelProgress >= 1) {
          this.collect(channelingCandidate, 'player');
          this.channelingPickupId = null;
          this.channelProgress = 0;
          return null;
        }
      } else {
        this.channelingPickupId = null;
        this.channelProgress = 0;
      }

      const playerStored = this.effects.getHUDData('player').storedItem;
      nearestPrompt = {
        name: channelingCandidate.buff.name,
        rarity: channelingCandidate.buff.rarity,
        progress: this.channelProgress,
        requiresHold: true,
        replaceWarning: Boolean(channelingCandidate.buff.storable && playerStored),
      };
    } else {
      this.channelingPickupId = null;
      this.channelProgress = 0;
    }

    return nearestPrompt;
  }

  getActivePickups(): readonly ActivePickup[] {
    return this.activePickups;
  }
}
