import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import {
  buildMonoWavFromPcmSegments,
  gateRhubarbCuesWithWords,
  parseWavHeader,
  renderMp4FromFrames,
  resolveFfmpegBinary,
  resolveRhubarbBinary,
  runRhubarbCliOnWav,
  splitIntoPhrases,
  splitIntoTaggedPhrases,
  stripDirectorTags,
  trimPcmWavSilence,
  EMOTION_PROSODY_MAP,
  analyzeScriptWithDirector,
  sanitizeProjectSlug,
  getConfiguredHfTokenCount,
  saveToExportsDir,
  getEdgeVoiceCatalog,
  extractAudioFromVideoToWav,
  renderWebmAlphaFromFrames,
} from './pipeline.ts';

const execFileAsync = promisify(execFile);

test('stripDirectorTags and splitIntoPhrases preserve spoken sentences only', () => {
  const raw = '[wave|warm] Hello there! [point-up|confident] Rhubarb is running; ready now?';
  assert.equal(stripDirectorTags(raw), 'Hello there! Rhubarb is running; ready now?');
  assert.deepEqual(splitIntoPhrases(raw), [
    'Hello there!',
    'Rhubarb is running;',
    'ready now?',
  ]);
});

test('buildMonoWavFromPcmSegments produces valid RIFF WAV with exact pause gap and offsets', () => {
  const seg1 = Buffer.alloc(24000 * 2, 0); // 1.0s mono 24kHz
  const seg2 = Buffer.alloc(12000 * 2, 0); // 0.5s mono 24kHz
  const { wavBuffer, segmentStartOffsetsSec, totalDurationSec } = buildMonoWavFromPcmSegments(
    [seg1, seg2],
    24000,
    0.25
  );

  const info = parseWavHeader(wavBuffer);
  assert.equal(info.sampleRate, 24000);
  assert.equal(info.numChannels, 1);
  assert.equal(info.bitsPerSample, 16);
  assert.equal(Number(totalDurationSec.toFixed(2)), 1.75);
  assert.equal(Number(segmentStartOffsetsSec[0].toFixed(2)), 0.0);
  assert.equal(Number(segmentStartOffsetsSec[1].toFixed(2)), 1.25);
});

test('trimPcmWavSilence strips leading and trailing silence and reports trimmedStartSec', () => {
  // Build 1.0s WAV with loud middle [0.25s..0.75s]
  const pcm = Buffer.alloc(24000 * 2, 0);
  for (let i = 6000; i < 18000; i++) {
    pcm.writeInt16LE(4000, i * 2);
  }
  const { wavBuffer } = buildMonoWavFromPcmSegments([pcm], 24000, 0);
  const trimmed = trimPcmWavSilence(wavBuffer, 320, 25);

  assert.ok(trimmed.trimmedStartSec > 0.20 && trimmed.trimmedStartSec < 0.26);
  assert.ok(trimmed.durationSec > 0.50 && trimmed.durationSec < 0.56);
});

test('real Rhubarb CLI binary exists and analyzes WAV audio into valid mouthCues JSON', async () => {
  const rhubarb = resolveRhubarbBinary();
  assert.ok(rhubarb, 'Expected tools/rhubarb/rhubarb binary to be present');

  // Synthesize 0.8s 16kHz sine burst WAV to test genuine Rhubarb execution
  const sampleRate = 16000;
  const totalSamples = Math.floor(sampleRate * 0.8);
  const pcm = Buffer.alloc(totalSamples * 2);
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const amp = t > 0.15 && t < 0.65 ? Math.round(Math.sin(2 * Math.PI * 220 * t) * 9000) : 0;
    pcm.writeInt16LE(amp, i * 2);
  }
  const { wavBuffer } = buildMonoWavFromPcmSegments([pcm], sampleRate, 0);
  const tmpWav = path.join(os.tmpdir(), `rhubarb_unit_${Date.now()}.wav`);
  fs.writeFileSync(tmpWav, wavBuffer);

  try {
    const res = await runRhubarbCliOnWav(tmpWav, { recognizer: 'phonetic' });
    assert.ok(res.mouthCues.length >= 1, 'Rhubarb should output at least 1 mouthCue');
    assert.ok(res.duration >= 0.7 && res.duration <= 0.9);
    for (const c of res.mouthCues) {
      assert.match(c.value, /^[XABCDEFGH]$/);
    }
  } finally {
    if (fs.existsSync(tmpWav)) fs.unlinkSync(tmpWav);
  }
});

test('renderMp4FromFrames muxes JPEG sequence and WAV audio into playable H.264 MP4', async () => {
  const ffmpeg = resolveFfmpegBinary();
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forma2d_mp4_unit_'));
  const framesDir = path.join(workDir, 'frames');
  fs.mkdirSync(framesDir);

  try {
    // Generate 6 sequential 320x240 JPEG frames (zero-indexed 5-digit pattern)
    await execFileAsync(ffmpeg, [
      '-y',
      '-f',
      'lavfi',
      '-i',
      'color=c=navy:s=320x240:d=0.25',
      '-frames:v',
      '6',
      '-start_number',
      '0',
      path.join(framesDir, 'frame_%05d.jpg'),
    ]);

    const pcm = Buffer.alloc(16000 * 0.25 * 2, 0);
    const { wavBuffer } = buildMonoWavFromPcmSegments([pcm], 16000, 0);
    const audioPath = path.join(workDir, 'audio.wav');
    fs.writeFileSync(audioPath, wavBuffer);

    const outMp4 = path.join(workDir, 'out.mp4');
    await renderMp4FromFrames({
      framesDir,
      outputMp4Path: outMp4,
      fps: 24,
      audioPath,
    });

    assert.ok(fs.existsSync(outMp4), 'Expected MP4 output file to exist');
    const stat = fs.statSync(outMp4);
    assert.ok(stat.size > 1000, `Expected MP4 size > 1000 bytes, got ${stat.size}`);
    const header = fs.readFileSync(outMp4).subarray(4, 8).toString('ascii');
    assert.equal(header, 'ftyp');
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
});

test('splitIntoTaggedPhrases pairs spoken clauses with emotion prosody metadata', () => {
  const tagged = splitIntoTaggedPhrases(
    '[wave|warm] Hello friends! [empathy-chest|empathetic] Let us take a closer look.'
  );
  assert.equal(tagged.length, 2);
  assert.equal(tagged[0].emotion, 'warm');
  assert.equal(tagged[0].gesture, 'wave');
  assert.equal(tagged[1].emotion, 'empathetic');
  assert.equal(tagged[1].gesture, 'empathy-chest');
  assert.equal(EMOTION_PROSODY_MAP.shocked.pitch, '+8Hz');
});

test('analyzeScriptWithDirector works offline without GEMINI_API_KEY and auto-converts Hinglish when requested', async () => {
  const origGem = process.env.GEMINI_API_KEY;
  const origOr = process.env.OPENROUTER_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  try {
    const res = await analyzeScriptWithDirector({
      text: 'नमस्ते दोस्तों! आज हम नए फीचर्स देखेंगे।',
    });
    assert.equal(res.usedGemini, false);
    assert.equal(res.usedProvider, 'offline');
    assert.equal(res.detectedLanguage, 'hi');
    assert.equal(res.recommendedVoice, 'hi-IN-MadhurNeural');
    assert.equal(res.recommendedRecognizer, 'phonetic');
    assert.ok(res.taggedScript.includes('[wave|warm]'));

    const hinglishRes = await analyzeScriptWithDirector({
      text: 'Aaj hum baat karenge',
      convertRomanized: true,
      provider: 'offline',
    });
    assert.equal(hinglishRes.usedProvider, 'offline');
    assert.equal(hinglishRes.usedModel, 'offline-multilingual-rules');
    assert.equal(hinglishRes.detectedLanguage, 'hi');
    assert.equal(hinglishRes.recommendedRecognizer, 'phonetic');
    assert.ok(/[\u0900-\u097F]/.test(hinglishRes.taggedScript));
  } finally {
    if (origGem !== undefined) process.env.GEMINI_API_KEY = origGem;
    if (origOr !== undefined) process.env.OPENROUTER_API_KEY = origOr;
  }
});

test('getEdgeVoiceCatalog returns sorted multilingual voices even in offline fallback', async () => {
  const voices = await getEdgeVoiceCatalog();
  assert.ok(Array.isArray(voices) && voices.length >= 20);
  const first = voices[0];
  assert.ok(first.shortName && first.locale && first.localeName && first.languageCode && first.gender);
});

test('extractAudioFromVideoToWav extracts mono WAV audio from synthetic MP4 and renderWebmAlphaFromFrames muxes RGBA PNGs into VP9 WebM', async () => {
  const ffmpeg = resolveFfmpegBinary();
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'toonsaz_alpha_unit_'));
  const framesDir = path.join(workDir, 'frames');
  fs.mkdirSync(framesDir);

  try {
    // 1. Create synthetic MP4 with video + sine audio and extract mono 24kHz WAV
    const synthMp4 = path.join(workDir, 'synth.mp4');
    await execFileAsync(ffmpeg, [
      '-y',
      '-f', 'lavfi', '-i', 'color=c=teal:s=160x120:d=0.3',
      '-f', 'lavfi', '-i', 'sine=frequency=440:duration=0.3',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-shortest',
      synthMp4,
    ]);
    const extractedWav = path.join(workDir, 'extracted.wav');
    await extractAudioFromVideoToWav(synthMp4, extractedWav, 24000);
    assert.ok(fs.existsSync(extractedWav));
    const wavInfo = parseWavHeader(fs.readFileSync(extractedWav));
    assert.equal(wavInfo.sampleRate, 24000);
    assert.equal(wavInfo.numChannels, 1);

    // 2. Render RGBA PNG frames into transparent VP9 WebM
    await execFileAsync(ffmpeg, [
      '-y',
      '-f', 'lavfi', '-i', 'color=c=red@0.5:s=160x120:d=0.25',
      '-frames:v', '6', '-start_number', '0',
      '-pix_fmt', 'rgba',
      path.join(framesDir, 'frame_%05d.png'),
    ]);

    const outWebm = path.join(workDir, 'alpha.webm');
    await renderWebmAlphaFromFrames({
      framesDir,
      outputWebmPath: outWebm,
      fps: 24,
      audioPath: extractedWav,
    });

    assert.ok(fs.existsSync(outWebm));
    const stat = fs.statSync(outWebm);
    assert.ok(stat.size > 500, `Expected WebM size > 500 bytes, got ${stat.size}`);
    const magic = fs.readFileSync(outWebm).subarray(0, 4);
    assert.deepEqual([...magic], [0x1a, 0x45, 0xdf, 0xa3]); // EBML header
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
});

test('sanitizeProjectSlug, getConfiguredHfTokenCount, and saveToExportsDir organize project exports cleanly', async () => {
  assert.equal(sanitizeProjectSlug('Toon Saz Demo #1!'), 'toon-saz-demo-1');

  const prev1 = process.env.HF_TOKEN;
  const prev2 = process.env.HF_TOKEN_2;
  const prevExp = process.env.EXPORT_DIR;
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'toonsaz_exp_'));

  process.env.HF_TOKEN = 'hf_primary_test';
  process.env.HF_TOKEN_2 = 'hf_secondary_test';
  process.env.EXPORT_DIR = tmpRoot;

  try {
    assert.equal(getConfiguredHfTokenCount(), 2);
    const saved = await saveToExportsDir(Buffer.from('RIFFtest'), 'My Hindi Project', 'voiceover.wav');
    assert.equal(saved.projectSlug, 'my-hindi-project');
    assert.equal(saved.format, 'wav');
    assert.ok(fs.existsSync(path.join(tmpRoot, 'my-hindi-project', 'voiceover.wav')));
  } finally {
    if (prev1 === undefined) delete process.env.HF_TOKEN;
    else process.env.HF_TOKEN = prev1;
    if (prev2 === undefined) delete process.env.HF_TOKEN_2;
    else process.env.HF_TOKEN_2 = prev2;
    if (prevExp === undefined) delete process.env.EXPORT_DIR;
    else process.env.EXPORT_DIR = prevExp;
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('gateRhubarbCuesWithWords clamps mouth cues to X during speech pauses and after speech', () => {
  const cues = [
    { start: 0.0, end: 0.5, value: 'B' },
    { start: 0.5, end: 1.0, value: 'C' },
    { start: 1.0, end: 2.0, value: 'D' }, // silence gap from 1.0s to 2.0s
    { start: 2.0, end: 2.5, value: 'E' },
    { start: 2.5, end: 3.5, value: 'F' }, // after speech ends at 2.5s
  ];

  const words = [
    { start: 0.05, end: 0.95, word: 'Hello' },
    { start: 2.05, end: 2.45, word: 'World' },
  ];

  const gated = gateRhubarbCuesWithWords(cues, words, { leadInSec: 0.02, trailOutSec: 0.03, minSilenceGapSec: 0.08 });

  // Word 'Hello' active
  const helloCue = gated.find((c) => 0.4 >= c.start && 0.4 <= c.end);
  assert.notEqual(helloCue?.value, 'X');

  // Pause interval between 1.05s and 1.95s MUST be 'X'
  const pauseCue = gated.find((c) => 1.5 >= c.start && 1.5 <= c.end);
  assert.equal(pauseCue?.value, 'X');

  // After the last word (at 3.0s) MUST be 'X'
  const afterCue = gated.find((c) => 3.0 >= c.start && 3.0 <= c.end);
  assert.equal(afterCue?.value, 'X');
});

