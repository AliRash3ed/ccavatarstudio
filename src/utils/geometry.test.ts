import test from 'node:test';
import assert from 'node:assert/strict';
import { computeCuffEnd, clampHeadTilt, getExportResolution, formatPauseTime, formatTimecode } from './geometry';

test('computeCuffEnd computes correct pullback point along vector', () => {
  const cuff = computeCuffEnd(100, 100, 200, 100, 20);
  assert.equal(cuff.x, 180);
  assert.equal(cuff.y, 100);
});

test('computeCuffEnd handles zero-length fallback gracefully', () => {
  const cuff = computeCuffEnd(150, 150, 150, 150, 20);
  assert.equal(cuff.x, 150);
  assert.equal(cuff.y, 150);
});

test('clampHeadTilt enforces strict anatomical bounds between -15 and 15 degrees', () => {
  assert.equal(clampHeadTilt(-25), -15);
  assert.equal(clampHeadTilt(30), 15);
  assert.equal(clampHeadTilt(8), 8);
  assert.equal(clampHeadTilt(NaN), 0);
});

test('getExportResolution returns accurate dimensions for aspect ratios', () => {
  assert.deepEqual(getExportResolution('16:9'), { width: 1920, height: 1080 });
  assert.deepEqual(getExportResolution('9:16'), { width: 1080, height: 1920 });
  assert.deepEqual(getExportResolution('1:1'), { width: 1080, height: 1080 });
});

test('formatPauseTime clamps and formats seconds correctly', () => {
  assert.equal(formatPauseTime(0.22), '0.22s');
  assert.equal(formatPauseTime(0.01), '0.10s');
  assert.equal(formatPauseTime(0.99), '0.40s');
});

test('formatTimecode zero-pads minutes, seconds, and centiseconds cleanly', () => {
  assert.equal(formatTimecode(0), '00:00.00');
  assert.equal(formatTimecode(8.3), '00:08.30');
  assert.equal(formatTimecode(65.42), '01:05.42');
  assert.equal(formatTimecode(-2), '00:00.00');
});
