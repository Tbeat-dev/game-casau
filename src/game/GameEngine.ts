import * as THREE from 'three';
import { AssetRegistry } from '../assets/AssetRegistry';
import { MaterialLibrary } from '../assets/MaterialLibrary';
import { ArenaManager } from './ArenaManager';
import { AudioManager } from './AudioManager';
import { CrocodileAI, type CrocTargetCandidate } from './CrocodileAI';
import { DifficultyManager } from './DifficultyManager';
import { EliminationManager } from './EliminationManager';
import { EventBus } from './EventBus';
import { NPCController } from './NPCController';
import { PickupManager } from './PickupManager';
import { PlayerController } from './PlayerController';
import { RoundManager } from './RoundManager';
import { SafeZoneManager } from './SafeZoneManager';
import { SkillManager } from './SkillManager';
import { SkyAtmosphereManager } from './SkyAtmosphereManager';
import { StatusEffectManager } from './StatusEffectManager';
import type {
  DebuffId,
  GamePhase,
  GameSettings,
  HUDSnapshot,
  PickupPromptHUD,
  SkillDraftOption,
  SkillId,
} from './types';

export class GameEngine {
  public bus = new EventBus();
  public registry = new AssetRegistry();
  public materialLibrary = new MaterialLibrary();
  public skyAtmosphere = new SkyAtmosphereManager();
  public audio = new AudioManager();
  public difficulty = new DifficultyManager();
  public statusEffects = new StatusEffectManager(this.bus);
  public skills = new SkillManager(this.bus, this.statusEffects);
  public safeZones = new SafeZoneManager();
  public arena = new ArenaManager(
    this.registry,
    this.safeZones,
    this.materialLibrary,
    this.skyAtmosphere
  );
  public pickupManager = new PickupManager(
    this.bus,
    this.registry,
    this.statusEffects,
    this.audio
  );
  public croc: CrocodileAI;
  public npcs: NPCController;
  public player: PlayerController;
  public elimination: EliminationManager;
  public rounds: RoundManager;

  public phase: GamePhase = 'loading';
  public settings: GameSettings = {
    sensitivity: 1.0,
    volume: 0.7,
    muted: false,
    graphicsQuality: 'high',
    language: 'vi',
    difficulty: 'normal',
    reduceBlindness: false,
    disableDizziness: false,
    fullVisualAudioSignals: false,
  };

  private container: HTMLElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private isSoftwareGl = false;
  private frameId = 0;
  private disposed = false;

  private clock = new THREE.Clock();
  private elapsed = 0;
  private survivalTime = 0;
  private skillsUsedCount = 0;
  private hitstopTimer = 0;
  private trauma = 0;
  private hudEmitTimer = 0;
  private keyHintTimer = 6.0;
  private draftOptions: SkillDraftOption[] = [];
  private currentPickupPrompt: PickupPromptHUD | null = null;
  private blindIntensity = 0;
  private dizzinessIntensity = 0;
  private deafened = false;

  // Environmental debuff scheduler state (mandatory 2.5s telegraph before applying)
  private debuffScheduleTimer = 8.0;
  private debuffsFiredInRound = 0;
  private lastScheduledDebuff: DebuffId | null = null;
  private pendingDebuff: { id: DebuffId; timer: number } | null = null;

  private onHUDUpdate: (snap: HUDSnapshot) => void;
  private onLoadProgress: (pct: number, label: string) => void;

  constructor(
    container: HTMLElement,
    onHUDUpdate: (snap: HUDSnapshot) => void,
    onLoadProgress: (pct: number, label: string) => void
  ) {
    this.container = container;
    this.onHUDUpdate = onHUDUpdate;
    this.onLoadProgress = onLoadProgress;

    this.croc = new CrocodileAI(this.bus, this.safeZones, this.skills, this.arena, this.audio);
    this.npcs = new NPCController(this.safeZones, this.skills, this.statusEffects);
    this.player = new PlayerController(
      this.safeZones,
      this.skills,
      this.arena,
      this.audio,
      this.statusEffects
    );
    this.elimination = new EliminationManager(this.bus, this.arena, this.audio);
    this.rounds = new RoundManager(
      this.bus,
      this.safeZones,
      this.skills,
      this.elimination,
      this.audio,
      this.difficulty,
      this.statusEffects
    );

    this.bus.on('skill:activated', (ev) => {
      if (ev.actorId === 'player') {
        this.skillsUsedCount += 1;
      }
    });

    this.bus.on('round:start', (ev) => {
      this.skyAtmosphere.setTargetRound(ev.roundNumber);
    });
  }

  async init(autostart: boolean): Promise<void> {
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(
      this.container.clientWidth || window.innerWidth,
      this.container.clientHeight || window.innerHeight
    );
    this.renderer.domElement.dataset.testid = 'game-canvas';
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.materialLibrary.setMaxAnisotropy(this.renderer.capabilities.getMaxAnisotropy());
    const manifest = await this.materialLibrary.init();
    await this.skyAtmosphere.init(this.scene, this.renderer, this.isSoftwareGl, manifest);

    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(68, w / h, 0.15, 240);

    // Preload core repo GLB nature & pickup assets with progress
    const essentialIds = [
      'env.tree.common_1',
      'env.tree.common_2',
      'env.tree.common_3',
      'env.tree.twisted_1',
      'env.tree.twisted_2',
      'env.rock.1',
      'env.rock.2',
      'env.rock.3',
      'env.reed.tall',
      'env.reed.plant',
      'env.bush.common',
      'env.bush.flowers',
      'env.flower.3',
      'env.flower.4',
      'env.mushroom.1',
      'vfx.petal.1',
    ];
    await this.registry.preloadEssential(essentialIds, (loaded, total, label) => {
      this.onLoadProgress(Math.round((loaded / total) * 100), label);
    });

    await this.arena.buildArena(this.scene, this.isSoftwareGl);
    await this.pickupManager.init(this.scene);
    this.croc.addToScene(this.scene);
    this.npcs.spawnAll(this.scene);
    this.player.resetRun();
    this.rounds.startRun();
    this.resetRoundEnvironment();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    window.addEventListener('resize', this.handleResize);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.handleResize);
      this.resizeObserver.observe(this.container);
    }
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleWindowBlur);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    this.renderer.domElement.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);

    this.setPhase(autostart ? 'playing' : 'title');
    if (autostart) {
      this.startNewRun();
    }

    this.clock.start();
    this.tick();
  }

  private resetRoundEnvironment(): void {
    const profile = this.rounds.getEffectiveProfile();
    this.pickupManager.resetForRound(
      profile,
      this.player.x,
      this.player.z,
      this.rounds.getCurrentRound().roundNumber
    );
    this.debuffsFiredInRound = 0;
    this.pendingDebuff = null;
    this.debuffScheduleTimer = Math.max(4.5, profile.debuffIntervalSec * 0.65);
    this.currentPickupPrompt = null;
    this.blindIntensity = 0;
    this.dizzinessIntensity = 0;
    this.deafened = false;
    this.audio.setDeafened(false);
    if (this.scene) {
      this.arena.updateFogVisibility(this.scene, 58);
    }
  }

  private setPhase(phase: GamePhase): void {
    this.phase = phase;
    const bodyState =
      phase === 'title'
        ? 'title'
        : phase === 'paused' || phase === 'skill_draft'
        ? 'paused'
        : phase === 'eliminated' || phase === 'victory'
        ? 'gameover'
        : 'playing';
    document.body.dataset.state = bodyState;
    if (phase !== 'playing') {
      this.player.clearInputs();
      if (document.pointerLockElement) {
        document.exitPointerLock?.();
      }
    }
    this.emitHUD();
  }

  startNewRun(): void {
    this.survivalTime = 0;
    this.skillsUsedCount = 0;
    this.keyHintTimer = 6.5;
    this.draftOptions = [];
    this.elimination.reset();
    this.npcs.spawnAll(this.scene);
    this.player.resetRun();
    this.skyAtmosphere.snapToRound(1);
    this.rounds.startRun();
    this.croc.resetForRound(this.rounds.getCurrentRound());
    this.resetRoundEnvironment();
    this.setPhase('playing');
  }

  pauseGame(): void {
    if (this.phase === 'playing') {
      this.setPhase('paused');
    }
  }

  resumeGame(): void {
    if (this.phase === 'paused') {
      this.setPhase('playing');
    }
  }

  returnToTitle(): void {
    this.statusEffects.clearAll();
    this.pickupManager.clearAll();
    this.audio.setDeafened(false);
    this.blindIntensity = 0;
    this.dizzinessIntensity = 0;
    this.deafened = false;
    this.skyAtmosphere.snapToRound(1);
    if (this.scene) {
      this.arena.updateFogVisibility(this.scene, 58);
    }
    this.setPhase('title');
  }

  chooseSkillDraft(skillId: SkillId): void {
    if (this.phase !== 'skill_draft') return;
    this.skills.applyDraftChoice('player', skillId);
    this.audio.playGong(440);
    this.npcs.resetForRound();
    this.player.resetForRound();
    this.rounds.startRound(this.rounds.currentRoundIndex + 1);
    this.croc.resetForRound(this.rounds.getCurrentRound());
    this.resetRoundEnvironment();
    this.keyHintTimer = 4.5;
    this.setPhase('playing');
  }

  cycleSpectator(dir = 1): void {
    this.elimination.cycleSpectator(this.npcs.agents, dir);
    this.emitHUD();
  }

  applySettings(next: Partial<GameSettings>): void {
    this.settings = { ...this.settings, ...next };
    if (next.difficulty) {
      this.difficulty.setDifficulty(next.difficulty);
    }
    this.player.setSensitivity(this.settings.sensitivity);
    this.audio.setVolume(this.settings.volume);
    this.audio.setMuted(this.settings.muted);
    if (!this.isSoftwareGl) {
      const pr =
        this.settings.graphicsQuality === 'high'
          ? Math.min(window.devicePixelRatio, 2)
          : this.settings.graphicsQuality === 'medium'
          ? 1.25
          : 1;
      this.renderer.setPixelRatio(pr);
    }
    this.emitHUD();
  }

  requestPointerLock(): void {
    if (this.phase === 'playing' && !this.isSoftwareGl) {
      try {
        this.renderer.domElement.requestPointerLock?.();
      } catch {
        // Ignore if denied in automated browser
      }
    }
  }

  private resizeObserver: ResizeObserver | null = null;

  private handleResize = (): void => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    if (w <= 0 || h <= 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderScene();
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'KeyM') {
      this.applySettings({ muted: !this.settings.muted });
      return;
    }

    if (this.phase === 'playing') {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        this.pauseGame();
        return;
      }
      if (e.code === 'KeyQ') {
        const res = this.player.triggerSkill('Q', this.npcs.agents);
        if (!res.ok && res.reason) {
          this.bus.emit('toast:push', {
            message: res.reason,
            priority: 'low',
            tone: 'info',
            durationMs: 1800,
          });
        }
        this.emitHUD();
        return;
      }
      if (e.code === 'KeyR') {
        const res = this.player.triggerSkill('R', this.npcs.agents);
        if (!res.ok && res.reason) {
          this.bus.emit('toast:push', {
            message: res.reason,
            priority: 'low',
            tone: 'info',
            durationMs: 1800,
          });
        }
        this.emitHUD();
        return;
      }
      if (e.code === 'KeyF') {
        const res = this.statusEffects.useStoredItem('player');
        if (res.ok) {
          this.audio.playPickup(true);
          this.bus.emit('toast:push', {
            message: res.message ?? 'Đã kích hoạt vật phẩm!',
            priority: 'high',
            tone: 'success',
            durationMs: 2400,
          });
        } else if (res.message) {
          this.bus.emit('toast:push', {
            message: res.message,
            priority: 'low',
            tone: 'info',
            durationMs: 1600,
          });
        }
        this.emitHUD();
        return;
      }
      // KeyE is held for rare pickup channeling in PlayerController.keysHeld
      this.player.handleKeyDown(e.code);
    } else if (this.phase === 'paused' && (e.code === 'Escape' || e.code === 'KeyP')) {
      e.preventDefault();
      this.resumeGame();
    } else if (this.phase === 'eliminated') {
      if (e.code === 'ArrowRight' || e.code === 'KeyD') this.cycleSpectator(1);
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.cycleSpectator(-1);
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.player.handleKeyUp(e.code);
  };

  private handleWindowBlur = (): void => {
    this.player.clearInputs();
  };

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.player.clearInputs();
    }
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (this.phase !== 'playing') return;
    if (document.pointerLockElement === this.renderer.domElement) {
      this.player.handleMouseMove(e.movementX, e.movementY);
    } else {
      this.player.handlePointerDrag(e.clientX, e.clientY);
    }
  };

  private handleMouseDown = (e: MouseEvent): void => {
    if (this.phase !== 'playing') return;
    this.player.handleMouseDown(e.clientX, e.clientY);
    this.requestPointerLock();
  };

  private handleMouseUp = (): void => {
    this.player.handleMouseUp();
  };

  private handlePointerLockChange = (): void => {
    this.emitHUD();
  };

  private updateEnvironmentalDebuffs(dt: number): void {
    if (this.rounds.subState !== 'ACTION' || this.rounds.timer < 4.5) return;
    const profile = this.rounds.getEffectiveProfile();
    if (profile.allowedDebuffs.length === 0) return;

    if (this.pendingDebuff) {
      this.pendingDebuff.timer -= dt;
      if (this.pendingDebuff.timer <= 0) {
        const debuffId = this.pendingDebuff.id;
        this.pendingDebuff = null;
        this.debuffsFiredInRound += 1;
        this.debuffScheduleTimer = profile.debuffIntervalSec;

        const durMul = profile.debuffDurationMul;
        const playerTargeted =
          debuffId !== 'reu_tron' || this.player.onPlatformOrBridge || this.player.inWater;
        if (this.player.alive && playerTargeted) {
          if (this.statusEffects.applyDebuff('player', debuffId, durMul)) {
            this.audio.playDebuffApplied();
          }
        }

        // Fairly apply to a subset of alive NPCs as well
        for (const npc of this.npcs.agents) {
          if (!npc.alive) continue;
          if (Math.random() < 0.38) {
            this.statusEffects.applyDebuff(npc.id, debuffId, durMul);
          }
        }
      }
      return;
    }

    if (this.debuffsFiredInRound >= profile.debuffBudget) return;
    this.debuffScheduleTimer -= dt;
    if (this.debuffScheduleTimer <= 0) {
      const candidates = profile.allowedDebuffs.filter(
        (d) =>
          d !== this.lastScheduledDebuff &&
          !(d === 'chong_mat' && this.settings.disableDizziness)
      );
      const pool = candidates.length > 0 ? candidates : profile.allowedDebuffs;
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      this.lastScheduledDebuff = chosen;
      this.pendingDebuff = { id: chosen, timer: 2.5 };

      const def = this.statusEffects.getDebuffDef(chosen);
      this.audio.playDebuffWarning();
      const nearest = this.safeZones.findNearestActiveZone(this.player.x, this.player.z);
      this.arena.triggerHazardTelegraph(
        nearest?.x ?? this.player.x,
        nearest?.z ?? this.player.z,
        3.5
      );
      this.bus.emit('toast:push', {
        message: def?.telegraphText ?? 'CẢNH BÁO: Biến cố môi trường sắp xảy ra!',
        priority: 'high',
        tone: 'danger',
        durationMs: 2500,
      });
    }
  }

  private tick = (): void => {
    if (this.disposed) return;

    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05);
    this.elapsed += dt;

    // Decaying trauma shake & hitstop
    this.trauma = Math.max(0, this.trauma - dt * 1.8);
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.renderScene();
      this.scheduleNextFrame();
      return;
    }

    if (this.phase === 'title') {
      // Atmospheric Live World Camera Tour over Vietnamese Village Lakeside
      const ang = this.elapsed * 0.14;
      this.camera.position.set(
        Math.sin(ang) * 32,
        13.5 + Math.sin(this.elapsed * 0.3) * 1.4,
        Math.cos(ang) * 32
      );
      this.camera.lookAt(0, 1.8, -6);
      this.safeZones.update(dt, false);
      this.arena.update(dt, this.elapsed, 35);
      this.croc.update(dt, this.rounds.getCurrentRound(), [], false, () => {});
    } else if (this.phase === 'playing' || this.phase === 'eliminated') {
      const round = this.rounds.getCurrentRound();
      const profile = this.rounds.getEffectiveProfile();
      this.survivalTime += this.player.alive ? dt : 0;
      this.keyHintTimer = Math.max(0, this.keyHintTimer - dt);

      const matCuActive = this.skills.isSkillActive('player', 'mat_cu');
      this.statusEffects.update(dt);
      this.skills.update(dt);
      this.safeZones.clearOccupants();
      this.safeZones.update(dt, matCuActive);
      this.arena.update(dt, this.elapsed, this.safeZones.getArenaRadius());

      let playerMotion = { movedDist: 0, isNoisy: false };
      if (this.player.alive) {
        playerMotion = this.player.update(
          dt,
          this.rounds.currentSignal ? !this.rounds.currentSignal.isValid : false,
          this.rounds.signalActive,
          profile.debuffDurationMul
        );
      }

      this.currentPickupPrompt = this.pickupManager.update({
        dt,
        elapsed: this.elapsed,
        profile,
        crocX: this.croc.x,
        crocZ: this.croc.z,
        playerAlive: this.player.alive,
        playerX: this.player.x,
        playerY: this.player.y,
        playerZ: this.player.z,
        eHeld: this.player.isKeyHeld('KeyE'),
        npcs: this.npcs.agents,
      });

      this.npcs.update(
        dt,
        round,
        this.rounds.signalActive,
        this.rounds.currentSignal ? !this.rounds.currentSignal.isValid : false,
        this.croc.x,
        this.croc.z,
        this.rounds.timer,
        this.pickupManager.getActivePickups()
      );

      if (this.phase === 'playing') {
        this.updateEnvironmentalDebuffs(dt);
      }

      // Build croc candidates
      const candidates: CrocTargetCandidate[] = [];
      if (this.player.alive) {
        candidates.push({
          id: 'player',
          x: this.player.x,
          y: this.player.y,
          z: this.player.z,
          inWater: this.player.inWater,
          alive: true,
        });
      }
      for (const n of this.npcs.agents) {
        if (n.alive) {
          candidates.push({
            id: n.id,
            x: n.x,
            y: n.y,
            z: n.z,
            inWater: n.inWater,
            alive: true,
          });
        }
      }

      this.croc.update(
        dt,
        round,
        candidates,
        matCuActive,
        (targetId) => {
          if (targetId === 'player') {
            // Lá Chắn Sen & Phao Tre NEVER stack on the same bite
            if (this.statusEffects.tryConsumeLotusShield('player')) {
              const dx = this.player.x - this.croc.x;
              const dz = this.player.z - this.croc.z;
              const len = Math.hypot(dx, dz) || 1;
              this.player.x += (dx / len) * 4.8;
              this.player.z += (dz / len) * 4.8;
              this.player.vy = 4.6;
              this.player.escapedCrocCount += 1;
              this.croc.stun(1.5);
              this.trauma = 0.45;
              this.audio.playPickup(true);
              this.bus.emit('toast:push', {
                message: 'Lá Chắn Sen đỡ đòn cá sấu!',
                priority: 'high',
                tone: 'success',
                durationMs: 2600,
              });
            } else if (this.skills.tryTriggerPhaoTre('player')) {
              const dx = this.player.x - this.croc.x;
              const dz = this.player.z - this.croc.z;
              const len = Math.hypot(dx, dz) || 1;
              this.player.x += (dx / len) * 5.2;
              this.player.z += (dz / len) * 5.2;
              this.player.vy = 5.5;
              this.player.escapedCrocCount += 1;
              this.croc.stun(1.8);
              this.trauma = 0.55;
              this.audio.playSkill('phao_tre');
              this.bus.emit('toast:push', {
                message: 'Phao Tre cứu nguy! Cá sấu bị choáng!',
                priority: 'high',
                tone: 'success',
                durationMs: 2600,
              });
            } else {
              this.hitstopTimer = 0.06;
              this.trauma = 0.85;
              this.elimination.eliminatePlayer(this.player, 'Bị cá sấu đớp!', () => {});
              this.difficulty.recordRunOutcome({
                won: false,
                roundsCleared: this.rounds.currentRoundIndex,
              });
              this.setPhase('eliminated');
            }
          } else {
            const npc = this.npcs.agents.find((n) => n.id === targetId);
            if (npc) {
              if (
                this.statusEffects.tryConsumeLotusShield(npc.id) ||
                this.skills.tryTriggerPhaoTre(npc.id)
              ) {
                this.croc.stun(1.5);
              } else {
                this.elimination.eliminateNPC(npc, 'Bị cá sấu bắt!');
              }
            }
          }
        },
        {
          profile,
          playerNoisy: playerMotion.isNoisy,
          onNearMissSplash: (targetId) => {
            const splashDebuff: DebuffId =
              profile.allowedDebuffs.includes('mu') && Math.random() < 0.45 ? 'mu' : 'giam_toc';
            if (!profile.allowedDebuffs.includes(splashDebuff)) return;
            const applied = this.statusEffects.applyDebuff(
              targetId,
              splashDebuff,
              profile.debuffDurationMul
            );
            if (applied && targetId === 'player') {
              this.audio.playDebuffApplied();
              const def = this.statusEffects.getDebuffDef(splashDebuff);
              this.bus.emit('toast:push', {
                message: `Cá sấu hất nước! Dính ${def?.name ?? 'Bất lợi'}`,
                priority: 'medium',
                tone: 'danger',
                durationMs: 2200,
              });
            }
          },
        }
      );

      this.rounds.update(
        dt,
        this.player,
        this.npcs.agents,
        (sig) => {
          this.npcs.onSignalIssued(sig.isValid);
          this.bus.emit('toast:push', {
            message: sig.text,
            priority: 'high',
            tone: 'signal',
            durationMs: this.settings.fullVisualAudioSignals ? 4600 : 3600,
          });
        },
        (_earned, hasNext) => {
          if (hasNext) {
            const nextNum = this.rounds.getCurrentRound().roundNumber + 1;
            this.draftOptions = this.skills.generateDraftOptions('player', nextNum);
            this.setPhase('skill_draft');
          }
        },
        (winnerName) => {
          this.difficulty.recordRunOutcome({
            won: this.player.alive,
            roundsCleared: this.rounds.rounds.length,
          });
          this.setPhase('victory');
          this.bus.emit('game:victory', {
            winnerName,
            survivalTimeSec: this.survivalTime,
          });
        }
      );

      // Apply Mù, Ù Tai & Chóng Mặt ONLY to 3D scene/audio (HUD stays completely legible)
      const envFx = this.statusEffects.getBlindAndDizziness({
        actorId: 'player',
        hasMatCuSkill: matCuActive,
        reduceBlindnessSetting: this.settings.reduceBlindness,
        disableDizzinessSetting: this.settings.disableDizziness,
      });
      this.blindIntensity = this.player.alive ? envFx.blindIntensity : 0;
      this.dizzinessIntensity = this.player.alive ? envFx.dizzinessIntensity : 0;
      this.deafened = this.player.alive && envFx.deafened;
      this.arena.updateFogVisibility(this.scene, this.player.alive ? envFx.visibleRange : 58);
      this.audio.setDeafened(this.deafened);

      // Position camera
      const shakeMag = this.trauma * this.trauma * 0.25;
      const sx = (Math.random() * 2 - 1) * shakeMag;
      const sy = (Math.random() * 2 - 1) * shakeMag;

      if (this.player.alive) {
        this.player.applyCamera(
          this.camera,
          sx,
          sy,
          this.dizzinessIntensity,
          this.elapsed
        );
      } else {
        const target = this.elimination.getSpectateTarget(this.npcs.agents);
        if (target) {
          const desiredX = target.x - Math.sin(target.yaw) * 6.5;
          const desiredZ = target.z - Math.cos(target.yaw) * 6.5;
          const k = 1 - Math.exp(-5 * dt);
          this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, desiredX, k);
          this.camera.position.y = THREE.MathUtils.lerp(
            this.camera.position.y,
            target.y + 4.2,
            k
          );
          this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, desiredZ, k);
          this.camera.lookAt(target.x, target.y + 1.0, target.z);
        }
      }

      // Throttled HUD updates <= 10Hz
      this.hudEmitTimer += dt;
      if (this.hudEmitTimer >= 0.1) {
        this.hudEmitTimer = 0;
        this.emitHUD();
      }
    }

    this.skyAtmosphere.update(dt, this.elapsed, this.camera.position);
    this.renderScene();
    this.scheduleNextFrame();
  };

  private renderScene(): void {
    this.renderer.render(this.scene, this.camera);
  }

  private scheduleNextFrame(): void {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          this.frameId = window.setTimeout(() => {
            if (!this.disposed) this.frameId = requestAnimationFrame(this.tick);
          }, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  private emitHUD(): void {
    const round = this.rounds.getCurrentRound();
    const aliveNpcs = this.npcs.agents.filter((n) => n.alive).length;
    const aliveCount = aliveNpcs + (this.player.alive ? 1 : 0);
    const nearest = this.safeZones.findNearestActiveZone(this.player.x, this.player.z);
    const pSkill = this.skills.getActor('player');
    const spectate = this.elimination.getSpectateTarget(this.npcs.agents);
    const fxHud = this.statusEffects.getHUDData('player');

    this.onHUDUpdate({
      phase: this.phase,
      roundSubState: this.rounds.subState,
      roundNumber: round.roundNumber,
      totalRounds: this.rounds.rounds.length,
      roundName: round.name,
      difficultyLabel: this.difficulty.getPresetLabel(),
      timeRemaining: this.rounds.timer,
      timeTotal: this.rounds.currentTotalTime,
      aliveCount,
      totalContestants: 12,
      crocState: this.croc.state,
      crocDistance: Math.hypot(this.croc.x - this.player.x, this.croc.z - this.player.z),
      signalText: this.rounds.currentSignal?.text ?? round.subtitle,
      signalIsFake: this.rounds.currentSignal ? !this.rounds.currentSignal.isValid : false,
      signalActive: this.rounds.signalActive,
      stamina: this.player.stamina,
      maxStamina: this.player.maxStamina,
      khiLuc: pSkill?.khiLuc ?? 100,
      maxKhiLuc: pSkill?.maxKhiLuc ?? 100,
      inSafeZone: this.player.inSafeZone,
      inWater: this.player.inWater,
      nearestSafeZoneLabel: nearest?.name ?? 'Vùng An Toàn',
      nearestSafeZoneOccupants: nearest?.occupants.length ?? 0,
      nearestSafeZoneCapacity: nearest?.capacity ?? 0,
      skillSlots: this.skills.getHUDSlots('player'),
      silencedSlot: fxHud.silencedSlot,
      activeBuffs: fxHud.activeBuffs,
      activeDebuffs: fxHud.activeDebuffs,
      storedItem: fxHud.storedItem,
      pickupPrompt: this.currentPickupPrompt,
      blindIntensity: this.blindIntensity,
      dizzinessIntensity: this.dizzinessIntensity,
      deafened: this.deafened,
      draftOptions: this.draftOptions,
      spectatingName: spectate?.name ?? 'Không còn thí sinh',
      stats: {
        roundsCleared:
          this.phase === 'victory'
            ? this.rounds.rounds.length
            : this.rounds.currentRoundIndex,
        survivalTimeSec: this.survivalTime,
        skillsUsed: this.skillsUsedCount,
        dotPhaPoints: this.rounds.dotPhaPoints,
        survivorsRemaining: aliveCount,
        winnerName: this.player.alive ? 'Bạn (Thí Sinh #01)' : spectate?.name ?? 'Cá Sấu',
        eliminationReason: this.elimination.eliminationReason,
      },
      keyHintsVisible: this.keyHintTimer > 0,
      matCuActive: this.skills.isSkillActive('player', 'mat_cu'),
      pointerLocked: document.pointerLockElement === this.renderer?.domElement,
    });
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.handleResize);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleWindowBlur);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    window.removeEventListener('mouseup', this.handleMouseUp);
    this.renderer?.domElement.removeEventListener('mousedown', this.handleMouseDown);
    this.pickupManager.clearAll();
    this.croc.rig.dispose();
    this.npcs.agents.forEach((a) => a.rig.dispose());
    this.skyAtmosphere.dispose();
    this.materialLibrary.dispose();
    this.registry.dispose();
    this.renderer?.dispose();
    if (this.renderer?.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
