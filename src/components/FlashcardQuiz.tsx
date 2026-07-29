import React, { useState, useEffect, useMemo } from 'react';
import { VocabItem } from '../types';
import { AudioPlayer } from './AudioPlayer';
import {
  getVerbConjugations,
  evaluateGermanAnswer,
  evaluatePluralAnswer,
} from '../services/germanConjugator';
import {
  Sparkles,
  Check,
  X,
  Zap,
  BookOpen,
  Clock,
  RotateCcw,
  Layers,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Trophy,
  Play,
  Award,
  RefreshCw
} from 'lucide-react';

interface FlashcardQuizProps {
  vocabList: VocabItem[];
  onUpdateVocabMastery: (id: string, delta: number) => void;
}

interface QuestionAnswerState {
  selectedArticle?: 'der' | 'die' | 'das' | '';
  articleChecked?: boolean;

  pluralInput?: string;
  pluralChecked?: boolean;

  present3rdInput?: string;
  praeteritumInput?: string;
  perfektInput?: string;
  verbChecked?: boolean;
}

interface SessionConfig {
  count: number | 'all';
  filter: 'all' | 'nouns' | 'verbs' | 'unmastered';
}

// Helper to provide clear, concise grammatical explanations for German gender
function getGenderExplanation(word: string, correctGender?: string): string {
  if (!correctGender) return '';
  const w = word.trim().toLowerCase();

  if (correctGender === 'die') {
    if (w.endsWith('ung')) return 'Nouns ending in "-ung" are always feminine (die).';
    if (w.endsWith('heit') || w.endsWith('keit')) return 'Nouns ending in "-heit" or "-keit" are always feminine (die).';
    if (w.endsWith('schaft')) return 'Nouns ending in "-schaft" are always feminine (die).';
    if (w.endsWith('ei') || w.endsWith('in')) return 'Nouns ending in "-ei" or female forms "-in" are usually feminine (die).';
    if (w.endsWith('e')) return 'Most nouns ending in "-e" (approx. 90%) are feminine (die).';
    if (w.endsWith('ion') || w.endsWith('tät') || w.endsWith('ik')) return 'Foreign endings like "-ion", "-tät", "-ik" are feminine (die).';
    return `The correct article is "${correctGender}". Feminine articles in German should be learned with the noun.`;
  }

  if (correctGender === 'das') {
    if (w.endsWith('chen') || w.endsWith('lein')) return 'Diminutives ending in "-chen" or "-lein" are always neuter (das).';
    if (w.endsWith('ment') || w.endsWith('um')) return 'Nouns ending in "-ment" or "-um" are always neuter (das).';
    if (w.endsWith('nis') || w.endsWith('tum')) return 'Nouns ending in "-nis" or "-tum" are usually neuter (das).';
    return `The correct article is "${correctGender}", representing neuter nouns in German.`;
  }

  if (correctGender === 'der') {
    if (w.endsWith('ling') || w.endsWith('ismus')) return 'Nouns ending in "-ling" or "-ismus" are always masculine (der).';
    if (w.endsWith('er') || w.endsWith('or')) return 'Agent nouns and tools ending in "-er" or "-or" are often masculine (der).';
    if (w.endsWith('ant') || w.endsWith('ent')) return 'Nouns ending in "-ant" or "-ent" are masculine (der).';
    return `The correct article is "${correctGender}", representing masculine nouns in German.`;
  }

  return `The correct article is "${correctGender}".`;
}

export const FlashcardQuiz: React.FC<FlashcardQuizProps> = ({
  vocabList,
  onUpdateVocabMastery,
}) => {
  // Session Configuration
  const [sessionConfig, setSessionConfig] = useState<SessionConfig>({
    count: 10,
    filter: 'all',
  });

  // Frozen list of items for the current practice session
  const [sessionItems, setSessionItems] = useState<VocabItem[]>([]);
  
  // Session Completion Modal
  const [isSessionCompleted, setIsSessionCompleted] = useState<boolean>(false);

  // Pagination State (10 items per page)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Answer states for each question
  const [answers, setAnswers] = useState<Record<string, QuestionAnswerState>>({});

  // Start / Reset Session Logic
  const startSession = (count: number | 'all', filter: 'all' | 'nouns' | 'verbs' | 'unmastered') => {
    let filtered = vocabList.filter(item => {
      const t = (item.type || (item.gender ? 'noun' : '')).toLowerCase();
      const isNoun = t === 'noun' || item.gender !== undefined;
      const isVerb = t === 'verb';

      if (filter === 'nouns') return isNoun;
      if (filter === 'verbs') return isVerb;
      if (filter === 'unmastered') return (item.masteryScore ?? 0) < 80;
      return isNoun || isVerb;
    });

    // SRS Priority Sorting
    const calculateSrsUrgency = (item: VocabItem) => {
      const mastery = item.masteryScore ?? 0;
      if (!item.lastPracticed) return 10000 + (100 - mastery);

      const lastTime = new Date(item.lastPracticed).getTime();
      const now = Date.now();
      const hoursElapsed = Math.max(0.01, (now - lastTime) / (1000 * 60 * 60));
      const targetIntervalHours = 2 + Math.pow(mastery / 100, 2) * 166;
      const overdueRatio = hoursElapsed / targetIntervalHours;

      return overdueRatio * 100 + (100 - mastery);
    };

    const sorted = [...filtered].sort((a, b) => calculateSrsUrgency(b) - calculateSrsUrgency(a));

    let sliced = sorted;
    if (count !== 'all' && typeof count === 'number' && count > 0) {
      sliced = sorted.slice(0, count);
    }

    setSessionItems(sliced);
    setAnswers({});
    setCurrentPage(1);
    setIsSessionCompleted(false);
  };

  // Initialize session on mount or when deck changes significantly
  useEffect(() => {
    if (vocabList.length > 0 && sessionItems.length === 0) {
      startSession(sessionConfig.count, sessionConfig.filter);
    }
  }, [vocabList]);

  // Listen for global practice session events from Header
  useEffect(() => {
    const handleStartSession = (e: Event) => {
      const custom = e as CustomEvent<{ count: number | 'all'; filter: 'all' | 'nouns' | 'verbs' | 'unmastered' }>;
      if (custom.detail) {
        setSessionConfig(custom.detail);
        startSession(custom.detail.count, custom.detail.filter);
      }
    };

    const handleQuizFilter = (e: Event) => {
      const custom = e as CustomEvent<'all' | 'nouns' | 'verbs' | 'unmastered'>;
      if (custom.detail) {
        setSessionConfig(prev => ({ ...prev, filter: custom.detail }));
        startSession(sessionConfig.count, custom.detail);
      }
    };

    const handleShuffle = () => {
      startSession(sessionConfig.count, sessionConfig.filter);
    };

    window.addEventListener('app:quiz-start-session', handleStartSession);
    window.addEventListener('app:quiz-set-filter', handleQuizFilter as EventListener);
    window.addEventListener('app:quiz-shuffle', handleShuffle);

    return () => {
      window.removeEventListener('app:quiz-start-session', handleStartSession);
      window.removeEventListener('app:quiz-set-filter', handleQuizFilter as EventListener);
      window.removeEventListener('app:quiz-shuffle', handleShuffle);
    };
  }, [vocabList, sessionConfig]);

  // Pagination Math
  const totalPages = Math.max(1, Math.ceil(sessionItems.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const pageItems = sessionItems.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  // Session Progress Calculations
  const isItemAnswered = (item: VocabItem) => {
    const st = answers[item.id];
    if (!st) return false;
    if (item.type === 'verb') return !!st.verbChecked;
    return !!st.articleChecked || !!st.pluralChecked;
  };

  const answeredCount = sessionItems.filter(isItemAnswered).length;
  const totalInSession = sessionItems.length;
  const progressPercent = totalInSession > 0 ? Math.round((answeredCount / totalInSession) * 100) : 0;

  // Correctness evaluations for Session Summary
  const isItemCorrect = (item: VocabItem) => {
    const st = answers[item.id];
    if (!st) return false;

    const isNoun = item.type === 'noun' || item.gender !== undefined;
    if (isNoun) {
      const artOk = st.selectedArticle === item.gender;
      const pluralOk = item.plural
        ? evaluatePluralAnswer(st.pluralInput || '', item.plural)
        : true;
      return artOk && pluralOk;
    } else {
      const conjugations = getVerbConjugations(item);
      const presOk = evaluateGermanAnswer(st.present3rdInput || '', conjugations.present3rd);
      const praetOk = evaluateGermanAnswer(st.praeteritumInput || '', conjugations.praeteritum);
      const perfOk = evaluateGermanAnswer(st.perfektInput || '', conjugations.perfekt, true);
      return presOk && praetOk && perfOk;
    }
  };

  const correctCount = sessionItems.filter(isItemCorrect).length;
  const incorrectCount = answeredCount - correctCount;
  const accuracyPercent = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const updateAnswerField = (id: string, fields: Partial<QuestionAnswerState>) => {
    setAnswers(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        ...fields
      }
    }));
  };

  // 1. INSTANT ARTICLE CHECK: Card stays completely stationary
  const handleArticleClick = (item: VocabItem, art: 'der' | 'die' | 'das') => {
    const qState = answers[item.id] || {};
    if (qState.articleChecked) return;

    const isCorrect = art === item.gender;

    updateAnswerField(item.id, {
      selectedArticle: art,
      articleChecked: true
    });

    onUpdateVocabMastery(item.id, isCorrect ? 5 : -3);
  };

  // 2. PLURAL CHECK
  const handlePluralCheck = (item: VocabItem) => {
    const qState = answers[item.id] || {};
    if (qState.pluralChecked) return;

    const inputVal = qState.pluralInput || '';
    const isCorrect = item.plural
      ? evaluatePluralAnswer(inputVal, item.plural)
      : true;

    updateAnswerField(item.id, {
      pluralChecked: true
    });

    onUpdateVocabMastery(item.id, isCorrect ? 5 : -3);
  };

  // 3. VERB CONJUGATIONS CHECK
  const handleVerbCheck = (item: VocabItem) => {
    const qState = answers[item.id] || {};
    if (qState.verbChecked) return;

    const conjugations = getVerbConjugations(item);
    const presOk = evaluateGermanAnswer(qState.present3rdInput || '', conjugations.present3rd);
    const praetOk = evaluateGermanAnswer(qState.praeteritumInput || '', conjugations.praeteritum);
    const perfOk = evaluateGermanAnswer(qState.perfektInput || '', conjugations.perfekt, true);

    const isCorrect = presOk && praetOk && perfOk;

    updateAnswerField(item.id, {
      verbChecked: true
    });

    onUpdateVocabMastery(item.id, isCorrect ? 10 : -5);
  };

  // Reset single item
  const handleResetCard = (id: string) => {
    setAnswers(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 dir-ltr">

      {/* ------------------------------------------------------------------- */}
      {/* SESSION SUMMARY RESULTS SCREEN */}
      {/* ------------------------------------------------------------------- */}
      {isSessionCompleted ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 animate-fade-in">
          
          <div className="text-center space-y-3">
            <div className="inline-flex p-3 rounded-full bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 text-amber-600 dark:text-amber-400">
              <Trophy className="w-10 h-10 animate-pulse" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Practice Session Completed!
            </h2>
            <p className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
              Great job! Here is your performance summary for this practice session:
            </p>
          </div>

          {/* STATS SUMMARY GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-blue-50/80 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 p-4 rounded-2xl text-center space-y-1">
              <span className="text-xs font-extrabold text-blue-700 dark:text-blue-300 block">Total Words</span>
              <span className="text-2xl font-black text-blue-900 dark:text-blue-100">{totalInSession}</span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl text-center space-y-1">
              <span className="text-xs font-extrabold text-slate-600 dark:text-slate-400 block">Answered</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">{answeredCount}</span>
            </div>

            <div className="bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 p-4 rounded-2xl text-center space-y-1">
              <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300 block">Correct</span>
              <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{correctCount}</span>
            </div>

            <div className="bg-amber-50/80 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 p-4 rounded-2xl text-center space-y-1">
              <span className="text-xs font-extrabold text-amber-700 dark:text-amber-300 block">Accuracy</span>
              <span className="text-2xl font-black text-amber-800 dark:text-amber-200">{accuracyPercent}%</span>
            </div>
          </div>

          {/* DETAILED WORD BREAKDOWN */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Session Performance Breakdown:
            </h3>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {sessionItems.map((item, idx) => {
                const answered = isItemAnswered(item);
                const correct = isItemCorrect(item);
                const st = answers[item.id] || {};

                return (
                  <div 
                    key={item.id}
                    className="p-3.5 rounded-2xl border bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 font-black text-[11px] flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </span>

                      <div>
                        <div className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-2">
                          <span>{item.gender ? `${item.gender} ${item.word}` : item.word}</span>
                          <span className="text-xs font-normal text-slate-500">({item.translationAr})</span>
                        </div>

                        {answered && item.gender && (
                          <div className="text-[11px] font-bold text-slate-500 pt-0.5">
                            Article selected: <span className="font-extrabold">{st.selectedArticle || '-'}</span> (Correct: <span className="text-emerald-600">{item.gender}</span>)
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      {answered ? (
                        correct ? (
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-extrabold flex items-center gap-1 border border-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Correct</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-extrabold flex items-center gap-1 border border-rose-300 dark:border-rose-800">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Incorrect</span>
                          </span>
                        )
                      ) : (
                        <span className="px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 font-bold">
                          Skipped
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setIsSessionCompleted(false)}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-black rounded-2xl text-xs cursor-pointer transition-all"
            >
              Review Cards
            </button>

            <button
              onClick={() => startSession(sessionConfig.count, sessionConfig.filter)}
              className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs cursor-pointer transition-all shadow-md flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Start New Session</span>
            </button>
          </div>

        </div>
      ) : (
        <>
          {/* ------------------------------------------------------------------- */}
          {/* SESSION PROGRESS STATUS HEADER */}
          {/* ------------------------------------------------------------------- */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-3xl shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center gap-1.5 shadow-xs shrink-0">
                  <Play className="w-4 h-4 fill-white" />
                  <span>Active Session ({sessionItems.length} Words)</span>
                </div>

                <div className="text-xs font-black text-slate-700 dark:text-slate-300">
                  Answered: <span className="text-emerald-600 dark:text-emerald-400 font-black">{answeredCount}</span> / {totalInSession}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSessionCompleted(true)}
                  disabled={answeredCount === 0}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Trophy className="w-4 h-4" />
                  <span>View Results ({progressPercent}%)</span>
                </button>
              </div>

            </div>

            {/* PROGRESS BAR */}
            <div className="bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-200/60 dark:border-slate-700">
              <div 
                className="bg-gradient-to-r from-blue-500 to-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* NO MATCHING ITEMS */}
          {sessionItems.length === 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center space-y-3">
              <Layers className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="text-base font-black text-slate-800 dark:text-slate-200">
                No matching vocabulary found for this session filter
              </h3>
              <button
                onClick={() => startSession(10, 'all')}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Start Practice Session with All Vocabulary
              </button>
            </div>
          )}

          {/* ------------------------------------------------------------------- */}
          {/* PRACTICE CARDS LIST - FIXED POSITIONS DURING SESSION */}
          {/* ------------------------------------------------------------------- */}
          {sessionItems.length > 0 && (
            <div className="space-y-4">
              {pageItems.map((item, indexOnPage) => {
                const globalNumber = (safePage - 1) * itemsPerPage + indexOnPage + 1;
                const qState = answers[item.id] || {};
                const isNoun = item.type === 'noun' || item.gender !== undefined;
                const conjugations = getVerbConjugations(item);

                const isArticleCorrect = qState.selectedArticle === item.gender;
                const isPluralCorrect = item.plural
                  ? evaluatePluralAnswer(qState.pluralInput || '', item.plural)
                  : true;

                const isPresCorrect = evaluateGermanAnswer(qState.present3rdInput || '', conjugations.present3rd);
                const isPraetCorrect = evaluateGermanAnswer(qState.praeteritumInput || '', conjugations.praeteritum);
                const isPerfCorrect = evaluateGermanAnswer(qState.perfektInput || '', conjugations.perfekt, true);

                return (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 transition-none"
                  >
                    {/* CARD TOP BAR - FIXED QUESTION NUMBER */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-black text-xs flex items-center justify-center shrink-0">
                          Question #{globalNumber} of {totalInSession}
                        </span>

                        {isNoun ? (
                          <span className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-extrabold text-xs flex items-center gap-1.5 border border-blue-200 dark:border-blue-900">
                            <BookOpen className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span>Noun (Nomen)</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-900">
                            <Zap className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>Verb (Verb) {item.isIrregular ? 'Irregular' : 'Regular'}</span>
                          </span>
                        )}

                        {item.category && (
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 hidden sm:inline">
                            ({item.category})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {(qState.articleChecked || qState.pluralChecked || qState.verbChecked) && (
                          <button
                            onClick={() => handleResetCard(item.id)}
                            title="Reset item"
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <span className="text-xs font-black text-blue-600 bg-blue-50 dark:bg-blue-950 px-2.5 py-1 rounded-xl border border-blue-100 dark:border-blue-900">
                          Mastery: {item.masteryScore}%
                        </span>
                      </div>
                    </div>

                    {/* WORD DISPLAY */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3 dir-ltr">
                        <span className="text-2xl font-black text-slate-900 dark:text-white">
                          {item.word}
                        </span>
                        <AudioPlayer text={isNoun && item.gender ? `${item.gender} ${item.word}` : item.word} size="md" />
                      </div>

                      <div className="text-sm font-black text-blue-700 dark:text-blue-300">
                        {item.translationAr}
                      </div>
                    </div>

                    {/* NOUN EXERCISE: ARTICLE CHECK & PLURAL CHECK */}
                    {isNoun ? (
                      <div className="space-y-4 pt-1">
                        
                        {/* Artikel Selection (Immediate check on click, card stays strictly fixed) */}
                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                            Select Article (Artikel):
                          </label>

                          <div className="grid grid-cols-3 gap-2.5 dir-ltr">
                            {(['der', 'die', 'das'] as const).map(art => {
                              const isSelected = qState.selectedArticle === art;
                              const isTargetGender = item.gender === art;

                              let styleClasses = 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50/50';

                              if (qState.articleChecked) {
                                if (isTargetGender) {
                                  styleClasses = 'bg-emerald-600 text-white border-emerald-600 font-black shadow-xs';
                                } else if (isSelected && !isTargetGender) {
                                  styleClasses = 'bg-rose-600 text-white border-rose-600 font-black';
                                } else {
                                  styleClasses = 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-800 opacity-40';
                                }
                              } else if (isSelected) {
                                styleClasses = 'bg-blue-600 text-white border-blue-600 font-black';
                              }

                              return (
                                <button
                                  key={art}
                                  type="button"
                                  onClick={() => handleArticleClick(item, art)}
                                  className={`py-3 px-4 rounded-2xl border text-sm font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${styleClasses}`}
                                >
                                  <span>{art}</span>
                                  {qState.articleChecked && isTargetGender && <Check className="w-4 h-4 stroke-[3]" />}
                                  {qState.articleChecked && isSelected && !isTargetGender && <X className="w-4 h-4 stroke-[3]" />}
                                </button>
                              );
                            })}
                          </div>

                          {/* ARTICLE FEEDBACK & EXPLANATION RULE IF WRONG */}
                          {qState.articleChecked && (
                            <div className={`p-3 rounded-2xl text-xs space-y-1 mt-2 border ${
                              isArticleCorrect
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-100'
                            }`}>
                              <div className="flex items-center gap-1.5 font-black">
                                {isArticleCorrect ? (
                                  <>
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>Correct answer! The article is "{item.gender}".</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                    <span>Incorrect answer! The correct article is "{item.gender}".</span>
                                  </>
                                )}
                              </div>

                              {!isArticleCorrect && (
                                <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 pt-1 leading-relaxed">
                                  💡 <span className="font-extrabold text-slate-900 dark:text-slate-100">Explanation & Rule:</span> {getGenderExplanation(item.word, item.gender)}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Plural Input + "Check" button */}
                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                            Plural Form (Plural):
                          </label>

                          <div className="flex gap-2">
                            <input
                              type="text"
                              disabled={qState.pluralChecked}
                              value={qState.pluralInput || ''}
                              onChange={e => updateAnswerField(item.id, { pluralInput: e.target.value })}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handlePluralCheck(item);
                              }}
                              placeholder="e.g. die Tische..."
                              className={`grow p-3 rounded-2xl border text-xs sm:text-sm font-extrabold focus:outline-none focus:ring-2 focus:ring-blue-500 dir-ltr ${
                                qState.pluralChecked
                                  ? isPluralCorrect
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 border-emerald-400 font-black'
                                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100 border-rose-400 font-black'
                                  : 'bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700'
                              }`}
                            />

                            {!qState.pluralChecked ? (
                              <button
                                type="button"
                                onClick={() => handlePluralCheck(item)}
                                className="px-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl text-xs cursor-pointer shrink-0 flex items-center gap-1.5"
                              >
                                <Check className="w-4 h-4" />
                                <span>Check</span>
                              </button>
                            ) : (
                              <div className={`px-4 rounded-2xl flex items-center justify-center shrink-0 border font-black text-xs ${
                                isPluralCorrect
                                  ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-800'
                                  : 'bg-rose-100 dark:bg-rose-950 border-rose-300 dark:border-rose-800'
                              }`}>
                                {isPluralCorrect ? (
                                  <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                                    <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 stroke-[2.5]" />
                                    <span>Correct</span>
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-rose-700 dark:text-rose-300">
                                    <AlertCircle className="w-4.5 h-4.5 text-rose-600 stroke-[2.5]" />
                                    <span>Incorrect</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {qState.pluralChecked && !isPluralCorrect && item.plural && (
                            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl text-xs space-y-1">
                              <span className="font-extrabold text-rose-900 dark:text-rose-200">
                                Correct Plural Form: <span className="dir-ltr font-black px-2 py-0.5 bg-rose-200 dark:bg-rose-900 rounded-md inline-block">{item.plural}</span>
                              </span>
                            </div>
                          )}
                        </div>

                      </div>
                    ) : (
                      /* VERB EXERCISE */
                      <div className="space-y-3 pt-1">
                        <label className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                          Conjugate verb in three tenses (Present, Past, Perfect):
                        </label>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 dir-ltr">
                          {/* Present 3rd */}
                          <div className="space-y-1">
                            <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400 block text-left">
                              1. Present (er/sie/es):
                            </span>
                            <input
                              type="text"
                              disabled={qState.verbChecked}
                              value={qState.present3rdInput || ''}
                              onChange={e => updateAnswerField(item.id, { present3rdInput: e.target.value })}
                              placeholder="e.g. sieht"
                              className={`w-full p-2.5 rounded-2xl border text-xs font-extrabold ${
                                qState.verbChecked
                                  ? isPresCorrect
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 border-emerald-400'
                                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100 border-rose-400'
                                  : 'bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700'
                              }`}
                            />
                            {qState.verbChecked && !isPresCorrect && (
                              <span className="text-[10px] font-bold text-rose-600 block">
                                Correct: {conjugations.present3rd}
                              </span>
                            )}
                          </div>

                          {/* Praeteritum */}
                          <div className="space-y-1">
                            <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400 block text-left">
                              2. Past (Präteritum):
                            </span>
                            <input
                              type="text"
                              disabled={qState.verbChecked}
                              value={qState.praeteritumInput || ''}
                              onChange={e => updateAnswerField(item.id, { praeteritumInput: e.target.value })}
                              placeholder="e.g. sah"
                              className={`w-full p-2.5 rounded-2xl border text-xs font-extrabold ${
                                qState.verbChecked
                                  ? isPraetCorrect
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 border-emerald-400'
                                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100 border-rose-400'
                                  : 'bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700'
                              }`}
                            />
                            {qState.verbChecked && !isPraetCorrect && (
                              <span className="text-[10px] font-bold text-rose-600 block">
                                Correct: {conjugations.praeteritum}
                              </span>
                            )}
                          </div>

                          {/* Perfekt */}
                          <div className="space-y-1">
                            <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400 block text-left">
                              3. Perfect (Perfekt):
                            </span>
                            <input
                              type="text"
                              disabled={qState.verbChecked}
                              value={qState.perfektInput || ''}
                              onChange={e => updateAnswerField(item.id, { perfektInput: e.target.value })}
                              placeholder="e.g. hat gesehen"
                              className={`w-full p-2.5 rounded-2xl border text-xs font-extrabold ${
                                qState.verbChecked
                                  ? isPerfCorrect
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 border-emerald-400'
                                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100 border-rose-400'
                                  : 'bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700'
                              }`}
                            />
                            {qState.verbChecked && !isPerfCorrect && (
                              <span className="text-[10px] font-bold text-rose-600 block">
                                Correct: {conjugations.perfekt}
                              </span>
                            )}
                          </div>
                        </div>

                        {!qState.verbChecked ? (
                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => handleVerbCheck(item)}
                              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs cursor-pointer flex items-center gap-2"
                            >
                              <Check className="w-4 h-4" />
                              <span>Check Verb Conjugations</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end pt-1">
                            <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-3 py-1 rounded-xl flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>Verb conjugations checked</span>
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                );
              })}

              {/* PAGINATION & COMPLETE SESSION BUTTON */}
              <div className="space-y-4 pt-2">
                {totalPages > 1 && (
                  <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-3xl shadow-xs">
                    <button
                      disabled={safePage <= 1}
                      onClick={() => handlePageChange(safePage - 1)}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-extrabold disabled:opacity-40 cursor-pointer flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Previous Page</span>
                    </button>

                    <span className="text-xs font-black text-slate-600 dark:text-slate-300">
                      Page {safePage} of {totalPages} (10 words/page)
                    </span>

                    <button
                      disabled={safePage >= totalPages}
                      onClick={() => handlePageChange(safePage + 1)}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-extrabold disabled:opacity-40 cursor-pointer flex items-center gap-1"
                    >
                      <span>Next Page</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* FINISH SESSION BUTTON AT THE BOTTOM OF CARDS */}
                <div className="text-center pt-2">
                  <button
                    onClick={() => setIsSessionCompleted(true)}
                    className="px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black rounded-2xl text-sm cursor-pointer shadow-lg transition-all inline-flex items-center gap-2"
                  >
                    <Trophy className="w-5 h-5 text-amber-300" />
                    <span>Complete Session & View Results</span>
                  </button>
                </div>
              </div>

            </div>
          )}
        </>
      )}

    </div>
  );
};
