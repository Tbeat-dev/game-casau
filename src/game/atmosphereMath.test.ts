import assert from 'node:assert/strict';
import test from 'node:test';
import atmosphereData from '../config/atmosphere.json' with { type: 'json' };
import {
  computeEffectiveFogDensity,
  computeTexelRepeat,
  findBrightestEquirectangularDirection,
  interpolateAtmosphere,
  SKY_BUDGET_BYTES,
  sunAnglesToDirection,
  TEXTURE_BUDGET_BYTES,
  validateAssetBudgets,
  type AtmosphereProfile,
} from './atmosphereMath.ts';

test('atmosphere config contains all 4 required round sky profiles', () => {
  const rounds = atmosphereData.rounds as AtmosphereProfile[];
  assert.equal(rounds.length, 4);
  assert.deepEqual(
    rounds.map((r) => r.skyId),
    ['sky.round1', 'sky.round2', 'sky.round3', 'sky.final']
  );
  for (const r of rounds) {
    assert.equal(r.skyHorizon.toLowerCase(), r.fogColor.toLowerCase(), `${r.skyId} fog must match horizon`);
    assert.ok(r.cloudRotSpeed >= 0.001 && r.cloudRotSpeed <= 0.003);
  }
});

test('interpolateAtmosphere blends sun, fog, exposure, and colors smoothly without snap', () => {
  const [r1, r2] = atmosphereData.rounds as AtmosphereProfile[];
  const mid = interpolateAtmosphere(r1, r2, 0.5);
  assert.ok(mid.sunElevationDeg > r2.sunElevationDeg && mid.sunElevationDeg < r1.sunElevationDeg);
  assert.ok(mid.lanternGlow > r1.lanternGlow && mid.lanternGlow < r2.lanternGlow);
  assert.equal(interpolateAtmosphere(r1, r2, 0).skyHorizon, r1.skyHorizon);
  assert.equal(interpolateAtmosphere(r1, r2, 1).skyHorizon, r2.skyHorizon);
});

test('findBrightestEquirectangularDirection aligns directional sun with brightest HDR/LDR pixel', () => {
  const w = 16;
  const h = 8;
  const buf = new Float32Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    buf[i * 4] = 0.2;
    buf[i * 4 + 1] = 0.2;
    buf[i * 4 + 2] = 0.25;
    buf[i * 4 + 3] = 1.0;
  }
  // Place bright sun spot in upper-right quadrant (x=12, y=1)
  const sunIdx = (1 * w + 12) * 4;
  buf[sunIdx] = 12.0;
  buf[sunIdx + 1] = 9.0;
  buf[sunIdx + 2] = 5.0;

  const dir = findBrightestEquirectangularDirection(buf, w, h);
  assert.ok(dir.y > 0.5, 'Sun should point upward');
  assert.ok(dir.x > 0.2, 'x=12/16 sits in positive X azimuth');
  assert.ok(Math.abs(Math.hypot(dir.x, dir.y, dir.z) - 1) < 1e-4);
});

test('sunAnglesToDirection produces unit vector and computeTexelRepeat preserves 2m world tile scale', () => {
  const dir = sunAnglesToDirection(30, 45);
  assert.ok(Math.abs(Math.hypot(dir.x, dir.y, dir.z) - 1) < 1e-5);
  assert.deepEqual(computeTexelRepeat(13.5, 2.6, 2.0), [6.75, 1.3]);
});

test('computeEffectiveFogDensity keeps nearest safe zone readable under Mù debuff', () => {
  const clear = computeEffectiveFogDensity(0.01, 58);
  const foggy = computeEffectiveFogDensity(0.01, 14);
  assert.equal(clear, 0.01);
  assert.ok(foggy > clear && foggy <= 0.06);
});

test('validateAssetBudgets enforces 20MB texture and 6MB sky budgets', () => {
  const ok = validateAssetBudgets([
    { kind: 'texture', bytes: 4 * 1024 * 1024 },
    { kind: 'sky', bytes: 2 * 1024 * 1024 },
  ]);
  assert.equal(ok.totalOk, true);

  const over = validateAssetBudgets([
    { kind: 'texture', bytes: TEXTURE_BUDGET_BYTES + 1 },
    { kind: 'sky', bytes: SKY_BUDGET_BYTES + 1 },
  ]);
  assert.equal(over.textureOk, false);
  assert.equal(over.skyOk, false);
  assert.equal(over.totalOk, false);
});
