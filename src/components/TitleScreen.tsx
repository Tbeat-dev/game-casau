import React from 'react';
import type { DifficultyLevel } from '../game/types';
import { NineSlicePanel, PixelButton, PixelSprite } from '../ui/PixelPrimitives';

interface TitleScreenProps {
  k: number;
  difficulty: DifficultyLevel;
  onSelectDifficulty: (level: DifficultyLevel) => void;
  onStart: () => void;
  onOpenHowToPlay: () => void;
  onOpenSettings: () => void;
  onOpenCredits: () => void;
  onUiSound: () => void;
}

const DIFF_LABELS: { id: DifficultyLevel; label: string }[] = [
  { id: 'easy', label: 'Dễ' },
  { id: 'normal', label: 'Thường' },
  { id: 'hard', label: 'Khó' },
];

export const TitleScreen: React.FC<TitleScreenProps> = ({
  k,
  difficulty,
  onSelectDifficulty,
  onStart,
  onOpenHowToPlay,
  onOpenSettings,
  onOpenCredits,
  onUiSound,
}) => {
  const s = Math.max(1, Math.min(3, k));
  const titleSize = k >= 4 ? '2.1rem' : k === 3 ? '1.65rem' : '1.3rem';

  return (
    <div
      className="fixed inset-0 flex flex-col justify-between pointer-events-none"
      style={{
        zIndex: 'var(--z-modal)' as unknown as number,
        padding: `${Math.max(10, k * 8)}px`,
      }}
    >
      {/* Left negative-space Book Cover Menu ("Cuốn Sổ Hội Làng") */}
      <div className="flex items-start justify-start pointer-events-auto">
        <NineSlicePanel
          sprite="ui.cover.red"
          k={s}
          className="relative flex flex-col gap-2.5 shadow-2xl"
          style={{
            width: k >= 3 ? `${Math.min(440, 152 * k)}px` : 'min(340px, 92vw)',
            padding: `${Math.max(8, k * 3)}px ${Math.max(10, k * 4)}px`,
          }}
        >
          {/* Đông Hồ corners */}
          <PixelSprite
            id="ui.custom.corner"
            scale={Math.max(1, Math.min(2, k))}
            className="absolute top-1 left-1 opacity-90"
          />
          <PixelSprite
            id="ui.custom.corner"
            scale={Math.max(1, Math.min(2, k))}
            className="absolute top-1 right-1 opacity-90 -scale-x-100"
          />

          {/* Title Plaque inset */}
          <NineSlicePanel
            sprite="ui.popup.paper"
            k={Math.max(1, Math.min(2, k))}
            className="text-center px-2 py-1.5"
          >
            <div className="flex items-center justify-center gap-2">
              <PixelSprite id="ui.custom.crocodile" scale={Math.max(1, Math.min(2, k))} />
              <h1
                className="font-folk-title font-extrabold tracking-tight leading-none text-[#B3261E]"
                style={{ fontSize: titleSize }}
              >
                CÁ SẤU LÊN BỜ
              </h1>
              <PixelSprite id="ui.custom.contestant" scale={Math.max(1, Math.min(2, k))} />
            </div>
            <p className="text-[11px] sm:text-xs font-bold text-[#493333] mt-1">
              Sổ Hội Làng · Sinh Tồn Dân Gian 3D
            </p>
          </NineSlicePanel>

          {/* Difficulty Selector */}
          <div role="group" aria-label="Chọn độ khó" className="grid grid-cols-3 gap-1.5">
            {DIFF_LABELS.map((item) => {
              const active = difficulty === item.id;
              return (
                <PixelButton
                  key={item.id}
                  type="button"
                  k={Math.max(1, Math.min(2, k))}
                  variant={active ? 'tab-active' : 'tab-idle'}
                  onSound={onUiSound}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onSelectDifficulty(item.id);
                  }}
                  className="py-1 text-xs font-extrabold text-center whitespace-nowrap"
                >
                  {active ? `★ ${item.label}` : item.label}
                </PixelButton>
              );
            })}
          </div>

          {/* Primary Menu Buttons (<= 3 primary + subtle Credits) */}
          <nav aria-label="Menu chính" className="flex flex-col gap-2">
            <PixelButton
              type="button"
              data-start="true"
              k={Math.max(1, Math.min(2, k))}
              variant="primary"
              onSound={onUiSound}
              onClick={(e) => {
                e.currentTarget.blur();
                onStart();
              }}
              className="px-3 py-1.5 flex items-center justify-between font-extrabold text-sm sm:text-base whitespace-nowrap"
            >
              <span className="flex items-center gap-2 pixel-outline">
                <PixelSprite id="ui.icon.play" scale={1} />
                Chơi Ngay
              </span>
              <span className="text-[11px] text-[#FFD071] font-bold">[Enter]</span>
            </PixelButton>

            <PixelButton
              type="button"
              k={Math.max(1, Math.min(2, k))}
              variant="wood"
              onSound={onUiSound}
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenHowToPlay();
              }}
              className="px-3 py-1 flex items-center justify-between font-bold text-xs sm:text-sm whitespace-nowrap"
            >
              <span className="text-[#1E1A16]">Cách Chơi</span>
              <span className="text-[11px] text-[#493333]">Luật &amp; Kỹ Năng</span>
            </PixelButton>

            <PixelButton
              type="button"
              k={Math.max(1, Math.min(2, k))}
              variant="wood"
              onSound={onUiSound}
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenSettings();
              }}
              className="px-3 py-1 flex items-center justify-between font-bold text-xs sm:text-sm whitespace-nowrap"
            >
              <span className="flex items-center gap-1.5 text-[#1E1A16]">
                <PixelSprite id="ui.icon.gear" scale={1} inkOutline />
                Cài Đặt
              </span>
              <span className="text-[11px] text-[#493333]">Độ khó · Trợ năng</span>
            </PixelButton>
          </nav>

          {/* Subtle Footer Credits Link */}
          <div className="flex items-center justify-between pt-0.5 text-[11px] text-[#FFD071]">
            <PixelSprite id="ui.custom.divider" scale={1} className="opacity-85" />
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onUiSound();
                onOpenCredits();
              }}
              className="underline cursor-pointer font-bold hover:text-[#FFF4E0] focus-visible:outline-2 focus-visible:outline-[#FFD071]"
            >
              Ghi Công &amp; Bản Quyền
            </button>
          </div>
        </NineSlicePanel>
      </div>

      {/* Flat bottom control hint bar */}
      <div className="flex items-center justify-center">
        <p
          className="text-[11px] sm:text-xs font-semibold tracking-wide text-[#F3E8CF] px-3 py-1 border border-[#493333]"
          style={{
            background: 'rgba(30, 26, 22, 0.82)',
            textShadow: '0 1px 0 #1E1A16',
          }}
        >
          WASD Di chuyển · Q/R Kỹ năng · Giữ E Nhặt buff · F Dùng ô [F] · Esc Tạm dừng
        </p>
      </div>
    </div>
  );
};
