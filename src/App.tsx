import React, { useEffect, useState } from 'react';
import { CharacterConfig } from './types/character';
import { CHARACTERS } from './data/characters';
import { LandingPage } from './components/LandingPage';
import { VideoStudio } from './components/VideoStudio';
import { CastView } from './components/CastView';
import { CharacterCustomizer } from './components/CharacterCustomizer';
import { LearnView } from './components/LearnView';
import { ReferenceModal } from './components/ReferenceModal';
import { SetupGuideModal } from './components/SetupGuideModal';
import { CcAvatarLogo } from './components/CcAvatarLogo';
import { Footer } from './components/Footer';
import { EngineCapabilities } from './types/capabilities';
import {
  Home,
  Film,
  Users,
  Paintbrush,
  BookOpen,
  Sliders,
  HardDriveDownload,
  ShieldCheck,
  Sun,
  Moon,
} from 'lucide-react';

export default function App() {
  const [activeView, setActiveView] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1' || window.location.hash === '#studio') {
        return 'videostudio';
      }
    }
    return 'home';
  });
  const [characters, setCharacters] = useState<CharacterConfig[]>(CHARACTERS);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterConfig>(
    CHARACTERS.find((c) => c.name.includes('Barnaby')) || CHARACTERS[0]
  );
  const [globalHeadTilt, setGlobalHeadTilt] = useState<number>(0);
  const [isReferenceModalOpen, setIsReferenceModalOpen] = useState<boolean>(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState<boolean>(false);
  const [setupCaps, setSetupCaps] = useState<EngineCapabilities | null>(null);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('color-scheme');
      if (stored === 'dark') return true;
      if (stored === 'light') return false;
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const toggleTheme = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    const mode = nextDark ? 'dark' : 'light';
    localStorage.setItem('color-scheme', mode);
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) meta.setAttribute('content', mode);
    if (nextDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const openSetupModal = () => {
    setIsSetupModalOpen(true);
    fetch('/api/capabilities')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setSetupCaps(d);
      })
      .catch(() => {});
  };

  // EGM proposal: the Setup guide is the single engine truth and should
  // auto-open on first visit when required binaries are missing.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/capabilities')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d || cancelled) return;
        setSetupCaps(d);
        if (!d.rhubarb?.installed || !d.ffmpeg?.installed) {
          setIsSetupModalOpen(true);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveCustomCharacter = (newChar: CharacterConfig) => {
    setCharacters((prev) => [newChar, ...prev]);
    setSelectedCharacter(newChar);
  };

  const handleUpdateActiveCharacter = (patch: Partial<CharacterConfig>) => {
    const updated = { ...selectedCharacter, ...patch };
    setSelectedCharacter(updated);
    setCharacters((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900 transition-colors">
      {/* 1. TOP STUDIO HEADER */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 lg:px-6 py-2.5">
        <div className="max-w-[1520px] mx-auto flex flex-wrap xl:flex-nowrap items-center justify-between gap-3">
          {/* Zone 1: Brand Lockup */}
          <button
            type="button"
            onClick={() => setActiveView('home')}
            className="flex items-center shrink-0 text-left cursor-pointer group"
          >
            <CcAvatarLogo size={38} />
          </button>

          {/* Zone 2: Navigation */}
          <nav className="flex flex-wrap xl:flex-nowrap items-center gap-1 bg-slate-100/70 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            {[
              { id: 'home', label: 'Home', icon: Home },
              { id: 'videostudio', label: 'Studio', icon: Film, highlight: true },
              { id: 'roster', label: 'Cast', icon: Users },
              { id: 'customizer', label: 'Builder', icon: Paintbrush },
              { id: 'docs', label: 'Learn', icon: BookOpen },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeView === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveView(tab.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`h-8 px-3 text-xs font-semibold rounded-lg flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
                    isActive
                      ? tab.highlight
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-700/80'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Theme Toggle & Settings */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              className="h-8 w-8 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center shadow-xs transition cursor-pointer"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            <button
              type="button"
              onClick={openSetupModal}
              className="h-8 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <HardDriveDownload className="w-3.5 h-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
              <span>Settings &amp; Keys</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN WORKSPACE VIEWPORT */}
      <main className="flex-1 max-w-[1520px] w-full mx-auto p-4 lg:p-6">
        {activeView === 'home' && (
          <LandingPage
            characters={characters}
            activeCharacter={selectedCharacter}
            onSelectCharacter={setSelectedCharacter}
            onNavigate={setActiveView}
          />
        )}

        {activeView === 'videostudio' && (
          <VideoStudio
            activeCharacter={selectedCharacter}
            allCharacters={characters}
            onSelectCharacter={setSelectedCharacter}
            onUpdateCharacter={handleUpdateActiveCharacter}
            globalHeadTilt={globalHeadTilt}
          />
        )}

        {activeView === 'roster' && (
          <CastView
            characters={characters}
            selectedCharacter={selectedCharacter}
            onSelectCharacter={setSelectedCharacter}
            onEditInCustomizer={(char) => {
              setSelectedCharacter(char);
              setActiveView('customizer');
            }}
            onOpenVideoStudio={(char) => {
              setSelectedCharacter(char);
              setActiveView('videostudio');
            }}
            onUpdateCharacter={handleUpdateActiveCharacter}
          />
        )}

        {activeView === 'customizer' && (
          <CharacterCustomizer
            initialCharacter={selectedCharacter}
            onSaveCustomCharacter={handleSaveCustomCharacter}
            onOpenVideoStudio={(char) => {
              setSelectedCharacter(char);
              setActiveView('videostudio');
            }}
          />
        )}

        {activeView === 'docs' && <LearnView activeCharacter={selectedCharacter} />}
      </main>

      {/* GLOBAL FOOTER */}
      <Footer />

      {/* 4. REFERENCE & LOCAL SETUP MODALS */}
      <ReferenceModal
        isOpen={isReferenceModalOpen}
        onClose={() => setIsReferenceModalOpen(false)}
      />
      <SetupGuideModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        engineCaps={setupCaps}
      />
    </div>
  );
}
