#!/usr/bin/env node
/**
 * Cross-Platform Local Setup Installer for ccavatarstudio
 * - Downloads official Rhubarb Lip-Sync v1.14.0 for Windows, macOS, or Linux into ./tools/rhubarb/
 * - Verifies FFmpeg and optional Python packages (edge-tts, faster-whisper, gradio_client)
 * - Creates .env from .env.example if missing
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = process.cwd();
const RHUBARB_VERSION = '1.14.0';
const TOOLS_DIR = path.join(ROOT, 'tools', 'rhubarb');

function log(msg) {
  console.log(`[Setup] ${msg}`);
}

function getRhubarbArchiveInfo() {
  switch (process.platform) {
    case 'win32':
      return {
        url: `https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v${RHUBARB_VERSION}/Rhubarb-Lip-Sync-${RHUBARB_VERSION}-Windows.zip`,
        folder: `Rhubarb-Lip-Sync-${RHUBARB_VERSION}-Windows`,
        binName: 'rhubarb.exe',
      };
    case 'darwin':
      return {
        url: `https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v${RHUBARB_VERSION}/Rhubarb-Lip-Sync-${RHUBARB_VERSION}-macOS.zip`,
        folder: `Rhubarb-Lip-Sync-${RHUBARB_VERSION}-macOS`,
        binName: 'rhubarb',
      };
    default:
      return {
        url: `https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v${RHUBARB_VERSION}/Rhubarb-Lip-Sync-${RHUBARB_VERSION}-Linux.zip`,
        folder: `Rhubarb-Lip-Sync-${RHUBARB_VERSION}-Linux`,
        binName: 'rhubarb',
      };
  }
}

async function installRhubarb() {
  const { url, folder, binName } = getRhubarbArchiveInfo();
  const targetBin = path.join(TOOLS_DIR, binName);
  if (fs.existsSync(targetBin)) {
    if (process.platform !== 'win32') {
      try {
        fs.chmodSync(targetBin, 0o755);
      } catch {
        // Ignore chmod errors
      }
    }
    log(`Rhubarb Lip-Sync (${binName}) already installed at ${targetBin}`);
    return;
  }

  fs.mkdirSync(TOOLS_DIR, { recursive: true });
  const zipPath = path.join(os.tmpdir(), `rhubarb_${RHUBARB_VERSION}.zip`);
  const extractDir = path.join(os.tmpdir(), `rhubarb_extract_${RHUBARB_VERSION}`);

  log(`Downloading official Rhubarb Lip-Sync v${RHUBARB_VERSION} for ${process.platform}...`);
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to download Rhubarb (${resp.status} ${resp.statusText}) from ${url}`);
  }
  const buf = Buffer.from(await resp.arrayBuffer());
  fs.writeFileSync(zipPath, buf);

  fs.rmSync(extractDir, { recursive: true, force: true });
  fs.mkdirSync(extractDir, { recursive: true });

  if (process.platform === 'win32') {
    execSync(
      `powershell -NoProfile -Command "Expand-Archive -Force -Path '${zipPath}' -DestinationPath '${extractDir}'"`,
      { stdio: 'inherit' }
    );
  } else {
    execSync(`unzip -q -o "${zipPath}" -d "${extractDir}"`, { stdio: 'inherit' });
  }

  const innerDir = path.join(extractDir, folder);
  const srcRoot = fs.existsSync(innerDir) ? innerDir : extractDir;
  fs.cpSync(srcRoot, TOOLS_DIR, { recursive: true, force: true });

  if (process.platform !== 'win32' && fs.existsSync(targetBin)) {
    fs.chmodSync(targetBin, 0o755);
  }

  fs.rmSync(zipPath, { force: true });
  fs.rmSync(extractDir, { recursive: true, force: true });
  log(`Installed Rhubarb Lip-Sync v${RHUBARB_VERSION} into ./tools/rhubarb/${binName}`);
}

function checkFfmpeg() {
  try {
    const out = execSync('ffmpeg -version', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    log(`FFmpeg detected: ${out.split(/\r?\n/)[0]}`);
  } catch {
    console.warn('\n[WARNING] FFmpeg was NOT found on your PATH!');
    if (process.platform === 'win32') {
      console.warn('  Install on Windows (PowerShell): winget install Gyan.FFmpeg');
    } else if (process.platform === 'darwin') {
      console.warn('  Install on macOS: brew install ffmpeg');
    } else {
      console.warn('  Install on Ubuntu/Debian: sudo apt update && sudo apt install -y ffmpeg');
    }
    console.warn('  Or set FFMPEG_PATH="C:\\path\\to\\ffmpeg.exe" in your .env file.\n');
  }
}

function checkPythonOptional() {
  const pyCmd = process.platform === 'win32' ? 'python' : 'python3';
  try {
    const pyVer = execSync(`${pyCmd} --version`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    log(`Python detected: ${pyVer}`);
    try {
      execSync(`${pyCmd} -c "import faster_whisper"`, { stdio: 'ignore' });
      log('Optional faster-whisper Python package is installed (local transcription ready).');
    } catch {
      log('Optional: To enable Faster-Whisper word transcription & OmniVoice CLI, run: pip install -r requirements.txt');
    }
  } catch {
    log('Python not detected (optional — Edge TTS, Rhubarb & FFmpeg render run 100% in Node.js).');
  }
}

function ensureEnvFile() {
  const envPath = path.join(ROOT, '.env');
  const examplePath = path.join(ROOT, '.env.example');
  if (!fs.existsSync(envPath) && fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, envPath);
    log('Created .env from .env.example (no paid API keys required for core features!)');
  }
}

async function main() {
  log(`ccavatarstudio Setup — Node.js ${process.version} on ${process.platform} (${process.arch})`);
  ensureEnvFile();
  await installRhubarb();
  checkFfmpeg();
  checkPythonOptional();
  log('Setup complete! Run "npm run dev" to launch ccavatarstudio on http://localhost:3000');
}

main().catch((err) => {
  console.error('[Setup Error]', err.message);
  process.exit(1);
});
