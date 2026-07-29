import React, { useState, useRef, useEffect } from 'react';
import { ActiveTab, VocabItem } from '../types';
import {
  Layers,
  PenTool,
  BookOpen,
  GraduationCap,
  BarChart3,
  Menu,
  MoreVertical,
  Check,
  FolderUp,
  RotateCw,
  Sliders,
  Settings,
  Globe,
  Clock,
  Play,
  Wand2,
  FileSpreadsheet
} from 'lucide-react';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  vocabList: VocabItem[];
  onOpenUpload: () => void;
  onResetDefaultVocab?: () => void;
  onOpenSettings?: () => void;
  activeSetName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  vocabList,
  onOpenUpload,
  onResetDefaultVocab,
  onOpenSettings,
  activeSetName,
}) => {

  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSrsActive, setIsSrsActive] = useState(true);
  const [activeQuizFilter, setActiveQuizFilter] = useState<'all' | 'unmastered' | 'nouns' | 'verbs'>('all');
  const [sessionWordCount, setSessionWordCount] = useState<number | 'all'>(10);

  const navRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setIsNavOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate total mastery percentage for display
  const totalMastery = vocabList.length > 0
    ? Math.round(vocabList.reduce((acc, curr) => acc + curr.masteryScore, 0) / vocabList.length)
    : 0;

  const getTabLabel = (tab: ActiveTab) => {
    switch (tab) {
      case 'quiz': return 'Interactive Practice';
      case 'sentences': return 'Sentence Builder';
      case 'stats': return 'Training Stats';
      case 'vocab': return 'Vocabulary List';
      case 'grammar': return 'Grammar Guide';
    }
  };

  const getTabShortName = (tab: ActiveTab) => {
    switch (tab) {
      case 'quiz': return 'Practice';
      case 'sentences': return 'Sentences';
      case 'stats': return 'Stats';
      case 'vocab': return 'Vocab';
      case 'grammar': return 'Grammar';
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs dark:bg-slate-900 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          
          {/* Left Side: Navigation Menu & Logo */}
          <div className="flex items-center gap-3">
            
            {/* Tab Navigation Dropdown Button */}
            <div className="relative" ref={navRef}>
              <button
                onClick={() => setIsNavOpen(prev => !prev)}
                className={`p-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer border flex items-center gap-2 ${
                  isNavOpen
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-500/30'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
                }`}
                title="Main Navigation Menu"
              >
                <Menu className="w-5 h-5" />
                <span className="hidden sm:inline-block font-extrabold text-xs">Tabs</span>
              </button>

              {/* Navigation Dropdown Items */}
              {isNavOpen && (
                <div className="absolute left-0 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-2.5 z-50 animate-fade-in space-y-1 origin-top-left">
                  
                  {/* 1. Interactive Quiz */}
                  <button
                    onClick={() => { setActiveTab('quiz'); setIsNavOpen(false); }}
                    className={`w-full px-3.5 py-2.5 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                      activeTab === 'quiz'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 font-extrabold'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Layers className="w-4 h-4 text-purple-600" />
                      <span>Interactive Practice</span>
                    </div>
                    {activeTab === 'quiz' && <Check className="w-4 h-4 text-blue-600" />}
                  </button>

                  {/* 3. Sentence Builder */}
                  <button
                    onClick={() => { setActiveTab('sentences'); setIsNavOpen(false); }}
                    className={`w-full px-3.5 py-2.5 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                      activeTab === 'sentences'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 font-extrabold'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <PenTool className="w-4 h-4 text-emerald-600" />
                      <span>Sentence Builder</span>
                    </div>
                    {activeTab === 'sentences' && <Check className="w-4 h-4 text-blue-600" />}
                  </button>

                  {/* 4. Training Stats */}
                  <button
                    onClick={() => { setActiveTab('stats'); setIsNavOpen(false); }}
                    className={`w-full px-3.5 py-2.5 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                      activeTab === 'stats'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 font-extrabold'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <BarChart3 className="w-4 h-4 text-emerald-600" />
                      <span>Training Stats</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                        {totalMastery}%
                      </span>
                      {activeTab === 'stats' && <Check className="w-4 h-4 text-blue-600" />}
                    </div>
                  </button>

                  {/* 5. Vocabulary List */}
                  <button
                    onClick={() => { setActiveTab('vocab'); setIsNavOpen(false); }}
                    className={`w-full px-3.5 py-2.5 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                      activeTab === 'vocab'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 font-extrabold'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <BookOpen className="w-4 h-4 text-indigo-600" />
                      <span>Vocabulary List ({vocabList.length})</span>
                    </div>
                    {activeTab === 'vocab' && <Check className="w-4 h-4 text-blue-600" />}
                  </button>

                  {/* 6. Grammar Cheatsheet */}
                  <button
                    onClick={() => { setActiveTab('grammar'); setIsNavOpen(false); }}
                    className={`w-full px-3.5 py-2.5 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                      activeTab === 'grammar'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 font-extrabold'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <GraduationCap className="w-4 h-4 text-amber-600" />
                      <span>Grammar Guide A1</span>
                    </div>
                    {activeTab === 'grammar' && <Check className="w-4 h-4 text-blue-600" />}
                  </button>

                  <div className="border-t border-slate-100 dark:border-slate-800 my-1 pt-1">
                    {/* Global Settings Trigger Item */}
                    <button
                      onClick={() => {
                        setIsNavOpen(false);
                        if (onOpenSettings) onOpenSettings();
                      }}
                      className="w-full px-3.5 py-2.5 text-xs font-extrabold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 flex items-center justify-between transition-colors cursor-pointer rounded-xl"
                    >
                      <div className="flex items-center gap-2.5">
                        <Settings className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>Settings & Vocab Decks</span>
                      </div>
                      <Globe className="w-3.5 h-3.5 opacity-70" />
                    </button>
                  </div>

                </div>
              )}
            </div>

            {/* Logo & Title */}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  DeutschMeister <span className="text-blue-600 font-black text-xs sm:text-sm bg-blue-50 dark:bg-blue-950 dark:text-blue-400 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">A1</span>
                </h1>
              </div>
              <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium hidden md:flex">
                <span>German Vocabulary Trainer</span>
                {activeSetName && (
                  <span className="text-[10px] font-extrabold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-900">
                    Deck: {activeSetName}
                  </span>
                )}
              </div>
            </div>

          </div>

          {/* Left Side (الجانب الأيسر): Active Tab Badge & 3-Dots Tab Settings Menu */}
          <div className="flex items-center gap-2.5">
            
            {/* Active Tab Badge Indicator */}
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{getTabLabel(activeTab)}</span>
            </span>

            {/* Tab Specific Settings Menu (3 Vertical Dots Icon - MoreVertical) */}
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setIsSettingsOpen(prev => !prev)}
                className={`p-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer border flex items-center justify-center ${
                  isSettingsOpen
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-500/30'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
                }`}
                title={`${getTabShortName(activeTab)} Settings`}
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {/* Tab Settings Dropdown Content */}
              {isSettingsOpen && (
                <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3 z-50 animate-fade-in space-y-2 origin-top-right">
                  
                  <div className="px-1 py-1 text-[11px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5 mb-1 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{getTabShortName(activeTab)} Settings</span>
                  </div>

                  {/* Quiz Settings - Practice Session Setup */}
                  {activeTab === 'quiz' && (
                    <div className="space-y-3 text-left">
                      
                      {/* Header Title */}
                      <div className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
                        <Play className="w-4 h-4 text-emerald-500 fill-emerald-500 shrink-0" />
                        <span>Practice Session Setup</span>
                      </div>

                      {/* 1. Session Word Count Selector */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400 block px-1">
                          Words per Session:
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[5, 10, 15, 20, 30, 'all'].map(cnt => {
                            const isSelected = sessionWordCount === cnt;
                            return (
                              <button
                                key={cnt.toString()}
                                type="button"
                                onClick={() => setSessionWordCount(cnt as any)}
                                className={`py-1.5 px-2 text-xs font-black rounded-lg border transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                                }`}
                              >
                                {cnt === 'all' ? 'All' : `${cnt} words`}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 2. Word Type Filter */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400 block px-1">
                          Word Type:
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            { id: 'all', label: 'All Vocabulary' },
                            { id: 'verbs', label: 'Verbs' },
                            { id: 'nouns', label: 'Nouns' },
                            { id: 'unmastered', label: 'Hard Words' },
                          ].map(f => {
                            const isActive = activeQuizFilter === f.id;
                            return (
                              <button
                                key={f.id}
                                type="button"
                                onClick={() => {
                                  setActiveQuizFilter(f.id as any);
                                }}
                                className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                                  isActive
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                                }`}
                              >
                                <span>{f.label}</span>
                                {isActive && <Check className="w-3 h-3 text-white shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 3. SRS Info Indicator */}
                      <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200">
                        <div className="flex items-center gap-1.5 font-extrabold">
                          <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>Spaced Repetition (SRS)</span>
                        </div>
                        <span className="font-black px-1.5 py-0.5 rounded bg-amber-200/80 dark:bg-amber-900 text-amber-950 dark:text-amber-100 text-[10px]">
                          Auto
                        </span>
                      </div>

                      {/* 4. Start Practice Session Button */}
                      <button
                        type="button"
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('app:quiz-start-session', {
                            detail: { count: sessionWordCount, filter: activeQuizFilter }
                          }));
                          setIsSettingsOpen(false);
                        }}
                        className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer border border-emerald-500"
                      >
                        <Play className="w-4 h-4 fill-white shrink-0" />
                        <span>Start Practice Session</span>
                      </button>
                    </div>
                  )}

                  {/* Sentences Settings */}
                  {activeTab === 'sentences' && (
                    <div className="space-y-1.5">
                      <button
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('app:sentences-reset'));
                          setIsSettingsOpen(false);
                        }}
                        className="w-full px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <RotateCw className="w-4 h-4 text-emerald-500" />
                        <span>Refresh Current Sentence</span>
                      </button>
                    </div>
                  )}

                  {/* Vocab Settings */}
                  {activeTab === 'vocab' && (
                    <div className="space-y-1.5">
                      {/* Smart Add Word */}
                      <button
                        type="button"
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('app:vocab-open-smart-add'));
                          setIsSettingsOpen(false);
                        }}
                        className="w-full px-3 py-2 text-xs font-extrabold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/60 rounded-xl flex items-center gap-2 transition-colors cursor-pointer border border-amber-200/60 dark:border-amber-900/50"
                      >
                        <Wand2 className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>Add Word (Smart Format)</span>
                      </button>

                      {/* Smart Import */}
                      <button
                        type="button"
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('app:vocab-open-import'));
                          setIsSettingsOpen(false);
                        }}
                        className="w-full px-3 py-2 text-xs font-extrabold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-xl flex items-center gap-2 transition-colors cursor-pointer border border-blue-200/60 dark:border-blue-900/50"
                      >
                        <FolderUp className="w-4 h-4 text-blue-500 shrink-0" />
                        <span>Import Vocabulary</span>
                      </button>

                      {/* Download Sheet CSV */}
                      <button
                        type="button"
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('app:vocab-export-sheet'));
                          setIsSettingsOpen(false);
                        }}
                        className="w-full px-3 py-2 text-xs font-extrabold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-xl flex items-center gap-2 transition-colors cursor-pointer border border-emerald-200/60 dark:border-emerald-900/50"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Download Vocabulary Sheet (CSV)</span>
                      </button>
                    </div>
                  )}

                  {/* Stats Settings */}
                  {activeTab === 'stats' && (
                    <div className="space-y-1.5">
                      <button
                        onClick={() => {
                          const summary = `Vocabulary Mastery: ${totalMastery}% (Total Words: ${vocabList.length})`;
                          navigator.clipboard.writeText(summary);
                          alert('Stats summary copied to clipboard!');
                          setIsSettingsOpen(false);
                        }}
                        className="w-full px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <BarChart3 className="w-4 h-4 text-emerald-500" />
                        <span>Copy Stats Summary</span>
                      </button>
                    </div>
                  )}

                  {/* Grammar Settings */}
                  {activeTab === 'grammar' && (
                    <div className="space-y-1.5">
                      <button
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('app:grammar-toggle-compact'));
                          setIsSettingsOpen(false);
                        }}
                        className="w-full px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Sliders className="w-4 h-4 text-amber-500" />
                        <span>Toggle Grammar View Style</span>
                      </button>
                    </div>
                  )}

                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};
