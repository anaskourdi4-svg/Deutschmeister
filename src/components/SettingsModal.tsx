import React, { useState, useMemo } from 'react';
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
  Sparkles,
  CheckCircle2,
  Layers,
  HardDrive
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  vocabSets: VocabSet[];
  activeSetId: string;
  onSelectVocabSet: (id: string) => void;
  onCreateVocabSet: (name: string, levelGroup?: string) => void;
  onRenameVocabSet: (id: string, newName: string) => void;
  onDeleteVocabSet: (id: string) => void;
  onBatchImportSets?: (sets: VocabSet[]) => void;
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

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
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

  const [importNotice, setImportNotice] = useState<string | null>(null);

  // Map each deck to its group
  const getDeckGroup = (set: VocabSet): string => {
    if (set.levelGroup) return set.levelGroup;
    const u = (set.name || '').toUpperCase();
    if (u.includes('A1')) return 'A1';
    if (u.includes('A2')) return 'A2';
    if (u.includes('B1')) return 'B1';
    if (u.includes('B2')) return 'B2';
    if (u.includes('C1')) return 'C1';
    return 'General';
  };

  // Filtered Decks based on Search
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
    const stats: Record<string, { deckCount: number; wordCount: number; decks: VocabSet[] }> = {};
    GROUPS_LIST.forEach(g => {
      stats[g.id] = { deckCount: 0, wordCount: 0, decks: [] };
    });

    vocabSets.forEach(set => {
      const grp = getDeckGroup(set);
      if (!stats[grp]) {
        stats[grp] = { deckCount: 0, wordCount: 0, decks: [] };
      }
      stats[grp].deckCount += 1;
      stats[grp].wordCount += (set.items ? set.items.length : 0);
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

  if (!isOpen) return null;

  const currentSet = vocabSets.find(s => s.id === activeSetId) || vocabSets[0];

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        let importedSetsArray: VocabSet[] = [];

        if (Array.isArray(parsed)) {
          importedSetsArray = parsed;
        } else if (parsed && typeof parsed === 'object' && parsed.items) {
          importedSetsArray = [parsed];
        }

        if (importedSetsArray.length > 0 && onBatchImportSets) {
          onBatchImportSets(importedSetsArray);
          const totalWordsCount = importedSetsArray.reduce((acc, curr) => acc + (curr.items?.length || 0), 0);
          setImportNotice(`Successfully imported ${importedSetsArray.length} deck(s) with ${totalWordsCount} words!`);
          setTimeout(() => setImportNotice(null), 5000);
        } else {
          alert('Invalid JSON structure. Ensure file contains deck objects.');
        }
      } catch (err) {
        alert('Failed to parse JSON file. Please check file format.');
      }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 animate-fade-in dir-ltr">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded-2xl">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Vocabulary Decks & Database</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {vocabSets.length} Decks
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Organized groups, instant search, and complete backup import/export
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Action Bar: Active Deck, Quick Search & Backup Controls */}
        <div className="pt-4 pb-3 space-y-3 shrink-0">
          
          {/* Active File Banner */}
          <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-blue-50/90 dark:from-blue-950/60 dark:via-indigo-950/50 dark:to-blue-950/60 border border-blue-200 dark:border-blue-800/80 p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-blue-600 text-white rounded-xl shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-extrabold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                  Active Practice Deck:
                </div>
                <div className="text-sm font-black text-slate-900 dark:text-white truncate">
                  {currentSet?.name || 'Default Deck'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-black bg-blue-600 text-white px-3 py-1 rounded-xl shadow-2xs">
                {currentSet?.items?.length || 0} words
              </span>
            </div>
          </div>

          {/* Search Bar & Import/Export Backup Row */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setDeckSubPage(1);
                }}
                placeholder="Search any deck name..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
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

            {/* Backup Action Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
              
              {/* Import Backup JSON */}
              <label className="flex-1 sm:flex-initial px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs">
                <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Import Backup</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* Export All Backup */}
              {onExportAllSets && (
                <button
                  onClick={onExportAllSets}
                  className="flex-1 sm:flex-initial px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export All</span>
                </button>
              )}
            </div>

          </div>

          {/* Import Success Banner */}
          {importNotice && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{importNotice}</span>
            </div>
          )}

        </div>

        {/* Dynamic Content Area: Main Screen (Groups) vs Sub-screen (Group Decks) vs Search Results */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">

          {/* SEARCH RESULTS MODE */}
          {searchQuery.trim() ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-black text-slate-700 dark:text-slate-300 px-1">
                <span>Search Results ({matchingSearchDecks.length} Decks found):</span>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Clear Search
                </button>
              </div>

              {matchingSearchDecks.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
                    No vocabulary decks match "{searchQuery}"
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {matchingSearchDecks.map(set => {
                    const isSelected = set.id === activeSetId;
                    const groupName = getDeckGroup(set);
                    const grpMeta = GROUPS_LIST.find(g => g.id === groupName) || GROUPS_LIST[0];

                    return (
                      <div
                        key={set.id}
                        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 dark:bg-blue-950/50 dark:border-blue-600'
                            : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div
                          onClick={() => onSelectVocabSet(set.id)}
                          className="flex-1 flex items-center gap-3 cursor-pointer min-w-0"
                        >
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-600'
                          }`}>
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                          </div>

                          <div className="min-w-0">
                            <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2 truncate">
                              <span className="truncate">{set.name}</span>
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border shrink-0 ${grpMeta.badgeClass}`}>
                                {grpMeta.name}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                              {set.items?.length || 0} German words
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleExportSingleDeck(set)}
                            title="Export single deck JSON"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg transition-colors cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : selectedGroup ? (
            
            /* SUB-SCREEN MODE: DECKS IN SELECTED GROUP */
            <div className="space-y-4 animate-fade-in">
              
              {/* Sub-screen Navigation Header */}
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => {
                    setSelectedGroup(null);
                    setDeckSubPage(1);
                  }}
                  className="px-3 py-1.5 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                >
                  <ArrowLeft className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Main Groups</span>
                </button>

                <div className="text-center">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{GROUPS_LIST.find(g => g.id === selectedGroup)?.name || selectedGroup} Decks</span>
                    <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 px-2 py-0.5 rounded-md">
                      {groupDecks.length} total
                    </span>
                  </h4>
                </div>

                <button
                  onClick={() => setIsCreating(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shadow-2xs transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">New Deck</span>
                </button>
              </div>

              {/* Inline Create Deck Input */}
              {isCreating && (
                <form onSubmit={handleCreateSubmit} className="flex gap-2 p-3 bg-blue-50/80 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-800 animate-fade-in">
                  <input
                    type="text"
                    required
                    autoFocus
                    value={newSetName}
                    onChange={e => setNewSetName(e.target.value)}
                    placeholder={`New ${selectedGroup} deck name (e.g., Kapitel 1 Words)`}
                    className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                </form>
              )}

              {/* Decks List (Paginated bounded at 12 decks per view) */}
              <div className="space-y-2">
                {currentSubPageDecks.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
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

                    return (
                      <div
                        key={set.id}
                        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 dark:bg-blue-950/50 dark:border-blue-600'
                            : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {isDeleting ? (
                          <div className="flex-1 flex items-center justify-between gap-2 bg-rose-50 dark:bg-rose-950/60 p-2 rounded-xl border border-rose-200 dark:border-rose-800 animate-fade-in">
                            <span className="text-xs font-extrabold text-rose-700 dark:text-rose-300">
                              Delete this vocabulary deck?
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
                              className="flex-1 px-2.5 py-1 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                              onClick={() => handleRenameSubmit(set.id)}
                              className="px-2.5 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingSetId(null)}
                              className="px-2 py-1 text-slate-500 text-xs font-bold cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <div
                              onClick={() => onSelectVocabSet(set.id)}
                              className="flex-1 flex items-center gap-3 cursor-pointer min-w-0"
                            >
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-600'
                              }`}>
                                {isSelected && <Check className="w-3.5 h-3.5" />}
                              </div>

                              <div className="min-w-0">
                                <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2 truncate">
                                  <span className="truncate">{set.name}</span>
                                  {isSelected && (
                                    <span className="text-[10px] font-extrabold bg-blue-600 text-white px-2 py-0.5 rounded-md shrink-0">
                                      Active
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                  {set.items?.length || 0} German words
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleExportSingleDeck(set)}
                                title="Export single deck JSON"
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg transition-colors cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => {
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

              {/* Bounded Sub-screen Pagination (12 decks/page) */}
              {totalSubPages > 1 && (
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    disabled={deckSubPage <= 1}
                    onClick={() => setDeckSubPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 disabled:opacity-40 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev</span>
                  </button>

                  <span className="text-xs font-black text-slate-600 dark:text-slate-300">
                    Page {deckSubPage} of {totalSubPages} ({DECKS_PER_PAGE} decks/page)
                  </span>

                  <button
                    disabled={deckSubPage >= totalSubPages}
                    onClick={() => setDeckSubPage(p => Math.min(totalSubPages, p + 1))}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 disabled:opacity-40 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

            </div>

          ) : (

            /* MAIN SCREEN MODE: MAIN GROUPS */
            <div className="space-y-4">
              
              <div className="flex items-center justify-between text-xs font-black text-slate-700 dark:text-slate-300 px-1">
                <span>Select Level Group / Collection:</span>
                <button
                  onClick={() => setIsCreating(true)}
                  className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-black"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Custom Deck</span>
                </button>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {GROUPS_LIST.map(grp => {
                  const stat = groupStats[grp.id] || { deckCount: 0, wordCount: 0 };

                  return (
                    <div
                      key={grp.id}
                      onClick={() => {
                        setSelectedGroup(grp.id);
                        setDeckSubPage(1);
                      }}
                      className="group p-4 bg-white dark:bg-slate-800/60 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 border border-slate-200 dark:border-slate-700/80 hover:border-blue-400 dark:hover:border-blue-600 rounded-2xl cursor-pointer transition-all duration-200 shadow-2xs hover:shadow-md flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className={`text-xs font-black px-2.5 py-1 rounded-xl border ${grp.badgeClass}`}>
                            {grp.id}
                          </span>
                          <span className="text-[11px] font-extrabold text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {stat.deckCount} {stat.deckCount === 1 ? 'Deck' : 'Decks'} →
                          </span>
                        </div>

                        <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">
                          {grp.name}
                        </h4>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
                        <span>Total Words:</span>
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

        {/* Footer */}
        <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
            Internal DB: {vocabSets.length} total decks saved
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white rounded-2xl text-xs font-black shadow-xs transition-all cursor-pointer"
          >
            Confirm & Close
          </button>
        </div>

      </div>
    </div>
  );
};
