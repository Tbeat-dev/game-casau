export interface AtmosphereProfile {
  roundNumber: number;
  skyId: string;
  hdriCandidate: string;
  label: string;
  sunElevationDeg: number;
  sunAzimuthDeg: number;
  sunColor: string;
  sunIntensity: number;
  hemiSkyColor: string;
  hemiGroundColor: string;
  hemiIntensity: number;
  skyZenith: string;
  skyMid: string;
  skyHorizon: string;
  cloudTint: string;
  cloudOpacity: number;
  fogColor: string;
  baseFogDensity: number;
  exposure: number;
  lanternGlow: number;
  starOpacity: number;
  moonOpacity: number;
  cloudRotSpeed: number;
  ambientParticleMode: 'petals' | 'fireflies';
}

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

export interface BrightestSunResult extends Vec3Like {
  colorHex: string;
  luminance: number;
  u: number;
  v: number;
}

export interface BudgetAssetItem {
  kind: 'texture' | 'sky';
  bytes: number;
}

export const TEXTURE_BUDGET_BYTES = 20 * 1024 * 1024;
export const SKY_BUDGET_BYTES = 6 * 1024 * 1024;

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function parseHexRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6) return [255, 255, 255];
  const n = Number.parseInt(clean, 16);
  if (Number.isNaN(n)) return [255, 255, 255];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHexRgb(r: number, g: number, b: number): string {
  const rr = Math.max(0, Math.min(255, Math.round(r))).toString(16).padStart(2, '0');
  const gg = Math.max(0, Math.min(255, Math.round(g))).toString(16).padStart(2, '0');
  const bb = Math.max(0, Math.min(255, Math.round(b))).toString(16).padStart(2, '0');
  return `#${rr}${gg}${bb}`;
}

export function lerpHexColor(hexA: string, hexB: string, t: number): string {
  const k = clamp01(t);
  const [ar, ag, ab] = parseHexRgb(hexA);
  const [br, bg, bb] = parseHexRgb(hexB);
  return toHexRgb(lerp(ar, br, k), lerp(ag, bg, k), lerp(ab, bb, k));
}

/**
 * Convert sun elevation (deg above horizon) and azimuth (deg around Y) into a unit direction vector.
 */
export function sunAnglesToDirection(elevationDeg: number, azimuthDeg: number): Vec3Like {
  const elev = (elevationDeg * Math.PI) / 180;
  const azim = (azimuthDeg * Math.PI) / 180;
  const cosE = Math.cos(elev);
  const x = cosE * Math.sin(azim);
  const y = Math.sin(elev);
  const z = cosE * Math.cos(azim);
  const len = Math.hypot(x, y, z) || 1;
  return { x: x / len, y: y / len, z: z / len };
}

/**
 * Locate the brightest pixel in an equirectangular RGBA buffer (e.g. HDR/LDR sky)
 * to align DirectionalLight shadows with the sky's sun/moon disc.
 */
export function findBrightestEquirectangularDirection(
  pixels: Uint8Array | Uint8ClampedArray | Float32Array,
  width: number,
  height: number
): BrightestSunResult {
  let bestLum = -1;
  let bestX = Math.floor(width / 2);
  let bestY = Math.floor(height / 4);
  let bestR = 255;
  let bestG = 230;
  let bestB = 190;
  const isFloat = pixels instanceof Float32Array;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (lum > bestLum) {
        bestLum = lum;
        bestX = x;
        bestY = y;
        bestR = r;
        bestG = g;
        bestB = b;
      }
    }
  }

  const u = (bestX + 0.5) / Math.max(1, width);
  const v = (bestY + 0.5) / Math.max(1, height);
  const theta = (u - 0.5) * Math.PI * 2;
  const phi = v * Math.PI; // 0 = zenith (+Y), PI = nadir (-Y)
  const sinPhi = Math.sin(phi);
  const dx = sinPhi * Math.sin(theta);
  const dy = Math.max(0.08, Math.cos(phi));
  const dz = sinPhi * Math.cos(theta);
  const len = Math.hypot(dx, dy, dz) || 1;

  const scale = isFloat ? 255 / Math.max(1, bestR, bestG, bestB) : 1;
  return {
    x: dx / len,
    y: dy / len,
    z: dz / len,
    colorHex: toHexRgb(bestR * scale, bestG * scale, bestB * scale),
    luminance: bestLum,
    u,
    v,
  };
}

/**
 * Smoothly cross-fade two AtmosphereProfiles at factor t in [0..1].
 */
export function interpolateAtmosphere(
  from: AtmosphereProfile,
  to: AtmosphereProfile,
  t: number
): AtmosphereProfile {
  const k = clamp01(t);
  return {
    roundNumber: k >= 0.5 ? to.roundNumber : from.roundNumber,
    skyId: k >= 0.5 ? to.skyId : from.skyId,
    hdriCandidate: k >= 0.5 ? to.hdriCandidate : from.hdriCandidate,
    label: k >= 0.5 ? to.label : from.label,
    sunElevationDeg: lerp(from.sunElevationDeg, to.sunElevationDeg, k),
    sunAzimuthDeg: lerp(from.sunAzimuthDeg, to.sunAzimuthDeg, k),
    sunColor: lerpHexColor(from.sunColor, to.sunColor, k),
    sunIntensity: lerp(from.sunIntensity, to.sunIntensity, k),
    hemiSkyColor: lerpHexColor(from.hemiSkyColor, to.hemiSkyColor, k),
    hemiGroundColor: lerpHexColor(from.hemiGroundColor, to.hemiGroundColor, k),
    hemiIntensity: lerp(from.hemiIntensity, to.hemiIntensity, k),
    skyZenith: lerpHexColor(from.skyZenith, to.skyZenith, k),
    skyMid: lerpHexColor(from.skyMid, to.skyMid, k),
    skyHorizon: lerpHexColor(from.skyHorizon, to.skyHorizon, k),
    cloudTint: lerpHexColor(from.cloudTint, to.cloudTint, k),
    cloudOpacity: lerp(from.cloudOpacity, to.cloudOpacity, k),
    fogColor: lerpHexColor(from.fogColor, to.fogColor, k),
    baseFogDensity: lerp(from.baseFogDensity, to.baseFogDensity, k),
    exposure: lerp(from.exposure, to.exposure, k),
    lanternGlow: lerp(from.lanternGlow, to.lanternGlow, k),
    starOpacity: lerp(from.starOpacity, to.starOpacity, k),
    moonOpacity: lerp(from.moonOpacity, to.moonOpacity, k),
    cloudRotSpeed: lerp(from.cloudRotSpeed, to.cloudRotSpeed, k),
    ambientParticleMode: k >= 0.5 ? to.ambientParticleMode : from.ambientParticleMode,
  };
}

/**
 * Compute uniform RepeatWrapping UV repeat counts for world-space texel density (1 tile = tileMeters).
 */
export function computeTexelRepeat(
  worldWidthMeters: number,
  worldHeightMeters: number,
  tileMeters = 2.0
): [number, number] {
  const safeTile = Math.max(0.25, tileMeters);
  return [
    Math.max(0.25, Number((worldWidthMeters / safeTile).toFixed(3))),
    Math.max(0.25, Number((worldHeightMeters / safeTile).toFixed(3))),
  ];
}

/**
 * Combine base round fog density with Mù debuff visibility range (keeps safe zones & croc legible).
 */
export function computeEffectiveFogDensity(baseFogDensity: number, visibleRange: number): number {
  if (visibleRange >= 50) {
    return visibleRange > 62 ? Math.max(0.006, baseFogDensity * 0.72) : baseFogDensity;
  }
  const clamped = Math.max(11, Math.min(50, visibleRange));
  const t = (50 - clamped) / (50 - 11);
  return baseFogDensity + t * 0.048;
}

/**
 * Verify 20 MB PBR texture budget and 6 MB sky/HDRI budget.
 */
export function validateAssetBudgets(items: BudgetAssetItem[]): {
  textureBytes: number;
  skyBytes: number;
  textureOk: boolean;
  skyOk: boolean;
  totalOk: boolean;
} {
  let textureBytes = 0;
  let skyBytes = 0;
  for (const item of items) {
    if (item.kind === 'sky') skyBytes += Math.max(0, item.bytes);
    else textureBytes += Math.max(0, item.bytes);
  }
  const textureOk = textureBytes <= TEXTURE_BUDGET_BYTES;
  const skyOk = skyBytes <= SKY_BUDGET_BYTES;
  return {
    textureBytes,
    skyBytes,
    textureOk,
    skyOk,
    totalOk: textureOk && skyOk,
  };
}
