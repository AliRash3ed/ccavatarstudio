import React, { useState } from 'react';
import { CharacterConfig } from '../types/character';
import { DocsView } from './DocsView';
import { StyleGuide } from './StyleGuide';
import { GestureEncyclopedia } from './GestureEncyclopedia';
import { FileText, BookOpen, Hand } from 'lucide-react';

interface LearnViewProps {
  activeCharacter: CharacterConfig;
}

/**
 * "Learn" destination — merges Docs, the design-system Style Guide and the
 * Gesture reference (formerly three top-level nav tabs) into one place, per
 * the EGM target IA. These are reference material, not creation steps.
 */
export function LearnView({ activeCharacter }: LearnViewProps) {
  const [subTab, setSubTab] = useState<'docs' | 'style' | 'gestures'>('docs');

  const subTabs = [
    { id: 'docs' as const, label: 'How It Works', icon: FileText },
    { id: 'gestures' as const, label: 'Gesture Reference', icon: Hand },
    { id: 'style' as const, label: 'Design System', icon: BookOpen },
  ];

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Learn sections"
        className="flex items-center gap-1.5 flex-wrap bg-white p-2 rounded-xl border border-slate-200"
      >
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

      {subTab === 'docs' && <DocsView />}
      {subTab === 'gestures' && <GestureEncyclopedia activeCharacter={activeCharacter} />}
      {subTab === 'style' && <StyleGuide />}
    </div>
  );
}
