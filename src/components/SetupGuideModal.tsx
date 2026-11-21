import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  KeyRound,
  CheckCircle2,
  FolderOpen,
  Sparkles,
  HardDrive,
  Cpu,
  Layers,
  Mic,
  AudioWaveform,
  Settings2,
  Check,
  Copy,
  ExternalLink,
  Save,
  Terminal,
} from 'lucide-react';
import { EngineCapabilities } from '../types/capabilities';

export interface StudioCustomSettings {
  llmProvider: 'auto' | 'gemini' | 'openrouter' | 'openai' | 'anthropic' | 'custom';
  openaiApiKey?: string;
  openaiModel?: string;
  anthropicApiKey?: string;
  anthropicModel?: string;
  openrouterApiKey?: string;
  openrouterModel?: string;
  geminiApiKey?: string;
  geminiModel?: string;
  customLlmBaseUrl?: string;
  customLlmModel?: string;
  customLlmApiKey?: string;

  voiceoverEngine: 'edge-tts' | 'elevenlabs' | 'openai-tts' | 'custom-tts';
  elevenlabsApiKey?: string;
  elevenlabsVoiceId?: string;
  openaiTtsApiKey?: string;
  openaiTtsVoice?: string;
  openaiTtsModel?: string;
  customTtsEndpoint?: string;
  customTtsApiKey?: string;
  customTtsHeaderName?: string;
  customTtsVoiceId?: string;
  customTtsFormat?: 'audio/mpeg' | 'audio/wav';

  transcriptionEngine: 'faster-whisper' | 'groq-whisper' | 'openai-whisper' | 'deepgram' | 'custom-whisper' | 'rhubarb-phonetic';
  transcriptionApiKey?: string;
  localWhisperPath?: string;
  customWhisperEndpoint?: string;
  customWhisperApiKey?: string;
  customWhisperModel?: string;

  customExportDir?: string;
}

const SETTINGS_STORAGE_KEY = 'ccavatarstudio_custom_settings';
const LEGACY_SETTINGS_STORAGE_KEY = 'persona_studio_custom_settings';

export const getStoredCustomSettings = (): StudioCustomSettings => {
  if (typeof window === 'undefined') {
    return {
      llmProvider: 'auto',
      voiceoverEngine: 'edge-tts',
      transcriptionEngine: 'faster-whisper',
    };
  }
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY) || localStorage.getItem(LEGACY_SETTINGS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {
    llmProvider: 'auto',
    voiceoverEngine: 'edge-tts',
    transcriptionEngine: 'faster-whisper',
  };
};

interface SetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  engineCaps?: EngineCapabilities | null;
}

export const SetupGuideModal: React.FC<SetupGuideModalProps> = ({
  isOpen,
  onClose,
  engineCaps,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [activeTab, setActiveTab] = useState<'engines' | 'llm' | 'voice' | 'transcription' | 'export'>('engines');
  const [settings, setSettings] = useState<StudioCustomSettings>(getStoredCustomSettings);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (isOpen && !d.open) {
      d.showModal();
      setSettings(getStoredCustomSettings());
    } else if (!isOpen && d.open) {
      d.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    const handleClose = () => onClose();
    d.addEventListener('close', handleClose);
    return () => d.removeEventListener('close', handleClose);
  }, [onClose]);

  const handleSave = () => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (e) {}
  };

  const copyToClipboard = (txt: string, id: string) => {
    navigator.clipboard.writeText(txt);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="settings-dialog-title"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-800 dark:text-slate-100 w-full max-w-2xl max-h-[90vh] overflow-y-auto backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Settings2 className="w-5 h-5" />
          </div>
          <div>
            <h3 id="settings-dialog-title" className="text-base font-bold text-slate-900 dark:text-white">
              Studio Settings &amp; Custom Engines
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure custom LLMs, speech voices, transcription tools, and local export paths
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close"
          className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 py-3 border-b border-slate-100 dark:border-slate-800 overflow-x-auto text-xs font-semibold">
        {[
          { id: 'engines', label: 'Local Status', icon: Cpu },
          { id: 'llm', label: 'AI Director (LLM)', icon: Sparkles },
          { id: 'voice', label: 'Voiceover Engine', icon: Mic },
          { id: 'transcription', label: 'Transcription & Sync', icon: AudioWaveform },
          { id: 'export', label: 'Export Path', icon: FolderOpen },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`h-8 px-3 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
                active
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="py-4 space-y-4">
        {/* TAB 1: LOCAL STATUS */}
        {activeTab === 'engines' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-xl flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">Rhubarb CLI</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {engineCaps?.rhubarb?.installed ? `v${engineCaps.rhubarb.version || '1.14.0'}` : 'tools/rhubarb/'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-xl flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">FFmpeg</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">1080p MP4 Ready</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-xl flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">Edge Neural TTS</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">320+ Voices (Free)</span>
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-indigo-600" />
                <span>Automatic Setup on Git Clone</span>
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                When you clone ccavatarstudio and run <code className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[11px] font-mono">npm install</code>, the postinstall hook automatically downloads official Rhubarb Lip-Sync v1.14.0 for your OS into <code className="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[11px] font-mono">./tools/rhubarb/</code>, verifies FFmpeg, and initializes <code className="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[11px] font-mono">.env</code>.
              </p>
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded-lg font-mono text-xs">
                <code>pip install faster-whisper</code>
                <button
                  type="button"
                  onClick={() => copyToClipboard('pip install faster-whisper', 'whisper')}
                  className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 flex items-center gap-1 cursor-pointer"
                >
                  {copiedCmd === 'whisper' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCmd === 'whisper' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AI DIRECTOR (LLM) */}
        {activeTab === 'llm' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                AI Script Directing Provider
              </label>
              <select
                value={settings.llmProvider}
                onChange={(e) => setSettings({ ...settings, llmProvider: e.target.value as any })}
                className="w-full h-9 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="auto">Auto / Built-in Offline Director (Zero API Keys)</option>
                <option value="openai">OpenAI (GPT-4o, GPT-4o-mini, o3-mini)</option>
                <option value="anthropic">Anthropic (Claude 3.5 Sonnet / Haiku)</option>
                <option value="openrouter">OpenRouter (Free Tier, Llama 3.3, DeepSeek)</option>
                <option value="gemini">Google Gemini API (Gemini 2.5 Flash / Pro)</option>
                <option value="custom">Custom Endpoint (Ollama, LocalAI, vLLM, LMStudio)</option>
              </select>
            </div>

            {settings.llmProvider === 'openai' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    OpenAI API Key
                  </label>
                  <input
                    type="password"
                    placeholder="sk-proj-..."
                    value={settings.openaiApiKey || ''}
                    onChange={(e) => setSettings({ ...settings, openaiApiKey: e.target.value })}
                    className="w-full h-8 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Model Selector
                  </label>
                  <select
                    value={settings.openaiModel || 'gpt-4o-mini'}
                    onChange={(e) => setSettings({ ...settings, openaiModel: e.target.value })}
                    className="w-full h-8 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200"
                  >
                    <option value="gpt-4o-mini">gpt-4o-mini (Recommended · Ultra Fast)</option>
                    <option value="gpt-4o">gpt-4o (Flagship Multimodal)</option>
                    <option value="o3-mini">o3-mini (High-Reasoning)</option>
                    <option value="custom">Custom Model...</option>
                  </select>
                </div>
                {settings.openaiModel === 'custom' && (
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                      Custom OpenAI Model Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. gpt-4-turbo"
                      value={settings.openaiModel === 'custom' ? '' : (settings.openaiModel || '')}
                      onChange={(e) => setSettings({ ...settings, openaiModel: e.target.value })}
                      className="w-full h-8 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200"
                    />
                  </div>
                )}
              </div>
            )}

            {settings.llmProvider === 'anthropic' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Anthropic API Key
                  </label>
                  <input
                    type="password"
                    placeholder="sk-ant-..."
                    value={settings.anthropicApiKey || ''}
                    onChange={(e) => setSettings({ ...settings, anthropicApiKey: e.target.value })}
                    className="w-full h-8 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Model Selector
                  </label>
                  <select
                    value={settings.anthropicModel || 'claude-3-5-sonnet-latest'}
                    onChange={(e) => setSettings({ ...settings, anthropicModel: e.target.value })}
                    className="w-full h-8 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200"
                  >
                    <option value="claude-3-5-sonnet-latest">claude-3-5-sonnet-latest (Recommended)</option>
                    <option value="claude-3-5-haiku-latest">claude-3-5-haiku-latest (Fast)</option>
                    <option value="custom">Custom Model...</option>
                  </select>
                </div>
                {settings.anthropicModel === 'custom' && (
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                      Custom Anthropic Model Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. claude-3-opus-20240229"
                      value={settings.anthropicModel === 'custom' ? '' : (settings.anthropicModel || '')}
                      onChange={(e) => setSettings({ ...settings, anthropicModel: e.target.value })}
                      className="w-full h-8 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200"
                    />
                  </div>
                )}
              </div>
            )}

            {settings.llmProvider === 'openrouter' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    OpenRouter API Key
                  </label>
                  <input
                    type="password"
                    placeholder="sk-or-..."
                    value={settings.openrouterApiKey || ''}
                    onChange={(e) => setSettings({ ...settings, openrouterApiKey: e.target.value })}
                    className="w-full h-8 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Model Selector
                  </label>
                  <select
                    value={settings.openrouterModel || 'openrouter/free'}
                    onChange={(e) => setSettings({ ...settings, openrouterModel: e.target.value })}
                    className="w-full h-8 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200"
                  >
                    <option value="openrouter/free">openrouter/free (Auto Free Tier)</option>
                    <option value="meta-llama/llama-3.3-70b-instruct:free">meta-llama/llama-3.3-70b-instruct:free</option>
                    <option value="deepseek/deepseek-chat-v3-0324:free">deepseek/deepseek-chat-v3-0324:free</option>
                    <option value="google/gemini-2.0-flash-exp:free">google/gemini-2.0-flash-exp:free</option>
                    <option value="custom">Custom Model...</option>
                  </select>
                </div>
                {settings.openrouterModel === 'custom' && (
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                      Custom OpenRouter Model ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. qwen/qwen-2.5-72b-instruct"
                      value={settings.openrouterModel === 'custom' ? '' : (settings.openrouterModel || '')}
                      onChange={(e) => setSettings({ ...settings, openrouterModel: e.target.value })}
                      className="w-full h-8 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200"
                    />
                  </div>
                )}
              </div>
            )}

            {settings.llmProvider === 'gemini' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Google Gemini API Key
                  </label>
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={settings.geminiApiKey || ''}
                    onChange={(e) => setSettings({ ...settings, geminiApiKey: e.target.value })}
                    className="w-full h-8 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Model Selector
                  </label>
                  <select
                    value={settings.geminiModel || 'gemini-2.5-flash'}
                    onChange={(e) => setSettings({ ...settings, geminiModel: e.target.value })}
                    className="w-full h-8 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200"
                  >
                    <option value="gemini-2.5-flash">gemini-2.5-flash (Recommended · Fast)</option>
                    <option value="gemini-2.5-pro">gemini-2.5-pro (Advanced Nuance)</option>
                    <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                    <option value="custom">Custom Model...</option>
                  </select>
                </div>
                {settings.geminiModel === 'custom' && (
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                      Custom Gemini Model ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. gemini-2.0-pro-exp"
                      value={settings.geminiModel === 'custom' ? '' : (settings.geminiModel || '')}
                      onChange={(e) => setSettings({ ...settings, geminiModel: e.target.value })}
                      className="w-full h-8 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200"
                    />
                  </div>
                )}
              </div>
            )}

            {settings.llmProvider === 'custom' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Custom Base URL (OpenAI compatible)
                  </label>
                  <input
                    type="text"
                    placeholder="http://localhost:11434/v1"
                    value={settings.customLlmBaseUrl || ''}
                    onChange={(e) => setSettings({ ...settings, customLlmBaseUrl: e.target.value })}
                    className="w-full h-8 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Works with Ollama (http://localhost:11434/v1), vLLM (http://localhost:8000/v1), LocalAI, LMStudio
                  </span>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Custom Endpoint API Key (Optional)
                  </label>
                  <input
                    type="password"
                    placeholder="Bearer token or API Key (leave empty for local Ollama)"
                    value={settings.customLlmApiKey || ''}
                    onChange={(e) => setSettings({ ...settings, customLlmApiKey: e.target.value })}
                    className="w-full h-8 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Model Identifier
                  </label>
                  <input
                    type="text"
                    placeholder="llama3.2:latest, deepseek-r1, or mistral"
                    value={settings.customLlmModel || ''}
                    onChange={(e) => setSettings({ ...settings, customLlmModel: e.target.value })}
                    className="w-full h-8 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: VOICEOVER ENGINE */}
        {activeTab === 'voice' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Default Voiceover Engine
              </label>
              <select
                value={settings.voiceoverEngine}
                onChange={(e) => setSettings({ ...settings, voiceoverEngine: e.target.value as any })}
                className="w-full h-9 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="edge-tts">Microsoft Edge Neural TTS (Free · 320+ Global Voices · Zero Key)</option>
                <option value="elevenlabs">ElevenLabs Custom API</option>
                <option value="openai-tts">OpenAI Speech API (alloy, echo, nova, onyx, shimmer)</option>
                <option value="custom-tts">Bring Your Own Voiceover / Custom TTS Webhook API</option>
              </select>
            </div>

            {settings.voiceoverEngine === 'custom-tts' && (
              <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Bring Your Own Voiceover / TTS Webhook
                </span>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Custom TTS Endpoint URL
                  </label>
                  <input
                    type="text"
                    placeholder="https://api.elevenlabs.io/v1/text-to-speech/{voice_id} or http://localhost:5002/api/tts"
                    value={settings.customTtsEndpoint || ''}
                    onChange={(e) => setSettings({ ...settings, customTtsEndpoint: e.target.value })}
                    className="w-full h-8 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                      API Key / Secret Token
                    </label>
                    <input
                      type="password"
                      placeholder="Optional auth token..."
                      value={settings.customTtsApiKey || ''}
                      onChange={(e) => setSettings({ ...settings, customTtsApiKey: e.target.value })}
                      className="w-full h-8 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                      Auth Header Name
                    </label>
                    <input
                      type="text"
                      placeholder="Authorization (or xi-api-key)"
                      value={settings.customTtsHeaderName || ''}
                      onChange={(e) => setSettings({ ...settings, customTtsHeaderName: e.target.value })}
                      className="w-full h-8 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                      Voice ID / Speaker
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 21m00Tcm4TlvDq8ikWAM or voice-1"
                      value={settings.customTtsVoiceId || ''}
                      onChange={(e) => setSettings({ ...settings, customTtsVoiceId: e.target.value })}
                      className="w-full h-8 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                      Audio Format Expected
                    </label>
                    <select
                      value={settings.customTtsFormat || 'audio/mpeg'}
                      onChange={(e) => setSettings({ ...settings, customTtsFormat: e.target.value as any })}
                      className="w-full h-8 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200"
                    >
                      <option value="audio/mpeg">MP3 (audio/mpeg)</option>
                      <option value="audio/wav">WAV (audio/wav)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {settings.voiceoverEngine === 'elevenlabs' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    ElevenLabs API Key
                  </label>
                  <input
                    type="password"
                    placeholder="xi_api_key_..."
                    value={settings.elevenlabsApiKey || ''}
                    onChange={(e) => setSettings({ ...settings, elevenlabsApiKey: e.target.value })}
                    className="w-full h-8 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Voice ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="21m00Tcm4TlvDq8ikWAM"
                    value={settings.elevenlabsVoiceId || ''}
                    onChange={(e) => setSettings({ ...settings, elevenlabsVoiceId: e.target.value })}
                    className="w-full h-8 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>
            )}

            {settings.voiceoverEngine === 'openai-tts' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    OpenAI API Key
                  </label>
                  <input
                    type="password"
                    placeholder="sk-..."
                    value={settings.openaiTtsApiKey || ''}
                    onChange={(e) => setSettings({ ...settings, openaiTtsApiKey: e.target.value })}
                    className="w-full h-8 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                      Voice Name
                    </label>
                    <select
                      value={settings.openaiTtsVoice || 'alloy'}
                      onChange={(e) => setSettings({ ...settings, openaiTtsVoice: e.target.value })}
                      className="w-full h-8 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200"
                    >
                      <option value="alloy">alloy (Neutral)</option>
                      <option value="echo">echo (Warm male)</option>
                      <option value="fable">fable (British)</option>
                      <option value="onyx">onyx (Deep male)</option>
                      <option value="nova">nova (Energetic female)</option>
                      <option value="shimmer">shimmer (Clear female)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                      Model Quality
                    </label>
                    <select
                      value={settings.openaiTtsModel || 'tts-1'}
                      onChange={(e) => setSettings({ ...settings, openaiTtsModel: e.target.value })}
                      className="w-full h-8 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200"
                    >
                      <option value="tts-1">tts-1 (Standard · Low Latency)</option>
                      <option value="tts-1-hd">tts-1-hd (High Definition)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: TRANSCRIPTION ENGINE */}
        {activeTab === 'transcription' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Speech Transcription &amp; Timestamping Engine
              </label>
              <select
                value={settings.transcriptionEngine}
                onChange={(e) => setSettings({ ...settings, transcriptionEngine: e.target.value as any })}
                className="w-full h-9 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="faster-whisper">Local Faster-Whisper (Python offline · zero cloud upload)</option>
                <option value="groq-whisper">Groq Whisper API (Ultra-fast cloud Whisper)</option>
                <option value="openai-whisper">OpenAI Whisper Cloud API</option>
                <option value="deepgram">Deepgram Nova-2 API</option>
                <option value="custom-whisper">Bring Your Own Whisper / Custom ASR API Endpoint</option>
                <option value="rhubarb-phonetic">Rhubarb Phonetic Only (No word pauses gating)</option>
              </select>
            </div>

            {settings.transcriptionEngine === 'custom-whisper' && (
              <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Bring Your Own Whisper / Custom ASR Endpoint
                </span>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Custom Transcription Endpoint URL
                  </label>
                  <input
                    type="text"
                    placeholder="http://localhost:9000/asr or https://api.groq.com/openai/v1/audio/transcriptions"
                    value={settings.customWhisperEndpoint || ''}
                    onChange={(e) => setSettings({ ...settings, customWhisperEndpoint: e.target.value })}
                    className="w-full h-8 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                      API Key (Optional)
                    </label>
                    <input
                      type="password"
                      placeholder="Bearer token or API key..."
                      value={settings.customWhisperApiKey || ''}
                      onChange={(e) => setSettings({ ...settings, customWhisperApiKey: e.target.value })}
                      className="w-full h-8 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                      Model Identifier
                    </label>
                    <input
                      type="text"
                      placeholder="whisper-large-v3, base, etc."
                      value={settings.customWhisperModel || ''}
                      onChange={(e) => setSettings({ ...settings, customWhisperModel: e.target.value })}
                      className="w-full h-8 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>
              </div>
            )}

            {settings.transcriptionEngine !== 'faster-whisper' && settings.transcriptionEngine !== 'rhubarb-phonetic' && settings.transcriptionEngine !== 'custom-whisper' && (
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  API Key for {settings.transcriptionEngine}
                </label>
                <input
                  type="password"
                  placeholder="API Key..."
                  value={settings.transcriptionApiKey || ''}
                  onChange={(e) => setSettings({ ...settings, transcriptionApiKey: e.target.value })}
                  className="w-full h-8 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200"
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 5: EXPORT PATH */}
        {activeTab === 'export' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Local Render Directory
              </label>
              <input
                type="text"
                placeholder="./exports/"
                value={settings.customExportDir || engineCaps?.exportDir || './exports/'}
                onChange={(e) => setSettings({ ...settings, customExportDir: e.target.value })}
                className="w-full h-9 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200"
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1">
                Deterministic MP4 and WebM videos are saved into subfolders inside this location on your PC.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Settings are stored privately in your browser storage.
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition"
          >
            {isSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{isSaved ? 'Saved!' : 'Save Settings'}</span>
          </button>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="h-9 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl cursor-pointer transition"
          >
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
};
