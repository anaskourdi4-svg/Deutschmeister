import React, { useState } from 'react';
import { AppLanguage, VocabSet } from '../types';
import {
  Globe,
  FolderKanban,
  Check,
  Plus,
  Trash2,
  Edit3,
  Scissors,
  X,
  FileText
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appLanguage: AppLanguage;
  onChangeLanguage: (lang: AppLanguage) => void;
  vocabSets: VocabSet[];
  activeSetId: string;
  onSelectVocabSet: (id: string) => void;
  onCreateVocabSet: (name: string) => void;
  onRenameVocabSet: (id: string, newName: string) => void;
  onDeleteVocabSet: (id: string) => void;
  onSplitVocabSet: (id: string, chunkSize: number) => void;
}

const LANGUAGES: { id: AppLanguage; nameAr: string; nameNative: string; flag: string }[] = [
  { id: 'en', nameAr: 'English', nameNative: 'English', flag: '🇬🇧' },
  { id: 'de', nameAr: 'German', nameNative: 'Deutsch', flag: '🇩🇪' },
  { id: 'ar', nameAr: 'Arabic', nameNative: 'العربية', flag: '🇸🇦' },
  { id: 'es', nameAr: 'Spanish', nameNative: 'Español', flag: '🇪🇸' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  appLanguage,
  onChangeLanguage,
  vocabSets,
  activeSetId,
  onSelectVocabSet,
  onCreateVocabSet,
  onRenameVocabSet,
  onDeleteVocabSet,
  onSplitVocabSet,
}) => {
  const [activeTab, setActiveTab] = useState<'language' | 'files'>('files');
  const [newSetName, setNewSetName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const [splitChunkSize, setSplitChunkSize] = useState<number>(50);
  const [showSplitConfirm, setShowSplitConfirm] = useState(false);

  if (!isOpen) return null;

  const currentSet = vocabSets.find(s => s.id === activeSetId) || vocabSets[0];

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetName.trim()) return;
    onCreateVocabSet(newSetName.trim());
    setNewSetName('');
    setIsCreating(false);
  };

  const handleRenameSubmit = (id: string) => {
    if (!editingName.trim()) return;
    onRenameVocabSet(id, editingName.trim());
    setEditingSetId(null);
  };

  const handleSplitSubmit = () => {
    if (currentSet && currentSet.items.length > 1) {
      onSplitVocabSet(currentSet.id, splitChunkSize);
      setShowSplitConfirm(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in dir-ltr">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded-2xl">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Settings & Vocabulary Files
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Manage your vocabulary lists and app language
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

        {/* Tabs navigation inside settings */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('files')}
            className={`flex-1 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'files'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <FolderKanban className="w-4 h-4" />
            <span>Vocabulary Files ({vocabSets.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('language')}
            className={`flex-1 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'language'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Language</span>
          </button>
        </div>

        {/* TAB 1: VOCABULARY FILES MANAGEMENT */}
        {activeTab === 'files' && (
          <div className="space-y-4">
            
            {/* Active File Banner */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/60 dark:to-indigo-950/60 border border-blue-200 dark:border-blue-800 p-4 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-blue-700 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  <span>Currently Active File:</span>
                </span>
                <span className="text-[11px] font-black bg-blue-600 text-white px-2.5 py-0.5 rounded-full">
                  {currentSet?.items.length || 0} words
                </span>
              </div>

              <div className="text-lg font-black text-slate-900 dark:text-white">
                {currentSet?.name || 'Default'}
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400">
                All practice sessions, quizzes and exercises currently use words from this file.
              </p>
            </div>

            {/* List of Available Vocab Sets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-extrabold text-slate-700 dark:text-slate-300 px-1">
                <span>Select active vocabulary file:</span>
                <button
                  onClick={() => setIsCreating(true)}
                  className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-black"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New File</span>
                </button>
              </div>

              {/* Create new set inline input */}
              {isCreating && (
                <form onSubmit={handleCreateSubmit} className="flex gap-2 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <input
                    type="text"
                    required
                    autoFocus
                    value={newSetName}
                    onChange={e => setNewSetName(e.target.value)}
                    placeholder="New file name (e.g., A1 Verbs)"
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

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {vocabSets.map(set => {
                  const isSelected = set.id === activeSetId;
                  const isEditing = editingSetId === set.id;

                  return (
                    <div
                      key={set.id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 dark:bg-blue-950/40 dark:border-blue-600'
                          : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {isEditing ? (
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
                            className="flex-1 flex items-center gap-3 cursor-pointer"
                          >
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'border-slate-300 dark:border-slate-600'
                            }`}>
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                            </div>

                            <div>
                              <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <span>{set.name === 'تجريبي' ? 'Standard Vocab' : set.name}</span>
                                {set.name === 'تجريبي' && (
                                  <span className="text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 rounded-md">
                                    Default
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                {set.items.length} German words
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                setEditingSetId(set.id);
                                setEditingName(set.name);
                              }}
                              title="Edit name"
                              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {vocabSets.length > 1 && (
                              <button
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete "${set.name}"?`)) {
                                    onDeleteVocabSet(set.id);
                                  }
                                }}
                                title="Delete file"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Split Large Vocabulary List Feature */}
            {currentSet && currentSet.items.length > 20 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Scissors className="w-4 h-4 text-indigo-600" />
                      <span>Split into smaller subsets</span>
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Split large list into smaller subsets for easier practice.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowSplitConfirm(prev => !prev)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black cursor-pointer shrink-0"
                  >
                    Split File
                  </button>
                </div>

                {showSplitConfirm && (
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-2xl space-y-3">
                    <span className="text-xs font-extrabold text-indigo-900 dark:text-indigo-200 block">
                      Choose word count per chunk:
                    </span>
                    
                    <div className="flex gap-2">
                      {[25, 50, 100].map(size => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setSplitChunkSize(size)}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                            splitChunkSize === size
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {size} words
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-bold">
                        Will generate {Math.ceil(currentSet.items.length / splitChunkSize)} separate files.
                      </span>

                      <button
                        onClick={handleSplitSubmit}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black cursor-pointer"
                      >
                        Confirm Split
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* TAB 2: INTERFACE & EXPLANATION LANGUAGE */}
        {activeTab === 'language' && (
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Select interface language and preferences:
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {LANGUAGES.map(lang => {
                const isSelected = appLanguage === lang.id;

                return (
                  <button
                    key={lang.id}
                    onClick={() => onChangeLanguage(lang.id)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-500/20 dark:bg-blue-950/60 dark:border-blue-500'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{lang.flag}</span>
                      <div>
                        <div className="text-xs font-black text-slate-900 dark:text-white">
                          {lang.nameAr}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                          {lang.nameNative}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="p-1 bg-blue-600 text-white rounded-full">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Close */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
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
