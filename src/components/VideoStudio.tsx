import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { flushSync } from 'react-dom';
import {
  AiModelSelection,
  AspectRatioType,
  BeardType,
  CapType,
  CharacterConfig,
  ClothesType,
  CueSheetRow,
  EmotionPreset,
  ExportHistoryItem,
  FramingMode,
  GlassesType,
  HandGesture,
  MouthSprite,
  ProjectSnapshot,
  PropType,
  ScriptLanguageCode,
  StageBackgroundType,
  WatermarkConfig,
} from '../types/character';
import { CharacterStage } from './CharacterStage';
import { CueSheetPanel } from './studio/CueSheetPanel';
import { VoicePipelinePanel, EdgeVoiceItem, EdgeLocaleSummary } from './studio/VoicePipelinePanel';
import { WatermarkPanel } from './studio/WatermarkPanel';
import { TemplatePickerModal } from './TemplatePickerModal';
import { getStoredCustomSettings } from './SetupGuideModal';
import { VideoTemplate } from '../data/templates';
import {
  Bookmark,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Columns2,
  Copy,
  Download,
  ExternalLink,
  FileAudio,
  Film,
  FolderOpen,
  History,
  Languages,
  Loader2,
  Lock,
  Play,
  Plus,
  RotateCcw,
  Shirt,
  Sliders,
  Sparkles,
  Square,
  Trash2,
  Undo2,
  Upload,
  Video,
  Volume2,
  CircleDot,
  Layout,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { EMOTIONS_LIST, HAND_GESTURES, STAGE_BACKGROUNDS } from '../data/characters';
import { EngineCapabilities } from '../types/capabilities';
import {
  RhubarbCode,
  RhubarbCue,
  autoAddDirectingCues,
  coalesceMouthCues,
  compileScriptTimeline,
  detectScriptLanguage,
  exportRhubarbJson,
  findMouthCueAtTime,
  mouthSpriteToRhubarbCode,
  parseAlignmentInput,
  rhubarbCodeToMouthSprite,
} from '../utils/scriptDirector';
import {
  LimbConfig,
  computeBlinkAtTime,
  computeWatermarkCoords,
  evaluateLimbPoseAtTime,
} from '../utils/poseEngine';
import { analyzeScriptConversion, toDevanagari } from '../utils/transliterate';
import { formatTimecode, getExportResolution } from '../utils/geometry';

function sanitizeProjectSlug(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'untitled_project';
}

interface VideoStudioProps {
  activeCharacter: CharacterConfig;
  allCharacters: CharacterConfig[];
  onSelectCharacter: (char: CharacterConfig) => void;
  onUpdateCharacter?: (patch: Partial<CharacterConfig>) => void;
  globalHeadTilt: number;
}

interface TimelineSegment {
  id: string;
  start: number;
  end: number;
  spoken: string;
  gesture: HandGesture;
  emotion: EmotionPreset;
  vBlocks: Array<{ start: number; end: number; mouth: MouthSprite; rhubarb: RhubarbCode }>;
}

const DEFAULT_WATERMARK: WatermarkConfig = {
  enabled: true,
  text: '@ccavatarstudio',
  authorName: 'CC Creator',
  position: 'bottom-right',
  opacity: 0.9,
};

const AI_MODEL_CHOICES: Array<{ id: string; label: string; selection: AiModelSelection }> = [
  { id: 'auto', label: 'Auto (Server Priority)', selection: { provider: 'auto' } },
  { id: 'offline', label: 'Offline Engine (Zero API Key)', selection: { provider: 'offline' } },
  {
    id: 'gemini:gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    selection: { provider: 'gemini', model: 'gemini-2.5-flash' },
  },
  {
    id: 'gemini:gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    selection: { provider: 'gemini', model: 'gemini-2.5-pro' },
  },
  {
    id: 'openai:gpt-4o-mini',
    label: 'OpenAI GPT-4o Mini',
    selection: { provider: 'openai', model: 'gpt-4o-mini' },
  },
  {
    id: 'openai:gpt-4o',
    label: 'OpenAI GPT-4o Flagship',
    selection: { provider: 'openai', model: 'gpt-4o' },
  },
  {
    id: 'anthropic:claude-3-5-sonnet',
    label: 'Anthropic Claude 3.5 Sonnet',
    selection: { provider: 'anthropic', model: 'claude-3-5-sonnet-latest' },
  },
  {
    id: 'openrouter:openrouter/free',
    label: 'OpenRouter Auto Free',
    selection: { provider: 'openrouter', model: 'openrouter/free' },
  },
  {
    id: 'openrouter:meta-llama/llama-3.3-70b-instruct:free',
    label: 'OpenRouter Llama 3.3 70B',
    selection: { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free' },
  },
  {
    id: 'openrouter:deepseek/deepseek-chat-v3-0324:free',
    label: 'OpenRouter DeepSeek V3',
    selection: { provider: 'openrouter', model: 'deepseek/deepseek-chat-v3-0324:free' },
  },
  {
    id: 'custom-endpoint',
    label: 'Custom LLM Endpoint (Ollama / vLLM / LocalAI)',
    selection: { provider: 'custom' },
  },
  {
    id: 'custom-openrouter',
    label: 'Custom OpenRouter Model...',
    selection: { provider: 'openrouter' },
  },
];

const PRESET_SCRIPTS: Array<{
  id: string;
  label: string;
  lang: ScriptLanguageCode;
  charId: number;
  voiceId: string;
  text: string;
}> = [
  {
    id: 'en',
    label: 'English Briefing',
    lang: 'en',
    charId: 3,
    voiceId: 'en-GB-RyanNeural',
    text: '[wave|warm] Good afternoon from London! I am Barnaby Sterling. [point-up|confident] Every hand gesture locks smoothly onto our sleeve cuffs with zero outlines.',
  },
  {
    id: 'hinglish',
    label: 'Hinglish / Roman Urdu',
    lang: 'hi',
    charId: 1,
    voiceId: 'hi-IN-MadhurNeural',
    text: 'Assalamualaikum dosto! Aaj hum ccavatarstudio mein AI animation aur lip-sync banayenge. First step bilkul free aur fast hai.',
  },
  {
    id: 'hi',
    label: 'Hindi (हिन्दी)',
    lang: 'hi',
    charId: 1,
    voiceId: 'hi-IN-MadhurNeural',
    text: '[wave|warm] नमस्ते दोस्तों! ccavatarstudio में आपका स्वागत है। [steeple|confident] अब हिन्दी स्क्रिप्ट में सही उच्चारण और लिप-सिंक अपने आप चलता है।',
  },
  {
    id: 'ur',
    label: 'Urdu (اردو)',
    lang: 'ur',
    charId: 15,
    voiceId: 'ur-PK-UzmaNeural',
    text: '[wave|warm] السلام علیکم دوستو! آج ہم ccavatarstudio میں نئی اینیمیشن بنائیں گے۔ [empathy-chest|empathetic] اردو تلفظ اور جذبات اب بالکل قدرتی انداز میں چلتے ہیں۔',
  },
  {
    id: 'ar',
    label: 'Arabic (العربية)',
    lang: 'ar',
    charId: 16,
    voiceId: 'ar-SA-HamedNeural',
    text: '[wave|warm] مرحبا بكم في ccavatarstudio! [open-palms|confident] الآن يعمل الصوت العربي وتزامن الشفاه بدقة عالية.',
  },
  {
    id: 'ja',
    label: 'Japanese (日本語)',
    lang: 'ja',
    charId: 10,
    voiceId: 'ja-JP-KeitaNeural',
    text: '[wave|warm] こんにちは！東京の佐藤健司です。 [point-up|focused] 日本語の音声とリップシンクを今すぐレンダリングできます。',
  },
  {
    id: 'es',
    label: 'Spanish (Español)',
    lang: 'es',
    charId: 5,
    voiceId: 'es-ES-AlvaroNeural',
    text: '[wave|warm] ¡Hola amigos! Bienvenidos a ccavatarstudio. [open-palms|confident] Ahora cada emoción ajusta el tono de la voz y los gestos automáticamente.',
  },
  {
    id: 'fr',
    label: 'French (Français)',
    lang: 'fr',
    charId: 8,
    voiceId: 'fr-FR-HenriNeural',
    text: '[wave|warm] Bonjour à tous ! Bienvenue dans ccavatarstudio. [open-palms|confident] Chaque expression et geste est synchronisé automatiquement.',
  },
];

const STATIC_EDGE_VOICES: EdgeVoiceItem[] = [
  { shortName: 'en-US-AndrewMultilingualNeural', friendlyName: 'English (US) — Andrew Multilingual', locale: 'en-US', languageCode: 'en', localeName: 'English (United States)', gender: 'Male' },
  { shortName: 'en-US-AvaMultilingualNeural', friendlyName: 'English (US) — Ava Multilingual', locale: 'en-US', languageCode: 'en', localeName: 'English (United States)', gender: 'Female' },
  { shortName: 'en-GB-RyanNeural', friendlyName: 'English (UK) — Ryan', locale: 'en-GB', languageCode: 'en', localeName: 'English (United Kingdom)', gender: 'Male' },
  { shortName: 'en-GB-SoniaNeural', friendlyName: 'English (UK) — Sonia', locale: 'en-GB', languageCode: 'en', localeName: 'English (United Kingdom)', gender: 'Female' },
  { shortName: 'hi-IN-MadhurNeural', friendlyName: 'Hindi (India) — Madhur', locale: 'hi-IN', languageCode: 'hi', localeName: 'Hindi (India)', gender: 'Male' },
  { shortName: 'hi-IN-SwaraNeural', friendlyName: 'Hindi (India) — Swara', locale: 'hi-IN', languageCode: 'hi', localeName: 'Hindi (India)', gender: 'Female' },
  { shortName: 'ur-PK-AsadNeural', friendlyName: 'Urdu (Pakistan) — Asad', locale: 'ur-PK', languageCode: 'ur', localeName: 'Urdu (Pakistan)', gender: 'Male' },
  { shortName: 'ur-PK-UzmaNeural', friendlyName: 'Urdu (Pakistan) — Uzma', locale: 'ur-PK', languageCode: 'ur', localeName: 'Urdu (Pakistan)', gender: 'Female' },
  { shortName: 'ar-SA-HamedNeural', friendlyName: 'Arabic (Saudi) — Hamed', locale: 'ar-SA', languageCode: 'ar', localeName: 'Arabic (Saudi Arabia)', gender: 'Male' },
  { shortName: 'ar-SA-ZariyahNeural', friendlyName: 'Arabic (Saudi) — Zariyah', locale: 'ar-SA', languageCode: 'ar', localeName: 'Arabic (Saudi Arabia)', gender: 'Female' },
  { shortName: 'ar-EG-SalmaNeural', friendlyName: 'Arabic (Egypt) — Salma', locale: 'ar-EG', languageCode: 'ar', localeName: 'Arabic (Egypt)', gender: 'Female' },
  { shortName: 'ja-JP-KeitaNeural', friendlyName: 'Japanese — Keita', locale: 'ja-JP', languageCode: 'ja', localeName: 'Japanese (Japan)', gender: 'Male' },
  { shortName: 'ja-JP-NanamiNeural', friendlyName: 'Japanese — Nanami', locale: 'ja-JP', languageCode: 'ja', localeName: 'Japanese (Japan)', gender: 'Female' },
  { shortName: 'es-ES-AlvaroNeural', friendlyName: 'Spanish (Spain) — Alvaro', locale: 'es-ES', languageCode: 'es', localeName: 'Spanish (Spain)', gender: 'Male' },
  { shortName: 'es-ES-ElviraNeural', friendlyName: 'Spanish (Spain) — Elvira', locale: 'es-ES', languageCode: 'es', localeName: 'Spanish (Spain)', gender: 'Female' },
  { shortName: 'es-MX-DaliaNeural', friendlyName: 'Spanish (Mexico) — Dalia', locale: 'es-MX', languageCode: 'es', localeName: 'Spanish (Mexico)', gender: 'Female' },
  { shortName: 'fr-FR-HenriNeural', friendlyName: 'French (France) — Henri', locale: 'fr-FR', languageCode: 'fr', localeName: 'French (France)', gender: 'Male' },
  { shortName: 'de-DE-ConradNeural', friendlyName: 'German (Germany) — Conrad', locale: 'de-DE', languageCode: 'de', localeName: 'German (Germany)', gender: 'Male' },
  { shortName: 'pt-BR-AntonioNeural', friendlyName: 'Portuguese (Brazil) — Antonio', locale: 'pt-BR', languageCode: 'pt', localeName: 'Portuguese (Brazil)', gender: 'Male' },
  { shortName: 'tr-TR-AhmetNeural', friendlyName: 'Turkish — Ahmet', locale: 'tr-TR', languageCode: 'tr', localeName: 'Turkish (Turkey)', gender: 'Male' },
];

const PROJECT_STORAGE_KEY = 'persona_studio_project_snapshots_v2';
const STUDIO_DRAFT_KEY = 'persona_studio_draft_v2';

interface StudioDraft {
  projectName?: string;
  scriptText?: string;
  scriptLang?: ScriptLanguageCode;
  selectedEdgeVoice?: string;
  aspectRatio?: AspectRatioType;
  framing?: FramingMode;
  stageBg?: StageBackgroundType;
  useTransparentBg?: boolean;
  burnSubtitles?: boolean;
  exportFormat?: 'mp4' | 'webm';
  exportFps?: 24 | 30;
  pauseGapSec?: number;
  splitTopic?: string;
  aiDirectorChoice?: string;
  customOpenRouterModel?: string;
  watermark?: WatermarkConfig;
}

function readStudioDraft(): StudioDraft {
  try {
    const raw = localStorage.getItem(STUDIO_DRAFT_KEY) || localStorage.getItem('toonsaz_studio_draft_v1');
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StudioDraft;
    // Sanitize any legacy branding
    if (parsed.watermark?.text?.includes('ToonSaz') || parsed.watermark?.text?.includes('toonsaz') || parsed.watermark?.text?.includes('PersonaStudio')) {
      parsed.watermark.text = '@ccavatarstudio';
    }
    if (parsed.watermark?.authorName?.includes('ToonSaz') || parsed.watermark?.authorName?.includes('toonsaz') || parsed.watermark?.authorName?.includes('Persona')) {
      parsed.watermark.authorName = 'ccavatarstudio';
    }
    return parsed;
  } catch {
    return {};
  }
}

export const VideoStudio: React.FC<VideoStudioProps> = ({
  activeCharacter,
  allCharacters,
  onSelectCharacter,
  onUpdateCharacter,
  globalHeadTilt,
}) => {
  const initialDraft = useMemo(() => readStudioDraft(), []);

  const [projectName, setProjectName] = useState<string>(initialDraft.projectName || 'Episode 01 Briefing');
  const [savedProjects, setSavedProjects] = useState<ProjectSnapshot[]>(() => {
    try {
      const raw = localStorage.getItem(PROJECT_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as ProjectSnapshot[]) : [];
    } catch {
      return [];
    }
  });
  const [exportHistory, setExportHistory] = useState<ExportHistoryItem[]>([]);
  const [exportDirLabel, setExportDirLabel] = useState<string>('./exports');
  const [localDirHandle, setLocalDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);

  const [voiceTab, setVoiceTab] = useState<'tts' | 'whisper' | 'clone'>('tts');
  const [scriptLang, setScriptLang] = useState<ScriptLanguageCode>(initialDraft.scriptLang || 'auto');
  const [aiDirectorChoice, setAiDirectorChoice] = useState<string>(initialDraft.aiDirectorChoice || 'auto');
  const [customOpenRouterModel, setCustomOpenRouterModel] = useState<string>(
    initialDraft.customOpenRouterModel || 'openrouter/free'
  );
  const [convertRomanized, setConvertRomanized] = useState<boolean>(false);
  const [scriptText, setScriptText] = useState<string>(initialDraft.scriptText || PRESET_SCRIPTS[0].text);
  const [romanPreviewText, setRomanPreviewText] = useState<string | null>(null);
  const [romanPreviewLabel, setRomanPreviewLabel] = useState<string>('');
  const [previousScriptBeforeConvert, setPreviousScriptBeforeConvert] = useState<string | null>(null);
  const [scriptUndoSnapshot, setScriptUndoSnapshot] = useState<{ text: string; note: string } | null>(null);

  // EGM target IA: Studio is a guided 5-step wizard (Script → Voice → Sync →
  // Stage → Render). One step's panels are shown at a time; stage & timeline
  // stay visible on the right.
  const [studioStep, setStudioStep] = useState<'script' | 'voice' | 'sync' | 'stage' | 'render'>('script');
  const [intonationNote, setIntonationNote] = useState<string>('');
  const [isAnalyzingScript, setIsAnalyzingScript] = useState<boolean>(false);

  const [pauseGapSec, setPauseGapSec] = useState<number>(initialDraft.pauseGapSec ?? 0.25);
  const [timelineSegments, setTimelineSegments] = useState<TimelineSegment[]>([]);
  const [totalDuration, setTotalDuration] = useState<number>(8.0);
  const [compiledRhubarbCues, setCompiledRhubarbCues] = useState<RhubarbCue[]>([]);

  // Editable Cue Sheet State
  const [isCueSheetOpen, setIsCueSheetOpen] = useState<boolean>(true);
  const [cueDraftRows, setCueDraftRows] = useState<CueSheetRow[]>([]);
  const [savedCueRows, setSavedCueRows] = useState<CueSheetRow[] | null>(null);
  const [cueDirty, setCueDirty] = useState<boolean>(false);
  const [cueNotice, setCueNotice] = useState<string>('Using automatic cues synced with script tags.');

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [manualPoseOverride, setManualPoseOverride] = useState<boolean>(false);
  const [activeGesture, setActiveGesture] = useState<HandGesture>(activeCharacter.defaultGesture);
  const [activeEmotion, setActiveEmotion] = useState<EmotionPreset>('warm');
  const [activeMouth, setActiveMouth] = useState<MouthSprite>('neutral');
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('');
  const [stageLimbOverride, setStageLimbOverride] = useState<{ L: LimbConfig; R: LimbConfig } | undefined>(undefined);
  const [isStageBlinking, setIsStageBlinking] = useState<boolean>(false);

  // Creator Watermark State
  const [watermark, setWatermark] = useState<WatermarkConfig>(initialDraft.watermark || DEFAULT_WATERMARK);

  // Live Edge Voice Catalog State
  const [isLoadingVoices, setIsLoadingVoices] = useState<boolean>(true);
  const [edgeVoices, setEdgeVoices] = useState<EdgeVoiceItem[]>(STATIC_EDGE_VOICES);
  const [edgeLocales, setEdgeLocales] = useState<EdgeLocaleSummary[]>([]);
  const [voiceLocaleFilter, setVoiceLocaleFilter] = useState<string>('all');
  const [voiceGenderFilter, setVoiceGenderFilter] = useState<'all' | 'Male' | 'Female'>('all');
  const [voiceSearch, setVoiceSearch] = useState<string>('');
  const [selectedEdgeVoice, setSelectedEdgeVoice] = useState<string>(
    initialDraft.selectedEdgeVoice?.split('|')[0] || 'en-GB-RyanNeural'
  );

  const [omniLang, setOmniLang] = useState<string>('Spanish');
  const [omniSpeed, setOmniSpeed] = useState<string>('1.0');
  const [omniRefAudio, setOmniRefAudio] = useState<string>('ref.wav');

  const [alignmentInput, setAlignmentInput] = useState<string>('');
  const [alignmentCues, setAlignmentCues] = useState<RhubarbCue[]>([]);
  const [activeWordTimings, setActiveWordTimings] = useState<Array<{ start: number; end: number; word: string }>>([]);
  const activeWordTimingsRef = useRef<Array<{ start: number; end: number; word: string }>>([]);
  const [alignmentMeta, setAlignmentMeta] = useState<{ mode: 'rhubarb' | 'whisper' | 'none'; wordCount: number }>({
    mode: 'none',
    wordCount: 0,
  });
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [uploadedAudioFile, setUploadedAudioFile] = useState<File | null>(null);
  const [serverMediaId, setServerMediaId] = useState<string | null>(null);

  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>(initialDraft.aspectRatio || '16:9');

  // 3-Step Creator Architecture (Voice & Script -> Presenter & Scene -> Preview & Export)
  const scriptHasDirectingTags = /\[[^\]|]+\|[^\]]+\]/.test(scriptText);
  const studioStepMeta: { id: 'script' | 'stage' | 'render'; label: string; status: string; done: boolean }[] = [
    { id: 'script', label: '1. Voice & Script', status: serverMediaId ? `Audio Ready · ${audioDuration.toFixed(1)}s` : 'Add voice / script', done: Boolean(serverMediaId) },
    { id: 'stage', label: '2. Presenter & Scene', status: `${activeCharacter.name} · ${aspectRatio}`, done: true },
    { id: 'render', label: '3. Preview & Export', status: serverMediaId ? 'Ready to Export' : 'Generate audio first', done: Boolean(serverMediaId) },
  ];
  const studioStepIndex = studioStepMeta.findIndex((s) => s.id === studioStep);
  const [recognizerMode, setRecognizerMode] = useState<'phonetic' | 'pocketSphinx'>('phonetic');
  const [isRunningTts, setIsRunningTts] = useState<boolean>(false);
  const [isRunningRhubarb, setIsRunningRhubarb] = useState<boolean>(false);
  const [isExtractingVideoAudio, setIsExtractingVideoAudio] = useState<boolean>(false);
  const [isTranscribingWhisper, setIsTranscribingWhisper] = useState<boolean>(false);
  const [liveEtaProgress, setLiveEtaProgress] = useState<{ stage: string; percent: number; message: string; eta: string } | null>(null);
  const [lastPipelineStats, setLastPipelineStats] = useState<string | null>(null);
  const [wordTranscriptPreview, setWordTranscriptPreview] = useState<string>('');
  const [engineCaps, setEngineCaps] = useState<EngineCapabilities | null>(null);

  const [framing, setFraming] = useState<FramingMode>(initialDraft.framing || 'full');
  const [stageBg, setStageBg] = useState<StageBackgroundType>(initialDraft.stageBg || 'original-white');
  const [useTransparentBg, setUseTransparentBg] = useState<boolean>(Boolean(initialDraft.useTransparentBg));
  const [burnSubtitles, setBurnSubtitles] = useState<boolean>(initialDraft.burnSubtitles ?? true);
  const [exportFormat, setExportFormat] = useState<'mp4' | 'webm'>(
    initialDraft.exportFormat || (initialDraft.useTransparentBg ? 'webm' : 'mp4')
  );
  const [exportFps, setExportFps] = useState<24 | 30>(initialDraft.exportFps || 24);
  const [showQuickWardrobe, setShowQuickWardrobe] = useState<boolean>(false);
  const [customBgUrl, setCustomBgUrl] = useState<string>('');
  const [videoScale, setVideoScale] = useState<number>(100);
  const [videoX, setVideoX] = useState<number>(0);
  const [videoY, setVideoY] = useState<number>(0);
  const [showSplitPane, setShowSplitPane] = useState<boolean>(false);
  const [presenterLayout, setPresenterLayout] = useState<'standard' | 'corner-reaction' | 'circle-pip' | 'split-screen' | 'side-anchor'>('standard');
  const [reactionCorner, setReactionCorner] = useState<'right' | 'left'>('right');
  const [importedVideoUrl, setImportedVideoUrl] = useState<string>('');
  const [importedVideoName, setImportedVideoName] = useState<string>('');
  const [splitTopic, setSplitTopic] = useState<string>(initialDraft.splitTopic || 'Key Takeaways & Visual Architecture');

  const [isEgmDrawerOpen, setIsEgmDrawerOpen] = useState<boolean>(false);
  const [isRecordingWebM, setIsRecordingWebM] = useState<boolean>(false);
  const [renderProgress, setRenderProgress] = useState<{
    active: boolean;
    current: number;
    total: number;
    stage: string;
  }>({ active: false, current: 0, total: 0, stage: '' });
  const [renderedMp4Url, setRenderedMp4Url] = useState<string | null>(null);
  const [renderedFormat, setRenderedFormat] = useState<'mp4' | 'webm'>('mp4');
  const [renderedSavedPath, setRenderedSavedPath] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const importedVideoRef = useRef<HTMLVideoElement | null>(null);
  const importedVideoFileRef = useRef<File | null>(null);
  const rafRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const cancelRenderRef = useRef<boolean>(false);
  const activeRenderJobRef = useRef<string | null>(null);
  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const playheadRef = useRef<HTMLDivElement | null>(null);
  const timecodeRef = useRef<HTMLSpanElement | null>(null);
  const scrubberRef = useRef<HTMLInputElement | null>(null);
  const timelineBoxRef = useRef<HTMLDivElement | null>(null);
  const customBgInputRef = useRef<HTMLInputElement | null>(null);

  const liveSubtitleRef = useRef<string>('');
  const isPlayingRef = useRef<boolean>(false);
  const manualPoseOverrideRef = useRef<boolean>(false);
  manualPoseOverrideRef.current = manualPoseOverride;
  const speechAnchorRef = useRef<{ elapsedOffset: number; lastCharIndex: number }>({
    elapsedOffset: 0,
    lastCharIndex: -1,
  });

  const toastTimerRef = useRef<number | null>(null);
  const showToast = (msg: string) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = window.setTimeout(() => setToastMessage(null), 4000);
  };

  // Clears all generated-audio/sync state so a new project/preset never
  // inherits another project's voiceover duration or alignment cues.
  const resetPipelineState = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAudioDuration(0);
    setServerMediaId(null);
    setUploadedAudioFile(null);
    setAlignmentCues([]);
    setAlignmentInput('');
    setWordTranscriptPreview('');
    setAlignmentMeta({ mode: 'none', wordCount: 0 });
    setCueDraftRows([]);
    setSavedCueRows(null);
    setCueDirty(false);
    setCueNotice('Using automatic cues synced with script tags.');
    if (importedVideoUrl) URL.revokeObjectURL(importedVideoUrl);
    setImportedVideoUrl('');
    setImportedVideoName('');
    setShowSplitPane(false);
  };

  // All AI-side script mutations go through here so they can be undone.
  const replaceScript = (nextText: string) => {
    setScriptUndoSnapshot({ text: scriptText, note: intonationNote });
    setScriptText(nextText);
  };

  const handleUndoScriptReplace = () => {
    if (!scriptUndoSnapshot) return;
    setScriptText(scriptUndoSnapshot.text);
    setIntonationNote(scriptUndoSnapshot.note);
    setScriptUndoSnapshot(null);
    showToast('Restored script before AI changes.');
  };

  const handleApplyTemplate = (tmpl: VideoTemplate) => {
    resetPipelineState();
    setProjectName(tmpl.title);
    const targetChar = allCharacters.find((c) => c.id === tmpl.characterId);
    if (targetChar) {
      onSelectCharacter(targetChar);
    }
    setScriptText(tmpl.scriptText);
    setScriptLang(tmpl.language);
    setSelectedEdgeVoice(tmpl.voiceId);
    setAspectRatio(tmpl.aspectRatio);
    setFraming(tmpl.framing);
    setStageBg(tmpl.stageBg);
    setStudioStep('script');
    showToast(`Loaded recipe "${tmpl.title}".`);
  };

  const refreshExportsHistory = async () => {
    try {
      const r = await fetch('/api/exports');
      if (!r.ok) return;
      const data = await r.json();
      if (data.exportDir) setExportDirLabel(data.exportDir);
      if (Array.isArray(data.items)) {
        setExportHistory(
          data.items.map((it: any) => ({
            id: it.id,
            projectName: it.projectName || it.projectSlug,
            format: it.format,
            resolution: it.format === 'mp4' ? 'H.264 MP4' : it.format.toUpperCase(),
            filename: it.filename,
            url: it.url,
            savedPath: it.savedPath,
            sizeBytes: it.sizeBytes,
            createdAt: it.createdAt,
          }))
        );
      }
    } catch {
      // Ignore transient poll errors
    }
  };

  useEffect(() => {
    fetch('/api/capabilities')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setEngineCaps(data);
          if (data.exportDir) setExportDirLabel('./exports');
        }
      })
      .catch(() => {});

    setIsLoadingVoices(true);
    fetch('/api/voices/edge')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const rawVoices: EdgeVoiceItem[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.voices)
          ? data.voices
          : [];
        if (rawVoices.length > 0) {
          setEdgeVoices(rawVoices);
          if (Array.isArray(data?.locales) && data.locales.length > 0) {
            setEdgeLocales(data.locales);
          } else {
            const locMap = new Map<string, EdgeLocaleSummary>();
            for (const v of rawVoices) {
              const existing = locMap.get(v.locale);
              if (existing) {
                existing.count += 1;
              } else {
                locMap.set(v.locale, {
                  locale: v.locale,
                  languageCode: v.languageCode,
                  label: `${v.localeName} [${v.locale}]`,
                  count: 1,
                });
              }
            }
            setEdgeLocales(Array.from(locMap.values()).sort((a, b) => a.label.localeCompare(b.label)));
          }
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingVoices(false));

    void refreshExportsHistory();

    // Pull server-persisted projects
    fetch('/api/projects')
      .then((r) => (r.ok ? r.json() : null))
      .then((serverList) => {
        if (Array.isArray(serverList) && serverList.length > 0) {
          setSavedProjects(serverList);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    try {
      const draft: StudioDraft = {
        projectName,
        scriptText,
        scriptLang,
        selectedEdgeVoice,
        aspectRatio,
        framing,
        stageBg,
        useTransparentBg,
        burnSubtitles,
        exportFormat,
        exportFps,
        pauseGapSec,
        splitTopic,
        aiDirectorChoice,
        customOpenRouterModel,
        watermark,
      };
      localStorage.setItem(STUDIO_DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Ignore storage quota issues
    }
  }, [
    projectName,
    scriptText,
    scriptLang,
    selectedEdgeVoice,
    aspectRatio,
    framing,
    stageBg,
    useTransparentBg,
    burnSubtitles,
    exportFormat,
    exportFps,
    pauseGapSec,
    splitTopic,
    aiDirectorChoice,
    customOpenRouterModel,
    watermark,
  ]);

  useEffect(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.load();
    }
  }, [audioUrl]);

  useEffect(() => {
    if (!isPlayingRef.current) {
      if (!manualPoseOverrideRef.current) {
        setActiveGesture(activeCharacter.defaultGesture);
      }
      setActiveMouth(activeCharacter.defaultMouth || rhubarbCodeToMouthSprite('X'));
    }
  }, [activeCharacter.id]);

  // Build automatic clause-level timeline + merge saved custom cue sheet when present
  const automaticSegments = useMemo(() => {
    const compiled = compileScriptTimeline(scriptText, 148, pauseGapSec);
    const clauses = scriptText.split(/(?=\[)|(?<=[.!?।؟。！？])\s+/).filter(Boolean);
    const segs: TimelineSegment[] = [];
    let cursor = 0.18;
    const fallbackG: HandGesture[] = ['open-palms', 'precision-pinch', 'empathy-chest', 'point-up', 'steeple'];
    const fallbackE: EmotionPreset[] = ['neutral', 'warm', 'empathetic', 'focused', 'confident'];
    let wordCursor = 0;

    clauses.forEach((cl, idx) => {
      let gesture: HandGesture = idx === 0 ? activeCharacter.defaultGesture : fallbackG[idx % fallbackG.length];
      let emotion: EmotionPreset = fallbackE[idx % fallbackE.length];
      const m = cl.match(/\[([^|\]]+)\|?([^\]]*)\]/);
      if (m) {
        const gCandidate = m[1].trim().toLowerCase() as HandGesture;
        const eCandidate = (m[2] || '').trim().toLowerCase() as EmotionPreset;
        if (HAND_GESTURES.some((g) => g.id === gCandidate)) gesture = gCandidate;
        if (EMOTIONS_LIST.some((e) => e.id === eCandidate)) emotion = eCandidate;
      }

      const spoken = cl.replace(/\[.*?\]/g, '').trim();
      if (!spoken) return;

      const clauseWords = spoken.split(/\s+/).filter(Boolean);
      const matchedCues = compiled.wordCues.slice(wordCursor, wordCursor + clauseWords.length);
      wordCursor += clauseWords.length;

      const start = matchedCues[0]?.startTime ?? cursor;
      const lastCue = matchedCues[matchedCues.length - 1];
      const end = lastCue ? lastCue.startTime + lastCue.duration : start + Math.max(1.4, clauseWords.length * 0.38);

      const vBlocks: Array<{ start: number; end: number; mouth: MouthSprite; rhubarb: RhubarbCode }> = [];
      matchedCues.forEach((wc) => {
        for (let k = 0; k < wc.visemes.length; k++) {
          const v = wc.visemes[k];
          const vEnd = k + 1 < wc.visemes.length ? wc.visemes[k + 1].time : wc.startTime + wc.duration;
          vBlocks.push({
            start: v.time,
            end: vEnd,
            mouth: v.viseme,
            rhubarb: v.rhubarb || mouthSpriteToRhubarbCode(v.viseme),
          });
        }
      });

      segs.push({ id: `seg-${idx}`, start, end, spoken, gesture, emotion, vBlocks });
      cursor = end + pauseGapSec;
    });

    const alignMax = alignmentCues.length > 0 ? alignmentCues[alignmentCues.length - 1].end + 0.15 : 0;
    const rawEstTotal = Math.max(compiled.totalDuration, 1.5);
    const total = audioDuration > 0 ? Math.max(audioDuration, alignMax) : Math.max(rawEstTotal, alignMax);

    const scaledSegs =
      audioDuration > 0 && rawEstTotal > 0
        ? segs.map((s) => ({
            ...s,
            start: Number(((s.start / rawEstTotal) * total).toFixed(2)),
            end: Number(((s.end / rawEstTotal) * total).toFixed(2)),
          }))
        : segs.map((s) => ({
            ...s,
            start: Number(s.start.toFixed(2)),
            end: Number(s.end.toFixed(2)),
          }));

    // Strictly enforce 3 to 4 second emotion & gesture cadence rule:
    // If any segment duration > 4.0s, subdivide it into 3.0s-3.8s chunks with dynamic alternating cues
    const cadenceSegs: TimelineSegment[] = [];
    const altG: HandGesture[] = ['steeple', 'precision-pinch', 'size-wide', 'thinking', 'open-palms', 'thumbs-up', 'chop'];
    const altE: EmotionPreset[] = ['curious', 'focused', 'shocked', 'confident', 'warm', 'empathetic'];

    scaledSegs.forEach((seg, sIdx) => {
      const dur = seg.end - seg.start;
      if (dur <= 4.0) {
        cadenceSegs.push(seg);
        return;
      }
      const subCount = Math.ceil(dur / 3.6);
      const step = dur / subCount;
      for (let k = 0; k < subCount; k++) {
        const subStart = Number((seg.start + k * step).toFixed(2));
        const subEnd = Number((k === subCount - 1 ? seg.end : seg.start + (k + 1) * step).toFixed(2));
        const g = k === 0 ? seg.gesture : altG[(sIdx * 3 + k) % altG.length];
        const e = k === 0 ? seg.emotion : altE[(sIdx * 3 + k) % altE.length];
        cadenceSegs.push({
          ...seg,
          id: `${seg.id}-sub-${k}`,
          start: subStart,
          end: subEnd,
          gesture: g,
          emotion: e,
        });
      }
    });

    return { compiled, scaledSegs: cadenceSegs, total };
  }, [scriptText, pauseGapSec, alignmentCues, audioDuration, activeCharacter.id]);

  useEffect(() => {
    setCompiledRhubarbCues(automaticSegments.compiled.rhubarbCues);
    setTotalDuration(automaticSegments.total);

    if (!savedCueRows) {
      setTimelineSegments(automaticSegments.scaledSegs);
      setCueDraftRows(
        automaticSegments.scaledSegs.map((s) => ({
          id: s.id,
          start: s.start,
          end: s.end,
          gesture: s.gesture,
          emotion: s.emotion,
          spoken: s.spoken,
        }))
      );
      setCueDirty(false);
    } else {
      const mergedSegs: TimelineSegment[] = savedCueRows.map((row, idx) => ({
        id: row.id,
        start: row.start,
        end: row.end,
        spoken: row.spoken || automaticSegments.scaledSegs[idx]?.spoken || '',
        gesture: row.gesture,
        emotion: row.emotion,
        vBlocks: automaticSegments.scaledSegs[idx]?.vBlocks || [],
      }));
      setTimelineSegments(mergedSegs);
    }

    const activeFirst = savedCueRows?.[0] || automaticSegments.scaledSegs[0];
    if (!isPlayingRef.current && activeFirst && currentTime === 0) {
      if (!manualPoseOverrideRef.current) {
        setActiveGesture(activeFirst.gesture);
        setActiveEmotion(activeFirst.emotion);
      }
      setActiveMouth(activeCharacter.defaultMouth || rhubarbCodeToMouthSprite('X'));
      const openingSpoken = activeFirst.spoken || automaticSegments.scaledSegs[0]?.spoken || '';
      liveSubtitleRef.current = openingSpoken;
      setCurrentSubtitle(openingSpoken);
    }
  }, [automaticSegments, savedCueRows, activeCharacter.id]);

  const evaluateStateAtTime = (
    t: number,
    segs: TimelineSegment[],
    extCues: RhubarbCue[]
  ): {
    mouth: MouthSprite;
    gesture?: HandGesture;
    emotion?: EmotionPreset;
    spoken: string;
  } => {
    const restMouth = rhubarbCodeToMouthSprite('X');
    const seg = segs.find((s) => t >= s.start && t <= s.end) || segs.find((s) => t < s.start);
    let mouth: MouthSprite = restMouth;

    if (extCues.length > 0) {
      const cue = findMouthCueAtTime(extCues, t);
      mouth = cue ? cue.mouth : restMouth;
    } else if (seg) {
      if (t >= seg.start && t <= seg.end) {
        const vb = seg.vBlocks.find((v) => t >= v.start && t <= v.end);
        mouth = vb ? vb.mouth : restMouth;
      } else {
        mouth = restMouth;
      }
    }

    // Word-gated speech: strictly clamp mouth to rest (X / neutral) between words and after speech finishes
    const wordTimings = activeWordTimingsRef.current;
    if (wordTimings && wordTimings.length > 0) {
      const inWord = wordTimings.some((w) => t >= w.start - 0.015 && t <= w.end + 0.015);
      if (!inWord) {
        mouth = restMouth;
      }
    }

    const activeSeg =
      segs.find((s) => t >= s.start - 0.05 && t <= s.end + pauseGapSec) ||
      (t <= (segs[0]?.start ?? 0) ? segs[0] : segs[segs.length - 1]);
    return {
      mouth,
      gesture: activeSeg?.gesture,
      emotion: activeSeg?.emotion,
      spoken: activeSeg?.spoken || '',
    };
  };

  const applyTimeToDOMIndicators = (t: number, dur: number) => {
    const pct = Math.max(0, Math.min(1, t / Math.max(0.1, dur)));
    if (playheadRef.current) {
      playheadRef.current.style.left = `${(pct * 100).toFixed(3)}%`;
    }
    if (timecodeRef.current) {
      timecodeRef.current.textContent = `${formatTimecode(t)} / ${formatTimecode(dur)}`;
    }
    if (scrubberRef.current) {
      scrubberRef.current.value = String(t);
    }
  };

  const applyLanguageVoiceDefaults = (langCode: ScriptLanguageCode) => {
    if (langCode === 'auto') return;
    const baseLang = String(langCode).split('-')[0].toLowerCase();
    const match = edgeVoices.find((v) => v.languageCode.toLowerCase() === baseLang);
    if (match) {
      setSelectedEdgeVoice(match.shortName);
      setVoiceLocaleFilter(match.languageCode);
    }
    setRecognizerMode(baseLang === 'en' ? 'pocketSphinx' : 'phonetic');
  };

  const scriptConversionAnalysis = useMemo(() => analyzeScriptConversion(scriptText), [scriptText]);

  const filteredEdgeVoices = useMemo(() => {
    const q = voiceSearch.trim().toLowerCase();
    return edgeVoices.filter((v) => {
      if (voiceLocaleFilter !== 'all') {
        const locLower = voiceLocaleFilter.toLowerCase();
        if (v.locale.toLowerCase() !== locLower && v.languageCode.toLowerCase() !== locLower) {
          return false;
        }
      }
      if (voiceGenderFilter !== 'all' && v.gender !== voiceGenderFilter) {
        return false;
      }
      if (q) {
        const hay = `${v.shortName} ${v.friendlyName} ${v.locale} ${v.localeName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [edgeVoices, voiceLocaleFilter, voiceGenderFilter, voiceSearch]);

  const activeVoiceInfo = useMemo(() => {
    const cleanId = selectedEdgeVoice.split('|')[0];
    return edgeVoices.find((v) => v.shortName === cleanId) || edgeVoices[0];
  }, [edgeVoices, selectedEdgeVoice]);

  const handlePreviewTransliterate = (force: 'roman' | 'urdu' | null = null) => {
    if (!scriptText.trim()) {
      showToast('Enter Hinglish, Roman Urdu, or Urdu text to convert.');
      return;
    }
    const converted = toDevanagari(scriptText, { force });
    setRomanPreviewText(converted);
    setRomanPreviewLabel(
      force === 'roman'
        ? 'Forced Roman -> Devanagari Preview (Offline)'
        : force === 'urdu'
        ? 'Forced Urdu Script -> Devanagari Preview (Offline)'
        : 'Auto-Detected -> Devanagari Preview (Offline)'
    );
  };

  const handleApplyTransliterate = () => {
    if (romanPreviewText === null) return;
    setPreviousScriptBeforeConvert(scriptText);
    setScriptText(romanPreviewText);
    setRomanPreviewText(null);
    if (scriptLang === 'auto' || scriptLang === 'en' || scriptLang === 'ur') {
      setScriptLang('hi');
      const hiVoice = edgeVoices.find((v) => v.shortName === 'hi-IN-MadhurNeural') || edgeVoices.find((v) => v.languageCode === 'hi');
      if (hiVoice) {
        setSelectedEdgeVoice(hiVoice.shortName);
        setVoiceLocaleFilter('hi');
      }
      setRecognizerMode('phonetic');
    }
    showToast('Applied offline Devanagari script & selected Hindi Neural voice.');
  };

  const handleUndoTransliterate = () => {
    if (previousScriptBeforeConvert === null) return;
    setScriptText(previousScriptBeforeConvert);
    setPreviousScriptBeforeConvert(null);
    showToast('Restored original script before transliteration.');
  };

  const resolveAiDirectorPayload = (): AiModelSelection => {
    const customSettings = getStoredCustomSettings();
    if (aiDirectorChoice === 'custom-openrouter') {
      return {
        provider: 'openrouter',
        model: customOpenRouterModel.trim() || customSettings.openrouterModel || 'openrouter/free',
        apiKey: customSettings.openrouterApiKey,
      };
    }
    if (aiDirectorChoice === 'custom-endpoint') {
      return {
        provider: 'custom',
        model: customSettings.customLlmModel || 'llama3.2:latest',
        apiKey: customSettings.customLlmApiKey,
        baseUrl: customSettings.customLlmBaseUrl || 'http://localhost:11434/v1',
      };
    }
    const found = AI_MODEL_CHOICES.find((m) => m.id === aiDirectorChoice);
    if (!found) {
      if (customSettings.llmProvider === 'custom') {
        return {
          provider: 'custom',
          model: customSettings.customLlmModel || 'llama3.2:latest',
          apiKey: customSettings.customLlmApiKey,
          baseUrl: customSettings.customLlmBaseUrl || 'http://localhost:11434/v1',
        };
      }
      return { provider: 'auto' };
    }
    const sel: AiModelSelection = { ...found.selection };
    if (sel.provider === 'openai') {
      sel.apiKey = customSettings.openaiApiKey;
      if (customSettings.openaiModel && customSettings.openaiModel !== 'custom') {
        sel.model = customSettings.openaiModel;
      }
    } else if (sel.provider === 'anthropic') {
      sel.apiKey = customSettings.anthropicApiKey;
      if (customSettings.anthropicModel && customSettings.anthropicModel !== 'custom') {
        sel.model = customSettings.anthropicModel;
      }
    } else if (sel.provider === 'gemini') {
      sel.apiKey = customSettings.geminiApiKey;
      if (customSettings.geminiModel && customSettings.geminiModel !== 'custom') {
        sel.model = customSettings.geminiModel;
      }
    } else if (sel.provider === 'openrouter') {
      sel.apiKey = customSettings.openrouterApiKey;
    }
    return sel;
  };

  const handleAutoDirect = async (textOverride?: string) => {
    const sourceText = (textOverride ?? scriptText).trim();
    if (!sourceText) {
      showToast('Enter script text before directing emotions & gestures.');
      return;
    }
    setIsAnalyzingScript(true);
    setSavedCueRows(null);
    setCueNotice('Using automatic cues synced with script tags.');
    const modelSel = resolveAiDirectorPayload();
    try {
      const resp = await fetch('/api/script/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sourceText,
          targetLanguage: scriptLang,
          convertRomanized,
          provider: modelSel.provider,
          model: modelSel.model,
          apiKey: modelSel.apiKey,
          baseUrl: modelSel.baseUrl,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        replaceScript(data.taggedScript);
        if (data.detectedLanguage) {
          setScriptLang(data.detectedLanguage as ScriptLanguageCode);
          const recId = String(data.recommendedVoice || '').split('|')[0];
          const matchedVoice =
            edgeVoices.find((v) => v.shortName === recId) ||
            edgeVoices.find((v) => v.languageCode === data.detectedLanguage);
          if (matchedVoice) setSelectedEdgeVoice(matchedVoice.shortName);
          setRecognizerMode(data.recommendedRecognizer === 'pocketSphinx' ? 'pocketSphinx' : 'phonetic');
        }
        const modelTag = data.usedModel ? ` (${data.usedModel})` : '';
        const providerBadge =
          data.usedProvider === 'gemini'
            ? `Gemini AI Director${modelTag}`
            : data.usedProvider === 'openrouter'
            ? `OpenRouter AI Director${modelTag}`
            : 'Offline Multilingual Rule Engine (No API Key)';
        setIntonationNote(`${providerBadge}: ${data.intonationNotes || ''}`);
        showToast(`${providerBadge} directed 1-5s cadence cues.`);
        return;
      }
      throw new Error('Server analysis unavailable');
    } catch {
      const baseText = convertRomanized ? toDevanagari(sourceText) : sourceText;
      const directed = autoAddDirectingCues(baseText);
      const detected = detectScriptLanguage(directed);
      replaceScript(directed);
      applyLanguageVoiceDefaults(detected);
      setIntonationNote('Offline Multilingual Rule Engine applied 1-5s cadence cues locally.');
      showToast('Applied emotions & gestures locally.');
    } finally {
      setIsAnalyzingScript(false);
    }
  };

  const handleLoadPreset = (presetId: string) => {
    const p = PRESET_SCRIPTS.find((s) => s.id === presetId);
    if (!p) return;
    resetPipelineState();
    setSavedCueRows(null);
    setRomanPreviewText(null);
    setCueNotice('Using automatic cues synced with script tags.');
    setScriptLang(p.lang);
    setScriptText(p.text);
    const voiceEntry = edgeVoices.find((v) => v.shortName === p.voiceId);
    if (voiceEntry) {
      setSelectedEdgeVoice(voiceEntry.shortName);
      setVoiceLocaleFilter('all');
    } else {
      setSelectedEdgeVoice(p.voiceId);
    }
    setRecognizerMode(p.lang === 'en' ? 'pocketSphinx' : 'phonetic');
    setIntonationNote(
      p.id === 'hinglish'
        ? 'Hinglish preset loaded — click Convert to Devanagari (Auto) for authentic Hindi Neural pronunciation!'
        : p.lang === 'en'
        ? 'PocketSphinx + Emotion Prosody ready.'
        : `Native ${p.label} script loaded with Rhubarb Phonetic lip-sync + per-emotion prosody.`
    );
    const targetChar = allCharacters.find((c) => c.id === p.charId);
    if (targetChar) onSelectCharacter(targetChar);
    showToast(`Loaded ${p.label} preset.`);
  };

  // Cue Sheet Editor Actions (memoized for CueSheetPanel)
  const updateCueDraft = useCallback((idx: number, patch: Partial<CueSheetRow>) => {
    setCueDraftRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
    setCueDirty(true);
    if (patch.gesture) {
      setActiveGesture(patch.gesture);
      setManualPoseOverride(true);
      setStageLimbOverride(undefined);
    }
    if (patch.emotion) {
      setActiveEmotion(patch.emotion);
      setManualPoseOverride(true);
      const meta = EMOTIONS_LIST.find((em) => em.id === patch.emotion);
      if (meta?.defaultMouth) setActiveMouth(meta.defaultMouth);
    }
  }, []);

  const handleLiveGestureChange = (newG: HandGesture) => {
    setActiveGesture(newG);
    setManualPoseOverride(true);
    setStageLimbOverride(undefined);

    setTimelineSegments((prev) =>
      prev.map((s, idx) =>
        (currentTime >= s.start && currentTime <= s.end) || (currentTime === 0 && idx === 0)
          ? { ...s, gesture: newG }
          : s
      )
    );
    setCueDraftRows((prev) =>
      prev.map((r, idx) =>
        (currentTime >= r.start && currentTime <= r.end) || (currentTime === 0 && idx === 0)
          ? { ...r, gesture: newG }
          : r
      )
    );
    if (savedCueRows) {
      setSavedCueRows((prev) =>
        prev
          ? prev.map((r, idx) =>
              (currentTime >= r.start && currentTime <= r.end) || (currentTime === 0 && idx === 0)
                ? { ...r, gesture: newG }
                : r
            )
          : null
      );
    }
  };

  const handleLiveEmotionChange = (newE: EmotionPreset) => {
    setActiveEmotion(newE);
    setManualPoseOverride(true);
    const meta = EMOTIONS_LIST.find((em) => em.id === newE);
    if (meta?.defaultMouth) {
      setActiveMouth(meta.defaultMouth);
    }

    setTimelineSegments((prev) =>
      prev.map((s, idx) =>
        (currentTime >= s.start && currentTime <= s.end) || (currentTime === 0 && idx === 0)
          ? { ...s, emotion: newE }
          : s
      )
    );
    setCueDraftRows((prev) =>
      prev.map((r, idx) =>
        (currentTime >= r.start && currentTime <= r.end) || (currentTime === 0 && idx === 0)
          ? { ...r, emotion: newE }
          : r
      )
    );
    if (savedCueRows) {
      setSavedCueRows((prev) =>
        prev
          ? prev.map((r, idx) =>
              (currentTime >= r.start && currentTime <= r.end) || (currentTime === 0 && idx === 0)
                ? { ...r, emotion: newE }
                : r
            )
          : null
      );
    }
  };

  const deleteCueRow = useCallback((idx: number) => {
    setCueDraftRows((prev) => {
      if (prev.length <= 1) {
        showToast('At least one cue row is required.');
        return prev;
      }
      setCueDirty(true);
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  const addCueRow = useCallback(() => {
    setCueDraftRows((prev) => {
      const last = prev[prev.length - 1];
      const start = last ? Number(last.end.toFixed(2)) : 0;
      const end = Number(Math.min(totalDuration, Math.max(start + 1.0, totalDuration)).toFixed(2));
      return [
        ...prev,
        {
          id: `custom-${Date.now()}`,
          start,
          end,
          gesture: 'open-palms',
          emotion: 'warm',
          spoken: '',
        },
      ];
    });
    setCueDirty(true);
  }, [totalDuration]);

  const useAutomaticCues = useCallback(() => {
    setSavedCueRows(null);
    setCueDraftRows(
      automaticSegments.scaledSegs.map((s) => ({
        id: s.id,
        start: s.start,
        end: s.end,
        gesture: s.gesture,
        emotion: s.emotion,
        spoken: s.spoken,
      }))
    );
    setCueDirty(false);
    setCueNotice('Reset to automatic script-derived cues.');
    showToast('Cue sheet reset to automatic script cues.');
  }, [automaticSegments]);

  const saveCuesForRender = useCallback(() => {
    const sorted = [...cueDraftRows]
      .map((r) => ({
        ...r,
        start: Math.max(0, Number(Number(r.start).toFixed(2))),
        end: Math.max(0.05, Number(Number(r.end).toFixed(2))),
      }))
      .sort((a, b) => a.start - b.start);

    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].end <= sorted[i].start) {
        showToast(`Cue ${i + 1}: End time must be greater than Start time.`);
        return;
      }
      if (i > 0 && sorted[i].start < sorted[i - 1].end - 0.01) {
        showToast(`Cue ${i + 1}: Start overlaps previous cue end (${sorted[i - 1].end.toFixed(2)}s).`);
        return;
      }
    }

    setSavedCueRows(sorted);
    setCueDraftRows(sorted);
    setCueDirty(false);
    setCueNotice(`Saved ${sorted.length} cues for live playback and FFmpeg MP4 render.`);
    showToast(`Saved ${sorted.length} cues for render.`);
  }, [cueDraftRows]);

  // Project Snapshots & Local Folder Picker
  const handleSaveProjectSnapshot = () => {
    const snapshot: ProjectSnapshot = {
      id: `proj_${Date.now()}`,
      name: projectName.trim() || 'Untitled Project',
      updatedAt: new Date().toISOString(),
      characterId: activeCharacter.id,
      scriptText,
      language: scriptLang,
      voiceId: selectedEdgeVoice,
      aspectRatio,
      framing,
      stageBg,
      cueRows: savedCueRows || cueDraftRows,
      aiModelSelection: resolveAiDirectorPayload(),
      watermark,
    };
    const next = [snapshot, ...savedProjects.filter((p) => p.name !== snapshot.name)].slice(0, 20);
    setSavedProjects(next);
    try {
      localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore quota issues
    }
    // Also persist to server endpoint asynchronously
    void fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot),
    }).catch(() => {});
    showToast(`Saved project "${snapshot.name}".`);
  };

  const handleLoadProjectSnapshot = (snap: ProjectSnapshot) => {
    resetPipelineState();
    setProjectName(snap.name);
    const ch = allCharacters.find((c) => c.id === snap.characterId);
    if (ch) onSelectCharacter(ch);
    setScriptText(snap.scriptText);
    setScriptLang(snap.language);
    setSelectedEdgeVoice(snap.voiceId);
    setAspectRatio(snap.aspectRatio);
    setFraming(snap.framing);
    setStageBg(snap.stageBg);
    if (snap.watermark) {
      setWatermark(snap.watermark);
    }
    if (snap.aiModelSelection) {
      const sel = snap.aiModelSelection;
      if (sel.provider === 'auto') setAiDirectorChoice('auto');
      else if (sel.provider === 'offline') setAiDirectorChoice('offline');
      else {
        const key = `${sel.provider}:${sel.model || ''}`;
        if (AI_MODEL_CHOICES.some((m) => m.id === key)) {
          setAiDirectorChoice(key);
        } else if (sel.provider === 'openrouter' && sel.model) {
          setAiDirectorChoice('custom-openrouter');
          setCustomOpenRouterModel(sel.model);
        }
      }
    }
    if (snap.cueRows && snap.cueRows.length > 0) {
      setSavedCueRows(snap.cueRows);
      setCueDraftRows(snap.cueRows);
      setCueNotice(`Loaded ${snap.cueRows.length} saved cues from project.`);
    } else {
      setSavedCueRows(null);
    }
    setIsHistoryOpen(false);
    showToast(`Loaded project "${snap.name}".`);
  };

  const handleDeleteSnapshot = (id: string) => {
    const next = savedProjects.filter((p) => p.id !== id);
    setSavedProjects(next);
    try {
      localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore
    }
    void fetch(`/api/projects/${id}`, { method: 'DELETE' }).catch(() => {});
  };

  const handleChooseLocalFolder = async () => {
    if (typeof (window as any).showDirectoryPicker !== 'function') {
      showToast(`Exports auto-save to server folder: ${exportDirLabel}`);
      return;
    }
    try {
      const dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      setLocalDirHandle(dirHandle);
      setExportDirLabel(`PC Folder: ${dirHandle.name}`);
      showToast(`Connected local folder "${dirHandle.name}" for automatic export copies.`);
    } catch {
      // User cancelled picker
    }
  };

  const writeBlobToChosenFolder = async (blob: Blob, filename: string) => {
    if (!localDirHandle) return;
    try {
      const fileHandle = await localDirHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
    } catch {
      // Fall back quietly to server export + browser download
    }
  };

  const stopPlayback = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    isPlayingRef.current = false;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (importedVideoRef.current) {
      importedVideoRef.current.pause();
    }
    setIsPlaying(false);
    setIsStageBlinking(false);
    setStageLimbOverride(undefined);
    setActiveMouth(activeCharacter.defaultMouth || rhubarbCodeToMouthSprite('X'));
  };

  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, []);

  const startPlayback = (fromTime: number = 0) => {
    stopPlayback();
    const dur = totalDuration;
    const startOffset = fromTime >= dur - 0.15 ? 0 : fromTime;
    setIsPlaying(true);
    isPlayingRef.current = true;
    speechAnchorRef.current = { elapsedOffset: 0, lastCharIndex: -1 };

    const segsSnapshot = timelineSegments;
    const cuesSnapshot = alignmentCues;

    const hasActiveImportedVideo = Boolean(
      importedVideoRef.current &&
      importedVideoUrl
    );
    if (hasActiveImportedVideo && importedVideoRef.current) {
      importedVideoRef.current.muted = true;
      const vidDur = importedVideoRef.current.duration;
      if (Number.isFinite(vidDur) && vidDur > 0) {
        importedVideoRef.current.currentTime = startOffset % vidDur;
      } else {
        importedVideoRef.current.currentTime = 0;
      }
      importedVideoRef.current.play().catch(() => {});
    }

    const usingAudioFile = Boolean(audioRef.current && audioUrl);
    if (usingAudioFile && audioRef.current) {
      audioRef.current.currentTime = startOffset;
      const playProm = audioRef.current.play();
      if (playProm && typeof playProm.catch === 'function') {
        playProm.catch(() => {});
      }
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window && !audioUrl) {
      window.speechSynthesis.cancel();
      const cleanText = scriptText.replace(/\[.*?\]\s*/g, ' ').replace(/\s+/g, ' ').trim();
      const utter = new SpeechSynthesisUtterance(cleanText);
      utter.rate = 1.02;
      window.speechSynthesis.speak(utter);
    }

    const perfStart = performance.now();
    let anchorPerf = perfStart;
    let anchorMedia = startOffset;
    let lastReportedMedia = -1;
    let lastMouth: MouthSprite = activeMouth;
    let lastGesture: HandGesture = activeGesture;
    let lastEmotion: EmotionPreset = activeEmotion;
    let lastSub: string = currentSubtitle;
    let lastBlink = false;
    let lastLimbStamp = -1;

    const frame = (now: number) => {
      if (!isPlayingRef.current) return;

      let elapsed: number;
      if (usingAudioFile && audioRef.current && !audioRef.current.paused) {
        const mediaTime = audioRef.current.currentTime;
        if (Math.abs(mediaTime - lastReportedMedia) > 0.001) {
          anchorPerf = now;
          anchorMedia = mediaTime;
          lastReportedMedia = mediaTime;
        }
        const audioDrift = Math.max(0, (now - anchorPerf) / 1000);
        elapsed = Math.min(dur, anchorMedia + audioDrift);
      } else {
        elapsed = (now - perfStart) / 1000 + startOffset + speechAnchorRef.current.elapsedOffset;
      }

      if (elapsed >= dur || (usingAudioFile && audioRef.current?.ended)) {
        applyTimeToDOMIndicators(dur, dur);
        setCurrentTime(dur);
        stopPlayback();
        return;
      }

      applyTimeToDOMIndicators(elapsed, dur);

      const st = evaluateStateAtTime(elapsed, segsSnapshot, cuesSnapshot);
      if (st.mouth !== lastMouth) {
        lastMouth = st.mouth;
        setActiveMouth(st.mouth);
      }
      if (!manualPoseOverrideRef.current && st.gesture && st.gesture !== lastGesture) {
        lastGesture = st.gesture;
        setActiveGesture(st.gesture);
      }
      if (!manualPoseOverrideRef.current && st.emotion && st.emotion !== lastEmotion) {
        lastEmotion = st.emotion;
        setActiveEmotion(st.emotion);
      }
      if (st.spoken !== lastSub) {
        lastSub = st.spoken;
        liveSubtitleRef.current = st.spoken;
        setCurrentSubtitle(st.spoken);
      }

      const blinkNow = computeBlinkAtTime(elapsed);
      if (blinkNow !== lastBlink) {
        lastBlink = blinkNow;
        setIsStageBlinking(blinkNow);
      }

      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);
  };

  const handleSeek = (newTime: number) => {
    const clamped = Math.max(0, Math.min(totalDuration, newTime));
    setCurrentTime(clamped);
    applyTimeToDOMIndicators(clamped, totalDuration);

    if (audioRef.current && audioUrl) {
      audioRef.current.currentTime = clamped;
    }
    const hasActiveImportedVideo = Boolean(
      importedVideoRef.current &&
      importedVideoUrl
    );
    if (hasActiveImportedVideo && importedVideoRef.current && Number.isFinite(importedVideoRef.current.duration) && importedVideoRef.current.duration > 0) {
      importedVideoRef.current.currentTime = clamped % importedVideoRef.current.duration;
    }

    const st = evaluateStateAtTime(clamped, timelineSegments, alignmentCues);
    setActiveMouth(st.mouth);
    const effectiveGesture = !manualPoseOverrideRef.current && st.gesture ? st.gesture : activeGesture;
    if (!manualPoseOverrideRef.current) {
      if (st.gesture) setActiveGesture(st.gesture);
      if (st.emotion) setActiveEmotion(st.emotion);
    }
    liveSubtitleRef.current = st.spoken;
    setCurrentSubtitle(st.spoken);

    setIsStageBlinking(computeBlinkAtTime(clamped));
    setStageLimbOverride(undefined);
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = pct * totalDuration;
    if (isPlaying) {
      startPlayback(targetTime);
    } else {
      handleSeek(targetTime);
    }
  };

  const handleAlignmentInput = (text: string) => {
    setAlignmentInput(text);
    const parsed = parseAlignmentInput(text);
    const smoothed = parsed.mode === 'rhubarb' ? coalesceMouthCues(parsed.cues, 0.042) : parsed.cues;
    setAlignmentCues(smoothed);
    setAlignmentMeta({ mode: parsed.mode, wordCount: parsed.wordCount });

    if (parsed.mode === 'rhubarb') {
      showToast(`Synced ${smoothed.length} smooth Rhubarb mouthCues (X, A–H).`);
    } else if (parsed.mode === 'whisper') {
      showToast(`Synced ${parsed.wordCount} Faster-Whisper words (${smoothed.length} visemes).`);
    }
  };

  const loadSampleWhisper = () => {
    const sample = `[0.00s -> 0.55s] Welcome\n[0.55s -> 1.05s] to\n[1.05s -> 1.55s] Persona\n[1.55s -> 2.15s] Video\n[2.15s -> 2.80s] Studio.`;
    handleAlignmentInput(sample);
  };

  const handleDownloadRhubarbJson = () => {
    const sourceCues = alignmentCues.length > 0 ? alignmentCues : compiledRhubarbCues;
    const json = exportRhubarbJson(sourceCues, totalDuration);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `rhubarb_${activeCharacter.name.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Downloaded Rhubarb mouthCues JSON.');
  };

  const applyRealRhubarbResponse = (data: {
    mediaId?: string;
    audioUrl?: string;
    duration?: number;
    recognizerUsed?: string;
    mouthCues?: Array<{ start: number; end: number; value: string }>;
    rhubarbJson?: string;
    whisperWordLines?: string;
    words?: Array<{ start: number; end: number; word: string }>;
    wordTimings?: Array<{ start: number; end: number; word: string }>;
    transcribedText?: string;
  }) => {
    if (data.audioUrl) {
      if (audioUrl && audioUrl.startsWith('blob:')) URL.revokeObjectURL(audioUrl);
      setAudioUrl(data.audioUrl);
    }
    if (data.mediaId) setServerMediaId(data.mediaId);
    if (typeof data.duration === 'number' && data.duration > 0) {
      setAudioDuration(data.duration);
    }
    const incomingWords = (Array.isArray(data.words) && data.words.length > 0)
      ? data.words
      : (Array.isArray(data.wordTimings) && data.wordTimings.length > 0)
      ? data.wordTimings
      : [];
    if (incomingWords.length > 0) {
      activeWordTimingsRef.current = incomingWords;
      setActiveWordTimings(incomingWords);
    }
    if (data.transcribedText && (!scriptText.trim() || uploadedAudioFile)) {
      setScriptText(data.transcribedText);
    }
    const cuesRaw = Array.isArray(data.mouthCues) ? data.mouthCues : [];
    const mappedRaw: RhubarbCue[] = cuesRaw.map((c) => {
      const code = (String(c.value || 'X').toUpperCase() as RhubarbCode) || 'X';
      return {
        start: Number(c.start),
        end: Number(c.end),
        value: code,
        mouth: rhubarbCodeToMouthSprite(code),
      };
    });
    const mapped = coalesceMouthCues(mappedRaw, 0.045);
    if (data.rhubarbJson) setAlignmentInput(data.rhubarbJson);
    setAlignmentCues(mapped);
    setAlignmentMeta({ mode: 'rhubarb', wordCount: mapped.length });
    if (data.whisperWordLines) setWordTranscriptPreview(data.whisperWordLines);
    return mapped.length;
  };

  const handleRunRealEdgeTts = async () => {
    const cleanSpoken = scriptText.replace(/\[.*?\]\s*/g, ' ').trim();
    if (!cleanSpoken) {
      showToast('Enter spoken script text before synthesizing.');
      return;
    }

    stopPlayback();
    setIsRunningTts(true);
    try {
      const voiceId = selectedEdgeVoice.split('|')[0] || 'en-US-AndrewMultilingualNeural';
      const customSettings = getStoredCustomSettings();
      let endpoint = '/api/tts/edge';
      let payload: Record<string, any> = {
        text: scriptText,
        voice: voiceId,
        pauseGapSec,
        recognizer: recognizerMode,
        projectName,
      };

      if (customSettings.voiceoverEngine && customSettings.voiceoverEngine !== 'edge-tts') {
        endpoint = '/api/tts/custom';
        payload = {
          text: scriptText,
          engine: customSettings.voiceoverEngine,
          recognizer: recognizerMode,
          openaiApiKey: customSettings.openaiTtsApiKey,
          openaiVoice: customSettings.openaiTtsVoice,
          openaiModel: customSettings.openaiTtsModel,
          elevenlabsApiKey: customSettings.elevenlabsApiKey,
          elevenlabsVoiceId: customSettings.elevenlabsVoiceId,
          customTtsEndpoint: customSettings.customTtsEndpoint,
          customTtsApiKey: customSettings.customTtsApiKey,
          customTtsHeaderName: customSettings.customTtsHeaderName,
          customTtsVoiceId: customSettings.customTtsVoiceId,
          customTtsFormat: customSettings.customTtsFormat,
        };
      }

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Voiceover server execution failed');
      }
      const cueCount = applyRealRhubarbResponse(data);
      const engineLabel = data.engineUsed ? `Voiceover (${data.engineUsed})` : `Edge TTS (${data.phraseCount} clauses)`;
      setLastPipelineStats(
        `${engineLabel}, ${Number(data.duration).toFixed(2)}s WAV + Rhubarb ${data.recognizerUsed} (${cueCount} cues)`
      );
      void refreshExportsHistory();
      showToast(`Generated ${Number(data.duration).toFixed(2)}s WAV + ${cueCount} Rhubarb mouthCues.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Voiceover generation failed');
    } finally {
      setIsRunningTts(false);
    }
  };

  const handleRunRealRhubarbCli = async (fileOverride?: File) => {
    const targetFile = fileOverride || uploadedAudioFile;
    if (!targetFile && !serverMediaId) {
      showToast('Upload an audio file or generate Edge TTS audio first.');
      return;
    }

    stopPlayback();
    setIsRunningRhubarb(true);
    try {
      let resp: Response;
      if (targetFile) {
        const fd = new FormData();
        fd.append('audio', targetFile);
        fd.append('recognizer', recognizerMode);
        if (recognizerMode === 'pocketSphinx' && scriptText.trim()) {
          fd.append('dialogText', scriptText);
        }
        resp = await fetch('/api/rhubarb/analyze', { method: 'POST', body: fd });
      } else {
        resp = await fetch('/api/rhubarb/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mediaId: serverMediaId,
            recognizer: recognizerMode,
            dialogText: recognizerMode === 'pocketSphinx' ? scriptText : undefined,
          }),
        });
      }

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Rhubarb CLI analysis failed');
      }
      const cueCount = applyRealRhubarbResponse(data);
      setLastPipelineStats(
        `Rhubarb CLI (${data.recognizerUsed}): ${cueCount} acoustic cues across ${Number(data.duration).toFixed(2)}s`
      );
      showToast(`Rhubarb extracted ${cueCount} acoustic mouthCues.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Rhubarb CLI failed');
    } finally {
      setIsRunningRhubarb(false);
    }
  };

  const handleTranscribeAndSyncVoiceover = async (fileOverride?: File) => {
    const targetFile = fileOverride || uploadedAudioFile;
    if (!targetFile && !serverMediaId) {
      showToast('Select an audio or video file first.');
      return;
    }

    const isVideo = targetFile && (targetFile.type.startsWith('video/') || /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(targetFile.name));
    if (isVideo && targetFile) {
      await handleExtractVideoAudioWithFile(targetFile);
      return;
    }

    stopPlayback();
    setIsRunningRhubarb(true);
    setIsTranscribingWhisper(true);
    setLiveEtaProgress({ stage: 'transcribe', percent: 35, message: 'Extracting word boundaries & transcribing audio...', eta: '~3s' });

    try {
      let resp: Response;
      if (targetFile) {
        const fd = new FormData();
        fd.append('audio', targetFile);
        fd.append('recognizer', recognizerMode);
        if (recognizerMode === 'pocketSphinx' && scriptText.trim()) {
          fd.append('dialogText', scriptText);
        }
        resp = await fetch('/api/rhubarb/analyze', { method: 'POST', body: fd });
      } else {
        resp = await fetch('/api/rhubarb/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mediaId: serverMediaId,
            recognizer: recognizerMode,
            dialogText: recognizerMode === 'pocketSphinx' ? scriptText : undefined,
          }),
        });
      }

      setLiveEtaProgress({ stage: 'sync', percent: 75, message: 'Generating word-gated Rhubarb lip-sync...', eta: '~1s' });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Voiceover lip-sync analysis failed');
      }

      if (data.audioUrl) {
        setAudioUrl(data.audioUrl);
        if (audioRef.current) {
          audioRef.current.src = data.audioUrl;
          audioRef.current.load();
        }
      }
      if (data.mediaId) {
        setServerMediaId(data.mediaId);
      }

      const dur = Number(data.duration) || 0;
      if (dur > 0) {
        setAudioDuration(dur);
        setTotalDuration(dur);
      }

      const cueCount = applyRealRhubarbResponse(data);

      if (data.transcribedText && data.transcribedText.trim()) {
        replaceScript(data.transcribedText);
        await handleAutoDirect(data.transcribedText);
      }

      setLiveEtaProgress({ stage: 'complete', percent: 100, message: 'Voiceover synchronized! Lips gated to words.', eta: 'Ready' });
      showToast(`✓ Voiceover ready: ${data.words?.length || 0} words & ${cueCount} word-gated mouth shapes.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Transcription & Lip-Sync failed');
    } finally {
      setIsRunningRhubarb(false);
      setIsTranscribingWhisper(false);
      setTimeout(() => setLiveEtaProgress(null), 3000);
    }
  };

  const handleExtractVideoAudioWithFile = async (videoFile: File) => {
    stopPlayback();
    setIsExtractingVideoAudio(true);
    setIsRunningRhubarb(true);
    setIsTranscribingWhisper(true);
    setLiveEtaProgress({ stage: 'transcribe', percent: 25, message: `Extracting voiceover track from ${videoFile.name}...`, eta: '~3s' });

    try {
      const fd = new FormData();
      fd.append('video', videoFile);
      fd.append('recognizer', recognizerMode);
      if (recognizerMode === 'pocketSphinx' && scriptText.trim()) {
        fd.append('dialogText', scriptText);
      }
      const resp = await fetch('/api/audio/from-video', { method: 'POST', body: fd });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Video audio extraction failed');
      }

      setLiveEtaProgress({ stage: 'sync', percent: 75, message: 'Synchronizing words & lip-sync...', eta: '~1s' });

      if (data.audioUrl) {
        setAudioUrl(data.audioUrl);
        if (audioRef.current) {
          audioRef.current.src = data.audioUrl;
          audioRef.current.load();
        }
      }
      if (data.mediaId) {
        setServerMediaId(data.mediaId);
      }
      setUploadedAudioFile(videoFile);

      const dur = Number(data.duration) || 0;
      if (dur > 0) {
        setAudioDuration(dur);
        setTotalDuration(dur);
      }

      const cueCount = applyRealRhubarbResponse(data);

      if (data.transcribedText && data.transcribedText.trim()) {
        replaceScript(data.transcribedText);
        await handleAutoDirect(data.transcribedText);
      }

      if (importedVideoRef.current) {
        importedVideoRef.current.muted = true;
        importedVideoRef.current.defaultMuted = true;
        importedVideoRef.current.playsInline = true;
        importedVideoRef.current.load();
      }

      setLastPipelineStats(
        `Extracted Voice Track (${Number(data.duration).toFixed(2)}s WAV) + ${data.words?.length || 0} words + Rhubarb ${data.recognizerUsed} (${cueCount} mouth cues)`
      );
      setLiveEtaProgress({ stage: 'complete', percent: 100, message: `✓ Voiceover extracted & lips synchronized to ${videoFile.name}!`, eta: 'Ready' });
      showToast(`✓ Voiceover extracted & lips synchronized to ${videoFile.name} (${cueCount} cues)!`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Video audio extraction failed');
    } finally {
      setIsExtractingVideoAudio(false);
      setIsRunningRhubarb(false);
      setIsTranscribingWhisper(false);
      setTimeout(() => setLiveEtaProgress(null), 3000);
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(file.name);

    if (isVideo) {
      if (importedVideoUrl && importedVideoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(importedVideoUrl);
      }
      importedVideoFileRef.current = file;
      const url = URL.createObjectURL(file);
      setImportedVideoUrl(url);
      setImportedVideoName(file.name);

      if (presenterLayout === 'standard') {
        setPresenterLayout('corner-reaction');
      }

      showToast(`Imported video footage: ${file.name}. Extracting voiceover...`);
      await handleExtractVideoAudioWithFile(file);
      return;
    }

    if (audioUrl && audioUrl.startsWith('blob:')) URL.revokeObjectURL(audioUrl);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setUploadedAudioFile(file);
    setServerMediaId(null);
    await handleTranscribeAndSyncVoiceover(file);
  };

  const handleWhisperFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = String(ev.target?.result || '');
        handleAlignmentInput(content);
      };
      reader.readAsText(file);
    }
  };

  const handleCustomBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setCustomBgUrl(String(ev.target?.result || ''));
        setUseTransparentBg(false);
        showToast(`Loaded custom background: ${file.name}`);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImportedVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (importedVideoUrl && importedVideoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(importedVideoUrl);
    }
    importedVideoFileRef.current = file;
    const url = URL.createObjectURL(file);
    setImportedVideoUrl(url);
    setImportedVideoName(file.name);

    if (presenterLayout === 'standard') {
      setPresenterLayout('corner-reaction');
    }

    showToast(`Loaded video: ${file.name}. Auto-extracting voiceover & lip-sync...`);
    await handleExtractVideoAudioWithFile(file);
  };

  const handleExtractVideoAudio = async () => {
    const videoFile = importedVideoFileRef.current;
    if (!videoFile) {
      showToast('Import an MP4/WebM video file first.');
      return;
    }
    await handleExtractVideoAudioWithFile(videoFile);
  };

  const handleRunFasterWhisper = async (fileOverride?: File) => {
    const targetFile = fileOverride || uploadedAudioFile;
    if (!targetFile && !serverMediaId) {
      showToast('Generate Edge TTS or upload an audio/video file first.');
      return;
    }
    setIsTranscribingWhisper(true);
    try {
      const langParam = scriptLang === 'auto' ? 'auto' : String(scriptLang).split('-')[0];
      let resp: Response;
      if (targetFile && !serverMediaId) {
        const fd = new FormData();
        fd.append('audio', targetFile);
        fd.append('language', langParam);
        resp = await fetch('/api/audio/transcribe', { method: 'POST', body: fd });
      } else {
        resp = await fetch('/api/audio/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mediaId: serverMediaId, language: langParam }),
        });
      }
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Faster-Whisper transcription unavailable');
      }
      const transcript = String(data.text || '').trim();
      if (data.wordLines) {
        setWordTranscriptPreview(data.wordLines);
        setAlignmentInput(data.wordLines);
      }
      if (transcript && !scriptText.trim()) {
        // Auto-apply emotion & gesture tags (AI Director) to the transcribed audio text
        replaceScript(transcript);
        await handleAutoDirect(transcript);
        showToast(`Faster-Whisper transcribed ${Array.isArray(data.words) ? data.words.length : 0} words — AI Director tagged emotions & gestures automatically.`);
        return;
      }
      showToast(`Faster-Whisper transcribed ${Array.isArray(data.words) ? data.words.length : 0} words.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Faster-Whisper transcription failed');
    } finally {
      setIsTranscribingWhisper(false);
    }
  };

  const drawDottedOverlay = (ctx: CanvasRenderingContext2D, w: number, h: number, dotColor: string) => {
    ctx.fillStyle = dotColor;
    const step = 36;
    for (let x = 18; x < w; x += step) {
      for (let y = 18; y < h; y += step) {
        ctx.beginPath();
        ctx.arc(x, y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  const drawCanvasBackground = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    transparent: boolean,
    customBgImg: HTMLImageElement | null
  ) => {
    ctx.clearRect(0, 0, w, h);
    if (transparent || useTransparentBg || stageBg === 'checker') return;

    if (customBgImg) {
      ctx.drawImage(customBgImg, 0, 0, w, h);
      return;
    }

    switch (stageBg) {
      case 'original-white':
        ctx.fillStyle = '#F7F7F5';
        ctx.fillRect(0, 0, w, h);
        drawDottedOverlay(ctx, w, h, 'rgba(15, 23, 42, 0.16)');
        break;
      case 'cream':
        ctx.fillStyle = '#EFECE6';
        ctx.fillRect(0, 0, w, h);
        drawDottedOverlay(ctx, w, h, 'rgba(120, 113, 108, 0.2)');
        break;
      case 'sky':
        ctx.fillStyle = '#DCE5EE';
        ctx.fillRect(0, 0, w, h);
        drawDottedOverlay(ctx, w, h, 'rgba(71, 85, 105, 0.18)');
        break;
      case 'midnight':
        ctx.fillStyle = '#131B2E';
        ctx.fillRect(0, 0, w, h);
        drawDottedOverlay(ctx, w, h, 'rgba(148, 163, 184, 0.18)');
        break;
      case 'white':
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
        break;
      case 'black':
        ctx.fillStyle = '#0B0B0E';
        ctx.fillRect(0, 0, w, h);
        break;
      case 'chroma':
        ctx.fillStyle = '#00B140';
        ctx.fillRect(0, 0, w, h);
        break;
      case 'card':
        ctx.fillStyle = activeCharacter.tileHex || '#52B467';
        ctx.fillRect(0, 0, w, h);
        break;
      case 'grid': {
        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
        ctx.lineWidth = 2;
        for (let x = 0; x < w; x += 48) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let y = 0; y < h; y += 48) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        break;
      }
    }
  };

  const loadCustomBgImage = async (): Promise<HTMLImageElement | null> => {
    if (!customBgUrl) return null;
    return await new Promise<HTMLImageElement | null>((resolve) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => resolve(null);
      im.src = customBgUrl;
    });
  };

  const compositeStageToCanvas = async (
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    transparent: boolean,
    customBgImg: HTMLImageElement | null,
    subtitleText: string,
    cachedBgCanvas?: HTMLCanvasElement | null
  ): Promise<boolean> => {
    const svgEl = stageContainerRef.current?.querySelector('svg');
    if (!svgEl) return false;
    const svgStr = new XMLSerializer().serializeToString(svgEl);
    const dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`;

    return await new Promise<boolean>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const isTransparent = transparent || useTransparentBg || stageBg === 'checker';
        if (cachedBgCanvas && !isTransparent) {
          ctx.drawImage(cachedBgCanvas, 0, 0);
        } else {
          drawCanvasBackground(ctx, canvas.width, canvas.height, isTransparent, customBgImg);
        }

        const isPortraitSplit = (showSplitPane || presenterLayout === 'split-screen') && aspectRatio === '9:16';
        const isLandscapeSplit = (showSplitPane || presenterLayout === 'split-screen') && aspectRatio !== '9:16';
        const isOverlayMode = presenterLayout === 'corner-reaction' || presenterLayout === 'circle-pip' || presenterLayout === 'side-anchor';

        // Draw imported video (full frame for reaction/pip/background/standard or box for split)
        const vidEl = importedVideoRef.current;
        if (vidEl && (vidEl.readyState >= 1 || vidEl.videoWidth > 0)) {
          if (isOverlayMode || (!showSplitPane && presenterLayout !== 'split-screen') || presenterLayout === 'standard') {
            ctx.drawImage(vidEl, 0, 0, canvas.width, canvas.height);
          } else {
            const bx = isPortraitSplit ? canvas.width * 0.08 : canvas.width * 0.05;
            const by = isPortraitSplit ? canvas.height * 0.06 : canvas.height * 0.14;
            const bw = isPortraitSplit ? canvas.width * 0.84 : canvas.width * 0.45;
            const bh = isPortraitSplit ? canvas.height * 0.40 : canvas.height * 0.72;
            ctx.drawImage(vidEl, bx, by, bw, bh);
          }
        } else if (!isTransparent && (showSplitPane || presenterLayout === 'split-screen')) {
          const bx = isPortraitSplit ? canvas.width * 0.08 : canvas.width * 0.05;
          const by = isPortraitSplit ? canvas.height * 0.06 : canvas.height * 0.14;
          const bw = isPortraitSplit ? canvas.width * 0.84 : canvas.width * 0.45;
          const bh = isPortraitSplit ? canvas.height * 0.40 : canvas.height * 0.72;
          ctx.fillStyle = '#121215';
          ctx.fillRect(bx, by, bw, bh);
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
          ctx.lineWidth = 3;
          ctx.strokeRect(bx, by, bw, bh);
          ctx.fillStyle = '#F59E0B';
          ctx.font = 'bold 30px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(splitTopic.slice(0, 32), bx + 28, by + 64);
        }

        if (presenterLayout === 'corner-reaction') {
          // Bottom corner transparent reaction overlay
          const drawH = canvas.height * 0.44 * (videoScale / 100);
          const drawW = drawH * (framing === 'full' ? 240 / 375 : 240 / 225);
          const posX = reactionCorner === 'right' ? canvas.width - drawW - canvas.width * 0.04 : canvas.width * 0.04;
          const posY = canvas.height - drawH + (videoY / 375) * canvas.height * 0.2;
          ctx.save();
          const tiltDeg = reactionCorner === 'right' ? 3 : -3;
          ctx.translate(posX + drawW / 2, posY + drawH);
          ctx.rotate((tiltDeg * Math.PI) / 180);
          ctx.drawImage(img, -drawW / 2, -drawH, drawW, drawH);
          ctx.restore();
        } else if (presenterLayout === 'circle-pip') {
          // Circular floating webcam bubble
          const radius = canvas.width * (aspectRatio === '9:16' ? 0.22 : 0.14);
          const cx = reactionCorner === 'right' ? canvas.width - radius - 30 : radius + 30;
          const cy = canvas.height - radius - 40;
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.clip();
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
          const drawH = radius * 2.3;
          const drawW = drawH * (framing === 'full' ? 240 / 375 : 240 / 225);
          ctx.drawImage(img, cx - drawW / 2, cy - drawH * 0.42, drawW, drawH);
          ctx.restore();
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.lineWidth = 6;
          ctx.strokeStyle = '#FFFFFF';
          ctx.stroke();
        } else if (presenterLayout === 'side-anchor') {
          // Side anchor layout (1/3)
          const drawH = canvas.height * 0.78 * (videoScale / 100);
          const drawW = drawH * (framing === 'full' ? 240 / 375 : 240 / 225);
          const posX = reactionCorner === 'right' ? canvas.width - drawW - canvas.width * 0.05 : canvas.width * 0.05;
          const posY = canvas.height - drawH;
          ctx.drawImage(img, posX, posY, drawW, drawH);
        } else {
          // Standard / Split Screen
          const drawH =
            canvas.height *
            (isPortraitSplit ? 0.48 : isTransparent ? 0.88 : 0.86) *
            (videoScale / 100);
          const drawW = drawH * (framing === 'full' ? 240 / 375 : 240 / 225);
          const offsetX = (videoX / 240) * canvas.width * 0.4;
          const offsetY = (videoY / 375) * canvas.height * 0.4;

          const centerX = isLandscapeSplit ? canvas.width * 0.75 : canvas.width / 2;
          const topY = isPortraitSplit
            ? canvas.height * 0.50 + offsetY
            : (canvas.height - drawH) / 2 + offsetY;

          ctx.drawImage(img, centerX - drawW / 2 + offsetX, topY, drawW, drawH);
        }

        if (!isTransparent && burnSubtitles && subtitleText) {
          const cleanSub = subtitleText.replace(/\s+/g, ' ').trim();
          const maxCharsPerLine = canvas.width <= 1080 ? 38 : 62;
          const words = cleanSub.split(' ');
          const lines: string[] = [];
          let cur = '';
          for (const w of words) {
            const candidate = cur ? `${cur} ${w}` : w;
            if (candidate.length <= maxCharsPerLine) {
              cur = candidate;
            } else {
              if (cur) lines.push(cur);
              cur = w;
              if (lines.length >= 2) break;
            }
          }
          if (cur && lines.length < 2) lines.push(cur);
          const fontSize = canvas.width <= 1080 ? 28 : 26;
          const lineHeight = fontSize + 10;
          const boxH = lines.length * lineHeight + 28;
          const boxY = canvas.height - boxH - 42;
          const boxW = canvas.width * 0.84;
          const boxX = canvas.width * 0.08;
          // Neubrutalist subtitle caption card
          ctx.fillStyle = '#111111';
          ctx.fillRect(boxX + 5, boxY + 5, boxW, boxH);
          ctx.fillStyle = '#FFFDF7';
          ctx.fillRect(boxX, boxY, boxW, boxH);
          ctx.strokeStyle = '#111111';
          ctx.lineWidth = 4;
          ctx.strokeRect(boxX, boxY, boxW, boxH);
          ctx.fillStyle = '#111111';
          ctx.font = `bold ${fontSize}px sans-serif`;
          ctx.textAlign = 'center';
          lines.forEach((ln, idx) => {
            ctx.fillText(ln, canvas.width / 2, boxY + 36 + idx * lineHeight);
          });
        }

        const wmLabel = (watermark.text || watermark.authorName).trim();
        if (watermark.enabled && wmLabel) {
          ctx.save();
          ctx.globalAlpha = Math.max(0.2, Math.min(1, watermark.opacity));
          ctx.font = 'bold 24px monospace';
          const textMetrics = ctx.measureText(wmLabel);
          const badgeW = Math.min(canvas.width * 0.45, Math.ceil(textMetrics.width) + 34);
          const badgeH = 44;
          const coords = computeWatermarkCoords(watermark.position, canvas.width, canvas.height, badgeW, badgeH);
          ctx.fillStyle = '#111111';
          ctx.fillRect(coords.x + 4, coords.y + 4, badgeW, badgeH);
          ctx.fillStyle = '#FFDE59';
          ctx.fillRect(coords.x, coords.y, badgeW, badgeH);
          ctx.strokeStyle = '#111111';
          ctx.lineWidth = 3;
          ctx.strokeRect(coords.x, coords.y, badgeW, badgeH);
          ctx.fillStyle = '#111111';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(wmLabel, coords.x + 16, coords.y + badgeH / 2 + 1);
          ctx.restore();
        }

        resolve(true);
      };
      img.onerror = () => {
        resolve(false);
      };
      img.src = dataUri;
    });
  };

  const handleRenderMp4Ffmpeg = async () => {
    if (renderProgress.active) {
      cancelRenderRef.current = true;
      // Tell the server to drop the job + delete orphaned frame files
      const jobId = activeRenderJobRef.current;
      if (jobId) {
        void fetch('/api/render/abort', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId }),
        }).catch(() => {});
      }
      showToast('FFmpeg render cancelled.');
      return;
    }

    const canvas = hiddenCanvasRef.current;
    if (!canvas) return;

    // Pipeline gate: never silently render a muted video.
    if (!serverMediaId) {
      showToast('No voiceover yet — the render would be silent. Generate Edge TTS or import/extract audio first.');
      return;
    }
    // Unsaved manual cue edits would be silently ignored by the render merge.
    if (cueDirty && cueDraftRows.length > 0) {
      showToast('Cue sheet has unsaved edits — click "Save cues for render" first or they will not appear in the video.');
      return;
    }

    stopPlayback();
    const res = getExportResolution(aspectRatio);
    canvas.width = res.width;
    canvas.height = res.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const fps = exportFps;
    const isWebmExport = exportFormat === 'webm';
    const isTransparentCapture = isWebmExport || useTransparentBg || stageBg === 'checker';
    const frameMime = isWebmExport ? 'image/png' : 'image/jpeg';
    const dur = Math.max(0.5, totalDuration);
    const totalFrames = Math.max(2, Math.ceil(dur * fps));
    const customImgEl = isTransparentCapture ? null : await loadCustomBgImage();

    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = res.width;
    bgCanvas.height = res.height;
    const bgCtx = bgCanvas.getContext('2d');
    if (bgCtx && !isTransparentCapture) {
      drawCanvasBackground(bgCtx, res.width, res.height, false, customImgEl);
    }

    cancelRenderRef.current = false;
    setRenderedMp4Url(null);
    setRenderedSavedPath(null);
    setRenderProgress({
      active: true,
      current: 0,
      total: totalFrames,
      stage: isWebmExport ? 'Starting Transparent VP9 WebM render job...' : 'Starting FFmpeg H.264 MP4 render job...',
    });

    try {
      const startResp = await fetch('/api/render/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fps, mediaId: serverMediaId, projectName, format: exportFormat }),
      });
      const startData = await startResp.json();
      if (!startResp.ok || !startData.jobId) {
        throw new Error(startData.error || 'Could not start FFmpeg render job');
      }
      const jobId: string = startData.jobId;
      activeRenderJobRef.current = jobId;

      const frameCache = new Map<string, Blob>();
      const inFlightUploads: Promise<void>[] = [];

      const queueUpload = (idx: number, blob: Blob) => {
        const p = fetch('/api/render/frame', {
          method: 'POST',
          headers: {
            'x-render-job': jobId,
            'x-frame-index': String(idx),
            'Content-Type': frameMime,
          },
          body: blob,
        }).then((resp) => {
          if (!resp.ok) throw new Error(`Frame ${idx} upload failed`);
        });
        inFlightUploads.push(p);
      };

      const hasActiveVideo = Boolean(
        importedVideoRef.current &&
        importedVideoUrl &&
        !isWebmExport
      );

      for (let i = 0; i < totalFrames; i++) {
        if (cancelRenderRef.current) {
          showToast('FFmpeg render cancelled.');
          return;
        }

        const t = Math.min(dur, i / fps);
        const st = evaluateStateAtTime(t, timelineSegments, alignmentCues);
        const frameGesture = manualPoseOverride ? activeGesture : st.gesture;
        const frameEmotion = manualPoseOverride ? activeEmotion : st.emotion;
        const frameSubtitle = burnSubtitles ? st.spoken : '';
        const frameBlink = computeBlinkAtTime(t);
        const frameLimbs = evaluateLimbPoseAtTime({
          t,
          segments: timelineSegments,
          manualPoseOverride,
          manualGesture: frameGesture || activeGesture,
          isSpeaking: st.mouth !== 'neutral',
        });
        const limbSig = `${Math.round(frameLimbs.L.ex)}:${Math.round(frameLimbs.L.ey)}:${Math.round(frameLimbs.L.wx)}:${Math.round(frameLimbs.L.wy)}:${Math.round(frameLimbs.L.rot)}:${frameLimbs.L.pose}|${Math.round(frameLimbs.R.ex)}:${Math.round(frameLimbs.R.ey)}:${Math.round(frameLimbs.R.wx)}:${Math.round(frameLimbs.R.wy)}:${Math.round(frameLimbs.R.rot)}:${frameLimbs.R.pose}`;

        if (hasActiveVideo && importedVideoRef.current && Number.isFinite(importedVideoRef.current.duration) && importedVideoRef.current.duration > 0) {
          importedVideoRef.current.currentTime = t % importedVideoRef.current.duration;
          await new Promise((r) => setTimeout(r, 20));
        }

        const stateKey = hasActiveVideo
          ? `vid_${i}`
          : `${st.mouth}|${frameGesture || ''}|${frameEmotion || ''}|${frameSubtitle}|${limbSig}|b${frameBlink ? 1 : 0}|wm${watermark.enabled ? watermark.position + watermark.text + watermark.opacity : '0'}`;

        let frameBlob = frameCache.get(stateKey);
        if (!frameBlob) {
          flushSync(() => {
            setActiveMouth(st.mouth);
            if (frameGesture) setActiveGesture(frameGesture);
            if (frameEmotion) setActiveEmotion(frameEmotion);
            setCurrentSubtitle(frameSubtitle);
            setIsStageBlinking(frameBlink);
            setStageLimbOverride(frameLimbs);
            setCurrentTime(t);
          });
          applyTimeToDOMIndicators(t, dur);

          await compositeStageToCanvas(
            canvas,
            ctx,
            isTransparentCapture,
            customImgEl,
            frameSubtitle,
            !isTransparentCapture && bgCtx ? bgCanvas : null
          );

          const encoded = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, frameMime, isWebmExport ? undefined : 0.9)
          );
          if (!encoded) throw new Error(`Failed encoding frame ${i}`);
          frameBlob = encoded;
          if (!hasActiveVideo) frameCache.set(stateKey, frameBlob);
        }

        queueUpload(i, frameBlob);

        if (inFlightUploads.length >= 6) {
          await Promise.all(inFlightUploads.splice(0, inFlightUploads.length));
          setRenderProgress({
            active: true,
            current: i + 1,
            total: totalFrames,
            stage: `Capturing ${isWebmExport ? 'RGBA PNG' : 'JPEG'} frame ${i + 1}/${totalFrames} (${fps} fps)...`,
          });
        }
      }

      if (inFlightUploads.length > 0) {
        await Promise.all(inFlightUploads);
      }

      setRenderProgress({
        active: true,
        current: totalFrames,
        total: totalFrames,
        stage: isWebmExport
          ? 'Encoding Transparent VP9 WebM (yuva420p) + Audio via FFmpeg...'
          : 'Encoding H.264 MP4 + Muxing Audio via FFmpeg...',
      });

      const finishResp = await fetch('/api/render/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, projectName }),
      });
      const finishData = await finishResp.json();
      if (!finishResp.ok || !finishData.videoUrl) {
        throw new Error(finishData.error || 'FFmpeg video encoding failed');
      }

      const finalFmt: 'mp4' | 'webm' = finishData.format === 'webm' ? 'webm' : 'mp4';
      setRenderedFormat(finalFmt);
      setRenderedMp4Url(finishData.videoUrl);
      setRenderedSavedPath(finishData.savedPath || null);

      if (localDirHandle) {
        const videoBlob = await fetch(finishData.videoUrl).then((r) => r.blob());
        await writeBlobToChosenFolder(
          videoBlob,
          finishData.savedExport?.filename || `${projectName}.${finalFmt}`
        );
      }

      void refreshExportsHistory();
      showToast(
        `Rendered ${res.width}×${res.height} ${finalFmt.toUpperCase()} (${(finishData.sizeBytes / 1024).toFixed(1)} KB) saved to ${finishData.savedPath || exportDirLabel}.`
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'FFmpeg render failed');
    } finally {
      activeRenderJobRef.current = null;
      setRenderProgress({ active: false, current: 0, total: 0, stage: '' });
      handleSeek(0);
    }
  };

  const handleFastStreamExport = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      return;
    }

    const canvas = hiddenCanvasRef.current;
    if (!canvas || typeof canvas.captureStream !== 'function') {
      showToast('Canvas captureStream not supported in this browser.');
      return;
    }

    const res = getExportResolution(aspectRatio);
    canvas.width = res.width;
    canvas.height = res.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const customImgEl = await loadCustomBgImage();
    const dur = Math.max(0.5, totalDuration);
    const canvasStream = canvas.captureStream(30);
    const chunks: Blob[] = [];

    let mimeType = 'video/webm;codecs=vp9';
    if (typeof MediaRecorder !== 'undefined' && !MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8';
    }
    if (typeof MediaRecorder !== 'undefined' && !MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }

    const recorder = new MediaRecorder(canvasStream, { mimeType, videoBitsPerSecond: 10000000 });
    mediaRecorderRef.current = recorder;

    setRenderProgress({
      active: true,
      current: 0,
      total: Math.ceil(dur),
      stage: `Starting Ultra-Fast 1080p stream capture (${dur.toFixed(1)}s)...`,
    });

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = async () => {
      setIsRecordingWebM(false);
      setRenderProgress({
        active: true,
        current: Math.ceil(dur),
        total: Math.ceil(dur),
        stage: 'Transcoding 1080p H.264 MP4 with FFmpeg & muxing audio (<1s)...',
      });

      try {
        const rawBlob = new Blob(chunks, { type: 'video/webm' });
        const fd = new FormData();
        fd.append('video', rawBlob, 'stream.webm');
        fd.append('projectName', projectName);
        fd.append('format', exportFormat);
        if (serverMediaId) fd.append('mediaId', serverMediaId);

        const resp = await fetch('/api/render/fast-export', {
          method: 'POST',
          body: fd,
        });
        const data = await resp.json();
        if (!resp.ok) {
          throw new Error(data.error || 'Fast export failed on server');
        }

        setRenderedMp4Url(data.videoUrl || data.tempUrl);
        setRenderedSavedPath(data.savedPath || null);
        void refreshExportsHistory();

        // Direct browser download trigger
        const a = document.createElement('a');
        a.href = data.videoUrl || data.tempUrl;
        a.download = data.savedExport?.fileName || `ccavatarstudio_${projectName}.${exportFormat}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        showToast(`Ultra-Fast Render complete! Saved to exports in ${dur.toFixed(1)}s.`);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Fast render failed');
      } finally {
        setRenderProgress({ active: false, current: 0, total: 0, stage: '' });
      }
    };

    if (importedVideoRef.current && importedVideoUrl) {
      importedVideoRef.current.muted = true;
      importedVideoRef.current.defaultMuted = true;
      importedVideoRef.current.playsInline = true;
      importedVideoRef.current.currentTime = 0;
    }
    if (audioRef.current && audioUrl) {
      audioRef.current.currentTime = 0;
      audioRef.current.load();
    }

    recorder.start(250);
    setIsRecordingWebM(true);
    startPlayback(0);

    let busyFrame = false;
    const captureLoop = () => {
      if (recorder.state !== 'recording') return;
      if (!isPlayingRef.current) {
        recorder.stop();
        return;
      }

      if (!busyFrame) {
        busyFrame = true;
        void compositeStageToCanvas(
          canvas,
          ctx,
          false,
          customImgEl,
          burnSubtitles ? liveSubtitleRef.current : ''
        ).finally(() => {
          busyFrame = false;
        });
      }

      const curSec = audioRef.current?.currentTime || 0;
      setRenderProgress({
        active: true,
        current: Math.floor(curSec),
        total: Math.ceil(dur),
        stage: `Ultra-Fast Stream Render: ${curSec.toFixed(1)}s / ${dur.toFixed(1)}s`,
      });

      window.setTimeout(() => {
        requestAnimationFrame(captureLoop);
      }, 1000 / 30);
    };

    requestAnimationFrame(captureLoop);
  };

  const handleRecord1080pWebM = handleFastStreamExport;

  const handleExport1080pFrame = async (transparent: boolean = false) => {
    const canvas = hiddenCanvasRef.current;
    if (!canvas) return;
    const res = getExportResolution(aspectRatio);
    canvas.width = res.width;
    canvas.height = res.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const customImgEl = transparent ? null : await loadCustomBgImage();
    const ok = await compositeStageToCanvas(canvas, ctx, transparent, customImgEl, '');
    if (!ok) return;

    canvas.toBlob(async (b) => {
      if (!b) return;
      const fileName = `ccavatarstudio_${activeCharacter.name.replace(/\s+/g, '_')}_${canvas.width}x${canvas.height}_frame.png`;
      await writeBlobToChosenFolder(b, fileName);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast(`Exported ${canvas.width}×${canvas.height} PNG.`);
    }, 'image/png');
  };

  const handleDeleteServerExport = async (item: ExportHistoryItem) => {
    try {
      const urlParts = item.url.split('/');
      const slug = urlParts[urlParts.length - 2];
      const fname = urlParts[urlParts.length - 1];
      await fetch(`/api/exports/${slug}/${fname}`, { method: 'DELETE' });
      void refreshExportsHistory();
      showToast(`Removed ${item.filename}`);
    } catch {
      showToast('Could not remove export file.');
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      showToast('Copied CLI command.');
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  const rawTextClean = scriptText.replace(/\[.*?\]\s*/g, '').replace(/"/g, '\\"').trim();
  const activeVoiceId = activeVoiceInfo?.shortName || selectedEdgeVoice.split('|')[0] || 'en-US-AndrewMultilingualNeural';
  const edgeTargetLang = activeVoiceInfo?.languageCode || activeVoiceId.split('-')[0] || 'en';
  const edgeGender = (activeVoiceInfo?.gender || 'male').toLowerCase();
  const edgeCliCommand = `python3 scripts/edge_voiceover_pipeline.py --text "${rawTextClean}" --target-lang ${edgeTargetLang} --gender ${edgeGender} --voice ${activeVoiceId} --max-pause ${pauseGapSec.toFixed(2)} --recognizer ${recognizerMode} --output edge_voiceover.wav`;
  const omniCliCommand = `HF_TOKEN="primary_hf_token" HF_TOKEN_2="backup_hf_token" python3 scripts/voiceover_pipeline.py --text "${rawTextClean}" --target-lang ${omniLang} --speed ${omniSpeed} --ref-audio "${omniRefAudio}" --recognizer ${recognizerMode} --output voiceover.wav`;

  const exportRes = getExportResolution(aspectRatio);
  const activeRhubarbCode = mouthSpriteToRhubarbCode(activeMouth);
  const coupledEye = useMemo(
    () => EMOTIONS_LIST.find((e) => e.id === activeEmotion)?.defaultEye || activeCharacter.defaultEye,
    [activeEmotion, activeCharacter.defaultEye]
  );

  const displayedVisemeBlocks = useMemo(() => {
    if (alignmentCues.length > 0) {
      return alignmentCues.map((c, idx) => ({
        key: `ext-${idx}`,
        start: c.start,
        end: c.end,
        code: c.value,
      }));
    }
    return timelineSegments.flatMap((s, idx) =>
      s.vBlocks.map((vb, vIdx) => ({
        key: `${idx}-${vIdx}`,
        start: vb.start,
        end: vb.end,
        code: vb.rhubarb,
      }))
    );
  }, [alignmentCues, timelineSegments]);

  const viewportAspectClass =
    aspectRatio === '16:9'
      ? 'w-full aspect-video min-h-[410px]'
      : aspectRatio === '9:16'
      ? 'w-full max-w-[330px] mx-auto aspect-[9/16] min-h-[480px]'
      : 'w-full max-w-[440px] mx-auto aspect-square min-h-[410px]';

  const effectiveStageBg: StageBackgroundType = useTransparentBg ? 'checker' : stageBg;

  const handleWatermarkChange = useCallback((patch: Partial<WatermarkConfig>) => {
    setWatermark((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleToggleCueSheet = useCallback(() => {
    setIsCueSheetOpen((prev) => !prev);
  }, []);

  const handleRunRhubarbBtn = useCallback(() => {
    void handleRunRealRhubarbCli();
  }, [uploadedAudioFile, serverMediaId, recognizerMode, scriptText]);

  const watermarkCornerClasses: Record<WatermarkConfig['position'], string> = {
    'top-left': 'top-11 left-3',
    'top-right': 'top-11 right-3',
    'bottom-left': 'bottom-3 left-3',
    'bottom-right': 'bottom-3 right-3',
  };

  return (
    <div className="w-full space-y-5">
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 px-4 py-2.5 bg-slate-900 text-white text-xs font-medium rounded-xl shadow-lg border border-slate-800 flex items-center gap-2"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <canvas ref={hiddenCanvasRef} className="hidden" />
      <input
        ref={customBgInputRef}
        type="file"
        accept="image/*"
        onChange={handleCustomBgUpload}
        className="hidden"
      />
      <audio
        ref={audioRef}
        src={audioUrl || undefined}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (isFinite(d) && d > 0) setAudioDuration(d);
        }}
        className="hidden"
      />

      {/* 1. TOP STUDIO ACTION BAR */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <input
            id="project-name-input"
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Untitled Project"
            className="h-9 px-3 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-44 sm:w-56"
          />
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
            <span>Presenter:</span>
            <strong className="text-slate-800 font-semibold">{activeCharacter.name}</strong>
            <span className="text-slate-300">·</span>
            <span className="text-[11px] font-mono text-slate-400 truncate max-w-[180px]" title={`Save Path: ./exports/${sanitizeProjectSlug(projectName)}/`}>
              📁 ./exports/{sanitizeProjectSlug(projectName)}/
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleChooseLocalFolder}
            className="h-8 px-2.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer transition shadow-xs"
            title="Set PC export destination folder"
          >
            <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden md:inline">Output Path</span>
          </button>

          <button
            type="button"
            onClick={handleSaveProjectSnapshot}
            className="h-8 px-3 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer transition shadow-xs"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Save Project</span>
          </button>

          <button
            type="button"
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className={`h-8 px-3 text-xs font-semibold rounded-lg border flex items-center gap-1.5 cursor-pointer transition shadow-xs ${
              isHistoryOpen
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History ({savedProjects.length + exportHistory.length})</span>
          </button>
        </div>
      </div>

      {/* Collapsible Project & Export History Drawer */}
      {isHistoryOpen && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900">
                Saved Project Snapshots ({savedProjects.length})
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">Local Browser Storage</span>
            </div>
            {savedProjects.length === 0 ? (
              <p className="text-xs text-slate-500 py-3">
                No project snapshots saved yet. Click Save Project above to snapshot your script, character, voice, watermark, and cues.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {savedProjects.map((snap) => (
                  <div key={snap.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 truncate">{snap.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                        {snap.aspectRatio} · {snap.language.toUpperCase()} · {new Date(snap.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleLoadProjectSnapshot(snap)}
                        className="h-7 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg cursor-pointer transition"
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSnapshot(snap.id)}
                        aria-label={`Delete project ${snap.name}`}
                        className="h-7 w-7 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-600 flex items-center justify-center cursor-pointer transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900">
                Export History ({exportHistory.length})
              </h3>
              <span className="text-[11px] text-slate-400 font-mono truncate max-w-[220px]">{exportDirLabel}</span>
            </div>
            {exportHistory.length === 0 ? (
              <p className="text-xs text-slate-500 py-3">
                No exports saved yet. Generated Edge TTS WAVs and rendered MP4 files appear here automatically.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {exportHistory.map((item) => (
                  <div key={item.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 truncate">{item.filename}</div>
                      <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                        {item.format.toUpperCase()} · {item.sizeBytes ? `${(item.sizeBytes / 1024).toFixed(1)} KB` : ''} · {item.savedPath}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={item.url}
                        download={item.filename}
                        className="h-7 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition"
                      >
                        <Download className="w-3 h-3" />
                        <span>Get</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteServerExport(item)}
                        aria-label={`Delete export ${item.filename}`}
                        className="h-7 w-7 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-600 flex items-center justify-center cursor-pointer transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {isEgmDrawerOpen && (
        <div className="nb-card bg-[#70D6FF] p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#111111]">
              Persona Studio Puppet Architecture (EGM v3.0 + Rhubarb Lip-Sync)
            </span>
            <a
              href="https://github.com/google/elephant-goldfish-model#install"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold underline flex items-center gap-1 text-[#111111]"
            >
              <span>elephant-goldfish-model</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="text-xs text-[#111111] leading-relaxed">
            Deterministic SVG puppet layers with synchronized cubic-eased arm kinematics, timed natural blinking, coupled emotion brows, top-left (-35°) key light, 0px outline geometry, and Rhubarb phonetic/acoustic visemes (X, A–H).
          </p>
        </div>
      )}

      {/* 2. MAIN TWO-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN (5 COLS): GUIDED STEP RAIL + CURRENT STEP PANELS */}
        <div className="lg:col-span-5 space-y-4">
          {/* 3-Step Clean Segmented Control */}
          <div role="tablist" aria-label="Studio pipeline steps" className="bg-slate-100 p-1 border border-slate-200 rounded-xl grid grid-cols-3 gap-1 shadow-xs">
            {studioStepMeta.map((s, i) => {
              const isActive = s.id === studioStep;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setStudioStep(s.id)}
                  className={`py-2 px-2 text-center text-xs font-bold rounded-lg cursor-pointer transition ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Step 1: Voice & Script */}
          {studioStep === 'script' && (
          <>
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Languages className="w-4 h-4 text-indigo-600" />
                <span>Spoken Script</span>
              </span>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) handleLoadPreset(e.target.value);
                  }}
                  className="h-8 px-2.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="">Load Sample Script...</option>
                  {PRESET_SCRIPTS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>

                <select
                  value={scriptLang}
                  onChange={(e) => {
                    const lang = e.target.value as ScriptLanguageCode;
                    setScriptLang(lang);
                    applyLanguageVoiceDefaults(lang);
                  }}
                  aria-label="Script Language"
                  className="h-8 px-2.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="auto">Auto-Detect</option>
                  <option value="en">English</option>
                  <option value="hi">Hindi (हिन्दी)</option>
                  <option value="ur">Urdu (اردو)</option>
                  <option value="es">Spanish (Español)</option>
                  <option value="fr">French (Français)</option>
                  <option value="ar">Arabic (العربية)</option>
                  <option value="ja">Japanese (日本語)</option>
                  <option value="de">German (Deutsch)</option>
                  <option value="tr">Turkish (Türkçe)</option>
                </select>
              </div>
            </div>

            <textarea
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              rows={4}
              dir="auto"
              placeholder="Type or paste your spoken script here... You can use directing tags like [wave|warm] or click Auto-Direct below."
              className="w-full p-3 text-xs text-slate-800 bg-slate-50/60 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y leading-relaxed font-normal"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAutoDirect()}
                  disabled={isAnalyzingScript}
                  className="h-8 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded-lg border border-indigo-200 flex items-center gap-1.5 cursor-pointer transition disabled:opacity-50"
                >
                  {isAnalyzingScript ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sliders className="w-3.5 h-3.5" />}
                  <span>{isAnalyzingScript ? 'Directing...' : 'Auto-Direct Expressions & Gestures'}</span>
                </button>

                {scriptUndoSnapshot && (
                  <button
                    type="button"
                    onClick={handleUndoScriptReplace}
                    className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-1 cursor-pointer transition"
                    title="Undo AI Directing"
                  >
                    <Undo2 className="w-3 h-3" />
                    <span>Undo</span>
                  </button>
                )}
              </div>

              <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                Duration: ~{totalDuration.toFixed(1)}s
              </span>
            </div>
          </div>

          <VoicePipelinePanel
            voiceTab={voiceTab}
            setVoiceTab={setVoiceTab}
            isLoadingVoices={isLoadingVoices}
            edgeVoices={edgeVoices}
            filteredEdgeVoices={filteredEdgeVoices}
            edgeLocales={edgeLocales}
            voiceLocaleFilter={voiceLocaleFilter}
            setVoiceLocaleFilter={setVoiceLocaleFilter}
            voiceGenderFilter={voiceGenderFilter}
            setVoiceGenderFilter={setVoiceGenderFilter}
            voiceSearch={voiceSearch}
            setVoiceSearch={setVoiceSearch}
            selectedEdgeVoice={selectedEdgeVoice}
            setSelectedEdgeVoice={setSelectedEdgeVoice}
            setScriptLang={setScriptLang}
            recognizerMode={recognizerMode}
            setRecognizerMode={setRecognizerMode}
            pauseGapSec={pauseGapSec}
            setPauseGapSec={setPauseGapSec}
            isRunningTts={isRunningTts}
            onRunRealEdgeTts={handleRunRealEdgeTts}
            lastPipelineStats={lastPipelineStats}
            audioUrl={audioUrl}
            audioDuration={audioDuration}
            activeCharacterName={activeCharacter.name}
            onDownloadRhubarbJson={handleDownloadRhubarbJson}
            wordTranscriptPreview={wordTranscriptPreview}
            uploadedAudioFile={uploadedAudioFile}
            serverMediaId={serverMediaId}
            isRunningRhubarb={isRunningRhubarb}
            isTranscribingWhisper={isTranscribingWhisper}
            liveEtaProgress={liveEtaProgress}
            onTranscribeAndSync={handleTranscribeAndSyncVoiceover}
            onAutoDirect={() => handleAutoDirect()}
            isAnalyzingScript={isAnalyzingScript}
            alignmentInput={alignmentInput}
            onLoadSampleWhisper={loadSampleWhisper}
            onAudioUpload={handleAudioUpload}
            onWhisperFileUpload={handleWhisperFileUpload}
            onRunRealRhubarbCli={handleRunRhubarbBtn}
            onRunFasterWhisper={handleRunFasterWhisper}
            onAlignmentInput={handleAlignmentInput}
            pythonVersion={engineCaps?.python?.version}
            omniLang={omniLang}
            setOmniLang={setOmniLang}
            omniRefAudio={omniRefAudio}
            setOmniRefAudio={setOmniRefAudio}
            edgeCliCommand={edgeCliCommand}
            omniCliCommand={omniCliCommand}
            copiedKey={copiedKey}
            onCopyToClipboard={copyToClipboard}
          />
          </>
          )}

          {/* 4. Stage — Aspect Ratio, Composition, Background Tiles & Transform */}
          {studioStep === 'stage' && (
          <div className="nb-card bg-[#FFFFFF] p-4 space-y-4">
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#333333]">Aspect Ratio</div>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: '1:1', dim: '1080 × 1080' },
                    { id: '9:16', dim: '1080 × 1920' },
                    { id: '16:9', dim: '1920 × 1080' },
                  ] as const
                ).map((r) => {
                  const active = aspectRatio === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setAspectRatio(r.id)}
                      className={`p-2 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition ${
                        active
                          ? 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-600/20'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <span
                        className={`border rounded-sm shrink-0 ${
                          active ? 'border-indigo-600 bg-indigo-100' : 'border-slate-400 bg-slate-50'
                        } ${
                          r.id === '1:1' ? 'w-4 h-4' : r.id === '9:16' ? 'w-3 h-4' : 'w-5 h-3.5'
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold leading-tight text-slate-900">{r.id}</div>
                        <div className="text-[10px] text-slate-500 font-mono tabular-nums truncate">{r.dim}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Video Layout Suite (Reaction, PiP, Split, Anchor, Standard) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Presenter Video Layout
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {presenterLayout === 'corner-reaction'
                    ? 'Transparent Corner Reaction'
                    : presenterLayout === 'circle-pip'
                    ? 'Picture-in-Picture Webcam'
                    : presenterLayout === 'split-screen'
                    ? '50/50 Split Screen'
                    : presenterLayout === 'side-anchor'
                    ? 'Side Anchor (1/3)'
                    : 'Full Stage Presenter'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
                {[
                  { id: 'standard', label: 'Full Stage', icon: Video },
                  { id: 'corner-reaction', label: 'Corner Reaction', icon: Layout },
                  { id: 'circle-pip', label: 'Circle Webcam', icon: CircleDot },
                  { id: 'split-screen', label: 'Split Screen', icon: Columns2 },
                  { id: 'side-anchor', label: 'Side Anchor', icon: Film },
                ].map((mode) => {
                  const Icon = mode.icon;
                  const active = presenterLayout === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => {
                        setPresenterLayout(mode.id as any);
                        if (mode.id === 'corner-reaction' || mode.id === 'circle-pip' || mode.id === 'side-anchor') {
                          setUseTransparentBg(true);
                          setShowSplitPane(false);
                        } else if (mode.id === 'split-screen') {
                          setShowSplitPane(true);
                        } else {
                          setShowSplitPane(false);
                          setUseTransparentBg(false);
                        }
                      }}
                      className={`h-9 px-2.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 cursor-pointer transition ${
                        active
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{mode.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Reaction & PiP Controls */}
              {(presenterLayout === 'corner-reaction' || presenterLayout === 'circle-pip' || presenterLayout === 'side-anchor') && (
                <div className="p-2.5 bg-indigo-50/40 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Corner Position:</span>
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => setReactionCorner('left')}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer transition ${
                          reactionCorner === 'left' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Bottom-Left
                      </button>
                      <button
                        type="button"
                        onClick={() => setReactionCorner('right')}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer transition ${
                          reactionCorner === 'right' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Bottom-Right
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="border border-dashed border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer hover:border-indigo-500 transition">
                      <Upload className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                      <span className="truncate text-slate-700 dark:text-slate-300 max-w-[200px]">
                        {importedVideoName || 'Import Background Footage (MP4)'}
                      </span>
                      <input type="file" accept="video/*" onChange={handleImportedVideoUpload} className="hidden" />
                    </label>
                    {importedVideoName && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        ✓ Background Footage Active
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Background Swatch Tile Grid */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-700">Background</div>
              <div className="grid grid-cols-5 gap-2">
                {STAGE_BACKGROUNDS.map((bg) => {
                  const isActive = !customBgUrl && !useTransparentBg && stageBg === bg.id;
                  const shortLabels: Record<StageBackgroundType, string> = {
                    'original-white': 'Original White',
                    cream: 'Warm Cream',
                    sky: 'Soft Sky',
                    midnight: 'Midnight Blue',
                    white: 'Solid White',
                    black: 'Solid Black',
                    chroma: 'Chroma Green',
                    checker: 'Transparent',
                    card: 'Tile Color',
                    grid: 'Grid Spec',
                    transparent: 'Transparent',
                  };
                  return (
                    <button
                      key={bg.id}
                      type="button"
                      onClick={() => {
                        setCustomBgUrl('');
                        setUseTransparentBg(bg.id === 'checker');
                        setStageBg(bg.id);
                      }}
                      className="text-left group cursor-pointer"
                      title={bg.label}
                    >
                      <div
                        className={`h-10 w-full rounded-lg border overflow-hidden transition ${
                          isActive
                            ? 'border-indigo-600 ring-2 ring-indigo-600/30'
                            : 'border-slate-200 group-hover:border-slate-400'
                        } ${bg.id === 'checker' ? 'stage-bg-checker' : ''}`}
                        style={
                          bg.id === 'checker'
                            ? undefined
                            : {
                                backgroundColor: bg.id === 'card' ? activeCharacter.tileHex : bg.preview,
                                backgroundImage: bg.dotted
                                  ? 'radial-gradient(rgba(17,17,17,0.35) 1px, transparent 1px)'
                                  : undefined,
                                backgroundSize: bg.dotted ? '7px 7px' : undefined,
                              }
                        }
                      />
                      <div
                        className={`mt-1 text-[10px] leading-tight truncate ${
                          isActive ? 'text-[#111111] font-extrabold underline' : 'text-[#444444] font-medium'
                        }`}
                      >
                        {shortLabels[bg.id]}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => customBgInputRef.current?.click()}
                  className="font-bold underline flex items-center gap-1 cursor-pointer text-[#111111]"
                >
                  <Plus className="w-3 h-3" />
                  <span>Upload custom background</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomBgUrl('');
                    setUseTransparentBg(!useTransparentBg);
                  }}
                  className="underline font-bold cursor-pointer text-[#111111]"
                >
                  {useTransparentBg ? 'Transparent background: ON' : 'Use transparent background'}
                </button>
              </div>
            </div>

            {/* X / Y / Scale Transform Controls */}
            <div className="space-y-2 pt-2 border-t-2 border-[#111111]/15">
              <div className="grid grid-cols-3 gap-3 text-[11px]">
                <label className="block cursor-pointer">
                  <span className="flex justify-between font-bold mb-1">
                    <span className="uppercase tracking-wider text-[10px] font-mono">X Pos</span>
                    <span className="font-mono tabular-nums">{videoX}</span>
                  </span>
                  <input
                    type="range"
                    aria-label="Character X position"
                    min="-120"
                    max="120"
                    value={videoX}
                    onChange={(e) => setVideoX(Number(e.target.value))}
                    className="w-full accent-[#111111] cursor-pointer"
                  />
                </label>
                <label className="block cursor-pointer">
                  <span className="flex justify-between font-bold mb-1">
                    <span className="uppercase tracking-wider text-[10px] font-mono">Y Pos</span>
                    <span className="font-mono tabular-nums">{videoY}</span>
                  </span>
                  <input
                    type="range"
                    aria-label="Character Y position"
                    min="-80"
                    max="80"
                    value={videoY}
                    onChange={(e) => setVideoY(Number(e.target.value))}
                    className="w-full accent-[#111111] cursor-pointer"
                  />
                </label>
                <label className="block cursor-pointer">
                  <span className="flex justify-between font-bold mb-1">
                    <span className="uppercase tracking-wider text-[10px] font-mono">Scale</span>
                    <span className="font-mono tabular-nums">{videoScale}%</span>
                  </span>
                  <input
                    type="range"
                    aria-label="Character scale percentage"
                    min="70"
                    max="140"
                    value={videoScale}
                    onChange={(e) => setVideoScale(Number(e.target.value))}
                    className="w-full accent-[#111111] cursor-pointer"
                  />
                </label>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setVideoX(0);
                    setVideoY(0);
                    setVideoScale(100);
                    setCustomBgUrl('');
                    setUseTransparentBg(false);
                  }}
                  className="font-bold underline flex items-center gap-1 cursor-pointer text-[#111111]"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset position</span>
                </button>

                <label className="flex items-center gap-2 font-bold text-[#111111] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSplitPane}
                    onChange={(e) => setShowSplitPane(e.target.checked)}
                    className="accent-[#111111] w-4 h-4"
                  />
                  <span>Show imported video</span>
                </label>
              </div>

              {showSplitPane && (
                <div className="p-2.5 bg-[#FFFDF7] border-2 border-[#111111] rounded space-y-2 text-[11px]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="nb-btn bg-[#FFFFFF] px-2.5 py-1.5 flex items-center gap-1.5 cursor-pointer">
                      <Upload className="w-3 h-3" />
                      <span>{importedVideoName || 'Import MP4 / WebM Footage'}</span>
                      <input type="file" accept="video/*" onChange={handleImportedVideoUpload} className="hidden" />
                    </label>
                    <span className="text-[10px] font-mono text-[#444444]">9:16 top · 16:9 left</span>
                  </div>
                  {importedVideoName && (
                    <button
                      type="button"
                      onClick={handleExtractVideoAudio}
                      disabled={isExtractingVideoAudio}
                      className="nb-btn nb-btn-primary w-full h-8 px-2.5 text-[11px] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isExtractingVideoAudio ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FileAudio className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {isExtractingVideoAudio
                          ? 'Extracting WAV Track & Running Rhubarb...'
                          : 'Extract Voice Track (FFmpeg + Rhubarb)'}
                      </span>
                    </button>
                  )}
                  <input
                    type="text"
                    value={splitTopic}
                    onChange={(e) => setSplitTopic(e.target.value)}
                    placeholder="Fallback split card title..."
                    className="nb-input w-full h-8 px-2.5 text-xs"
                  />
                </div>
              )}

              {onUpdateCharacter && (
                <div className="pt-2 border-t-2 border-[#111111]/15">
                  <button
                    type="button"
                    onClick={() => setShowQuickWardrobe(!showQuickWardrobe)}
                    aria-expanded={showQuickWardrobe}
                    className="w-full flex items-center justify-between text-[11px] font-bold text-[#111111] cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Shirt className="w-3.5 h-3.5" />
                      <span>Quick Wardrobe &amp; Accessories ({activeCharacter.name})</span>
                    </span>
                    {showQuickWardrobe ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>

                  {showQuickWardrobe && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2.5 text-[11px]">
                      <div>
                        <label className="text-[10px] font-mono font-bold uppercase text-[#444444] block mb-1">Outfit</label>
                        <select
                          value={activeCharacter.clothesType}
                          onChange={(e) => onUpdateCharacter({ clothesType: e.target.value as ClothesType })}
                          aria-label="Quick Outfit"
                          className="nb-input w-full h-8 px-2 text-xs font-medium"
                        >
                          <option value="suit-tie">Suit Blazer</option>
                          <option value="lab-coat">Lab Coat</option>
                          <option value="tunic-kurta">Mandarin Kurta</option>
                          <option value="plush-sweater">Plush Sweater</option>
                          <option value="polo-sweater">Polo Shirt</option>
                          <option value="open-jacket">Open Jacket</option>
                          <option value="crew-collar">Crew Neck</option>
                          <option value="hoodie">Studio Hoodie</option>
                          <option value="vest-shirt">Vest &amp; Shirt</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-mono font-bold uppercase text-[#444444] block mb-1">Glasses</label>
                        <select
                          value={activeCharacter.glasses}
                          onChange={(e) => onUpdateCharacter({ glasses: e.target.value as GlassesType })}
                          aria-label="Quick Glasses"
                          className="nb-input w-full h-8 px-2 text-xs font-medium"
                        >
                          <option value="none">None</option>
                          <option value="cyan-tech">Sky Tech</option>
                          <option value="round-tort">Round Tort</option>
                          <option value="wayfarer">Wayfarer</option>
                          <option value="aviator">Gold Aviator</option>
                          <option value="cateye">Cat-Eye</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-mono font-bold uppercase text-[#444444] block mb-1">Headwear</label>
                        <select
                          value={activeCharacter.cap}
                          onChange={(e) => onUpdateCharacter({ cap: e.target.value as CapType })}
                          aria-label="Quick Headwear"
                          className="nb-input w-full h-8 px-2 text-xs font-medium"
                        >
                          <option value="none">None</option>
                          <option value="coral-beanie">Coral Beanie</option>
                          <option value="kufi">Kufi Cap</option>
                          <option value="turban">Turban</option>
                          <option value="baseball">Baseball Cap</option>
                          <option value="scrub-cap">Scrub Cap</option>
                          <option value="beret">Classic Beret</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-mono font-bold uppercase text-[#444444] block mb-1">Facial Hair</label>
                        <select
                          value={activeCharacter.beard}
                          onChange={(e) => onUpdateCharacter({ beard: e.target.value as BeardType })}
                          aria-label="Quick Beard"
                          className="nb-input w-full h-8 px-2 text-xs font-medium"
                        >
                          <option value="none">Clean</option>
                          <option value="mustache">Mustache</option>
                          <option value="boxed">Boxed Beard</option>
                          <option value="elder">Full Elder</option>
                          <option value="goatee">Goatee</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-mono font-bold uppercase text-[#444444] block mb-1">Prop</label>
                        <select
                          value={activeCharacter.defaultProp || 'none'}
                          onChange={(e) => onUpdateCharacter({ defaultProp: e.target.value as PropType })}
                          aria-label="Quick Prop"
                          className="nb-input w-full h-8 px-2 text-xs font-medium"
                        >
                          <option value="none">None</option>
                          <option value="stethoscope">Stethoscope</option>
                          <option value="phone">Phone</option>
                          <option value="book">Book</option>
                          <option value="coffee-cup">Coffee Cup</option>
                          <option value="clipboard">Clipboard</option>
                          <option value="pen">Pen</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          )}

          {/* 2. Stage — Creator Watermark & Authoring Panel */}
          {studioStep === 'stage' && (
          <WatermarkPanel watermark={watermark} onChange={handleWatermarkChange} />
          )}

          {/* 3. Render step checklist & export destination */}
          {studioStep === 'render' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-900">Pre-Render Checklist</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">1080p Engine</span>
              </div>

              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className={`w-4 h-4 shrink-0 ${serverMediaId ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>
                    Voiceover Audio: {serverMediaId ? `Ready (${audioDuration.toFixed(1)}s)` : 'Missing — add audio in Step 1'}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className={`w-4 h-4 shrink-0 ${!cueDirty ? 'text-emerald-600' : 'text-amber-500'}`} />
                  <span>
                    Directing Cues: {cueDirty ? 'Unsaved edits present' : 'Synced with visemes'}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>
                    Format: {exportFormat === 'webm' ? 'Transparent WebM (VP9 Alpha)' : 'H.264 MP4'} · {exportRes.width}×{exportRes.height} @ {exportFps}fps
                  </span>
                </li>
              </ul>

              {/* Explicit Project Save Location Box */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Project Output Directory</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleChooseLocalFolder}
                    className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    Change Folder
                  </button>
                </div>
                <div className="font-mono text-xs text-slate-600 bg-white p-2 rounded-lg border border-slate-200/80 break-all select-all">
                  {engineCaps?.exportDir ? `${engineCaps.exportDir}${sanitizeProjectSlug(projectName)}/` : `./exports/${sanitizeProjectSlug(projectName)}/`}
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  High-definition frames and muxed audio are exported directly to this folder on your computer.
                </p>
              </div>
            </div>
          )}

          {/* Step footer nav */}
          <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
            <button
              type="button"
              onClick={() => setStudioStep(studioStepMeta[Math.max(0, studioStepIndex - 1)].id)}
              disabled={studioStepIndex === 0}
              className="h-8 px-3 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer disabled:opacity-40 transition"
            >
              ← {studioStepIndex > 0 ? studioStepMeta[studioStepIndex - 1].label : 'Back'}
            </button>
            <span className="text-xs font-medium text-slate-500">Step {studioStepIndex + 1} of {studioStepMeta.length}</span>
            {studioStepIndex < studioStepMeta.length - 1 ? (
              <button
                type="button"
                onClick={() => setStudioStep(studioStepMeta[studioStepIndex + 1].id)}
                className="h-8 px-3.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer transition"
              >
                {studioStepMeta[studioStepIndex + 1].label} →
              </button>
            ) : (
              <span className="w-10" />
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (7 COLS): STAGE PREVIEW, TIMELINE, CUE SHEET EDITOR & MP4 RENDER */}
        <div className="lg:col-span-7 space-y-4">
          {/* Live Composition Stage */}
          <div className="relative p-4 nb-card bg-[#FFFFFF] flex items-center justify-center overflow-hidden">
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-xs z-20 pointer-events-none">
              <span className="px-2.5 py-1 bg-white/95 backdrop-blur-xs border border-slate-200 font-semibold text-slate-800 rounded-lg shadow-xs">
                {activeCharacter.name}
              </span>
              <span className="px-2.5 py-1 bg-slate-900/80 backdrop-blur-xs text-white font-medium text-[11px] rounded-lg shadow-xs">
                {exportRes.width}×{exportRes.height}
              </span>
            </div>

            <div
              className={`relative rounded border-2 border-[#111111] overflow-hidden flex items-center justify-center p-4 ${viewportAspectClass} ${
                customBgUrl ? '' : `stage-bg-${effectiveStageBg}`
              }`}
              style={
                customBgUrl
                  ? { backgroundImage: `url(${customBgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  : effectiveStageBg === 'card'
                  ? { backgroundColor: activeCharacter.tileHex }
                  : undefined
              }
            >
              {/* Creator Watermark Corner Overlay */}
              {watermark.enabled && (watermark.text.trim() || watermark.authorName.trim()) && (
                <div
                  data-testid="stage-watermark"
                  style={{ opacity: watermark.opacity }}
                  className={`absolute ${watermarkCornerClasses[watermark.position]} z-20 px-2.5 py-1 bg-[#FFDE59] border-2 border-[#111111] text-[11px] font-mono font-extrabold text-[#111111] pointer-events-none`}
                >
                  {watermark.text.trim() || watermark.authorName.trim()}
                </div>
              )}

              <div
                className={`w-full h-full relative overflow-hidden flex items-center justify-center ${
                  showSplitPane && aspectRatio === '9:16'
                    ? 'flex-col gap-3'
                    : showSplitPane
                    ? 'flex-row justify-around gap-4'
                    : ''
                }`}
              >
                {/* Full Background Video for Reaction, PiP, Side-Anchor, and Standard Layouts */}
                {importedVideoUrl && !showSplitPane && (
                  <video
                    ref={importedVideoRef}
                    src={importedVideoUrl}
                    muted
                    loop
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
                  />
                )}

                {showSplitPane && (
                  <div
                    className={`rounded bg-[#111111] border-2 border-[#111111] overflow-hidden flex flex-col justify-center items-center shrink-0 z-10 ${
                      aspectRatio === '9:16' ? 'w-52 h-28' : 'w-60 h-40'
                    }`}
                  >
                    {importedVideoUrl ? (
                      <video
                        ref={importedVideoRef}
                        src={importedVideoUrl}
                        muted
                        loop
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="p-3 text-center space-y-1">
                        <div className="text-[10px] font-mono font-bold uppercase text-[#FFDE59]">Split Media Slot</div>
                        <div className="text-xs font-bold text-[#FFFDF7] leading-snug">{splitTopic}</div>
                      </div>
                    )}
                  </div>
                )}

                <div
                  ref={stageContainerRef}
                  className={
                    presenterLayout === 'corner-reaction'
                      ? `absolute ${reactionCorner === 'right' ? 'bottom-0 right-1' : 'bottom-0 left-1'} z-10 origin-bottom`
                      : presenterLayout === 'circle-pip'
                      ? `absolute ${reactionCorner === 'right' ? 'bottom-3 right-3' : 'bottom-3 left-3'} w-28 h-28 rounded-full overflow-hidden border-2 border-white shadow-2xl bg-slate-900/80 z-10 flex items-center justify-center`
                      : presenterLayout === 'side-anchor'
                      ? `absolute ${reactionCorner === 'right' ? 'bottom-0 right-4' : 'bottom-0 left-4'} z-10`
                      : 'relative z-10'
                  }
                  style={{
                    transform:
                      presenterLayout === 'corner-reaction'
                        ? `scale(${Math.min(0.74, videoScale / 100)}) rotate(${reactionCorner === 'right' ? 3 : -3}deg)`
                        : presenterLayout === 'circle-pip'
                        ? `scale(${Math.min(0.68, videoScale / 100)})`
                        : `translate(${videoX}px, ${videoY}px) scale(${videoScale / 100})`,
                    transition: 'transform 0.14s ease-out',
                  }}
                >
                  <CharacterStage
                    character={activeCharacter}
                    eye={coupledEye}
                    gesture={activeGesture}
                    emotion={activeEmotion}
                    mouth={activeMouth}
                    framing={presenterLayout === 'circle-pip' ? 'portrait' : framing}
                    background={
                      presenterLayout === 'corner-reaction' || presenterLayout === 'circle-pip' || presenterLayout === 'side-anchor'
                        ? 'transparent'
                        : effectiveStageBg
                    }
                    headTilt={globalHeadTilt}
                    isBlinking={isStageBlinking}
                    instantPose={renderProgress.active}
                    deterministicPose={isPlaying || isRecordingWebM || renderProgress.active}
                    limbOverride={stageLimbOverride}
                    className="clean-canvas-avatar"
                  />
                </div>
              </div>
            </div>

            {burnSubtitles && currentSubtitle && (
              <div data-testid="stage-subtitle" className="absolute bottom-3 left-5 right-5 z-20 flex justify-center pointer-events-none">
                <div
                  dir="auto"
                  className="px-4 py-1.5 nb-box bg-[#FFFDF7] text-[#111111] font-bold text-xs sm:text-sm text-center max-w-lg"
                >
                  &ldquo;{currentSubtitle}&rdquo;
                </div>
              </div>
            )}
          </div>

          {/* Interactive Timeline, Subtitles Toggle, Manual Override & Playhead */}
          <div className="nb-card bg-[#FFFFFF] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => (isPlaying ? stopPlayback() : startPlayback(currentTime))}
                  className="nb-btn nb-btn-primary h-9 px-4 text-xs flex items-center gap-2 cursor-pointer"
                >
                  {isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  <span>{isPlaying ? 'Pause' : 'Play Preview'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBurnSubtitles(!burnSubtitles)}
                  aria-pressed={burnSubtitles}
                  data-testid="subtitles-toggle-btn"
                  className={`nb-btn h-9 px-3 text-xs font-mono cursor-pointer ${
                    burnSubtitles ? 'nb-btn-mint' : 'bg-[#F4F0EA]'
                  }`}
                >
                  Subtitles: {burnSubtitles ? 'ON' : 'OFF'}
                </button>

                <span ref={timecodeRef} className="font-mono font-bold text-[#111111] tabular-nums">
                  {formatTimecode(currentTime)} / {formatTimecode(totalDuration)}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setManualPoseOverride(!manualPoseOverride)}
                  className={`nb-btn h-8 px-2.5 text-[11px] flex items-center gap-1.5 cursor-pointer ${
                    manualPoseOverride ? 'nb-btn-primary' : 'bg-[#FFFDF7]'
                  }`}
                >
                  <Lock className="w-3 h-3" />
                  <span>{manualPoseOverride ? 'Manual Override Locked' : 'Follow Timeline Cues'}</span>
                </button>
                <span className="text-[11px] font-mono text-slate-500 font-medium px-2 py-0.5 bg-slate-100 border border-slate-200 rounded">
                  Lip Shape [{activeRhubarbCode}]
                </span>
              </div>
            </div>

            {/* Live Gesture & Emotion Override Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 bg-[#FFFDF7] border-2 border-[#111111] rounded text-xs">
              <div className="flex items-center gap-2">
                <label htmlFor="live-gesture-override" className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#333333] shrink-0 w-14">
                  Gesture
                </label>
                <select
                  id="live-gesture-override"
                  value={activeGesture}
                  onChange={(e) => {
                    handleLiveGestureChange(e.target.value as HandGesture);
                  }}
                  className="nb-input flex-1 h-8 px-2 text-xs font-medium"
                >
                  {HAND_GESTURES.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="live-emotion-override" className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#333333] shrink-0 w-14">
                  Emotion
                </label>
                <select
                  id="live-emotion-override"
                  value={activeEmotion}
                  onChange={(e) => {
                    handleLiveEmotionChange(e.target.value as EmotionPreset);
                  }}
                  className="nb-input flex-1 h-8 px-2 text-xs font-medium"
                >
                  {EMOTIONS_LIST.map((em) => (
                    <option key={em.id} value={em.id}>
                      {em.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5 pt-1 select-none">
              <div className="flex items-stretch gap-2">
                <div className="w-16 shrink-0 flex flex-col justify-between text-[9px] font-mono font-bold text-[#333333] uppercase tracking-wider">
                  <span className="h-6 flex items-center">Gestures</span>
                  <span className="h-6 flex items-center">Emotions</span>
                  <span className="h-6 flex items-center">Rhubarb</span>
                </div>

                <div
                  ref={timelineBoxRef}
                  onClick={handleTimelineClick}
                  className="relative flex-1 space-y-1.5 cursor-pointer"
                >
                  <div
                    ref={playheadRef}
                    style={{ left: `${((currentTime / Math.max(0.1, totalDuration)) * 100).toFixed(2)}%` }}
                    className="absolute top-0 bottom-0 w-0.5 bg-[#111111] z-30 pointer-events-none"
                  />

                  <div className="relative h-6 rounded bg-[#F4F0EA] border-2 border-[#111111] overflow-hidden">
                    {timelineSegments.map((s) => {
                      const l = (s.start / totalDuration) * 100;
                      const w = ((s.end - s.start) / totalDuration) * 100;
                      return (
                        <div
                          key={s.id}
                          style={{ left: `${l}%`, width: `${w}%` }}
                          className="absolute top-0.5 bottom-0.5 bg-[#FFFFFF] border border-[#111111] text-[9px] font-mono font-bold text-[#111111] flex items-center justify-center truncate px-1"
                        >
                          {s.gesture}
                        </div>
                      );
                    })}
                  </div>

                  <div className="relative h-6 rounded-lg bg-slate-50 border border-slate-200 overflow-hidden">
                    {timelineSegments.map((s) => {
                      const l = (s.start / totalDuration) * 100;
                      const w = ((s.end - s.start) / totalDuration) * 100;
                      return (
                        <div
                          key={s.id}
                          style={{ left: `${l}%`, width: `${w}%` }}
                          className="absolute top-0.5 bottom-0.5 bg-emerald-50 border border-emerald-200 rounded text-[9px] font-mono font-medium text-emerald-800 flex items-center justify-center truncate px-1"
                        >
                          {s.emotion}
                        </div>
                      );
                    })}
                  </div>

                  <div className="relative h-6 rounded-lg bg-slate-50 border border-slate-200 overflow-hidden">
                    {displayedVisemeBlocks.map((vb) => {
                      const l = (vb.start / totalDuration) * 100;
                      const w = ((vb.end - vb.start) / totalDuration) * 100;
                      return (
                        <div
                          key={vb.key}
                          style={{ left: `${l}%`, width: `${Math.max(0.6, w)}%` }}
                          className="absolute top-0.5 bottom-0.5 bg-indigo-50 border border-indigo-200 rounded text-[8px] font-mono font-semibold text-indigo-700 flex items-center justify-center overflow-hidden"
                        >
                          {vb.code}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <span className="w-16 shrink-0 text-[9px] font-mono font-bold uppercase text-[#333333]">Scrub</span>
                <input
                  ref={scrubberRef}
                  type="range"
                  min="0"
                  max={totalDuration}
                  step="0.02"
                  defaultValue={currentTime}
                  onChange={(e) => handleSeek(Number(e.target.value))}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Scrub timeline"
                  className="flex-1 accent-[#111111] cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Editable Cue Sheet Panel — pinned to the Sync step (also visible when manually opened) */}
          {studioStep === 'sync' || isCueSheetOpen ? (
          <CueSheetPanel
            isOpen={studioStep === 'sync' ? true : isCueSheetOpen}
            onToggleOpen={handleToggleCueSheet}
            cueDraftRows={cueDraftRows}
            cueDirty={cueDirty}
            cueNotice={cueNotice}
            exportWidth={exportRes.width}
            exportHeight={exportRes.height}
            exportFps={exportFps}
            exportFormat={exportFormat}
            onUpdateCueDraft={updateCueDraft}
            onDeleteCueRow={deleteCueRow}
            onAddCueRow={addCueRow}
            onUseAutomaticCues={useAutomaticCues}
            onSaveCuesForRender={saveCuesForRender}
          />
          ) : null}

          {/* 5. Render & Export Action Strip — pinned to the Render step */}
          {studioStep === 'render' && (
          <div className="nb-card bg-[#FFFFFF] p-4 space-y-3">
            {/* Pre-Render Status Summary */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                Pre-Render Configuration
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="font-semibold text-slate-700">Footage:</span>
                  <span className="truncate text-slate-900 font-medium">
                    {importedVideoName ? `📹 ${importedVideoName}` : '🎨 Studio Canvas Background'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="font-semibold text-slate-700">Voiceover:</span>
                  <span className="truncate text-slate-900 font-medium">
                    {uploadedAudioFile ? `🎙️ ${uploadedAudioFile.name} (${audioDuration.toFixed(1)}s)` : audioUrl ? `🎙️ Neural Audio (${audioDuration.toFixed(1)}s)` : '⚠️ No audio loaded'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="font-semibold text-slate-700">Layout:</span>
                  <span className="text-slate-900 font-medium capitalize">
                    {presenterLayout.replace('-', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="font-semibold text-slate-700">Duration:</span>
                  <span className="font-mono text-slate-900 font-bold">
                    {totalDuration.toFixed(1)}s ({Math.ceil(totalDuration * exportFps)} frames)
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b-2 border-[#111111]/15 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="export-format-select" className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#333333]">
                  Format
                </label>
                <select
                  id="export-format-select"
                  value={exportFormat}
                  onChange={(e) => {
                    const fmt = e.target.value as 'mp4' | 'webm';
                    setExportFormat(fmt);
                    if (fmt === 'webm') setUseTransparentBg(true);
                    else if (useTransparentBg) setUseTransparentBg(false);
                  }}
                  className="nb-input h-8 px-2.5 text-xs font-bold"
                >
                  <option value="mp4">H.264 MP4 (Universal)</option>
                  <option value="webm">Transparent WebM (VP9 Alpha)</option>
                </select>

                <label htmlFor="export-fps-select" className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#333333] ml-1">
                  FPS
                </label>
                <select
                  id="export-fps-select"
                  value={exportFps}
                  onChange={(e) => setExportFps(Number(e.target.value) as 24 | 30)}
                  className="nb-input h-8 px-2 font-mono text-xs font-bold"
                >
                  <option value={24}>24 fps</option>
                  <option value={30}>30 fps</option>
                </select>
              </div>

              <label className="flex items-center gap-2 text-xs font-bold text-[#111111] cursor-pointer">
                <input
                  type="checkbox"
                  checked={burnSubtitles}
                  onChange={(e) => setBurnSubtitles(e.target.checked)}
                  className="accent-[#111111] w-4 h-4"
                />
                <span>Burn-in Subtitles</span>
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleFastStreamExport}
                  disabled={renderProgress.active || (!audioUrl && !serverMediaId)}
                  title="Render full 1080p MP4 in real-time with live audio & smooth lip-sync"
                  className={`h-10 px-4 text-xs font-semibold rounded-xl flex items-center gap-2 cursor-pointer transition shadow-xs ${
                    renderProgress.active
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  } disabled:opacity-40`}
                >
                  {renderProgress.active ? (
                    <>
                      <XCircle className="w-4 h-4" />
                      <span>{renderProgress.stage || 'Rendering...'}</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-current" />
                      <span>
                        ⚡ Ultra-Fast Render ({exportRes.width}×{exportRes.height} {exportFormat.toUpperCase()} ~{Math.ceil(totalDuration || 20)}s)
                      </span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleRenderMp4Ffmpeg}
                  disabled={renderProgress.active || !serverMediaId}
                  title="Offline frame-by-frame background renderer"
                  className="h-10 px-3.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition disabled:opacity-40"
                >
                  <Film className="w-3.5 h-3.5 text-slate-500" />
                  <span>Offline Render</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExport1080pFrame(false)}
                  disabled={renderProgress.active}
                  className="h-10 px-3.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl disabled:opacity-40 flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Snapshot Frame</span>
                </button>
              </div>
            </div>

            {renderProgress.active && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex justify-between text-xs font-mono font-semibold text-slate-700 tabular-nums">
                  <span>{renderProgress.stage}</span>
                  <span>{Math.round((renderProgress.current / Math.max(1, renderProgress.total)) * 100)}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-150"
                    style={{
                      width: `${Math.round((renderProgress.current / Math.max(1, renderProgress.total)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {renderedMp4Url && (
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="space-y-1 min-w-0">
                    <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{renderedFormat === 'webm' ? 'Transparent WebM (VP9 Alpha)' : '1080p H.264 MP4'} Ready</span>
                    </div>
                    {renderedSavedPath && (
                      <div className="text-[11px] font-mono text-emerald-800 break-all bg-white/80 p-1.5 rounded border border-emerald-200">
                        📁 Saved: {renderedSavedPath}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {renderedSavedPath && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(renderedSavedPath);
                          showToast('Copied export path to clipboard');
                        }}
                        className="h-8 px-2.5 text-xs font-semibold text-emerald-900 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-lg flex items-center gap-1 cursor-pointer transition shadow-xs"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Path</span>
                      </button>
                    )}
                    <a
                      href={renderedMp4Url}
                      download={`ccavatarstudio_${projectName.replace(/\s+/g, '_')}.${renderedFormat}`}
                      className="h-8 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .{renderedFormat.toUpperCase()}</span>
                    </a>
                  </div>
                </div>
                <video controls src={renderedMp4Url} className="w-full max-h-64 rounded-xl border border-emerald-200 bg-black overflow-hidden shadow-xs" />
              </div>
            )}
          </div>
          )}
        </div>
      </div>

      {/* Video Templates / Recipes Picker Modal */}
      <TemplatePickerModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onApplyTemplate={handleApplyTemplate}
      />
    </div>
  );
};
