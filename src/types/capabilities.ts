/**
 * Single source of truth for the engine capabilities payload returned by
 * `GET /api/capabilities`. The server (`server/pipeline.ts`) builds it, and
 * the client (`App.tsx`, `SetupGuideModal.tsx`) renders it — this shared type
 * keeps both sides honest when the shape changes.
 */
export interface EngineCapabilities {
  rhubarb: { installed: boolean; version: string | null; path: string | null };
  ffmpeg: { installed: boolean; version: string | null; path: string | null };
  edgeTts: { installed: boolean; engine: string };
  python: { installed: boolean; version: string | null; scripts: string[] };
  geminiConfigured: boolean;
  openrouterConfigured: boolean;
  hfTokensConfigured: number;
  exportDir: string;
}
