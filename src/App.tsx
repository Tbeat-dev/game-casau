import { useCallback, useEffect, useRef, useState } from 'react';
import { GameHUD } from './components/GameHUD';
import {
  CreditsModal,
  EliminatedBanner,
  HowToPlayModal,
  PauseModal,
  SettingsModal,
  SkillDraftModal,
  VictoryModal,
} from './components/GameModals';
import { TitleScreen } from './components/TitleScreen';
import { GameEngine } from './game/GameEngine';
import type { GameSettings, HUDSnapshot, SkillId, ToastItem } from './game/types';
import { computeVirtualStage, type VirtualStageMetrics } from './ui/pixelLayout';
import { NineSlicePanel, PixelBar, PixelSprite } from './ui/PixelPrimitives';

type SubModal = 'none' | 'howto' | 'settings' | 'credits';

const PRIORITY_RANK: Record<ToastItem['priority'], number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [loadPct, setLoadPct] = useState(0);
  const [loadLabel, setLoadLabel] = useState('Khởi tạo đấu trường...');
  const [hud, setHud] = useState<HUDSnapshot | null>(null);
  const [subModal, setSubModal] = useState<SubModal>('none');
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [, setSettingsRev] = useState(0);
  const [stage, setStage] = useState<VirtualStageMetrics>(() =>
    typeof window !== 'undefined'
      ? computeVirtualStage(window.innerWidth, window.innerHeight)
      : computeVirtualStage(1440, 900)
  );

  useEffect(() => {
    const updateStage = () => {
      setStage(computeVirtualStage(window.innerWidth, window.innerHeight));
    };
    updateStage();
    window.addEventListener('resize', updateStage);
    return () => window.removeEventListener('resize', updateStage);
  }, []);

  const pushToast = useCallback((item: Omit<ToastItem, 'id' | 'createdAt'>) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = Date.now();
    setToasts((prev) => {
      const next = [...prev, { ...item, id, createdAt: now }];
      next.sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]);
      return next.slice(0, 3);
    });
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, item.durationMs);
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const autostart = new URLSearchParams(window.location.search).get('autostart') === '1';
    const engine = new GameEngine(
      container,
      (snap) => setHud(snap),
      (pct, label) => {
        setLoadPct(pct);
        setLoadLabel(label);
      }
    );
    engineRef.current = engine;

    const unsubToast = engine.bus.on('toast:push', (t) => pushToast(t));
    engine.init(autostart);

    return () => {
      unsubToast();
      engine.dispose();
      engineRef.current = null;
    };
  }, [pushToast]);

  const playUiClick = useCallback(() => {
    engineRef.current?.audio.playUiClick();
  }, []);

  const playPageFlip = useCallback(() => {
    engineRef.current?.audio.playPageFlip();
  }, []);

  const handleStart = useCallback(() => {
    setSubModal('none');
    engineRef.current?.startNewRun();
  }, []);

  // Title Screen Enter / Space start handshake
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (hud?.phase === 'title' && subModal === 'none') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          handleStart();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hud?.phase, subModal, handleStart]);

  const handleUpdateSettings = (next: Partial<GameSettings>) => {
    engineRef.current?.applySettings(next);
    setSettingsRev((r) => r + 1);
  };

  const handleTriggerSkill = (slot: 'Q' | 'R') => {
    const eng = engineRef.current;
    if (!eng) return;
    const res = eng.player.triggerSkill(slot, eng.npcs.agents);
    if (!res.ok && res.reason) {
      pushToast({ message: res.reason, priority: 'low', tone: 'info', durationMs: 1800 });
    }
  };

  const handleUseStoredItem = () => {
    const eng = engineRef.current;
    if (!eng) return;
    const res = eng.statusEffects.useStoredItem('player');
    if (res.ok) {
      eng.audio.playPickup(true);
      pushToast({
        message: res.message ?? 'Đã kích hoạt vật phẩm!',
        priority: 'high',
        tone: 'success',
        durationMs: 2400,
      });
    } else if (res.message) {
      pushToast({ message: res.message, priority: 'low', tone: 'info', durationMs: 1600 });
    }
  };

  const handleSelectDraft = (skillId: SkillId) => {
    engineRef.current?.chooseSkillDraft(skillId);
  };

  const phase = hud?.phase ?? 'loading';
  const blindAlpha =
    (phase === 'playing' || phase === 'eliminated') && hud && hud.blindIntensity > 0
      ? Math.min(0.62, hud.blindIntensity * 0.65)
      : 0;

  return (
    <div
      className="relative w-full h-full overflow-hidden font-pixel-vn"
      style={{ '--ui-k': stage.k } as React.CSSProperties}
    >
      {/* Isolated WebGL Canvas Container (z-index: 0) */}
      <div
        ref={mountRef}
        className="fixed inset-0 w-full h-full"
        style={{ zIndex: 'var(--z-canvas)' as unknown as number }}
      />

      {/* Canvas-only Mù peripheral haze (z-index: 2, strictly below HUD z-index: 10) */}
      {blindAlpha > 0 && (
        <div
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            zIndex: 'var(--z-canvas-fx)' as unknown as number,
            background: `radial-gradient(circle at center, rgba(220,199,161,${(
              blindAlpha * 0.16
            ).toFixed(2)}) 26%, rgba(196,174,138,${blindAlpha.toFixed(2)}) 95%)`,
          }}
        />
      )}

      {/* Loading Screen (z-index: 50) */}
      {phase === 'loading' && (
        <div
          className="fixed inset-0 flex flex-col items-center justify-center p-6 bg-[#1E1A16] text-[#F3E8CF]"
          style={{ zIndex: 'var(--z-loading)' as unknown as number }}
        >
          <NineSlicePanel
            sprite="ui.cover.red"
            k={Math.max(1, Math.min(2, stage.k))}
            className="max-w-[380px] w-full p-3"
          >
            <NineSlicePanel
              sprite="ui.popup.paper"
              k={Math.max(1, Math.min(2, stage.k))}
              className="p-4 text-center text-[#1E1A16]"
            >
              <div className="flex items-center justify-center gap-2">
                <PixelSprite id="ui.custom.crocodile" scale={2} />
                <h1 className="font-folk-title text-xl sm:text-2xl font-extrabold text-[#B3261E]">
                  CÁ SẤU LÊN BỜ
                </h1>
              </div>
              <p className="text-xs font-bold text-[#493333] mt-1">{loadLabel}</p>
              <div className="mt-3">
                <PixelBar ratio={loadPct / 100} fill="vermilion" k={2} heightScale={2} />
              </div>
              <div className="text-xs font-extrabold tabular-nums mt-1.5 text-[#B3261E]">
                {loadPct}%
              </div>
            </NineSlicePanel>
          </NineSlicePanel>
        </div>
      )}

      {/* Title Screen */}
      {phase === 'title' && subModal === 'none' && (
        <TitleScreen
          k={stage.k}
          difficulty={engineRef.current?.settings.difficulty ?? 'normal'}
          onSelectDifficulty={(difficulty) => handleUpdateSettings({ difficulty })}
          onStart={handleStart}
          onOpenHowToPlay={() => setSubModal('howto')}
          onOpenSettings={() => setSubModal('settings')}
          onOpenCredits={() => setSubModal('credits')}
          onUiSound={playUiClick}
        />
      )}

      {/* Integer-Scaled 480x270 Virtual HUD Stage (z-index: 10) */}
      {(phase === 'playing' || phase === 'eliminated') && hud && (
        <div
          id="virtual-hud-stage"
          data-virtual-scale={stage.k}
          data-stage-width={stage.stageW}
          data-stage-height={stage.stageH}
          className="fixed pointer-events-none"
          style={{
            left: `${stage.offsetX}px`,
            top: `${stage.offsetY}px`,
            width: `${stage.stageW}px`,
            height: `${stage.stageH}px`,
            zIndex: 'var(--z-hud)' as unknown as number,
          }}
        >
          <GameHUD
            k={stage.k}
            isCompactHeight={stage.viewportH < 640}
            hud={hud}
            toasts={toasts}
            muted={engineRef.current?.settings.muted ?? false}
            onToggleMute={() =>
              handleUpdateSettings({ muted: !(engineRef.current?.settings.muted ?? false) })
            }
            onPause={() => engineRef.current?.pauseGame()}
            onTriggerSkill={handleTriggerSkill}
            onUseStoredItem={handleUseStoredItem}
          />
        </div>
      )}

      {/* Single Modal Layer (z-index: 40) */}
      {subModal === 'howto' && (
        <HowToPlayModal
          k={stage.k}
          onUiSound={playUiClick}
          onPageFlip={playPageFlip}
          onClose={() => setSubModal('none')}
        />
      )}

      {subModal === 'settings' && engineRef.current && (
        <SettingsModal
          k={stage.k}
          settings={engineRef.current.settings}
          onChange={handleUpdateSettings}
          onUiSound={playUiClick}
          onClose={() => setSubModal('none')}
        />
      )}

      {subModal === 'credits' && (
        <CreditsModal
          k={stage.k}
          onUiSound={playUiClick}
          onClose={() => setSubModal('none')}
        />
      )}

      {phase === 'paused' && subModal === 'none' && (
        <PauseModal
          k={stage.k}
          onResume={() => engineRef.current?.resumeGame()}
          onRestart={handleStart}
          onOpenSettings={() => setSubModal('settings')}
          onOpenCredits={() => setSubModal('credits')}
          onTitle={() => engineRef.current?.returnToTitle()}
          onUiSound={playUiClick}
        />
      )}

      {phase === 'skill_draft' && hud && (
        <SkillDraftModal
          k={stage.k}
          roundNumber={hud.roundNumber}
          dotPhaPoints={hud.stats.dotPhaPoints}
          options={hud.draftOptions}
          onUiSound={playUiClick}
          onSelect={handleSelectDraft}
        />
      )}

      {phase === 'eliminated' && hud && (
        <EliminatedBanner
          k={stage.k}
          hud={hud}
          onCycleSpectator={(dir) => engineRef.current?.cycleSpectator(dir)}
          onRestart={handleStart}
          onTitle={() => engineRef.current?.returnToTitle()}
          onUiSound={playUiClick}
        />
      )}

      {phase === 'victory' && hud && (
        <VictoryModal
          k={stage.k}
          hud={hud}
          onRestart={handleStart}
          onTitle={() => engineRef.current?.returnToTitle()}
          onUiSound={playUiClick}
        />
      )}
    </div>
  );
}
