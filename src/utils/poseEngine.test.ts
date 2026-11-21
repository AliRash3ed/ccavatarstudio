import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeBlinkAtTime,
  computeWatermarkCoords,
  evaluateLimbPoseAtTime,
  GESTURE_PRESETS,
  interpolateLimb,
} from './poseEngine.ts';

test('computeBlinkAtTime keeps eyes open at t=0 and most frames, blinking briefly near 3.48s', () => {
  assert.equal(computeBlinkAtTime(0), false);
  assert.equal(computeBlinkAtTime(0.5), false);
  assert.equal(computeBlinkAtTime(1.8), false);
  assert.equal(computeBlinkAtTime(3.2), false);
  assert.equal(computeBlinkAtTime(3.48), true);
  assert.equal(computeBlinkAtTime(3.58), false);
  assert.equal(computeBlinkAtTime(7.08), true);
});

test('interpolateLimb blends smoothly halfway between rest and point-up', () => {
  const from = GESTURE_PRESETS.rest.R;
  const to = GESTURE_PRESETS['point-up'].R;
  const mid = interpolateLimb(from, to, 0.5);
  assert.ok(mid.wy < from.wy && mid.wy > to.wy, `Expected mid wy between ${to.wy} and ${from.wy}, got ${mid.wy}`);
  assert.equal(Number(mid.wy.toFixed(1)), Number(((from.wy + to.wy) / 2).toFixed(1)));
});

test('evaluateLimbPoseAtTime transitions across cue boundary and maintains speaking cadence movement', () => {
  const segments = [
    { start: 0, end: 2.0, gesture: 'rest' },
    { start: 2.0, end: 5.0, gesture: 'point-up' },
  ];

  // Immediately after cue boundary (2.18s): halfway between rest and point-up
  const duringTransition = evaluateLimbPoseAtTime({
    t: 2.18,
    segments,
    isSpeaking: true,
  });
  assert.ok(duringTransition.R.wy < 238 && duringTransition.R.wy > 162);

  // During hold (3.0s vs 3.5s): hands maintain subtle organic motion instead of being frozen identically
  const p1 = evaluateLimbPoseAtTime({ t: 3.0, segments, isSpeaking: true });
  const p2 = evaluateLimbPoseAtTime({ t: 3.5, segments, isSpeaking: true });
  assert.notEqual(p1.R.wy, p2.R.wy);
  assert.notEqual(p1.R.wx, p2.R.wx);
});

test('evaluateLimbPoseAtTime oscillates wrist rotation smoothly during wave gesture', () => {
  const segments = [{ start: 0, end: 3.0, gesture: 'wave' }];
  const w1 = evaluateLimbPoseAtTime({ t: 0.2, segments, isSpeaking: true });
  const w2 = evaluateLimbPoseAtTime({ t: 0.4, segments, isSpeaking: true });
  assert.notEqual(w1.R.rot, w2.R.rot);
});

test('computeWatermarkCoords resolves all four corners accurately', () => {
  const tl = computeWatermarkCoords('top-left', 1920, 1080, 40, 30);
  assert.deepEqual(tl, { x: 40, y: 30, textAlign: 'left', baseline: 'top' });

  const br = computeWatermarkCoords('bottom-right', 1920, 1080, 40, 30);
  assert.deepEqual(br, { x: 1880, y: 1050, textAlign: 'right', baseline: 'bottom' });
});
