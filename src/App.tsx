import React, { useState, useEffect } from 'react';
import { CheckCircle2, Layers } from 'lucide-react';
import { VocabItem, ActiveTab, VocabSet, QuizQuestionSettings, DEFAULT_QUIZ_SETTINGS, getVocabItemKey } from './types';
import { INITIAL_A1_VOCAB } from './data/defaultA1Vocab';
import { Header } from './components/Header';
import { FlashcardQuiz } from './components/FlashcardQuiz';
import { VocabManager } from './components/VocabManager';
import { TrainingStats } from './components/TrainingStats';
import { DecksManager } from './components/DecksManager';
import { SettingsManager } from './components/SettingsManager';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';

const SETS_STORAGE_KEY = 'deutsch_meister_vocab_sets_v3';
const ACTIVE_SET_KEY = 'deutsch_meister_active_set_v3';
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

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('quiz');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Vocab Sets state
  const [vocabSets, setVocabSets] = useState<VocabSet[]>(() => {
    try {
      const savedSets = localStorage.getItem(SETS_STORAGE_KEY);
      if (savedSets) {
        const parsed = JSON.parse(savedSets);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return filterValidVocabItems(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to load vocab sets:', e);
    }
    return DEFAULT_DEMO_SETS;
  });

  // Active Set ID state
  const [activeSetId, setActiveSetId] = useState<string>(() => {
    try {
      const savedActive = localStorage.getItem(ACTIVE_SET_KEY);
      if (savedActive) {
        return savedActive;
      }
    } catch (e) {
      console.warn('Failed to load active set ID:', e);
    }
    return DEFAULT_DEMO_SETS[0].id;
  });

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
            others: { ...DEFAULT_QUIZ_SETTINGS.others, ...parsed.others },
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

  // Ensure activeSetId is valid
  const currentSet = vocabSets.find(s => s.id === activeSetId) || vocabSets[0] || DEFAULT_DEMO_SETS[0];
  const vocabList = (currentSet.items || []).filter(isValidVocabItem);

  // Save vocabSets and activeSetId to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SETS_STORAGE_KEY, JSON.stringify(vocabSets));
      localStorage.setItem(ACTIVE_SET_KEY, activeSetId);
    } catch (e) {
      console.warn('Failed to save vocab sets:', e);
    }
  }, [vocabSets, activeSetId]);

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
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        <div className={activeTab === 'quiz' ? 'block' : 'hidden'}>
          <FlashcardQuiz
            key={currentSet.id}
            activeSetId={currentSet.id}
            vocabList={vocabList}
            onUpdateVocabMastery={handleUpdateVocabMastery}
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
            onDeleteVocabSet={handleDeleteVocabSet}
            onBatchImportSets={handleBatchImportSets}
            onExportAllSets={handleExportAllSets}
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

      {/* PWA Floating Install Prompt */}
      <PWAInstallPrompt />

    </div>
  );
}

