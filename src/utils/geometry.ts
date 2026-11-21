/**
 * Pure Geometry & Rig Math Calculations
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Computes cuff coordinates pulled back along the elbow-to-wrist vector so sleeves lock seamlessly to wrists.
 */
export function computeCuffEnd(ex: number, ey: number, wx: number, wy: number, pullback: number = 20): Point {
  const dx = wx - ex;
  const dy = wy - ey;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.001) return { x: wx, y: wy };
  return {
    x: Math.round((wx - (dx / len) * pullback) * 10) / 10,
    y: Math.round((wy - (dy / len) * pullback) * 10) / 10,
  };
}

/**
 * Clamps head tilt to the specified anatomical safe range [-15, 15] degrees.
 */
export function clampHeadTilt(degrees: number): number {
  if (isNaN(degrees)) return 0;
  return Math.max(-15, Math.min(15, degrees));
}

/**
 * Normalizes an aspect ratio string into width and height dimensions for canvas rendering.
 */
export function getExportResolution(aspect: '16:9' | '9:16' | '1:1'): { width: number; height: number } {
  switch (aspect) {
    case '16:9':
      return { width: 1920, height: 1080 };
    case '9:16':
      return { width: 1080, height: 1920 };
    case '1:1':
      return { width: 1080, height: 1080 };
  }
}

/**
 * Maps a pause value (in seconds) to human speech cadence pacing.
 */
export function formatPauseTime(pauseSec: number): string {
  const clamped = Math.max(0.1, Math.min(0.4, pauseSec));
  return `${clamped.toFixed(2)}s`;
}

/**
 * Formats seconds into zero-padded MM:SS.cc studio timecode (e.g. "00:08.30").
 */
export function formatTimecode(seconds: number): string {
  const safe = Math.max(0, isFinite(seconds) ? seconds : 0);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  const wholeSecs = Math.floor(secs);
  const centis = Math.floor((secs - wholeSecs) * 100 + 1e-6);
  return `${String(mins).padStart(2, '0')}:${String(wholeSecs).padStart(2, '0')}.${String(Math.min(99, centis)).padStart(2, '0')}`;
}

