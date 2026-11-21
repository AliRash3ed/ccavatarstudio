import React from 'react';
import {
  Mic,
  Upload,
  Play,
  Volume2,
  Clock,
  Sparkles,
  Search,
  Sliders,
  AudioWaveform,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { ScriptLanguageCode } from '../../types/character';

export interface EdgeVoiceItem {
  shortName: string;
  friendlyName: string;
  locale: string;
  localeName: string;
  languageCode: string;
  gender: 'Male' | 'Female' | string;
}

export interface EdgeLocaleSummary {
  locale: string;
  languageCode: string;
  label: string;
  count: number;
}

interface VoicePipelinePanelProps {
  voiceTab: 'tts' | 'whisper' | 'clone';
  setVoiceTab: (tab: 'tts' | 'whisper' | 'clone') => void;
  isLoadingVoices: boolean;
  edgeVoices: EdgeVoiceItem[];
  filteredEdgeVoices: EdgeVoiceItem[];
  edgeLocales: EdgeLocaleSummary[];
  voiceLocaleFilter: string;
  setVoiceLocaleFilter: (loc: string) => void;
  voiceGenderFilter: 'all' | 'Male' | 'Female';
  setVoiceGenderFilter: (g: 'all' | 'Male' | 'Female') => void;
  voiceSearch: string;
  setVoiceSearch: (s: string) => void;
  selectedEdgeVoice: string;
  setSelectedEdgeVoice: (v: string) => void;
  setScriptLang: (l: ScriptLanguageCode) => void;
  recognizerMode: 'phonetic' | 'pocketSphinx';
  setRecognizerMode: (r: 'phonetic' | 'pocketSphinx') => void;
  pauseGapSec: number;
  setPauseGapSec: (s: number) => void;
  isRunningTts: boolean;
  onRunRealEdgeTts: () => void;
  lastPipelineStats: string | null;
  audioUrl: string | null;
  audioDuration: number;
  activeCharacterName: string;
  onDownloadRhubarbJson: () => void;
  wordTranscriptPreview: string;
  uploadedAudioFile: File | null;
  serverMediaId: string | null;
  isRunningRhubarb: boolean;
  isTranscribingWhisper: boolean;
  alignmentInput: string;
  onLoadSampleWhisper: () => void;
  onAudioUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onWhisperFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRunRealRhubarbCli: () => void;
  onRunFasterWhisper: () => void;
  onTranscribeAndSync?: () => void;
  liveEtaProgress?: { stage: string; percent: number; message: string; eta: string } | null;
  onAlignmentInput: (val: string) => void;
  onAutoDirect?: () => void;
  isAnalyzingScript?: boolean;
  pythonVersion?: string | null;
  omniLang?: string;
  setOmniLang?: (l: string) => void;
  omniRefAudio?: string;
  setOmniRefAudio?: (r: string) => void;
  edgeCliCommand?: string;
  omniCliCommand?: string;
  copiedKey?: string | null;
  onCopyToClipboard?: (txt: string, key: string) => void;
}

export const VoicePipelinePanel: React.FC<VoicePipelinePanelProps> = React.memo(({
  voiceTab,
  setVoiceTab,
  isLoadingVoices,
  edgeVoices,
  filteredEdgeVoices,
  edgeLocales,
  voiceLocaleFilter,
  setVoiceLocaleFilter,
  voiceGenderFilter,
  setVoiceGenderFilter,
  voiceSearch,
  setVoiceSearch,
  selectedEdgeVoice,
  setSelectedEdgeVoice,
  pauseGapSec,
  setPauseGapSec,
  isRunningTts,
  onRunRealEdgeTts,
  lastPipelineStats,
  audioUrl,
  audioDuration,
  activeCharacterName,
  onDownloadRhubarbJson,
  uploadedAudioFile,
  serverMediaId,
  isRunningRhubarb,
  isTranscribingWhisper,
  alignmentInput,
  onAudioUpload,
  onWhisperFileUpload,
  onRunRealRhubarbCli,
  onRunFasterWhisper,
  onTranscribeAndSync,
  liveEtaProgress,
  onAlignmentInput,
  onAutoDirect,
  isAnalyzingScript,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 space-y-4">
      {/* Tab Switcher: 2 Clear, Creator-Friendly Modes */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold">
        <button
          type="button"
          onClick={() => setVoiceTab('tts')}
          className={`py-2 px-3 rounded-md text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            voiceTab === 'tts'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>AI Voice Generator</span>
        </button>

        <button
          type="button"
          onClick={() => setVoiceTab('whisper')}
          className={`py-2 px-3 rounded-md text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            voiceTab === 'whisper' || voiceTab === 'clone'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload Voiceover Audio</span>
        </button>
      </div>

      {/* Mode 1: AI Voice Generator */}
      {voiceTab === 'tts' && (
        <div className="space-y-3.5">
          {isLoadingVoices ? (
            <div className="space-y-2 animate-pulse p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="h-3 w-40 bg-slate-200 rounded" />
              <div className="grid grid-cols-3 gap-2">
                <div className="h-9 bg-white border border-slate-200 rounded" />
                <div className="h-9 bg-white border border-slate-200 rounded" />
                <div className="h-9 bg-white border border-slate-200 rounded" />
              </div>
            </div>
          ) : (
            <>
              {/* Filter Row: Language & Gender */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Language / Region
                  </label>
                  <select
                    value={voiceLocaleFilter}
                    onChange={(e) => setVoiceLocaleFilter(e.target.value)}
                    className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Languages ({edgeVoices.length})</option>
                    {edgeLocales.map((loc) => (
                      <option key={loc.locale} value={loc.languageCode}>
                        {loc.label} ({loc.count})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Gender
                  </label>
                  <select
                    value={voiceGenderFilter}
                    onChange={(e) => setVoiceGenderFilter(e.target.value as 'all' | 'Male' | 'Female')}
                    className="w-full h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Genders</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Search Voice
                  </label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={voiceSearch}
                      onChange={(e) => setVoiceSearch(e.target.value)}
                      placeholder="e.g. Andrew, Zara, Madhur..."
                      className="w-full h-9 pl-8 pr-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Voice Selector Dropdown */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Selected Voice ({filteredEdgeVoices.length} available)
                </label>
                <select
                  value={selectedEdgeVoice}
                  onChange={(e) => setSelectedEdgeVoice(e.target.value)}
                  className="w-full h-10 px-3 bg-indigo-50/50 border border-indigo-200 rounded-lg text-xs font-bold text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {filteredEdgeVoices.map((v) => (
                    <option key={v.shortName} value={v.shortName}>
                      {v.friendlyName} — {v.localeName} ({v.gender})
                    </option>
                  ))}
                </select>
              </div>

              {/* Natural Pause Gap Slider */}
              <div className="flex items-center justify-between gap-4 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-slate-500" />
                  <div>
                    <span className="text-xs font-semibold text-slate-700 block">Pause Gap Between Sentences</span>
                    <span className="text-[10px] text-slate-400">Controls natural breath pacing</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.10"
                    max="0.80"
                    step="0.05"
                    value={pauseGapSec}
                    onChange={(e) => setPauseGapSec(parseFloat(e.target.value))}
                    className="w-24 accent-indigo-600"
                  />
                  <span className="text-xs font-mono font-bold text-slate-800 min-w-[42px] text-right">
                    {pauseGapSec.toFixed(2)}s
                  </span>
                </div>
              </div>

              {/* AI Auto-Apply Emotions & Gestures Button */}
              {onAutoDirect && (
                <button
                  type="button"
                  onClick={onAutoDirect}
                  disabled={isAnalyzingScript}
                  className="w-full h-8 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded-lg border border-indigo-200 flex items-center justify-center gap-1.5 cursor-pointer transition disabled:opacity-50"
                >
                  {isAnalyzingScript ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  )}
                  <span>{isAnalyzingScript ? 'Directing Emotions & Gestures...' : '✨ AI Auto-Apply Emotions & Gestures'}</span>
                </button>
              )}

              {/* Generate Voice Button */}
              <button
                type="button"
                onClick={onRunRealEdgeTts}
                disabled={isRunningTts}
                className="w-full h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                {isRunningTts ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating Neural Voice &amp; Word-Gated Lip Sync...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Voice &amp; Lip Sync</span>
                  </>
                )}
              </button>
            </>
          )}

          {/* Active Audio Status */}
          {audioUrl && (
            <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">
                  Audio Ready: {audioDuration.toFixed(2)}s duration
                </span>
              </div>
              <audio controls src={audioUrl} className="h-7 max-w-[200px]" />
            </div>
          )}

          {lastPipelineStats && (
            <div className="p-2 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-500 font-mono">
              {lastPipelineStats}
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Upload Voiceover Audio (Unified 1-Click Flow) */}
      {(voiceTab === 'whisper' || voiceTab === 'clone') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Voiceover File &amp; Automatic Lip Sync</span>
            </span>
            {uploadedAudioFile && (
              <span className="text-[11px] font-mono font-medium text-emerald-600 dark:text-emerald-400">
                100% Word-Gated Sync
              </span>
            )}
          </div>

          {/* Unified 1-Click Dropzone */}
          <label className="border-2 border-dashed border-indigo-200 dark:border-indigo-800 hover:border-indigo-500 dark:hover:border-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/20 hover:bg-indigo-50/50 p-6 rounded-2xl flex flex-col items-center justify-center gap-2.5 cursor-pointer text-center transition group">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              {isRunningRhubarb || isTranscribingWhisper ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Upload className="w-6 h-6" />
              )}
            </div>
            <div>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100 block">
                {uploadedAudioFile ? uploadedAudioFile.name : 'Drop your voiceover audio here or browse'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                MP3, WAV, M4A, MP4, WebM, MOV · Auto-extracts voiceover, transcribes words, and synchronizes lip-sync
              </span>
            </div>
            <input type="file" accept="audio/*,video/*,.mp4,.mov,.webm,.mkv,.mp3,.wav,.m4a" onChange={onAudioUpload} className="hidden" />
          </label>

          {/* Live Dynamic ETA & Progress Indicator */}
          {(isRunningRhubarb || isTranscribingWhisper || liveEtaProgress) && (
            <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between text-indigo-950 dark:text-indigo-200 font-semibold">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
                  <span>{liveEtaProgress?.message || 'Transcribing speech & analyzing mouth shapes...'}</span>
                </div>
                <span className="font-mono text-[11px] bg-indigo-100 dark:bg-indigo-900 px-2 py-0.5 rounded text-indigo-800 dark:text-indigo-200">
                  ETA {liveEtaProgress?.eta || '~2s'}
                </span>
              </div>
              <div className="w-full bg-indigo-200/60 dark:bg-indigo-900/60 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${liveEtaProgress?.percent || 65}%` }}
                />
              </div>
            </div>
          )}

          {/* Audio Preview & Direct Action Button */}
          {audioUrl && (
            <div className="space-y-3 p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-100 block">
                      {uploadedAudioFile ? uploadedAudioFile.name : 'Voiceover Master'} ({audioDuration.toFixed(2)}s)
                    </span>
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-300">
                      Word boundaries and lip shapes synchronized
                    </span>
                  </div>
                </div>
                <audio controls src={audioUrl} className="h-7 w-full sm:w-auto sm:max-w-[220px]" />
              </div>

              {/* One Clean "Transcribe & Sync Lips" Action Button */}
              <button
                type="button"
                onClick={onTranscribeAndSync || onRunRealRhubarbCli}
                disabled={isRunningRhubarb || isTranscribingWhisper}
                className="w-full h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 transition"
              >
                {isRunningRhubarb || isTranscribingWhisper ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Lip-Sync...</span>
                  </>
                ) : (
                  <>
                    <AudioWaveform className="w-4 h-4" />
                    <span>Transcribe &amp; Sync Lips</span>
                  </>
                )}
              </button>

              {/* AI Auto-Apply Emotions & Gestures Button */}
              {onAutoDirect && (
                <button
                  type="button"
                  onClick={onAutoDirect}
                  disabled={isAnalyzingScript}
                  className="w-full h-8 px-3 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-semibold text-xs rounded-xl border border-indigo-200 dark:border-indigo-800 flex items-center justify-center gap-1.5 cursor-pointer transition disabled:opacity-50"
                >
                  {isAnalyzingScript ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  )}
                  <span>{isAnalyzingScript ? 'Directing Emotions & Gestures...' : '✨ AI Auto-Apply Emotions & Gestures'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
