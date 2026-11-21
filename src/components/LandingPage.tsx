import React, { useState } from 'react';
import { CharacterConfig } from '../types/character';
import { CharacterStage } from './CharacterStage';
import {
  ArrowRight,
  Film,
  Users,
  Mic,
  Zap,
  Globe2,
  FolderOpen,
  Volume2,
  ShieldCheck,
  Check,
  X,
} from 'lucide-react';

interface LandingPageProps {
  characters: CharacterConfig[];
  activeCharacter: CharacterConfig;
  onSelectCharacter: (char: CharacterConfig) => void;
  onNavigate: (view: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  characters,
  activeCharacter,
  onSelectCharacter,
  onNavigate,
}) => {
  const [previewChar, setPreviewChar] = useState<CharacterConfig>(activeCharacter);
  const [filterEthnicity, setFilterEthnicity] = useState<string>('all');

  // Featured regional cast representing Pakistan, India, Japan, UK, USA, Nigeria
  const featuredIds = [15, 1, 10, 3, 6, 24];
  const quickCast = featuredIds
    .map((id) => characters.find((c) => c.id === id))
    .filter((c): c is CharacterConfig => Boolean(c));

  const filteredCharacters = characters.filter((c) => {
    if (filterEthnicity === 'all') return true;
    if (filterEthnicity === 'pakistan') return c.country === 'Pakistan';
    if (filterEthnicity === 'south-asian') return c.ethnicity === 'south-asian';
    if (filterEthnicity === 'asian') return c.ethnicity === 'asian' || c.group === 'asian';
    if (filterEthnicity === 'british') return c.ethnicity === 'british' || c.country === 'United Kingdom';
    if (filterEthnicity === 'african') return c.ethnicity === 'african';
    return true;
  });

  return (
    <div className="w-full space-y-16 py-6">
      {/* HERO SECTION */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Left Column: Direct Positioning & Value */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-4">
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-[1.12]">
              The free, offline cartoon alternative to HeyGen
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
              Generate talking 2D animated presenters from your voiceover or script in seconds. Runs 100% locally on your computer with zero cloud wait times, unlimited renders, and real word-gated lip-sync.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                onSelectCharacter(previewChar);
                onNavigate('videostudio');
              }}
              className="h-11 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition"
            >
              <Film className="w-4 h-4" />
              <span>Launch Studio ({previewChar.flag} {previewChar.name})</span>
              <ArrowRight className="w-4 h-4 -mr-0.5" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('roster')}
              className="h-11 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-sm rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition"
            >
              <Users className="w-4 h-4 text-slate-500" />
              <span>Explore 24 Global Presenters</span>
            </button>
          </div>

          {/* Honest Feature Strip: Why Creators Choose Local Over Cloud */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-200/80">
            <div className="space-y-1">
              <div className="font-semibold text-xs text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span>Zero Subscription Fees</span>
              </div>
              <p className="text-xs text-slate-500 leading-normal">
                Free forever with unlimited 1080p exports on your PC. No credits or monthly fees.
              </p>
            </div>

            <div className="space-y-1">
              <div className="font-semibold text-xs text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                <span>Faster than Cloud</span>
              </div>
              <p className="text-xs text-slate-500 leading-normal">
                Renders in seconds on your GPU or CPU without waiting in a 10-minute cloud queue.
              </p>
            </div>

            <div className="space-y-1">
              <div className="font-semibold text-xs text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-700 shrink-0" />
                <span>Private &amp; Offline</span>
              </div>
              <p className="text-xs text-slate-500 leading-normal">
                Your audio files and scripts never leave your machine. Zero API keys required.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Live Studio Stage Device Mockup */}
        <div className="lg:col-span-5 bg-slate-900 rounded-2xl p-5 shadow-lg border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-2 font-mono text-[11px] text-slate-400">1080p Stage Preview</span>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 font-medium">
              30 FPS · Real-Time
            </span>
          </div>

          <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center min-h-[300px] p-4">
            <div className="transform scale-[0.92] sm:scale-100 origin-center transition-transform">
              <CharacterStage
                character={previewChar}
                framing="portrait"
                scale={0.92}
                flatShading={false}
              />
            </div>

            <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-slate-700/80 text-[11px] text-slate-200 font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>Live Stage View</span>
            </div>

            <div className="absolute bottom-3 left-3 right-3 bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-700/80 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Volume2 className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="text-slate-200 font-mono text-[11px] truncate">
                  "Word-gated lips close naturally on speech pauses"
                </span>
              </div>
              <span className="text-[10px] font-mono text-indigo-300 font-medium shrink-0">
                {previewChar.flag} {previewChar.country}
              </span>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <span className="text-xs text-slate-400 block px-0.5">
              Select presenter to preview on stage:
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {quickCast.map((char) => {
                const isSelected = previewChar.id === char.id;
                return (
                  <button
                    key={char.id}
                    type="button"
                    onClick={() => {
                      setPreviewChar(char);
                      onSelectCharacter(char);
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold truncate transition cursor-pointer border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                        : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {char.flag} {char.name.split(' ')[0]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CLOUD VS LOCAL COMPARISON STRIP */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="max-w-2xl space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Why creators switch from cloud AI video tools
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Compare monthly cloud services with ccavatarstudio’s local offline architecture.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cloud Tools Card */}
          <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-700">Cloud AI Presenter Tools (HeyGen, Synthesia, D-ID)</span>
              <span className="text-[11px] font-mono text-slate-400">$29 to $99/mo</span>
            </div>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>Queue delays: 5 to 15 minute render wait per test video</span>
              </li>
              <li className="flex items-start gap-2">
                <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>Strict monthly credit limits (usually 5 to 15 video minutes)</span>
              </li>
              <li className="flex items-start gap-2">
                <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>Requires uploading private voiceover audio to third-party servers</span>
              </li>
              <li className="flex items-start gap-2">
                <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>Expensive enterprise tiers to remove watermarks and export 1080p</span>
              </li>
            </ul>
          </div>

          {/* ccavatarstudio Card */}
          <div className="p-5 bg-orange-50/40 border border-orange-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-orange-200">
              <span className="text-xs font-bold text-slate-900">ccavatarstudio</span>
              <span className="text-[11px] font-mono text-orange-700 font-semibold bg-orange-100 px-2 py-0.5 rounded">Free Forever</span>
            </div>
            <ul className="space-y-2 text-xs text-indigo-950 font-medium">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Renders immediately in seconds on your own CPU or GPU</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Unlimited 1080p video exports with zero minute restrictions</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>100% private: runs offline on your machine with zero server uploads</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Full deterministic H.264 MP4 and Transparent WebM alpha exports</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* THREE PILLARS (Clean Spacing, No Buzzwords) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3 shadow-xs">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Mic className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Word-Gated Lip Sync</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Speech pauses and word gaps are automatically detected. Mouth shapes open accurately during words and close to neutral rest during silence without awkward lingering motion.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3 shadow-xs">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Globe2 className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">320+ Voices or Your Audio</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Synthesize speech in 70+ languages with emotional pitch inflection, or drag-and-drop your own recorded voiceover to automatically extract word timestamps and animate lips.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3 shadow-xs">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Ultra-Fast 1080p Rendering</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Export deterministic 30fps H.264 MP4 or transparent VP9 WebM video files saved directly into your local folder without dealing with remote cloud queues.
          </p>
        </div>
      </section>

      {/* PRESENTER GALLERY SECTION */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-slate-900">
              Presenter Gallery (24 Characters)
            </h2>
            <p className="text-xs text-slate-500">
              Articulated vector characters from Pakistan, India, Japan, UK, USA, Nigeria, and Europe.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
            {[
              { id: 'all', label: 'All 24' },
              { id: 'pakistan', label: '🇵🇰 Pakistan' },
              { id: 'south-asian', label: '🇮🇳 India' },
              { id: 'asian', label: '🇯🇵 / 🇰🇷 East Asia' },
              { id: 'british', label: '🇬🇧 UK / Europe' },
              { id: 'african', label: '🇳🇬 Africa' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterEthnicity(tab.id)}
                className={`h-7 px-3 text-xs font-medium rounded-lg transition cursor-pointer ${
                  filterEthnicity === tab.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredCharacters.map((char) => (
            <div
              key={char.id}
              onClick={() => {
                onSelectCharacter(char);
                onNavigate('videostudio');
              }}
              className="group bg-white border border-slate-200 hover:border-indigo-300 rounded-xl p-3 flex flex-col justify-between space-y-2 cursor-pointer shadow-xs hover:shadow-sm transition"
            >
              <div className="w-full h-32 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 overflow-hidden flex items-center justify-center group-hover:bg-indigo-50/20 transition-colors">
                <CharacterStage
                  character={char}
                  framing="portrait"
                  scale={0.88}
                  background="transparent"
                  flatShading={false}
                />
              </div>

              <div className="space-y-0.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 truncate">
                    {char.flag} {char.name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    #{String(char.id).padStart(2, '0')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate leading-tight">
                  {char.country} · {char.role}
                </p>
              </div>

              <button
                type="button"
                className="w-full py-1 text-[11px] font-semibold text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white rounded-md transition border border-transparent group-hover:border-indigo-600 cursor-pointer flex items-center justify-center gap-1"
              >
                <span>Select Presenter</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className="bg-slate-900 text-white rounded-2xl p-8 sm:p-12 text-center space-y-5">
        <div className="max-w-xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold">
            Ready to animate your first presenter video?
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Free forever, runs locally on your PC, and zero subscriptions or API keys needed.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              onSelectCharacter(activeCharacter);
              onNavigate('videostudio');
            }}
            className="h-11 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition"
          >
            <Film className="w-4 h-4" />
            <span>Launch Video Studio ({activeCharacter.flag} {activeCharacter.name})</span>
            <ArrowRight className="w-4 h-4 -mr-0.5" />
          </button>
        </div>
      </section>
    </div>
  );
};
