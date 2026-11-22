import type { CSSProperties } from 'react';

export interface SpriteMeta {
  src: string;
  w: number;
  h: number;
  slice?: readonly [number, number, number, number]; // [top, right, bottom, left] in source px
}

export const UI_ATLAS = {
  // Panels & Covers (9-slice verified from TravelBook PNG edges)
  'ui.cover.red': {
    src: '/assets/ui/variants/book_cover_vermilion.png',
    w: 224,
    h: 160,
    slice: [5, 11, 5, 11],
  },
  'ui.cover.orig': {
    src: '/assets/ui/travelbook/UI_TravelBook_BookCover01a.png',
    w: 224,
    h: 160,
    slice: [5, 11, 5, 11],
  },
  'ui.page.left': {
    src: '/assets/ui/variants/book_page_left_giaydo.png',
    w: 104,
    h: 147,
    slice: [4, 5, 7, 4],
  },
  'ui.page.right': {
    src: '/assets/ui/variants/book_page_right_giaydo.png',
    w: 104,
    h: 147,
    slice: [4, 4, 7, 5],
  },
  'ui.popup.paper': {
    src: '/assets/ui/variants/popup_giay_do.png',
    w: 62,
    h: 30,
    slice: [4, 5, 5, 4],
  },
  'ui.popup.wood': {
    src: '/assets/ui/variants/popup_wood_dark.png',
    w: 62,
    h: 30,
    slice: [4, 5, 5, 4],
  },
  'ui.popup.danger': {
    src: '/assets/ui/variants/popup_vermilion.png',
    w: 62,
    h: 30,
    slice: [4, 5, 5, 4],
  },
  'ui.frame.row': {
    src: '/assets/ui/travelbook/UI_TravelBook_Frame01a.png',
    w: 62,
    h: 14,
    slice: [3, 3, 3, 3],
  },
  'ui.frame.hover': {
    src: '/assets/ui/travelbook/UI_TravelBook_FrameSelect01a.png',
    w: 62,
    h: 14,
    slice: [3, 3, 3, 3],
  },
  'ui.frame.active': {
    src: '/assets/ui/travelbook/UI_TravelBook_FrameSelect01b.png',
    w: 62,
    h: 14,
    slice: [3, 3, 3, 3],
  },
  'ui.btn.primary': {
    src: '/assets/ui/variants/frame_btn_vermilion.png',
    w: 62,
    h: 14,
    slice: [3, 3, 3, 3],
  },
  'ui.slot.normal': {
    src: '/assets/ui/travelbook/UI_TravelBook_Slot01a.png',
    w: 30,
    h: 30,
    slice: [4, 3, 3, 3],
  },
  'ui.slot.active': {
    src: '/assets/ui/travelbook/UI_TravelBook_Slot01b.png',
    w: 30,
    h: 30,
    slice: [4, 3, 3, 3],
  },
  'ui.slot.locked': {
    src: '/assets/ui/travelbook/UI_TravelBook_Slot01c.png',
    w: 30,
    h: 30,
    slice: [4, 3, 3, 3],
  },
  'ui.slot.select': {
    src: '/assets/ui/travelbook/UI_TravelBook_Select01a.png',
    w: 30,
    h: 30,
    slice: [6, 6, 6, 6],
  },
  'ui.bar.frame': {
    src: '/assets/ui/travelbook/UI_TravelBook_Bar01a.png',
    w: 62,
    h: 4,
    slice: [1, 3, 1, 3],
  },

  // Bar fills
  'ui.bar.fill.bamboo': { src: '/assets/ui/variants/fill_bamboo.png', w: 30, h: 2 },
  'ui.bar.fill.turmeric': { src: '/assets/ui/variants/fill_turmeric.png', w: 30, h: 2 },
  'ui.bar.fill.vermilion': { src: '/assets/ui/variants/fill_vermilion.png', w: 30, h: 2 },
  'ui.bar.fill.indigo': { src: '/assets/ui/variants/fill_indigo.png', w: 30, h: 2 },
  'ui.bar.fill.base': { src: '/assets/ui/travelbook/UI_TravelBook_Fill01a.png', w: 30, h: 2 },

  // Widgets
  'ui.toggle.off': { src: '/assets/ui/travelbook/UI_TravelBook_Toggle03a.png', w: 10, h: 6 },
  'ui.toggle.on': { src: '/assets/ui/travelbook/UI_TravelBook_Toggle03b.png', w: 10, h: 6 },
  'ui.slider.handle': { src: '/assets/ui/travelbook/UI_TravelBook_Handle03a.png', w: 7, h: 8 },
  'ui.dropdown.handle': { src: '/assets/ui/travelbook/UI_TravelBook_HandleDropdown01a.png', w: 9, h: 6 },
  'ui.btnValue.minus': { src: '/assets/ui/travelbook/UI_TravelBook_ButtonValue01a.png', w: 8, h: 6 },
  'ui.btnValue.plus': { src: '/assets/ui/travelbook/UI_TravelBook_ButtonValue01b.png', w: 8, h: 6 },
  'ui.line': { src: '/assets/ui/travelbook/UI_TravelBook_Line01a.png', w: 30, h: 2 },
  'ui.marker.tab': { src: '/assets/ui/travelbook/UI_TravelBook_Marker01a.png', w: 20, h: 14 },
  'ui.cursor.pointer': { src: '/assets/ui/travelbook/UI_TravelBook_Cursor01c.png', w: 14, h: 16 },
  'ui.cursor.hand': { src: '/assets/ui/travelbook/UI_TravelBook_Cursor01d.png', w: 14, h: 16 },
  'ui.alert': { src: '/assets/ui/travelbook/UI_TravelBook_Alert01a.png', w: 3, h: 6 },

  // Stock TravelBook Icons
  'ui.icon.heart.full': { src: '/assets/ui/travelbook/UI_TravelBook_IconHeart01a.png', w: 13, h: 10 },
  'ui.icon.heart.half': { src: '/assets/ui/travelbook/UI_TravelBook_IconHeart01e.png', w: 13, h: 10 },
  'ui.icon.heart.empty': { src: '/assets/ui/travelbook/UI_TravelBook_IconHeart01i.png', w: 13, h: 10 },
  'ui.icon.energy.full': { src: '/assets/ui/travelbook/UI_TravelBook_IconEnergy01a.png', w: 12, h: 14 },
  'ui.icon.energy.mid': { src: '/assets/ui/travelbook/UI_TravelBook_IconEnergy01d.png', w: 12, h: 14 },
  'ui.icon.energy.empty': { src: '/assets/ui/travelbook/UI_TravelBook_IconEnergy01g.png', w: 12, h: 14 },
  'ui.icon.star.full': { src: '/assets/ui/travelbook/UI_TravelBook_IconStar01a.png', w: 12, h: 11 },
  'ui.icon.star.half': { src: '/assets/ui/travelbook/UI_TravelBook_IconStar01c.png', w: 12, h: 11 },
  'ui.icon.star.empty': { src: '/assets/ui/travelbook/UI_TravelBook_IconStar01e.png', w: 12, h: 11 },
  'ui.icon.coin': { src: '/assets/ui/travelbook/UI_TravelBook_IconCoin01a.png', w: 11, h: 12 },
  'ui.icon.gear': { src: '/assets/ui/travelbook/UI_TravelBook_IconGear01a.png', w: 14, h: 14 },
  'ui.icon.home': { src: '/assets/ui/travelbook/UI_TravelBook_IconHome01a.png', w: 14, h: 14 },
  'ui.icon.pause': { src: '/assets/ui/travelbook/UI_TravelBook_IconPause01a.png', w: 10, h: 13 },
  'ui.icon.play': { src: '/assets/ui/travelbook/UI_TravelBook_IconPlay01a.png', w: 9, h: 13 },
  'ui.icon.restart': { src: '/assets/ui/travelbook/UI_TravelBook_IconRestart01a.png', w: 11, h: 13 },
  'ui.icon.tick': { src: '/assets/ui/travelbook/UI_TravelBook_IconTick01a.png', w: 15, h: 12 },
  'ui.icon.cross': { src: '/assets/ui/travelbook/UI_TravelBook_IconCross01a.png', w: 14, h: 14 },
  'ui.icon.arrow': { src: '/assets/ui/travelbook/UI_TravelBook_IconArrow01a.png', w: 16, h: 13 },

  // Custom Matching-Density Vietnamese Folk Sprites
  'ui.custom.contestant': { src: '/assets/ui/custom/icon_contestant.png', w: 16, h: 16 },
  'ui.custom.crocodile': { src: '/assets/ui/custom/icon_crocodile.png', w: 16, h: 16 },
  'ui.custom.sound.on': { src: '/assets/ui/custom/icon_sound_on.png', w: 16, h: 16 },
  'ui.custom.sound.off': { src: '/assets/ui/custom/icon_sound_off.png', w: 16, h: 16 },
  'ui.custom.crosshair': { src: '/assets/ui/custom/crosshair_5x5.png', w: 5, h: 5 },
  'ui.custom.seal': { src: '/assets/ui/custom/seal_eliminated.png', w: 32, h: 32 },
  'ui.custom.flag': { src: '/assets/ui/custom/festival_flag.png', w: 24, h: 24 },
  'ui.custom.corner': { src: '/assets/ui/custom/dong_ho_corner.png', w: 12, h: 12 },
  'ui.custom.divider': { src: '/assets/ui/custom/dong_ho_divider.png', w: 32, h: 6 },

  // Custom Skills (16x16)
  'ui.custom.skill.wind': { src: '/assets/ui/custom/skill_wind.png', w: 16, h: 16 },
  'ui.custom.skill.lotus': { src: '/assets/ui/custom/skill_lotus.png', w: 16, h: 16 },
  'ui.custom.skill.bamboo': { src: '/assets/ui/custom/skill_bamboo.png', w: 16, h: 16 },
  'ui.custom.skill.eye': { src: '/assets/ui/custom/skill_eye.png', w: 16, h: 16 },
  'ui.custom.skill.drum': { src: '/assets/ui/custom/skill_drum.png', w: 16, h: 16 },
  'ui.custom.skill.anchor': { src: '/assets/ui/custom/skill_anchor.png', w: 16, h: 16 },
  'ui.custom.skill.handshake': { src: '/assets/ui/custom/skill_handshake.png', w: 16, h: 16 },
  'ui.custom.skill.shield': { src: '/assets/ui/custom/skill_shield.png', w: 16, h: 16 },

  // Custom Debuffs (16x16)
  'ui.custom.debuff.mud': { src: '/assets/ui/custom/debuff_mud.png', w: 16, h: 16 },
  'ui.custom.debuff.fog': { src: '/assets/ui/custom/debuff_fog.png', w: 16, h: 16 },
  'ui.custom.debuff.ear': { src: '/assets/ui/custom/debuff_ear.png', w: 16, h: 16 },
  'ui.custom.debuff.slip': { src: '/assets/ui/custom/debuff_slip.png', w: 16, h: 16 },
  'ui.custom.debuff.exhaust': { src: '/assets/ui/custom/debuff_exhaust.png', w: 16, h: 16 },
  'ui.custom.debuff.dizzy': { src: '/assets/ui/custom/debuff_dizzy.png', w: 16, h: 16 },
  'ui.custom.debuff.silence': { src: '/assets/ui/custom/debuff_silence.png', w: 16, h: 16 },
} as const satisfies Record<string, SpriteMeta>;

export type UiSpriteId = keyof typeof UI_ATLAS;

export const UI_ANIMATIONS = {
  alert: {
    frames: [
      '/assets/ui/travelbook/anim/UI_TravelBook_Alert01a_1.png',
      '/assets/ui/travelbook/anim/UI_TravelBook_Alert01a_2.png',
      '/assets/ui/travelbook/anim/UI_TravelBook_Alert01a_3.png',
      '/assets/ui/travelbook/anim/UI_TravelBook_Alert01a_4.png',
    ],
    w: 4,
    h: 7,
    frameMs: 110,
  },
  slotCursor: {
    frames: [
      '/assets/ui/travelbook/anim/UI_TravelBook_SlotCursor01a_1.png',
      '/assets/ui/travelbook/anim/UI_TravelBook_SlotCursor01a_2.png',
      '/assets/ui/travelbook/anim/UI_TravelBook_SlotCursor01a_3.png',
      '/assets/ui/travelbook/anim/UI_TravelBook_SlotCursor01a_4.png',
    ],
    w: 30,
    h: 30,
    frameMs: 115,
  },
  markerShow: {
    frames: [
      '/assets/ui/travelbook/anim/UI_TravelBook_Marker01aShow_1.png',
      '/assets/ui/travelbook/anim/UI_TravelBook_Marker01aShow_2.png',
      '/assets/ui/travelbook/anim/UI_TravelBook_Marker01aShow_3.png',
      '/assets/ui/travelbook/anim/UI_TravelBook_Marker01aShow_4.png',
    ],
    w: 20,
    h: 15,
    frameMs: 90,
  },
} as const;

export function getSkillSpriteId(icon: string): UiSpriteId {
  switch (icon) {
    case 'wind':
      return 'ui.custom.skill.wind';
    case 'lotus':
      return 'ui.custom.skill.lotus';
    case 'bamboo':
      return 'ui.custom.skill.bamboo';
    case 'eye':
      return 'ui.custom.skill.eye';
    case 'drum':
      return 'ui.custom.skill.drum';
    case 'anchor':
      return 'ui.custom.skill.anchor';
    case 'handshake':
      return 'ui.custom.skill.handshake';
    case 'shield':
      return 'ui.custom.skill.shield';
    default:
      return 'ui.icon.energy.full';
  }
}

export function getEffectSpriteId(icon: string): UiSpriteId {
  switch (icon) {
    case 'mud':
      return 'ui.custom.debuff.mud';
    case 'fog':
      return 'ui.custom.debuff.fog';
    case 'ear':
      return 'ui.custom.debuff.ear';
    case 'slip':
      return 'ui.custom.debuff.slip';
    case 'exhaust':
      return 'ui.custom.debuff.exhaust';
    case 'dizzy':
      return 'ui.custom.debuff.dizzy';
    case 'silence':
      return 'ui.custom.debuff.silence';
    default:
      return getSkillSpriteId(icon);
  }
}

/**
 * Computes CSS 9-slice border-image properties scaled cleanly by integer factor `k`.
 */
export function getNineSliceStyle(id: UiSpriteId, k: number): CSSProperties {
  const entry: SpriteMeta = UI_ATLAS[id];
  const slice = entry.slice ?? [4, 4, 4, 4];
  const scale = Math.max(1, Math.round(k));
  const bw = `${slice[0] * scale}px ${slice[1] * scale}px ${slice[2] * scale}px ${slice[3] * scale}px`;
  return {
    borderStyle: 'solid',
    borderColor: 'transparent',
    borderWidth: bw,
    borderImageSource: `url("${entry.src}")`,
    borderImageSlice: `${slice[0]} ${slice[1]} ${slice[2]} ${slice[3]} fill`,
    borderImageWidth: bw,
    borderImageRepeat: 'stretch',
    imageRendering: 'pixelated',
  };
}
