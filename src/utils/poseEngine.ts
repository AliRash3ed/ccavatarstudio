/**
 * Deterministic 2D Puppet Pose, Limb Interpolation & Blink Engine
 * Keeps arm kinematics, smooth cue-boundary transitions, subtle speaking cadence,
 * natural timed eye blinks, and watermark coordinates pure and unit-testable.
 */

import { WatermarkPosition } from '../types/character';

export interface LimbConfig {
  ex: number;
  ey: number;
  wx: number;
  wy: number;
  rot: number;
  pose: string;
  scale?: number;
  waveClass?: string;
}

export interface TimelinePoseSegment {
  start: number;
  end: number;
  gesture: string;
}

export const GESTURE_PRESETS: Record<string, { L: LimbConfig; R: LimbConfig }> = {
  rest: {
    L: { ex: 56, ey: 204, wx: 55, wy: 238, rot: 0, pose: 'relaxed-side' },
    R: { ex: 184, ey: 204, wx: 185, wy: 238, rot: 0, pose: 'relaxed-side' },
  },
  steeple: {
    L: { ex: 54, ey: 208, wx: 96, wy: 196, rot: 0, pose: 'steeple-half' },
    R: { ex: 186, ey: 208, wx: 144, wy: 196, rot: 0, pose: 'steeple-half' },
  },
  'empathy-chest': {
    L: { ex: 60, ey: 210, wx: 102, wy: 184, rot: 0, pose: 'chest-empathy' },
    R: { ex: 180, ey: 210, wx: 138, wy: 184, rot: 0, pose: 'chest-empathy' },
  },
  'point-up': {
    L: { ex: 56, ey: 204, wx: 55, wy: 238, rot: 0, pose: 'relaxed-side' },
    R: { ex: 184, ey: 208, wx: 202, wy: 162, rot: 0, pose: 'point-up' },
  },
  'open-palms': {
    L: { ex: 54, ey: 208, wx: 36, wy: 184, rot: -15, pose: 'open-5' },
    R: { ex: 186, ey: 208, wx: 204, wy: 184, rot: 15, pose: 'open-5' },
  },
  'point-camera': {
    L: { ex: 56, ey: 204, wx: 55, wy: 238, rot: 0, pose: 'relaxed-side' },
    R: { ex: 180, ey: 204, wx: 168, wy: 176, rot: -8, pose: 'point-up', scale: 1.12 },
  },
  sweep: {
    L: { ex: 56, ey: 204, wx: 55, wy: 238, rot: 0, pose: 'relaxed-side' },
    R: { ex: 190, ey: 198, wx: 214, wy: 170, rot: 25, pose: 'open-5' },
  },
  'narrative-sweep': {
    L: { ex: 56, ey: 204, wx: 55, wy: 238, rot: 0, pose: 'relaxed-side' },
    R: { ex: 190, ey: 198, wx: 214, wy: 170, rot: 25, pose: 'open-5' },
  },
  stop: {
    L: { ex: 56, ey: 204, wx: 55, wy: 238, rot: 0, pose: 'relaxed-side' },
    R: { ex: 184, ey: 204, wx: 196, wy: 162, rot: 0, pose: 'open-5' },
  },
  chop: {
    L: { ex: 58, ey: 208, wx: 84, wy: 202, rot: 35, pose: 'open-5' },
    R: { ex: 182, ey: 206, wx: 152, wy: 188, rot: -35, pose: 'salute-2' },
  },
  'count-1': {
    L: { ex: 56, ey: 204, wx: 55, wy: 238, rot: 0, pose: 'relaxed-side' },
    R: { ex: 184, ey: 206, wx: 200, wy: 162, rot: 0, pose: 'count-1' },
  },
  'count-2': {
    L: { ex: 56, ey: 204, wx: 55, wy: 238, rot: 0, pose: 'relaxed-side' },
    R: { ex: 184, ey: 206, wx: 200, wy: 162, rot: 0, pose: 'count-2' },
  },
  'count-3': {
    L: { ex: 56, ey: 204, wx: 55, wy: 238, rot: 0, pose: 'relaxed-side' },
    R: { ex: 184, ey: 206, wx: 200, wy: 162, rot: 0, pose: 'count-3' },
  },
  'size-wide': {
    L: { ex: 48, ey: 198, wx: 30, wy: 180, rot: 12, pose: 'open-5' },
    R: { ex: 192, ey: 198, wx: 210, wy: 180, rot: -12, pose: 'open-5' },
  },
  'size-small': {
    L: { ex: 60, ey: 208, wx: 96, wy: 192, rot: 12, pose: 'precision-pinch' },
    R: { ex: 180, ey: 208, wx: 144, wy: 192, rot: -12, pose: 'precision-pinch' },
  },
  'precision-pinch': {
    L: { ex: 56, ey: 204, wx: 55, wy: 238, rot: 0, pose: 'relaxed-side' },
    R: { ex: 184, ey: 206, wx: 200, wy: 162, rot: 0, pose: 'precision-pinch' },
  },
  thinking: {
    L: { ex: 60, ey: 210, wx: 112, wy: 204, rot: 65, pose: 'chest-empathy' },
    R: { ex: 176, ey: 206, wx: 136, wy: 154, rot: -20, pose: 'point-up' },
  },
  wave: {
    L: { ex: 56, ey: 204, wx: 55, wy: 238, rot: 0, pose: 'relaxed-side' },
    R: { ex: 188, ey: 194, wx: 208, wy: 142, rot: 14, pose: 'open-5', waveClass: 'svg-right-hand-wave' },
  },
  'salute-2': {
    L: { ex: 56, ey: 204, wx: 55, wy: 238, rot: 0, pose: 'relaxed-side' },
    R: { ex: 184, ey: 206, wx: 200, wy: 162, rot: 0, pose: 'salute-2' },
  },
  'open-5': {
    L: { ex: 56, ey: 204, wx: 55, wy: 238, rot: 0, pose: 'relaxed-side' },
    R: { ex: 184, ey: 206, wx: 200, wy: 162, rot: 0, pose: 'open-5' },
  },
  'point-right': {
    L: { ex: 56, ey: 204, wx: 55, wy: 238, rot: 0, pose: 'relaxed-side' },
    R: { ex: 184, ey: 206, wx: 198, wy: 174, rot: 0, pose: 'point-right' },
  },
  'thumbs-up': {
    L: { ex: 56, ey: 204, wx: 55, wy: 238, rot: 0, pose: 'relaxed-side' },
    R: { ex: 184, ey: 206, wx: 194, wy: 170, rot: 0, pose: 'thumbs-up' },
  },
  'thumbs-down': {
    L: { ex: 56, ey: 204, wx: 55, wy: 238, rot: 0, pose: 'relaxed-side' },
    R: { ex: 184, ey: 206, wx: 194, wy: 174, rot: 0, pose: 'thumbs-down' },
  },
  'rock-on': {
    L: { ex: 56, ey: 204, wx: 55, wy: 238, rot: 0, pose: 'relaxed-side' },
    R: { ex: 184, ey: 206, wx: 200, wy: 162, rot: 0, pose: 'rock-on' },
  },
  'ily-horns': {
    L: { ex: 56, ey: 204, wx: 55, wy: 238, rot: 0, pose: 'relaxed-side' },
    R: { ex: 184, ey: 206, wx: 200, wy: 162, rot: 0, pose: 'ily-horns' },
  },
  'finger-gun': {
    L: { ex: 56, ey: 204, wx: 55, wy: 238, rot: 0, pose: 'relaxed-side' },
    R: { ex: 182, ey: 206, wx: 178, wy: 182, rot: 0, pose: 'finger-gun' },
  },
  'offering-palm': {
    L: { ex: 56, ey: 204, wx: 55, wy: 238, rot: 0, pose: 'relaxed-side' },
    R: { ex: 184, ey: 206, wx: 192, wy: 186, rot: 0, pose: 'offering-palm' },
  },
  'point-down-left': {
    L: { ex: 56, ey: 204, wx: 55, wy: 238, rot: 0, pose: 'relaxed-side' },
    R: { ex: 182, ey: 206, wx: 176, wy: 190, rot: -32, pose: 'point-left' },
  },
  'point-left': {
    L: { ex: 56, ey: 204, wx: 55, wy: 238, rot: 0, pose: 'relaxed-side' },
    R: { ex: 182, ey: 206, wx: 180, wy: 180, rot: 0, pose: 'point-left' },
  },
  'l-frame': {
    L: { ex: 56, ey: 204, wx: 55, wy: 238, rot: 0, pose: 'relaxed-side' },
    R: { ex: 184, ey: 206, wx: 200, wy: 162, rot: 0, pose: 'l-frame' },
  },
  'plucked-ok': {
    L: { ex: 56, ey: 204, wx: 55, wy: 238, rot: 0, pose: 'relaxed-side' },
    R: { ex: 184, ey: 206, wx: 198, wy: 164, rot: -6, pose: 'plucked-ok' },
  },
  'plucked-pinch': {
    L: { ex: 56, ey: 204, wx: 55, wy: 238, rot: 0, pose: 'relaxed-side' },
    R: { ex: 184, ey: 206, wx: 198, wy: 164, rot: -6, pose: 'plucked-ok' },
  },
};

export function getGestureLimbConfig(gesture: string): { L: LimbConfig; R: LimbConfig } {
  return GESTURE_PRESETS[gesture] || GESTURE_PRESETS.steeple;
}

export function cubicEaseInOut(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped < 0.5
    ? 4 * clamped * clamped * clamped
    : 1 - Math.pow(-2 * clamped + 2, 3) / 2;
}

export function interpolateLimb(from: LimbConfig, to: LimbConfig, rawAlpha: number): LimbConfig {
  const a = cubicEaseInOut(rawAlpha);
  const lerp = (x: number, y: number) => Number((x + (y - x) * a).toFixed(2));
  return {
    ex: lerp(from.ex, to.ex),
    ey: lerp(from.ey, to.ey),
    wx: lerp(from.wx, to.wx),
    wy: lerp(from.wy, to.wy),
    rot: lerp(from.rot, to.rot),
    scale: lerp(from.scale ?? 0.94, to.scale ?? 0.94),
    pose: a >= 0.5 ? to.pose : from.pose,
    waveClass: a >= 0.5 ? to.waveClass : from.waveClass,
  };
}

/**
 * Deterministic natural eye blink schedule.
 * Eyes are guaranteed OPEN at t=0 and open 96.5% of every cycle,
 * closing briefly for 0.12s near the end of each 3.60s interval.
 */
export function computeBlinkAtTime(t: number): boolean {
  if (!Number.isFinite(t) || t <= 0) return false;
  const cycle = 3.6;
  const phase = t % cycle;
  return phase >= 3.42 && phase <= 3.54;
}

function addGentleCadence(
  limb: LimbConfig,
  t: number,
  side: 'left' | 'right',
  isWave: boolean,
  _isSpeaking?: boolean
): LimbConfig {
  if (t <= 0) return limb;

  // Active waving hand animation for wave gesture
  if (isWave && side === 'right') {
    const rotCadence = Math.sin(t * 3.5) * 8;
    return {
      ...limb,
      rot: Number((limb.rot + rotCadence).toFixed(2)),
    };
  }

  // Calm, serene organic breathing drift (slow 0.4 rad/s ~ 15 second cycle, max 0.16px subtle motion)
  // Eliminates high-frequency hand tremors, sudden syllable jolts, and wrist twisting
  const phaseShift = side === 'left' ? 0 : 0.85;
  const dx = Math.sin(t * 0.4 + phaseShift) * 0.12;
  const dy = Math.cos(t * 0.4 + phaseShift) * 0.16;

  return {
    ...limb,
    ex: Number((limb.ex + dx * 0.2).toFixed(2)),
    ey: Number((limb.ey + dy * 0.2).toFixed(2)),
    wx: Number((limb.wx + dx).toFixed(2)),
    wy: Number((limb.wy + dy).toFixed(2)),
  };
}

/**
 * Evaluates smooth interpolated left & right limb configurations at timestamp `t`:
 * - Blends smoothly across a 0.36s window when switching between cue gestures
 * - Adds organic presenter breathing/cadence sway during active playback/render
 */
export function evaluateLimbPoseAtTime(params: {
  t: number;
  segments: TimelinePoseSegment[];
  manualPoseOverride?: boolean;
  manualGesture?: string;
  isSpeaking?: boolean;
  transitionSec?: number;
}): { L: LimbConfig; R: LimbConfig; activeGesture: string } {
  const {
    t,
    segments,
    manualPoseOverride = false,
    manualGesture = 'steeple',
    isSpeaking = true,
    transitionSec = 0.36,
  } = params;

  if (manualPoseOverride || segments.length === 0) {
    const cfg = getGestureLimbConfig(manualGesture);
    const isWave = manualGesture === 'wave';
    return {
      L: addGentleCadence(cfg.L, t, 'left', false, isSpeaking),
      R: addGentleCadence(cfg.R, t, 'right', isWave, isSpeaking),
      activeGesture: manualGesture,
    };
  }

  let idx = segments.findIndex((s) => t >= s.start && t <= s.end);
  if (idx === -1) {
    // Between cues or past end: find next upcoming segment or clamp to last
    const nextIdx = segments.findIndex((s) => t < s.start);
    idx = nextIdx === -1 ? segments.length - 1 : Math.max(0, nextIdx - 1);
    if (nextIdx === 0) idx = 0;
  }

  const currSeg = segments[idx];
  const prevSeg = idx > 0 ? segments[idx - 1] : currSeg;
  const currCfg = getGestureLimbConfig(currSeg.gesture);
  const prevCfg = getGestureLimbConfig(prevSeg.gesture);

  const sinceCueStart = Math.max(0, t - currSeg.start);
  let L: LimbConfig;
  let R: LimbConfig;

  if (idx > 0 && sinceCueStart < transitionSec && prevSeg.gesture !== currSeg.gesture) {
    const alpha = sinceCueStart / transitionSec;
    L = interpolateLimb(prevCfg.L, currCfg.L, alpha);
    R = interpolateLimb(prevCfg.R, currCfg.R, alpha);
  } else {
    L = currCfg.L;
    R = currCfg.R;
  }

  const isWave = currSeg.gesture === 'wave';
  return {
    L: addGentleCadence(L, t, 'left', false, isSpeaking),
    R: addGentleCadence(R, t, 'right', isWave, isSpeaking),
    activeGesture: currSeg.gesture,
  };
}

export function computeWatermarkCoords(
  position: WatermarkPosition,
  canvasWidth: number,
  canvasHeight: number,
  marginX: number = 32,
  marginY: number = 32
): {
  x: number;
  y: number;
  textAlign: 'left' | 'right';
  baseline: 'top' | 'bottom';
} {
  const isRight = position === 'top-right' || position === 'bottom-right';
  const isBottom = position === 'bottom-left' || position === 'bottom-right';
  return {
    x: isRight ? canvasWidth - marginX : marginX,
    y: isBottom ? canvasHeight - marginY : marginY,
    textAlign: isRight ? 'right' : 'left',
    baseline: isBottom ? 'bottom' : 'top',
  };
}
