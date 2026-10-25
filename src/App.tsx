import React, { useState, useEffect } from 'react';
import { CheckCircle2, Layers, CloudCheck, FolderKanban, PlusCircle } from 'lucide-react';
import { User } from 'firebase/auth';
import { VocabItem, ActiveTab, VocabSet, QuizQuestionSettings, DEFAULT_QUIZ_SETTINGS, getVocabItemKey } from './types';
import { INITIAL_A1_VOCAB } from './data/defaultA1Vocab';
import { Header } from './components/Header';
import { FlashcardQuiz } from './components/FlashcardQuiz';
import { VocabManager } from './components/VocabManager';
import { TrainingStats } from './components/TrainingStats';
import { DecksManager } from './components/DecksManager';
import { SettingsManager } from './components/SettingsManager';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { SyncNotificationToast } from './components/SyncNotificationToast';
import { useAutoSync } from './hooks/useAutoSync';
import {
  initGoogleAuth,
  getSavedLinkedSheet,
  LinkedSpreadsheetInfo,
} from './services/googleSheets';

// Guest mode storage keys (local browser cache)
const GUEST_SETS_KEY = 'deutsch_meister_guest_vocab_sets_v4';
const GUEST_ACTIVE_SET_KEY = 'deutsch_meister_guest_active_set_v4';
const LEGACY_SETS_KEY = 'deutsch_meister_vocab_sets_v3';
const LEGACY_ACTIVE_KEY = 'deutsch_meister_active_set_v3';

// Google Drive storage keys (per-spreadsheet isolated cache)
const DRIVE_CACHE_PREFIX = 'deutsch_meister_drive_sets_';
const DRIVE_ACTIVE_PREFIX = 'deutsch_meister_drive_active_';

const ACTIVE_TAB_KEY = 'deutsch_meister_active_tab_v2';
const QUIZ_SETTINGS_KEY = 'deutsch_meister_quiz_settings_v1';

// Helper to ensure valid vocabulary items are retained
const isValidVocabItem = (item: VocabItem) => {
  return Boolean(item && item.word && item.word.trim());
};

const filterValidVocabItems = (sets: VocabSet[]): VocabSet[] => {
  return sets.map(s => ({
    ...s,
    items: (s.items || []).filter(isValidVocabItem)
  }));
};

const DEFAULT_DEMO_SETS: VocabSet[] = [
  {
    id: 'set_a1_demo',
    name: 'A1 Essential Vocab',
    levelGroup: 'A1',
    description: 'Core A1 German vocabulary with articles and plural forms',
    createdAt: new Date().toISOString(),
    items: INITIAL_A1_VOCAB.filter(isValidVocabItem),
  },
  {
    id: 'set_a2_demo',
    name: 'A2 Daily Phrases',
    levelGroup: 'A2',
    description: 'Everyday conversations and A2 German vocabulary',
    createdAt: new Date().toISOString(),
    items: [],
  },
  {
    id: 'set_b1_demo',
    name: 'B1 Intermediate Words',
    levelGroup: 'B1',
    description: 'B1 level German vocabulary and conjugations',
    createdAt: new Date().toISOString(),
    items: [],
  },
  {
    id: 'set_general_demo',
    name: 'General & Custom Deck',
    levelGroup: 'General',
    description: 'Custom vocabulary collection',
    createdAt: new Date().toISOString(),
    items: [],
  },
];

// Guest Cache Loaders
const loadGuestSets = (): VocabSet[] => {
  try {
    const saved = localStorage.getItem(GUEST_SETS_KEY) || localStorage.getItem(LEGACY_SETS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const filtered = filterValidVocabItems(parsed).filter(
          s => s.id !== 'set_validation_demo' && s.levelGroup !== 'Validation'
        );
        if (filtered.length > 0) return filtered;
      }
    }
  } catch (e) {
    console.warn('Failed to load guest sets:', e);
  }
  return DEFAULT_DEMO_SETS;
};

const loadGuestActiveSetId = (): string => {
  try {
    const saved = localStorage.getItem(GUEST_ACTIVE_SET_KEY) || localStorage.getItem(LEGACY_ACTIVE_KEY);
    if (saved) return saved;
  } catch (e) {}
  return DEFAULT_DEMO_SETS[0].id;
};

// Drive Cache Loader
const loadDriveSets = (spreadsheetId: string): VocabSet[] => {
  try {
    const saved = localStorage.getItem(DRIVE_CACHE_PREFIX + spreadsheetId);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return filterValidVocabItems(parsed);
      }
    }
  } catch (e) {
    console.warn('Failed to load drive sets for sheet:', spreadsheetId, e);
  }
  return [];
};

export default function App() {
  // Persist activeTab so syncing or reloading never unexpectedly forces user back to quiz
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    try {
      const savedTab = localStorage.getItem(ACTIVE_TAB_KEY);
      if (savedTab && ['quiz', 'vocab', 'decks', 'stats', 'settings'].includes(savedTab)) {
        return savedTab as ActiveTab;
      }
    } catch (e) {
      console.warn('Failed to load active tab:', e);
    }
    return 'quiz';
  });

  // Save activeTab to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_TAB_KEY, activeTab);
    } catch (e) {
      console.warn('Failed to save active tab:', e);
    }
  }, [activeTab]);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Authentication & Linked Sheet State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [linkedSheet, setLinkedSheet] = useState<LinkedSpreadsheetInfo | null>(() => getSavedLinkedSheet());

  // Vocab Sets state - starts with guest sets by default
  const [vocabSets, setVocabSets] = useState<VocabSet[]>(() => loadGuestSets());

  // Active Set ID state
  const [activeSetId, setActiveSetId] = useState<string>(() => loadGuestActiveSetId());

  // Quiz Question Settings state
  const [quizSettings, setQuizSettings] = useState<QuizQuestionSettings>(() => {
    try {
      const saved = localStorage.getItem(QUIZ_SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            ...DEFAULT_QUIZ_SETTINGS,
            ...parsed,
            nouns: { ...DEFAULT_QUIZ_SETTINGS.nouns, ...parsed.nouns },
            verbs: { ...DEFAULT_QUIZ_SETTINGS.verbs, ...parsed.verbs },
            adjectives: { ...DEFAULT_QUIZ_SETTINGS.adjectives, ...parsed.adjectives },
            expressions: { ...DEFAULT_QUIZ_SETTINGS.expressions, ...parsed.expressions },
            others: { ...DEFAULT_QUIZ_SETTINGS.others, ...parsed.others },
            cardOptions: { ...DEFAULT_QUIZ_SETTINGS.cardOptions, ...parsed.cardOptions },
          };
        }
      }
    } catch (e) {
      console.warn('Failed to load quiz settings:', e);
    }
    return DEFAULT_QUIZ_SETTINGS;
  });

  // Save quizSettings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(QUIZ_SETTINGS_KEY, JSON.stringify(quizSettings));
    } catch (e) {
      console.warn('Failed to save quiz settings:', e);
    }
  }, [quizSettings]);

  // 1. Listen for Google Auth state changes to isolate Guest vs Personal Account (Drive) modes
  useEffect(() => {
    const unsub = initGoogleAuth(
      (user) => {
        setCurrentUser(user);
        const sheet = getSavedLinkedSheet(user.uid);
        setLinkedSheet(sheet);
        if (sheet) {
          const driveSets = loadDriveSets(sheet.spreadsheetId);
          if (driveSets.length > 0) {
            setVocabSets(driveSets);
            const savedDriveActive = localStorage.getItem(DRIVE_ACTIVE_PREFIX + sheet.spreadsheetId);
            if (savedDriveActive && driveSets.some(s => s.id === savedDriveActive)) {
              setActiveSetId(savedDriveActive);
            } else {
              setActiveSetId(driveSets[0].id);
            }
          } else {
            // Personal account with linked sheet: adopt empty set until remote pull completes
            setVocabSets([]);
          }
        } else {
          // Logged into Google account, but no sheet linked yet:
          // Strictly isolate from guest cache - show empty Drive state
          setVocabSets([]);
        }
      },
      () => {
        // Guest mode (unauthenticated) - load guest browser cache
        setCurrentUser(null);
        setLinkedSheet(null);
        const guestSets = loadGuestSets();
        setVocabSets(guestSets);
        setActiveSetId(loadGuestActiveSetId());
      }
    );
    return () => unsub();
  }, []);

  // 2. Listen for auth-mode-changed event (from DecksManager or logout)
  useEffect(() => {
    const handleAuthModeChanged = (e: Event) => {
      const ce = e as CustomEvent<{ mode: string; spreadsheetId?: string }>;
      if (!ce.detail) return;
      if (ce.detail.mode === 'guest') {
        setCurrentUser(null);
        setLinkedSheet(null);
        const guestSets = loadGuestSets();
        setVocabSets(guestSets);
        setActiveSetId(loadGuestActiveSetId());
      } else if (ce.detail.mode === 'drive' && ce.detail.spreadsheetId) {
        const sheet = getSavedLinkedSheet(currentUser?.uid);
        setLinkedSheet(sheet);
        const cached = loadDriveSets(ce.detail.spreadsheetId);
        if (cached.length > 0) {
          setVocabSets(cached);
          setActiveSetId(cached[0].id);
        }
      } else if (ce.detail.mode === 'drive_unlinked') {
        setLinkedSheet(null);
        setVocabSets([]);
      }
    };
    window.addEventListener('app:auth-mode-changed', handleAuthModeChanged);
    return () => window.removeEventListener('app:auth-mode-changed', handleAuthModeChanged);
  }, [currentUser]);

  // 3. Save vocabSets and activeSetId to the appropriate storage scope (Guest vs Drive)
  useEffect(() => {
    try {
      if (!currentUser) {
        // Guest mode: save to guest localStorage cache
        localStorage.setItem(GUEST_SETS_KEY, JSON.stringify(vocabSets));
        localStorage.setItem(GUEST_ACTIVE_SET_KEY, activeSetId);
      } else if (linkedSheet) {
        // Personal Account mode: save exclusively to drive spreadsheet cache
        localStorage.setItem(DRIVE_CACHE_PREFIX + linkedSheet.spreadsheetId, JSON.stringify(vocabSets));
        localStorage.setItem(DRIVE_ACTIVE_PREFIX + linkedSheet.spreadsheetId, activeSetId);
      }
    } catch (e) {
      console.warn('Failed to save vocab sets:', e);
    }
  }, [vocabSets, activeSetId, currentUser, linkedSheet]);

  // Ensure currentSet has a safe fallback even if vocabSets is empty
  const currentSet: VocabSet =
    vocabSets.find(s => s.id === activeSetId) ||
    vocabSets[0] || {
      id: 'empty_deck',
      name: currentUser ? (linkedSheet ? linkedSheet.spreadsheetTitle : 'لا توجد حزم مربوطة') : 'حزمة المفردات',
      levelGroup: 'General',
      createdAt: new Date().toISOString(),
      items: [],
    };
  const vocabList = (currentSet.items || []).filter(isValidVocabItem);

  // Update items of active set
  const updateCurrentSetItems = (updater: (prevItems: VocabItem[]) => VocabItem[]) => {
    setVocabSets(prevSets =>
      prevSets.map(set => {
        if (set.id === currentSet.id) {
          return {
            ...set,
            items: updater(set.items || []).filter(isValidVocabItem),
          };
        }
        return set;
      })
    );
  };

  // Update mastery for a specific item
  const handleUpdateVocabMastery = (
    id: string,
    delta: number,
    opts?: { isNewAttempt?: boolean; correctDelta?: number; resetReviewErrors?: boolean }
  ) => {
    updateCurrentSetItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          const newScore = Math.min(100, Math.max(0, item.masteryScore + delta));
          const isNew = opts?.isNewAttempt ?? true;
          const corrDelta = opts?.correctDelta ?? (delta > 0 ? 1 : 0);
          const resetErrors = opts?.resetReviewErrors ?? false;

          const newAttempts = isNew ? item.attemptsCount + 1 : item.attemptsCount;
          const newCorrect = resetErrors
            ? newAttempts
            : Math.max(0, item.correctCount + corrDelta);

          return {
            ...item,
            masteryScore: newScore,
            attemptsCount: newAttempts,
            correctCount: newCorrect,
            lastPracticed: new Date().toISOString(),
          };
        }
        return item;
      })
    );
  };

  // Add new items to active set
  const handleAddVocabItems = (newItems: VocabItem[]) => {
    const validItems = newItems.filter(isValidVocabItem);
    updateCurrentSetItems(prev => {
      const existingKeys = new Set(prev.map(p => getVocabItemKey(p)));
      const filteredNew = validItems.filter(item => !existingKeys.has(getVocabItemKey(item)));
      return [...filteredNew, ...prev];
    });
  };

  // Delete an item from active set
  const handleDeleteVocabItem = (id: string) => {
    updateCurrentSetItems(prev => prev.filter(item => item.id !== id));
  };

  // Update an existing item in active set
  const handleUpdateVocabItem = (updatedItem: VocabItem) => {
    updateCurrentSetItems(prev =>
      prev.map(item => (item.id === updatedItem.id ? updatedItem : item))
    );
  };

  // Delete multiple items from active set
  const handleDeleteMultipleVocabItems = (ids: string[]) => {
    const idsSet = new Set(ids);
    updateCurrentSetItems(prev => prev.filter(item => !idsSet.has(item.id)));
  };

  // Reset mastery scores for active deck
  const handleResetActiveDeckMastery = () => {
    updateCurrentSetItems(prev =>
      prev.map(item => ({
        ...item,
        masteryScore: 0,
        attemptsCount: 0,
        correctCount: 0,
      }))
    );
  };

  // Reset active set to default dataset
  const handleResetDefaultVocab = () => {
    updateCurrentSetItems(() => INITIAL_A1_VOCAB.filter(isValidVocabItem));
  };

  // Vocab Sets Management Handlers
  const handleCreateVocabSet = (name: string, levelGroup: string = 'A1') => {
    const newSet: VocabSet = {
      id: 'set_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name,
      levelGroup,
      createdAt: new Date().toISOString(),
      items: [],
    };
    setVocabSets(prev => [...prev, newSet]);
    setActiveSetId(newSet.id);
  };

  const handleRenameVocabSet = (id: string, newName: string) => {
    setVocabSets(prev =>
      prev.map(set => (set.id === id ? { ...set, name: newName } : set))
    );
  };

  const handleMoveVocabSet = (id: string, targetGroup: string) => {
    setVocabSets(prev =>
      prev.map(set => (set.id === id ? { ...set, levelGroup: targetGroup } : set))
    );
  };

  const handleDeleteVocabSet = (id: string) => {
    const remaining = vocabSets.filter(set => set.id !== id);
    if (remaining.length === 0) {
      const freshSet: VocabSet = {
        id: 'set_' + Date.now(),
        name: 'A1 Vocab Deck 1',
        levelGroup: 'A1',
        createdAt: new Date().toISOString(),
        items: [],
      };
      setVocabSets([freshSet]);
      setActiveSetId(freshSet.id);
    } else {
      setVocabSets(remaining);
      if (activeSetId === id) {
        setActiveSetId(remaining[0].id);
      }
    }
  };

  // Transfer all items from source deck to target deck
  const handleTransferDeckItems = (sourceSetId: string, targetSetId: string) => {
    if (!sourceSetId || !targetSetId || sourceSetId === targetSetId) return;

    setVocabSets(prevSets => {
      const sourceSet = prevSets.find(s => s.id === sourceSetId);
      const targetSet = prevSets.find(s => s.id === targetSetId);
      if (!sourceSet || !targetSet) return prevSets;

      const itemsToMove = (sourceSet.items || []).filter(isValidVocabItem);
      if (itemsToMove.length === 0) return prevSets;

      const targetExistingKeys = new Set((targetSet.items || []).map(item => getVocabItemKey(item)));
      const uniqueNewItems = itemsToMove.filter(item => !targetExistingKeys.has(getVocabItemKey(item)));

      return prevSets.map(set => {
        if (set.id === sourceSetId) {
          return {
            ...set,
            items: [],
          };
        }
        if (set.id === targetSetId) {
          return {
            ...set,
            items: [...(set.items || []), ...uniqueNewItems],
          };
        }
        return set;
      });
    });
  };

  // Clear all items in a specific deck
  const handleClearDeckItems = (setId: string) => {
    setVocabSets(prevSets =>
      prevSets.map(set => (set.id === setId ? { ...set, items: [] } : set))
    );
  };

  const handleBatchImportSets = (importedSets: VocabSet[], targetGroup?: string) => {
    if (!Array.isArray(importedSets) || importedSets.length === 0) return;

    const formattedSets = importedSets.map((s, idx) => {
      let grp: string | undefined = undefined;

      // 1. If targetGroup is specified (e.g. imported inside a selected group view), force targetGroup!
      if (targetGroup) {
        grp = targetGroup;
      } else {
        // 2. Otherwise check explicit levelGroup / level / group properties
        const explicitLevel = s.levelGroup || (s as any).level || (s as any).group;
        if (explicitLevel) {
          grp = explicitLevel;
        } else {
          // 3. Check deck name / title for level keywords
          const u = ((s.name || (s as any).title || '').toString()).toUpperCase();
          if (u.includes('A2')) grp = 'A2';
          else if (u.includes('B1')) grp = 'B1';
          else if (u.includes('B2')) grp = 'B2';
          else if (u.includes('C1')) grp = 'C1';
          else if (u.includes('A1')) grp = 'A1';
        }
      }

      if (!grp) {
        grp = 'General';
      }

      const rawItems = s.items || (s as any).words || (s as any).vocabList || [];

      const itemsList = Array.isArray(rawItems)
        ? rawItems.filter(isValidVocabItem).map((item, i) => ({
            ...item,
            id: item.id || `item_${Date.now()}_${idx}_${i}`,
            masteryScore: typeof item.masteryScore === 'number' ? item.masteryScore : 0,
          }))
        : [];

      return {
        ...s,
        id: s.id ? `imported_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}` : `set_${Date.now()}_${idx}`,
        name: s.name || (s as any).title || `Imported Deck ${idx + 1}`,
        levelGroup: grp,
        createdAt: s.createdAt || new Date().toISOString(),
        items: itemsList,
      };
    });

    setVocabSets(prev => [...formattedSets, ...prev]);
    if (formattedSets[0]) {
      setActiveSetId(formattedSets[0].id);
    }
  };

  const handleExportAllSets = () => {
    const jsonStr = JSON.stringify(vocabSets, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deutsch_meister_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSyncAllSets = React.useCallback((newSets: VocabSet[]) => {
    const valid = filterValidVocabItems(newSets);
    if (valid.length > 0) {
      setVocabSets(valid);
      setActiveSetId(prevActiveId => {
        // 1. If currently active deck ID still exists, keep it exactly!
        if (valid.some(s => s.id === prevActiveId)) {
          return prevActiveId;
        }
        // 2. Try finding by matching tab title or name
        const currentActive = vocabSets.find(s => s.id === prevActiveId);
        if (currentActive) {
          const cleanActiveName = (currentActive.name || '').trim().toLowerCase();
          const matchByName = valid.find(s => (s.name || '').trim().toLowerCase() === cleanActiveName);
          if (matchByName) return matchByName.id;
          const matchByGroup = valid.find(s => s.levelGroup === currentActive.levelGroup);
          if (matchByGroup) return matchByGroup.id;
        }
        return valid[0]?.id || prevActiveId;
      });
    }
  }, [vocabSets]);

  // Always-On Auto-Sync Engine for Google Sheets
  const autoSync = useAutoSync({
    vocabSets,
    onSyncAllSets: handleSyncAllSets,
  });

  const totalVocabCount = vocabList.length;
  const correctVocabCount = vocabList.filter(item => (item.masteryScore ?? 0) >= 80).length;
  const masteredPercentage = totalVocabCount > 0 ? Math.round((correctVocabCount / totalVocabCount) * 100) : 0;

  return (
    <div dir="ltr" className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased selection:bg-blue-500 selection:text-white">
      
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        vocabList={vocabList}
        onOpenUpload={() => setActiveTab('vocab')}
        onResetDefaultVocab={handleResetDefaultVocab}
        onResetActiveDeckMastery={handleResetActiveDeckMastery}
        onOpenSettings={() => setActiveTab('decks')}
        activeSetName={currentSet.name}
        activeSetGroup={currentSet.levelGroup}
        autoSyncStatus={{
          status: autoSync.syncStatus,
          message: autoSync.statusMessage,
          lastSyncedAt: autoSync.lastSyncedAt,
        }}
        currentUser={currentUser}
        isGuest={!currentUser}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Account Mode Status Banner when Logged into Google without linked sheet or with empty deck */}
        {currentUser && (!linkedSheet || vocabSets.length === 0) && activeTab !== 'decks' && (
          <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800 text-slate-800 dark:text-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600 text-white rounded-xl shadow-xs shrink-0">
                <CloudCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-sm text-blue-950 dark:text-blue-100">
                  الحساب الشخصي: تظهر المفردات المرتبطة حصراً بـ Google Drive
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 max-w-xl leading-relaxed">
                  أنت مسجل الدخول بحساب Google. لم يتم ربط جدول حتى الآن أو الجدول فارغ. قم بإنشاء جدول جديد فارغ أو ربط جدول موجود من Google Drive للبدء.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('decks')}
              className="shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>إدارة وتوصيل الجداول (Database)</span>
            </button>
          </div>
        )}

        <div className={activeTab === 'quiz' ? 'block' : 'hidden'}>
          <FlashcardQuiz
            key={currentSet.id}
            activeSetId={currentSet.id}
            vocabList={vocabList}
            onUpdateVocabMastery={handleUpdateVocabMastery}
            onUpdateVocabItem={handleUpdateVocabItem}
            quizSettings={quizSettings}
          />
        </div>

        {activeTab === 'vocab' && (
          <VocabManager
            vocabList={vocabList}
            onAddVocabItems={handleAddVocabItems}
            onUpdateVocabItem={handleUpdateVocabItem}
            onDeleteVocabItem={handleDeleteVocabItem}
            onDeleteMultipleVocabItems={handleDeleteMultipleVocabItems}
            onResetDefaultVocab={handleResetDefaultVocab}
          />
        )}

        {activeTab === 'decks' && (
          <DecksManager
            vocabSets={vocabSets}
            activeSetId={currentSet.id}
            onSelectVocabSet={setActiveSetId}
            onCreateVocabSet={handleCreateVocabSet}
            onRenameVocabSet={handleRenameVocabSet}
            onMoveVocabSet={handleMoveVocabSet}
            onDeleteVocabSet={handleDeleteVocabSet}
            onTransferDeckItems={handleTransferDeckItems}
            onClearDeckItems={handleClearDeckItems}
            onBatchImportSets={handleBatchImportSets}
            onExportAllSets={handleExportAllSets}
            onSyncAllSets={handleSyncAllSets}
            autoSyncStatus={{
              status: autoSync.syncStatus,
              message: autoSync.statusMessage,
              lastSyncedAt: autoSync.lastSyncedAt,
            }}
          />
        )}

        {activeTab === 'stats' && (
          <TrainingStats
            vocabList={vocabList}
            onNavigateToQuiz={() => setActiveTab('quiz')}
            onNavigateToVocab={() => setActiveTab('vocab')}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsManager
            quizSettings={quizSettings}
            onUpdateQuizSettings={setQuizSettings}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-semibold">
            DeutschMeister A1 — German Vocabulary Trainer with Interactive Practice
          </p>
          <p className="mt-1 text-[11px] opacity-75">
            Supports grammatical genders (der/die/das), plural forms, verb conjugations, and spaced repetition.
          </p>
        </div>
      </footer>

      {/* Floating Google Sheets Sync Notification Banner */}
      <SyncNotificationToast
        onNavigateToVocab={() => setActiveTab('vocab')}
        onNavigateToDecks={() => setActiveTab('decks')}
      />

      {/* PWA Floating Install Prompt */}
      <PWAInstallPrompt />

    </div>
  );
}

