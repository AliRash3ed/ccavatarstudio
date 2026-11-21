import { execFile } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { GoogleGenAI, Type } from '@google/genai';
import { toDevanagari, analyzeScriptConversion } from '../src/utils/transliterate.ts';

const execFileAsync = promisify(execFile);

export type RhubarbRecognizer = 'phonetic' | 'pocketSphinx';
export type SupportedLanguageCode = string;

export interface RhubarbMouthCue {
  start: number;
  end: number;
  value: string;
}

export interface WordTiming {
  start: number;
  end: number;
  word: string;
}

export interface TaggedPhrase {
  text: string;
  emotion: string;
  gesture?: string;
}

export interface SavedExportRecord {
  id: string;
  projectSlug: string;
  projectName: string;
  filename: string;
  format: 'mp4' | 'wav' | 'png' | 'webm' | 'json';
  sizeBytes: number;
  url: string;
  savedPath: string;
  createdAt: string;
}

export interface EdgeVoiceEntry {
  shortName: string;
  locale: string;
  localeName: string;
  languageCode: string;
  gender: 'Male' | 'Female' | 'Neutral';
  friendlyName: string;
}

import type { EngineCapabilities } from '../src/types/capabilities';

export type { EngineCapabilities };

export interface WavHeaderInfo {
  sampleRate: number;
  numChannels: number;
  bitsPerSample: number;
  dataOffset: number;
  dataSize: number;
  durationSec: number;
}

export const EMOTION_PROSODY_MAP: Record<string, { rate: string; rateDelta: number; pitch: string }> = {
  neutral: { rate: '+0%', rateDelta: 0, pitch: '+0Hz' },
  warm: { rate: '+2%', rateDelta: 2, pitch: '+3Hz' },
  empathetic: { rate: '-6%', rateDelta: -6, pitch: '-4Hz' },
  shocked: { rate: '+7%', rateDelta: 7, pitch: '+8Hz' },
  focused: { rate: '-2%', rateDelta: -2, pitch: '-1Hz' },
  curious: { rate: '+1%', rateDelta: 1, pitch: '+4Hz' },
  confident: { rate: '+3%', rateDelta: 3, pitch: '+2Hz' },
};

const RECOMMENDED_VOICE_BY_LANG: Record<string, string> = {
  en: 'en-US-AndrewMultilingualNeural',
  hi: 'hi-IN-MadhurNeural',
  ur: 'ur-PK-AsadNeural',
  ar: 'ar-SA-HamedNeural',
  ja: 'ja-JP-KeitaNeural',
  es: 'es-ES-AlvaroNeural',
  fr: 'fr-FR-HenriNeural',
  de: 'de-DE-ConradNeural',
  pt: 'pt-BR-AntonioNeural',
  it: 'it-IT-DiegoNeural',
  tr: 'tr-TR-AhmetNeural',
  id: 'id-ID-ArdiNeural',
  ko: 'ko-KR-InJoonNeural',
  zh: 'zh-CN-YunxiNeural',
  ru: 'ru-RU-DmitryNeural',
  bn: 'bn-IN-BashkarNeural',
  ta: 'ta-IN-ValluvarNeural',
  te: 'te-IN-MohanNeural',
  mr: 'mr-IN-ManoharNeural',
  vi: 'vi-VN-NamMinhNeural',
  th: 'th-TH-NiwatNeural',
  nl: 'nl-NL-MaartenNeural',
  pl: 'pl-PL-MarekNeural',
  fa: 'fa-IR-FaridNeural',
};

const FALLBACK_EDGE_VOICES: EdgeVoiceEntry[] = [
  { shortName: 'en-US-AndrewMultilingualNeural', locale: 'en-US', localeName: 'English (United States)', languageCode: 'en', gender: 'Male', friendlyName: 'Andrew Multilingual' },
  { shortName: 'en-US-AvaMultilingualNeural', locale: 'en-US', localeName: 'English (United States)', languageCode: 'en', gender: 'Female', friendlyName: 'Ava Multilingual' },
  { shortName: 'en-GB-RyanNeural', locale: 'en-GB', localeName: 'English (United Kingdom)', languageCode: 'en', gender: 'Male', friendlyName: 'Ryan' },
  { shortName: 'en-GB-SoniaNeural', locale: 'en-GB', localeName: 'English (United Kingdom)', languageCode: 'en', gender: 'Female', friendlyName: 'Sonia' },
  { shortName: 'hi-IN-MadhurNeural', locale: 'hi-IN', localeName: 'Hindi (India)', languageCode: 'hi', gender: 'Male', friendlyName: 'Madhur' },
  { shortName: 'hi-IN-SwaraNeural', locale: 'hi-IN', localeName: 'Hindi (India)', languageCode: 'hi', gender: 'Female', friendlyName: 'Swara' },
  { shortName: 'ur-PK-AsadNeural', locale: 'ur-PK', localeName: 'Urdu (Pakistan)', languageCode: 'ur', gender: 'Male', friendlyName: 'Asad' },
  { shortName: 'ur-PK-UzmaNeural', locale: 'ur-PK', localeName: 'Urdu (Pakistan)', languageCode: 'ur', gender: 'Female', friendlyName: 'Uzma' },
  { shortName: 'ur-IN-SalmanNeural', locale: 'ur-IN', localeName: 'Urdu (India)', languageCode: 'ur', gender: 'Male', friendlyName: 'Salman' },
  { shortName: 'ur-IN-GulNeural', locale: 'ur-IN', localeName: 'Urdu (India)', languageCode: 'ur', gender: 'Female', friendlyName: 'Gul' },
  { shortName: 'ar-SA-HamedNeural', locale: 'ar-SA', localeName: 'Arabic (Saudi Arabia)', languageCode: 'ar', gender: 'Male', friendlyName: 'Hamed' },
  { shortName: 'ar-SA-ZariyahNeural', locale: 'ar-SA', localeName: 'Arabic (Saudi Arabia)', languageCode: 'ar', gender: 'Female', friendlyName: 'Zariyah' },
  { shortName: 'ar-EG-SalmaNeural', locale: 'ar-EG', localeName: 'Arabic (Egypt)', languageCode: 'ar', gender: 'Female', friendlyName: 'Salma' },
  { shortName: 'ja-JP-KeitaNeural', locale: 'ja-JP', localeName: 'Japanese (Japan)', languageCode: 'ja', gender: 'Male', friendlyName: 'Keita' },
  { shortName: 'ja-JP-NanamiNeural', locale: 'ja-JP', localeName: 'Japanese (Japan)', languageCode: 'ja', gender: 'Female', friendlyName: 'Nanami' },
  { shortName: 'es-ES-AlvaroNeural', locale: 'es-ES', localeName: 'Spanish (Spain)', languageCode: 'es', gender: 'Male', friendlyName: 'Alvaro' },
  { shortName: 'es-ES-ElviraNeural', locale: 'es-ES', localeName: 'Spanish (Spain)', languageCode: 'es', gender: 'Female', friendlyName: 'Elvira' },
  { shortName: 'es-MX-DaliaNeural', locale: 'es-MX', localeName: 'Spanish (Mexico)', languageCode: 'es', gender: 'Female', friendlyName: 'Dalia' },
  { shortName: 'fr-FR-HenriNeural', locale: 'fr-FR', localeName: 'French (France)', languageCode: 'fr', gender: 'Male', friendlyName: 'Henri' },
  { shortName: 'fr-FR-DeniseNeural', locale: 'fr-FR', localeName: 'French (France)', languageCode: 'fr', gender: 'Female', friendlyName: 'Denise' },
  { shortName: 'de-DE-ConradNeural', locale: 'de-DE', localeName: 'German (Germany)', languageCode: 'de', gender: 'Male', friendlyName: 'Conrad' },
  { shortName: 'de-DE-KatjaNeural', locale: 'de-DE', localeName: 'German (Germany)', languageCode: 'de', gender: 'Female', friendlyName: 'Katja' },
  { shortName: 'pt-BR-AntonioNeural', locale: 'pt-BR', localeName: 'Portuguese (Brazil)', languageCode: 'pt', gender: 'Male', friendlyName: 'Antonio' },
  { shortName: 'pt-BR-FranciscaNeural', locale: 'pt-BR', localeName: 'Portuguese (Brazil)', languageCode: 'pt', gender: 'Female', friendlyName: 'Francisca' },
  { shortName: 'tr-TR-AhmetNeural', locale: 'tr-TR', localeName: 'Turkish (Turkey)', languageCode: 'tr', gender: 'Male', friendlyName: 'Ahmet' },
  { shortName: 'tr-TR-EmelNeural', locale: 'tr-TR', localeName: 'Turkish (Turkey)', languageCode: 'tr', gender: 'Female', friendlyName: 'Emel' },
  { shortName: 'id-ID-ArdiNeural', locale: 'id-ID', localeName: 'Indonesian (Indonesia)', languageCode: 'id', gender: 'Male', friendlyName: 'Ardi' },
  { shortName: 'id-ID-GadisNeural', locale: 'id-ID', localeName: 'Indonesian (Indonesia)', languageCode: 'id', gender: 'Female', friendlyName: 'Gadis' },
  { shortName: 'ko-KR-InJoonNeural', locale: 'ko-KR', localeName: 'Korean (Korea)', languageCode: 'ko', gender: 'Male', friendlyName: 'InJoon' },
  { shortName: 'ko-KR-SunHiNeural', locale: 'ko-KR', localeName: 'Korean (Korea)', languageCode: 'ko', gender: 'Female', friendlyName: 'SunHi' },
  { shortName: 'zh-CN-YunxiNeural', locale: 'zh-CN', localeName: 'Chinese (Mainland)', languageCode: 'zh', gender: 'Male', friendlyName: 'Yunxi' },
  { shortName: 'zh-CN-XiaoxiaoNeural', locale: 'zh-CN', localeName: 'Chinese (Mainland)', languageCode: 'zh', gender: 'Female', friendlyName: 'Xiaoxiao' },
  { shortName: 'ru-RU-DmitryNeural', locale: 'ru-RU', localeName: 'Russian (Russia)', languageCode: 'ru', gender: 'Male', friendlyName: 'Dmitry' },
  { shortName: 'ru-RU-SvetlanaNeural', locale: 'ru-RU', localeName: 'Russian (Russia)', languageCode: 'ru', gender: 'Female', friendlyName: 'Svetlana' },
  { shortName: 'bn-IN-BashkarNeural', locale: 'bn-IN', localeName: 'Bengali (India)', languageCode: 'bn', gender: 'Male', friendlyName: 'Bashkar' },
  { shortName: 'bn-BD-NabanitaNeural', locale: 'bn-BD', localeName: 'Bengali (Bangladesh)', languageCode: 'bn', gender: 'Female', friendlyName: 'Nabanita' },
  { shortName: 'ta-IN-ValluvarNeural', locale: 'ta-IN', localeName: 'Tamil (India)', languageCode: 'ta', gender: 'Male', friendlyName: 'Valluvar' },
  { shortName: 'ta-IN-PallaviNeural', locale: 'ta-IN', localeName: 'Tamil (India)', languageCode: 'ta', gender: 'Female', friendlyName: 'Pallavi' },
];

let cachedEdgeVoices: { voices: EdgeVoiceEntry[]; fetchedAt: number } | null = null;

function formatFriendlyVoiceName(shortName: string, rawFriendly?: string): string {
  const shortParts = shortName.split('-');
  const voiceSlug = (shortParts.slice(2).join(' ') || shortName).replace(/Neural$/i, '');
  if (rawFriendly && !rawFriendly.includes('Online')) {
    return rawFriendly;
  }
  return voiceSlug.replace(/Multilingual/i, ' Multilingual').trim();
}

export async function getEdgeVoiceCatalog(): Promise<EdgeVoiceEntry[]> {
  const now = Date.now();
  if (cachedEdgeVoices && now - cachedEdgeVoices.fetchedAt < 6 * 60 * 60 * 1000) {
    return cachedEdgeVoices.voices;
  }

  let localeDisplay: Intl.DisplayNames | null = null;
  try {
    localeDisplay = new Intl.DisplayNames(['en'], { type: 'language' });
  } catch {
    localeDisplay = null;
  }

  try {
    const tts = new MsEdgeTTS({ connectionTimeoutMs: 8000 });
    const rawList = await tts.getVoices();
    if (Array.isArray(rawList) && rawList.length > 0) {
      const normalized: EdgeVoiceEntry[] = rawList
        .filter((v) => v && v.ShortName && v.Locale)
        .map((v) => {
          const locale = String(v.Locale).trim();
          const languageCode = locale.split('-')[0].toLowerCase();
          let localeName = locale;
          try {
            localeName = (localeDisplay?.of(locale) as string) || locale;
          } catch {
            localeName = locale;
          }
          const g = String(v.Gender || 'Neutral').toLowerCase();
          const gender: EdgeVoiceEntry['gender'] =
            g === 'female' ? 'Female' : g === 'male' ? 'Male' : 'Neutral';
          return {
            shortName: String(v.ShortName).trim(),
            locale,
            localeName,
            languageCode,
            gender,
            friendlyName: formatFriendlyVoiceName(String(v.ShortName), v.FriendlyName),
          };
        })
        .sort((a, b) => a.localeName.localeCompare(b.localeName) || a.friendlyName.localeCompare(b.friendlyName));

      if (normalized.length > 20) {
        cachedEdgeVoices = { voices: normalized, fetchedAt: now };
        return normalized;
      }
    }
  } catch (err) {
    console.warn('[getEdgeVoiceCatalog] Falling back to static multilingual catalog:', err instanceof Error ? err.message : err);
  }

  return FALLBACK_EDGE_VOICES;
}

const VALID_GESTURES = [
  'rest', 'open-palms', 'point-up', 'point-camera', 'empathy-chest', 'sweep',
  'stop', 'chop', 'steeple', 'count-1', 'count-2', 'count-3', 'size-wide',
  'size-small', 'precision-pinch', 'thinking', 'wave', 'salute-2', 'open-5',
  'point-right', 'thumbs-up', 'thumbs-down', 'rock-on', 'ily-horns', 'finger-gun',
  'offering-palm', 'point-down-left', 'point-left', 'l-frame', 'plucked-ok',
];

const VALID_EMOTIONS = ['neutral', 'warm', 'empathetic', 'shocked', 'focused', 'curious', 'confident'];

export function resolveRhubarbBinary(): string | null {
  // Windows: the shipped repo also contains the Linux ELF named "rhubarb" —
  // prefer the native executable first so we never exec a foreign binary.
  if (process.platform === 'win32') {
    const localExe = path.resolve(process.cwd(), 'tools', 'rhubarb', 'rhubarb.exe');
    if (fs.existsSync(localExe)) return localExe;
  }
  const localPath = path.resolve(process.cwd(), 'tools', 'rhubarb', 'rhubarb');
  if (fs.existsSync(localPath)) {
    if (process.platform !== 'win32') {
      try {
        fs.accessSync(localPath, fs.constants.X_OK);
      } catch {
        try {
          fs.chmodSync(localPath, 0o755);
        } catch {
          // Ignore chmod permission errors on read-only mounts
        }
      }
    }
    return localPath;
  }
  const pathDirs = (process.env.PATH || '').split(path.delimiter);
  const rhubarbNames = process.platform === 'win32' ? ['rhubarb.exe', 'rhubarb'] : ['rhubarb'];
  for (const dir of pathDirs) {
    for (const name of rhubarbNames) {
      const candidate = path.join(dir, name);
      try {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
      } catch {
        // inaccessible dir — skip
      }
    }
  }
  return null;
}

export function resolveFfmpegBinary(): string {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }
  const pathDirs = (process.env.PATH || '').split(path.delimiter);
  const binNames = process.platform === 'win32' ? ['ffmpeg.exe', 'ffmpeg'] : ['ffmpeg'];
  for (const dir of pathDirs) {
    for (const bin of binNames) {
      const candidate = path.join(dir, bin);
      // only accept actual files, not directories like C:\WINDOWS\system32\ffmpeg
      try {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
      } catch {
        /* inaccessible dir — skip */
      }
    }
  }
  return 'ffmpeg';
}

export function resolveExportsRoot(): string {
  const raw = (process.env.EXPORT_DIR || './exports').trim();
  return path.resolve(process.cwd(), raw);
}

export function sanitizeProjectSlug(name?: string): string {
  const clean = (name || 'toon-saz-project')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return clean || 'toon-saz-project';
}

export function getConfiguredHfTokenCount(): number {
  return [process.env.HF_TOKEN, process.env.HF_TOKEN_2, process.env.HF_TOKEN_FALLBACK]
    .map((t) => (t || '').trim())
    .filter(Boolean).length;
}

export async function getEngineCapabilities(): Promise<EngineCapabilities> {
  const rhubarbPath = resolveRhubarbBinary();
  let rhubarbVersion: string | null = null;
  if (rhubarbPath) {
    try {
      const { stdout } = await execFileAsync(rhubarbPath, ['--version'], { timeout: 5000 });
      rhubarbVersion = stdout.trim();
    } catch {
      rhubarbVersion = null;
    }
  }

  const ffmpegPath = resolveFfmpegBinary();
  let ffmpegVersion: string | null = null;
  try {
    const { stdout } = await execFileAsync(ffmpegPath, ['-version'], { timeout: 5000 });
    ffmpegVersion = stdout.split(/\r?\n/)[0]?.trim() || 'ffmpeg';
  } catch {
    ffmpegVersion = null;
  }

  let pythonVersion: string | null = null;
  try {
    const { stdout } = await execFileAsync(resolvePythonBinary(), ['--version'], { timeout: 5000 });
    pythonVersion = stdout.trim();
  } catch {
    pythonVersion = null;
  }

  const scriptsDir = path.resolve(process.cwd(), 'scripts');
  const scripts = fs.existsSync(scriptsDir)
    ? fs.readdirSync(scriptsDir).filter((f) => f.endsWith('.py'))
    : [];

  const exportDir = resolveExportsRoot();
  fs.mkdirSync(exportDir, { recursive: true });

  return {
    rhubarb: { installed: Boolean(rhubarbPath && rhubarbVersion), version: rhubarbVersion, path: rhubarbPath },
    ffmpeg: { installed: Boolean(ffmpegVersion), version: ffmpegVersion, path: ffmpegPath },
    edgeTts: { installed: true, engine: 'msedge-tts (All Global Edge Neural Voices + Emotion Prosody)' },
    python: { installed: Boolean(pythonVersion), version: pythonVersion, scripts },
    geminiConfigured: Boolean((process.env.GEMINI_API_KEY || '').trim()),
    openrouterConfigured: Boolean((process.env.OPENROUTER_API_KEY || '').trim()),
    hfTokensConfigured: getConfiguredHfTokenCount(),
    exportDir,
  };
}

export function stripDirectorTags(text: string): string {
  return text.replace(/\[[^\]]+\]\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

export function detectScriptLanguageServer(rawText: string): SupportedLanguageCode {
  const clean = stripDirectorTags(rawText);
  if (!clean) return 'en';
  if (/[\u0900-\u097F]/.test(clean)) return 'hi';
  if (/[\u0980-\u09FF]/.test(clean)) return 'bn';
  if (/[\u0B80-\u0BFF]/.test(clean)) return 'ta';
  if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(clean)) return 'ko';
  if (/[\u3040-\u30FF]/.test(clean)) return 'ja';
  if (/[\u4E00-\u9FAF]/.test(clean)) return 'zh';
  if (/[\u0400-\u04FF]/.test(clean)) return 'ru';
  if (/[ٹڈڑںےہھپچژگک]/.test(clean)) return 'ur';
  if (/[\u0600-\u06FF]/.test(clean)) return 'ar';
  if (/[¿¡ñ]|(\b(hola|buenos|gracias|como|para|porque|primero|segundo)\b)/i.test(clean)) return 'es';
  if (/[çğışöü]/i.test(clean) && /\b(merhaba|teşekkür|nasıl|evet|hayır|bir|için)\b/i.test(clean)) return 'tr';
  if (/\b(bonjour|merci|avec|pour|cette|sont|nous|vous|salut)\b/i.test(clean)) return 'fr';
  if (/[äöß]|(\b(hallo|danke|nicht|und|ich|sie|warum|heute)\b)/i.test(clean)) return 'de';
  if (/[ãõ]|(\b(olá|obrigado|você|não|como|porque|tudo|bem)\b)/i.test(clean)) return 'pt';
  if (/\b(halo|selamat|terima|kasih|tidak|dengan|untuk|kami|anda)\b/i.test(clean)) return 'id';
  if (/\b(assalam|assalamualaikum|dosto|aap|hamare|kaise|kyun|ab|hai|hain|shukriya|batao)\b/i.test(clean)) {
    return 'ur';
  }
  if (/\b(namaste|namaskar|aaj|hum|dekhte|samjhte|kyunki|bahut)\b/i.test(clean)) {
    return 'hi';
  }
  return 'en';
}

export function splitIntoPhrases(text: string): string[] {
  const clean = stripDirectorTags(text);
  if (!clean) return [];
  const rawParts = clean.split(/([.?!;।؟。！？\n]+)/);
  const phrases: string[] = [];
  let current = '';
  for (const part of rawParts) {
    current += part;
    if (/[.?!;।؟。！？\n]/.test(part)) {
      const cleaned = current.trim();
      if (cleaned) phrases.push(cleaned);
      current = '';
    }
  }
  if (current.trim()) {
    phrases.push(current.trim());
  }
  return phrases.filter(Boolean);
}

/**
 * Splits a tagged script into spoken clauses paired with the active emotion & gesture tag
 * so Edge TTS dynamically modulates pitch and speaking cadence per emotion.
 */
export function splitIntoTaggedPhrases(text: string): TaggedPhrase[] {
  const blocks = (text || '')
    .split(/(?=\[)|(?<=[.?!;।؟。！？\n])\s+/)
    .map((b) => b.trim())
    .filter(Boolean);

  const output: TaggedPhrase[] = [];
  let currentEmotion = 'neutral';
  let currentGesture: string | undefined;

  for (const block of blocks) {
    const tagMatch = block.match(/^\[([^\]]+)\]\s*([\s\S]*)$/);
    let spoken = block;
    if (tagMatch) {
      const parts = tagMatch[1].split('|').map((p) => p.trim().toLowerCase());
      if (parts[0] && VALID_GESTURES.includes(parts[0])) {
        currentGesture = parts[0];
      }
      if (parts[1] && VALID_EMOTIONS.includes(parts[1])) {
        currentEmotion = parts[1];
      } else if (parts[0] && VALID_EMOTIONS.includes(parts[0])) {
        currentEmotion = parts[0];
      }
      spoken = tagMatch[2];
    }

    const cleanedSpoken = stripDirectorTags(spoken);
    if (!cleanedSpoken) continue;

    // Split long multi-sentence sections while inheriting active emotion
    const subSentences = splitIntoPhrases(cleanedSpoken);
    for (const s of subSentences) {
      output.push({
        text: s,
        emotion: currentEmotion,
        gesture: currentGesture,
      });
    }
  }

  return output;
}

function splitSentenceByCadenceServer(sentence: string): string[] {
  const commaParts = sentence
    .split(/(?<=[,;:])\s+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  for (const part of commaParts) {
    const words = part.split(/\s+/).filter(Boolean);
    if (words.length <= 8) {
      chunks.push(part);
      continue;
    }
    // Strict 3 to 4 second cadence rule (~6-8 words per gesture beat)
    const maxChunkWords = 8;
    for (let i = 0; i < words.length; i += maxChunkWords) {
      chunks.push(words.slice(i, i + maxChunkWords).join(' '));
    }
  }
  return chunks.length > 0 ? chunks : [sentence];
}

function classifyClauseTagServer(clause: string, idx: number): { gesture: string; emotion: string } {
  const lower = clause.toLowerCase();
  // Wave only when an explicit greeting is detected
  if (
    /\b(hello|hi|hey|welcome|assalam|assalamualaikum|salam|salaam|namaste|namaskar|bonjour|hallo|hola|merhaba|halo)\b/.test(lower) ||
    /(مرحبا|السلام|नमस्ते|नमस्कार|سلام|こんにちは|你好|안녕|привет)/.test(lower)
  ) {
    return { gesture: 'wave', emotion: 'warm' };
  }
  // High-speed / intense rotation / rapid movement
  if (
    /\b(girar|giro|rotaci[oó]n|spin|spinning|rotat|velocidad|speed|rapid[ií]sima|rapid|fast|300|km|hora)\b/.test(lower) ||
    /(سرعة|तेज|دوران)/.test(lower)
  ) {
    return { gesture: 'size-wide', emotion: 'shocked' };
  }
  // Danger / warning / caution / worst / halt
  if (
    /\b(stop|halt|wait|caution|warning|danger|peligro|peligroso|riesgo|peor|ruko|roko|alto|detente|arrête|stopp|dur|berhenti)\b/.test(lower) ||
    /(خطر|توقف|रुकें|चेतावनी|待って)/.test(lower)
  ) {
    return { gesture: 'stop', emotion: 'shocked' };
  }
  // Questions / curiosity / speculation / think / skydiving hook
  if (
    /[?؟？]/.test(clause) ||
    /\b(why|how|think|wonder|question|creen|creer|skydiving|kyun|kyon|kaise|kya|socho|sawal|porque|cómo|pourquoi|comment|warum|neden|kenapa)\b/.test(lower) ||
    /(لماذا|كيف|क्यों|कैसे|सोच|なぜ|왜|почему)/.test(lower)
  ) {
    return { gesture: 'thinking', emotion: 'curious' };
  }
  // Difficult / complex / precision / orientation struggle
  if (
    /\b(dif[ií]cil|difficult|hard|extremo|extremadamente|orientar|perder|exact|detail|precise|bareek|mushkil)\b/.test(lower) ||
    /(صعب|मुश्किल|कठिन)/.test(lower)
  ) {
    return { gesture: 'precision-pinch', emotion: 'focused' };
  }
  // Solution / recovery / control / opening parachute / confidence
  if (
    /\b(control|recuperar|abrir|paraca[ií]das|parachute|tiempo|time|soluci[oó]n|solution|safe|salvar|agree|yes|great|thanks|thank|shukriya|dhanyavaad|gracias|merci|danke|teşekkür|obrigado)\b/.test(lower) ||
    /(شكرا|धन्यवाद|हल|नियंत्रण)/.test(lower)
  ) {
    return { gesture: 'thumbs-up', emotion: 'confident' };
  }
  if (/\b(first|one|1|pehla|pehle|primero|premièrement|erstens|birinci|pertama)\b/.test(lower) || /(أولا|पहला|まず)/.test(lower)) {
    return { gesture: 'count-1', emotion: 'focused' };
  }
  if (/\b(second|next|two|2|doosra|dusra|segundo|deuxième|zweitens|ikinci|kedua)\b/.test(lower) || /(ثانيا|दूसरा|次)/.test(lower)) {
    return { gesture: 'count-2', emotion: 'focused' };
  }
  if (/\b(third|three|3|finally|lastly|teesra|tercero|troisième|drittens|üçüncü|ketiga)\b/.test(lower) || /(ثالثا|तीसरा|最後)/.test(lower)) {
    return { gesture: 'count-3', emotion: 'confident' };
  }
  if (
    /\b(together|we|feel|care|empathy|heart|love|dil|pyaar|dosto|doston|saath|juntos|madre|mama|baby)\b/.test(lower) ||
    /(معا|हम|साथ|دِل|دوست|دوستو)/.test(lower)
  ) {
    return { gesture: 'empathy-chest', emotion: 'empathetic' };
  }
  if (/\b(system|structure|important|must|zaroori|lazmi|ahm|importante|wichtig|önemli|penting)\b/.test(lower) || /(مهم|महत्वपूर्ण|重要)/.test(lower)) {
    return { gesture: 'steeple', emotion: 'confident' };
  }
  if (/\b(look|see|up|dekh|dekho|mira|regardez|schau|lihat|bak)\b/.test(lower) || /(انظر|देखें|見て)/.test(lower)) {
    return { gesture: 'point-up', emotion: 'confident' };
  }
  if (/\b(you|your|aap|tum|usted|vous|du|sie|sen|anda|kamu)\b/.test(lower) || /(أنت|आप|あなた)/.test(lower)) {
    return { gesture: 'point-camera', emotion: 'warm' };
  }
  if (/\b(wide|massive|huge|bada|bahut|enorme|gross|büyük|besar)\b/.test(lower) || /(كبير|बहुत|大きい)/.test(lower)) {
    return { gesture: 'size-wide', emotion: 'shocked' };
  }
  if (/\b(small|tiny|precise|chota|chhota|bareek|pequeño|petit|klein|küçük|kecil)\b/.test(lower) || /(صغير|छोटा|小さい)/.test(lower)) {
    return { gesture: 'precision-pinch', emotion: 'focused' };
  }
  const fallbacks = [
    { gesture: 'open-palms', emotion: 'warm' },
    { gesture: 'steeple', emotion: 'confident' },
    { gesture: 'sweep', emotion: 'focused' },
    { gesture: 'chop', emotion: 'confident' },
    { gesture: 'precision-pinch', emotion: 'focused' },
    { gesture: 'empathy-chest', emotion: 'empathetic' },
  ];
  return fallbacks[idx % fallbacks.length];
}

function offlineMultilingualDirect(rawScript: string): string {
  const cleanText = stripDirectorTags(rawScript);
  const sentences = cleanText
    .split(/(?<=[.?!।؟。！？])\s*/)
    .map((s) => s.trim())
    .filter(Boolean);

  const clauses = sentences.flatMap(splitSentenceByCadenceServer);
  const altGestures = ['open-palms', 'steeple', 'sweep', 'point-camera', 'chop', 'empathy-chest'];
  const altEmotions = ['warm', 'confident', 'focused', 'curious', 'empathetic'];

  let prevGesture: string | null = null;
  let prevEmotion: string | null = null;

  return clauses
    .map((clause, idx) => {
      let { gesture, emotion } = classifyClauseTagServer(clause, idx);
      if (prevGesture && gesture === prevGesture) {
        gesture = altGestures.find((g) => g !== prevGesture) || 'open-palms';
      }
      if (prevEmotion && emotion === prevEmotion && idx > 0) {
        emotion = altEmotions.find((e) => e !== prevEmotion) || 'confident';
      }
      prevGesture = gesture;
      prevEmotion = emotion;
      return `[${gesture}|${emotion}] ${clause}`;
    })
    .join(' ');
}

export async function analyzeScriptWithDirector(params: {
  text: string;
  targetLanguage?: string;
  convertRomanized?: boolean;
  provider?: 'auto' | 'offline' | 'gemini' | 'openrouter' | 'openai' | 'anthropic' | 'custom';
  model?: string;
  apiKey?: string;
  baseUrl?: string;
}): Promise<{
  taggedScript: string;
  detectedLanguage: SupportedLanguageCode;
  recommendedVoice: string;
  recommendedRecognizer: RhubarbRecognizer;
  intonationNotes: string;
  usedGemini: boolean;
  usedProvider: 'gemini' | 'openrouter' | 'openai' | 'anthropic' | 'custom' | 'offline';
  usedModel: string;
}> {
  let workingText = (params.text || '').trim();
  const explicitLang =
    params.targetLanguage && params.targetLanguage !== 'auto'
      ? params.targetLanguage.split('-')[0].toLowerCase()
      : null;

  // Apply zero-key offline Hinglish/Roman-Urdu/Urdu -> Devanagari conversion first when requested
  if (params.convertRomanized && workingText) {
    const analysis = analyzeScriptConversion(workingText);
    if (analysis.needsConversion) {
      workingText = toDevanagari(workingText);
    }
  }

  const detectedLanguage = explicitLang || detectScriptLanguageServer(workingText);
  const recommendedVoice = RECOMMENDED_VOICE_BY_LANG[detectedLanguage] || 'en-US-AndrewMultilingualNeural';
  const recommendedRecognizer: RhubarbRecognizer = detectedLanguage === 'en' ? 'pocketSphinx' : 'phonetic';
  const requestedProvider = params.provider || 'auto';
  const requestedModel = (params.model || '').trim();

  const buildIntonationTip = (lang: SupportedLanguageCode, scriptText: string) => {
    const clean = stripDirectorTags(scriptText);
    const hasLatin = /[A-Za-z]/.test(clean);
    if ((lang === 'ur' || lang === 'hi' || lang === 'ar') && hasLatin && !/[\u0600-\u06FF\u0900-\u097F]/.test(clean)) {
      return `Tip: Use native script (or click Convert to Devanagari) so ${lang.toUpperCase()} Edge Neural reads authentic stress & vowel contours.`;
    }
    return `Auto-configured ${recommendedVoice} with ${recommendedRecognizer} Rhubarb analyzer, 1-5s gesture cadence, and emotion prosody.`;
  };

  const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
  const openrouterKey = (process.env.OPENROUTER_API_KEY || '').trim();

  if (!workingText) {
    return {
      taggedScript: '',
      detectedLanguage,
      recommendedVoice,
      recommendedRecognizer,
      intonationNotes: 'Enter script text to direct gestures and emotions.',
      usedGemini: false,
      usedProvider: 'offline',
      usedModel: 'offline-multilingual-rules',
    };
  }

  const shouldTryGemini =
    requestedProvider === 'gemini' || (requestedProvider === 'auto' && Boolean(geminiKey));
  const shouldTryOpenRouter =
    requestedProvider === 'openrouter' || (requestedProvider === 'auto' && Boolean(openrouterKey));

  if (shouldTryGemini && geminiKey) {
    const geminiModel = requestedModel && !requestedModel.includes('/') ? requestedModel : 'gemini-2.5-flash';
    try {
      const ai = new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const conversionRule = params.convertRomanized
        ? `If the text is Romanized Urdu, Hindi, Arabic, or Japanese written in Latin letters, transliterate the spoken words into natural native script matching targetLanguage='${detectedLanguage}' so neural TTS pronounces every vowel naturally.`
        : 'Keep the user words in their original script verbatim without translating or altering meanings.';

      const response = await ai.models.generateContent({
        model: geminiModel,
        contents: `Analyze this presenter voiceover script and insert expressive directing keyframes [gesture|emotion] every 1-5 seconds at natural clause boundaries without repeating the same tag twice in a row.\nScript:\n${workingText}`,
        config: {
          systemInstruction:
            `You are Persona Studio's multilingual animation director. Any global language is supported (en, hi, ur, ar, ja, es, fr, de, pt, tr, id, ko, zh, ru, etc.). ` +
            `${conversionRule} Allowed gestures: ${VALID_GESTURES.join(', ')}. Allowed emotions: ${VALID_EMOTIONS.join(', ')}. ` +
            `Insert [gesture|emotion] inline before clauses (e.g. "[wave|warm] Hello! [steeple|confident] Let us begin."). Return strict JSON matching the schema.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              taggedScript: {
                type: Type.STRING,
                description: 'Full script annotated inline with [gesture|emotion] tags before clauses.',
              },
              detectedLanguage: {
                type: Type.STRING,
                description: 'ISO 639-1 two-letter language code such as en, hi, ur, ar, ja, es, fr, de, pt, tr, ko, zh, ru.',
              },
              intonationNotes: {
                type: Type.STRING,
                description: 'Brief note on vocal intonation & language pacing.',
              },
            },
            required: ['taggedScript', 'detectedLanguage', 'intonationNotes'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        taggedScript?: string;
        detectedLanguage?: string;
        intonationNotes?: string;
      };

      const langOut = (parsed.detectedLanguage || detectedLanguage).split('-')[0].toLowerCase();
      const taggedOut = (parsed.taggedScript || '').trim() || offlineMultilingualDirect(workingText);

      return {
        taggedScript: taggedOut,
        detectedLanguage: langOut,
        recommendedVoice: RECOMMENDED_VOICE_BY_LANG[langOut] || recommendedVoice,
        recommendedRecognizer: langOut === 'en' ? 'pocketSphinx' : 'phonetic',
        intonationNotes: (parsed.intonationNotes || '').trim() || buildIntonationTip(langOut, taggedOut),
        usedGemini: true,
        usedProvider: 'gemini',
        usedModel: geminiModel,
      };
    } catch (err) {
      console.warn('[analyzeScriptWithDirector] Gemini fallback:', err instanceof Error ? err.message : err);
    }
  }

  if (shouldTryOpenRouter && openrouterKey) {
    const orModel = requestedModel || (process.env.OPENROUTER_MODEL || 'openrouter/free').trim();
    try {
      const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openrouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Persona Studio',
        },
        body: JSON.stringify({
          model: orModel,
          temperature: 0.35,
          messages: [
            {
              role: 'system',
              content:
                `You are Persona Studio's multilingual animation director. Insert inline [gesture|emotion] tags before clauses every 1-5s with zero adjacent duplicate tags. Allowed gestures: ${VALID_GESTURES.join(', ')}. Allowed emotions: ${VALID_EMOTIONS.join(', ')}. Return ONLY valid JSON: {"taggedScript":"...","detectedLanguage":"en","intonationNotes":"..."}.`,
            },
            {
              role: 'user',
              content: `Script (targetLanguage=${detectedLanguage}):\n${workingText}`,
            },
          ],
        }),
      });
      if (resp.ok) {
        const json = (await resp.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const rawContent = json.choices?.[0]?.message?.content || '';
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as {
            taggedScript?: string;
            detectedLanguage?: string;
            intonationNotes?: string;
          };
          const langOut = (parsed.detectedLanguage || detectedLanguage).split('-')[0].toLowerCase();
          const taggedOut = (parsed.taggedScript || '').trim() || offlineMultilingualDirect(workingText);
          return {
            taggedScript: taggedOut,
            detectedLanguage: langOut,
            recommendedVoice: RECOMMENDED_VOICE_BY_LANG[langOut] || recommendedVoice,
            recommendedRecognizer: langOut === 'en' ? 'pocketSphinx' : 'phonetic',
            intonationNotes: (parsed.intonationNotes || '').trim() || buildIntonationTip(langOut, taggedOut),
            usedGemini: false,
            usedProvider: 'openrouter',
            usedModel: orModel,
          };
        }
      }
    } catch (err) {
      console.warn('[analyzeScriptWithDirector] OpenRouter fallback:', err instanceof Error ? err.message : err);
    }
  }

  // 3. OpenAI Chat Completions
  const openaiKey = (params.apiKey || process.env.OPENAI_API_KEY || '').trim();
  if (requestedProvider === 'openai' && openaiKey) {
    const openaiModel = requestedModel || 'gpt-4o-mini';
    try {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: openaiModel,
          temperature: 0.35,
          messages: [
            {
              role: 'system',
              content:
                `You are ccavatarstudio's multilingual animation director. Insert inline [gesture|emotion] tags before clauses every 1-5s with zero adjacent duplicate tags. Allowed gestures: ${VALID_GESTURES.join(', ')}. Allowed emotions: ${VALID_EMOTIONS.join(', ')}. Return ONLY valid JSON: {"taggedScript":"...","detectedLanguage":"en","intonationNotes":"..."}.`,
            },
            {
              role: 'user',
              content: `Script (targetLanguage=${detectedLanguage}):\n${workingText}`,
            },
          ],
        }),
      });
      if (resp.ok) {
        const json = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const rawContent = json.choices?.[0]?.message?.content || '';
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as {
            taggedScript?: string;
            detectedLanguage?: string;
            intonationNotes?: string;
          };
          const langOut = (parsed.detectedLanguage || detectedLanguage).split('-')[0].toLowerCase();
          const taggedOut = (parsed.taggedScript || '').trim() || offlineMultilingualDirect(workingText);
          return {
            taggedScript: taggedOut,
            detectedLanguage: langOut,
            recommendedVoice: RECOMMENDED_VOICE_BY_LANG[langOut] || recommendedVoice,
            recommendedRecognizer: langOut === 'en' ? 'pocketSphinx' : 'phonetic',
            intonationNotes: (parsed.intonationNotes || '').trim() || buildIntonationTip(langOut, taggedOut),
            usedGemini: false,
            usedProvider: 'openai',
            usedModel: openaiModel,
          };
        }
      }
    } catch (err) {
      console.warn('[analyzeScriptWithDirector] OpenAI fallback:', err instanceof Error ? err.message : err);
    }
  }

  // 4. Anthropic Messages API
  const anthropicKey = (params.apiKey || process.env.ANTHROPIC_API_KEY || '').trim();
  if (requestedProvider === 'anthropic' && anthropicKey) {
    const claudeModel = requestedModel || 'claude-3-5-sonnet-latest';
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: claudeModel,
          max_tokens: 2048,
          system: `You are ccavatarstudio's multilingual animation director. Insert inline [gesture|emotion] tags before clauses every 1-5s with zero adjacent duplicate tags. Allowed gestures: ${VALID_GESTURES.join(', ')}. Allowed emotions: ${VALID_EMOTIONS.join(', ')}. Return ONLY valid JSON: {"taggedScript":"...","detectedLanguage":"en","intonationNotes":"..."}.`,
          messages: [
            {
              role: 'user',
              content: `Script (targetLanguage=${detectedLanguage}):\n${workingText}`,
            },
          ],
        }),
      });
      if (resp.ok) {
        const json = (await resp.json()) as { content?: Array<{ text?: string }> };
        const rawContent = json.content?.[0]?.text || '';
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as {
            taggedScript?: string;
            detectedLanguage?: string;
            intonationNotes?: string;
          };
          const langOut = (parsed.detectedLanguage || detectedLanguage).split('-')[0].toLowerCase();
          const taggedOut = (parsed.taggedScript || '').trim() || offlineMultilingualDirect(workingText);
          return {
            taggedScript: taggedOut,
            detectedLanguage: langOut,
            recommendedVoice: RECOMMENDED_VOICE_BY_LANG[langOut] || recommendedVoice,
            recommendedRecognizer: langOut === 'en' ? 'pocketSphinx' : 'phonetic',
            intonationNotes: (parsed.intonationNotes || '').trim() || buildIntonationTip(langOut, taggedOut),
            usedGemini: false,
            usedProvider: 'anthropic',
            usedModel: claudeModel,
          };
        }
      }
    } catch (err) {
      console.warn('[analyzeScriptWithDirector] Anthropic fallback:', err instanceof Error ? err.message : err);
    }
  }

  // 5. Custom OpenAI-compatible Endpoint (Ollama, vLLM, LocalAI, LMStudio)
  if (requestedProvider === 'custom') {
    const customBase = (params.baseUrl || process.env.CUSTOM_LLM_BASE_URL || 'http://localhost:11434/v1').replace(/\/$/, '');
    const customKey = (params.apiKey || process.env.CUSTOM_LLM_API_KEY || '').trim();
    const customModel = requestedModel || (process.env.CUSTOM_LLM_MODEL || 'llama3.2:latest').trim();
    const endpointUrl = customBase.endsWith('/chat/completions') ? customBase : `${customBase}/chat/completions`;
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customKey) {
        headers['Authorization'] = customKey.startsWith('Bearer ') ? customKey : `Bearer ${customKey}`;
      }
      const resp = await fetch(endpointUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: customModel,
          temperature: 0.35,
          messages: [
            {
              role: 'system',
              content:
                `You are ccavatarstudio's multilingual animation director. Insert inline [gesture|emotion] tags before clauses every 1-5s with zero adjacent duplicate tags. Allowed gestures: ${VALID_GESTURES.join(', ')}. Allowed emotions: ${VALID_EMOTIONS.join(', ')}. Return ONLY valid JSON: {"taggedScript":"...","detectedLanguage":"en","intonationNotes":"..."}.`,
            },
            {
              role: 'user',
              content: `Script (targetLanguage=${detectedLanguage}):\n${workingText}`,
            },
          ],
        }),
      });
      if (resp.ok) {
        const json = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const rawContent = json.choices?.[0]?.message?.content || '';
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as {
            taggedScript?: string;
            detectedLanguage?: string;
            intonationNotes?: string;
          };
          const langOut = (parsed.detectedLanguage || detectedLanguage).split('-')[0].toLowerCase();
          const taggedOut = (parsed.taggedScript || '').trim() || offlineMultilingualDirect(workingText);
          return {
            taggedScript: taggedOut,
            detectedLanguage: langOut,
            recommendedVoice: RECOMMENDED_VOICE_BY_LANG[langOut] || recommendedVoice,
            recommendedRecognizer: langOut === 'en' ? 'pocketSphinx' : 'phonetic',
            intonationNotes: (parsed.intonationNotes || '').trim() || buildIntonationTip(langOut, taggedOut),
            usedGemini: false,
            usedProvider: 'custom',
            usedModel: customModel,
          };
        }
      }
    } catch (err) {
      console.warn('[analyzeScriptWithDirector] Custom endpoint fallback:', err instanceof Error ? err.message : err);
    }
  }

  const directed = offlineMultilingualDirect(workingText);
  const fallbackPrefix =
    requestedProvider === 'gemini' && !geminiKey
      ? 'GEMINI_API_KEY not configured; fell back to Offline Engine. '
      : requestedProvider === 'openrouter' && !openrouterKey
      ? 'OPENROUTER_API_KEY not configured; fell back to Offline Engine. '
      : '';
  return {
    taggedScript: directed,
    detectedLanguage,
    recommendedVoice,
    recommendedRecognizer,
    intonationNotes: `${fallbackPrefix}${buildIntonationTip(detectedLanguage, directed)}`,
    usedGemini: false,
    usedProvider: 'offline',
    usedModel: 'offline-multilingual-rules',
  };
}

export function parseWavHeader(buf: Buffer): WavHeaderInfo {
  if (buf.length < 44 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('Invalid RIFF/WAVE header');
  }
  let offset = 12;
  let sampleRate = 24000;
  let numChannels = 1;
  let bitsPerSample = 16;
  let dataOffset = 44;
  let dataSize = buf.length - 44;

  while (offset + 8 <= buf.length) {
    const chunkId = buf.toString('ascii', offset, offset + 4);
    const chunkSize = buf.readUInt32LE(offset + 4);
    if (chunkId === 'fmt ') {
      numChannels = buf.readUInt16LE(offset + 10);
      sampleRate = buf.readUInt32LE(offset + 12);
      bitsPerSample = buf.readUInt16LE(offset + 22);
    } else if (chunkId === 'data') {
      dataOffset = offset + 8;
      dataSize = Math.min(chunkSize, buf.length - dataOffset);
      break;
    }
    offset += 8 + chunkSize + (chunkSize % 2);
  }

  const byteRate = Math.max(1, sampleRate * numChannels * (bitsPerSample / 8));
  return {
    sampleRate,
    numChannels,
    bitsPerSample,
    dataOffset,
    dataSize,
    durationSec: dataSize / byteRate,
  };
}

export function trimPcmWavSilence(
  wavBuf: Buffer,
  thresholdAmplitude: number = 320,
  padMs: number = 25
): { pcmData: Buffer; trimmedStartSec: number; durationSec: number; sampleRate: number } {
  const info = parseWavHeader(wavBuf);
  const rawPcm = wavBuf.subarray(info.dataOffset, info.dataOffset + info.dataSize);
  const totalSamples = Math.floor(rawPcm.length / 2);
  if (totalSamples === 0) {
    return { pcmData: rawPcm, trimmedStartSec: 0, durationSec: 0, sampleRate: info.sampleRate };
  }

  let firstLoud = -1;
  let lastLoud = -1;
  for (let i = 0; i < totalSamples; i++) {
    const sample = Math.abs(rawPcm.readInt16LE(i * 2));
    if (sample >= thresholdAmplitude) {
      if (firstLoud === -1) firstLoud = i;
      lastLoud = i;
    }
  }

  if (firstLoud === -1 || lastLoud === -1) {
    return {
      pcmData: rawPcm,
      trimmedStartSec: 0,
      durationSec: totalSamples / info.sampleRate,
      sampleRate: info.sampleRate,
    };
  }

  const padSamples = Math.round((padMs / 1000) * info.sampleRate);
  const startSample = Math.max(0, firstLoud - padSamples);
  const endSample = Math.min(totalSamples - 1, lastLoud + padSamples);
  const sliced = rawPcm.subarray(startSample * 2, (endSample + 1) * 2);

  return {
    pcmData: sliced,
    trimmedStartSec: startSample / info.sampleRate,
    durationSec: (endSample - startSample + 1) / info.sampleRate,
    sampleRate: info.sampleRate,
  };
}

export function buildMonoWavFromPcmSegments(
  segments: Buffer[],
  sampleRate: number = 24000,
  pauseGapSec: number = 0.25
): { wavBuffer: Buffer; segmentStartOffsetsSec: number[]; totalDurationSec: number } {
  const clampedPause = Math.max(0.02, Math.min(0.4, pauseGapSec));
  const pauseSamples = Math.round(sampleRate * clampedPause);
  const silenceBuf = Buffer.alloc(pauseSamples * 2);

  const chunks: Buffer[] = [];
  const segmentStartOffsetsSec: number[] = [];
  let sampleCursor = 0;

  for (let i = 0; i < segments.length; i++) {
    segmentStartOffsetsSec.push(sampleCursor / sampleRate);
    chunks.push(segments[i]);
    sampleCursor += Math.floor(segments[i].length / 2);
    if (i < segments.length - 1) {
      chunks.push(silenceBuf);
      sampleCursor += pauseSamples;
    }
  }

  const pcmTotal = Buffer.concat(chunks);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcmTotal.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcmTotal.length, 40);

  return {
    wavBuffer: Buffer.concat([header, pcmTotal]),
    segmentStartOffsetsSec,
    totalDurationSec: sampleCursor / sampleRate,
  };
}

export async function convertAudioToWavFile(
  inputPath: string,
  outputWavPath: string,
  sampleRate: number = 24000
): Promise<void> {
  const ffmpeg = resolveFfmpegBinary();
  await execFileAsync(
    ffmpeg,
    ['-y', '-i', inputPath, '-ar', String(sampleRate), '-ac', '1', '-c:a', 'pcm_s16le', outputWavPath],
    { timeout: 30000 }
  );
}

export async function extractAudioFromVideoToWav(
  videoPath: string,
  outputWavPath: string,
  sampleRate: number = 24000
): Promise<void> {
  const ffmpeg = resolveFfmpegBinary();
  try {
    await execFileAsync(
      ffmpeg,
      [
        '-y',
        '-i',
        videoPath,
        '-map',
        '0:a:0',
        '-vn',
        '-ar',
        String(sampleRate),
        '-ac',
        '1',
        '-c:a',
        'pcm_s16le',
        outputWavPath,
      ],
      { timeout: 60000, maxBuffer: 10 * 1024 * 1024 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Stream map') || msg.includes('matches no streams') || msg.includes('does not contain any stream')) {
      throw new Error('Uploaded video does not contain an audio stream to extract.');
    }
    throw new Error(`FFmpeg could not extract audio from video: ${msg}`);
  }
}

function resolvePythonBinary(): string {
  if (process.env.PYTHON_PATH && fs.existsSync(process.env.PYTHON_PATH)) {
    return process.env.PYTHON_PATH;
  }
  // On Windows the launcher is "python", not "python3"
  return process.platform === 'win32' ? 'python' : 'python3';
}

export async function transcribeAudioWithFasterWhisper(
  wavPath: string,
  language: string = 'auto',
  modelSize: string = 'base'
): Promise<{
  text: string;
  language: string;
  duration: number | null;
  words: WordTiming[];
  wordLines: string;
}> {
  const scriptPath = path.resolve(process.cwd(), 'scripts', 'transcribe_audio.py');
  if (!fs.existsSync(scriptPath)) {
    throw new Error('scripts/transcribe_audio.py not found.');
  }
  const langArg = language && language !== 'auto' ? language.split('-')[0].toLowerCase() : 'auto';
  const outputPath = `${wavPath}.transcript.json`;
  try {
    // transcribe_audio.py writes JSON to --output file (model selected via AVATAR_WHISPER_MODEL env)
    await execFileAsync(
      resolvePythonBinary(),
      [scriptPath, '--audio', wavPath, '--output', outputPath, '--language', langArg],
      { timeout: 120000, maxBuffer: 10 * 1024 * 1024, env: { ...process.env, AVATAR_WHISPER_MODEL: modelSize } }
    );
    const parsed = JSON.parse(fs.readFileSync(outputPath, 'utf8')) as {
      text?: string;
      language?: string;
      duration?: number | null;
      words?: Array<{ word: string; start: number; end: number }>;
      wordLines?: string[];
    };
    const words: WordTiming[] = Array.isArray(parsed.words)
      ? parsed.words.map((w) => ({ start: Number(w.start), end: Number(w.end), word: String(w.word) }))
      : [];
    const wordLines = Array.isArray(parsed.wordLines)
      ? parsed.wordLines.join('\n')
      : words.map((w) => `[${w.start.toFixed(2)}s -> ${w.end.toFixed(2)}s] ${w.word}`).join('\n');
    return {
      text: String(parsed.text || '').trim(),
      language: String(parsed.language || langArg),
      duration: typeof parsed.duration === 'number' ? parsed.duration : null,
      words,
      wordLines,
    };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(
      detail.includes('faster-whisper')
        ? detail
        : `Faster-Whisper local transcription unavailable (install on PC via: pip install faster-whisper). Details: ${detail}`
    );
  }
}

export async function runRhubarbCliOnWav(
  wavPath: string,
  options: { dialogText?: string; recognizer?: RhubarbRecognizer } = {}
): Promise<{
  mouthCues: RhubarbMouthCue[];
  duration: number;
  recognizerUsed: RhubarbRecognizer;
  rhubarbJson: string;
}> {
  const rhubarb = resolveRhubarbBinary();
  if (!rhubarb) {
    throw new Error('Rhubarb Lip-Sync CLI binary not found on server.');
  }

  const detectedLang = options.dialogText ? detectScriptLanguageServer(options.dialogText) : 'en';
  // Force phonetic for non-English languages because PocketSphinx dictionary is English-only
  const requestedRecognizer: RhubarbRecognizer =
    detectedLang !== 'en' ? 'phonetic' : options.recognizer || 'phonetic';

  const tempDialogPath =
    requestedRecognizer === 'pocketSphinx' && options.dialogText?.trim() ? `${wavPath}.dialog.txt` : null;

  if (tempDialogPath && options.dialogText) {
    await fsp.writeFile(tempDialogPath, stripDirectorTags(options.dialogText), 'utf8');
  }

  const runOnce = async (rec: RhubarbRecognizer) => {
    const args = ['-f', 'json', '-r', rec];
    if (tempDialogPath && rec === 'pocketSphinx') {
      args.push('-d', tempDialogPath);
    }
    args.push(wavPath);

    const { stdout } = await execFileAsync(rhubarb, args, {
      timeout: 60000,
      maxBuffer: 10 * 1024 * 1024,
    });
    const parsed = JSON.parse(stdout) as {
      metadata?: { duration?: number };
      mouthCues?: Array<{ start: number; end: number; value: string }>;
    };
    const cues: RhubarbMouthCue[] = Array.isArray(parsed.mouthCues)
      ? parsed.mouthCues.map((c) => ({
          start: Number(c.start),
          end: Number(c.end),
          value: String(c.value).toUpperCase(),
        }))
      : [];
    return {
      mouthCues: cues,
      duration: Number(parsed.metadata?.duration || cues[cues.length - 1]?.end || 0),
      recognizerUsed: rec,
      rhubarbJson: JSON.stringify(parsed, null, 2),
    };
  };

  try {
    try {
      return await runOnce(requestedRecognizer);
    } catch (err) {
      if (requestedRecognizer === 'pocketSphinx') {
        return await runOnce('phonetic');
      }
      throw err;
    }
  } finally {
    if (tempDialogPath && fs.existsSync(tempDialogPath)) {
      await fsp.unlink(tempDialogPath).catch(() => {});
    }
  }
}

function combineRatePercent(baseRateStr: string | undefined, deltaPct: number): string {
  const match = (baseRateStr || '+0%').match(/([+-]?\d+)/);
  const baseVal = match ? parseInt(match[1], 10) : 0;
  const total = Math.max(-45, Math.min(60, baseVal + deltaPct));
  return `${total >= 0 ? '+' : ''}${total}%`;
}

/**
 * Word-gated speech sync:
 * Acoustic Rhubarb outputs continuous visemes (B, F, A) even across silence pauses and breaths.
 * This function compares Rhubarb cues against ground-truth spoken word intervals [w.start, w.end].
 * Any cue period outside spoken word windows (gap >= 0.08s, or before first word, or after last word)
 * is clamped to 'X' (rest/silence). Adjacent identical cues are coalesced.
 */
export function gateRhubarbCuesWithWords(
  cues: RhubarbMouthCue[],
  words: WordTiming[],
  options?: { leadInSec?: number; trailOutSec?: number; minSilenceGapSec?: number }
): RhubarbMouthCue[] {
  if (!words || words.length === 0 || !cues || cues.length === 0) {
    return cues;
  }

  const leadIn = options?.leadInSec ?? 0.03;
  const trailOut = options?.trailOutSec ?? 0.04;
  const minGap = options?.minSilenceGapSec ?? 0.08;

  const firstWordStart = Math.max(0, words[0].start - leadIn);
  const lastWordEnd = words[words.length - 1].end + trailOut;

  const silenceIntervals: Array<{ start: number; end: number }> = [];
  if (firstWordStart > 0.04) {
    silenceIntervals.push({ start: 0, end: Number(firstWordStart.toFixed(3)) });
  }

  for (let i = 0; i < words.length - 1; i++) {
    const gStart = words[i].end + trailOut;
    const gEnd = words[i + 1].start - leadIn;
    if (gEnd - gStart >= minGap) {
      silenceIntervals.push({
        start: Number(gStart.toFixed(3)),
        end: Number(gEnd.toFixed(3)),
      });
    }
  }

  silenceIntervals.push({
    start: Number(lastWordEnd.toFixed(3)),
    end: 999999,
  });

  const isSilent = (t: number): boolean => {
    for (const si of silenceIntervals) {
      if (t >= si.start && t < si.end) return true;
    }
    return false;
  };

  const timePoints = new Set<number>();
  for (const c of cues) {
    timePoints.add(Number(c.start.toFixed(3)));
    timePoints.add(Number(c.end.toFixed(3)));
  }
  for (const si of silenceIntervals) {
    if (si.end < 900000) {
      timePoints.add(Number(si.start.toFixed(3)));
      timePoints.add(Number(si.end.toFixed(3)));
    }
  }

  const sortedTimes = Array.from(timePoints).sort((a, b) => a - b);
  const refined: RhubarbMouthCue[] = [];

  for (let i = 0; i < sortedTimes.length - 1; i++) {
    const t1 = sortedTimes[i];
    const t2 = sortedTimes[i + 1];
    if (t2 - t1 < 0.01) continue;
    const mid = (t1 + t2) / 2;

    if (isSilent(mid)) {
      refined.push({ start: t1, end: t2, value: 'X' });
    } else {
      let val = 'X';
      for (const c of cues) {
        if (mid >= c.start && mid <= c.end) {
          val = c.value;
          break;
        }
      }
      refined.push({ start: t1, end: t2, value: val });
    }
  }

  const coalesced: RhubarbMouthCue[] = [];
  for (const c of refined) {
    if (coalesced.length === 0) {
      coalesced.push({ ...c });
    } else {
      const prev = coalesced[coalesced.length - 1];
      if (prev.value === c.value) {
        prev.end = c.end;
      } else {
        coalesced.push({ ...c });
      }
    }
  }

  return coalesced;
}

export async function synthesizeEdgeTtsWithRhubarb(params: {
  text: string;
  voice: string;
  pauseGapSec?: number;
  rate?: string;
  recognizer?: RhubarbRecognizer;
}): Promise<{
  wavBuffer: Buffer;
  duration: number;
  phraseCount: number;
  mouthCues: RhubarbMouthCue[];
  rhubarbJson: string;
  wordTimings: WordTiming[];
  whisperWordLines: string;
  recognizerUsed: RhubarbRecognizer;
  segmentTimings: Array<{ start: number; end: number; emotion: string; gesture?: string; text: string }>;
}> {
  const taggedPhrases = splitIntoTaggedPhrases(params.text);
  if (taggedPhrases.length === 0) {
    throw new Error('No spoken text found after removing directing tags.');
  }

  const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'toonsaz-edge-'));
  try {
    const trimmedPcmSegments: Buffer[] = [];
    const phraseWordsList: WordTiming[][] = [];
    const phraseTrimStarts: number[] = [];
    const phraseDurations: number[] = [];

    const tts = new MsEdgeTTS({ connectionTimeoutMs: 12000, synthesisTimeoutMs: 45000 });
    await tts.setMetadata(params.voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, {
      wordBoundaryEnabled: true,
      sentenceBoundaryEnabled: false,
    });

    const synthesizeSingle = async (phrase: TaggedPhrase, usePitch: boolean) => {
      const prosody = EMOTION_PROSODY_MAP[phrase.emotion] || EMOTION_PROSODY_MAP.neutral;
      const rate = combineRatePercent(params.rate, prosody.rateDelta);
      const { audioStream, metadataStream } = tts.toStream(
        phrase.text,
        usePitch ? { rate, pitch: prosody.pitch } : { rate }
      );

      const phraseWords: WordTiming[] = [];
      if (metadataStream) {
        metadataStream.on('data', (chunk: Buffer) => {
          try {
            const parsed = JSON.parse(chunk.toString('utf8'));
            const items = Array.isArray(parsed?.Metadata) ? parsed.Metadata : [];
            for (const item of items) {
              if (item?.Type === 'WordBoundary' && item?.Data) {
                const startSec = Number(item.Data.Offset || 0) / 10_000_000;
                const durSec = Math.max(0.06, Number(item.Data.Duration || 0) / 10_000_000);
                const w = String(item.Data.text?.Text || '').trim();
                if (w) {
                  phraseWords.push({ start: startSec, end: startSec + durSec, word: w });
                }
              }
            }
          } catch {
            // Ignore partial/non-json frames
          }
        });
      }

      const audioChunks: Buffer[] = [];
      for await (const chunk of audioStream) {
        audioChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return { mp3Buf: Buffer.concat(audioChunks), phraseWords };
    };

    for (let i = 0; i < taggedPhrases.length; i++) {
      const phrase = taggedPhrases[i];
      let out: { mp3Buf: Buffer; phraseWords: WordTiming[] };
      try {
        out = await synthesizeSingle(phrase, true);
      } catch {
        out = await synthesizeSingle(phrase, false);
      }
      if (out.mp3Buf.length === 0) {
        out = await synthesizeSingle(phrase, false);
      }
      if (out.mp3Buf.length === 0) {
        throw new Error(`Edge TTS returned empty audio for phrase ${i + 1}`);
      }

      const mp3Path = path.join(tempDir, `p_${i}.mp3`);
      const wavPath = path.join(tempDir, `p_${i}.wav`);
      await fsp.writeFile(mp3Path, out.mp3Buf);
      await convertAudioToWavFile(mp3Path, wavPath, 24000);

      const rawWavBuf = await fsp.readFile(wavPath);
      const trimmed = trimPcmWavSilence(rawWavBuf, 320, 22);
      trimmedPcmSegments.push(trimmed.pcmData);
      phraseTrimStarts.push(trimmed.trimmedStartSec);
      phraseDurations.push(trimmed.durationSec);
      phraseWordsList.push(out.phraseWords);
    }

    const { wavBuffer, segmentStartOffsetsSec, totalDurationSec } = buildMonoWavFromPcmSegments(
      trimmedPcmSegments,
      24000,
      params.pauseGapSec ?? 0.25
    );

    const masterWavPath = path.join(tempDir, 'master_edge.wav');
    await fsp.writeFile(masterWavPath, wavBuffer);

    const wordTimings: WordTiming[] = [];
    const segmentTimings: Array<{ start: number; end: number; emotion: string; gesture?: string; text: string }> = [];

    for (let i = 0; i < taggedPhrases.length; i++) {
      const segStart = Number(segmentStartOffsetsSec[i].toFixed(2));
      const segEnd = Number((segmentStartOffsetsSec[i] + phraseDurations[i]).toFixed(2));
      segmentTimings.push({
        start: segStart,
        end: segEnd,
        emotion: taggedPhrases[i].emotion,
        gesture: taggedPhrases[i].gesture,
        text: taggedPhrases[i].text,
      });

      const baseOffset = segmentStartOffsetsSec[i] - phraseTrimStarts[i];
      for (const w of phraseWordsList[i]) {
        const s = Math.max(segmentStartOffsetsSec[i], Number((w.start + baseOffset).toFixed(2)));
        const e = Math.max(s + 0.05, Number((w.end + baseOffset).toFixed(2)));
        wordTimings.push({ start: s, end: e, word: w.word });
      }
    }

    const whisperWordLines = wordTimings
      .map((w) => `[${w.start.toFixed(2)}s -> ${w.end.toFixed(2)}s] ${w.word}`)
      .join('\n');

    const isEnglishVoice = params.voice.toLowerCase().startsWith('en-');
    const rhubarbResult = await runRhubarbCliOnWav(masterWavPath, {
      dialogText: stripDirectorTags(params.text),
      recognizer: isEnglishVoice ? params.recognizer || 'phonetic' : 'phonetic',
    });

    const gatedCues = gateRhubarbCuesWithWords(rhubarbResult.mouthCues, wordTimings);

    return {
      wavBuffer,
      duration: Math.max(totalDurationSec, rhubarbResult.duration),
      phraseCount: taggedPhrases.length,
      mouthCues: gatedCues,
      rhubarbJson: JSON.stringify({ metadata: { duration: rhubarbResult.duration }, mouthCues: gatedCues }, null, 2),
      wordTimings,
      whisperWordLines,
      recognizerUsed: rhubarbResult.recognizerUsed,
      segmentTimings,
    };
  } finally {
    await fsp.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function renderMp4FromFrames(params: {
  framesDir: string;
  outputMp4Path: string;
  fps: number;
  audioPath?: string | null;
}): Promise<void> {
  const ffmpeg = resolveFfmpegBinary();
  const framePattern = path.join(params.framesDir, 'frame_%05d.jpg');
  const args: string[] = [
    '-y',
    '-framerate',
    String(Math.max(12, Math.min(60, params.fps || 24))),
    '-i',
    framePattern,
  ];

  if (params.audioPath && fs.existsSync(params.audioPath)) {
    args.push('-i', params.audioPath);
  }

  args.push(
    '-vf',
    'scale=trunc(iw/2)*2:trunc(ih/2)*2',
    '-c:v',
    'libx264',
    '-preset',
    'fast',
    '-crf',
    '19',
    '-pix_fmt',
    'yuv420p'
  );

  if (params.audioPath && fs.existsSync(params.audioPath)) {
    args.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
  }

  args.push('-movflags', '+faststart', params.outputMp4Path);

  await execFileAsync(ffmpeg, args, { timeout: 180000, maxBuffer: 10 * 1024 * 1024 });
}

export async function renderWebmAlphaFromFrames(params: {
  framesDir: string;
  outputWebmPath: string;
  fps: number;
  audioPath?: string | null;
}): Promise<void> {
  const ffmpeg = resolveFfmpegBinary();
  const framePattern = path.join(params.framesDir, 'frame_%05d.png');
  const args: string[] = [
    '-y',
    '-framerate',
    String(Math.max(12, Math.min(60, params.fps || 24))),
    '-i',
    framePattern,
  ];

  if (params.audioPath && fs.existsSync(params.audioPath)) {
    args.push('-i', params.audioPath);
  }

  args.push(
    '-c:v',
    'libvpx-vp9',
    '-pix_fmt',
    'yuva420p',
    '-b:v',
    '2M',
    '-crf',
    '24',
    '-auto-alt-ref',
    '0'
  );

  if (params.audioPath && fs.existsSync(params.audioPath)) {
    args.push('-c:a', 'libopus', '-b:a', '160k', '-shortest');
  }

  args.push(params.outputWebmPath);

  await execFileAsync(ffmpeg, args, { timeout: 240000, maxBuffer: 10 * 1024 * 1024 });
}

export async function saveToExportsDir(
  sourcePathOrBuffer: string | Buffer,
  projectName: string,
  filename: string
): Promise<SavedExportRecord> {
  const root = resolveExportsRoot();
  const slug = sanitizeProjectSlug(projectName);
  const projectDir = path.join(root, slug);
  await fsp.mkdir(projectDir, { recursive: true });

  const safeName = path.basename(filename);
  const destPath = path.join(projectDir, safeName);
  if (Buffer.isBuffer(sourcePathOrBuffer)) {
    await fsp.writeFile(destPath, sourcePathOrBuffer);
  } else {
    await fsp.copyFile(sourcePathOrBuffer, destPath);
  }

  const stat = await fsp.stat(destPath);
  const ext = path.extname(safeName).replace('.', '').toLowerCase();
  const format = (['mp4', 'wav', 'png', 'webm', 'json'].includes(ext) ? ext : 'mp4') as SavedExportRecord['format'];

  return {
    id: `${slug}_${safeName}`,
    projectSlug: slug,
    projectName: projectName || slug,
    filename: safeName,
    format,
    sizeBytes: stat.size,
    url: `/api/exports/${encodeURIComponent(slug)}/${encodeURIComponent(safeName)}`,
    savedPath: path.relative(process.cwd(), destPath),
    createdAt: new Date(stat.mtimeMs).toISOString(),
  };
}

export async function listSavedExports(): Promise<SavedExportRecord[]> {
  const root = resolveExportsRoot();
  if (!fs.existsSync(root)) return [];

  const records: SavedExportRecord[] = [];
  const entries = await fsp.readdir(root, { withFileTypes: true });
  for (const dirEnt of entries) {
    if (!dirEnt.isDirectory()) continue;
    const slug = dirEnt.name;
    const subDir = path.join(root, slug);
    const files = await fsp.readdir(subDir, { withFileTypes: true });
    for (const f of files) {
      if (!f.isFile()) continue;
      const ext = path.extname(f.name).replace('.', '').toLowerCase();
      if (!['mp4', 'wav', 'png', 'webm', 'json'].includes(ext)) continue;
      const fullPath = path.join(subDir, f.name);
      const stat = await fsp.stat(fullPath);
      records.push({
        id: `${slug}_${f.name}`,
        projectSlug: slug,
        projectName: slug.replace(/-/g, ' '),
        filename: f.name,
        format: ext as SavedExportRecord['format'],
        sizeBytes: stat.size,
        url: `/api/exports/${encodeURIComponent(slug)}/${encodeURIComponent(f.name)}`,
        savedPath: path.relative(process.cwd(), fullPath),
        createdAt: new Date(stat.mtimeMs).toISOString(),
      });
    }
  }

  return records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 60);
}
