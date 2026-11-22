import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const SRC_PACK =
  'third_party/codejs/Complete_UI_Book_Styles_Pack_Free/Complete_UI_Book_Styles_Pack_Free_v1.0/01_TravelBookLite';
const SRC_SETB = 'third_party/codejs/PixelHUDUI_v1.0_FreeDemo';
const OUT_DIR = 'public/assets/ui';

// ---------- Minimal Zero-Dependency PNG Codec ----------
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function readPng(filePath) {
  const buf = fs.readFileSync(filePath);
  let pos = 8;
  let width = 0;
  let height = 0;
  let colorType = 6;
  const idats = [];
  let palette = null;
  let trns = null;

  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
    } else if (type === 'PLTE') {
      palette = data;
    } else if (type === 'tRNS') {
      trns = data;
    } else if (type === 'IDAT') {
      idats.push(data);
    } else if (type === 'IEND') {
      break;
    }
    pos += 12 + len;
  }

  const raw = zlib.inflateSync(Buffer.concat(idats));
  const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 4 ? 2 : 1;
  const stride = width * bpp;
  const recon = Buffer.alloc(height * stride);
  const rgba = Buffer.alloc(width * height * 4);
  const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };

  let rp = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[rp++];
    for (let x = 0; x < stride; x++) {
      const byte = raw[rp++];
      const a = x >= bpp ? recon[y * stride + x - bpp] : 0;
      const b = y > 0 ? recon[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y > 0 ? recon[(y - 1) * stride + x - bpp] : 0;
      let val = byte;
      if (filter === 1) val = (byte + a) & 0xff;
      else if (filter === 2) val = (byte + b) & 0xff;
      else if (filter === 3) val = (byte + ((a + b) >> 1)) & 0xff;
      else if (filter === 4) val = (byte + paeth(a, b, c)) & 0xff;
      recon[y * stride + x] = val;
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const d = (y * width + x) * 4;
      if (colorType === 6) {
        const s = y * stride + x * 4;
        rgba[d] = recon[s];
        rgba[d + 1] = recon[s + 1];
        rgba[d + 2] = recon[s + 2];
        rgba[d + 3] = recon[s + 3];
      } else if (colorType === 2) {
        const s = y * stride + x * 3;
        rgba[d] = recon[s];
        rgba[d + 1] = recon[s + 1];
        rgba[d + 2] = recon[s + 2];
        rgba[d + 3] = 255;
      } else if (colorType === 3 && palette) {
        const idx = recon[y * stride + x];
        rgba[d] = palette[idx * 3];
        rgba[d + 1] = palette[idx * 3 + 1];
        rgba[d + 2] = palette[idx * 3 + 2];
        rgba[d + 3] = trns && idx < trns.length ? trns[idx] : 255;
      }
    }
  }
  return { width, height, rgba };
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crcBuf]);
}

function writePng(filePath, width, height, rgba) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 4);
    raw[rowOffset] = 0; // filter none
    rgba.copy(raw, rowOffset + 1, y * width * 4, (y + 1) * width * 4);
  }
  const compressed = zlib.deflateSync(raw);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const out = Buffer.concat([sig, makeChunk('IHDR', ihdr), makeChunk('IDAT', compressed), makeChunk('IEND', Buffer.alloc(0))]);
  fs.writeFileSync(filePath, out);
}

function hexToRgba(hex) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const a = clean.length === 8 ? parseInt(clean.slice(6, 8), 16) : 255;
  return [r, g, b, a];
}

function remapImage(srcPath, destPath, colorMap) {
  const { width, height, rgba } = readPng(srcPath);
  const parsedMap = new Map();
  for (const [from, to] of Object.entries(colorMap)) {
    parsedMap.set(from.toLowerCase(), hexToRgba(to));
  }
  const out = Buffer.from(rgba);
  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] === 0) continue;
    const key =
      '#' +
      [out[i], out[i + 1], out[i + 2]]
        .map((v) => v.toString(16).padStart(2, '0'))
        .join('')
        .toLowerCase();
    const rep = parsedMap.get(key);
    if (rep) {
      out[i] = rep[0];
      out[i + 1] = rep[1];
      out[i + 2] = rep[2];
      out[i + 3] = Math.round((out[i + 3] / 255) * rep[3]);
    }
  }
  writePng(destPath, width, height, out);
}

// ASCII grid sprite painter for matching-pixel-density 16x16 / 20x20 / 32x32 custom sprites
function renderGrid(destPath, rows, palette) {
  const height = rows.length;
  const width = rows[0].length;
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    const row = rows[y];
    if (row.length !== width) throw new Error(`Row ${y} mismatch for ${destPath}: ${row.length} !== ${width}`);
    for (let x = 0; x < width; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const hex = palette[ch];
      if (!hex) throw new Error(`Missing palette key '${ch}' for ${destPath}`);
      const [r, g, b, a] = hexToRgba(hex);
      const idx = (y * width + x) * 4;
      rgba[idx] = r;
      rgba[idx + 1] = g;
      rgba[idx + 2] = b;
      rgba[idx + 3] = a;
    }
  }
  writePng(destPath, width, height, rgba);
}

// ---------- 1. Copy verified Set A sprites & animations cleanly ----------
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT_DIR, 'travelbook/anim'), { recursive: true });
fs.mkdirSync(path.join(OUT_DIR, 'setb_preview'), { recursive: true });

for (const f of fs.readdirSync(path.join(SRC_PACK, 'Sprites'))) {
  if (f.endsWith('.png')) {
    fs.copyFileSync(path.join(SRC_PACK, 'Sprites', f), path.join(OUT_DIR, 'travelbook', f));
  }
}
for (const f of fs.readdirSync(path.join(SRC_PACK, 'Sprites Animated'))) {
  if (f.endsWith('.png')) {
    fs.copyFileSync(path.join(SRC_PACK, 'Sprites Animated', f), path.join(OUT_DIR, 'travelbook/anim', f));
  }
}
// Copy Set B strictly for preview/comparison tool (not shipped in runtime UI atlas)
for (const f of fs.readdirSync(SRC_SETB)) {
  if (f.endsWith('.png')) {
    fs.copyFileSync(path.join(SRC_SETB, f), path.join(OUT_DIR, 'setb_preview', f));
  }
}

// ---------- 2. Create Palette-Tuned Vietnamese Variants ----------
// High-contrast giấy dó paper popup (matches TravelBook 62x30 9-slice)
remapImage(
  path.join(SRC_PACK, 'Sprites/UI_TravelBook_Popup01a.png'),
  path.join(OUT_DIR, 'variants/popup_giay_do.png'),
  {
    '#ffd7a8': '#f3e8cf',
    '#e5b67f': '#d9c69e',
    '#493333': '#3b2415',
  }
);

// Dark wood plaque popup (matches TravelBook 62x30 9-slice, dark interior for HUD meters/slots)
remapImage(
  path.join(SRC_PACK, 'Sprites/UI_TravelBook_Popup01a.png'),
  path.join(OUT_DIR, 'variants/popup_wood_dark.png'),
  {
    '#ffd7a8': '#362116',
    '#e5b67f': '#5b3a24',
    '#493333': '#e0a526',
  }
);

// Vermilion danger popup (matches TravelBook 62x30 9-slice, for urgent commands/alerts)
remapImage(
  path.join(SRC_PACK, 'Sprites/UI_TravelBook_Popup01a.png'),
  path.join(OUT_DIR, 'variants/popup_vermilion.png'),
  {
    '#ffd7a8': '#a1231b',
    '#e5b67f': '#741610',
    '#493333': '#e0a526',
  }
);

// Vermilion Vietnamese Book Cover (for Title Screen & Victory)
remapImage(
  path.join(SRC_PACK, 'Sprites/UI_TravelBook_BookCover01a.png'),
  path.join(OUT_DIR, 'variants/book_cover_vermilion.png'),
  {
    '#b75b5f': '#b3261e',
    '#9c4351': '#861a14',
    '#ffd071': '#ffd071',
    '#ffa34d': '#e0a526',
    '#493333': '#2a1812',
  }
);

// Book pages tuned slightly toward warm giấy dó (#F3E8CF / #EAD9B7)
remapImage(
  path.join(SRC_PACK, 'Sprites/UI_TravelBook_BookPageLeft01a.png'),
  path.join(OUT_DIR, 'variants/book_page_left_giaydo.png'),
  {
    '#ffd7a8': '#f3e8cf',
    '#c7895d': '#c59b6d',
    '#dea974': '#e2cfa6',
  }
);
remapImage(
  path.join(SRC_PACK, 'Sprites/UI_TravelBook_BookPageRight01a.png'),
  path.join(OUT_DIR, 'variants/book_page_right_giaydo.png'),
  {
    '#ffd7a8': '#f3e8cf',
    '#c7895d': '#c59b6d',
    '#dea974': '#e2cfa6',
  }
);

// Frame button vermilion variant for primary CTAs
remapImage(
  path.join(SRC_PACK, 'Sprites/UI_TravelBook_FrameSelect01b.png'),
  path.join(OUT_DIR, 'variants/frame_btn_vermilion.png'),
  {
    '#e5b67f': '#b3261e',
    '#dea974': '#861a14',
    '#c7895d': '#ffd071',
  }
);

// Progress fills (30x2) in Bamboo, Turmeric, Vermilion, Indigo
remapImage(
  path.join(SRC_PACK, 'Sprites/UI_TravelBook_Fill01a.png'),
  path.join(OUT_DIR, 'variants/fill_bamboo.png'),
  { '#e5b67f': '#5d8a42' }
);
remapImage(
  path.join(SRC_PACK, 'Sprites/UI_TravelBook_Fill01a.png'),
  path.join(OUT_DIR, 'variants/fill_turmeric.png'),
  { '#e5b67f': '#e0a526' }
);
remapImage(
  path.join(SRC_PACK, 'Sprites/UI_TravelBook_Fill01a.png'),
  path.join(OUT_DIR, 'variants/fill_vermilion.png'),
  { '#e5b67f': '#c93026' }
);
remapImage(
  path.join(SRC_PACK, 'Sprites/UI_TravelBook_Fill01a.png'),
  path.join(OUT_DIR, 'variants/fill_indigo.png'),
  { '#e5b67f': '#3e89d4' }
);

// ---------- 3. Custom Matching-Pixel-Density Icons & Folk Ornaments ----------
const P = {
  K: '#493333', // TravelBook dark ink outline
  D: '#2a1812', // Deep espresso
  W: '#fff4e0', // Warm highlight
  P: '#f3e8cf', // Giấy dó paper
  G: '#e0a526', // Turmeric gold
  Y: '#ffd071', // Light gold
  y: '#ffd071',
  R: '#b3261e', // Vermilion
  r: '#e8564c', // Bright red
  B: '#4f6f3a', // Bamboo green
  b: '#77a855', // Light bamboo
  I: '#2b3a67', // Indigo
  C: '#4ea8de', // River / Wind cyan
  S: '#785038', // Wood
  s: '#b07b53', // Light wood
  M: '#e87fa0', // Lotus pink
  m: '#f7bfd2', // Light lotus
};

// 5x5 reticle crosshair
renderGrid(
  path.join(OUT_DIR, 'custom/crosshair_5x5.png'),
  [
    '.K.K.',
    'K.W.K',
    '.WRW.',
    'K.W.K',
    '.K.K.',
  ],
  P
);

// Contestant (Nón lá + Áo nâu) 16x16
renderGrid(
  path.join(OUT_DIR, 'custom/icon_contestant.png'),
  [
    '.......KK.......',
    '.....KKYYKK.....',
    '....KYYYYYYK....',
    '...KYGGGGGGYK...',
    '..KKKKKKKKKKKK..',
    '.....KWWWWK.....',
    '.....KWKWKW.....',
    '.....KWWWWK.....',
    '......KRRK......',
    '....KKBBBBKK....',
    '...KBBGGGGGBK...',
    '...KBGGGGGGGK...',
    '...KBBBBBBBBK...',
    '....KBBBBBBK....',
    '....KK....KK....',
    '...KKK....KKK...',
  ],
  P
);

// Crocodile head 16x16
renderGrid(
  path.join(OUT_DIR, 'custom/icon_crocodile.png'),
  [
    '................',
    '....KKK..KKK....',
    '...KbbKKKbbK....',
    '..KbYYKbYYK.....',
    '.KBBBBBBBBKKK...',
    'KBBBBBBBBBBBBKK.',
    'KBBbBBBBbBBBBBBK',
    'KBBBBBBBBWWKWWKK',
    '.KKKKKKKWKKWKK..',
    '..KWKWKKKKKKK...',
    '.KBBBBBBBBBBK...',
    '.KBBBBBBBBBK....',
    '..KKKKKKKKK.....',
    '................',
    '................',
    '................',
  ],
  P
);

// 8 Skills (16x16) matching skills.json `icon` field
renderGrid(
  path.join(OUT_DIR, 'custom/skill_wind.png'),
  [
    '................',
    '....KKKKK.......',
    '...KWWCCCWK.....',
    '..KCC....CCK....',
    '..KK......KK....',
    '.KKKKKKKKKKK....',
    'KCCCCCCCCCCCWK..',
    '.KKKKKKKKKKCCK..',
    '...........KK...',
    '..KKKKKKKKKK....',
    '.KCCCWWWWCCCK...',
    '..KKKK...KCCK...',
    '..........KK....',
    '....KKKKKK......',
    '...KCCWWCCK.....',
    '....KKKKKK......',
  ],
  P
);

renderGrid(
  path.join(OUT_DIR, 'custom/skill_lotus.png'),
  [
    '.......KK.......',
    '......KmmK......',
    '....KKMmmMKK....',
    '...KmMmMMmMmK...',
    '..KMmMMMMMMmMK..',
    '..KMMMmGGmMMMK..',
    '.KKMMmGGGGmMMKK.',
    'KmMmMGGGGGGMmMmK',
    'KMMMMGGGGGGMMMMK',
    '.KMMMKGGGGKMMMK.',
    '..KKKKKKKKKKKK..',
    '...KbbbbbbbbK...',
    '..KBBBBBBBBBBK..',
    '...KKKKKKKKKK...',
    '................',
    '................',
  ],
  P
);

renderGrid(
  path.join(OUT_DIR, 'custom/skill_bamboo.png'),
  [
    '......KKKK......',
    '.....KbBBbK.....',
    '.....KBBBBK.....',
    '...KKKGGGGKKK...',
    '....K.KBBK.K....',
    '...Kb.KbBK..K...',
    '......KBBK......',
    '.....KGGGGK.....',
    '.....KbBBbK.....',
    '.....KBBBBK.....',
    '....K.KBBK......',
    '...Kb.KBBK.KK...',
    '.....KGGGGKbK...',
    '.....KBBBBK.....',
    '.....KBBBBK.....',
    '......KKKK......',
  ],
  P
);

renderGrid(
  path.join(OUT_DIR, 'custom/skill_eye.png'),
  [
    '................',
    '................',
    '....KKKKKKKK....',
    '..KKWWWWWWWWKK..',
    '.KWWYYYYYYYYWWK.',
    'KWWYYKKGGKKYYWWK',
    'KWYYKGGKKGGKYYWK',
    'KWYYKGKWWKGKYYWK',
    'KWYYKGGKKGGKYYWK',
    'KWWYYKKGGKKYYWWK',
    '.KWWYYYYYYYYWWK.',
    '..KKWWWWWWWWKK..',
    '....KKKKKKKK....',
    '................',
    '................',
    '................',
  ],
  P
);

renderGrid(
  path.join(OUT_DIR, 'custom/skill_drum.png'),
  [
    '....KKKKKKKK....',
    '..KKYYYYYYYYKK..',
    '.KYWWWWWWWWWWYK.',
    '.KYYKKKKKKKKYYK.',
    'KRRKGGGGGGGGKRRK',
    'KRRKRRRRRRRRKRRK',
    'KRRKRGYGYGYRKRRK',
    'KRRKRRRRRRRRKRRK',
    'KRRKGGGGGGGGKRRK',
    '.KRRKKKKKKKKRRK.',
    '..KRRRRRRRRRRK..',
    '...KKKKKKKKKK...',
    '..KSK......KSK..',
    '.KSK........KSK.',
    '.KK..........KK.',
    '................',
  ],
  P
);

renderGrid(
  path.join(OUT_DIR, 'custom/skill_anchor.png'),
  [
    '......KKKK......',
    '.....KGGGGK.....',
    '.....KGKKGK.....',
    '......KKKK......',
    '......KGGK......',
    '..KKKKKKKKKKKK..',
    '..KGGGGGGGGGGK..',
    '......KGGK......',
    '.KK...KGGK...KK.',
    'KGGK..KGGK..KGGK',
    'KGGK..KGGK..KGGK',
    '.KGGKKKGGKKKGGK.',
    '..KGGGGGGGGGGK..',
    '...KKKKKKKKKK...',
    '.....KGGGGK.....',
    '......KKKK......',
  ],
  P
);

renderGrid(
  path.join(OUT_DIR, 'custom/skill_handshake.png'),
  [
    '................',
    '................',
    '.KKKK......KKKK.',
    'KSSSSK....KCCCCK',
    'KSSSSKK..KKCCCCK',
    'KSSSSYYKKYYCCCCK',
    '.KKKKYYYYYYKKKK.',
    '...KYGGGGGGYK...',
    '...KYGKKKKGYK...',
    '...KYGYYYYGYK...',
    '...KKGGGGGGKK...',
    '.....KKKKKK.....',
    '................',
    '................',
    '................',
    '................',
  ],
  P
);

renderGrid(
  path.join(OUT_DIR, 'custom/skill_shield.png'),
  [
    '....KKKKKKKK....',
    '..KKGGGGGGGGKK..',
    '.KGGbBBBBBBbGGK.',
    '.KGBBBBBBBBBBGK.',
    '.KGBBYYYYYYBBGK.',
    '.KGBBYRRRRyBBGK.',
    '.KGBBYRRRRyBBGK.',
    '.KGBBYYYYYYBBGK.',
    '..KGBBBBBBBBGK..',
    '..KGBBBBBBBBGK..',
    '...KGBBBBBBGK...',
    '....KGBBBBGK....',
    '.....KGBBGK.....',
    '......KGGK......',
    '.......KK.......',
    '................',
  ],
  P
);

// 7 Debuffs (16x16)
renderGrid(
  path.join(OUT_DIR, 'custom/debuff_mud.png'),
  [
    '................',
    '.....KK..KK.....',
    '....KSSKKSSK....',
    '.....KKKKKK.....',
    '...KK......KK...',
    '..KSSK....KSSK..',
    '....KKKKKKKK....',
    '..KKSSSSSSSSKK..',
    '.KSSDDDDDDDDSSK.',
    'KSSDDDDSSDDDDSSK',
    'KSDDDSSDDSSDDDSK',
    'KSSSSSSSSSSSSSSK',
    '.KKKKKKKKKKKKKK.',
    '................',
    '................',
    '................',
  ],
  P
);

renderGrid(
  path.join(OUT_DIR, 'custom/debuff_fog.png'),
  [
    '................',
    '....KKKKKKKK....',
    '..KKWWWWWWWWKK..',
    '.KWWPPPPPPPPWWK.',
    'KWWPPPPPPPPPPWWK',
    '.KKKKKKKKKKKKKK.',
    '................',
    '..KKKKKKKKKKKK..',
    '.KPPPPWWWWPPPPK.',
    '..KKKKKKKKKKKK..',
    '................',
    '...KKKKKKKKKK...',
    '..KWWWWPPWWWWK..',
    '...KKKKKKKKKK...',
    '................',
    '................',
  ],
  P
);

renderGrid(
  path.join(OUT_DIR, 'custom/debuff_ear.png'),
  [
    '....KKKKKK......',
    '..KKYYYYYYKK....',
    '.KYSSSSSSSSYK...',
    '.KYSKKKKKKYSK..K',
    '.KYSK....KYSK.Kr',
    '.KYSK.KK.KYSKKrK',
    '.KYSKKYYKKYSKrK.',
    '..KKKYYYYKYSKK..',
    '....KYSSKYSK....',
    '..KrKYSKYSK.....',
    '.KrKKYSKKK......',
    'KrK.KYYK........',
    'KK...KK.........',
    '................',
    '................',
    '................',
  ],
  P
);

renderGrid(
  path.join(OUT_DIR, 'custom/debuff_slip.png'),
  [
    '................',
    '......KKKK......',
    '.....KbbbbK.....',
    '....KbBBBBbK....',
    '...KbBBBBBBbK...',
    '..KKBBBBBBBBKK..',
    '.KbbBBBBBBBBbbK.',
    'KbBBBBWWWWBBBBbK',
    'KBBBBBBBBBBBBBBK',
    '.KKKKKKKKKKKKKK.',
    '..KCCK....KCCK..',
    '.KCCK......KCCK.',
    '..KK........KK..',
    '................',
    '................',
    '................',
  ],
  P
);

renderGrid(
  path.join(OUT_DIR, 'custom/debuff_exhaust.png'),
  [
    '.......KK.......',
    '......KrrK......',
    '..K..KrrrrK..K..',
    '.KrK.KYYYYK.KrK.',
    '..KKKYYYYYYKKK..',
    '...KYYYYYYYYK...',
    '.KKYYYYRRYYYYKK.',
    'KrrYYYRRRRYYYrrK',
    '.KKYYYYRRYYYYKK.',
    '...KYYYYYYYYK...',
    '..KKKYYYYYYKKK..',
    '.KrK.KYYYYK.KrK.',
    '..K..KrrrrK..K..',
    '......KrrK......',
    '.......KK.......',
    '................',
  ],
  P
);

renderGrid(
  path.join(OUT_DIR, 'custom/debuff_dizzy.png'),
  [
    '................',
    '....KKKKKKKK....',
    '..KKGGGGGGGGKK..',
    '.KGGKKKKKKKKGGK.',
    'KGGKGGGGGGGGKGGK',
    'KGKGKKKKKKKKGKGK',
    'KGKGKGGGGGGKGKGK',
    'KGKGKGGKKGGKGKGK',
    'KGKGKGGGGGGKGKGK',
    'KGKGKKKKKKKKGKGK',
    'KGGKGGGGGGGGGGGK',
    '.KGGKKKKKKKKKK..',
    '..KKGGGGGGGGKK..',
    '....KKKKKKKK....',
    '................',
    '................',
  ],
  P
);

renderGrid(
  path.join(OUT_DIR, 'custom/debuff_silence.png'),
  [
    '................',
    '....KKKKKKKK....',
    '..KKRRRRRRRRKK..',
    '.KRRWWWWWWWWRRK.',
    'KRRWWKKKKKKWWRRK',
    'KRRWKRWWWWKRWRRK',
    'KRRWKWRWWKWKWRRK',
    'KRRWKWWKKWWKWRRK',
    'KRRWKWRWWKWKWRRK',
    'KRRWKRWWWWKRWRRK',
    'KRRWWKKKKKKWWRRK',
    '.KRRWWWWWWWWRRK.',
    '..KKRRRRRRRRKK..',
    '....KKKKKKKK....',
    '................',
    '................',
  ],
  P
);

// Red Vermilion Stamp Seal (32x32) for Elimination Screen
{
  const rows = [];
  for (let y = 0; y < 32; y++) {
    let row = '';
    for (let x = 0; x < 32; x++) {
      const border = x <= 2 || x >= 29 || y <= 2 || y >= 29;
      const innerBorder = (x === 4 || x === 27 || y === 4 || y === 27) && x >= 4 && x <= 27 && y >= 4 && y <= 27;
      // Draw crisp pixel seal glyph "LOẠI" centered inside
      let mark = false;
      // L: x 7..10, y 9..22
      if (y >= 9 && y <= 22 && x === 7) mark = true;
      if (y === 21 || y === 22) { if (x >= 7 && x <= 11) mark = true; }
      // O: x 13..18, y 9..22
      if ((y >= 9 && y <= 22) && (x === 13 || x === 17) && y >= 10 && y <= 21) mark = true;
      if ((y === 9 || y === 22) && x >= 14 && x <= 16) mark = true;
      // A: x 19..24, y 9..22
      if (y >= 11 && y <= 22 && (x === 19 || x === 23)) mark = true;
      if (y === 9 && x >= 20 && x <= 22) mark = true;
      if (y === 15 && x >= 19 && x <= 23) mark = true;
      // I: x 25..25, y 9..22 + dot underneath (25, 24)
      if (x === 25 && ((y >= 9 && y <= 22) || y === 24)) mark = true;

      if (border || innerBorder || mark) row += (x + y) % 13 === 0 ? 'r' : 'R';
      else row += '.';
    }
    rows.push(row);
  }
  renderGrid(path.join(OUT_DIR, 'custom/seal_eliminated.png'), rows, P);
}

// Vietnamese Ngũ Sắc Festival Flag (24x24) for Victory screen
renderGrid(
  path.join(OUT_DIR, 'custom/festival_flag.png'),
  [
    '...KK...................',
    '..KYYK..................',
    '..KGGK..................',
    '..KSSKKKKKKKKKKKK.......',
    '..KSSKRRRRRRRRRRRK......',
    '..KSSKRRRRGGGGGRRRK.....',
    '..KSSKRRRGGGGGGGRRK.....',
    '..KSSKRRGGYYYYYGGRRK....',
    '..KSSKRRGYRRRRRYGRRK....',
    '..KSSKRRGGYYYYYGGRRK....',
    '..KSSKRRRGGGGGGGRRK.....',
    '..KSSKIIIIIIIIIIIK......',
    '..KSSKBBBBBBBBBBK.......',
    '..KSSKGGGGGGGGGK........',
    '..KSSKRRRRRRRRK.........',
    '..KSSKKKKKKKKK..........',
    '..KSSK..................',
    '..KSSK..................',
    '..KSSK..................',
    '..KSSK..................',
    '..KSSK..................',
    '..KSSK..................',
    '.KSSSSK.................',
    '.KKKKKK.................',
  ],
  P
);

// Đông Hồ wave/cloud corner flourish (12x12)
renderGrid(
  path.join(OUT_DIR, 'custom/dong_ho_corner.png'),
  [
    'KKKKKKKKKKKK',
    'KGGGGGGGGGGK',
    'KGGKKKKKKGGK',
    'KGKRRRRRRKGK',
    'KGKRGGGGK..K',
    'KGKRGKK....K',
    'KGKRK......K',
    'KGKRK.......',
    'KGKK........',
    'KGK.........',
    'KGK.........',
    'KKK.........',
  ],
  P
);

// Đông Hồ repeating trống đồng wave divider (32x6)
renderGrid(
  path.join(OUT_DIR, 'custom/dong_ho_divider.png'),
  [
    '..KKKK....KKKK....KKKK....KKKK..',
    '.KGGGGK..KRRRRK..KGGGGK..KRRRRK.',
    'KGGKKGGKKRRKKRRKKGGKKGGKKRRKKRRK',
    '.KGGGGK..KRRRRK..KGGGGK..KRRRRK.',
    '..KKKK....KKKK....KKKK....KKKK..',
    '................................',
  ],
  P
);

// Sound On / Sound Off 16x16 icons for HUD Mute button
renderGrid(
  path.join(OUT_DIR, 'custom/icon_sound_on.png'),
  [
    '................',
    '.......KK.......',
    '......KYK.......',
    '.....KYYK..KK...',
    '..KKKKYYK...KK..',
    '.KWWWWYYK.K..KK.',
    '.KWWWWYYK.KK..K.',
    '.KWWWWYYK..K..K.',
    '.KWWWWYYK..K..K.',
    '.KWWWWYYK.KK..K.',
    '.KWWWWYYK.K..KK.',
    '..KKKKYYK...KK..',
    '.....KYYK..KK...',
    '......KYK.......',
    '.......KK.......',
    '................',
  ],
  P
);

renderGrid(
  path.join(OUT_DIR, 'custom/icon_sound_off.png'),
  [
    '................',
    '.......KK.......',
    '......KYK.......',
    '.....KYYK.......',
    '..KKKKYYK.K...K.',
    '.KWWWWYYK.Kr.rK.',
    '.KWWWWYYK..KrK..',
    '.KWWWWYYK..KRRK.',
    '.KWWWWYYK..KRRK.',
    '.KWWWWYYK..KrK..',
    '.KWWWWYYK.Kr.rK.',
    '..KKKKYYK.K...K.',
    '.....KYYK.......',
    '......KYK.......',
    '.......KK.......',
    '................',
  ],
  P
);

console.log('UI assets built cleanly in', OUT_DIR);
