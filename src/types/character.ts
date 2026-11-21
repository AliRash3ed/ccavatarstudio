/**
 * Character & Studio Types
 */

export type EthnicityGroup = 'south-asian' | 'british' | 'asian' | 'african' | 'mena' | 'custom';
export type CharacterGroup = 'original' | 'asian' | 'newer' | 'custom';

export interface SkinPalette {
  base: string;
  mid: string;
  deep: string;
  hi?: string;
}

export interface HairColorPalette {
  base: string;
  shade: string;
  hi: string;
}

export type HairStyle =
  | 'spiky-sweep'
  | 'zara-curls'
  | 'pompadour'
  | 'bald-elder'
  | 'buzz-fade'
  | 'sleek-bob'
  | 'asym-bob'
  | 'twoblock-asian'
  | 'twin-buns'
  | 'comma-perm'
  | 'zainab-waves'
  | 'hijab-drape'
  | 'afro-curls'
  | 'slick-back';

export type ClothesType =
  | 'crew-collar'
  | 'plush-sweater'
  | 'polo-sweater'
  | 'tunic-kurta'
  | 'vneck-tie'
  | 'suit-tie'
  | 'vest-shirt'
  | 'open-jacket'
  | 'lab-coat'
  | 'scoop-blouse'
  | 'hoodie';

export type PantsType = 'chinos' | 'zara-chinos' | 'cream' | 'slacks' | 'denim' | 'scrubs' | 'olive';
export type CapType = 'none' | 'coral-beanie' | 'kufi' | 'baseball' | 'beanie' | 'scrub-cap' | 'beret' | 'turban';
export type GlassesType = 'none' | 'cyan-tech' | 'round-tort' | 'wayfarer' | 'aviator' | 'cateye' | 'sunglasses';
export type MaskType = 'none' | 'surgical' | 'kn95' | 'cloth' | 'surgical-blue' | 'black-n95';
export type BeardType = 'none' | 'mustache' | 'elder' | 'boxed' | 'goatee' | 'stubble';
export type PropType = 'none' | 'phone' | 'stethoscope' | 'book' | 'coffee' | 'tablet' | 'pen' | 'coffee-cup' | 'clipboard';

export type EyeSprite =
  | 'neutral'
  | 'friendly'
  | 'confident'
  | 'focused'
  | 'curious'
  | 'empathetic'
  | 'shocked'
  | 'wink'
  | 'closed'
  | 'happy';

export type MouthSprite =
  | 'neutral'
  | 'smile'
  | 'grin'
  | 'smirk'
  | 'aei'
  | 'o'
  | 'talk-o'
  | 'u'
  | 'bmp'
  | 'fv'
  | 'l'
  | 'th'
  | 'ee'
  | 'wq'
  | 'ah'
  | 'laugh';

export type HandGesture =
  // 17 Presenter Gestures
  | 'rest'
  | 'open-palms'
  | 'point-up'
  | 'point-camera'
  | 'empathy-chest'
  | 'sweep'
  | 'narrative-sweep'
  | 'stop'
  | 'chop'
  | 'steeple'
  | 'count-1'
  | 'count-2'
  | 'count-3'
  | 'size-wide'
  | 'size-small'
  | 'precision-pinch'
  | 'thinking'
  | 'wave'
  // 13 Additional 4x4 Silhouette Chart Gestures
  | 'salute-2'
  | 'open-5'
  | 'point-right'
  | 'thumbs-up'
  | 'thumbs-down'
  | 'rock-on'
  | 'ily-horns'
  | 'finger-gun'
  | 'offering-palm'
  | 'point-down-left'
  | 'point-left'
  | 'l-frame'
  | 'plucked-ok'
  | 'plucked-pinch';

export type EmotionPreset =
  | 'neutral'
  | 'warm'
  | 'empathetic'
  | 'shocked'
  | 'focused'
  | 'curious'
  | 'confident';

export interface CharacterConfig {
  id: number;
  group: CharacterGroup;
  ethnicity: EthnicityGroup;
  codeClass: string;
  name: string;
  role: string;
  gridPos: string;
  tileHex: string;
  bodyScale: number;
  shoulderWidth: number;
  skin: SkinPalette;
  hairStyle: HairStyle;
  hairColor: HairColorPalette;
  clothesType: ClothesType;
  topHex: string;
  topAccent: string;
  pantsType: PantsType;
  pantsHex: string;
  pantsShade: string;
  shoeHex: string;
  shoeToe: string;
  shoeAccent: string;
  cap: CapType;
  glasses: GlassesType;
  mask: MaskType;
  beard: BeardType;
  beardColor?: string;
  defaultProp?: PropType;
  defaultEye: EyeSprite;
  defaultMouth: MouthSprite;
  defaultGesture: HandGesture;
  hasLashes?: boolean;
  almondEyes?: boolean;
  irisColor: string;
  irisLeftColor?: string;
  noseType: 'oval' | 'rosy';
  recipe: string;
  primitives: string[];
  country?: string;
  flag?: string;
  hasDupatta?: boolean;
  hasBindi?: boolean;
}

export interface TimelineCue {
  id: string;
  timestamp: number; // in seconds
  word?: string;
  gesture?: HandGesture;
  emotion?: EmotionPreset;
  viseme?: MouthSprite;
}

export type StageBackgroundType =
  | 'original-white'
  | 'cream'
  | 'sky'
  | 'midnight'
  | 'white'
  | 'black'
  | 'chroma'
  | 'checker'
  | 'card'
  | 'grid'
  | 'transparent';

export type AspectRatioType = '16:9' | '9:16' | '1:1';
export type FramingMode = 'full' | 'bust' | 'portrait';
export type ScriptLanguageCode = 'auto' | (string & {});

export interface CueSheetRow {
  id: string;
  start: number;
  end: number;
  gesture: HandGesture;
  emotion: EmotionPreset;
  spoken?: string;
}

export type WatermarkPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface AiModelSelection {
  provider: 'auto' | 'offline' | 'gemini' | 'openrouter' | 'openai' | 'anthropic' | 'custom';
  model?: string;
  apiKey?: string;
  baseUrl?: string;
}

export interface WatermarkConfig {
  enabled: boolean;
  text: string;
  authorName: string;
  position: WatermarkPosition;
  opacity: number;
}

export interface ProjectSnapshot {
  id: string;
  name: string;
  updatedAt: string;
  characterId: number;
  scriptText: string;
  language: ScriptLanguageCode;
  voiceId: string;
  aspectRatio: AspectRatioType;
  framing: FramingMode;
  stageBg: StageBackgroundType;
  cueRows?: CueSheetRow[];
  aiModelSelection?: AiModelSelection;
  watermark?: WatermarkConfig;
}

export interface ExportHistoryItem {
  id: string;
  projectName: string;
  format: 'mp4' | 'wav' | 'png' | 'webm' | 'json';
  resolution: string;
  filename: string;
  url: string;
  savedPath?: string;
  sizeBytes?: number;
  createdAt: string;
}


