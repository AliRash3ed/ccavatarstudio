/**
 * Script Parsing, Auto-Directing, and Genuine Rhubarb Lip-Sync + Faster-Whisper Alignment
 */

import { EmotionPreset, HandGesture, MouthSprite, TimelineCue } from '../types/character';

export type RhubarbCode = 'X' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';

export interface RhubarbCue {
  start: number;
  end: number;
  value: RhubarbCode;
  mouth: MouthSprite;
  word?: string;
}

export interface VisemeEvent {
  time: number;
  endTime: number;
  viseme: MouthSprite;
  rhubarb: RhubarbCode;
}

export interface ScriptWordCue {
  text: string;
  cleanWord: string;
  startTime: number;
  duration: number;
  gesture?: HandGesture;
  emotion?: EmotionPreset;
  visemes: Array<{ time: number; viseme: MouthSprite; rhubarb?: RhubarbCode }>;
}

export interface DirectingTag {
  gesture?: HandGesture;
  emotion?: EmotionPreset;
}

const GESTURE_SYNONYMS: Record<string, HandGesture> = {
  rest: 'rest',
  steeple: 'steeple',
  'open-palms': 'open-palms',
  open: 'open-palms',
  explain: 'open-palms',
  'point-up': 'point-up',
  point: 'point-camera',
  'point-camera': 'point-camera',
  'empathy-chest': 'empathy-chest',
  empathy: 'empathy-chest',
  chest: 'empathy-chest',
  sweep: 'sweep',
  'narrative-sweep': 'sweep',
  stop: 'stop',
  chop: 'chop',
  'count-1': 'count-1',
  'count-2': 'count-2',
  'count-3': 'count-3',
  'size-wide': 'size-wide',
  'size-small': 'size-small',
  'precision-pinch': 'precision-pinch',
  pinch: 'precision-pinch',
  thinking: 'thinking',
  think: 'thinking',
  wave: 'wave',
  salute: 'salute-2',
  'salute-2': 'salute-2',
  'open-5': 'open-5',
  'point-right': 'point-right',
  'thumbs-up': 'thumbs-up',
  'thumbs-down': 'thumbs-down',
  rock: 'rock-on',
  'rock-on': 'rock-on',
  'ily-horns': 'ily-horns',
  'finger-gun': 'finger-gun',
  offering: 'offering-palm',
  'offering-palm': 'offering-palm',
  'point-down-left': 'point-down-left',
  'point-left': 'point-left',
  'l-frame': 'l-frame',
  'plucked-ok': 'plucked-ok',
  'plucked-pinch': 'plucked-pinch',
};

const EMOTION_SYNONYMS: Record<string, EmotionPreset> = {
  neutral: 'neutral',
  warm: 'warm',
  empathetic: 'empathetic',
  shocked: 'shocked',
  surprised: 'shocked',
  focused: 'focused',
  curious: 'curious',
  confident: 'confident',
  thoughtful: 'curious',
  friendly: 'warm',
  calm: 'neutral',
};

/**
 * Official Rhubarb Lip-Sync (A-H, X) -> Studio MouthSprite mapping
 * Ref: https://github.com/danielswolf/rhubarb-lip-sync
 */
export function rhubarbCodeToMouthSprite(code: RhubarbCode): MouthSprite {
  switch (code) {
    case 'X':
      return 'neutral';
    case 'A':
      return 'bmp'; // Closed lips (P, B, M, rest-close)
    case 'B':
      return 'grin'; // Slightly open / clenched teeth (K, S, T, D, N, R, Y, EE)
    case 'C':
      return 'aei'; // Open front vowels (EH, AE)
    case 'D':
      return 'ah'; // Wide open jaw (AA, AI, AY)
    case 'E':
      return 'talk-o'; // Slightly rounded vowels (AO, ER, OW)
    case 'F':
      return 'wq'; // Puckered rounded lips (UW, UH, W)
    case 'G':
      return 'fv'; // Upper teeth touching lower lip (F, V)
    case 'H':
      return 'l'; // Raised tongue behind upper teeth (L, TH)
  }
}

export function mouthSpriteToRhubarbCode(mouth: MouthSprite): RhubarbCode {
  switch (mouth) {
    case 'neutral':
      return 'X';
    case 'bmp':
    case 'smile':
      return 'A';
    case 'grin':
    case 'ee':
    case 'smirk':
      return 'B';
    case 'aei':
      return 'C';
    case 'ah':
    case 'laugh':
      return 'D';
    case 'o':
    case 'talk-o':
      return 'E';
    case 'u':
    case 'wq':
      return 'F';
    case 'fv':
      return 'G';
    case 'l':
    case 'th':
      return 'H';
  }
}

export function coalesceMouthCues(cues: RhubarbCue[], minFlutterSec: number = 0.042): RhubarbCue[] {
  if (!cues || cues.length === 0) return [];
  const merged: RhubarbCue[] = [];
  for (const cue of cues) {
    const start = Number(cue.start);
    const end = Number(cue.end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    const prev = merged[merged.length - 1];
    // Merge identical adjacent mouth shapes so React/SVG doesn't re-render redundantly
    if (prev && prev.value === cue.value && Math.abs(start - prev.end) <= 0.015) {
      prev.end = end;
      continue;
    }
    // Absorb sub-42ms micro-glitches between two identical neighbor visemes if already started
    if (prev && end - start < minFlutterSec && merged.length >= 2) {
      prev.end = end;
      continue;
    }
    merged.push({ ...cue, start, end });
  }
  return merged;
}

export function findMouthCueAtTime(cues: RhubarbCue[], t: number): RhubarbCue | undefined {
  if (!cues || cues.length === 0) return undefined;
  let lo = 0;
  let hi = cues.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const c = cues[mid];
    if (t < c.start) hi = mid - 1;
    else if (t > c.end) lo = mid + 1;
    else return c;
  }
  return undefined;
}

/**
 * Parses inline directing tags like [steeple|warm] or [wave|friendly]
 */
export function parseTag(tagContent: string): DirectingTag {
  const parts = tagContent.replace(/^\[|\]$/g, '').split('|');
  const res: DirectingTag = {};

  for (const part of parts) {
    const clean = part.trim().toLowerCase();
    if (GESTURE_SYNONYMS[clean]) {
      res.gesture = GESTURE_SYNONYMS[clean];
    } else if (EMOTION_SYNONYMS[clean]) {
      res.emotion = EMOTION_SYNONYMS[clean];
    }
  }

  return res;
}

interface PhonemeToken {
  viseme: MouthSprite;
  rhubarb: RhubarbCode;
  weight: number;
}

/**
 * Detects dominant script/language across global languages (EN, HI, UR, AR, JA, KO, ZH, ES, FR, DE, PT, RU, TR, ID, BN, TA).
 */
export function detectScriptLanguage(rawText: string): string {
  const clean = (rawText || '').replace(/\[[^\]]+\]\s*/g, ' ').trim();
  if (!clean) return 'en';
  if (/[\u0900-\u097F]/.test(clean)) return 'hi'; // Devanagari
  if (/[\u0980-\u09FF]/.test(clean)) return 'bn'; // Bengali
  if (/[\u0B80-\u0BFF]/.test(clean)) return 'ta'; // Tamil
  if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(clean)) return 'ko'; // Korean Hangul
  if (/[\u3040-\u30FF]/.test(clean)) return 'ja'; // Japanese Hiragana/Katakana
  if (/[\u4E00-\u9FAF]/.test(clean)) return 'zh'; // Chinese Hanzi (or Japanese Kanji without kana)
  if (/[\u0400-\u04FF]/.test(clean)) return 'ru'; // Cyrillic / Russian
  if (/[ٹڈڑںےہھپچژگک]/.test(clean)) return 'ur'; // Urdu Perso-Arabic
  if (/[\u0600-\u06FF]/.test(clean)) return 'ar'; // Arabic / Persian
  if (/[¿¡ñ]|(\b(hola|buenos|gracias|como|para|porque|primero|segundo)\b)/i.test(clean)) return 'es';
  if (/[çğışöü]/i.test(clean) && /\b(merhaba|teşekkür|nasıl|evet|hayır|bir|için)\b/i.test(clean)) return 'tr';
  if (/\b(bonjour|merci|avec|pour|cette|sont|nous|vous|salut)\b/i.test(clean)) return 'fr';
  if (/[äöß]|(\b(hallo|danke|nicht|und|ich|sie|warum|heute)\b)/i.test(clean)) return 'de';
  if (/[ãõ]|(\b(olá|obrigado|você|não|como|porque|tudo|bem)\b)/i.test(clean)) return 'pt';
  if (/\b(halo|selamat|terima|kasih|tidak|dengan|untuk|kami|anda)\b/i.test(clean)) return 'id';
  if (/\b(assalam|dosto|aap|hamare|kaise|kyun|ab|hai|hain|shukriya|batao)\b/i.test(clean)) return 'ur';
  if (/\b(namaste|namaskar|aaj|hum|dekhte|samjhte|kyunki|bahut)\b/i.test(clean)) return 'hi';
  return 'en';
}

function finalizePhonemeTokens(tokens: PhonemeToken[], wordLen: number = 5): PhonemeToken[] {
  if (tokens.length === 0) {
    return [{ viseme: 'aei', rhubarb: 'C', weight: 1 }];
  }

  const merged: PhonemeToken[] = [];
  for (const tok of tokens) {
    const prev = merged[merged.length - 1];
    if (prev && prev.viseme === tok.viseme) {
      prev.weight += tok.weight * 0.7;
    } else {
      merged.push({ ...tok });
    }
  }

  // Cartoon Syllabic Envelope:
  // Short words (<=2 letters): max 1-2 visemes
  // Medium words (3-6 letters): max 3 visemes (e.g. onset -> vowel -> coda)
  // Long words (>6 letters): max 4 visemes
  // Eliminates rapid letter-by-letter mouth fluttering while preserving clear lip-reading landmarks
  const maxTokens = wordLen <= 2 ? 2 : wordLen <= 6 ? 3 : 4;

  if (merged.length > maxTokens) {
    if (maxTokens === 2) {
      return [merged[0], merged[merged.length - 1]];
    }
    if (maxTokens === 3) {
      const mid = Math.floor(merged.length / 2);
      return [merged[0], merged[mid], merged[merged.length - 1]];
    }
    const step = merged.length / maxTokens;
    const sampled: PhonemeToken[] = [];
    for (let k = 0; k < maxTokens; k++) {
      sampled.push(merged[Math.floor(k * step)]);
    }
    return sampled;
  }

  return merged;
}

/**
 * Tokenizes Latin, European diacritics, Devanagari, Arabic/Urdu, Japanese Kana/Kanji,
 * Korean Hangul, and Cyrillic into smooth Rhubarb visemes.
 */
export function tokenizeWordToPhonemes(word: string): PhonemeToken[] {
  const raw = (word || '').trim();
  if (!raw) return [{ viseme: 'neutral', rhubarb: 'X', weight: 1 }];

  const hasNonLatin = /[\u0400-\u04FF\u0600-\u06FF\u0900-\u09FF\u0B80-\u0BFF\u3040-\u30FF\u4E00-\u9FAF\uAC00-\uD7AF]/.test(
    raw
  );
  if (hasNonLatin) {
    const tokens: PhonemeToken[] = [];
    for (const ch of raw) {
      // Devanagari (Hindi / Marathi / Nepali)
      if ('पफबभम'.includes(ch)) tokens.push({ viseme: 'bmp', rhubarb: 'A', weight: 0.95 });
      else if ('व'.includes(ch)) tokens.push({ viseme: 'fv', rhubarb: 'G', weight: 1.0 });
      else if ('उऊओऔुूोौ'.includes(ch)) tokens.push({ viseme: 'wq', rhubarb: 'F', weight: 1.25 });
      else if ('अआा'.includes(ch)) tokens.push({ viseme: 'ah', rhubarb: 'D', weight: 1.35 });
      else if ('इईएऐिीेै'.includes(ch)) tokens.push({ viseme: 'aei', rhubarb: 'C', weight: 1.2 });
      else if ('लनतदधनसजशष'.includes(ch)) tokens.push({ viseme: 'l', rhubarb: 'H', weight: 0.9 });
      else if (/[\u0900-\u09FF\u0B80-\u0BFF]/.test(ch)) tokens.push({ viseme: 'grin', rhubarb: 'B', weight: 0.85 });
      // Arabic / Urdu / Persian Script
      else if ('بپم'.includes(ch)) tokens.push({ viseme: 'bmp', rhubarb: 'A', weight: 0.95 });
      else if ('ف'.includes(ch)) tokens.push({ viseme: 'fv', rhubarb: 'G', weight: 1.0 });
      else if ('وؤ'.includes(ch)) tokens.push({ viseme: 'wq', rhubarb: 'F', weight: 1.25 });
      else if ('اآأإى'.includes(ch)) tokens.push({ viseme: 'ah', rhubarb: 'D', weight: 1.35 });
      else if ('يیئےے'.includes(ch)) tokens.push({ viseme: 'ee', rhubarb: 'B', weight: 1.2 });
      else if ('ل'.includes(ch)) tokens.push({ viseme: 'l', rhubarb: 'H', weight: 0.9 });
      else if ('هةہھ'.includes(ch)) tokens.push({ viseme: 'aei', rhubarb: 'C', weight: 1.0 });
      else if (/[\u0600-\u06FF]/.test(ch)) tokens.push({ viseme: 'grin', rhubarb: 'B', weight: 0.85 });
      // Cyrillic (Russian / Ukrainian)
      else if ('пбмПБМ'.includes(ch)) tokens.push({ viseme: 'bmp', rhubarb: 'A', weight: 0.95 });
      else if ('фвФВ'.includes(ch)) tokens.push({ viseme: 'fv', rhubarb: 'G', weight: 1.0 });
      else if ('оёОЁ'.includes(ch)) tokens.push({ viseme: 'talk-o', rhubarb: 'E', weight: 1.2 });
      else if ('уюУЮ'.includes(ch)) tokens.push({ viseme: 'wq', rhubarb: 'F', weight: 1.2 });
      else if ('аяАЯ'.includes(ch)) tokens.push({ viseme: 'ah', rhubarb: 'D', weight: 1.3 });
      else if ('еэиыЕЭИЫ'.includes(ch)) tokens.push({ viseme: 'aei', rhubarb: 'C', weight: 1.15 });
      else if ('лнЛН'.includes(ch)) tokens.push({ viseme: 'l', rhubarb: 'H', weight: 0.9 });
      else if (/[\u0400-\u04FF]/.test(ch)) tokens.push({ viseme: 'grin', rhubarb: 'B', weight: 0.85 });
      // Japanese Kana
      else if ('あかさたなはまやらわがざだばぱアカサタナハマヤラワガザダバパ'.includes(ch))
        tokens.push({ viseme: 'ah', rhubarb: 'D', weight: 1.3 });
      else if ('いきしちにひみりぎじぢびぴイキシチニヒミリギジヂビピ'.includes(ch))
        tokens.push({ viseme: 'ee', rhubarb: 'B', weight: 1.15 });
      else if ('うくすつぬふむゆるぐずづぶぷウクスツヌフムユルグズヅブプ'.includes(ch))
        tokens.push({ viseme: 'wq', rhubarb: 'F', weight: 1.2 });
      else if ('えけせてねへめれげぜでべぺエケセテネヘメレゲゼデベペ'.includes(ch))
        tokens.push({ viseme: 'aei', rhubarb: 'C', weight: 1.2 });
      else if ('おこそとのほもよろをごぞどぼぽオコソトノホモヨロヲゴゾドボポ'.includes(ch))
        tokens.push({ viseme: 'talk-o', rhubarb: 'E', weight: 1.25 });
      else if ('んン'.includes(ch)) tokens.push({ viseme: 'bmp', rhubarb: 'A', weight: 0.9 });
      else if (/[\u4E00-\u9FAF\uAC00-\uD7AF]/.test(ch)) {
        tokens.push({ viseme: 'aei', rhubarb: 'C', weight: 1.0 });
        tokens.push({ viseme: 'talk-o', rhubarb: 'E', weight: 0.9 });
      }
    }
    return finalizePhonemeTokens(tokens, raw.length);
  }

  // Normalize European diacritics (á -> a, ñ -> n, ç -> c, ß -> ss, ø -> o) cleanly
  const clean = raw
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  if (!clean) return [{ viseme: 'neutral', rhubarb: 'X', weight: 1 }];

  const tokens: PhonemeToken[] = [];
  let i = 0;

  while (i < clean.length) {
    const two = clean.slice(i, i + 2);
    const ch = clean[i];

    // Digraph clusters (2 characters)
    if (two === 'ph') {
      tokens.push({ viseme: 'fv', rhubarb: 'G', weight: 1.0 });
      i += 2;
      continue;
    }
    if (two === 'th' || two === 'dh') {
      tokens.push({ viseme: 'th', rhubarb: 'H', weight: 1.0 });
      i += 2;
      continue;
    }
    if (two === 'sh' || two === 'ch' || two === 'zh') {
      tokens.push({ viseme: 'wq', rhubarb: 'F', weight: 0.9 });
      i += 2;
      continue;
    }
    if (two === 'ee' || two === 'ea' || two === 'ie' || two === 'ey') {
      tokens.push({ viseme: 'ee', rhubarb: 'B', weight: 1.3 });
      i += 2;
      continue;
    }
    if (two === 'oo' || two === 'ou' || two === 'ow' || two === 'qu') {
      tokens.push({ viseme: 'wq', rhubarb: 'F', weight: 1.3 });
      i += 2;
      continue;
    }
    if (two === 'aa' || two === 'ah' || two === 'ar') {
      tokens.push({ viseme: 'ah', rhubarb: 'D', weight: 1.4 });
      i += 2;
      continue;
    }
    if (two === 'ai' || two === 'ay' || two === 'ei') {
      tokens.push({ viseme: 'aei', rhubarb: 'C', weight: 1.3 });
      i += 2;
      continue;
    }
    if (two === 'bh' || two === 'kh' || two === 'gh') {
      tokens.push({ viseme: ch === 'b' ? 'bmp' : 'aei', rhubarb: ch === 'b' ? 'A' : 'C', weight: 1.0 });
      i += 2;
      continue;
    }

    // Double consonants coalesce naturally
    if (i + 1 < clean.length && clean[i + 1] === ch && !'aeiou'.includes(ch)) {
      i += 1;
    }

    // Single character phoneme rules
    if (ch === 'b' || ch === 'm' || ch === 'p') {
      tokens.push({ viseme: 'bmp', rhubarb: 'A', weight: 0.9 });
    } else if (ch === 'f' || ch === 'v') {
      tokens.push({ viseme: 'fv', rhubarb: 'G', weight: 1.0 });
    } else if (ch === 'w' || ch === 'u' || ch === 'q') {
      tokens.push({ viseme: 'wq', rhubarb: 'F', weight: 1.15 });
    } else if (ch === 'o') {
      tokens.push({ viseme: 'talk-o', rhubarb: 'E', weight: 1.25 });
    } else if (ch === 'l') {
      tokens.push({ viseme: 'l', rhubarb: 'H', weight: 0.9 });
    } else if (ch === 'a') {
      tokens.push({ viseme: 'ah', rhubarb: 'D', weight: 1.3 });
    } else if (ch === 'e' || ch === 'i' || ch === 'y') {
      if (ch === 'e' && i === clean.length - 1 && clean.length > 3) {
        i += 1;
        continue;
      }
      tokens.push({ viseme: 'aei', rhubarb: 'C', weight: 1.15 });
    } else if ('szctdnkgjr'.includes(ch)) {
      tokens.push({ viseme: 'grin', rhubarb: 'B', weight: 0.75 });
    } else if (ch === 'h') {
      tokens.push({ viseme: 'aei', rhubarb: 'C', weight: 0.7 });
    }

    i += 1;
  }

  return finalizePhonemeTokens(tokens, clean.length);
}

/**
 * Maps any script words to smooth sub-word Rhubarb visemes across [startTime, startTime + duration].
 */
export function mapWordToVisemes(
  word: string,
  startTime: number,
  duration: number
): Array<{ time: number; viseme: MouthSprite; rhubarb: RhubarbCode }> {
  const tokens = tokenizeWordToPhonemes(word);
  const totalWeight = tokens.reduce((acc, t) => acc + t.weight, 0) || 1;
  const safeDuration = Math.max(0.12, duration);

  const visemes: Array<{ time: number; viseme: MouthSprite; rhubarb: RhubarbCode }> = [];
  let cursor = startTime;

  for (const tok of tokens) {
    const slice = (tok.weight / totalWeight) * safeDuration;
    // Enforce minimum hold of ~85ms to eliminate rapid cartoon micro-flutter
    if (visemes.length > 0 && cursor - visemes[visemes.length - 1].time < 0.085 && slice < 0.085) {
      cursor += slice;
      continue;
    }
    visemes.push({ time: cursor, viseme: tok.viseme, rhubarb: tok.rhubarb });
    cursor += slice;
  }

  return visemes.length > 0 ? visemes : [{ time: startTime, viseme: 'aei', rhubarb: 'C' }];
}

/**
 * Parses official Rhubarb Lip-Sync JSON, Rhubarb TSV, or Faster-Whisper (.txt / .json) into coalesced cues.
 */
export function parseAlignmentInput(input: string): {
  mode: 'rhubarb' | 'whisper' | 'none';
  cues: RhubarbCue[];
  wordCount: number;
} {
  const trimmed = (input || '').trim();
  if (!trimmed) return { mode: 'none', cues: [], wordCount: 0 };

  const validCodes = new Set<RhubarbCode>(['X', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);

  // 1. JSON format (Rhubarb mouthCues OR Faster-Whisper segments)
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const data = JSON.parse(trimmed);

      if (data && Array.isArray(data.mouthCues)) {
        const rawCues: RhubarbCue[] = data.mouthCues
          .filter(
            (c: any) =>
              typeof c.start === 'number' &&
              typeof c.end === 'number' &&
              validCodes.has(String(c.value).toUpperCase() as RhubarbCode)
          )
          .map((c: any) => {
            const val = String(c.value).toUpperCase() as RhubarbCode;
            return {
              start: Number(c.start),
              end: Number(c.end),
              value: val,
              mouth: rhubarbCodeToMouthSprite(val),
            };
          });
        return { mode: 'rhubarb', cues: coalesceMouthCues(rawCues), wordCount: rawCues.length };
      }

      const segs = Array.isArray(data) ? data : data?.segments || [];
      const cues: RhubarbCue[] = [];
      let wordCount = 0;

      for (const s of segs) {
        if (Array.isArray(s.words) && s.words.length > 0) {
          for (const wObj of s.words) {
            const w = String(wObj.word || wObj.text || '').trim();
            const st = Number(wObj.start);
            const en = Number(wObj.end);
            if (!w || isNaN(st) || isNaN(en)) continue;
            wordCount++;
            const subVis = mapWordToVisemes(w, st, Math.max(0.08, en - st));
            for (let k = 0; k < subVis.length; k++) {
              const vEnd = k + 1 < subVis.length ? subVis[k + 1].time : en;
              cues.push({
                start: subVis[k].time,
                end: vEnd,
                value: subVis[k].rhubarb,
                mouth: subVis[k].viseme,
                word: w,
              });
            }
          }
        } else {
          const wList = String(s.text || '').trim().split(/\s+/).filter(Boolean);
          if (!wList.length) continue;
          const sStart = Number(s.start) || 0;
          const sEnd = Number(s.end) || sStart + wList.length * 0.35;
          const step = Math.max(0.1, (sEnd - sStart) / wList.length);
          wList.forEach((w, idx) => {
            wordCount++;
            const st = sStart + idx * step;
            const en = st + step;
            const subVis = mapWordToVisemes(w, st, step);
            for (let k = 0; k < subVis.length; k++) {
              const vEnd = k + 1 < subVis.length ? subVis[k + 1].time : en;
              cues.push({
                start: subVis[k].time,
                end: vEnd,
                value: subVis[k].rhubarb,
                mouth: subVis[k].viseme,
                word: w,
              });
            }
          });
        }
      }

      if (cues.length > 0) {
        return { mode: 'whisper', cues: coalesceMouthCues(cues), wordCount };
      }
    } catch {
      // Fall through to text parsers
    }
  }

  // 2. Rhubarb TSV format: "0.00\t0.15\tB"
  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const tsvCues: RhubarbCue[] = [];
  let isTsv = true;

  for (const line of lines) {
    const m = line.match(/^([0-9]+(?:\.[0-9]+)?)\s+([0-9]+(?:\.[0-9]+)?)\s+([XABCDEFGHxabcdefgh])$/);
    if (m) {
      const code = m[3].toUpperCase() as RhubarbCode;
      tsvCues.push({
        start: parseFloat(m[1]),
        end: parseFloat(m[2]),
        value: code,
        mouth: rhubarbCodeToMouthSprite(code),
      });
    } else if (!line.startsWith('[')) {
      const mShort = line.match(/^([0-9]+(?:\.[0-9]+)?)\s+([XABCDEFGHxabcdefgh])$/);
      if (mShort) {
        const st = parseFloat(mShort[1]);
        const code = mShort[2].toUpperCase() as RhubarbCode;
        if (tsvCues.length > 0) {
          tsvCues[tsvCues.length - 1].end = st;
        }
        tsvCues.push({
          start: st,
          end: st + 0.12,
          value: code,
          mouth: rhubarbCodeToMouthSprite(code),
        });
      } else {
        isTsv = false;
        break;
      }
    } else {
      isTsv = false;
      break;
    }
  }

  if (isTsv && tsvCues.length > 0) {
    return { mode: 'rhubarb', cues: coalesceMouthCues(tsvCues), wordCount: tsvCues.length };
  }

  // 3. Faster-Whisper text format: "[0.00s -> 0.55s] Assalam-o-Alaikum!"
  const whisperCues: RhubarbCue[] = [];
  let whisperWordCount = 0;
  const regex = /\[\s*([0-9.]+)s?\s*->\s*([0-9.]+)s?\s*\]\s*(.+)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(trimmed)) !== null) {
    const st = parseFloat(match[1]);
    const en = parseFloat(match[2]);
    const segmentText = match[3].trim();
    if (isNaN(st) || isNaN(en) || !segmentText) continue;

    const wordsInLine = segmentText.split(/\s+/).filter(Boolean);
    const wordStep = Math.max(0.08, (en - st) / Math.max(1, wordsInLine.length));

    wordsInLine.forEach((w, idx) => {
      whisperWordCount++;
      const wStart = st + idx * wordStep;
      const wEnd = wStart + wordStep;
      const speechDur = Math.max(0.10, wordStep * 0.84);
      const subVis = mapWordToVisemes(w, wStart, speechDur);
      for (let k = 0; k < subVis.length; k++) {
        const vEnd = k + 1 < subVis.length ? subVis[k + 1].time : wStart + speechDur;
        whisperCues.push({
          start: subVis[k].time,
          end: vEnd,
          value: subVis[k].rhubarb,
          mouth: subVis[k].viseme,
          word: w,
        });
      }
      if (wEnd > wStart + speechDur + 0.015) {
        whisperCues.push({
          start: wStart + speechDur,
          end: wEnd,
          value: 'X',
          mouth: 'neutral',
          word: '',
        });
      }
    });
  }

  if (whisperCues.length > 0) {
    return { mode: 'whisper', cues: coalesceMouthCues(whisperCues), wordCount: whisperWordCount };
  }

  return { mode: 'none', cues: [], wordCount: 0 };
}

/**
 * Generates official Rhubarb Lip-Sync JSON format from compiled script cues.
 */
export function exportRhubarbJson(cues: RhubarbCue[], totalDuration: number): string {
  return JSON.stringify(
    {
      metadata: {
        soundFile: 'voiceover.wav',
        duration: Number(totalDuration.toFixed(2)),
      },
      mouthCues: cues.map((c) => ({
        start: Number(c.start.toFixed(2)),
        end: Number(c.end.toFixed(2)),
        value: c.value,
      })),
    },
    null,
    2
  );
}

/**
 * Split overly long sentences at phrase/conjunction boundaries (~6-8 words max)
 * so cues strictly maintain a natural 3-4s cadence without holding static poses too long.
 */
function splitSentenceByCadence(sentence: string): string[] {
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
    // Strict 3 to 4 second cadence rule (~6-8 spoken words per gesture beat)
    const maxChunkWords = 8;
    for (let i = 0; i < words.length; i += maxChunkWords) {
      chunks.push(words.slice(i, i + maxChunkWords).join(' '));
    }
  }
  return chunks.length > 0 ? chunks : [sentence];
}

function classifyClauseTag(clause: string, idx: number): { gesture: HandGesture; emotion: EmotionPreset } {
  const lower = clause.toLowerCase();

  // Wave only when an explicit greeting is detected
  if (
    /\b(hello|hi|hey|welcome|assalam|assalamualaikum|salam|salaam|namaste|namaskar|bonjour|hallo|hola|merhaba|halo)\b/.test(lower) ||
    /(مرحبا|السلام|नमस्ते|नमस्कार|سلام|こんにちは|你好|안녕|привет)/.test(lower)
  ) {
    return { gesture: 'wave', emotion: 'warm' };
  }
  // Step enumeration (first, second, third, etc.)
  if (/\b(first|one|1|step\s*1|pehla|pehle|primero|premièrement|erstens|birinci|pertama)\b/.test(lower) || /(أولا|पहला|まず)/.test(lower)) {
    return { gesture: 'count-1', emotion: 'focused' };
  }
  if (/\b(second|next|two|2|step\s*2|doosra|dusra|segundo|deuxième|zweitens|ikinci|kedua)\b/.test(lower) || /(ثانيا|दूसरा|次)/.test(lower)) {
    return { gesture: 'count-2', emotion: 'focused' };
  }
  if (/\b(third|three|3|finally|lastly|step\s*3|teesra|tercero|troisième|drittens|üçüncü|ketiga)\b/.test(lower) || /(ثالثا|तीसरा|最後)/.test(lower)) {
    return { gesture: 'count-3', emotion: 'confident' };
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
    /\b(control|recuperar|abrir|paraca[ií]das|parachute|tiempo|time|soluci[oó]n|solution|safe|salvar|agree|yes|great|excellent|thanks|shukriya|dhanyavaad|gracias)\b/.test(lower) ||
    /(شكرا|धन्यवाद|नियंत्रण)/.test(lower) ||
    /(?<=^|[\s.,!?।])हल(?=[\s.,!?।]|$)/.test(clause)
  ) {
    return { gesture: 'thumbs-up', emotion: 'confident' };
  }
  if (
    /\b(together|we|feel|care|empathy|heart|love|dil|pyar|pyaar|dosto|doston|saath|juntos|madre|mama|baby|bacha)\b/.test(lower) ||
    /(معا|हम|साथ|دِل|دوست|دوستو)/.test(lower)
  ) {
    return { gesture: 'empathy-chest', emotion: 'empathetic' };
  }
  if (/\b(system|structure|architecture|core|important|must|zaroor|zaroori|lazmi|ahm|importante|wichtig|önemli|penting)\b/.test(lower) || /(مهم|महत्वपूर्ण|重要)/.test(lower)) {
    return { gesture: 'steeple', emotion: 'confident' };
  }
  if (/\b(look|see|above|up|upper|upar|dekh|dekho|mira|arriba|regardez|schau|lihat|bak)\b/.test(lower) || /(انظر|देखें|見て)/.test(lower)) {
    return { gesture: 'point-up', emotion: 'confident' };
  }
  if (/\b(you|your|aap|tum|usted|vous|du|sie|sen|anda|kamu)\b/.test(lower) || /(أنت|आप|あなた)/.test(lower)) {
    return { gesture: 'point-camera', emotion: 'warm' };
  }
  if (/\b(wide|massive|huge|big|large|everywhere|bada|bahut|grande|enorme|gross|büyük|besar)\b/.test(lower) || /(كبير|बहुत|大きい)/.test(lower)) {
    return { gesture: 'size-wide', emotion: 'shocked' };
  }

  const fallbacks: Array<{ gesture: HandGesture; emotion: EmotionPreset }> = [
    { gesture: 'open-palms', emotion: 'warm' },
    { gesture: 'steeple', emotion: 'confident' },
    { gesture: 'sweep', emotion: 'focused' },
    { gesture: 'chop', emotion: 'confident' },
    { gesture: 'precision-pinch', emotion: 'focused' },
    { gesture: 'empathy-chest', emotion: 'empathetic' },
  ];
  return fallbacks[idx % fallbacks.length];
}

/**
 * Intelligent Offline Multilingual Script Auto-Director (Zero API Key Required):
 * Enforces 1-5s cadence beats, prevents duplicate adjacent [gesture|emotion] cues,
 * and supports 15+ languages + Hinglish/Roman Urdu.
 */
export function autoAddDirectingCues(rawScript: string): string {
  const cleanText = rawScript.replace(/\[[^\]]+\]/g, '').trim();
  const sentences = cleanText
    .split(/(?<=[.?!।؟。！？])\s*/)
    .map((s) => s.trim())
    .filter(Boolean);

  const clauses = sentences.flatMap(splitSentenceByCadence);
  const altGestures: HandGesture[] = ['open-palms', 'steeple', 'sweep', 'point-camera', 'chop', 'empathy-chest'];
  const altEmotions: EmotionPreset[] = ['warm', 'confident', 'focused', 'curious', 'empathetic'];

  let prevGesture: HandGesture | null = null;
  let prevEmotion: EmotionPreset | null = null;

  const enriched = clauses.map((clause, idx) => {
    let { gesture, emotion } = classifyClauseTag(clause, idx);
    if (prevGesture && gesture === prevGesture) {
      gesture = altGestures.find((g) => g !== prevGesture) || 'open-palms';
    }
    if (prevEmotion && emotion === prevEmotion && idx > 0) {
      emotion = altEmotions.find((e) => e !== prevEmotion) || 'confident';
    }
    prevGesture = gesture;
    prevEmotion = emotion;
    return `[${gesture}|${emotion}] ${clause}`;
  });

  return enriched.join(' ');
}

/**
 * Compiles a tagged script into a structured timeline with clause segments, word cues, and Rhubarb viseme sequences.
 */
export function compileScriptTimeline(
  script: string,
  wordsPerMinute: number = 148,
  sentencePauseSec: number = 0.25
): {
  totalDuration: number;
  wordCues: ScriptWordCue[];
  timelineCues: TimelineCue[];
  rhubarbCues: RhubarbCue[];
} {
  const tokenRegex = /\[([^\]]+)\]|([^\s\[\]]+)/g;
  let match: RegExpExecArray | null;

  let currentTime = 0.18; // brief natural breath lead-in
  let pendingGesture: HandGesture | undefined = 'rest';
  let pendingEmotion: EmotionPreset | undefined = 'warm';

  const wordCues: ScriptWordCue[] = [];
  const rhubarbCues: RhubarbCue[] = [
    { start: 0, end: currentTime, value: 'X', mouth: 'neutral' },
  ];
  const timelineCues: TimelineCue[] = [
    {
      id: 'cue-init',
      timestamp: 0,
      gesture: 'rest',
      emotion: 'warm',
      viseme: 'neutral',
    },
  ];

  const secondsPerWord = 60 / wordsPerMinute;

  while ((match = tokenRegex.exec(script)) !== null) {
    const [, tagContent, wordContent] = match;

    if (tagContent) {
      const parsed = parseTag(tagContent);
      if (parsed.gesture) pendingGesture = parsed.gesture;
      if (parsed.emotion) pendingEmotion = parsed.emotion;
    } else if (wordContent) {
      const clean = wordContent.replace(/[^\p{L}\p{N}]/gu, '');
      const wordDuration = Math.max(0.20, (Math.max(2, clean.length || wordContent.length) / 5) * secondsPerWord);
      // Allocate 82% to active speech visemes, 18% to word boundary closure (min 35ms)
      const speechDuration = Math.max(0.14, wordDuration * 0.82);

      const wordVisemes = mapWordToVisemes(wordContent, currentTime, speechDuration);

      wordCues.push({
        text: wordContent,
        cleanWord: clean,
        startTime: currentTime,
        duration: wordDuration,
        gesture: pendingGesture,
        emotion: pendingEmotion,
        visemes: wordVisemes,
      });

      for (let k = 0; k < wordVisemes.length; k++) {
        const vEnd = k + 1 < wordVisemes.length ? wordVisemes[k + 1].time : currentTime + speechDuration;
        rhubarbCues.push({
          start: wordVisemes[k].time,
          end: vEnd,
          value: wordVisemes[k].rhubarb,
          mouth: wordVisemes[k].viseme,
          word: wordContent,
        });
      }

      // Explicit rest closure at word boundary so mouth closes naturally when word ends
      if (wordDuration > speechDuration + 0.02) {
        rhubarbCues.push({
          start: currentTime + speechDuration,
          end: currentTime + wordDuration,
          value: 'X',
          mouth: 'neutral',
        });
      }

      if (pendingGesture || pendingEmotion) {
        timelineCues.push({
          id: `cue-${wordCues.length}`,
          timestamp: currentTime,
          word: wordContent,
          gesture: pendingGesture,
          emotion: pendingEmotion,
          viseme: wordVisemes[0]?.viseme || 'aei',
        });
        pendingGesture = undefined;
        pendingEmotion = undefined;
      }

      currentTime += wordDuration;

      if (/[.?!]$/.test(wordContent)) {
        const pauseEnd = currentTime + sentencePauseSec;
        rhubarbCues.push({
          start: currentTime,
          end: pauseEnd,
          value: 'X',
          mouth: 'neutral',
        });
        timelineCues.push({
          id: `pause-${wordCues.length}`,
          timestamp: currentTime,
          viseme: 'neutral',
        });
        currentTime = pauseEnd;
      } else if (/[,;:]$/.test(wordContent)) {
        const commaEnd = currentTime + sentencePauseSec * 0.5;
        rhubarbCues.push({
          start: currentTime,
          end: commaEnd,
          value: 'X',
          mouth: 'neutral',
        });
        currentTime = commaEnd;
      } else {
        const interWordGap = 0.045;
        rhubarbCues.push({
          start: currentTime,
          end: currentTime + interWordGap,
          value: 'X',
          mouth: 'neutral',
        });
        currentTime += interWordGap;
      }
    }
  }

  const totalDuration = Math.max(1.2, currentTime + 0.35);
  rhubarbCues.push({
    start: currentTime,
    end: totalDuration,
    value: 'X',
    mouth: 'neutral',
  });

  return {
    totalDuration,
    wordCues,
    timelineCues,
    rhubarbCues,
  };
}
