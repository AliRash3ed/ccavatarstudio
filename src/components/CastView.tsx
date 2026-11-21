import React, { useState } from 'react';
import { CharacterConfig } from '../types/character';
import { CharacterRoster } from './CharacterRoster';
import { WardrobeStudio } from './WardrobeStudio';
import { Users, Shirt } from 'lucide-react';

interface CastViewProps {
  characters: CharacterConfig[];
  selectedCharacter: CharacterConfig;
  onSelectCharacter: (char: CharacterConfig) => void;
  onEditInCustomizer: (char: CharacterConfig) => void;
  onOpenVideoStudio: (char: CharacterConfig) => void;
  onUpdateCharacter: (patch: Partial<CharacterConfig>) => void;
}

/**
 * "Cast" destination — merges the Character Roster and the Wardrobe studio
 * into one place with sub-tabs, per the EGM target IA (Cast absorbs Roster +
 * Wardrobe instead of two top-level nav tabs).
 */
export function CastView({
  characters,
  selectedCharacter,
  onSelectCharacter,
  onEditInCustomizer,
  onOpenVideoStudio,
  onUpdateCharacter,
}: CastViewProps) {
  const [subTab, setSubTab] = useState<'roster' | 'wardrobe'>('roster');

  const subTabs = [
    { id: 'roster' as const, label: 'Roster', icon: Users },
    { id: 'wardrobe' as const, label: 'Wardrobe', icon: Shirt },
  ];

  return (
    <div className="space-y-4">
      {/* Sub-tab rail */}
      <div
        role="tablist"
        aria-label="Cast sections"
        className="flex items-center justify-between gap-3 flex-wrap bg-white p-2 rounded-xl border border-slate-200"
      >
        <div className="flex items-center gap-1.5">
          {subTabs.map((t) => {
            const Icon = t.icon;
            const isActive = subTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-current={isActive ? 'true' : undefined}
                onClick={() => setSubTab(t.id)}
                className={`h-8 px-3.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
        <span className="text-xs text-slate-500 font-normal hidden sm:inline">
          Selected presenter: <strong className="text-slate-800 font-semibold">{selectedCharacter.name}</strong>
        </span>
      </div>

      {subTab === 'roster' && (
        <CharacterRoster
          characters={characters}
          selectedCharacter={selectedCharacter}
          onSelectCharacter={onSelectCharacter}
          onEditInCustomizer={onEditInCustomizer}
          onOpenVideoStudio={onOpenVideoStudio}
        />
      )}

      {subTab === 'wardrobe' && (
        <WardrobeStudio
          activeCharacter={selectedCharacter}
          onUpdateCharacter={onUpdateCharacter}
        />
      )}
    </div>
  );
}
