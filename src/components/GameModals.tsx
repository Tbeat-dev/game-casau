import React, { useEffect, useState } from 'react';
import difficultyConfig from '../config/difficulty.json';
import type {
  DifficultyLevel,
  GameSettings,
  HUDSnapshot,
  SkillDraftOption,
  SkillId,
} from '../game/types';
import { getSkillSpriteId, UI_ATLAS } from '../ui/atlas';
import {
  NineSlicePanel,
  PixelAnimatedSprite,
  PixelBar,
  PixelButton,
  PixelSprite,
  PixelToggle,
} from '../ui/PixelPrimitives';

type BookChapter = 'rules' | 'skills' | 'buffs' | 'controls';

const CHAPTERS: { id: BookChapter; label: string }[] = [
  { id: 'rules', label: 'Luật 4 Vòng' },
  { id: 'skills', label: 'Kỹ Năng' },
  { id: 'buffs', label: 'Buff & Bất Lợi' },
  { id: 'controls', label: 'Điều Khiển' },
];

export const HowToPlayModal: React.FC<{
  k: number;
  onUiSound: () => void;
  onPageFlip: () => void;
  onClose: () => void;
}> = ({ k, onUiSound, onPageFlip, onClose }) => {
  const [chapter, setChapter] = useState<BookChapter>('rules');
  const s = Math.max(1, Math.min(2, k));

  const switchChapter = (next: BookChapter) => {
    if (next !== chapter) {
      onPageFlip();
      setChapter(next);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-3 sm:p-4"
      style={{ zIndex: 'var(--z-modal)' as unknown as number, background: 'rgba(18, 12, 8, 0.78)' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="howto-title"
        className="max-w-[740px] w-full flex flex-col items-center"
      >
        {/* Bookmark Chapter Tabs using TravelBook Marker01a */}
        <div className="flex flex-wrap items-end justify-center gap-1.5 mb-1">
          {CHAPTERS.map((tab) => {
            const active = chapter === tab.id;
            return (
              <PixelButton
                key={tab.id}
                type="button"
                k={1}
                variant={active ? 'tab-active' : 'tab-idle'}
                onClick={() => switchChapter(tab.id)}
                className="px-3 py-1 text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap"
              >
                <PixelSprite id="ui.marker.tab" scale={1} className={active ? 'opacity-100' : 'opacity-65'} />
                <span>{tab.label}</span>
              </PixelButton>
            );
          })}
        </div>

        {/* Open 2-Page Book Layout */}
        <NineSlicePanel
          sprite="ui.cover.red"
          k={s}
          className="w-full p-2 sm:p-3 max-h-[84vh] overflow-y-auto"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
            <NineSlicePanel sprite="ui.page.left" k={s} className="p-3 sm:p-4 text-[#1E1A16]">
              <h2 id="howto-title" className="font-folk-title text-lg sm:text-xl font-extrabold text-[#B3261E]">
                SỔ HỘI LÀNG · CÁ SẤU LÊN BỜ
              </h2>
              <PixelSprite id="ui.custom.divider" scale={2} className="my-2" />
              {chapter === 'rules' && (
                <div className="space-y-2 text-xs sm:text-sm leading-relaxed">
                  <p>
                    <strong>1. Sinh tồn 4 vòng:</strong> Chạy lên <strong>Đảo Đá</strong>,{' '}
                    <strong>Sân Đình</strong> hoặc <strong>Bục Tre Nổi</strong> ngay khi có hiệu lệnh thật.
                  </p>
                  <p>
                    <strong>2. Cá sấu tuần tra:</strong> Rời mép nước trước khi hết giờ. Ai kẹt dưới nước hoặc ngoài vùng an toàn sẽ bị <strong>đóng triện loại</strong>.
                  </p>
                </div>
              )}
              {chapter === 'skills' && (
                <div className="space-y-2 text-xs sm:text-sm leading-relaxed">
                  <p>
                    <strong>Hệ thống Khí Lực:</strong> Sau mỗi vòng vượt qua, chọn 1 thẻ kỹ năng cho ô <strong>[Q]</strong>, <strong>[R]</strong> hoặc <strong>Bị Động</strong>.
                  </p>
                  <p>
                    <strong>Lưu ý công bằng:</strong> Kỹ năng hỗ trợ chạy trốn, nhảy xa, nhử trống — không thể bỏ qua luật vòng chơi hay sức chứa.
                  </p>
                </div>
              )}
              {chapter === 'buffs' && (
                <div className="space-y-2 text-xs sm:text-sm leading-relaxed">
                  <p>
                    <strong>Nhặt Buff:</strong> Buff xanh nhặt ngay khi chạm. Buff vàng hiếm cần{' '}
                    <strong>giữ phím [E]</strong> trong 0.8s để kênh.
                  </p>
                  <p>
                    <strong>Ô cất giữ [F]:</strong> Bùa Giải &amp; Lá Chắn Sen cất ở ô [F] để dùng lúc nguy cấp.
                  </p>
                </div>
              )}
              {chapter === 'controls' && (
                <div className="space-y-2 text-xs sm:text-sm leading-relaxed">
                  <p>
                    <strong>Di chuyển:</strong> Phím <strong>W A S D</strong> hoặc mũi tên. Giữ{' '}
                    <strong>Shift</strong> để chạy nhanh (tốn Thể lực).
                  </p>
                  <p>
                    <strong>Nhảy &amp; Góc nhìn:</strong> Phím <strong>Space</strong> để nhảy; nhấn vào màn hình hoặc rê chuột để xoay góc nhìn.
                  </p>
                </div>
              )}
            </NineSlicePanel>

            <NineSlicePanel sprite="ui.page.right" k={s} className="p-3 sm:p-4 text-[#1E1A16] flex flex-col justify-between">
              <div className="space-y-2 text-xs sm:text-sm leading-relaxed">
                <h3 className="font-folk-title text-base sm:text-lg font-extrabold text-[#493333]">
                  {chapter === 'rules' && 'Cảnh Báo Tín Hiệu Giả'}
                  {chapter === 'skills' && '8 Kỹ Năng Đột Phá'}
                  {chapter === 'buffs' && 'Né Hiệu Ứng Bất Lợi'}
                  {chapter === 'controls' && 'Phím Tắt Chiến Đấu'}
                </h3>
                <PixelSprite id="ui.line" scale={2} className="w-full h-1 opacity-70" />
                {chapter === 'rules' && (
                  <p>
                    Từ <strong>Vòng 3 – Tín Hiệu Giả</strong>, khoảng 30–40% hiệu lệnh trên đình là{' '}
                    <span className="text-[#B3261E] font-bold">giả mạo</span>. Đọc kỹ chữ trên bảng lệnh trước khi lao xuống hồ!
                  </p>
                )}
                {chapter === 'skills' && (
                  <p>
                    Gồm Nước Rút, Nhảy Sen, Mắt Cú, Tiếng Trống, Giữ Chỗ, Kéo Bạn (chủ động) và Thăng Bằng Tre, Phao Tre (bị động).
                  </p>
                )}
                {chapter === 'buffs' && (
                  <p>
                    Bùn Lầy, Sương Mù, Ù Tai, Rêu Trơn, Kiệt Sức, Chóng Mặt, Câm Lặng đều{' '}
                    <strong>báo trước 2.5s</strong>, tối đa 2 bất lợi cùng lúc và có 3s miễn nhiễm sau khi hết.
                  </p>
                )}
                {chapter === 'controls' && (
                  <ul className="space-y-1 text-xs font-semibold">
                    <li>• Q / R: Kích hoạt kỹ năng</li>
                    <li>• Giữ E (0.8s): Nhặt buff vàng hiếm</li>
                    <li>• F: Kích hoạt Bùa Giải / Lá Chắn Sen</li>
                    <li>• M: Tắt/bật âm · Esc / P: Tạm dừng</li>
                  </ul>
                )}
              </div>

              <div className="mt-4 flex justify-end">
                <PixelButton
                  type="button"
                  k={1}
                  variant="primary"
                  onSound={onUiSound}
                  onClick={onClose}
                  className="px-5 py-1.5 text-sm font-extrabold"
                >
                  <span className="pixel-outline">Đã Hiểu</span>
                </PixelButton>
              </div>
            </NineSlicePanel>
          </div>
        </NineSlicePanel>
      </div>
    </div>
  );
};

export const SettingsModal: React.FC<{
  k: number;
  settings: GameSettings;
  onChange: (next: Partial<GameSettings>) => void;
  onUiSound: () => void;
  onClose: () => void;
}> = ({ k, settings, onChange, onUiSound, onClose }) => {
  const s = Math.max(1, Math.min(2, k));
  const presets = Object.values(difficultyConfig.presets) as {
    id: DifficultyLevel;
    label: string;
    description: string;
  }[];
  const activePreset = presets.find((p) => p.id === settings.difficulty) ?? presets[1];

  const sensPct = Math.round(((settings.sensitivity - 0.3) / (2.2 - 0.3)) * 100);
  const volPct = Math.round(settings.volume * 100);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 'var(--z-modal)' as unknown as number, background: 'rgba(18, 12, 8, 0.78)' }}
    >
      <NineSlicePanel
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        sprite="ui.cover.red"
        k={s}
        className="max-w-[520px] w-full p-2.5 sm:p-3 max-h-[92vh] overflow-y-auto"
      >
        <NineSlicePanel sprite="ui.popup.paper" k={s} className="p-3.5 sm:p-4 text-[#1E1A16]">
          <div className="flex items-center justify-center gap-2">
            <PixelSprite id="ui.icon.gear" scale={s} inkOutline />
            <h2 id="settings-title" className="font-folk-title text-xl sm:text-2xl font-extrabold text-[#B3261E]">
              CÀI ĐẶT &amp; TRỢ NĂNG
            </h2>
          </div>

        <div className="mt-3 space-y-3 text-xs sm:text-sm font-bold">
          {/* Difficulty Tabs */}
          <div>
            <span className="block mb-1">Độ khó đấu trường</span>
            <div className="grid grid-cols-3 gap-1.5">
              {presets.map((p) => {
                const selected = settings.difficulty === p.id;
                return (
                  <PixelButton
                    key={p.id}
                    type="button"
                    k={1}
                    variant={selected ? 'primary' : 'tab-idle'}
                    onSound={onUiSound}
                    onClick={() => onChange({ difficulty: p.id })}
                    className="py-1 text-xs font-extrabold"
                  >
                    <span className={selected ? 'pixel-outline' : ''}>{p.label}</span>
                  </PixelButton>
                );
              })}
            </div>
            <p className="text-[11px] font-semibold text-[#493333] mt-1">{activePreset.description}</p>
          </div>

          {/* Mouse Sensitivity Slider with TravelBook Handle03a & +/- Buttons */}
          <div>
            <div className="flex justify-between mb-1">
              <span>Độ nhạy chuột</span>
              <span className="tabular-nums">{settings.sensitivity.toFixed(1)}×</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Giảm độ nhạy chuột"
                onClick={() => {
                  onUiSound();
                  onChange({ sensitivity: Math.max(0.3, Number((settings.sensitivity - 0.1).toFixed(1))) });
                }}
                className="cursor-pointer p-1"
              >
                <PixelSprite id="ui.btnValue.minus" scale={2} />
              </button>
              <div className="relative flex-1 flex items-center">
                <PixelBar ratio={sensPct / 100} fill="turmeric" k={s} heightScale={2} />
                <img
                  src={UI_ATLAS['ui.slider.handle'].src}
                  alt=""
                  aria-hidden="true"
                  className="pixelated pointer-events-none absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                  style={{ left: `${sensPct}%`, width: '14px', height: '16px' }}
                />
                <input
                  type="range"
                  aria-label="Độ nhạy chuột"
                  min="0.3"
                  max="2.2"
                  step="0.1"
                  value={settings.sensitivity}
                  onChange={(e) => onChange({ sensitivity: parseFloat(e.target.value) })}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer"
                />
              </div>
              <button
                type="button"
                aria-label="Tăng độ nhạy chuột"
                onClick={() => {
                  onUiSound();
                  onChange({ sensitivity: Math.min(2.2, Number((settings.sensitivity + 0.1).toFixed(1))) });
                }}
                className="cursor-pointer p-1"
              >
                <PixelSprite id="ui.btnValue.plus" scale={2} />
              </button>
            </div>
          </div>

          {/* Volume Slider */}
          <div>
            <div className="flex justify-between mb-1">
              <span>Âm lượng</span>
              <span className="tabular-nums">{volPct}%</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Giảm âm lượng"
                onClick={() => {
                  onUiSound();
                  onChange({ volume: Math.max(0, Number((settings.volume - 0.1).toFixed(2))) });
                }}
                className="cursor-pointer p-1"
              >
                <PixelSprite id="ui.btnValue.minus" scale={2} />
              </button>
              <div className="relative flex-1 flex items-center">
                <PixelBar ratio={settings.volume} fill="bamboo" k={s} heightScale={2} />
                <img
                  src={UI_ATLAS['ui.slider.handle'].src}
                  alt=""
                  aria-hidden="true"
                  className="pixelated pointer-events-none absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                  style={{ left: `${volPct}%`, width: '14px', height: '16px' }}
                />
                <input
                  type="range"
                  aria-label="Âm lượng"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.volume}
                  onChange={(e) => onChange({ volume: parseFloat(e.target.value) })}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer"
                />
              </div>
              <button
                type="button"
                aria-label="Tăng âm lượng"
                onClick={() => {
                  onUiSound();
                  onChange({ volume: Math.min(1, Number((settings.volume + 0.1).toFixed(2))) });
                }}
                className="cursor-pointer p-1"
              >
                <PixelSprite id="ui.btnValue.plus" scale={2} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span>Tắt âm thanh</span>
            <PixelToggle
              checked={settings.muted}
              onChange={(muted) => onChange({ muted })}
              label="Tắt âm thanh"
              k={2}
              onSound={onUiSound}
            />
          </div>

          {/* Graphics Quality Dropdown */}
          <label className="block">
            <span className="block mb-1">Chất lượng đồ họa</span>
            <div className="relative flex items-center">
              <select
                value={settings.graphicsQuality}
                onChange={(e) =>
                  onChange({ graphicsQuality: e.target.value as GameSettings['graphicsQuality'] })
                }
                className="w-full appearance-none px-3 py-1.5 pr-8 border-2 border-[#493333] bg-[#F3E8CF] text-[#1E1A16] font-bold cursor-pointer"
              >
                <option value="high">Cao (Chi tiết đầy đủ)</option>
                <option value="medium">Trung bình</option>
                <option value="low">Thấp (Tối ưu FPS)</option>
              </select>
              <PixelSprite
                id="ui.dropdown.handle"
                scale={2}
                className="pointer-events-none absolute right-2"
              />
            </div>
          </label>

          {/* Accessibility Toggles */}
          <div className="pt-2 border-t-2 border-[#493333]/30 space-y-2">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#493333]">
              Tùy chọn trợ năng
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>Giảm cường độ Mù &amp; Lắc camera</span>
              <PixelToggle
                checked={settings.reduceBlindness}
                onChange={(reduceBlindness) => onChange({ reduceBlindness })}
                label="Giảm cường độ Mù & Lắc camera"
                k={2}
                onSound={onUiSound}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>Tắt hiệu ứng Chóng Mặt</span>
              <PixelToggle
                checked={settings.disableDizziness}
                onChange={(disableDizziness) => onChange({ disableDizziness })}
                label="Tắt hiệu ứng Chóng Mặt"
                k={2}
                onSound={onUiSound}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>Tín hiệu chữ &amp; âm rõ ràng hơn</span>
              <PixelToggle
                checked={settings.fullVisualAudioSignals}
                onChange={(fullVisualAudioSignals) => onChange({ fullVisualAudioSignals })}
                label="Tín hiệu chữ & âm rõ ràng hơn"
                k={2}
                onSound={onUiSound}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-center">
          <PixelButton
            type="button"
            k={1}
            variant="primary"
            onSound={onUiSound}
            onClick={onClose}
            className="px-6 py-1.5 text-sm font-extrabold"
          >
            <span className="pixel-outline">Lưu &amp; Đóng</span>
          </PixelButton>
        </div>
        </NineSlicePanel>
      </NineSlicePanel>
    </div>
  );
};

export const PauseModal: React.FC<{
  k: number;
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onOpenCredits: () => void;
  onTitle: () => void;
  onUiSound: () => void;
}> = ({ k, onResume, onRestart, onOpenSettings, onOpenCredits, onTitle, onUiSound }) => {
  const s = Math.max(1, Math.min(2, k));
  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 'var(--z-modal)' as unknown as number, background: 'rgba(18, 12, 8, 0.78)' }}
    >
      <NineSlicePanel
        role="dialog"
        aria-modal="true"
        aria-labelledby="pause-title"
        sprite="ui.cover.red"
        k={s}
        className="max-w-[380px] w-full p-2.5 sm:p-3 text-center"
      >
        <NineSlicePanel sprite="ui.popup.paper" k={s} className="p-4 text-[#1E1A16]">
          <div className="flex items-center justify-center gap-2">
            <PixelSprite id="ui.icon.pause" scale={s} inkOutline />
            <h2 id="pause-title" className="font-folk-title text-2xl font-extrabold text-[#B3261E]">
              TẠM DỪNG
            </h2>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <PixelButton type="button" k={1} variant="primary" onSound={onUiSound} onClick={onResume} className="py-1.5 font-extrabold text-sm">
              <span className="inline-flex items-center gap-1.5 pixel-outline">
                <PixelSprite id="ui.icon.play" scale={1} inkOutline />
                Tiếp Tục Chơi
              </span>
            </PixelButton>
            <PixelButton type="button" k={1} variant="wood" onSound={onUiSound} onClick={onRestart} className="py-1.5 font-bold text-sm">
              <span className="inline-flex items-center gap-1.5 text-[#1E1A16]">
                <PixelSprite id="ui.icon.restart" scale={1} inkOutline />
                Chơi Lại Từ Đầu
              </span>
            </PixelButton>
            <PixelButton type="button" k={1} variant="wood" onSound={onUiSound} onClick={onOpenSettings} className="py-1.5 font-bold text-sm">
              <span className="inline-flex items-center gap-1.5 text-[#1E1A16]">
                <PixelSprite id="ui.icon.gear" scale={1} inkOutline />
                Cài Đặt
              </span>
            </PixelButton>
            <PixelButton type="button" k={1} variant="wood" onSound={onUiSound} onClick={onOpenCredits} className="py-1.5 font-bold text-sm">
              <span className="text-[#1E1A16]">Ghi Công &amp; Bản Quyền</span>
            </PixelButton>
            <PixelButton type="button" k={1} variant="wood" onSound={onUiSound} onClick={onTitle} className="py-1.5 font-bold text-sm">
              <span className="inline-flex items-center gap-1.5 text-[#1E1A16]">
                <PixelSprite id="ui.icon.home" scale={1} inkOutline />
                Về Màn Hình Chính
              </span>
            </PixelButton>
          </div>
        </NineSlicePanel>
      </NineSlicePanel>
    </div>
  );
};

export const SkillDraftModal: React.FC<{
  k: number;
  roundNumber: number;
  dotPhaPoints: number;
  options: SkillDraftOption[];
  onUiSound: () => void;
  onSelect: (skillId: SkillId) => void;
}> = ({ k, roundNumber, dotPhaPoints, options, onUiSound, onSelect }) => {
  const [hoveredIdx, setHoveredIdx] = useState(0);
  const s = Math.max(1, Math.min(2, k));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '1' && options[0]) onSelect(options[0].skill.id);
      if (e.key === '2' && options[1]) onSelect(options[1].skill.id);
      if (e.key === '3' && options[2]) onSelect(options[2].skill.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [options, onSelect]);

  const focusedOpt = options[hoveredIdx] ?? options[0];

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-3 sm:p-4"
      style={{ zIndex: 'var(--z-modal)' as unknown as number, background: 'rgba(18, 12, 8, 0.8)' }}
    >
      <NineSlicePanel
        role="dialog"
        aria-modal="true"
        aria-labelledby="draft-title"
        sprite="ui.cover.red"
        k={s}
        className="max-w-[780px] w-full p-2.5 sm:p-3.5 max-h-[90vh] overflow-y-auto"
      >
        <div className="grid grid-cols-1 md:grid-cols-[1.45fr_1fr] gap-2">
          {/* Left Page: 3 Selectable Skill Cards */}
          <NineSlicePanel sprite="ui.page.left" k={s} className="p-3 sm:p-4 text-[#1E1A16]">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#4F6F3A]">
              Vượt Qua Vòng {roundNumber} · Điểm Đột Phá: {dotPhaPoints}
            </div>
            <h2 id="draft-title" className="font-folk-title text-lg sm:text-xl font-extrabold text-[#B3261E] mt-0.5">
              CHỌN 1 THẺ KỸ NĂNG ĐỘT PHÁ
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
              {options.map((opt, idx) => {
                const isFocused = idx === hoveredIdx;
                return (
                  <button
                    key={opt.skill.id}
                    type="button"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onFocus={() => setHoveredIdx(idx)}
                    onClick={() => {
                      onUiSound();
                      onSelect(opt.skill.id);
                    }}
                    className="relative text-left p-2 flex flex-col justify-between gap-2 cursor-pointer pixel-btn-interactive"
                  >
                    <NineSlicePanel
                      sprite={isFocused ? 'ui.popup.danger' : 'ui.popup.wood'}
                      k={1}
                      className="w-full h-full p-2 flex flex-col justify-between gap-2 text-[#F3E8CF]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-[#E0A526] text-[#1E1A16]">
                          [{idx + 1}] {opt.isUpgrade ? `Lv.${opt.nextLevel}` : opt.skill.type === 'passive' ? 'Bị Động' : 'Chủ Động'}
                        </span>
                        <div className="relative flex items-center justify-center">
                          <PixelSprite id={getSkillSpriteId(opt.skill.icon)} scale={2} />
                          {isFocused && (
                            <PixelAnimatedSprite
                              anim="slotCursor"
                              scale={1}
                              className="absolute -inset-1 pointer-events-none"
                            />
                          )}
                        </div>
                      </div>
                      <div>
                        <h3 className="font-folk-title text-sm font-extrabold text-[#FFD071]">
                          {opt.skill.name}
                        </h3>
                        <p className="text-[11px] text-[#F3E8CF] mt-0.5 leading-snug line-clamp-2">
                          {opt.skill.description}
                        </p>
                      </div>
                    </NineSlicePanel>
                  </button>
                );
              })}
            </div>
          </NineSlicePanel>

          {/* Right Page: Live Card Details */}
          <NineSlicePanel sprite="ui.page.right" k={s} className="p-3 sm:p-4 text-[#1E1A16] flex flex-col justify-between">
            {focusedOpt && (
              <div>
                <div className="text-[11px] font-extrabold uppercase text-[#493333]">
                  Chi Tiết Thẻ Đột Phá
                </div>
                <div className="flex items-center gap-2.5 mt-2">
                  <NineSlicePanel sprite="ui.slot.active" k={1} className="p-1.5 inline-flex">
                    <PixelSprite id={getSkillSpriteId(focusedOpt.skill.icon)} scale={2} />
                  </NineSlicePanel>
                  <div>
                    <div className="font-folk-title text-lg font-extrabold text-[#B3261E]">
                      {focusedOpt.skill.name}
                    </div>
                    <div className="text-xs font-bold text-[#493333]">
                      {focusedOpt.skill.type === 'passive' ? 'Kỹ năng Bị Động' : 'Kỹ năng Chủ Động [Q/R]'}
                    </div>
                  </div>
                </div>
                <PixelSprite id="ui.custom.divider" scale={2} className="my-2.5" />
                <p className="text-xs sm:text-sm font-medium leading-relaxed">
                  {focusedOpt.skill.description}
                </p>
                <div className="mt-3 space-y-1 text-xs font-bold tabular-nums text-[#493333]">
                  {focusedOpt.skill.type === 'passive' ? (
                    <div>Hiệu lực: Tự động kích hoạt trong vòng đấu</div>
                  ) : (
                    <>
                      <div>Tiêu hao Khí Lực: {focusedOpt.skill.khiLucCost}</div>
                      <div>Thời gian hồi: {focusedOpt.effectiveCooldown}s</div>
                      <div>Thời gian duy trì: {focusedOpt.effectiveDuration}s</div>
                    </>
                  )}
                  <div>Hữu ích ở Vòng: {focusedOpt.skill.bestRounds.join(', ')}</div>
                </div>
              </div>
            )}
            <div className="text-[11px] font-bold text-[#493333] mt-3">
              Nhấn trực tiếp thẻ hoặc phím 1 / 2 / 3 để chọn.
            </div>
          </NineSlicePanel>
        </div>
      </NineSlicePanel>
    </div>
  );
};

export const EliminatedBanner: React.FC<{
  k: number;
  hud: HUDSnapshot;
  onCycleSpectator: (dir: number) => void;
  onRestart: () => void;
  onTitle: () => void;
  onUiSound: () => void;
}> = ({ k, hud, onCycleSpectator, onRestart, onTitle, onUiSound }) => {
  const s = Math.max(1, Math.min(2, k));
  return (
    <div
      className="fixed inset-x-0 bottom-4 flex justify-center px-3 pointer-events-none"
      style={{ zIndex: 'var(--z-status)' as unknown as number }}
    >
      <NineSlicePanel
        sprite="ui.popup.paper"
        k={s}
        className="max-w-[600px] w-full px-4 py-3 pointer-events-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[#1E1A16]"
      >
        <div className="flex items-center gap-3">
          <PixelSprite id="ui.custom.seal" scale={2} alt="Ấn triện loại" />
          <div>
            <div className="text-xs font-extrabold uppercase tracking-wider text-[#B3261E]">
              BỊ LOẠI · ĐÓNG TRIỆN SỔ HỘI
            </div>
            <div className="text-sm font-bold mt-0.5">
              Lý do: {hud.stats.eliminationReason || 'Không vào vùng an toàn'}
            </div>
            <div className="text-xs font-semibold text-[#493333] mt-0.5">
              Đang quan sát: <strong>{hud.spectatingName}</strong>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <PixelButton
            type="button"
            k={1}
            variant="wood"
            onSound={onUiSound}
            onClick={() => onCycleSpectator(1)}
            className="px-2.5 py-1 text-xs font-bold"
          >
            <span className="text-[#1E1A16]">Đổi Góc Nhìn</span>
          </PixelButton>
          <PixelButton
            type="button"
            data-start="true"
            k={1}
            variant="primary"
            onSound={onUiSound}
            onClick={onRestart}
            className="px-3.5 py-1 text-xs font-extrabold"
          >
            <span className="pixel-outline">Chơi Lại</span>
          </PixelButton>
          <PixelButton
            type="button"
            k={1}
            variant="wood"
            onSound={onUiSound}
            onClick={onTitle}
            className="px-2.5 py-1 text-xs font-bold"
          >
            <span className="text-[#1E1A16]">Menu</span>
          </PixelButton>
        </div>
      </NineSlicePanel>
    </div>
  );
};

export const VictoryModal: React.FC<{
  k: number;
  hud: HUDSnapshot;
  onRestart: () => void;
  onTitle: () => void;
  onUiSound: () => void;
}> = ({ k, hud, onRestart, onTitle, onUiSound }) => {
  const s = Math.max(1, Math.min(2, k));
  const starCount = hud.stats.dotPhaPoints >= 80 ? 3 : hud.stats.dotPhaPoints >= 40 ? 2 : 1;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 'var(--z-modal)' as unknown as number, background: 'rgba(18, 12, 8, 0.8)' }}
    >
      <NineSlicePanel
        role="dialog"
        aria-modal="true"
        aria-labelledby="victory-title"
        sprite="ui.cover.red"
        k={s}
        className="max-w-[500px] w-full p-2.5 sm:p-3.5 text-center"
      >
        <NineSlicePanel sprite="ui.popup.paper" k={s} className="p-4 text-[#1E1A16]">
          <div className="flex items-center justify-center gap-3">
            <PixelSprite id="ui.custom.flag" scale={2} />
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-widest text-[#B3261E]">
                CỜ HỘI CHIẾN THẮNG
              </div>
              <h2 id="victory-title" className="font-folk-title text-2xl sm:text-3xl font-extrabold text-[#B3261E]">
                CHIẾN THẮNG!
              </h2>
            </div>
            <PixelSprite id="ui.custom.flag" scale={2} className="-scale-x-100" />
          </div>

          <div className="flex items-center justify-center gap-2 mt-2" aria-label={`Đánh giá ${starCount}/3 sao`}>
            {[1, 2, 3].map((idx) => (
              <PixelSprite
                key={idx}
                id={idx <= starCount ? 'ui.icon.star.full' : 'ui.icon.star.empty'}
                scale={2}
              />
            ))}
          </div>

          <p className="text-sm font-bold text-[#1E1A16] mt-2">
            Người sống sót cuối cùng: {hud.stats.winnerName}
          </p>

          <div className="grid grid-cols-3 gap-2 mt-4">
            <NineSlicePanel sprite="ui.popup.wood" k={1} className="p-2 text-[#F3E8CF]">
              <div className="text-[10px] font-bold text-[#FFD071] uppercase">Thời gian</div>
              <div className="text-base sm:text-lg font-extrabold tabular-nums">
                {Math.round(hud.stats.survivalTimeSec)}s
              </div>
            </NineSlicePanel>
            <NineSlicePanel sprite="ui.popup.wood" k={1} className="p-2 text-[#F3E8CF]">
              <div className="text-[10px] font-bold text-[#FFD071] uppercase">Điểm Đột Phá</div>
              <div className="text-base sm:text-lg font-extrabold tabular-nums">
                {hud.stats.dotPhaPoints}
              </div>
            </NineSlicePanel>
            <NineSlicePanel sprite="ui.popup.wood" k={1} className="p-2 text-[#F3E8CF]">
              <div className="text-[10px] font-bold text-[#FFD071] uppercase">Kỹ Năng Dùng</div>
              <div className="text-base sm:text-lg font-extrabold tabular-nums">
                {hud.stats.skillsUsed}
              </div>
            </NineSlicePanel>
          </div>

          <div className="mt-5 flex justify-center gap-3">
            <PixelButton
              type="button"
              data-start="true"
              k={1}
              variant="primary"
              onSound={onUiSound}
              onClick={onRestart}
              className="px-5 py-1.5 text-sm font-extrabold"
            >
              <span className="pixel-outline">Chơi Lại</span>
            </PixelButton>
            <PixelButton
              type="button"
              k={1}
              variant="wood"
              onSound={onUiSound}
              onClick={onTitle}
              className="px-4 py-1.5 text-sm font-bold"
            >
              <span className="text-[#1E1A16]">Màn Hình Chính</span>
            </PixelButton>
          </div>
        </NineSlicePanel>
      </NineSlicePanel>
    </div>
  );
};

export const CreditsModal: React.FC<{
  k: number;
  onUiSound: () => void;
  onClose: () => void;
}> = ({ k, onUiSound, onClose }) => {
  const s = Math.max(1, Math.min(2, k));
  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 'var(--z-modal)' as unknown as number, background: 'rgba(18, 12, 8, 0.8)' }}
    >
      <NineSlicePanel
        role="dialog"
        aria-modal="true"
        aria-labelledby="credits-title"
        sprite="ui.cover.red"
        k={s}
        className="max-w-[560px] w-full p-2.5 sm:p-3 max-h-[90vh] overflow-y-auto"
      >
        <NineSlicePanel sprite="ui.popup.paper" k={s} className="p-3.5 sm:p-4 text-[#1E1A16]">
          <div className="flex items-center justify-center gap-2">
            <PixelSprite id="ui.icon.coin" scale={2} inkOutline />
            <h2 id="credits-title" className="font-folk-title text-xl sm:text-2xl font-extrabold text-[#B3261E]">
              GHI CÔNG &amp; BẢN QUYỀN TÀI NGUYÊN
            </h2>
          </div>

          <PixelSprite id="ui.custom.divider" scale={2} className="my-2.5 mx-auto" />

          <div className="space-y-2.5 text-xs sm:text-sm leading-relaxed">
            <div className="p-2.5 border-2 border-[#493333] bg-[#e8d7b2]">
              <div className="font-extrabold text-[#B3261E]">
                Complete UI Book Styles Pack Free v1.0 (“TravelBook Lite”)
              </div>
              <div>
                <strong>Tác giả:</strong> Crusenho Agus Hennihuno (https://crusenho.itch.io)
              </div>
              <div className="break-all">
                <strong>Trang sản phẩm:</strong> https://crusenho.itch.io/complete-ui-book-styles-pack
              </div>
              <div className="mt-1">
                <strong>Thay đổi đã thực hiện:</strong> Chỉnh bảng màu sang son đỏ, giấy dó, tre xanh, vàng nghệ và bổ sung biểu tượng kỹ năng/bất lợi/ấn triện dân gian cùng mật độ pixel. Không bán lại hay tái xuất bản tệp tài nguyên gốc.
              </div>
            </div>

            <div className="p-2.5 border-2 border-[#493333] bg-[#e8d7b2]">
              <div className="font-extrabold text-[#493333]">
                Kho tham khảo UI gốc (chỉ đọc):
              </div>
              <div>github.com/levantuannnn/codejs (commit 468289d). Bộ Pixel UI HUD của indigolay chỉ dùng đối chiếu mật độ pixel, không đưa vào giao diện chính.</div>
            </div>

            <div className="text-xs text-[#493333] font-semibold">
              Phông chữ: Be Vietnam Pro &amp; Noto Serif (OFL) · Âm thanh dân gian: Tổng hợp Web Audio API.
            </div>
          </div>

          <div className="mt-4 flex justify-center">
            <PixelButton
              type="button"
              k={1}
              variant="primary"
              onSound={onUiSound}
              onClick={onClose}
              className="px-6 py-1.5 text-sm font-extrabold"
            >
              <span className="pixel-outline">Đóng</span>
            </PixelButton>
          </div>
        </NineSlicePanel>
      </NineSlicePanel>
    </div>
  );
};
