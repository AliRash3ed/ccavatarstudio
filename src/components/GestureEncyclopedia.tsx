import React, { useState } from 'react';
import { CharacterConfig, HandGesture, EmotionPreset } from '../types/character';
import { GESTURES_LIST, EMOTIONS_LIST } from '../data/characters';
import { CharacterStage } from './CharacterStage';
import { Hand, Check } from 'lucide-react';

interface GestureEncyclopediaProps {
  activeCharacter: CharacterConfig;
}

export const GestureEncyclopedia: React.FC<GestureEncyclopediaProps> = ({ activeCharacter }) => {
  const [selectedGesture, setSelectedGesture] = useState<HandGesture>('steeple');
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionPreset>('warm');
  const [activeTab, setActiveTab] = useState<'gestures' | 'emotions'>('gestures');
  const [framing, setFraming] = useState<'full' | 'portrait'>('full');

  const presenterGestures = GESTURES_LIST.filter((g) => g.category === 'presenter');
  const silhouetteGestures = GESTURES_LIST.filter((g) => g.category === 'silhouette');
  const emotionMeta = EMOTIONS_LIST.find((e) => e.id === selectedEmotion);

  return (
    <div className="w-full space-y-5">
      {/* Top Header */}
      <div className="nb-card p-4 bg-[#FFFFFF] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-extrabold text-[#111111] flex items-center gap-2">
            <Hand className="w-4 h-4" />
            30 Hand Gestures Encyclopedia &amp; 7 Emotions Interactive Rig
          </h2>
          <p className="text-xs text-[#444444]">
            Lineless 5-finger hands with distinct thumbs, cuff-locked wrist bridges, and coupled brow kinematics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFraming(framing === 'full' ? 'portrait' : 'full')}
            className="nb-btn bg-[#F4F0EA] h-9 px-3 text-xs cursor-pointer"
          >
            {framing === 'full' ? 'Full Body' : 'Portrait'}
          </button>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('gestures')}
              className={`nb-btn h-8 px-3 text-xs cursor-pointer ${
                activeTab === 'gestures' ? 'nb-btn-primary' : 'bg-[#F4F0EA] text-[#111111]'
              }`}
            >
              30 Hand Gestures
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('emotions')}
              className={`nb-btn h-8 px-3 text-xs cursor-pointer ${
                activeTab === 'emotions' ? 'nb-btn-primary' : 'bg-[#F4F0EA] text-[#111111]'
              }`}
            >
              7 Core Emotions
            </button>
          </div>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-4 nb-card p-4 bg-[#FFFFFF] space-y-4 sticky top-20">
          <div className="flex items-center justify-between pb-2 border-b-2 border-[#111111]">
            <span className="font-display text-xs font-extrabold text-[#111111] uppercase">
              Live Articulated Presenter
            </span>
            <span className="text-xs font-mono font-bold bg-[#FFDE59] border border-[#111111] px-2 py-0.5 text-[#111111]">
              #{activeCharacter.name}
            </span>
          </div>

          <div className="flex justify-center p-4 bg-[#FFFDF7] rounded border-2 border-[#111111]">
            <CharacterStage
              character={activeCharacter}
              gesture={selectedGesture}
              emotion={selectedEmotion}
              eye={emotionMeta?.defaultEye}
              mouth={emotionMeta?.defaultMouth}
              framing={framing}
              scale={1.05}
            />
          </div>

          <div className="p-3 rounded bg-[#F4F0EA] border-2 border-[#111111] space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#333333] font-semibold">Current Gesture</span>
              <span className="font-mono bg-[#FFDE59] border border-[#111111] px-1.5 py-0.5 font-bold text-[#111111]">
                {selectedGesture}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#333333] font-semibold">Current Emotion</span>
              <span className="font-mono font-bold text-[#111111]">{selectedEmotion}</span>
            </div>
            <p className="text-[11px] text-[#333333] pt-1.5 border-t border-[#111111]/20">
              {GESTURES_LIST.find((g) => g.id === selectedGesture)?.desc}
            </p>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          {activeTab === 'gestures' ? (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold text-[#111111] tracking-wider uppercase">
                    17 Primary Presenter Gestures
                  </h3>
                  <span className="text-[11px] bg-[#FFDE59] border border-[#111111] px-2 py-0.5 font-mono font-bold tabular-nums">
                    17 / 30
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {presenterGestures.map((g) => {
                    const isActive = selectedGesture === g.id;
                    return (
                      <div
                        key={g.id}
                        onClick={() => setSelectedGesture(g.id)}
                        className={`nb-card p-3 cursor-pointer flex flex-col justify-between transition ${
                          isActive ? 'bg-[#FFDE59]' : 'bg-[#FFFFFF] hover:bg-[#FFFDF7]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-extrabold text-[#111111]">{g.name}</span>
                            {g.twoHanded && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#70D6FF] text-[#111111] border border-[#111111]">
                                2-Hand
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#333333] leading-snug">{g.desc}</p>
                        </div>

                        <div className="mt-2 pt-2 border-t border-[#111111]/15 flex items-center justify-between text-[10px]">
                          <span className="font-mono font-bold text-[#444444]">[{g.id}]</span>
                          {isActive && <Check className="w-3.5 h-3.5 text-[#111111]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t-2 border-[#111111]">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold text-[#111111] tracking-wider uppercase">
                    13 Silhouette Chart Poses
                  </h3>
                  <span className="text-[11px] bg-[#7BF1A8] border border-[#111111] px-2 py-0.5 font-mono font-bold tabular-nums">
                    13 / 30
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {silhouetteGestures.map((g) => {
                    const isActive = selectedGesture === g.id;
                    return (
                      <div
                        key={g.id}
                        onClick={() => setSelectedGesture(g.id)}
                        className={`nb-card p-3 cursor-pointer flex flex-col justify-between transition ${
                          isActive ? 'bg-[#FFDE59]' : 'bg-[#FFFFFF] hover:bg-[#FFFDF7]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-extrabold text-[#111111]">{g.name}</span>
                            {g.twoHanded && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#70D6FF] text-[#111111] border border-[#111111]">
                                2-Hand
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#333333] leading-snug">{g.desc}</p>
                        </div>

                        <div className="mt-2 pt-2 border-t border-[#111111]/15 flex items-center justify-between text-[10px]">
                          <span className="font-mono font-bold text-[#444444]">[{g.id}]</span>
                          {isActive && <Check className="w-3.5 h-3.5 text-[#111111]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <h3 className="text-xs font-mono font-bold text-[#111111] tracking-wider uppercase">
                7 Core Facial Emotion Morph Targets
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {EMOTIONS_LIST.map((emo) => {
                  const isActive = selectedEmotion === emo.id;
                  return (
                    <div
                      key={emo.id}
                      onClick={() => setSelectedEmotion(emo.id)}
                      className={`nb-card p-4 cursor-pointer flex flex-col justify-between transition ${
                        isActive ? 'bg-[#FFDE59]' : 'bg-[#FFFFFF] hover:bg-[#FFFDF7]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-display text-sm font-extrabold text-[#111111]">{emo.name}</h4>
                          <span className="font-mono text-xs font-bold bg-[#111111] text-[#FFDE59] px-1.5 py-0.5">
                            [{emo.id}]
                          </span>
                        </div>
                        <p className="text-xs text-[#333333] mb-3">{emo.desc}</p>
                      </div>

                      <div className="p-2.5 rounded bg-[#FFFDF7] border-2 border-[#111111] text-[11px] space-y-1 font-mono text-[#222222]">
                        <div>Left Brow Offset: {emo.browL.dy}px (Rot: {emo.browL.rot}°)</div>
                        <div>Right Brow Offset: {emo.browR.dy}px (Rot: {emo.browR.rot}°)</div>
                        <div className="font-bold text-[#111111]">Coupled Mouth: {emo.defaultMouth}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
