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
  RotateCcw,
  Sliders,
  Settings,
  Globe,
  Clock,
  Play,
  AlertCircle,
  Wand2,
  FileSpreadsheet,
  FolderKanban,
  PlusCircle,
  Sparkles,
  ArrowUpDown
} from 'lucide-react';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  vocabList: VocabItem[];
  onOpenUpload: () => void;
  onResetDefaultVocab?: () => void;
  onResetActiveDeckMastery?: () => void;
  onOpenSettings?: () => void;
  activeSetName?: string;
  activeSetGroup?: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  vocabList,
  onOpenUpload,
  onResetDefaultVocab,
  onResetActiveDeckMastery,
  onOpenSettings,
  activeSetName,
  activeSetGroup,
}) => {

  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [isSrsActive, setIsSrsActive] = useState(true);
  const [activeQuizFilter, setActiveQuizFilter] = useState<'all' | 'noun' | 'verb' | 'adjective' | 'expression' | 'others'>('all');
  const [activeLevelFilter, setActiveLevelFilter] = useState<'all' | 'A1' | 'A2' | 'B1' | 'B2'>('all');
  const [isHardWordsOnly, setIsHardWordsOnly] = useState<boolean>(false);
  const [sessionWordCount, setSessionWordCount] = useState<number | 'all'>(10);
  const [vocabSortMode, setVocabSortMode] = useState<'alphabetical' | 'newest'>(() => {
    const saved = localStorage.getItem('vocab_sort_mode');
    return saved === 'newest' ? 'newest' : 'alphabetical';
  });

  useEffect(() => {
    const handleSortEvent = (e: Event) => {
      const customEv = e as CustomEvent<string>;
      if (customEv.detail && (customEv.detail === 'alphabetical' || customEv.detail === 'newest')) {
        setVocabSortMode(customEv.detail as 'alphabetical' | 'newest');
      }
    };
    window.addEventListener('app:vocab-set-sort', handleSortEvent);
    return () => window.removeEventListener('app:vocab-set-sort', handleSortEvent);
  }, []);

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
      case 'vocab': return 'Vocabulary List';
      case 'decks': return 'Decks & Database';
      case 'stats': return 'Training Stats';
      case 'settings': return 'Question Settings';
    }
  };

  const getTabShortName = (tab: ActiveTab) => {
    switch (tab) {
      case 'quiz': return 'Practice';
      case 'vocab': return 'Vocab';
      case 'decks': return 'Decks';
      case 'stats': return 'Stats';
      case 'settings': return 'Settings';
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
                  
                  {/* 1. Interactive Practice */}
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

                  {/* 2. Vocabulary List */}
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

                  {/* 3. Training Stats */}
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

                  <div className="border-t border-slate-100 dark:border-slate-800 my-1 pt-1 space-y-1">
                    {/* 4. Decks & Database */}
                    <button
                      onClick={() => { setActiveTab('decks'); setIsNavOpen(false); }}
                      className={`w-full px-3.5 py-2.5 text-xs font-extrabold flex items-center justify-between transition-colors cursor-pointer rounded-xl ${
                        activeTab === 'decks'
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300'
                          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <FolderKanban className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>Decks & Database</span>
                      </div>
                      {activeTab === 'decks' && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                    </button>

                    {/* 5. Settings */}
                    <button
                      onClick={() => { setActiveTab('settings'); setIsNavOpen(false); }}
                      className={`w-full px-3.5 py-2.5 text-xs font-extrabold flex items-center justify-between transition-colors cursor-pointer rounded-xl ${
                        activeTab === 'settings'
                          ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300'
                          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Sliders className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span>Settings</span>
                      </div>
                      {activeTab === 'settings' && <Check className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
                    </button>
                  </div>

                </div>
              )}
            </div>

            {/* Logo & Title */}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <span>DeutschMeister</span>
                  <span className="text-blue-700 dark:text-blue-300 font-black text-xs sm:text-sm bg-blue-100 dark:bg-blue-950 px-2.5 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800 shrink-0">
                    {activeSetGroup || 'A1'}
                  </span>
                </h1>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                <span className="hidden sm:inline">German Vocabulary Trainer</span>
                <span className="hidden sm:inline">•</span>
                {activeSetName ? (
                  <span className="text-blue-600 dark:text-blue-400 font-bold truncate max-w-[180px] sm:max-w-[260px]">
                    {activeSetName}
                  </span>
                ) : (
                  <span>Default Deck</span>
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

                  {/* Quiz Settings */}
                  {activeTab === 'quiz' && (
                    <div className="space-y-3 text-left">
                      
                      {/* 1. Session Word Count Selector */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400 block px-1">
                          Words per Session:
                        </label>
                        <div className="grid grid-cols-4 gap-1">
                          {[10, 30, 50, 'all'].map(cnt => {
                            const isSelected = sessionWordCount === cnt;
                            return (
                              <button
                                key={cnt.toString()}
                                type="button"
                                onClick={() => setSessionWordCount(cnt as any)}
                                className={`py-1.5 px-1 text-[11px] font-black rounded-lg border transition-all cursor-pointer text-center ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                                }`}
                              >
                                {cnt === 'all' ? 'All' : `${cnt}`}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 2. CEFR Level Focus Selector */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400 block px-1">
                          CEFR Level Focus:
                        </label>
                        <div className="grid grid-cols-5 gap-1">
                          {(['A1', 'A2', 'B1', 'B2', 'all'] as const).map(lvl => {
                            const isSelected = activeLevelFilter === lvl;
                            return (
                              <button
                                key={lvl}
                                type="button"
                                onClick={() => setActiveLevelFilter(lvl)}
                                className={`py-1.5 px-1 text-[11px] font-black rounded-lg border transition-all cursor-pointer text-center ${
                                  isSelected
                                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-purple-400'
                                }`}
                              >
                                {lvl === 'all' ? 'All' : lvl}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 3. Word Type Filter */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400 block px-1">
                          Word Type:
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            { id: 'all', label: 'All words', activeColor: 'bg-slate-700 text-white border-slate-700' },
                            { id: 'noun', label: 'Noun', activeColor: 'bg-blue-600 text-white border-blue-600' },
                            { id: 'verb', label: 'Verb', activeColor: 'bg-emerald-600 text-white border-emerald-600' },
                            { id: 'adjective', label: 'Adjective', activeColor: 'bg-amber-600 text-white border-amber-600' },
                            { id: 'expression', label: 'Expression', activeColor: 'bg-purple-600 text-white border-purple-600' },
                            { id: 'others', label: 'Others', activeColor: 'bg-slate-600 text-white border-slate-600' },
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
                                    ? `${f.activeColor} shadow-xs`
                                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                                }`}
                              >
                                <span>{f.label}</span>
                                {isActive && <Check className="w-3 h-3 text-white shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="border-t border-slate-200 dark:border-slate-800 my-1.5" />

                      {/* 4. Standalone Hard Words Filter Option (<60% mastery) */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-[11px] text-rose-900 dark:text-rose-200">
                        <div className="flex items-center gap-1.5 font-extrabold">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                          <span>Hard words only (&lt;60%)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsHardWordsOnly(prev => !prev)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black transition-all cursor-pointer border ${
                            isHardWordsOnly
                              ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {isHardWordsOnly ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>

                      {/* 5. SRS Interactive Toggle */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200">
                        <div className="flex items-center gap-1.5 font-extrabold">
                          <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>Spaced Repetition (SRS)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsSrsActive(prev => !prev)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black transition-all cursor-pointer border ${
                            isSrsActive
                              ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {isSrsActive ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>

                      <div className="border-t border-slate-200 dark:border-slate-800 my-1.5" />

                      {/* 5. Start Practice Session Button */}
                      <button
                        type="button"
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('app:quiz-start-session', {
                            detail: {
                              count: sessionWordCount,
                              wordType: activeQuizFilter,
                              level: activeLevelFilter,
                              hardWordsOnly: isHardWordsOnly,
                              useSrs: isSrsActive,
                            }
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
                    <div className="space-y-2">
                      {/* Manual Add Word */}
                      <button
                        type="button"
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('app:vocab-open-smart-add'));
                          setIsSettingsOpen(false);
                        }}
                        className="w-full px-3 py-2 text-xs font-extrabold text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/60 rounded-xl flex items-center gap-2 transition-colors cursor-pointer border border-amber-200/60 dark:border-amber-900/50"
                      >
                        <PlusCircle className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>Add Word</span>
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
                        <span>Download Vocabulary Sheet</span>
                      </button>

                      {/* Reset Active Deck Progress */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsSettingsOpen(false);
                          setShowResetConfirmModal(true);
                        }}
                        className="w-full px-3 py-2 text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-xl flex items-center gap-2 transition-colors cursor-pointer border border-rose-200/60 dark:border-rose-900/50 mt-1"
                      >
                        <RotateCcw className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        <span>Reset Progress</span>
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

      {/* User Confirmation Modal for Resetting Active Deck Progress */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-left">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/80 rounded-2xl shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Reset Active Deck Progress?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                  Confirm resetting active deck progress
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Are you sure you want to reset mastery scores and practice stats for all words in the active deck:
              <span className="block my-2 font-black text-blue-600 dark:text-blue-400 text-sm bg-blue-50 dark:bg-blue-950/60 p-2.5 rounded-xl border border-blue-200 dark:border-blue-900 text-center">
                "{activeSetName || 'Active Deck'}"
              </span>
              All word mastery percentages will be set back to 0%. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onResetActiveDeckMastery) {
                    onResetActiveDeckMastery();
                  }
                  setShowResetConfirmModal(false);
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Progress</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
