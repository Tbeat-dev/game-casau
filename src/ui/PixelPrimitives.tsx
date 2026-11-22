import React, { useEffect, useState } from 'react';
import { getNineSliceStyle, UI_ANIMATIONS, UI_ATLAS, type UiSpriteId } from './atlas';

export interface PixelSpriteProps {
  id: UiSpriteId;
  scale?: number;
  alt?: string;
  inkOutline?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const PixelSprite: React.FC<PixelSpriteProps> = ({
  id,
  scale = 2,
  alt = '',
  inkOutline = false,
  className = '',
  style,
}) => {
  const meta = UI_ATLAS[id];
  const s = Math.max(1, Math.round(scale));
  return (
    <img
      src={meta.src}
      width={meta.w * s}
      height={meta.h * s}
      alt={alt}
      aria-hidden={alt === '' ? true : undefined}
      draggable={false}
      className={`pixelated shrink-0 select-none ${inkOutline ? 'pixel-icon-ink' : ''} ${className}`}
      style={{
        width: `${meta.w * s}px`,
        height: `${meta.h * s}px`,
        ...style,
      }}
    />
  );
};

export const PixelAnimatedSprite: React.FC<{
  anim: keyof typeof UI_ANIMATIONS;
  scale?: number;
  alt?: string;
  className?: string;
}> = ({ anim, scale = 2, alt = '', className = '' }) => {
  const spec = UI_ANIMATIONS[anim];
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const timer = window.setInterval(() => {
      setFrame((f) => (f + 1) % spec.frames.length);
    }, spec.frameMs);
    return () => window.clearInterval(timer);
  }, [spec.frames.length, spec.frameMs]);

  const s = Math.max(1, Math.round(scale));
  return (
    <img
      src={spec.frames[frame]}
      width={spec.w * s}
      height={spec.h * s}
      alt={alt}
      aria-hidden={alt === '' ? true : undefined}
      draggable={false}
      className={`pixelated shrink-0 select-none ${className}`}
      style={{
        width: `${spec.w * s}px`,
        height: `${spec.h * s}px`,
      }}
    />
  );
};

export interface NineSlicePanelProps extends React.HTMLAttributes<HTMLDivElement> {
  sprite: UiSpriteId;
  k: number;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  'data-hud-slot'?: string;
  'data-testid'?: string;
}

export const NineSlicePanel: React.FC<NineSlicePanelProps> = ({
  sprite,
  k,
  className = '',
  style,
  children,
  ...rest
}) => {
  const sliceStyle = getNineSliceStyle(sprite, k);
  return (
    <div
      {...rest}
      className={`pixelated ${className}`}
      style={{
        ...sliceStyle,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export interface PixelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'wood' | 'paper' | 'tab-active' | 'tab-idle' | 'slot' | 'slot-active';
  k: number;
  onSound?: () => void;
}

export const PixelButton: React.FC<PixelButtonProps> = ({
  variant = 'wood',
  k,
  onSound,
  onClick,
  className = '',
  style,
  children,
  disabled,
  ...rest
}) => {
  const sprite: UiSpriteId = disabled
    ? variant === 'slot' || variant === 'slot-active'
      ? 'ui.slot.locked'
      : 'ui.frame.row'
    : variant === 'primary'
    ? 'ui.btn.primary'
    : variant === 'tab-active'
    ? 'ui.frame.active'
    : variant === 'tab-idle'
    ? 'ui.frame.row'
    : variant === 'paper'
    ? 'ui.popup.paper'
    : variant === 'slot'
    ? 'ui.slot.normal'
    : variant === 'slot-active'
    ? 'ui.slot.active'
    : 'ui.frame.active';

  const textColor =
    variant === 'paper' || variant === 'tab-idle' || variant === 'tab-active'
      ? '#1E1A16'
      : '#F3E8CF';

  return (
    <button
      {...rest}
      disabled={disabled}
      onClick={(e) => {
        onSound?.();
        onClick?.(e);
      }}
      className={`pixel-btn-interactive cursor-pointer disabled:cursor-not-allowed ${
        variant === 'slot' || variant === 'slot-active' ? '' : 'disabled:opacity-65'
      } ${className}`}
      style={{
        ...getNineSliceStyle(sprite, k),
        color: textColor,
        ...style,
      }}
    >
      {children}
    </button>
  );
};

export const PixelBar: React.FC<{
  ratio: number; // 0..1
  fill?: 'bamboo' | 'turmeric' | 'vermilion' | 'indigo';
  k: number;
  heightScale?: number;
  className?: string;
}> = ({ ratio, fill = 'turmeric', k, heightScale = 2, className = '' }) => {
  const clamped = Math.max(0, Math.min(1, ratio));
  const s = Math.max(1, Math.round(k));
  const fillSprite: UiSpriteId =
    fill === 'bamboo'
      ? 'ui.bar.fill.bamboo'
      : fill === 'vermilion'
      ? 'ui.bar.fill.vermilion'
      : fill === 'indigo'
      ? 'ui.bar.fill.indigo'
      : 'ui.bar.fill.turmeric';
  const fillUrl = UI_ATLAS[fillSprite].src;
  const barHeight = Math.max(6, 4 * s * (heightScale / 2));
  const padY = Math.max(1, Math.round(s * 0.75));
  const padX = Math.max(2, s * 2);

  return (
    <div
      className={`relative w-full overflow-hidden ${className}`}
      style={{
        ...getNineSliceStyle('ui.bar.frame', Math.max(1, Math.floor(s * 0.8))),
        borderWidth: `${padY}px ${padX}px`,
        borderImageWidth: `${padY}px ${padX}px`,
        height: `${barHeight}px`,
        backgroundColor: '#2a1812',
      }}
    >
      <div
        className="h-full pixelated transition-[width] duration-75"
        style={{
          width: `${Math.round(clamped * 100)}%`,
          backgroundImage: `url("${fillUrl}")`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
        }}
      />
    </div>
  );
};

export const PixelToggle: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  k: number;
  onSound?: () => void;
}> = ({ checked, onChange, label, k, onSound }) => {
  const s = Math.max(2, Math.round(k));
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => {
        onSound?.();
        onChange(!checked);
      }}
      className="cursor-pointer inline-flex items-center justify-center p-1 focus-visible:outline-2 focus-visible:outline-[#E0A526]"
    >
      <PixelSprite id={checked ? 'ui.toggle.on' : 'ui.toggle.off'} scale={s} />
    </button>
  );
};
