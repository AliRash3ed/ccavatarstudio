import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import multer from 'multer';
import {
  analyzeScriptWithDirector,
  convertAudioToWavFile,
  extractAudioFromVideoToWav,
  gateRhubarbCuesWithWords,
  getEdgeVoiceCatalog,
  getEngineCapabilities,
  listSavedExports,
  parseWavHeader,
  renderMp4FromFrames,
  renderWebmAlphaFromFrames,
  resolveExportsRoot,
  resolveRhubarbBinary,
  runRhubarbCliOnWav,
  sanitizeProjectSlug,
  saveToExportsDir,
  synthesizeEdgeTtsWithRhubarb,
  transcribeAudioWithFasterWhisper,
  type RhubarbRecognizer,
  type WordTiming,
} from './server/pipeline.ts';
import { analyzeScriptConversion, toDevanagari } from './src/utils/transliterate.ts';

// Load .env (API keys, EXPORT_DIR, FFMPEG_PATH) deterministically on startup
try {
  process.loadEnvFile(path.resolve(process.cwd(), '.env'));
} catch {
  /* .env missing or already loaded — safe to ignore */
}

// Ensure Rhubarb Lip-Sync binary is present; auto-download on first boot if missing
if (!resolveRhubarbBinary()) {
  try {
    const { execSync } = await import('node:child_process');
    console.log('[ccavatarstudio] Rhubarb binary not found. Running auto-installer...');
    execSync('node scripts/setup.mjs', { stdio: 'inherit' });
  } catch (setupErr) {
    console.warn('[ccavatarstudio] Automatic setup note:', setupErr);
  }
}

const PORT = Number(
  process.env.DEFAULT_APP_PORT ||
    (process.env.NGINX_PORT && process.env.PORT === process.env.NGINX_PORT ? 3000 : process.env.PORT) ||
    3000
);
const MEDIA_DIR = path.join(os.tmpdir(), 'toonsaz_media');
const RENDER_DIR = path.join(os.tmpdir(), 'toonsaz_renders');
const PROJECTS_FILE = path.resolve(process.cwd(), 'projects.json');
fs.mkdirSync(MEDIA_DIR, { recursive: true });
fs.mkdirSync(RENDER_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, MEDIA_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase() || '.audio';
      cb(null, `upload_${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const videoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, MEDIA_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase() || '.mp4';
      cb(null, `video_${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 150 * 1024 * 1024 },
});

function pruneOldMediaFiles() {
  try {
    const entries = fs
      .readdirSync(MEDIA_DIR)
      .map((name) => {
        const full = path.join(MEDIA_DIR, name);
        return { name, full, mtime: fs.statSync(full).mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);

    for (const stale of entries.slice(40)) {
      fs.unlinkSync(stale.full);
    }
  } catch {
    // Ignore cleanup errors
  }
}

function streamRangeFile(req: express.Request, res: express.Response, fullPath: string, contentType: string) {
  let stat: fs.Stats;
  try {
    stat = fs.statSync(fullPath);
  } catch {
    return res.status(404).end();
  }
  // Never stream directories (e.g. crafted "../" names resolving to the root itself)
  if (!stat.isFile()) {
    return res.status(404).end();
  }
  const total = stat.size;
  const range = req.headers.range;
  // Client disconnects / stream errors must never crash the server
  const handleStreamError = () => {
    if (!res.headersSent) {
      res.status(500).end();
    } else {
      res.destroy();
    }
  };

  try {
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
      if (isNaN(start) || isNaN(end) || start > end || end >= total) {
        return res.status(416).set('Content-Range', `bytes */${total}`).end();
      }
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${total}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': contentType,
      });
      const stream = fs.createReadStream(fullPath, { start, end });
      stream.on('error', handleStreamError);
      stream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': total,
        'Accept-Ranges': 'bytes',
        'Content-Type': contentType,
      });
      const stream = fs.createReadStream(fullPath);
      stream.on('error', handleStreamError);
      stream.pipe(res);
    }
  } catch {
    if (!res.headersSent) {
      res.status(500).end();
    } else {
      res.destroy();
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // 1. Live engine readiness check (real binaries, HF token count & export dir)
  app.get('/api/capabilities', async (_req, res) => {
    try {
      const caps = await getEngineCapabilities();
      res.json(caps);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Capability probe failed' });
    }
  });

  // 1b. Live Edge TTS global neural voice catalog (all languages, locales & genders)
  app.get('/api/voices/edge', async (_req, res) => {
    try {
      const catalog = await getEdgeVoiceCatalog();
      res.json(catalog);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load Edge voice catalog' });
    }
  });

  // 1c. Offline Hinglish / Roman-Urdu / Urdu -> Devanagari converter (zero API keys)
  app.post('/api/transliterate', (req, res) => {
    try {
      const text = String(req.body?.text || '');
      const forceRaw = req.body?.force;
      const force =
        forceRaw === 'roman' || forceRaw === 'urdu' || forceRaw === 'devanagari' ? forceRaw : null;
      const analysis = analyzeScriptConversion(text);
      const result = toDevanagari(text, { force });
      res.json({ result, analysis });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Transliteration failed' });
    }
  });

  // 2. Multilingual AI Emotion & Gesture Director (supports Offline, Gemini, OpenRouter, OpenAI, Anthropic, Custom LLM)
  app.post('/api/script/analyze', async (req, res) => {
    try {
      const text = String(req.body?.text || '').trim();
      const targetLanguage = typeof req.body?.targetLanguage === 'string' ? req.body.targetLanguage : 'auto';
      const convertRomanized = Boolean(req.body?.convertRomanized);
      const rawProv = typeof req.body?.provider === 'string' ? req.body.provider : 'auto';
      const provider = (
        ['auto', 'offline', 'gemini', 'openrouter', 'openai', 'anthropic', 'custom'].includes(rawProv)
          ? rawProv
          : 'auto'
      ) as 'auto' | 'offline' | 'gemini' | 'openrouter' | 'openai' | 'anthropic' | 'custom';
      const model = typeof req.body?.model === 'string' ? req.body.model : undefined;
      const apiKey = typeof req.body?.apiKey === 'string' ? req.body.apiKey : undefined;
      const baseUrl = typeof req.body?.baseUrl === 'string' ? req.body.baseUrl : undefined;

      if (!text) {
        return res.status(400).json({ error: 'Provide script text to analyze emotions & gestures.' });
      }

      const result = await analyzeScriptWithDirector({
        text,
        targetLanguage,
        convertRomanized,
        provider,
        model,
        apiKey,
        baseUrl,
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Script analysis failed' });
    }
  });

  // 3. Microsoft Edge Neural TTS (Per-Emotion Prosody) + FFmpeg Silence Control + Real Rhubarb Lip-Sync CLI
  app.post('/api/tts/edge', async (req, res) => {
    try {
      const text = String(req.body?.text || '').trim();
      const voice = String(req.body?.voice || 'en-US-AndrewMultilingualNeural').trim();
      const pauseGapSec = Number(req.body?.pauseGapSec ?? 0.25);
      const rate = String(req.body?.rate || '+0%');
      const projectName = typeof req.body?.projectName === 'string' ? req.body.projectName.trim() : '';
      const recognizer: RhubarbRecognizer =
        req.body?.recognizer === 'pocketSphinx' ? 'pocketSphinx' : 'phonetic';

      if (!text) {
        return res.status(400).json({ error: 'Script text is required to run Edge TTS synthesis.' });
      }

      const result = await synthesizeEdgeTtsWithRhubarb({
        text,
        voice,
        pauseGapSec: Number.isFinite(pauseGapSec) ? pauseGapSec : 0.25,
        rate,
        recognizer,
      });

      const mediaId = `edge_${crypto.randomUUID()}.wav`;
      const wavPath = path.join(MEDIA_DIR, mediaId);
      await fsp.writeFile(wavPath, result.wavBuffer);
      pruneOldMediaFiles();

      let savedExport = null;
      if (projectName) {
        const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        savedExport = await saveToExportsDir(
          result.wavBuffer,
          projectName,
          `${sanitizeProjectSlug(projectName)}_${stamp}.wav`
        );
      }

      res.json({
        mediaId,
        audioUrl: `/api/media/${mediaId}`,
        voice,
        duration: Number(result.duration.toFixed(3)),
        phraseCount: result.phraseCount,
        recognizerUsed: result.recognizerUsed,
        mouthCues: result.mouthCues,
        rhubarbJson: result.rhubarbJson,
        wordTimings: result.wordTimings,
        whisperWordLines: result.whisperWordLines,
        segmentTimings: result.segmentTimings,
        savedExport,
      });
    } catch (err) {
      console.error('[api/tts/edge] error:', err);
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Edge TTS + Rhubarb synthesis failed',
      });
    }
  });

  // 3b. Bring Your Own Voiceover / Custom TTS Webhook & Speech API (ElevenLabs, OpenAI TTS, Custom Webhooks)
  app.post('/api/tts/custom', async (req, res) => {
    try {
      const text = String(req.body?.text || '').trim();
      const engine = String(req.body?.engine || 'custom-tts').trim();
      const recognizer: RhubarbRecognizer = req.body?.recognizer === 'pocketSphinx' ? 'pocketSphinx' : 'phonetic';
      if (!text) {
        return res.status(400).json({ error: 'Script text is required for voice synthesis.' });
      }

      let audioBuffer: Buffer | null = null;
      let formatExt = '.mp3';

      if (engine === 'openai-tts') {
        const apiKey = String(req.body?.openaiApiKey || process.env.OPENAI_API_KEY || '').trim();
        if (!apiKey) return res.status(400).json({ error: 'OpenAI API Key is required for OpenAI TTS.' });
        const voice = String(req.body?.openaiVoice || 'alloy').trim();
        const model = String(req.body?.openaiModel || 'tts-1').trim();
        const resp = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ model, input: text, voice }),
        });
        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(`OpenAI TTS error (${resp.status}): ${errText}`);
        }
        audioBuffer = Buffer.from(await resp.arrayBuffer());
        formatExt = '.mp3';
      } else if (engine === 'elevenlabs') {
        const apiKey = String(req.body?.elevenlabsApiKey || process.env.ELEVENLABS_API_KEY || '').trim();
        if (!apiKey) return res.status(400).json({ error: 'ElevenLabs API Key is required.' });
        const voiceId = String(req.body?.elevenlabsVoiceId || '21m00Tcm4TlvDq8ikWAM').trim();
        const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
            Accept: 'audio/mpeg',
          },
          body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' }),
        });
        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(`ElevenLabs error (${resp.status}): ${errText}`);
        }
        audioBuffer = Buffer.from(await resp.arrayBuffer());
        formatExt = '.mp3';
      } else {
        // custom-tts webhook endpoint
        const endpoint = String(req.body?.customTtsEndpoint || '').trim();
        if (!endpoint) return res.status(400).json({ error: 'Custom TTS Endpoint URL is required.' });
        const apiKey = String(req.body?.customTtsApiKey || '').trim();
        const headerName = String(req.body?.customTtsHeaderName || 'Authorization').trim();
        const voiceId = String(req.body?.customTtsVoiceId || '').trim();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey) {
          headers[headerName] = headerName.toLowerCase() === 'authorization' && !apiKey.startsWith('Bearer ')
            ? `Bearer ${apiKey}`
            : apiKey;
        }
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({ text, voice: voiceId }),
        });
        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(`Custom TTS Webhook error (${resp.status}): ${errText}`);
        }
        audioBuffer = Buffer.from(await resp.arrayBuffer());
        formatExt = req.body?.customTtsFormat === 'audio/wav' ? '.wav' : '.mp3';
      }

      if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error('TTS engine returned empty audio buffer.');
      }

      const tempAudioPath = path.join(MEDIA_DIR, `tts_${crypto.randomUUID()}${formatExt}`);
      await fsp.writeFile(tempAudioPath, audioBuffer);

      const servedMediaId = `tts_${crypto.randomUUID()}.wav`;
      const targetWavPath = path.join(MEDIA_DIR, servedMediaId);
      await convertAudioToWavFile(tempAudioPath, targetWavPath);

      if (fs.existsSync(tempAudioPath)) {
        await fsp.unlink(tempAudioPath).catch(() => {});
      }

      const wavInfo = parseWavHeader(await fsp.readFile(targetWavPath));
      const rhubarbResult = await runRhubarbCliOnWav(targetWavPath, { dialogText: text, recognizer });

      pruneOldMediaFiles();

      res.json({
        mediaId: servedMediaId,
        audioUrl: `/api/media/${servedMediaId}`,
        duration: Number(Math.max(wavInfo.durationSec, rhubarbResult.duration).toFixed(3)),
        phraseCount: 1,
        recognizerUsed: rhubarbResult.recognizerUsed,
        mouthCues: rhubarbResult.mouthCues,
        rhubarbJson: JSON.stringify({ metadata: { duration: rhubarbResult.duration }, mouthCues: rhubarbResult.mouthCues }, null, 2),
        engineUsed: engine,
      });
    } catch (err) {
      console.error('[api/tts/custom] error:', err);
      res.status(500).json({ error: err instanceof Error ? err.message : 'Custom TTS synthesis failed' });
    }
  });

  // 4. Real Rhubarb Lip-Sync CLI execution on uploaded WAV/MP3/OGG or existing server mediaId
  app.post('/api/rhubarb/analyze', upload.single('audio'), async (req, res) => {
    let uploadedTempPath: string | null = req.file?.path || null;
    try {
      const recognizer: RhubarbRecognizer =
        req.body?.recognizer === 'pocketSphinx' ? 'pocketSphinx' : 'phonetic';
      const dialogText = typeof req.body?.dialogText === 'string' ? req.body.dialogText : undefined;
      const existingMediaId =
        typeof req.body?.mediaId === 'string' ? path.basename(req.body.mediaId) : '';

      let targetWavPath: string;
      let servedMediaId: string;

      if (uploadedTempPath) {
        servedMediaId = `rhubarb_${crypto.randomUUID()}.wav`;
        targetWavPath = path.join(MEDIA_DIR, servedMediaId);
        await convertAudioToWavFile(uploadedTempPath, targetWavPath, 24000);
        await fsp.unlink(uploadedTempPath).catch(() => {});
        uploadedTempPath = null;
      } else if (existingMediaId && fs.existsSync(path.join(MEDIA_DIR, existingMediaId))) {
        servedMediaId = existingMediaId;
        targetWavPath = path.join(MEDIA_DIR, existingMediaId);
      } else {
        return res.status(400).json({
          error: 'Upload an audio file (.wav, .mp3, .ogg) or synthesize Edge TTS audio first.',
        });
      }

      const wavInfo = parseWavHeader(await fsp.readFile(targetWavPath));
      const rhubarbResult = await runRhubarbCliOnWav(targetWavPath, {
        dialogText,
        recognizer,
      });

      let wordTimings: WordTiming[] = [];
      let whisperWordLines = '';
      let transcribedText = '';

      try {
        const whisperResult = await transcribeAudioWithFasterWhisper(targetWavPath, 'auto');
        wordTimings = whisperResult.words;
        whisperWordLines = whisperResult.wordLines;
        transcribedText = whisperResult.text;
      } catch (whisperErr) {
        console.warn('[api/rhubarb/analyze] Whisper transcription note:', whisperErr);
      }

      const gatedCues = wordTimings.length > 0
        ? gateRhubarbCuesWithWords(rhubarbResult.mouthCues, wordTimings)
        : rhubarbResult.mouthCues;

      pruneOldMediaFiles();

      res.json({
        mediaId: servedMediaId,
        audioUrl: `/api/media/${servedMediaId}`,
        duration: Number(Math.max(wavInfo.durationSec, rhubarbResult.duration).toFixed(3)),
        recognizerUsed: rhubarbResult.recognizerUsed,
        mouthCues: gatedCues,
        rhubarbJson: JSON.stringify({ metadata: { duration: rhubarbResult.duration }, mouthCues: gatedCues }, null, 2),
        words: wordTimings,
        whisperWordLines,
        transcribedText,
      });
    } catch (err) {
      console.error('[api/rhubarb/analyze] error:', err);
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Rhubarb Lip-Sync analysis failed',
      });
    } finally {
      if (uploadedTempPath && fs.existsSync(uploadedTempPath)) {
        await fsp.unlink(uploadedTempPath).catch(() => {});
      }
    }
  });

  // 4b. Extract audio track from uploaded split-pane video via FFmpeg + run Rhubarb CLI
  app.post('/api/audio/from-video', videoUpload.single('video'), async (req, res) => {
    let uploadedVideoPath: string | null = req.file?.path || null;
    try {
      if (!uploadedVideoPath) {
        return res.status(400).json({ error: 'Upload an MP4/WebM/MOV video file to extract voice audio.' });
      }
      const recognizer: RhubarbRecognizer =
        req.body?.recognizer === 'pocketSphinx' ? 'pocketSphinx' : 'phonetic';
      const dialogText = typeof req.body?.dialogText === 'string' ? req.body.dialogText : undefined;
      const runTranscribe = req.body?.transcribe === 'true';

      const servedMediaId = `vid_audio_${crypto.randomUUID()}.wav`;
      const targetWavPath = path.join(MEDIA_DIR, servedMediaId);
      await extractAudioFromVideoToWav(uploadedVideoPath, targetWavPath, 24000);
      await fsp.unlink(uploadedVideoPath).catch(() => {});
      uploadedVideoPath = null;

      const wavInfo = parseWavHeader(await fsp.readFile(targetWavPath));
      const rhubarbResult = await runRhubarbCliOnWav(targetWavPath, {
        dialogText,
        recognizer,
      });

      let wordTimings: WordTiming[] = [];
      let whisperWordLines = '';
      let transcribedText = '';

      try {
        const whisperResult = await transcribeAudioWithFasterWhisper(
          targetWavPath,
          typeof req.body?.language === 'string' ? req.body.language : 'auto'
        );
        wordTimings = whisperResult.words;
        whisperWordLines = whisperResult.wordLines;
        transcribedText = whisperResult.text;
      } catch (whisperErr) {
        console.warn('[api/audio/from-video] Whisper transcription note:', whisperErr);
      }

      const gatedCues = wordTimings.length > 0
        ? gateRhubarbCuesWithWords(rhubarbResult.mouthCues, wordTimings)
        : rhubarbResult.mouthCues;

      pruneOldMediaFiles();
      res.json({
        mediaId: servedMediaId,
        audioUrl: `/api/media/${servedMediaId}`,
        duration: Number(Math.max(wavInfo.durationSec, rhubarbResult.duration).toFixed(3)),
        recognizerUsed: rhubarbResult.recognizerUsed,
        mouthCues: gatedCues,
        rhubarbJson: JSON.stringify({ metadata: { duration: rhubarbResult.duration }, mouthCues: gatedCues }, null, 2),
        words: wordTimings,
        whisperWordLines,
        transcribedText,
      });
    } catch (err) {
      console.error('[api/audio/from-video] error:', err);
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to extract audio from uploaded video',
      });
    } finally {
      if (uploadedVideoPath && fs.existsSync(uploadedVideoPath)) {
        await fsp.unlink(uploadedVideoPath).catch(() => {});
      }
    }
  });

  // 4c. Faster-Whisper word-level timestamp transcription on existing or uploaded audio
  app.post('/api/audio/transcribe', upload.single('audio'), async (req, res) => {
    let uploadedTempPath: string | null = req.file?.path || null;
    try {
      const language = typeof req.body?.language === 'string' ? req.body.language : 'auto';
      const model = typeof req.body?.model === 'string' ? req.body.model : 'base';
      const existingMediaId =
        typeof req.body?.mediaId === 'string' ? path.basename(req.body.mediaId) : '';

      let targetWavPath: string;
      let tempCreatedWav = false;

      if (uploadedTempPath) {
        targetWavPath = path.join(MEDIA_DIR, `transcribe_${crypto.randomUUID()}.wav`);
        await convertAudioToWavFile(uploadedTempPath, targetWavPath, 16000);
        tempCreatedWav = true;
        await fsp.unlink(uploadedTempPath).catch(() => {});
        uploadedTempPath = null;
      } else if (existingMediaId && fs.existsSync(path.join(MEDIA_DIR, existingMediaId))) {
        targetWavPath = path.join(MEDIA_DIR, existingMediaId);
      } else {
        return res.status(400).json({
          error: 'Generate Edge TTS or upload an audio/video file before running Faster-Whisper.',
        });
      }

      try {
        const result = await transcribeAudioWithFasterWhisper(targetWavPath, language, model);
        res.json(result);
      } finally {
        if (tempCreatedWav && fs.existsSync(targetWavPath)) {
          await fsp.unlink(targetWavPath).catch(() => {});
        }
      }
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Faster-Whisper transcription failed',
      });
    } finally {
      if (uploadedTempPath && fs.existsSync(uploadedTempPath)) {
        await fsp.unlink(uploadedTempPath).catch(() => {});
      }
    }
  });

  // 5. Python Script download
  app.get('/api/scripts/:filename', async (req, res) => {
    const safeName = path.basename(req.params.filename);
    if (!['edge_voiceover_pipeline.py', 'voiceover_pipeline.py', 'transcribe_audio.py'].includes(safeName)) {
      return res.status(404).json({ error: 'Script not found' });
    }
    const scriptPath = path.resolve(process.cwd(), 'scripts', safeName);
    if (!fs.existsSync(scriptPath)) {
      return res.status(404).json({ error: 'Script file missing on server' });
    }
    res.setHeader('Content-Type', 'text/x-python; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.sendFile(scriptPath);
  });

  // 6. Deterministic Local/Server FFmpeg MP4 & Alpha WebM Video + Audio Muxing Pipeline
  const renderJobs = new Map<
    string,
    { dir: string; fps: number; mediaId?: string; projectName?: string; format: 'mp4' | 'webm' }
  >();

  app.post('/api/render/start', async (req, res) => {
    try {
      const jobId = crypto.randomUUID();
      const fps = Math.max(12, Math.min(60, Number(req.body?.fps || 24)));
      const format = req.body?.format === 'webm' ? 'webm' : 'mp4';
      const mediaId = typeof req.body?.mediaId === 'string' ? path.basename(req.body.mediaId) : undefined;
      const projectName = typeof req.body?.projectName === 'string' ? req.body.projectName.trim() : 'toon-saz-project';
      const jobDir = path.join(RENDER_DIR, jobId);
      await fsp.mkdir(jobDir, { recursive: true });
      renderJobs.set(jobId, { dir: jobDir, fps, mediaId, projectName, format });
      res.json({ jobId, fps, format });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to start render job' });
    }
  });

  app.post(
    '/api/render/frame',
    express.raw({ type: ['image/jpeg', 'image/png'], limit: '16mb' }),
    async (req, res) => {
      try {
        const jobId = String(req.headers['x-render-job'] || '');
        const frameIdx = Number(req.headers['x-frame-index'] ?? -1);
        const job = renderJobs.get(jobId);
        if (!job || !Number.isInteger(frameIdx) || frameIdx < 0 || !Buffer.isBuffer(req.body)) {
          return res.status(400).json({ error: 'Invalid render frame payload or jobId' });
        }
        const contentType = String(req.headers['content-type'] || '').toLowerCase();
        const ext = contentType.includes('png') || job.format === 'webm' ? 'png' : 'jpg';
        const frameFile = path.join(job.dir, `frame_${String(frameIdx).padStart(5, '0')}.${ext}`);
        await fsp.writeFile(frameFile, req.body);
        res.json({ ok: true, frameIdx });
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Frame write failed' });
      }
    }
  );

  // Abort an abandoned/cancelled render job: drop its map entry and delete frame files
  app.post('/api/render/abort', async (req, res) => {
    const jobId = String(req.body?.jobId || '');
    const job = renderJobs.get(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Render job not found or expired' });
    }
    renderJobs.delete(jobId);
    try {
      await fsp.rm(job.dir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors — dir removal is best-effort
    }
    res.json({ ok: true, aborted: jobId });
  });

  app.post('/api/render/finish', async (req, res) => {
    const jobId = String(req.body?.jobId || '');
    const job = renderJobs.get(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Render job not found or expired' });
    }
    try {
      const projectName =
        typeof req.body?.projectName === 'string'
          ? req.body.projectName.trim()
          : job.projectName || 'toon-saz-project';
      const ext = job.format === 'webm' ? 'webm' : 'mp4';
      const outName = `render_${crypto.randomUUID()}.${ext}`;
      const outPath = path.join(MEDIA_DIR, outName);
      const audioPath =
        job.mediaId && fs.existsSync(path.join(MEDIA_DIR, job.mediaId))
          ? path.join(MEDIA_DIR, job.mediaId)
          : null;

      if (ext === 'webm') {
        await renderWebmAlphaFromFrames({
          framesDir: job.dir,
          outputWebmPath: outPath,
          fps: job.fps,
          audioPath,
        });
      } else {
        await renderMp4FromFrames({
          framesDir: job.dir,
          outputMp4Path: outPath,
          fps: job.fps,
          audioPath,
        });
      }

      const stat = await fsp.stat(outPath);
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const savedExport = await saveToExportsDir(
        outPath,
        projectName,
        `${sanitizeProjectSlug(projectName)}_${stamp}.${ext}`
      );
      pruneOldMediaFiles();

      res.json({
        mediaId: outName,
        format: ext,
        mimeType: ext === 'webm' ? 'video/webm' : 'video/mp4',
        videoUrl: savedExport.url,
        tempUrl: `/api/media/${outName}`,
        savedPath: savedExport.savedPath,
        savedExport,
        sizeBytes: stat.size,
        hasAudioMuxed: Boolean(audioPath),
      });
    } catch (err) {
      console.error('[api/render/finish] error:', err);
      res.status(500).json({ error: err instanceof Error ? err.message : 'FFmpeg video render failed' });
    } finally {
      renderJobs.delete(jobId);
      await fsp.rm(job.dir, { recursive: true, force: true }).catch(() => {});
    }
  });

  // 6b. Ultra-Fast Direct Stream Render (Instant Hardware Video + Audio Muxing to 1080p MP4)
  const fastVideoUpload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, MEDIA_DIR),
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase() || '.webm';
        cb(null, `stream_${crypto.randomUUID()}${ext}`);
      },
    }),
    limits: { fileSize: 500 * 1024 * 1024 },
  });

  app.post('/api/render/fast-export', fastVideoUpload.single('video'), async (req, res) => {
    let uploadedWebmPath = req.file?.path || null;
    if (!uploadedWebmPath || !fs.existsSync(uploadedWebmPath)) {
      return res.status(400).json({ error: 'No video stream payload received' });
    }
    try {
      const projectName =
        typeof req.body?.projectName === 'string' && req.body.projectName.trim()
          ? req.body.projectName.trim()
          : 'toon-saz-project';
      const targetFormat = req.body?.format === 'webm' ? 'webm' : 'mp4';
      const outName = `render_${crypto.randomUUID()}.${targetFormat}`;
      const outPath = path.join(MEDIA_DIR, outName);
      const ffmpegBin = process.env.FFMPEG_PATH || 'ffmpeg';

      const mediaId = typeof req.body?.mediaId === 'string' ? path.basename(req.body.mediaId) : '';
      const audioPath =
        mediaId && fs.existsSync(path.join(MEDIA_DIR, mediaId)) ? path.join(MEDIA_DIR, mediaId) : null;

      if (targetFormat === 'mp4') {
        // Ultrafast libx264 conversion + master audio muxing: takes <1s for 20-30s video
        const ffmpegArgs = ['-y', '-i', uploadedWebmPath!];
        if (audioPath) {
          ffmpegArgs.push('-i', audioPath, '-map', '0:v:0', '-map', '1:a:0', '-shortest');
        }
        ffmpegArgs.push(
          '-c:v',
          'libx264',
          '-preset',
          'ultrafast',
          '-crf',
          '19',
          '-pix_fmt',
          'yuv420p',
          '-c:a',
          'aac',
          '-b:a',
          '192k',
          '-movflags',
          '+faststart',
          outPath
        );

        await new Promise<void>((resolve, reject) => {
          const proc = spawn(ffmpegBin, ffmpegArgs);
          let stderr = '';
          proc.stderr?.on('data', (d) => {
            stderr += d.toString();
          });
          proc.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`FFmpeg transcode failed (exit ${code}): ${stderr.slice(-300)}`));
          });
          proc.on('error', reject);
        });
      } else {
        await fsp.copyFile(uploadedWebmPath, outPath);
      }

      await fsp.unlink(uploadedWebmPath).catch(() => {});
      uploadedWebmPath = null;

      const stat = await fsp.stat(outPath);
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const savedExport = await saveToExportsDir(
        outPath,
        projectName,
        `${sanitizeProjectSlug(projectName)}_${stamp}.${targetFormat}`
      );
      pruneOldMediaFiles();

      res.json({
        mediaId: outName,
        format: targetFormat,
        mimeType: targetFormat === 'webm' ? 'video/webm' : 'video/mp4',
        videoUrl: savedExport.url,
        tempUrl: `/api/media/${outName}`,
        savedPath: savedExport.savedPath,
        savedExport,
        sizeBytes: stat.size,
      });
    } catch (err) {
      console.error('[api/render/fast-export] error:', err);
      if (uploadedWebmPath && fs.existsSync(uploadedWebmPath)) {
        await fsp.unlink(uploadedWebmPath).catch(() => {});
      }
      res.status(500).json({ error: err instanceof Error ? err.message : 'Fast export transcode failed' });
    }
  });

  // 7. Persistent Export Folder Management (./exports/<project-slug>/)
  app.get('/api/exports', async (_req, res) => {
    try {
      const exportsList = await listSavedExports();
      res.json({
        exportDir: resolveExportsRoot(),
        items: exportsList,
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to list exports' });
    }
  });

  // 8. Server-side Project Persistence (projects.json)
  app.get('/api/projects', async (_req, res) => {
    try {
      if (!fs.existsSync(PROJECTS_FILE)) {
        return res.json([]);
      }
      const data = await fsp.readFile(PROJECTS_FILE, 'utf-8');
      const list = JSON.parse(data || '[]');
      res.json(Array.isArray(list) ? list : []);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to read projects' });
    }
  });

  app.post('/api/projects', async (req, res) => {
    try {
      const snapshot = req.body;
      if (!snapshot || typeof snapshot !== 'object' || !snapshot.id || !snapshot.name) {
        return res.status(400).json({ error: 'Valid project snapshot with id and name required' });
      }
      let list: any[] = [];
      if (fs.existsSync(PROJECTS_FILE)) {
        try {
          const raw = await fsp.readFile(PROJECTS_FILE, 'utf-8');
          list = JSON.parse(raw || '[]');
          if (!Array.isArray(list)) list = [];
        } catch {
          list = [];
        }
      }
      const idx = list.findIndex((p: any) => p.id === snapshot.id);
      if (idx >= 0) {
        list[idx] = snapshot;
      } else {
        list.unshift(snapshot);
      }
      await fsp.writeFile(PROJECTS_FILE, JSON.stringify(list, null, 2), 'utf-8');
      res.json({ ok: true, project: snapshot });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to save project' });
    }
  });

  app.delete('/api/projects/:id', async (req, res) => {
    try {
      const id = req.params.id;
      if (!fs.existsSync(PROJECTS_FILE)) {
        return res.json({ ok: true, deleted: id });
      }
      const raw = await fsp.readFile(PROJECTS_FILE, 'utf-8');
      let list = JSON.parse(raw || '[]');
      if (Array.isArray(list)) {
        list = list.filter((p: any) => p.id !== id);
        await fsp.writeFile(PROJECTS_FILE, JSON.stringify(list, null, 2), 'utf-8');
      }
      res.json({ ok: true, deleted: id });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to delete project' });
    }
  });

  app.get('/api/exports/:slug/:filename', (req, res) => {
    const slug = sanitizeProjectSlug(req.params.slug);
    const safeName = path.basename(req.params.filename);
    const fullPath = path.join(resolveExportsRoot(), slug, safeName);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Export file not found' });
    }
    const contentType = safeName.endsWith('.mp4')
      ? 'video/mp4'
      : safeName.endsWith('.wav')
      ? 'audio/wav'
      : safeName.endsWith('.png')
      ? 'image/png'
      : safeName.endsWith('.webm')
      ? 'video/webm'
      : 'application/json';
    return streamRangeFile(req, res, fullPath, contentType);
  });

  app.delete('/api/exports/:slug/:filename', async (req, res) => {
    try {
      const slug = sanitizeProjectSlug(req.params.slug);
      const safeName = path.basename(req.params.filename);
      const fullPath = path.join(resolveExportsRoot(), slug, safeName);
      if (fs.existsSync(fullPath)) {
        await fsp.unlink(fullPath);
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Delete export failed' });
    }
  });

  // 8. Byte-range temporary media streamer
  app.get('/api/media/:filename', (req, res) => {
    const safeName = path.basename(req.params.filename);
    const fullPath = path.join(MEDIA_DIR, safeName);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Media file not found or expired' });
    }
    const contentType = safeName.endsWith('.mp4')
      ? 'video/mp4'
      : safeName.endsWith('.webm')
      ? 'video/webm'
      : safeName.endsWith('.mp3')
      ? 'audio/mpeg'
      : 'audio/wav';
    return streamRangeFile(req, res, fullPath, contentType);
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Toon Saz Studio Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
