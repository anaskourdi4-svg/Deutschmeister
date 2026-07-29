import React, { useState, useEffect } from 'react';
import { CheckCircle2, Layers } from 'lucide-react';
import { VocabItem, ActiveTab, AppLanguage, VocabSet } from './types';
import { INITIAL_A1_VOCAB } from './data/defaultA1Vocab';
import { Header } from './components/Header';
import { FlashcardQuiz } from './components/FlashcardQuiz';
import { SentenceBuilder } from './components/SentenceBuilder';
import { VocabManager } from './components/VocabManager';
import { GrammarCheatsheet } from './components/GrammarCheatsheet';
import { TrainingStats } from './components/TrainingStats';
import { SettingsModal } from './components/SettingsModal';

const SETS_STORAGE_KEY = 'deutsch_meister_vocab_sets_v3';
const ACTIVE_SET_KEY = 'deutsch_meister_active_set_v3';
const LANG_STORAGE_KEY = 'deutsch_meister_app_lang_v1';

// Helper to strictly ensure vocabulary items are only Nouns or Verbs
const isNounOrVerb = (item: VocabItem) => {
  const t = (item.type || '').toLowerCase();
  return t === 'noun' || t === 'verb' || item.gender !== undefined;
};

const filterNounsAndVerbsOnly = (sets: VocabSet[]): VocabSet[] => {
  return sets.map(s => ({
    ...s,
    items: (s.items || []).filter(isNounOrVerb)
  }));
};

const DEFAULT_DEMO_SET: VocabSet = {
  id: 'set_demo_default',
  name: 'Demo Set',
  description: 'Default demo vocabulary set for A1 level',
  createdAt: new Date().toISOString(),
  items: INITIAL_A1_VOCAB.filter(isNounOrVerb),
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('quiz');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // App language state
  const [appLanguage, setAppLanguage] = useState<AppLanguage>(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      if (saved && ['ar', 'en', 'de', 'es'].includes(saved)) {
        return saved as AppLanguage;
      }
    } catch (e) {
      console.warn('Failed to load saved language:', e);
    }
    return 'en';
  });

  // Vocab Sets state - Strictly filtered for Nouns and Verbs only
  const [vocabSets, setVocabSets] = useState<VocabSet[]>(() => {
    try {
      const savedSets = localStorage.getItem(SETS_STORAGE_KEY);
      if (savedSets) {
        const parsed = JSON.parse(savedSets);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return filterNounsAndVerbsOnly(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to load vocab sets:', e);
    }
    return [DEFAULT_DEMO_SET];
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
    return DEFAULT_DEMO_SET.id;
  });

  // Ensure activeSetId is valid
  const currentSet = vocabSets.find(s => s.id === activeSetId) || vocabSets[0] || DEFAULT_DEMO_SET;
  const vocabList = (currentSet.items || []).filter(isNounOrVerb);

  // Save language to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, appLanguage);
    } catch (e) {
      console.warn('Failed to save language:', e);
    }
  }, [appLanguage]);

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
            items: updater(set.items || []).filter(isNounOrVerb),
          };
        }
        return set;
      })
    );
  };

  // Update mastery for a specific item
  const handleUpdateVocabMastery = (id: string, delta: number) => {
    updateCurrentSetItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          const newScore = Math.min(100, Math.max(0, item.masteryScore + delta));
          return {
            ...item,
            masteryScore: newScore,
            attemptsCount: item.attemptsCount + 1,
            correctCount: delta > 0 ? item.correctCount + 1 : item.correctCount,
            lastPracticed: new Date().toISOString(),
          };
        }
        return item;
      })
    );
  };

  // Add new items to active set (strictly nouns and verbs)
  const handleAddVocabItems = (newItems: VocabItem[]) => {
    const onlyNounsAndVerbs = newItems.filter(isNounOrVerb);
    updateCurrentSetItems(prev => {
      const existingWords = new Set(prev.map(p => p.word.toLowerCase()));
      const filteredNew = onlyNounsAndVerbs.filter(item => !existingWords.has(item.word.toLowerCase()));
      return [...filteredNew, ...prev];
    });
  };

  // Delete an item from active set
  const handleDeleteVocabItem = (id: string) => {
    updateCurrentSetItems(prev => prev.filter(item => item.id !== id));
  };

  // Delete multiple items from active set
  const handleDeleteMultipleVocabItems = (ids: string[]) => {
    const idsSet = new Set(ids);
    updateCurrentSetItems(prev => prev.filter(item => !idsSet.has(item.id)));
  };

  // Reset active set to default A1 dataset (strictly nouns and verbs)
  const handleResetDefaultVocab = () => {
    updateCurrentSetItems(() => INITIAL_A1_VOCAB.filter(isNounOrVerb));
  };

  // Vocab Sets Management Handlers
  const handleCreateVocabSet = (name: string) => {
    const newSet: VocabSet = {
      id: 'set_' + Date.now(),
      name,
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
    if (vocabSets.length <= 1) return;
    const remaining = vocabSets.filter(set => set.id !== id);
    setVocabSets(remaining);
    if (activeSetId === id) {
      setActiveSetId(remaining[0].id);
    }
  };

  const handleSplitVocabSet = (id: string, chunkSize: number) => {
    const targetSet = vocabSets.find(s => s.id === id);
    if (!targetSet || targetSet.items.length === 0) return;

    const items = targetSet.items;
    const chunksCount = Math.ceil(items.length / chunkSize);
    const newCreatedSets: VocabSet[] = [];

    for (let i = 0; i < chunksCount; i++) {
      const chunkItems = items.slice(i * chunkSize, (i + 1) * chunkSize);
      const chunkSet: VocabSet = {
        id: `set_split_${Date.now()}_${i + 1}`,
        name: `${targetSet.name} - Part ${i + 1} (${chunkItems.length} words)`,
        createdAt: new Date().toISOString(),
        items: chunkItems,
      };
      newCreatedSets.push(chunkSet);
    }

    // Replace original or add chunk sets
    setVocabSets(prev => {
      const filtered = prev.filter(s => s.id !== id);
      return [...filtered, ...newCreatedSets];
    });

    if (newCreatedSets.length > 0) {
      setActiveSetId(newCreatedSets[0].id);
    }
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
        onOpenSettings={() => setIsSettingsOpen(true)}
        activeSetName={currentSet.name}
      />

      {/* Settings & Vocab Decks Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        appLanguage={appLanguage}
        onChangeLanguage={setAppLanguage}
        vocabSets={vocabSets}
        activeSetId={currentSet.id}
        onSelectVocabSet={setActiveSetId}
        onCreateVocabSet={handleCreateVocabSet}
        onRenameVocabSet={handleRenameVocabSet}
        onDeleteVocabSet={handleDeleteVocabSet}
        onSplitVocabSet={handleSplitVocabSet}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {activeTab === 'quiz' && (
          <FlashcardQuiz
            vocabList={vocabList}
            onUpdateVocabMastery={handleUpdateVocabMastery}
          />
        )}

        {activeTab === 'sentences' && (
          <SentenceBuilder
            vocabList={vocabList}
            onUpdateVocabMastery={handleUpdateVocabMastery}
          />
        )}

        {activeTab === 'stats' && (
          <TrainingStats
            vocabList={vocabList}
            onNavigateToQuiz={() => setActiveTab('quiz')}
            onNavigateToVocab={() => setActiveTab('vocab')}
          />
        )}

        {activeTab === 'vocab' && (
          <VocabManager
            vocabList={vocabList}
            onAddVocabItems={handleAddVocabItems}
            onDeleteVocabItem={handleDeleteVocabItem}
            onDeleteMultipleVocabItems={handleDeleteMultipleVocabItems}
            onResetDefaultVocab={handleResetDefaultVocab}
          />
        )}

        {activeTab === 'grammar' && (
          <GrammarCheatsheet />
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

    </div>
  );
}

