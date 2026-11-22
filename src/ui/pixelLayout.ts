export const VIRTUAL_WIDTH = 480;
export const VIRTUAL_HEIGHT = 270;
export const HUD_SAFE_MARGIN_VPX = 8;
export const HUD_WIDGET_GAP_VPX = 4;

export interface VirtualStageMetrics {
  viewportW: number;
  viewportH: number;
  /** Integer sprite multiplier k (>= 1). */
  k: number;
  /** True when viewport >= 960x540 (k >= 2 exact integer 480x270 stage). */
  isStandardVirtualGrid: boolean;
  /** Stage pixel dimensions rendered centered in the viewport. */
  stageW: number;
  stageH: number;
  offsetX: number;
  offsetY: number;
  /** Base readable UI font size in CSS px, locked cleanly to scale. */
  baseFontPx: number;
}

export function computeVirtualStage(viewportW: number, viewportH: number): VirtualStageMetrics {
  const w = Math.max(320, Math.floor(viewportW));
  const h = Math.max(240, Math.floor(viewportH));
  const rawK = Math.floor(Math.min(w / VIRTUAL_WIDTH, h / VIRTUAL_HEIGHT));
  const isStandardVirtualGrid = w >= VIRTUAL_WIDTH * 2 && h >= VIRTUAL_HEIGHT * 2;
  const k = isStandardVirtualGrid ? Math.max(2, rawK) : Math.max(1, rawK);

  // On viewports >= 960x540, center exact k * (480x270) integer virtual grid.
  // On smaller viewports (< 960x540), fill viewport safely at k=1 with responsive fallback grid.
  const stageW = isStandardVirtualGrid ? VIRTUAL_WIDTH * k : w;
  const stageH = isStandardVirtualGrid ? VIRTUAL_HEIGHT * k : h;
  const offsetX = Math.floor((w - stageW) / 2);
  const offsetY = Math.floor((h - stageH) / 2);

  // Keep Vietnamese glyphs sharp & legible at >= 11px even at k=2
  const baseFontPx = k >= 4 ? 16 : k === 3 ? 13 : 11;

  return {
    viewportW: w,
    viewportH: h,
    k,
    isStandardVirtualGrid,
    stageW,
    stageH,
    offsetX,
    offsetY,
    baseFontPx,
  };
}

export interface RectBox {
  id: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export function boxesOverlap(a: RectBox, b: RectBox, minGap = 0): boolean {
  return !(
    a.right + minGap <= b.left ||
    b.right + minGap <= a.left ||
    a.bottom + minGap <= b.top ||
    b.bottom + minGap <= a.top
  );
}

export interface HudLayoutAuditResult {
  overlaps: Array<{ a: string; b: string }>;
  outOfBounds: string[];
}

export function auditHudBoxes(
  boxes: RectBox[],
  stage: { left: number; top: number; right: number; bottom: number },
  minMarginPx: number,
  minGapPx: number
): HudLayoutAuditResult {
  const overlaps: Array<{ a: string; b: string }> = [];
  const outOfBounds: string[] = [];

  for (const box of boxes) {
    if (
      box.left < stage.left + minMarginPx - 1 ||
      box.top < stage.top + minMarginPx - 1 ||
      box.right > stage.right - minMarginPx + 1 ||
      box.bottom > stage.bottom - minMarginPx + 1
    ) {
      outOfBounds.push(box.id);
    }
  }

  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (boxesOverlap(boxes[i], boxes[j], minGapPx)) {
        overlaps.push({ a: boxes[i].id, b: boxes[j].id });
      }
    }
  }

  return { overlaps, outOfBounds };
}

export function clampVisibleEffects<T>(
  buffs: T[],
  debuffs: T[],
  maxVisible = 5
): { visibleBuffs: T[]; visibleDebuffs: T[]; overflowCount: number } {
  // Always prioritize debuffs (max 2) so warnings are never hidden, then fill remaining slots with buffs.
  const visibleDebuffs = debuffs.slice(0, Math.min(2, maxVisible));
  const remaining = Math.max(0, maxVisible - visibleDebuffs.length);
  const visibleBuffs = buffs.slice(0, Math.min(3, remaining));
  const total = buffs.length + debuffs.length;
  const shown = visibleBuffs.length + visibleDebuffs.length;
  return {
    visibleBuffs,
    visibleDebuffs,
    overflowCount: Math.max(0, total - shown),
  };
}
