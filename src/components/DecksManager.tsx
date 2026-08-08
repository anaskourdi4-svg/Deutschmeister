import React, { useState, useEffect, useMemo } from 'react';
import { VocabSet } from '../types';
import {
  FolderKanban,
  Check,
  Plus,
  Trash2,
  Edit3,
  X,
  FileText,
  Search,
  Upload,
  Download,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Info,
  CheckCircle2,
  Layers,
  AlertCircle,
} from 'lucide-react';

interface DecksManagerProps {
  vocabSets: VocabSet[];
  activeSetId: string;
  onSelectVocabSet: (id: string) => void;
  onCreateVocabSet: (name: string, levelGroup?: string) => void;
  onRenameVocabSet: (id: string, newName: string) => void;
  onDeleteVocabSet: (id: string) => void;
  onBatchImportSets?: (sets: VocabSet[], targetGroup?: string) => void;
  onExportAllSets?: () => void;
}

const GROUPS_LIST = [
  { id: 'A1', name: 'A1 German', color: 'emerald', badgeClass: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800' },
  { id: 'A2', name: 'A2 German', color: 'sky', badgeClass: 'bg-sky-100 text-sky-900 dark:bg-sky-950/80 dark:text-sky-200 border-sky-300 dark:border-sky-800' },
  { id: 'B1', name: 'B1 German', color: 'purple', badgeClass: 'bg-purple-100 text-purple-900 dark:bg-purple-950/80 dark:text-purple-200 border-purple-300 dark:border-purple-800' },
  { id: 'B2', name: 'B2 German', color: 'amber', badgeClass: 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border-amber-300 dark:border-amber-800' },
  { id: 'C1', name: 'C1 German', color: 'rose', badgeClass: 'bg-rose-100 text-rose-900 dark:bg-rose-950/80 dark:text-rose-200 border-rose-300 dark:border-rose-800' },
  { id: 'General', name: 'General & Custom', color: 'slate', badgeClass: 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700' },
];

const DECKS_PER_PAGE = 12;

export const DecksManager: React.FC<DecksManagerProps> = ({
  vocabSets,
  activeSetId,
  onSelectVocabSet,
  onCreateVocabSet,
  onRenameVocabSet,
  onDeleteVocabSet,
  onBatchImportSets,
  onExportAllSets,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [deckSubPage, setDeckSubPage] = useState(1);

  const [newSetName, setNewSetName] = useState('');
  const [newSetGroup, setNewSetGroup] = useState('A1');
  const [isCreating, setIsCreating] = useState(false);

  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deletingSetId, setDeletingSetId] = useState<string | null>(null);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showExportGroupModal, setShowExportGroupModal] = useState(false);

  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [showInfoHeader, setShowInfoHeader] = useState(false);
  const [stagedSetId, setStagedSetId] = useState<string>(activeSetId);

  useEffect(() => {
    setStagedSetId(activeSetId);
  }, [activeSetId]);

  const currentSet = vocabSets.find(s => s.id === activeSetId) || vocabSets[0];

  // Helper to calculate mastery percentage for a deck
  const calculateDeckMastery = (set: VocabSet): number => {
    if (!set.items || set.items.length === 0) return 0;
    const total = set.items.reduce((acc, item) => acc + (item.masteryScore ?? 0), 0);
    return Math.round(total / set.items.length);
  };

  // Map each deck to its group
  const getDeckGroup = (set: VocabSet): string => {
    if (set.levelGroup && GROUPS_LIST.some(g => g.id === set.levelGroup)) {
      return set.levelGroup;
    }
    const u = (set.name || '').toUpperCase();
    if (u.includes('A2')) return 'A2';
    if (u.includes('B1')) return 'B1';
    if (u.includes('B2')) return 'B2';
    if (u.includes('C1')) return 'C1';
    if (u.includes('A1')) return 'A1';
    if (set.items && set.items.length > 0) {
      const lvl = set.items.find(i => i.level && ['A1', 'A2', 'B1', 'B2', 'C1'].includes(i.level))?.level;
      if (lvl) return lvl;
    }
    return 'General';
  };

  // Filtered Decks based on Search
  const totalDatabaseWords = useMemo(() => {
    return vocabSets.reduce((acc, curr) => acc + (curr.items?.length || 0), 0);
  }, [vocabSets]);

  const matchingSearchDecks = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return vocabSets.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.description && s.description.toLowerCase().includes(q)) ||
      getDeckGroup(s).toLowerCase().includes(q)
    );
  }, [vocabSets, searchQuery]);

  // Grouped Decks Count & Word Stats for Main Group Screen
  const groupStats = useMemo(() => {
    const stats: Record<string, { deckCount: number; wordCount: number; totalMasterySum: number; decks: VocabSet[] }> = {};
    GROUPS_LIST.forEach(g => {
      stats[g.id] = { deckCount: 0, wordCount: 0, totalMasterySum: 0, decks: [] };
    });

    vocabSets.forEach(set => {
      const grp = getDeckGroup(set);
      if (!stats[grp]) {
        stats[grp] = { deckCount: 0, wordCount: 0, totalMasterySum: 0, decks: [] };
      }
      const deckWords = set.items ? set.items.length : 0;
      const deckMastery = calculateDeckMastery(set);
      
      stats[grp].deckCount += 1;
      stats[grp].wordCount += deckWords;
      stats[grp].totalMasterySum += (deckMastery * (deckWords || 1));
      stats[grp].decks.push(set);
    });

    return stats;
  }, [vocabSets]);

  // Current Group Decks (Sub-screen view)
  const groupDecks = useMemo(() => {
    if (!selectedGroup) return [];
    return (groupStats[selectedGroup]?.decks || []);
  }, [groupStats, selectedGroup]);

  // Sub-screen pagination
  const totalSubPages = Math.ceil(groupDecks.length / DECKS_PER_PAGE) || 1;
  const currentSubPageDecks = useMemo(() => {
    const safeP = Math.min(deckSubPage, totalSubPages);
    const start = (safeP - 1) * DECKS_PER_PAGE;
    return groupDecks.slice(start, start + DECKS_PER_PAGE);
  }, [groupDecks, deckSubPage, totalSubPages]);

  // Group stats calculation
  const currentGroupMeta = GROUPS_LIST.find(g => g.id === selectedGroup);
  const selectedGroupStat = selectedGroup ? groupStats[selectedGroup] : null;
  const groupTotalWords = selectedGroupStat?.wordCount || 0;
  const groupAverageMastery = selectedGroupStat && selectedGroupStat.wordCount > 0
    ? Math.round(selectedGroupStat.totalMasterySum / selectedGroupStat.wordCount)
    : 0;

  const DEFAULT_CEFR_GROUPS = ['A1', 'A2', 'B1', 'B2', 'C1', 'General'];
  const isCustomGroup = selectedGroup ? !DEFAULT_CEFR_GROUPS.includes(selectedGroup) : false;

  // Handlers
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetName.trim()) return;
    const targetGroup = selectedGroup || newSetGroup || 'A1';
    onCreateVocabSet(newSetName.trim(), targetGroup);
    setNewSetName('');
    setIsCreating(false);
  };

  const handleRenameSubmit = (id: string) => {
    if (!editingName.trim()) return;
    onRenameVocabSet(id, editingName.trim());
    setEditingSetId(null);
  };

  const handleExportSingleDeck = (set: VocabSet) => {
    const jsonStr = JSON.stringify(set, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deck_${set.name.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportGroupSets = () => {
    if (!selectedGroup) return;
    const groupDecksList = vocabSets.filter(s => getDeckGroup(s) === selectedGroup);
    if (groupDecksList.length === 0) return;
    const jsonStr = JSON.stringify(groupDecksList, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `German_Vocab_${selectedGroup}_Group_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        let importedSetsArray: VocabSet[] = [];

        if (Array.isArray(parsed)) {
          if (parsed.length > 0 && (parsed[0].word || parsed[0].german || parsed[0].term)) {
            // It's an array of raw vocab items!
            const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
            importedSetsArray = [{
              id: `deck_imported_${Date.now()}`,
              name: cleanName || 'Imported Vocabulary Deck',
              levelGroup: selectedGroup || 'General',
              createdAt: new Date().toISOString(),
              items: parsed,
            }];
          } else {
            importedSetsArray = parsed;
          }
        } else if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.vocabSets)) {
            importedSetsArray = parsed.vocabSets;
          } else if (Array.isArray(parsed.decks)) {
            importedSetsArray = parsed.decks;
          } else if (Array.isArray(parsed.sets)) {
            importedSetsArray = parsed.sets;
          } else if (parsed.items || parsed.words || parsed.vocabList) {
            importedSetsArray = [parsed];
          } else if (parsed.word || parsed.german) {
            const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
            importedSetsArray = [{
              id: `deck_imported_${Date.now()}`,
              name: cleanName || 'Imported Vocabulary Deck',
              levelGroup: selectedGroup || 'General',
              createdAt: new Date().toISOString(),
              items: [parsed],
            }];
          }
        }

        if (importedSetsArray.length > 0 && onBatchImportSets) {
          onBatchImportSets(importedSetsArray, selectedGroup || undefined);
          const totalWordsCount = importedSetsArray.reduce((acc, curr) => {
            const list = curr.items || (curr as any).words || (curr as any).vocabList || [];
            return acc + list.length;
          }, 0);
          setImportNotice(`Successfully imported ${importedSetsArray.length} deck(s) with ${totalWordsCount} words!`);
          setTimeout(() => setImportNotice(null), 5000);
        } else {
          alert('Invalid JSON structure. Ensure file contains deck objects or a word list.');
        }
      } catch (err) {
        alert('Failed to parse JSON file. Please check file format.');
      }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Title & Decks Badge + (i) button on opposite side */}
          <div className="flex items-center justify-between w-full lg:w-auto gap-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded-2xl shrink-0">
                <FolderKanban className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    Decks & Database
                  </h2>
                  
                  {/* Decks Badge */}
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                    {vocabSets.length} Decks
                  </span>
                </div>
              </div>
            </div>

            {/* Info (i) icon on the opposite far right side */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowInfoHeader(prev => !prev)}
                className={`p-1.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                  showInfoHeader
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
                title="Vocabulary Database Information"
              >
                <Info className="w-4 h-4 text-blue-500 shrink-0" />
              </button>

              {showInfoHeader && (
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 max-w-[calc(100vw-2.5rem)] p-4 bg-slate-900 text-white dark:bg-slate-800 rounded-2xl shadow-2xl text-xs z-50 space-y-2 animate-fade-in border border-slate-700 origin-top-right">
                  <div className="font-black text-blue-300 flex items-center gap-1.5 border-b border-slate-700 pb-1.5">
                    <Info className="w-4 h-4 text-blue-400" />
                    <span>Database Features & Backup Info</span>
                  </div>
                  <p className="font-medium text-slate-300 leading-relaxed">
                    Organized by level groups (A1, A2, B1, etc.). Select any deck to practice instantly or create custom collections.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Following: Active Practice Deck Indicator Box */}
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 dark:from-blue-950/60 dark:via-indigo-950/50 dark:to-blue-950/60 border border-blue-200 dark:border-blue-800/80 px-3.5 py-2 rounded-2xl flex items-center justify-between gap-3 shadow-2xs min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 bg-blue-600 text-white rounded-lg shrink-0">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] font-extrabold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                  Active Practice Deck:
                </div>
                <div className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[140px] sm:max-w-[180px]">
                  {currentSet?.name || 'Default Deck'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-extrabold bg-blue-600 text-white px-2 py-0.5 rounded-lg">
                {currentSet?.items?.length || 0} words
              </span>
              <span className="text-[11px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-lg border border-emerald-300 dark:border-emerald-800">
                {calculateDeckMastery(currentSet)}%
              </span>
            </div>
          </div>

        </div>

        {/* Divider line before Search Bar */}
        <div className="border-t border-slate-100 dark:border-slate-800 my-3.5" />

        {/* Search Input Box Only */}
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setDeckSubPage(1);
            }}
            placeholder="Search any deck name..."
            className="w-full pl-9 pr-8 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Import Notification Banner */}
        {importNotice && (
          <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{importNotice}</span>
          </div>
        )}

      </div>

      {/* Export Confirmation Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-2xl">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Export Vocabulary Backup</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Confirm backup file generation</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              You are about to export a complete JSON backup containing <strong className="text-slate-900 dark:text-white font-extrabold">{vocabSets.length} decks</strong> and <strong className="text-slate-900 dark:text-white font-extrabold">{totalDatabaseWords} words</strong>.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onExportAllSets) onExportAllSets();
                  setShowExportModal(false);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Confirm & Download Backup</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Screen vs Sub-Screen vs Search */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs">
        
        {/* SEARCH RESULTS MODE */}
        {searchQuery.trim() ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-black text-slate-700 dark:text-slate-300">
              <span>Search Results ({matchingSearchDecks.length} Decks found):</span>
              <button
                onClick={() => setSearchQuery('')}
                className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Clear Search
              </button>
            </div>

            {matchingSearchDecks.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <p className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
                  No vocabulary decks match "{searchQuery}"
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {matchingSearchDecks.map(set => {
                    const isStaged = set.id === stagedSetId;
                    const isCurrentlyActive = set.id === activeSetId;
                    const groupName = getDeckGroup(set);
                    const grpMeta = GROUPS_LIST.find(g => g.id === groupName) || GROUPS_LIST[0];
                    const masteryPct = calculateDeckMastery(set);

                    return (
                      <div
                        key={set.id}
                        onClick={() => setStagedSetId(set.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isStaged
                            ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 dark:bg-blue-950/50 dark:border-blue-600 shadow-xs'
                            : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex-1 flex items-center gap-3 min-w-0">
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                            isStaged ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700'
                          }`}>
                            {isStaged && <Check className="w-3.5 h-3.5" />}
                          </div>

                          <div className="min-w-0">
                            <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2 truncate">
                              <span className="truncate">{set.name}</span>
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border shrink-0 ${grpMeta.badgeClass}`}>
                                {grpMeta.name}
                              </span>
                              {isCurrentlyActive && (
                                <span className="text-[10px] font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded-md shrink-0">
                                  Active
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                {set.items?.length || 0} words
                              </span>
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                {masteryPct}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Single Confirm Button at the End of Search Results List */}
                <div className="flex justify-end pt-4 pb-1 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      if (stagedSetId) {
                        onSelectVocabSet(stagedSetId);
                      }
                    }}
                    disabled={!stagedSetId}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition-all border shadow-2xs ${
                      activeSetId === stagedSetId
                        ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 cursor-default'
                        : 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Check className={`w-4 h-4 ${activeSetId === stagedSetId ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`} />
                    <span>
                      {activeSetId === stagedSetId ? 'Confirmed' : 'Confirm'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : selectedGroup ? (
          
          /* SUB-SCREEN MODE: DECKS IN SELECTED GROUP */
          <div className="space-y-5 animate-fade-in">
            
            {/* Harmonious Sub-screen Header Card */}
            <div className="bg-gradient-to-r from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-800/80 dark:via-blue-950/20 dark:to-slate-800/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              
              {/* Line 1: Back arrow ONLY */}
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGroup(null);
                    setDeckSubPage(1);
                    setIsDeletingGroup(false);
                  }}
                  className="p-2 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-xl cursor-pointer shadow-2xs transition-all shrink-0 inline-flex items-center justify-center"
                  title="Back to Main Groups"
                >
                  <ArrowLeft className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </button>
              </div>

              {/* Line 2: Group Name */}
              <div className="flex items-center gap-2.5">
                <span className={`text-xs font-black px-2.5 py-1 rounded-lg border ${currentGroupMeta?.badgeClass}`}>
                  {selectedGroup}
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {currentGroupMeta?.name || selectedGroup} Decks
                </h3>
              </div>

              {/* Line 3: Decks count, total words, mastery */}
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                <span>{groupDecks.length} Decks</span>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span>{groupTotalWords} Total Words</span>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{groupAverageMastery}% Mastery</span>
              </div>

              {/* Line 4: Divider line */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-3" />

              {/* Line 5: Actions Layout: Import & Export side-by-side, New Deck underneath */}
              <div className="space-y-2.5">
                
                {/* Row 1: Import Backup & Export Group side-by-side */}
                <div className="flex items-center gap-2">
                  <label className="flex-1 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Import Backup</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowExportGroupModal(true)}
                    className="flex-1 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                    title={`Export all decks in ${selectedGroup}`}
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Export Group</span>
                  </button>
                </div>

                {/* Row 2: New Deck button underneath (+ Delete Group if custom non-default group) */}
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreating(true)}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Deck</span>
                  </button>

                  {/* Delete Group - only for custom user-created groups */}
                  {isCustomGroup && groupDecks.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsDeletingGroup(true)}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:hover:bg-rose-900 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
                      title={`Delete all decks in ${selectedGroup}`}
                    >
                      <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      <span>Delete Group</span>
                    </button>
                  )}
                </div>

              </div>

            </div>

            {/* Export Group Confirmation Modal */}
            {showExportGroupModal && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-2xl">
                      <Download className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">Export {selectedGroup} Group Backup</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Confirm backup file download</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    You are about to export a backup containing <strong className="text-slate-900 dark:text-white font-extrabold">{groupDecks.length} decks</strong> and <strong className="text-slate-900 dark:text-white font-extrabold">{groupTotalWords} words</strong> in group <strong className="text-blue-600 dark:text-blue-400 font-extrabold">{selectedGroup}</strong>.
                  </p>

                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowExportGroupModal(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleExportGroupSets();
                        setShowExportGroupModal(false);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Confirm & Download</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Delete Entire Group Confirmation Modal */}
            {isDeletingGroup && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-2xl">
                      <Trash2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">Delete Group "{selectedGroup}"?</h3>
                      <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5 font-bold">{groupDecks.length} decks will be removed</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    This action will permanently remove all <strong className="text-slate-900 dark:text-white font-extrabold">{groupDecks.length} vocabulary decks</strong> and their <strong className="text-slate-900 dark:text-white font-extrabold">{groupTotalWords} words</strong> in group <strong className="text-slate-900 dark:text-white font-extrabold">{selectedGroup}</strong>.
                  </p>

                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsDeletingGroup(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        groupDecks.forEach(deck => onDeleteVocabSet(deck.id));
                        setIsDeletingGroup(false);
                        setSelectedGroup(null);
                      }}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Confirm & Delete All</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Inline Create Deck */}
            {isCreating && (
              <form onSubmit={handleCreateSubmit} className="flex gap-2 p-3 bg-blue-50/80 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-800 animate-fade-in">
                <input
                  type="text"
                  required
                  autoFocus
                  value={newSetName}
                  onChange={e => setNewSetName(e.target.value)}
                  placeholder={`New ${selectedGroup} deck name (e.g., Kapitel 1 Words)`}
                  className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </form>
            )}

            {/* Bounded Decks Grid (12 decks per page max) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentSubPageDecks.length === 0 ? (
                <div className="col-span-full text-center py-12 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
                    No decks in {selectedGroup} group yet.
                  </p>
                  <button
                    onClick={() => setIsCreating(true)}
                    className="mt-3 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl cursor-pointer shadow-2xs"
                  >
                    Create First {selectedGroup} Deck
                  </button>
                </div>
              ) : (
                currentSubPageDecks.map(set => {
                  const isSelected = set.id === activeSetId;
                  const isEditing = editingSetId === set.id;
                  const isDeleting = deletingSetId === set.id;
                  const masteryPct = calculateDeckMastery(set);

                  return (
                    <div
                      key={set.id}
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 dark:bg-blue-950/50 dark:border-blue-600'
                          : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {isDeleting ? (
                        <div className="flex-1 flex items-center justify-between gap-2 bg-rose-50 dark:bg-rose-950/60 p-2.5 rounded-xl border border-rose-200 dark:border-rose-800 animate-fade-in">
                          <span className="text-xs font-extrabold text-rose-700 dark:text-rose-300">
                            Delete this deck?
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteVocabSet(set.id);
                                setDeletingSetId(null);
                              }}
                              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-black cursor-pointer shadow-xs"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingSetId(null)}
                              className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : isEditing ? (
                        <div className="flex-1 flex gap-2">
                          <input
                            type="text"
                            value={editingName}
                            onChange={e => setEditingName(e.target.value)}
                            className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => handleRenameSubmit(set.id)}
                            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingSetId(null)}
                            className="px-2 py-1.5 text-slate-500 text-xs font-bold cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <div
                            onClick={() => setStagedSetId(set.id)}
                            className="flex-1 flex items-center gap-3 cursor-pointer min-w-0"
                          >
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                              set.id === stagedSetId ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700'
                            }`}>
                              {set.id === stagedSetId && <Check className="w-3.5 h-3.5" />}
                            </div>

                            <div className="min-w-0">
                              <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2 truncate">
                                <span className="truncate">{set.name}</span>
                                {set.id === activeSetId && (
                                  <span className="text-[10px] font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded-md shrink-0">
                                    Active
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                  {set.items?.length || 0} German words
                                </span>
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                  {masteryPct}%
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingSetId(set.id);
                                setEditingName(set.name);
                                setDeletingSetId(null);
                              }}
                              title="Edit name"
                              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingSetId(set.id);
                                setEditingSetId(null);
                              }}
                              title="Delete deck"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination Controls */}
            {totalSubPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  disabled={deckSubPage <= 1}
                  onClick={() => setDeckSubPage(p => Math.max(1, p - 1))}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 disabled:opacity-40 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Prev</span>
                </button>

                <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                  Page {deckSubPage} of {totalSubPages} ({DECKS_PER_PAGE} decks/page)
                </span>

                <button
                  disabled={deckSubPage >= totalSubPages}
                  onClick={() => setDeckSubPage(p => Math.min(totalSubPages, p + 1))}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 disabled:opacity-40 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Confirm Selection Button at the End of Sub-screen Deck List */}
            {groupDecks.length > 0 && (
              <div className="flex justify-end pt-5 pb-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    if (stagedSetId) {
                      onSelectVocabSet(stagedSetId);
                    }
                  }}
                  disabled={!stagedSetId}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition-all border shadow-2xs ${
                    activeSetId === stagedSetId
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 cursor-default'
                      : 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <Check className={`w-4 h-4 ${activeSetId === stagedSetId ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`} />
                  <span>
                    {activeSetId === stagedSetId ? 'Confirmed' : 'Confirm'}
                  </span>
                </button>
              </div>
            )}

          </div>

        ) : (

          /* MAIN SCREEN MODE: MAIN GROUPS */
          <div className="space-y-4">
            
            <div className="flex items-center justify-between text-xs font-black text-slate-700 dark:text-slate-300 px-1">
              <span>Select Level Group / Collection:</span>
            </div>

            {/* Inline Create Deck Input */}
            {isCreating && (
              <form onSubmit={handleCreateSubmit} className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 animate-fade-in">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    required
                    autoFocus
                    value={newSetName}
                    onChange={e => setNewSetName(e.target.value)}
                    placeholder="New deck name (e.g., A1 Verbs & Articles)"
                    className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  <select
                    value={newSetGroup}
                    onChange={e => setNewSetGroup(e.target.value)}
                    className="px-3 py-2 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  >
                    {GROUPS_LIST.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-3 py-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-2xs"
                  >
                    Save Deck
                  </button>
                </div>
              </form>
            )}

            {/* Main Group Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {GROUPS_LIST.map(grp => {
                const stat = groupStats[grp.id] || { deckCount: 0, wordCount: 0, totalMasterySum: 0 };
                const groupMastery = stat.wordCount > 0 ? Math.round(stat.totalMasterySum / stat.wordCount) : 0;

                return (
                  <div
                    key={grp.id}
                    onClick={() => {
                      setSelectedGroup(grp.id);
                      setDeckSubPage(1);
                    }}
                    className="group p-5 bg-white dark:bg-slate-800/60 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 border border-slate-200 dark:border-slate-700/80 hover:border-blue-400 dark:hover:border-blue-600 rounded-2xl cursor-pointer transition-all duration-200 shadow-2xs hover:shadow-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className={`text-xs font-black px-2.5 py-1 rounded-xl border ${grp.badgeClass}`}>
                          {grp.id}
                        </span>
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                          {groupMastery}%
                        </span>
                      </div>

                      <h4 className="text-base font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">
                        {grp.name}
                      </h4>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
                      <span>{stat.deckCount} {stat.deckCount === 1 ? 'Deck' : 'Decks'}</span>
                      <span className="font-black text-slate-800 dark:text-slate-200">
                        {stat.wordCount} words
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

        )}

      </div>

    </div>
  );
};
