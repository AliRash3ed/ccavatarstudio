import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Film,
  KeyRound,
  Layers,
  Terminal,
} from 'lucide-react';

interface DocsCaps {
  rhubarb?: { installed: boolean; version: string | null };
  ffmpeg?: { installed: boolean; version: string | null };
  python?: { installed: boolean; version: string | null };
  geminiConfigured?: boolean;
  openrouterConfigured?: boolean;
  hfTokensConfigured?: number;
  exportDir?: string;
}

const README_MARKDOWN = `# ccavatarstudio — Cartoon AI Avatar & Voiceover Studio
# 2D Modular Avatar, Rhubarb Lip-Sync & Multilingual Video Studio

## 1. Local PC Installation (Windows, macOS, Linux)
Requires Node.js v22+ and FFmpeg. Optional Python 3.10+ for Faster-Whisper & OmniVoice cloning.

\`\`\`bash
npm install
npm run setup
npm run dev
\`\`\`
Open http://localhost:3000 in your browser.

## 2. Optional Environment Variables (.env)
- GEMINI_API_KEY="your_gemini_key"       # Optional: enhances AI Auto-Direct emotion/gesture tagging
- OPENROUTER_API_KEY="your_or_key"     # Optional: OpenRouter fallback / model selector
- HF_TOKEN="hf_primary"                # Optional: OmniVoice cloning script primary token
- HF_TOKEN_2="hf_backup"               # Optional: Automatic HuggingFace quota failover token
- EXPORT_DIR="./exports"               # Local destination for rendered MP4 / Alpha WebM / WAV files

## 3. Zero-Key Built-in Features (Always Available)
- Offline Multilingual Rule Engine (15+ languages, 1-5s cadence cues)
- Offline Hinglish / Roman-Urdu / Urdu -> Devanagari converter
- Microsoft Edge Neural TTS (322+ voices across 142+ locales)
- Rhubarb Lip-Sync CLI v1.14.0 (Phonetic + PocketSphinx acoustic visemes)
- Local FFmpeg H.264 MP4 & Transparent VP9 Alpha WebM renderer

## 4. Exporter Architecture Note (HyperFrames vs Native Exporter)
HyperFrames is NOT installed in this repository. Instead, Persona Studio uses a deterministic
SVG -> HTML5 Canvas -> FFmpeg frame-by-frame pipeline with synchronized arm kinematics,
timed natural blinks, burn-in subtitle toggle, and corner Creator Watermark overlay.
`;

export const DocsView: React.FC = () => {
  const [caps, setCaps] = useState<DocsCaps | null>(null);
  const [loadingCaps, setLoadingCaps] = useState<boolean>(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    setLoadingCaps(true);
    fetch('/api/capabilities')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setCaps(data);
      })
      .catch(() => {})
      .finally(() => setLoadingCaps(false));
  }, []);

  const copyCmd = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    });
  };

  const downloadReadme = () => {
    const blob = new Blob([README_MARKDOWN], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'README.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const quickInstall = `npm install\nnpm run setup\nnpm run dev`;
  const envExample = `GEMINI_API_KEY="optional_key"\nOPENROUTER_API_KEY="optional_key"\nHF_TOKEN="optional_primary_hf"\nHF_TOKEN_2="optional_backup_hf"\nEXPORT_DIR="./exports"`;

  return (
    <div className="w-full space-y-6">
      {/* Header Banner */}
      <div className="nb-card p-5 bg-[#FFFFFF] flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-display text-xl font-extrabold text-[#111111] flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            <span>ccavatarstudio Local Setup &amp; Architecture Guide</span>
          </h2>
          <p className="text-xs text-[#444444]">
            Complete PC setup commands, optional API key reference, FFmpeg MP4 / VP9 Alpha render pipeline, and HyperFrames status.
          </p>
        </div>

        <button
          type="button"
          onClick={downloadReadme}
          className="nb-btn nb-btn-primary h-10 px-4 text-xs flex items-center gap-2 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Download README.md</span>
        </button>
      </div>

      {/* Live Binary Probe Status with Skeleton Loader */}
      <div className="nb-card-muted p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase tracking-wider">Live Local Server Capabilities</span>
          <span className="text-[11px] font-mono text-[#444444]">GET /api/capabilities</span>
        </div>

        {loadingCaps ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-pulse">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-14 bg-[#FFFFFF] border-2 border-[#111111] p-2.5 flex flex-col justify-between">
                <div className="h-2.5 w-20 bg-[#D9D5CD]" />
                <div className="h-3 w-28 bg-[#D9D5CD]" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="nb-box p-3 bg-[#FFFFFF]">
              <div className="text-[10px] font-mono uppercase text-[#555555]">Rhubarb Lip-Sync</div>
              <div className="font-bold mt-0.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#111111]" />
                <span>{caps?.rhubarb?.installed ? caps.rhubarb.version : 'Not installed'}</span>
              </div>
            </div>
            <div className="nb-box p-3 bg-[#FFFFFF]">
              <div className="text-[10px] font-mono uppercase text-[#555555]">FFmpeg Video Muxer</div>
              <div className="font-bold mt-0.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#111111]" />
                <span>{caps?.ffmpeg?.installed ? 'Ready (H.264 / VP9)' : 'Missing on PATH'}</span>
              </div>
            </div>
            <div className="nb-box p-3 bg-[#FFFFFF]">
              <div className="text-[10px] font-mono uppercase text-[#555555]">AI Director Keys</div>
              <div className="font-bold mt-0.5 font-mono text-[11px]">
                Gemini: {caps?.geminiConfigured ? 'ON' : 'Offline'} · OR: {caps?.openrouterConfigured ? 'ON' : 'Offline'}
              </div>
            </div>
            <div className="nb-box p-3 bg-[#FFFFFF]">
              <div className="text-[10px] font-mono uppercase text-[#555555]">HyperFrames Engine</div>
              <div className="font-bold mt-0.5 text-[11px] bg-[#FFDE59] inline-block px-1.5 border border-[#111111]">
                Not Installed (Native FFmpeg Active)
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Setup + Env Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="nb-card p-5 bg-[#FFFFFF] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-extrabold flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              <span>1. Quick PC Setup (3 Commands)</span>
            </h3>
            <button
              type="button"
              onClick={() => copyCmd(quickInstall, 'install')}
              className="nb-btn bg-[#F4F0EA] h-8 px-2.5 text-xs flex items-center gap-1 cursor-pointer"
            >
              {copiedKey === 'install' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'install' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <p className="text-xs text-[#333333] leading-relaxed">
            Runs on Windows, macOS, and Linux. Automatically downloads Rhubarb Lip-Sync v1.14.0 into <code>tools/rhubarb/</code>,
            verifies FFmpeg, creates <code>./exports/</code>, and boots ccavatarstudio on port 3000.
          </p>
          <pre className="p-3 bg-[#111111] text-[#7BF1A8] border-2 border-[#111111] rounded text-xs font-mono overflow-x-auto">
            {quickInstall}
          </pre>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
            <div className="nb-box p-2 bg-[#FFFDF7]">
              <div className="font-bold">Windows</div>
              <code>winget install Gyan.FFmpeg</code>
            </div>
            <div className="nb-box p-2 bg-[#FFFDF7]">
              <div className="font-bold">macOS</div>
              <code>brew install ffmpeg</code>
            </div>
            <div className="nb-box p-2 bg-[#FFFDF7]">
              <div className="font-bold">Ubuntu / Linux</div>
              <code>sudo apt install ffmpeg</code>
            </div>
          </div>
        </div>

        <div className="nb-card p-5 bg-[#FFFFFF] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-extrabold flex items-center gap-2">
              <KeyRound className="w-4 h-4" />
              <span>2. Optional .env Keys Reference</span>
            </h3>
            <button
              type="button"
              onClick={() => copyCmd(envExample, 'env')}
              className="nb-btn bg-[#F4F0EA] h-8 px-2.5 text-xs flex items-center gap-1 cursor-pointer"
            >
              {copiedKey === 'env' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'env' ? 'Copied' : 'Copy .env'}</span>
            </button>
          </div>
          <p className="text-xs text-[#333333] leading-relaxed">
            Zero keys are required for Offline Multilingual Directing, Hinglish→Devanagari, Edge Neural TTS, Rhubarb CLI, or FFmpeg rendering.
            Add keys only if you pick Gemini or OpenRouter in the AI Model selector, or run OmniVoice voice cloning.
          </p>
          <pre className="p-3 bg-[#111111] text-[#FFDE59] border-2 border-[#111111] rounded text-xs font-mono overflow-x-auto">
            {envExample}
          </pre>
        </div>
      </div>

      {/* HyperFrames Honest Comparison & Render Guide */}
      <div className="nb-card p-5 bg-[#FFFFFF] space-y-3">
        <h3 className="font-display text-base font-extrabold flex items-center gap-2">
          <Layers className="w-4 h-4" />
          <span>3. Render Pipeline &amp; HyperFrames Status</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed">
          <div className="nb-box p-3.5 bg-[#FFFDF7] space-y-1.5">
            <div className="font-bold uppercase tracking-wider text-[11px] bg-[#FFDE59] inline-block px-2 py-0.5 border border-[#111111]">
              Is HyperFrames Installed?
            </div>
            <p className="text-[#222222]">
              <strong>No</strong> — the external <code>hyperframes</code> package is not installed in ccavatarstudio.
              Instead of relying on an external dependency, ccavatarstudio uses a 100% deterministic built-in pipeline:
              <br />
              <code>CharacterStage SVG → 1080p HTML5 Canvas → FFmpeg libx264 MP4 / libvpx-vp9 Alpha WebM</code>.
            </p>
          </div>

          <div className="nb-box p-3.5 bg-[#FFFDF7] space-y-1.5">
            <div className="font-bold uppercase tracking-wider text-[11px] bg-[#7BF1A8] inline-block px-2 py-0.5 border border-[#111111] flex items-center gap-1 w-fit">
              <Film className="w-3.5 h-3.5" />
              <span>Export Best Practices</span>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-[#222222]">
              <li>Toggle <strong>Subtitles: ON / OFF</strong> before rendering to control burned captions.</li>
              <li>Enable <strong>Creator Watermark</strong> to brand the stage corner in MP4, WebM, and PNG outputs.</li>
              <li>All rendered outputs auto-save inside <code>./exports/&lt;project-slug&gt;/</code>.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
