import React, { useState } from 'react';
import {
  CharacterConfig,
  HairStyle,
  ClothesType,
  PantsType,
  CapType,
  GlassesType,
  BeardType,
  PropType,
  SkinPalette,
  HairColorPalette,
} from '../types/character';
import { CharacterStage } from './CharacterStage';
import { Paintbrush, RotateCcw, Plus, Check } from 'lucide-react';

interface CharacterCustomizerProps {
  initialCharacter: CharacterConfig;
  onSaveCustomCharacter: (newChar: CharacterConfig) => void;
  onOpenVideoStudio: (char: CharacterConfig) => void;
}

const SKIN_SWATCHES: Array<{ name: string; palette: SkinPalette }> = [
  { name: 'Fair Ivory', palette: { base: '#F7C9A6', mid: '#E3A87E', deep: '#C7865A', hi: '#FFE6D2' } },
  { name: 'Warm Peach', palette: { base: '#F3C39C', mid: '#D9A177', deep: '#BF835A', hi: '#FFE0C4' } },
  { name: 'Golden Honey', palette: { base: '#EBB282', mid: '#D1925E', deep: '#B37240', hi: '#FAD8BA' } },
  { name: 'Rich Chestnut', palette: { base: '#BA7242', mid: '#99552A', deep: '#7B401B', hi: '#DE9668' } },
  { name: 'Deep Umber', palette: { base: '#9B5B30', mid: '#7D441E', deep: '#5E3011', hi: '#BD7B4E' } },
];

const HAIR_COLORS: Array<{ name: string; color: HairColorPalette }> = [
  { name: 'Midnight Black', color: { base: '#252C3E', shade: '#1A2030', hi: '#364059' } },
  { name: 'Chestnut Brown', color: { base: '#5C2F18', shade: '#3D1D0D', hi: '#87492B' } },
  { name: 'Ginger Orange', color: { base: '#EB8B35', shade: '#C96E1E', hi: '#F7AA5C' } },
  { name: 'Golden Blonde', color: { base: '#EAB344', shade: '#C28922', hi: '#FCE08B' } },
  { name: 'Silver / Slate', color: { base: '#7E8791', shade: '#586069', hi: '#B0BAC4' } },
  { name: 'Plum Burgundy', color: { base: '#6D214F', shade: '#471232', hi: '#9E3E78' } },
];

const GARMENT_COLORS = [
  { name: 'Navy Blue', hex: '#252C42' },
  { name: 'Plum Violet', hex: '#69498E' },
  { name: 'Teal Green', hex: '#216676' },
  { name: 'Forest Kurta', hex: '#047857' },
  { name: 'Crimson Red', hex: '#B83236' },
  { name: 'Executive Slate', hex: '#1E293B' },
  { name: 'Royal Blue', hex: '#1E3A8A' },
  { name: 'Clinical White', hex: '#F8FAFC' },
];

export const CharacterCustomizer: React.FC<CharacterCustomizerProps> = ({
  initialCharacter,
  onSaveCustomCharacter,
  onOpenVideoStudio,
}) => {
  const [character, setCharacter] = useState<CharacterConfig>(initialCharacter);
  const [activeCategory, setActiveCategory] = useState<'head' | 'clothes' | 'accessories'>('head');
  const [previewGesture, setPreviewGesture] = useState(initialCharacter.defaultGesture);
  const [previewTilt, setPreviewTilt] = useState<number>(0);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  React.useEffect(() => {
    setCharacter(initialCharacter);
    setPreviewGesture(initialCharacter.defaultGesture);
    setPreviewTilt(0);
  }, [initialCharacter.id]);

  const update = (patch: Partial<CharacterConfig>) => {
    setCharacter((prev) => ({ ...prev, ...patch }));
    setIsSaved(false);
  };

  const handleSave = () => {
    const customConfig: CharacterConfig = {
      ...character,
      id: Date.now(),
      name: `${character.name.replace(/\s*\(Custom\)$/, '')} (Custom)`,
      group: 'custom',
    };
    onSaveCustomCharacter(customConfig);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleReset = () => {
    setCharacter(initialCharacter);
    setPreviewGesture(initialCharacter.defaultGesture);
    setPreviewTilt(0);
  };

  return (
    <div className="w-full space-y-5">
      <div className="nb-card p-4 bg-[#FFFFFF] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-extrabold text-[#111111] flex items-center gap-2">
            <Paintbrush className="w-4 h-4" />
            Modular Character Builder &amp; Wardrobe Customizer
          </h2>
          <p className="text-xs text-[#444444]">
            Customize facial features, draped garments, lineless hands, eyewear &amp; props
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="nb-btn bg-[#F4F0EA] h-9 px-3 text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Look
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="nb-btn nb-btn-primary h-9 px-4 text-xs flex items-center gap-1.5 cursor-pointer"
          >
            {isSaved ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {isSaved ? 'Saved to Roster' : 'Save New Avatar'}
          </button>
        </div>
      </div>

      {/* 2-COLUMN BUILDER WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-5 nb-card p-5 bg-[#FFFFFF] space-y-4 flex flex-col items-center">
          <div className="flex items-center justify-between w-full pb-3 border-b-2 border-[#111111]">
            <span className="font-display text-xs font-extrabold text-[#111111] uppercase">Live Avatar Viewport</span>
            <span className="text-xs bg-[#FFDE59] border border-[#111111] px-2 py-0.5 font-mono font-bold text-[#111111]">
              {character.name}
            </span>
          </div>

          <div className="p-4 rounded bg-[#FFFDF7] border-2 border-[#111111] flex justify-center w-full">
            <CharacterStage character={character} gesture={previewGesture} headTilt={previewTilt} scale={1.05} />
          </div>

          <div className="w-full grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[11px] font-bold text-[#333333] block mb-1">Test Pose</label>
              <select
                value={previewGesture}
                onChange={(e) => {
                  const g = e.target.value as CharacterConfig['defaultGesture'];
                  setPreviewGesture(g);
                  update({ defaultGesture: g });
                }}
                className="nb-input w-full h-9 px-2.5 font-semibold"
              >
                <option value="steeple">Steeple</option>
                <option value="wave">Wave</option>
                <option value="open-palms">Open Palms</option>
                <option value="point-up">Point Up</option>
                <option value="empathy-chest">Empathy Chest</option>
                <option value="thumbs-up">Thumbs Up</option>
                <option value="thinking">Thinking</option>
              </select>
            </div>
            <div>
              <div className="flex justify-between text-[11px] font-bold text-[#333333] mb-1">
                <span>Head Tilt</span>
                <span className="font-mono tabular-nums text-[#111111] bg-[#FFDE59] px-1 border border-[#111111]">
                  {previewTilt}°
                </span>
              </div>
              <input
                type="range"
                min="-15"
                max="15"
                value={previewTilt}
                onChange={(e) => setPreviewTilt(Number(e.target.value))}
                className="w-full accent-[#111111] mt-2 cursor-pointer"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenVideoStudio(character)}
            className="nb-btn nb-btn-primary w-full h-10 text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            Animate in Video Studio
          </button>
        </div>

        <div className="lg:col-span-7 nb-card p-5 bg-[#FFFFFF] space-y-5">
          {/* Sub-Category Nav */}
          <div className="flex flex-wrap items-center gap-2 pb-3 border-b-2 border-[#111111]">
            <button
              type="button"
              onClick={() => setActiveCategory('head')}
              className={`nb-btn h-8 px-3 text-xs cursor-pointer ${
                activeCategory === 'head' ? 'nb-btn-primary' : 'bg-[#F4F0EA] text-[#111111]'
              }`}
            >
              Face &amp; Hair
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('clothes')}
              className={`nb-btn h-8 px-3 text-xs cursor-pointer ${
                activeCategory === 'clothes' ? 'nb-btn-primary' : 'bg-[#F4F0EA] text-[#111111]'
              }`}
            >
              Garments &amp; Pants
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('accessories')}
              className={`nb-btn h-8 px-3 text-xs cursor-pointer ${
                activeCategory === 'accessories' ? 'nb-btn-primary' : 'bg-[#F4F0EA] text-[#111111]'
              }`}
            >
              Eyewear, Caps &amp; Props
            </button>
          </div>

          {activeCategory === 'head' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider font-mono font-bold text-[#111111] block">
                  Skin Tone Triad
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {SKIN_SWATCHES.map((swatch) => (
                    <button
                      key={swatch.name}
                      type="button"
                      onClick={() => update({ skin: swatch.palette })}
                      className={`nb-btn p-2 text-center flex flex-col items-center gap-1.5 cursor-pointer ${
                        character.skin.base === swatch.palette.base ? 'nb-btn-primary' : 'bg-[#FFFDF7]'
                      }`}
                    >
                      <span
                        className="w-6 h-6 rounded-sm border-2 border-[#111111]"
                        style={{ backgroundColor: swatch.palette.base }}
                      />
                      <span className="text-[10px] font-bold text-[#111111] truncate w-full">{swatch.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider font-mono font-bold text-[#111111] block">
                  Hair Style &amp; Drapes
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'spiky-sweep', label: 'Spiky Sweep (Aarav)' },
                    { id: 'zara-curls', label: 'Wavy Curls (Zara)' },
                    { id: 'pompadour', label: 'Pompadour (Barnaby)' },
                    { id: 'twoblock-asian', label: 'Two-Block (Kenji)' },
                    { id: 'twin-buns', label: 'Twin Space Buns (Mei-Ling)' },
                    { id: 'comma-perm', label: 'Comma Perm (Jin-Woo)' },
                    { id: 'hijab-drape', label: 'Modest Hijab (Dr. Zainab)' },
                    { id: 'zainab-waves', label: 'Flowing Waves (Aanya)' },
                    { id: 'afro-curls', label: 'Afro Halo (Maya)' },
                    { id: 'buzz-fade', label: 'Buzz Fade (Devon)' },
                    { id: 'asym-bob', label: 'Asymmetrical Bob (Mina)' },
                    { id: 'bald-elder', label: 'Elder Fringe (Baba Kabir)' },
                  ].map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => update({ hairStyle: h.id as HairStyle })}
                      className={`nb-btn h-9 px-2.5 text-left text-xs truncate cursor-pointer ${
                        character.hairStyle === h.id ? 'nb-btn-primary' : 'bg-[#FFFDF7] text-[#111111]'
                      }`}
                    >
                      {h.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider font-mono font-bold text-[#111111] block">
                  Hair Color
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {HAIR_COLORS.map((hc) => (
                    <button
                      key={hc.name}
                      type="button"
                      onClick={() => update({ hairColor: hc.color })}
                      className={`nb-btn p-2 text-center flex flex-col items-center gap-1 cursor-pointer ${
                        character.hairColor.base === hc.color.base ? 'nb-btn-primary' : 'bg-[#FFFDF7]'
                      }`}
                    >
                      <span
                        className="w-5 h-5 rounded-sm border-2 border-[#111111]"
                        style={{ backgroundColor: hc.color.base }}
                      />
                      <span className="text-[10px] font-bold text-[#111111] truncate w-full">{hc.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wider font-mono font-bold text-[#111111] block">
                  Nose Contour
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => update({ noseType: 'oval' })}
                    className={`nb-btn h-8 px-3 text-xs cursor-pointer ${
                      character.noseType === 'oval' ? 'nb-btn-primary' : 'bg-[#FFFDF7] text-[#111111]'
                    }`}
                  >
                    Clean Oval Arch
                  </button>
                  <button
                    type="button"
                    onClick={() => update({ noseType: 'rosy' })}
                    className={`nb-btn h-8 px-3 text-xs cursor-pointer ${
                      character.noseType === 'rosy' ? 'nb-btn-primary' : 'bg-[#FFFDF7] text-[#111111]'
                    }`}
                  >
                    Rosy Bulb (Barnaby Mentor)
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeCategory === 'clothes' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider font-mono font-bold text-[#111111] block">
                  Garment Silhouette
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'crew-collar', label: 'Crew Collar Pullover' },
                    { id: 'plush-sweater', label: 'Plush Sweater' },
                    { id: 'polo-sweater', label: 'Polo Collared Sweater' },
                    { id: 'tunic-kurta', label: 'Mandarin Kurta / Qipao' },
                    { id: 'suit-tie', label: 'Tailored Suit & Tie' },
                    { id: 'lab-coat', label: 'Medical Lab Coat' },
                    { id: 'vest-shirt', label: 'Vest over Shirt' },
                    { id: 'open-jacket', label: 'Open Jacket Blazer' },
                    { id: 'hoodie', label: 'Studio Hoodie' },
                  ].map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => update({ clothesType: g.id as ClothesType })}
                      className={`nb-btn h-9 px-2.5 text-left text-xs truncate cursor-pointer ${
                        character.clothesType === g.id ? 'nb-btn-primary' : 'bg-[#FFFDF7] text-[#111111]'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider font-mono font-bold text-[#111111] block">
                  Garment Primary Color
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {GARMENT_COLORS.map((gc) => (
                    <button
                      key={gc.name}
                      type="button"
                      onClick={() => update({ topHex: gc.hex })}
                      className={`nb-btn h-9 px-2.5 flex items-center gap-2 text-xs cursor-pointer ${
                        character.topHex === gc.hex ? 'nb-btn-primary' : 'bg-[#FFFDF7] text-[#111111]'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-sm shrink-0 border-2 border-[#111111]"
                        style={{ backgroundColor: gc.hex }}
                      />
                      <span className="truncate">{gc.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider font-mono font-bold text-[#111111] block">
                  Trousers &amp; Lower Body
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'chinos', label: 'Khaki Chinos', hex: '#C8B59B', shade: '#AC977B' },
                    { id: 'cream', label: 'Cream Slacks', hex: '#E5DEC9', shade: '#C7BEA6' },
                    { id: 'slacks', label: 'Charcoal Slacks', hex: '#1E293B', shade: '#0F172A' },
                    { id: 'denim', label: 'Indigo Denim', hex: '#1E3A5F', shade: '#152945' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => update({ pantsType: p.id as PantsType, pantsHex: p.hex, pantsShade: p.shade })}
                      className={`nb-btn h-9 px-2.5 text-left text-xs cursor-pointer ${
                        character.pantsType === p.id ? 'nb-btn-primary' : 'bg-[#FFFDF7] text-[#111111]'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeCategory === 'accessories' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider font-mono font-bold text-[#111111] block">
                  Glasses / Eyewear
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'none', label: 'None' },
                    { id: 'cyan-tech', label: 'Sky-Blue Tech (Aarav)' },
                    { id: 'round-tort', label: 'Round Tortoiseshell (Zainab)' },
                    { id: 'sunglasses', label: 'Dark Aviators' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => update({ glasses: item.id as GlassesType })}
                      className={`nb-btn h-9 px-2.5 text-left text-xs truncate cursor-pointer ${
                        character.glasses === item.id ? 'nb-btn-primary' : 'bg-[#FFFDF7] text-[#111111]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider font-mono font-bold text-[#111111] block">
                  Caps &amp; Headwear
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'none', label: 'None' },
                    { id: 'coral-beanie', label: 'Coral Knit Beanie' },
                    { id: 'kufi', label: 'Two-Tone Kufi Cap' },
                    { id: 'turban', label: 'Gold Saffron Turban' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => update({ cap: item.id as CapType })}
                      className={`nb-btn h-9 px-2.5 text-left text-xs truncate cursor-pointer ${
                        character.cap === item.id ? 'nb-btn-primary' : 'bg-[#FFFDF7] text-[#111111]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider font-mono font-bold text-[#111111] block">
                  Beard &amp; Mustache
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'none', label: 'Clean Shaven' },
                    { id: 'mustache', label: 'Handlebar (Barnaby)' },
                    { id: 'boxed', label: 'Sculpted Boxed (Arthur)' },
                    { id: 'elder', label: 'Snow-White Full (Baba)' },
                    { id: 'goatee', label: 'Chin Goatee (Haruto)' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => update({ beard: item.id as BeardType })}
                      className={`nb-btn h-9 px-2 text-left text-xs truncate cursor-pointer ${
                        character.beard === item.id ? 'nb-btn-primary' : 'bg-[#FFFDF7] text-[#111111]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider font-mono font-bold text-[#111111] block">
                  Presenter Props
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'none', label: 'None' },
                    { id: 'stethoscope', label: 'Stethoscope (Zainab)' },
                    { id: 'phone', label: 'Smartphone' },
                    { id: 'coffee-cup', label: 'Coffee Cup' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => update({ defaultProp: item.id as PropType })}
                      className={`nb-btn h-9 px-2.5 text-left text-xs truncate cursor-pointer ${
                        character.defaultProp === item.id ? 'nb-btn-primary' : 'bg-[#FFFDF7] text-[#111111]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
