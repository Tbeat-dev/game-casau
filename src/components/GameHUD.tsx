import React from 'react';
import type { ActiveEffectHUD, CrocodileState, HUDSnapshot, ToastItem } from '../game/types';
import { getEffectSpriteId, getSkillSpriteId, type UiSpriteId } from '../ui/atlas';
import { clampVisibleEffects } from '../ui/pixelLayout';
import {
  NineSlicePanel,
  PixelAnimatedSprite,
  PixelBar,
  PixelButton,
  PixelSprite,
} from '../ui/PixelPrimitives';

interface GameHUDProps {
  k: number;
  isCompactHeight: boolean;
  hud: HUDSnapshot;
  toasts: ToastItem[];
  muted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onTriggerSkill: (slot: 'Q' | 'R') => void;
  onUseStoredItem: () => void;
}

const CROC_LABELS: Record<CrocodileState, { text: string; danger: boolean }> = {
  IDLE: { text: 'Cá sấu nghỉ', danger: false },
  PATROL: { text: 'Đang tuần tra', danger: false },
  DETECT: { text: 'Đã phát hiện!', danger: true },
  CHASE: { text: 'Đang truy đuổi!', danger: true },
  ATTACK: { text: 'SẮP ĐỚP!', danger: true },
  RETURN: { text: 'Quay về hồ', danger: false },
  STUNNED: { text: 'Bị choáng!', danger: false },
  LURED: { text: 'Bị nhử trống', danger: false },
};

const EffectBadge: React.FC<{ item: ActiveEffectHUD; k: number }> = ({ item, k }) => {
  const isBuff = item.kind === 'buff';
  const iconId = getEffectSpriteId(item.icon);

  return (
    <NineSlicePanel
      sprite={isBuff ? 'ui.popup.wood' : 'ui.popup.danger'}
      k={Math.max(1, Math.min(2, k))}
      className="flex items-center gap-1.5 px-1.5 py-0.5 max-w-[160px]"
    >
      <PixelSprite id={iconId} scale={1} className="shrink-0" />
      <div className="leading-tight min-w-0 text-[#F3E8CF]">
        <div className="text-[10px] font-extrabold truncate pixel-outline-soft">
          {item.name}
        </div>
        <div
          className="text-[10px] font-bold tabular-nums"
          style={{ color: isBuff ? '#FFD071' : '#FFE3C6' }}
        >
          {Math.ceil(item.remaining)}s
        </div>
      </div>
    </NineSlicePanel>
  );
};

export const GameHUD: React.FC<GameHUDProps> = ({
  k,
  isCompactHeight,
  hud,
  toasts,
  muted,
  onToggleMute,
  onPause,
  onTriggerSkill,
  onUseStoredItem,
}) => {
  const s = Math.max(1, Math.min(2, k));
  const crocBadge = CROC_LABELS[hud.crocState];
  const timeSec = Math.max(0, Math.ceil(hud.timeRemaining));
  const timeRatio = hud.timeTotal > 0 ? Math.max(0, Math.min(1, hud.timeRemaining / hud.timeTotal)) : 0;
  const staminaRatio = hud.maxStamina > 0 ? hud.stamina / hud.maxStamina : 0;
  const khiLucRatio = hud.maxKhiLuc > 0 ? hud.khiLuc / hud.maxKhiLuc : 0;

  const { visibleBuffs, visibleDebuffs, overflowCount } = clampVisibleEffects(
    hud.activeBuffs,
    hud.activeDebuffs,
    isCompactHeight ? 4 : 5
  );

  const skillSlotSize = k >= 4 ? 72 : k === 3 ? 62 : 52;

  return (
    <div id="ui-root" className="vhud-grid font-pixel-vn">
      {/* 1. Top-Left: Contestants Alive + Difficulty */}
      <NineSlicePanel
        data-hud-slot="top-left"
        sprite="ui.popup.paper"
        k={s}
        className="vslot-top-left flex items-center gap-2 px-1.5 py-0.5 max-w-[210px]"
      >
        <PixelSprite id="ui.custom.contestant" scale={k >= 3 ? 2 : 1} />
        <div className="leading-tight text-[#1E1A16]">
          <div className="text-[10px] font-extrabold uppercase tracking-wide text-[#493333] whitespace-nowrap">
            Thí Sinh · {hud.difficultyLabel}
          </div>
          <div className="text-sm sm:text-base font-extrabold tabular-nums">
            {hud.aliveCount}/{hud.totalContestants}
          </div>
        </div>
      </NineSlicePanel>

      {/* 2. Top-Center: Round Name & Incense Countdown Bar */}
      <NineSlicePanel
        data-hud-slot="top-center"
        sprite="ui.popup.wood"
        k={s}
        className="vslot-top-center px-2.5 py-0.5 text-center min-w-[190px] max-w-[340px] w-full"
      >
        <div className="text-[11px] font-extrabold tracking-wide text-[#FFD071] truncate pixel-outline-soft">
          {hud.roundName}
        </div>
        <div className="flex items-center justify-center gap-2 mt-1">
          <div className="flex-1">
            <PixelBar
              ratio={timeRatio}
              fill={timeSec <= 6 ? 'vermilion' : 'turmeric'}
              k={s}
              heightScale={3}
            />
          </div>
          <span
            data-testid="round-timer"
            className="text-sm font-extrabold tabular-nums pixel-outline-soft"
            style={{ color: timeSec <= 6 ? '#ff9b8f' : '#F3E8CF' }}
          >
            {timeSec}s
          </span>
        </div>
      </NineSlicePanel>

      {/* 3. Top-Right: Crocodile State + Mute & Pause Square Pixel Slots */}
      <div
        data-hud-slot="top-right"
        className="vslot-top-right flex items-center gap-1.5 pointer-events-auto"
      >
        <NineSlicePanel
          sprite={crocBadge.danger ? 'ui.popup.danger' : 'ui.popup.wood'}
          k={s}
          className="flex items-center gap-1.5 px-2 py-0.5 text-right"
        >
          {crocBadge.danger && <PixelAnimatedSprite anim="alert" scale={2} />}
          <PixelSprite id="ui.custom.crocodile" scale={1} />
          <div className="leading-tight text-[#F3E8CF]">
            <div className="text-[10px] font-bold uppercase tracking-wide text-[#FFD071] whitespace-nowrap">
              Cá Sấu · {Math.round(hud.crocDistance)}m
            </div>
            <div className="text-[11px] sm:text-xs font-extrabold whitespace-nowrap pixel-outline-soft">
              {crocBadge.text}
            </div>
          </div>
        </NineSlicePanel>

        <PixelButton
          type="button"
          tabIndex={-1}
          k={1}
          variant="slot"
          aria-label={muted ? 'Bật âm thanh (M)' : 'Tắt âm thanh (M)'}
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleMute();
          }}
          className="flex items-center justify-center"
          style={{ width: `${Math.max(34, s * 16 + 10)}px`, height: `${Math.max(34, s * 16 + 10)}px` }}
        >
          <PixelSprite id={muted ? 'ui.custom.sound.off' : 'ui.custom.sound.on'} scale={1} />
        </PixelButton>

        <PixelButton
          type="button"
          tabIndex={-1}
          k={1}
          variant="slot"
          aria-label="Tạm dừng (P)"
          onClick={(e) => {
            e.currentTarget.blur();
            onPause();
          }}
          className="flex items-center justify-center"
          style={{ width: `${Math.max(34, s * 16 + 10)}px`, height: `${Math.max(34, s * 16 + 10)}px` }}
        >
          <PixelSprite id="ui.icon.pause" scale={1} />
        </PixelButton>
      </div>

      {/* 4. Mid-Top: Signal / Command Banner */}
      <div
        data-hud-slot="mid-top"
        className="vslot-mid-top max-w-[min(520px,86vw)]"
      >
        <NineSlicePanel
          data-testid="signal-banner"
          sprite={hud.signalActive ? 'ui.popup.danger' : 'ui.popup.paper'}
          k={s}
          className="px-3 py-1 text-center"
        >
          <div className="flex items-center justify-center gap-1.5">
            {hud.signalActive && <PixelAnimatedSprite anim="alert" scale={2} />}
            <span
              className={`text-xs sm:text-sm font-extrabold tracking-wide break-words ${
                hud.signalActive ? 'text-[#F3E8CF] pixel-outline-soft' : 'text-[#1E1A16]'
              }`}
            >
              {hud.deafened ? '[Ù tai · Xem chữ] ' : ''}
              {hud.roundSubState === 'PREPARATION'
                ? `CHUẨN BỊ: ${hud.signalText}`
                : hud.signalText}
            </span>
          </div>
        </NineSlicePanel>
      </div>

      {/* 5. Mid-Left: [F] Stored Item + Buff/Debuff Stack (capped & overflow-safe) */}
      <div
        data-hud-slot="mid-left"
        className="vslot-mid-left flex flex-row sm:flex-col flex-wrap items-start gap-1 pointer-events-auto"
      >
        {hud.storedItem && (
          <PixelButton
            type="button"
            tabIndex={-1}
            k={1}
            variant="slot-active"
            onClick={(e) => {
              e.currentTarget.blur();
              onUseStoredItem();
            }}
            aria-label={`Dùng vật phẩm [F]: ${hud.storedItem.name}`}
            className="flex items-center gap-1.5 px-2 py-1"
          >
            <span className="text-[10px] font-extrabold px-1 bg-[#E0A526] text-[#1E1A16]">
              F
            </span>
            <PixelSprite id={getEffectSpriteId(hud.storedItem.icon)} scale={1} />
            <span className="text-[11px] font-extrabold text-[#F3E8CF] truncate max-w-[96px]">
              {hud.storedItem.name}
            </span>
          </PixelButton>
        )}

        {visibleBuffs.map((b) => (
          <EffectBadge key={b.id} item={b} k={k} />
        ))}

        {visibleDebuffs.map((d) => (
          <EffectBadge key={d.id} item={d} k={k} />
        ))}

        {overflowCount > 0 && (
          <NineSlicePanel
            sprite="ui.popup.wood"
            k={1}
            className="px-1.5 py-0.5 text-[10px] font-extrabold text-[#FFD071]"
          >
            +{overflowCount} hiệu ứng
          </NineSlicePanel>
        )}
      </div>

      {/* 6. Center: 5x5 Pixel Crosshair + [E] Rare Pickup Channel Bar + Toast Queue */}
      <div
        data-hud-slot="center"
        className="vslot-center flex flex-col items-center justify-center gap-1.5 relative"
      >
        {hud.phase === 'playing' && (
          <PixelSprite id="ui.custom.crosshair" scale={Math.max(1, Math.min(2, k))} />
        )}

        {hud.pickupPrompt && (
          <NineSlicePanel
            data-testid="pickup-channel-prompt"
            sprite="ui.popup.wood"
            k={s}
            className="px-2.5 py-1 min-w-[180px] max-w-[250px] text-center"
          >
            <div className="text-[11px] font-extrabold text-[#FFD071]">
              Giữ [E] nhặt {hud.pickupPrompt.name}
            </div>
            {hud.pickupPrompt.replaceWarning && (
              <div className="text-[10px] text-[#FFE3C6]">Sẽ thay vật phẩm ô [F]</div>
            )}
            <div className="mt-1">
              <PixelBar ratio={hud.pickupPrompt.progress} fill="turmeric" k={s} heightScale={2} />
            </div>
          </NineSlicePanel>
        )}

        {toasts.length > 0 && (
          <div
            className="flex flex-col items-center gap-1 mt-1 max-w-[320px]"
            style={{ zIndex: 'var(--z-toast)' as unknown as number }}
          >
            {toasts.map((t) => {
              const sprite: UiSpriteId =
                t.tone === 'danger'
                  ? 'ui.popup.danger'
                  : t.tone === 'success'
                  ? 'ui.popup.wood'
                  : 'ui.popup.paper';
              const isDark = sprite !== 'ui.popup.paper';
              return (
                <NineSlicePanel
                  key={t.id}
                  sprite={sprite}
                  k={1}
                  className="px-2.5 py-1 text-[11px] font-extrabold text-center"
                  style={{ color: isDark ? '#F3E8CF' : '#1E1A16' }}
                >
                  {t.message}
                </NineSlicePanel>
              );
            })}
          </div>
        )}
      </div>

      {/* 7. Bottom-Left: Bamboo Stamina + Khí Lực Bars */}
      <NineSlicePanel
        data-hud-slot="bottom-left"
        sprite="ui.popup.paper"
        k={s}
        className="vslot-bottom-left px-2 py-1 w-[144px] sm:w-[clamp(164px,20vw,224px)] flex flex-col gap-1"
      >
        <div>
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-extrabold text-[#1E1A16]">
            <span>Thể Lực (Tre)</span>
            <span className="tabular-nums">{Math.round(staminaRatio * 100)}%</span>
          </div>
          <PixelBar ratio={staminaRatio} fill="bamboo" k={s} heightScale={3} />
        </div>
        <div>
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-extrabold text-[#1E1A16]">
            <span className="inline-flex items-center gap-1">
              <PixelSprite id="ui.icon.energy.full" scale={1} inkOutline />
              Khí Lực
            </span>
            <span className="tabular-nums">{Math.round(khiLucRatio * 100)}%</span>
          </div>
          <PixelBar ratio={khiLucRatio} fill="turmeric" k={s} heightScale={3} />
        </div>
      </NineSlicePanel>

      {/* 8. Bottom-Center: Safe Zone Status */}
      <NineSlicePanel
        data-hud-slot="bottom-center"
        sprite={hud.inWater ? 'ui.popup.danger' : 'ui.popup.wood'}
        k={s}
        className="vslot-bottom-center px-3 py-1 text-center max-w-[260px]"
      >
        <div
          className="text-[11px] sm:text-xs font-extrabold pixel-outline-soft"
          style={{
            color: hud.inSafeZone ? '#9ef0b2' : hud.inWater ? '#FFE3C6' : '#F3E8CF',
          }}
        >
          {hud.inSafeZone
            ? 'ĐANG TRONG VÙNG AN TOÀN'
            : hud.inWater
            ? 'DƯỚI NƯỚC — NGUY HIỂM!'
            : 'NGOÀI VÙNG AN TOÀN'}
        </div>
        <div className="text-[10px] font-bold text-[#FFD071] tabular-nums truncate">
          {hud.nearestSafeZoneLabel}: {hud.nearestSafeZoneOccupants}/{hud.nearestSafeZoneCapacity} chỗ
          {hud.matCuActive ? ' · Mắt Cú Bật' : ''}
        </div>
      </NineSlicePanel>

      {/* 9. Bottom-Right: TravelBook Skill Slots (Q, R, BĐ) + Key Hint */}
      <div
        data-hud-slot="bottom-right"
        className="vslot-bottom-right flex flex-col items-end gap-1"
      >
        {hud.keyHintsVisible && (
          <NineSlicePanel
            sprite="ui.popup.wood"
            k={1}
            className="hidden sm:block px-2 py-0.5 text-[10px] font-bold text-[#F3E8CF]"
          >
            WASD Chạy · Q/R Kỹ năng · Giữ E Nhặt · F Vật phẩm
          </NineSlicePanel>
        )}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {hud.skillSlots.map((slot) => {
            const isPassive = slot.slot === 'P';
            const hasSkill = Boolean(slot.skill);
            const onCd = slot.cooldownRemaining > 0.05;
            const silenced = hud.silencedSlot === slot.slot;
            const locked = hasSkill && (!slot.allowedInRound || silenced);
            const isActive = slot.activeRemaining > 0;
            const isReady = hasSkill && !locked && slot.canAfford && !onCd;

            return (
              <PixelButton
                key={slot.slot}
                type="button"
                tabIndex={-1}
                k={1}
                variant={isActive ? 'slot-active' : 'slot'}
                disabled={isPassive || !hasSkill || locked}
                onClick={(e) => {
                  e.currentTarget.blur();
                  if (slot.slot === 'Q' || slot.slot === 'R') {
                    onTriggerSkill(slot.slot);
                  }
                }}
                aria-label={
                  slot.skill
                    ? `Kỹ năng ${slot.slot}: ${slot.skill.name}`
                    : `Ô kỹ năng ${slot.slot} trống`
                }
                className="relative flex flex-col items-center justify-center p-1"
                style={{
                  width: `${skillSlotSize}px`,
                  height: `${skillSlotSize}px`,
                  backgroundColor: !hasSkill || locked ? 'rgba(42, 24, 18, 0.82)' : undefined,
                }}
              >
                {isActive && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-90">
                    <PixelAnimatedSprite anim="slotCursor" scale={k >= 3 ? 2 : 1} />
                  </div>
                )}

                <span
                  className="relative z-10 self-start text-[9px] sm:text-[10px] font-extrabold leading-none"
                  style={{ color: isReady ? '#FFD071' : '#F3E8CF' }}
                >
                  {isPassive ? 'BĐ' : slot.slot}
                </span>

                {slot.skill ? (
                  <>
                    <PixelSprite
                      id={getSkillSpriteId(slot.skill.icon)}
                      scale={k >= 4 ? 2 : 1}
                      className="my-auto"
                    />
                    <span className="relative z-10 text-[9px] font-bold leading-tight truncate max-w-full text-[#F3E8CF]">
                      {slot.skill.name}
                    </span>

                    {onCd && (
                      <span className="absolute inset-0 bg-[rgba(20,12,8,0.72)] flex items-center justify-center text-xs font-extrabold tabular-nums text-[#FFD071] pixel-outline-soft">
                        {slot.cooldownRemaining.toFixed(1)}s
                      </span>
                    )}

                    {locked && (
                      <span className="relative z-10 mt-0.5 px-1 text-[8px] font-extrabold bg-[#B3261E] text-[#F3E8CF]">
                        {silenced ? 'Câm' : 'Khóa'}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="my-auto text-[9px] font-bold text-[#D9C5AD]">Trống</span>
                )}
              </PixelButton>
            );
          })}
        </div>
      </div>
    </div>
  );
};
