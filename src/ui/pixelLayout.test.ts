import test from 'node:test';
import assert from 'node:assert/strict';
import {
  auditHudBoxes,
  clampVisibleEffects,
  computeVirtualStage,
  VIRTUAL_HEIGHT,
  VIRTUAL_WIDTH,
} from './pixelLayout';

test('computeVirtualStage uses exact integer k at standard resolutions', () => {
  const k2 = computeVirtualStage(960, 540);
  assert.equal(k2.k, 2);
  assert.equal(k2.isStandardVirtualGrid, true);
  assert.equal(k2.stageW, VIRTUAL_WIDTH * 2);
  assert.equal(k2.stageH, VIRTUAL_HEIGHT * 2);
  assert.equal(k2.offsetX, 0);
  assert.equal(k2.offsetY, 0);

  const k3 = computeVirtualStage(1440, 810);
  assert.equal(k3.k, 3);
  assert.equal(k3.stageW, 1440);
  assert.equal(k3.stageH, 810);

  const k4 = computeVirtualStage(1920, 1080);
  assert.equal(k4.k, 4);
  assert.equal(k4.stageW, 1920);
  assert.equal(k4.stageH, 1080);
});

test('computeVirtualStage centers integer stage inside non-16:9 / odd viewports cleanly', () => {
  const laptop = computeVirtualStage(1366, 768);
  assert.equal(laptop.k, 2);
  assert.equal(laptop.stageW, 960);
  assert.equal(laptop.stageH, 540);
  assert.equal(laptop.offsetX, 203);
  assert.equal(laptop.offsetY, 114);

  const ultrawide = computeVirtualStage(2560, 1080);
  assert.equal(ultrawide.k, 4);
  assert.equal(ultrawide.stageW, 1920);
  assert.equal(ultrawide.stageH, 1080);
  assert.equal(ultrawide.offsetX, 320);
  assert.equal(ultrawide.offsetY, 0);

  const mobile = computeVirtualStage(390, 844);
  assert.equal(mobile.k, 1);
  assert.equal(mobile.isStandardVirtualGrid, false);
  assert.equal(mobile.stageW, 390);
  assert.equal(mobile.stageH, 844);
});

test('auditHudBoxes catches overlaps and margin violations', () => {
  const stage = { left: 0, top: 0, right: 960, bottom: 540 };
  const clean = auditHudBoxes(
    [
      { id: 'top-left', left: 16, top: 16, right: 160, bottom: 72 },
      { id: 'top-center', left: 320, top: 16, right: 640, bottom: 72 },
    ],
    stage,
    16,
    8
  );
  assert.equal(clean.overlaps.length, 0);
  assert.equal(clean.outOfBounds.length, 0);

  const broken = auditHudBoxes(
    [
      { id: 'top-left', left: 4, top: 16, right: 330, bottom: 72 },
      { id: 'top-center', left: 325, top: 16, right: 640, bottom: 72 },
    ],
    stage,
    16,
    8
  );
  assert.equal(broken.overlaps.length, 1);
  assert.deepEqual(broken.outOfBounds, ['top-left']);
});

test('clampVisibleEffects prioritizes debuffs and emits overflow count', () => {
  const res = clampVisibleEffects(['b1', 'b2', 'b3', 'b4'], ['d1', 'd2'], 5);
  assert.deepEqual(res.visibleDebuffs, ['d1', 'd2']);
  assert.deepEqual(res.visibleBuffs, ['b1', 'b2', 'b3']);
  assert.equal(res.overflowCount, 1);
});
