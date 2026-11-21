import React, { useState } from 'react';
import {
  BeardType,
  CapType,
  CharacterConfig,
  ClothesType,
  GlassesType,
  PantsType,
  PropType,
} from '../types/character';
import { CharacterStage } from './CharacterStage';
import { Shirt, Layers, Cpu } from 'lucide-react';

interface WardrobeStudioProps {
  activeCharacter: CharacterConfig;
  onUpdateCharacter: (patch: Partial<CharacterConfig>) => void;
}

export const WardrobeStudio: React.FC<WardrobeStudioProps> = ({
  activeCharacter,
  onUpdateCharacter,
}) => {
  const [isExploded, setIsExploded] = useState<boolean>(false);
  const [flatShading, setFlatShading] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [turn, setTurn] = useState<'0' | '35' | '90' | '180'>('0');

  return (
    <div className="w-full space-y-5">
      {/* Top Header */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            Wardrobe &amp; Appearance
          </h2>
          <p className="text-xs text-slate-500">
            Configure outfits, eyewear, headwear, and accessories for {activeCharacter.name}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExploded(!isExploded)}
            className={`h-8 px-3 text-xs font-medium rounded-lg transition cursor-pointer ${
              isExploded ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {isExploded ? 'Exploded View (Active)' : 'Standard View'}
          </button>

          <button
            type="button"
            onClick={() => setFlatShading(!flatShading)}
            className={`h-8 px-3 text-xs font-medium rounded-lg transition cursor-pointer ${
              flatShading ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {flatShading ? 'Flat Shading' : 'Shaded'}
          </button>

          <button
            type="button"
            onClick={() => setShowGrid(!showGrid)}
            className={`h-8 px-3 text-xs font-medium rounded-lg transition cursor-pointer ${
              showGrid ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Grid
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col items-center space-y-4">
          <div className="flex items-center justify-between w-full pb-3 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800">
              Canvas Preview (240×380px)
            </span>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 text-xs">
              {(['0', '35', '90', '180'] as const).map((deg) => (
                <button
                  key={deg}
                  type="button"
                  onClick={() => setTurn(deg)}
                  className={`px-2 py-0.5 font-mono text-xs rounded-md transition cursor-pointer ${
                    turn === deg ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {deg}°
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-center w-full">
            <CharacterStage
              character={activeCharacter}
              isExploded={isExploded}
              flatShading={flatShading}
              showGrid={showGrid}
              turn={turn}
              scale={1.05}
            />
          </div>

          <p className="text-xs text-slate-500 text-center leading-relaxed">
            {isExploded
              ? 'Exploded view shows component layer separation for anatomical alignment verification.'
              : 'Interactive preview updates in real time as you adjust wardrobe and accessories.'}
          </p>
        </div>

        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Shirt className="w-4 h-4 text-indigo-600" />
              Tops &amp; Outfits
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'lab-coat', label: 'Clinical Lab Coat', topHex: '#F8FAFC', prop: 'stethoscope' },
                { id: 'suit-tie', label: 'Executive Blazer', topHex: '#1E293B', prop: 'none' },
                { id: 'tunic-kurta', label: 'Mandarin Kurta', topHex: '#047857', prop: 'none' },
                { id: 'plush-sweater', label: 'Plush Pullover', topHex: '#69498E', prop: 'none' },
                { id: 'polo-sweater', label: 'Polo Collared', topHex: '#216676', prop: 'none' },
                { id: 'open-jacket', label: 'Indigo Jacket', topHex: '#1E3A8A', prop: 'phone' },
                { id: 'crew-collar', label: 'Crew Sweater', topHex: '#252C42', prop: 'none' },
                { id: 'hoodie', label: 'Studio Hoodie', topHex: '#0F766E', prop: 'coffee-cup' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    onUpdateCharacter({
                      clothesType: item.id as ClothesType,
                      topHex: item.topHex,
                      defaultProp: item.prop as PropType,
                    })
                  }
                  className={`h-9 px-2.5 text-xs font-medium rounded-lg truncate cursor-pointer transition border ${
                    activeCharacter.clothesType === item.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <h4 className="text-xs font-bold text-slate-900 pt-2">
              Trousers &amp; Footwear
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'chinos', label: 'Khaki Chinos', hex: '#C8B59B', shade: '#AC977B', shoe: '#6E5648' },
                { id: 'cream', label: 'Cream Trousers', hex: '#E5DEC9', shade: '#C7BEA6', shoe: '#473325' },
                { id: 'slacks', label: 'Charcoal Slacks', hex: '#1E293B', shade: '#0F172A', shoe: '#0F172A' },
                { id: 'denim', label: 'Indigo Denim', hex: '#1E3A5F', shade: '#152945', shoe: '#544339' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() =>
                    onUpdateCharacter({
                      pantsType: p.id as PantsType,
                      pantsHex: p.hex,
                      pantsShade: p.shade,
                      shoeHex: p.shoe,
                    })
                  }
                  className={`h-9 px-2.5 text-xs font-medium rounded-lg cursor-pointer transition border ${
                    activeCharacter.pantsType === p.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Headwear</label>
                <select
                  value={activeCharacter.cap}
                  onChange={(e) => onUpdateCharacter({ cap: e.target.value as CapType })}
                  className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="none">None</option>
                  <option value="coral-beanie">Coral Knit Beanie</option>
                  <option value="kufi">Two-Tone Kufi Cap</option>
                  <option value="turban">Gold Saffron Turban</option>
                  <option value="baseball">Baseball Cap</option>
                  <option value="scrub-cap">Medical Scrub Cap</option>
                  <option value="beret">Classic Beret</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Eyewear</label>
                <select
                  value={activeCharacter.glasses}
                  onChange={(e) => onUpdateCharacter({ glasses: e.target.value as GlassesType })}
                  className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="none">None</option>
                  <option value="cyan-tech">Sky-Blue Tech</option>
                  <option value="round-tort">Round Tortoiseshell</option>
                  <option value="wayfarer">Wayfarer</option>
                  <option value="aviator">Gold Aviators</option>
                  <option value="cateye">Rose Cat-Eye</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Facial Hair</label>
                <select
                  value={activeCharacter.beard}
                  onChange={(e) => onUpdateCharacter({ beard: e.target.value as BeardType })}
                  className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="none">Clean Shaven</option>
                  <option value="mustache">Handlebar Mustache</option>
                  <option value="boxed">Sculpted Boxed Beard</option>
                  <option value="elder">Snow-White Full Beard</option>
                  <option value="goatee">Chin Goatee</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Presenter Prop</label>
                <select
                  value={activeCharacter.defaultProp || 'none'}
                  onChange={(e) => onUpdateCharacter({ defaultProp: e.target.value as PropType })}
                  className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="none">None</option>
                  <option value="stethoscope">Medical Stethoscope</option>
                  <option value="phone">Smartphone</option>
                  <option value="book">Book</option>
                  <option value="coffee-cup">Coffee Cup</option>
                  <option value="clipboard">Clipboard</option>
                  <option value="pen">Presenter Pen</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-600" />
              Puppet Rig Layer Hierarchy
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {[
                { layer: '01. Hair & Headwear', desc: 'Back hair silhouette, hijab drapery, or caps.' },
                { layer: '02. Lower Body', desc: 'Trousers, footwear, and grounded stance.' },
                { layer: '03. Torso & Outfit', desc: 'Tops, blazers, and lapel folds.' },
                { layer: '04. Arms & Cuff Bridges', desc: 'Anatomical sockets and wrist transitions.' },
                { layer: '05. Hands & Props', desc: '30 gestures and swappable handheld props.' },
                { layer: '06. Head & Facial Features', desc: 'Pivot center with tilt and viseme sync.' },
              ].map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg space-y-1">
                  <span className="font-mono text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md inline-block">
                    {item.layer}
                  </span>
                  <p className="text-slate-600 text-xs">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
