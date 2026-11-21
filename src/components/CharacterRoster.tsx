import React, { useState, useRef } from 'react';
import {
  CharacterConfig,
  EmotionPreset,
  EyeSprite,
  FramingMode,
  HandGesture,
  MouthSprite,
  PropType,
} from '../types/character';
import { CharacterStage } from './CharacterStage';
import {
  GESTURES_LIST,
  EMOTIONS_LIST,
  EYES_LIST,
  VISEMES_LIST,
} from '../data/characters';
import { Sliders, Play, Copy, Check } from 'lucide-react';

interface CharacterRosterProps {
  characters: CharacterConfig[];
  selectedCharacter: CharacterConfig;
  onSelectCharacter: (char: CharacterConfig) => void;
  onEditInCustomizer: (char: CharacterConfig) => void;
  onOpenVideoStudio: (char: CharacterConfig) => void;
}

export const CharacterRoster: React.FC<CharacterRosterProps> = ({
  characters,
  selectedCharacter,
  onSelectCharacter,
  onEditInCustomizer,
  onOpenVideoStudio,
}) => {
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cardFraming, setCardFraming] = useState<FramingMode>('portrait');

  const [inspectorEye, setInspectorEye] = useState<EyeSprite>(selectedCharacter.defaultEye);
  const [inspectorMouth, setInspectorMouth] = useState<MouthSprite>(selectedCharacter.defaultMouth);
  const [inspectorGesture, setInspectorGesture] = useState<HandGesture>(selectedCharacter.defaultGesture);
  const [inspectorEmotion, setInspectorEmotion] = useState<EmotionPreset>('neutral');
  const [inspectorProp, setInspectorProp] = useState<PropType>(selectedCharacter.defaultProp || 'none');
  const [inspectorTurn, setInspectorTurn] = useState<'0' | '35' | '90' | '180'>('0');
  const [inspectorHeadTilt, setInspectorHeadTilt] = useState<number>(0);
  const [inspectorFraming, setInspectorFraming] = useState<FramingMode>('full');
  const [isBlinking, setIsBlinking] = useState<boolean>(false);
  const [isNodding, setIsNodding] = useState<boolean>(false);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [isExploded, setIsExploded] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [copiedSvg, setCopiedSvg] = useState<boolean>(false);

  const inspectorStageRef = useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    setInspectorEye(selectedCharacter.defaultEye);
    setInspectorMouth(selectedCharacter.defaultMouth);
    setInspectorGesture(selectedCharacter.defaultGesture);
    setInspectorProp(selectedCharacter.defaultProp || 'none');
    setInspectorEmotion('neutral');
    setInspectorHeadTilt(0);
    setInspectorTurn('0');
  }, [selectedCharacter]);

  const handleCopySvg = () => {
    const svg = inspectorStageRef.current?.querySelector('svg');
    if (!svg) return;
    const svgStr = new XMLSerializer().serializeToString(svg);
    navigator.clipboard.writeText(svgStr).then(() => {
      setCopiedSvg(true);
      setTimeout(() => setCopiedSvg(false), 2000);
    });
  };

  const filteredCharacters = characters.filter((c) => {
    const matchesFilter =
      filter === 'all'
        ? true
        : filter === 'pakistan'
        ? c.country === 'Pakistan'
        : filter === 'original'
        ? c.group === 'original'
        : filter === 'asian'
        ? c.group === 'asian' || c.ethnicity === 'asian'
        : filter === 'south-asian'
        ? c.ethnicity === 'south-asian'
        : filter === 'british'
        ? c.ethnicity === 'british' || c.country === 'United Kingdom'
        : filter === 'african'
        ? c.ethnicity === 'african'
        : true;

    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.role.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="w-full space-y-5">
      {/* 1. FILTER BAR & FRAMING MODE */}
      <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
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
              onClick={() => setFilter(tab.id)}
              className={`h-8 px-3 text-xs font-medium rounded-lg transition cursor-pointer ${
                filter === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 text-xs bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
            <button
              type="button"
              onClick={() => setCardFraming('portrait')}
              className={`h-7 px-2.5 rounded-md font-medium transition cursor-pointer ${
                cardFraming === 'portrait' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Portrait
            </button>
            <button
              type="button"
              onClick={() => setCardFraming('full')}
              className={`h-7 px-2.5 rounded-md font-medium transition cursor-pointer ${
                cardFraming === 'full' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Full-Body
            </button>
          </div>

          <div className="w-48 sm:w-56">
            <input
              type="text"
              placeholder="Search presenter or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>
        </div>
      </div>

      {/* 2. GRID & INSPECTOR SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredCharacters.map((char) => {
            const isSelected = selectedCharacter.id === char.id;
            return (
              <div
                key={char.id}
                onClick={() => onSelectCharacter(char)}
                className={`bg-white rounded-xl p-3.5 cursor-pointer flex flex-col justify-between border transition duration-150 ${
                  isSelected
                    ? 'border-indigo-600 ring-2 ring-indigo-600/20 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-md text-[10px] font-mono font-bold flex items-center justify-center bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                      {String(char.id).padStart(2, '0')}
                    </span>
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {char.flag} {char.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono font-medium shrink-0">{char.country}</span>
                </div>

                <div className="flex justify-center my-1 bg-slate-50 rounded-lg p-2 border border-slate-200/80 overflow-hidden">
                  <CharacterStage
                    character={char}
                    framing={cardFraming}
                    scale={cardFraming === 'full' ? 0.85 : 0.78}
                    flatShading={false}
                  />
                </div>

                <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                  <p className="text-xs text-slate-800 font-medium truncate">{char.role}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      Pose: <span className="text-slate-700 font-mono font-medium">{char.defaultGesture}</span>
                    </span>
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-xs"
                      style={{ backgroundColor: char.tileHex }}
                      title={`Tile: ${char.tileHex}`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* LIVE INSPECTOR */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-xs sticky top-20">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-600" />
                Live Rig Inspector
              </h3>
              <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-0.5">
                <span className="font-mono">#{String(selectedCharacter.id).padStart(2, '0')}</span>
                <span className="font-semibold text-slate-800">{selectedCharacter.name}</span>
                {selectedCharacter.flag && <span className="text-sm" title={selectedCharacter.country}>{selectedCharacter.flag}</span>}
                {selectedCharacter.country && <span className="text-[11px] text-slate-400">({selectedCharacter.country})</span>}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopySvg}
                className="h-8 px-2.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 cursor-pointer transition"
                title="Copy SVG markup"
              >
                {copiedSvg ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-500" />}
                <span>{copiedSvg ? 'Copied' : 'SVG'}</span>
              </button>
              <button
                type="button"
                onClick={() => onEditInCustomizer(selectedCharacter)}
                className="h-8 px-3 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer transition"
              >
                Customize
              </button>
            </div>
          </div>

          {/* Framing & Exploded Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
              <button
                type="button"
                onClick={() => {
                  setInspectorFraming('full');
                  setIsExploded(false);
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                  inspectorFraming === 'full' && !isExploded ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Full Body
              </button>
              <button
                type="button"
                onClick={() => {
                  setInspectorFraming('portrait');
                  setIsExploded(false);
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                  inspectorFraming === 'portrait' && !isExploded ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Portrait
              </button>
              <button
                type="button"
                onClick={() => {
                  setInspectorFraming('full');
                  setIsExploded(!isExploded);
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                  isExploded ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Exploded
              </button>
            </div>

            {/* Turnaround Angles */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
              {(['0', '35', '90', '180'] as const).map((deg) => (
                <button
                  key={deg}
                  type="button"
                  onClick={() => setInspectorTurn(deg)}
                  className={`px-2 py-0.5 font-mono text-xs rounded-md transition cursor-pointer ${
                    inspectorTurn === deg ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {deg}°
                </button>
              ))}
            </div>
          </div>

          <div ref={inspectorStageRef} className="flex justify-center bg-slate-50 rounded-xl p-4 pb-12 border border-slate-200 relative">
            <CharacterStage
              character={selectedCharacter}
              eye={inspectorEye}
              mouth={inspectorMouth}
              gesture={inspectorGesture}
              emotion={inspectorEmotion}
              prop={inspectorProp}
              turn={inspectorTurn}
              framing={inspectorFraming}
              headTilt={inspectorHeadTilt}
              isBlinking={isBlinking}
              isNodding={isNodding}
              isShaking={isShaking}
              isExploded={isExploded}
              showGrid={showGrid}
              scale={1.0}
            />

            <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-center gap-1.5 bg-white/95 backdrop-blur-sm p-1.5 rounded-lg border border-slate-200 text-xs shadow-xs">
              <button
                type="button"
                onClick={() => setIsNodding(!isNodding)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition ${
                  isNodding ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
                }`}
              >
                Nod Yes
              </button>
              <button
                type="button"
                onClick={() => setIsShaking(!isShaking)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition ${
                  isShaking ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
                }`}
              >
                Shake No
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsBlinking(true);
                  setTimeout(() => setIsBlinking(false), 220);
                }}
                className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer transition"
              >
                Blink
              </button>
              <button
                type="button"
                onClick={() => setShowGrid(!showGrid)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition ${
                  showGrid ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
                }`}
              >
                Grid
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>Head tilt angle</span>
              <span className="font-mono tabular-nums text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{inspectorHeadTilt}°</span>
            </div>
            <input
              type="range"
              min="-15"
              max="15"
              step="1"
              value={inspectorHeadTilt}
              onChange={(e) => setInspectorHeadTilt(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 block">
              7 Core Emotions
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {EMOTIONS_LIST.map((emo) => (
                <button
                  key={emo.id}
                  type="button"
                  onClick={() => {
                    setInspectorEmotion(emo.id);
                    setInspectorEye(emo.defaultEye);
                    setInspectorMouth(emo.defaultMouth);
                  }}
                  className={`h-8 px-2 text-xs font-medium rounded-lg truncate cursor-pointer transition border ${
                    inspectorEmotion === emo.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                  title={emo.desc}
                >
                  {emo.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Hand gesture
              </label>
              <select
                value={inspectorGesture}
                onChange={(e) => setInspectorGesture(e.target.value as HandGesture)}
                className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <optgroup label="Presenter Gestures">
                  {GESTURES_LIST.filter((g) => g.category === 'presenter').map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Chart Poses">
                  {GESTURES_LIST.filter((g) => g.category === 'silhouette').map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Handheld prop
              </label>
              <select
                value={inspectorProp}
                onChange={(e) => setInspectorProp(e.target.value as PropType)}
                className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="none">None</option>
                <option value="stethoscope">Stethoscope</option>
                <option value="phone">Smartphone</option>
                <option value="book">Open Book</option>
                <option value="coffee-cup">Coffee Cup</option>
                <option value="tablet">Tablet</option>
                <option value="clipboard">Clipboard</option>
                <option value="pen">Presenter Pen</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Eye style</label>
              <select
                value={inspectorEye}
                onChange={(e) => setInspectorEye(e.target.value as EyeSprite)}
                className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {EYES_LIST.map((eye) => (
                  <option key={eye.id} value={eye.id}>
                    {eye.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Mouth shape</label>
              <select
                value={inspectorMouth}
                onChange={(e) => setInspectorMouth(e.target.value as MouthSprite)}
                className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {VISEMES_LIST.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} ({m.rhubarbCode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenVideoStudio(selectedCharacter)}
            className="w-full h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Open in Video Studio
          </button>
        </div>
      </div>
    </div>
  );
};
