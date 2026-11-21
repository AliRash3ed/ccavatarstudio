import React, { useState, useEffect } from 'react';
import { CharacterConfig, EyeSprite, MouthSprite } from '../types/character';
import { EYES_LIST, VISEMES_LIST } from '../data/characters';
import { CharacterStage } from './CharacterStage';
import { Eye, Smile, Grid, Play, Square } from 'lucide-react';
import { mapWordToVisemes, mouthSpriteToRhubarbCode } from '../utils/scriptDirector';

interface SpriteMatrixProps {
  activeCharacter: CharacterConfig;
}

export const SpriteMatrix: React.FC<SpriteMatrixProps> = ({ activeCharacter }) => {
  const [testEye, setTestEye] = useState<EyeSprite>('friendly');
  const [testMouth, setTestMouth] = useState<MouthSprite>('aei');
  const [isTalkLoop, setIsTalkLoop] = useState<boolean>(false);

  useEffect(() => {
    if (!isTalkLoop) return;
    const demoPhrase = 'Hello and welcome to ccavatarstudio Lip Sync';
    const seq = demoPhrase.split(/\s+/).flatMap((w) => mapWordToVisemes(w, 0, 0.35).map((v) => v.viseme));
    let idx = 0;
    const id = window.setInterval(() => {
      setTestMouth(seq[idx % seq.length]);
      idx++;
    }, 115);
    return () => clearInterval(id);
  }, [isTalkLoop]);

  return (
    <div className="w-full space-y-5">
      <div className="nb-card p-4 bg-[#FFFFFF] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-extrabold text-[#111111] flex items-center gap-2">
            <Grid className="w-4 h-4" />
            Mouth Viseme &amp; Eye Sprite Matrix (10 Eyes × 12 Rhubarb Mouths)
          </h2>
          <p className="text-xs text-[#444444]">
            Visual comparison of all Rhubarb Lip-Sync shapes (X, A, B, C, D, E, F, G, H) and coupled eye sprites
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <button
            type="button"
            onClick={() => setIsTalkLoop(!isTalkLoop)}
            className={`nb-btn h-9 px-3 flex items-center gap-1.5 cursor-pointer ${
              isTalkLoop ? 'nb-btn-danger' : 'nb-btn-primary'
            }`}
          >
            {isTalkLoop ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isTalkLoop ? 'Stop Talk Demo' : 'Live Rhubarb Talk Loop'}</span>
          </button>

          <span className="font-mono text-[#111111] font-bold bg-[#F4F0EA] border-2 border-[#111111] px-2 py-1">
            [{testEye}] + [{testMouth} · {mouthSpriteToRhubarbCode(testMouth)}]
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-4 nb-card p-4 bg-[#FFFFFF] space-y-4 sticky top-20">
          <div className="flex items-center justify-between pb-2 border-b-2 border-[#111111]">
            <span className="font-display text-xs font-extrabold text-[#111111] uppercase">
              Live Sprite Combination
            </span>
            <span className="text-xs bg-[#FFDE59] border border-[#111111] px-2 py-0.5 text-[#111111] font-mono font-bold">
              #{activeCharacter.name}
            </span>
          </div>

          <div className="flex justify-center p-4 bg-[#FFFDF7] rounded border-2 border-[#111111]">
            <CharacterStage
              character={activeCharacter}
              eye={testEye}
              mouth={testMouth}
              framing="portrait"
              scale={1.1}
            />
          </div>

          <div className="p-3 rounded bg-[#F4F0EA] border-2 border-[#111111] text-xs space-y-1">
            <div className="text-[#333333] font-bold">Active Rhubarb Viseme</div>
            <div className="bg-[#FFDE59] border border-[#111111] px-1.5 py-0.5 inline-block text-[#111111] font-mono font-bold">
              {VISEMES_LIST.find((v) => v.id === testMouth)?.label} (Code {mouthSpriteToRhubarbCode(testMouth)})
            </div>
            <p className="text-[11px] text-[#333333]">
              Phonemes: {VISEMES_LIST.find((v) => v.id === testMouth)?.phonemes}
            </p>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-5">
          <div className="nb-card p-4 bg-[#FFFFFF] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b-2 border-[#111111]">
              <h3 className="text-xs font-mono font-bold text-[#111111] uppercase tracking-wider flex items-center gap-2">
                <Smile className="w-4 h-4" />
                12 Mouth Visemes (Rhubarb Lip-Sync Shapes)
              </h3>
              <span className="text-[11px] bg-[#FFDE59] border border-[#111111] px-2 py-0.5 text-[#111111] font-mono font-bold tabular-nums">
                12 Visemes
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {VISEMES_LIST.map((v) => {
                const isActive = testMouth === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      setIsTalkLoop(false);
                      setTestMouth(v.id);
                    }}
                    className={`nb-btn p-2.5 text-left flex flex-col justify-between gap-2 cursor-pointer ${
                      isActive ? 'nb-btn-primary' : 'bg-[#FFFDF7] text-[#111111]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="mini-stage-wrap">
                        <CharacterStage
                          character={activeCharacter}
                          eye={testEye}
                          mouth={v.id}
                          framing="portrait"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-extrabold truncate">{v.label}</span>
                          <span className="px-1 py-0.5 rounded text-[9px] font-mono font-bold bg-[#111111] text-[#FFDE59] border border-[#111111]">
                            {v.rhubarbCode}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#333333] leading-tight mt-0.5 line-clamp-2 font-normal">
                          {v.phonemes}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="nb-card p-4 bg-[#FFFFFF] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b-2 border-[#111111]">
              <h3 className="text-xs font-mono font-bold text-[#111111] uppercase tracking-wider flex items-center gap-2">
                <Eye className="w-4 h-4" />
                10 Eye Sprite Thumbnails
              </h3>
              <span className="text-[11px] bg-[#7BF1A8] border border-[#111111] px-2 py-0.5 text-[#111111] font-mono font-bold tabular-nums">
                10 Sprites
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {EYES_LIST.map((e) => {
                const isActive = testEye === e.id;
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setTestEye(e.id)}
                    className={`nb-btn p-2 text-left flex flex-col items-center gap-1.5 cursor-pointer ${
                      isActive ? 'nb-btn-primary' : 'bg-[#FFFDF7] text-[#111111]'
                    }`}
                  >
                    <div className="mini-stage-wrap">
                      <CharacterStage
                        character={activeCharacter}
                        eye={e.id}
                        mouth={testMouth}
                        framing="portrait"
                      />
                    </div>
                    <span className="text-[11px] font-bold truncate w-full text-center">{e.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
