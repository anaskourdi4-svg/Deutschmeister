import React, { useState, useEffect, useMemo } from 'react';
import { VocabItem, QuizQuestionSettings, DEFAULT_QUIZ_SETTINGS } from '../types';
import { AudioPlayer } from './AudioPlayer';
import {
  getVerbConjugations,
  evaluateGermanAnswer,
  evaluatePluralAnswer,
  checkIsIrregularVerb,
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
  RefreshCw,
  Languages,
  Tag,
  BarChart3,
  ArrowLeftRight
} from 'lucide-react';

interface FlashcardQuizProps {
  vocabList: VocabItem[];
  onUpdateVocabMastery: (
    id: string,
    delta: number,
    opts?: { isNewAttempt?: boolean; correctDelta?: number; resetReviewErrors?: boolean }
  ) => void;
  activeSetId?: string;
  quizSettings?: QuizQuestionSettings;
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

  selectedAntonym?: string;
  antonymChecked?: boolean;

  selectedTranslation?: string;
  translationChecked?: boolean;

  prepositionInput?: string;
  prepositionCaseSelected?: string;
  prepositionChecked?: boolean;

  attemptLogged?: boolean;
  wasEverWrong?: boolean;
}

export interface SessionConfig {
  count: number | 'all';
  wordType?: 'all' | 'noun' | 'verb' | 'adjective' | 'expression' | 'others';
  level?: 'all' | 'A1' | 'A2' | 'B1' | 'B2';
  filter?: any;
  hardWordsOnly?: boolean;
  useSrs?: boolean;
}

function getAbbreviatedCase(c?: string): string {
  if (!c) return '';
  const lower = c.toLowerCase().trim();
  if (lower.startsWith('akk')) return 'Akk.';
  if (lower.startsWith('dat')) return 'Dat.';
  if (lower.startsWith('gen')) return 'Gen.';
  if (lower.startsWith('wech')) return 'Wechsel';
  return c;
}

export function getNormalizedType(item: Partial<VocabItem>): 'noun' | 'verb' | 'adjective' | 'expression' | 'others' {
  if (!item) return 'others';
  if (item.type) {
    const t = item.type.toLowerCase();
    if (t === 'noun' || t === 'nomen') return 'noun';
    if (t === 'verb' || t === 'verben') return 'verb';
    if (t === 'adjective' || t === 'adjektiv' || t === 'adj') return 'adjective';
    if (t === 'expression' || t === 'phrase' || t === 'redewendung' || t === 'عبارة' || t === 'تعبير') return 'expression';
    if (t === 'others' || t === 'other' || t === 'preposition') return 'others';
  }
  if (item.gender !== undefined) return 'noun';
  if (item.present3rd || item.praeteritum || item.perfekt) return 'verb';
  return 'others';
}

// Extract preposition phrase from example sentence
function getPrepositionPhraseFromExample(exampleDe?: string, prep?: string): string | null {
  if (!exampleDe || !prep) return null;
  const lowerEx = exampleDe.toLowerCase();
  const lowerPrep = prep.toLowerCase();
  const idx = lowerEx.indexOf(lowerPrep);
  if (idx === -1) return null;
  const rawPhrase = exampleDe.substring(idx).replace(/[.!?]+$/, '').trim();
  return rawPhrase || null;
}

// Fallback map for common German adjective antonyms
function getFallbackAntonym(word: string): string {
  if (!word) return 'unbekannt';
  const cleanWord = word.trim();
  const lower = cleanWord.toLowerCase();

  // Strip common articles or gender indicators
  const stripped = lower.replace(/^(der|die|das|ein|eine)\s+/i, '').trim();

  const map: Record<string, string> = {
    // Housing / Social status
    obdachlos: 'behaust',
    obdachlose: 'Behauste',
    obdachloser: 'Behauster',
    'der obdachlose': 'der Behauste',
    'die obdachlose': 'die Behauste',
    arbeitslos: 'beschäftigt',
    arbeitslose: 'Beschäftigte',

    // Size / Dimension
    groß: 'klein',
    klein: 'groß',
    riesig: 'winzig',
    winzig: 'riesig',
    breit: 'schmal',
    schmal: 'breit',
    dick: 'dünn',
    dünn: 'dick',
    hoch: 'niedrig',
    niedrig: 'hoch',
    lang: 'kurz',
    kurz: 'lang',
    tief: 'flach',
    flach: 'tief',

    // Age / Time
    alt: 'neu',
    neu: 'alt',
    jung: 'alt',
    früh: 'spät',
    spät: 'früh',

    // Speed / Weight / Difficulty / Force
    schnell: 'langsam',
    langsam: 'schnell',
    schwer: 'leicht',
    leicht: 'schwer',
    hart: 'weich',
    weich: 'hart',
    einfach: 'schwierig',
    schwierig: 'einfach',
    stark: 'schwach',
    schwach: 'stark',

    // Value / Cost / Quality / Truth
    teuer: 'billig',
    billig: 'teuer',
    günstig: 'teuer',
    preiswert: 'teuer',
    gut: 'schlecht',
    schlecht: 'gut',
    wichtig: 'unwichtig',
    unwichtig: 'wichtig',
    richtig: 'falsch',
    falsch: 'richtig',
    wahr: 'falsch',

    // Temperature / Atmosphere
    warm: 'kalt',
    kalt: 'warm',
    heiß: 'kalt',
    kühl: 'warm',

    // Appearance / Sound / Cleanliness
    schön: 'hässlich',
    hässlich: 'schön',
    hübsch: 'hässlich',
    attraktiv: 'unattraktiv',
    laut: 'leise',
    leise: 'laut',
    ruhig: 'laut',
    hell: 'dunkel',
    dunkel: 'hell',
    sauber: 'schmutzig',
    schmutzig: 'sauber',
    dreckig: 'sauber',

    // Emotions / Health / Personality
    glücklich: 'traurig',
    traurig: 'glücklich',
    zufrieden: 'unzufrieden',
    unzufrieden: 'zufrieden',
    müde: 'wach',
    wach: 'müde',
    gesund: 'krank',
    krank: 'gesund',
    mutig: 'feige',
    feige: 'mutig',
    fleißig: 'faul',
    faul: 'fleißig',
    klug: 'dumm',
    intelligent: 'dumm',
    dumm: 'klug',

    // Wealth / Physical condition
    reich: 'arm',
    arm: 'reich',
    voll: 'leer',
    leer: 'voll',
    nass: 'trocken',
    trocken: 'nass',
    süß: 'sauer',
    sauer: 'süß',

    // Distance / Safety / Openness
    nah: 'weit',
    weit: 'nah',
    offen: 'geschlossen',
    geschlossen: 'offen',
    sicher: 'unsicher',
    unsicher: 'sicher',
    gefährlich: 'sicher',

    // Manners / Social
    höflich: 'unhöflich',
    unhöflich: 'höflich',
    pünktlich: 'unpünktlich',
    unpünktlich: 'pünktlich',
    freundlich: 'unfreundlich',
    unfreundlich: 'freundlich',
    bekannt: 'unbekannt',
    unbekannt: 'bekannt',
    interessant: 'langweilig',
    langweilig: 'interessant',
    bequem: 'unbequem',
    unbequem: 'bequem',
    gemütlich: 'ungemütlich',
    ungemütlich: 'gemütlich',
  };

  if (map[lower]) return map[lower];
  if (map[stripped]) {
    const antonym = map[stripped];
    if (cleanWord[0] === cleanWord[0].toUpperCase()) {
      return antonym.charAt(0).toUpperCase() + antonym.slice(1);
    }
    return antonym;
  }

  // De-prefix "un-" (e.g. unhöflich -> höflich)
  if (stripped.startsWith('un') && stripped.length > 4) {
    const base = stripped.slice(2);
    if (cleanWord[0] === cleanWord[0].toUpperCase()) {
      return base.charAt(0).toUpperCase() + base.slice(1);
    }
    return base;
  }

  // Add "un-" prefix for standard adjective suffixes
  if (['ig', 'lich', 'bar', 'sam', 'haft'].some(ext => stripped.endsWith(ext))) {
    if (cleanWord[0] === cleanWord[0].toUpperCase()) {
      return 'Un' + stripped;
    }
    return 'un' + stripped;
  }

  // Contextual fallback (avoid returning 'klein' blindly for unrelated words)
  if (cleanWord[0] === cleanWord[0].toUpperCase()) {
    return 'Nicht ' + cleanWord;
  }
  return 'nicht ' + cleanWord;
}

// Generate 3 choices for adjective or verb antonym questions
function getAntonymChoices(item: VocabItem, allVocab: VocabItem[]): string[] {
  const correct = (item.antonym || getFallbackAntonym(item.word)).trim();
  const itemType = getNormalizedType(item);

  const defaultAdjectives = [
    'groß', 'klein', 'alt', 'neu', 'schnell', 'langsam',
    'schwer', 'leicht', 'teuer', 'billig', 'gut', 'schlecht',
    'warm', 'kalt', 'schön', 'laut', 'leise', 'schwierig'
  ];

  const defaultVerbs = [
    'kommen', 'gehen', 'anfangen', 'aufhören', 'öffnen', 'schließen',
    'kaufen', 'verkaufen', 'fragen', 'antworten', 'suchen', 'finden',
    'gewinnen', 'verlieren', 'stehen', 'sitzen', 'bringen', 'holen'
  ];

  const vocabWords = allVocab
    .filter(v => getNormalizedType(v) === itemType)
    .map(v => v.word.trim())
    .filter(w => w && w.toLowerCase() !== item.word.toLowerCase() && w.toLowerCase() !== correct.toLowerCase());

  const defaults = itemType === 'verb' ? defaultVerbs : defaultAdjectives;

  const distractorPool = Array.from(new Set([...vocabWords, ...defaults]))
    .filter(w => w.toLowerCase() !== item.word.toLowerCase() && w.toLowerCase() !== correct.toLowerCase());

  let hash = 0;
  for (let i = 0; i < item.id.length; i++) {
    hash = (hash << 5) - hash + item.id.charCodeAt(i);
    hash |= 0;
  }
  const idx1 = Math.abs(hash) % distractorPool.length;
  const idx2 = Math.abs(hash + 7) % distractorPool.length;

  let d1 = distractorPool[idx1] || (itemType === 'verb' ? 'gehen' : 'langsam');
  let d2 = distractorPool[idx2 === idx1 ? (idx2 + 1) % distractorPool.length : idx2] || (itemType === 'verb' ? 'aufhören' : 'schwer');

  if (d1.toLowerCase() === d2.toLowerCase()) {
    d2 = itemType === 'verb' ? 'schließen' : 'einfach';
  }

  const choices = [correct, d1, d2];
  choices.sort((a, b) => (a.charCodeAt(0) + a.length * 3) - (b.charCodeAt(0) + b.length * 3));

  return choices;
}

// Generate 3 multiple choice options for word type translation questions
function getTranslationChoices(item: VocabItem, allVocab: VocabItem[]): string[] {
  const correct = (item.translationEn || item.translationAr || 'translation').trim();
  const itemType = getNormalizedType(item);

  // Check structural characteristics of `correct`
  const startsWithTo = /^to\s+/i.test(correct) || itemType === 'verb';
  const hasSlash = correct.includes('/') || correct.includes(';') || correct.includes(',');

  // Filter vocabulary items of the EXACT SAME word type
  const matchingTypeVocab = allVocab.filter(v => getNormalizedType(v) === itemType);

  const rawTranslations = matchingTypeVocab
    .map(v => (v.translationEn || v.translationAr || '').trim())
    .filter(t => t && t.toLowerCase() !== correct.toLowerCase());

  // Type-specific default fallback distractor pools
  let defaultPool: string[] = [];
  if (itemType === 'noun') {
    defaultPool = [
      'table', 'chair', 'house', 'car', 'window', 'door', 'city', 'friend', 'book', 'school',
      'water', 'street', 'time', 'day', 'family', 'food', 'sun', 'child', 'money', 'name',
      'student', 'teacher', 'room', 'garden', 'picture', 'question', 'answer', 'bed', 'hand'
    ];
  } else if (itemType === 'verb') {
    defaultPool = [
      'to run', 'to see', 'to eat', 'to go', 'to speak', 'to learn', 'to write', 'to make',
      'to find', 'to bring', 'to understand', 'to work', 'to think', 'to listen', 'to play',
      'to swim', 'to sleep', 'to give', 'to take', 'to ask', 'to buy', 'to help', 'to show'
    ];
  } else if (itemType === 'adjective') {
    defaultPool = [
      'big', 'small', 'good', 'fast', 'slow', 'new', 'old', 'happy', 'cold', 'warm',
      'beautiful', 'early', 'late', 'important', 'easy', 'hard', 'bright', 'quiet', 'heavy'
    ];
  } else {
    defaultPool = [
      'and', 'because', 'with', 'without', 'or', 'but', 'for', 'about', 'from',
      'always', 'never', 'here', 'there', 'today', 'tomorrow', 'often', 'sometimes'
    ];
  }

  // Normalize candidate options so verbs consistently start with 'to ' if target does, etc.
  const candidateSet = new Set<string>();

  [...rawTranslations, ...defaultPool].forEach(cand => {
    let formatted = cand.trim();
    if (!formatted) return;

    // If correct starts with "to " or is verb, ensure candidate starts with "to "
    if (startsWithTo && !/^to\s+/i.test(formatted) && !/[\u0600-\u06FF]/.test(formatted)) {
      formatted = `to ${formatted}`;
    }

    if (formatted.toLowerCase() !== correct.toLowerCase()) {
      candidateSet.add(formatted);
    }
  });

  let candidates = Array.from(candidateSet);

  // If correct has a slash/multiple meanings or is long, pair up shorter candidates to create similar multi-word choices
  if (hasSlash || correct.length > 15) {
    const longCandidates = candidates.filter(c => Math.abs(c.length - correct.length) <= 6);
    if (longCandidates.length < 2 && candidates.length >= 2) {
      const extraCompounds: string[] = [];
      for (let i = 0; i < candidates.length - 1; i += 2) {
        const c1 = candidates[i];
        const c2 = candidates[i + 1].replace(/^to\s+/i, '');
        const combo = `${c1} / ${c2}`;
        if (combo.toLowerCase() !== correct.toLowerCase()) {
          extraCompounds.push(combo);
        }
      }
      candidates = [...candidates, ...extraCompounds];
    }
  }

  // Sort candidates by closeness in length to `correct`
  candidates.sort((a, b) => {
    const diffA = Math.abs(a.length - correct.length);
    const diffB = Math.abs(b.length - correct.length);
    return diffA - diffB;
  });

  // Take top candidates that match length most closely
  const topCandidates = candidates.slice(0, Math.max(8, Math.min(candidates.length, 12)));

  let hash = 0;
  for (let i = 0; i < item.id.length; i++) {
    hash = (hash << 5) - hash + item.id.charCodeAt(i);
    hash |= 0;
  }

  const idx1 = Math.abs(hash) % topCandidates.length;
  let idx2 = Math.abs(hash + 7) % topCandidates.length;
  if (idx2 === idx1) {
    idx2 = (idx1 + 1) % topCandidates.length;
  }

  let d1 = topCandidates[idx1] || defaultPool[0] || 'option 1';
  let d2 = topCandidates[idx2] || defaultPool[1] || 'option 2';

  if (d1.toLowerCase() === d2.toLowerCase()) {
    d2 = topCandidates[(idx2 + 1) % topCandidates.length] || defaultPool[2] || 'option 3';
  }

  const choices = [correct, d1, d2];
  choices.sort((a, b) => (a.charCodeAt(0) + a.length * 3) - (b.charCodeAt(0) + b.length * 3));

  return choices;
}

export const FlashcardQuiz: React.FC<FlashcardQuizProps> = ({
  vocabList,
  onUpdateVocabMastery,
  activeSetId,
  quizSettings,
}) => {
  const settings = quizSettings || DEFAULT_QUIZ_SETTINGS;
  // Track last deck ID to reset practice session when switching decks
  const [prevDeckId, setPrevDeckId] = useState<string | undefined>(activeSetId);

  // Session Configuration
  const [sessionConfig, setSessionConfig] = useState<SessionConfig>({
    count: 10,
    wordType: 'all',
    level: 'all',
    hardWordsOnly: false,
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
  const startSession = (
    count: number | 'all' = sessionConfig.count,
    wordType: 'all' | 'noun' | 'verb' | 'adjective' | 'expression' | 'others' = sessionConfig.wordType || 'all',
    hardWordsOnly: boolean = sessionConfig.hardWordsOnly ?? false,
    useSrs: boolean = sessionConfig.useSrs ?? true,
    level: 'all' | 'A1' | 'A2' | 'B1' | 'B2' = sessionConfig.level || 'all'
  ) => {
    let filtered = vocabList.filter(item => {
      const normType = getNormalizedType(item);

      // 1. Word type filter (supports combining with hardWordsOnly!)
      if (wordType !== 'all' && wordType as string !== 'unmastered') {
        let targetType = wordType;
        if (wordType as string === 'nouns') targetType = 'noun';
        if (wordType as string === 'verbs') targetType = 'verb';
        if (wordType as string === 'adjectives') targetType = 'adjective';
        if (wordType as string === 'expressions') targetType = 'expression';
        
        if (normType !== targetType) return false;
      }

      // 2. CEFR Level filter
      if (level && level !== 'all') {
        const itemLevel = (item.level || 'A1').toUpperCase();
        if (itemLevel !== level.toUpperCase()) return false;
      }

      // 3. Hard words filter (< 60% mastery score)
      if (hardWordsOnly || wordType as string === 'unmastered') {
        if ((item.masteryScore ?? 0) >= 60) return false;
      }

      return true;
    });

    let sorted = [...filtered];

    if (useSrs) {
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

      sorted = sorted.sort((a, b) => calculateSrsUrgency(b) - calculateSrsUrgency(a));
    }

    let sliced = sorted;
    if (count !== 'all' && typeof count === 'number' && count > 0) {
      sliced = sorted.slice(0, count);
    }

    setSessionItems(sliced);
    setAnswers({});
    setCurrentPage(1);
    setIsSessionCompleted(false);
  };

  // Initialize or reset session when deck changes or initial load
  useEffect(() => {
    const deckChanged = activeSetId !== undefined && activeSetId !== prevDeckId;
    if (deckChanged) {
      setPrevDeckId(activeSetId);
    }

    if (vocabList.length > 0 && (sessionItems.length === 0 || deckChanged)) {
      startSession(sessionConfig.count, sessionConfig.wordType || 'all', sessionConfig.hardWordsOnly ?? false, sessionConfig.useSrs ?? true);
    }
  }, [vocabList, activeSetId]);

  // Listen for global practice session events from Header
  useEffect(() => {
    const handleStartSession = (e: Event) => {
      const custom = e as CustomEvent<{
        count: number | 'all';
        wordType?: 'all' | 'noun' | 'verb' | 'adjective' | 'others';
        level?: 'all' | 'A1' | 'A2' | 'B1' | 'B2';
        filter?: any;
        hardWordsOnly?: boolean;
        useSrs?: boolean;
      }>;
      if (custom.detail) {
        const c = custom.detail.count ?? 10;
        const wt = custom.detail.wordType || custom.detail.filter || 'all';
        const lvl = custom.detail.level || 'all';
        const hard = custom.detail.hardWordsOnly ?? false;
        const srs = custom.detail.useSrs ?? true;

        setSessionConfig({ count: c, wordType: wt, level: lvl, hardWordsOnly: hard, useSrs: srs });
        startSession(c, wt, hard, srs, lvl);
      }
    };

    const handleQuizFilter = (e: Event) => {
      const custom = e as CustomEvent<any>;
      if (custom.detail) {
        setSessionConfig(prev => ({ ...prev, wordType: custom.detail }));
        startSession(sessionConfig.count, custom.detail, sessionConfig.hardWordsOnly ?? false, sessionConfig.useSrs ?? true);
      }
    };

    const handleShuffle = () => {
      startSession(sessionConfig.count, sessionConfig.wordType || 'all', sessionConfig.hardWordsOnly ?? false, sessionConfig.useSrs ?? true);
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

    if (item.preposition && item.preposition.trim()) {
      if (st.prepositionChecked) return true;
    }

    const itemType = getNormalizedType(item);

    if (itemType === 'adjective') {
      let answered = true;
      if (settings.adjectives.translation) answered = answered && !!st.translationChecked;
      if (settings.adjectives.antonym) answered = answered && !!st.antonymChecked;
      return answered;
    }
    if (itemType === 'verb') {
      let answered = true;
      if (settings.verbs.translation) answered = answered && !!st.translationChecked;
      if (settings.verbs.present3rd || settings.verbs.praeteritum || settings.verbs.perfekt) answered = answered && !!st.verbChecked;
      if ((settings.verbs.prepositionCase ?? true) && item.preposition) answered = answered && !!st.prepositionChecked;
      return answered;
    }
    if (itemType === 'noun') {
      let answered = true;
      if (settings.nouns.translation) answered = answered && !!st.translationChecked;
      if (settings.nouns.article) answered = answered && !!st.articleChecked;
      if (settings.nouns.plural && item.plural) answered = answered && !!st.pluralChecked;
      return answered;
    }
    if (itemType === 'expression') {
      let answered = true;
      if (settings.expressions?.translation ?? true) answered = answered && !!st.translationChecked;
      if ((settings.expressions?.prepositionCase ?? true) && item.preposition) answered = answered && !!st.prepositionChecked;
      return answered;
    }
    if (itemType === 'others') {
      let answered = true;
      if (settings.others.translation) answered = answered && !!st.translationChecked;
      if (item.preposition) answered = answered && !!st.prepositionChecked;
      return answered;
    }
    return false;
  };

  const answeredCount = sessionItems.filter(isItemAnswered).length;
  const totalInSession = sessionItems.length;
  const progressPercent = totalInSession > 0 ? Math.round((answeredCount / totalInSession) * 100) : 0;

  // Correctness evaluations for Session Summary
  const isItemCorrect = (item: VocabItem) => {
    const st = answers[item.id];
    if (!st) return false;

    const itemType = getNormalizedType(item);

    if (item.preposition && item.preposition.trim()) {
      const isPrepEnabled = 
        itemType === 'verb' ? (settings.verbs.prepositionCase ?? true) :
        itemType === 'expression' ? (settings.expressions?.prepositionCase ?? true) :
        true;

      if (isPrepEnabled) {
        const fullPhrase = getPrepositionPhraseFromExample(item.exampleDe, item.preposition);
        const inputVal = (st.prepositionInput || '').trim();
        const isPrepOk = evaluateGermanAnswer(inputVal, item.preposition) ||
          (fullPhrase ? evaluateGermanAnswer(inputVal, fullPhrase) : false) ||
          (fullPhrase ? inputVal.toLowerCase() === fullPhrase.toLowerCase() : false);
        let isCaseOk = true;
        if (item.prepositionCase) {
          isCaseOk = (st.prepositionCaseSelected || '').trim().toLowerCase() === item.prepositionCase.trim().toLowerCase();
        }
        if (!isPrepOk || !isCaseOk) return false;
      }
    }

    const correctTrans = (item.translationEn || item.translationAr || '').trim().toLowerCase();

    if (itemType === 'adjective') {
      let ok = true;
      if (settings.adjectives.translation) {
        ok = ok && st.selectedTranslation?.trim().toLowerCase() === correctTrans;
      }
      if (settings.adjectives.antonym) {
        const correctAntonym = item.antonym || getFallbackAntonym(item.word);
        ok = ok && st.selectedAntonym?.trim().toLowerCase() === correctAntonym.trim().toLowerCase();
      }
      return ok;
    }

    if (itemType === 'noun') {
      let ok = true;
      if (settings.nouns.translation) {
        ok = ok && st.selectedTranslation?.trim().toLowerCase() === correctTrans;
      }
      if (settings.nouns.article) {
        ok = ok && st.selectedArticle === item.gender;
      }
      if (settings.nouns.plural && item.plural) {
        ok = ok && evaluatePluralAnswer(st.pluralInput || '', item.plural);
      }
      return ok;
    }

    if (itemType === 'verb') {
      let ok = true;
      if (settings.verbs.translation) {
        ok = ok && st.selectedTranslation?.trim().toLowerCase() === correctTrans;
      }
      const conjugations = getVerbConjugations(item);
      if (settings.verbs.present3rd) {
        ok = ok && evaluateGermanAnswer(st.present3rdInput || '', conjugations.present3rd);
      }
      if (settings.verbs.praeteritum) {
        ok = ok && evaluateGermanAnswer(st.praeteritumInput || '', conjugations.praeteritum);
      }
      if (settings.verbs.perfekt) {
        ok = ok && evaluateGermanAnswer(st.perfektInput || '', conjugations.perfekt, true);
      }
      return ok;
    }

    if (itemType === 'expression') {
      let ok = true;
      if (settings.expressions?.translation ?? true) {
        ok = ok && st.selectedTranslation?.trim().toLowerCase() === correctTrans;
      }
      return ok;
    }

    if (itemType === 'others') {
      let ok = true;
      if (settings.others.translation) {
        ok = ok && st.selectedTranslation?.trim().toLowerCase() === correctTrans;
      }
      return ok;
    }

    return false;
  };

  const correctCount = sessionItems.filter(isItemCorrect).length;
  const incorrectCount = answeredCount - correctCount;
  const accuracyPercent = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const updateAnswerField = (id: string, fields: Partial<QuestionAnswerState>) => {
    setAnswers(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        ...fields
      }
    }));
  };

  // Helper for dynamic mastery score badge styling (dim gray -> sky -> teal -> amber -> elegant soft gold)
  const getMasteryBadgeStyle = (score: number) => {
    if (score <= 20) {
      return {
        style: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700',
        icon: null,
        starOnly: false,
      };
    }
    if (score <= 40) {
      return {
        style: 'bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
        icon: null,
        starOnly: false,
      };
    }
    if (score <= 60) {
      return {
        style: 'bg-teal-50 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800',
        icon: null,
        starOnly: false,
      };
    }
    if (score <= 80) {
      return {
        style: 'bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 font-extrabold',
        icon: null,
        starOnly: false,
      };
    }
    // 81 - 100%: Elegant warm metallic gold showing ONLY star icon
    return {
      style: 'bg-gradient-to-r from-amber-100 via-amber-200/70 to-yellow-100 dark:from-amber-950/90 dark:via-yellow-950/80 dark:to-amber-950/90 text-amber-950 dark:text-amber-200 border-amber-400/80 dark:border-amber-600/80 shadow-2xs font-black',
      icon: <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />,
      starOnly: true,
    };
  };

  // Helper to record sub-check results per card attempt
  const recordSubCheckResult = (
    item: VocabItem,
    isCheckCorrect: boolean,
    positiveDelta: number = 15,
    negativeDelta: number = -10
  ) => {
    const qState = answers[item.id] || {};
    const attemptLogged = !!qState.attemptLogged;
    const wasEverWrong = !!qState.wasEverWrong;

    let delta = 0;
    let isNewAttempt = false;
    let correctDelta = 0;
    let newWasEverWrong = wasEverWrong;

    if (!attemptLogged) {
      // First sub-check on this card
      isNewAttempt = true;
      if (isCheckCorrect) {
        delta = positiveDelta;
        correctDelta = 1;
        newWasEverWrong = false;
      } else {
        delta = negativeDelta;
        correctDelta = 0;
        newWasEverWrong = true;
      }
    } else {
      // Attempt was already logged for this card
      isNewAttempt = false;
      if (!isCheckCorrect) {
        if (!wasEverWrong) {
          // First error on this card after a previously correct sub-check
          correctDelta = -1; // revert previous correct credit
          delta = negativeDelta - positiveDelta;
          newWasEverWrong = true;
        } else {
          // Already logged as wrong previously on this card -> no extra attempt or error penalty
          correctDelta = 0;
          delta = 0;
        }
      } else {
        // Correct sub-check on an already logged card
        if (!wasEverWrong) {
          correctDelta = 0; // already credited as correct
          delta = 5; // small mastery bonus for completing another sub-check
        } else {
          correctDelta = 0; // cannot make card completely correct if an error occurred earlier
          delta = 0;
        }
      }
    }

    updateAnswerField(item.id, {
      attemptLogged: true,
      wasEverWrong: newWasEverWrong
    });

    const resetReviewErrors = isCheckCorrect && !newWasEverWrong;

    onUpdateVocabMastery(item.id, delta, { isNewAttempt, correctDelta, resetReviewErrors });
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

    recordSubCheckResult(item, isCorrect, 15, -10);
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

    recordSubCheckResult(item, isCorrect, 15, -10);
  };

  // 3. VERB CONJUGATIONS CHECK (Points awarded separately for each correct tense)
  const handleVerbCheck = (item: VocabItem) => {
    const qState = answers[item.id] || {};
    if (qState.verbChecked) return;

    const conjugations = getVerbConjugations(item);
    const presOk = evaluateGermanAnswer(qState.present3rdInput || '', conjugations.present3rd);
    const praetOk = evaluateGermanAnswer(qState.praeteritumInput || '', conjugations.praeteritum);
    const perfOk = evaluateGermanAnswer(qState.perfektInput || '', conjugations.perfekt, true);

    updateAnswerField(item.id, {
      verbChecked: true
    });

    const isAllCorrect = presOk && praetOk && perfOk;
    recordSubCheckResult(item, isAllCorrect, 20, -10);
  };

  // 4. ADJECTIVE ANTONYM CHECK
  const handleAntonymClick = (item: VocabItem, selectedChoice: string) => {
    const qState = answers[item.id] || {};
    if (qState.antonymChecked) return;

    const correctAntonym = item.antonym || getFallbackAntonym(item.word);
    const isCorrect = selectedChoice.trim().toLowerCase() === correctAntonym.trim().toLowerCase();

    updateAnswerField(item.id, {
      selectedAntonym: selectedChoice,
      antonymChecked: true
    });

    recordSubCheckResult(item, isCorrect, 15, -10);
  };

  // 5. TRANSLATION CHECK
  const handleTranslationClick = (item: VocabItem, selectedChoice: string) => {
    const qState = answers[item.id] || {};
    if (qState.translationChecked) return;

    const correctTranslation = (item.translationEn || item.translationAr || '').trim();
    const isCorrect = selectedChoice.trim().toLowerCase() === correctTranslation.toLowerCase();

    updateAnswerField(item.id, {
      selectedTranslation: selectedChoice,
      translationChecked: true
    });

    recordSubCheckResult(item, isCorrect, 15, -10);
  };

  // 6. SENTENCE COMPLETION (PREPOSITION & CASE) CHECK
  const handlePrepositionCheck = (item: VocabItem) => {
    const qState = answers[item.id] || {};
    if (qState.prepositionChecked) return;

    const fullPhrase = getPrepositionPhraseFromExample(item.exampleDe, item.preposition);
    const inputVal = (qState.prepositionInput || '').trim();

    const prepOk = evaluateGermanAnswer(inputVal, item.preposition || '') ||
      (fullPhrase ? evaluateGermanAnswer(inputVal, fullPhrase) : false) ||
      (fullPhrase ? inputVal.toLowerCase() === fullPhrase.toLowerCase() : false);

    let caseOk = true;
    if (item.prepositionCase) {
      caseOk = (qState.prepositionCaseSelected || '').trim().toLowerCase() === item.prepositionCase.trim().toLowerCase();
    }

    const isCorrect = prepOk && caseOk;

    updateAnswerField(item.id, {
      prepositionChecked: true
    });

    recordSubCheckResult(item, isCorrect, 20, -10);
  };

  const renderSentenceWithBlank = (item: VocabItem) => {
    const rawPrep = (item.preposition || '').trim();
    if (!rawPrep) return item.word;

    const corePrep = rawPrep.split(/[\/\s\(,]/)[0].trim();

    if (item.exampleDe && item.exampleDe.trim()) {
      const regex = new RegExp(`\\b${corePrep.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}\\b`, 'gi');
      if (regex.test(item.exampleDe)) {
        return item.exampleDe.replace(regex, '___');
      }
    }

    // Clean word by removing preposition tags or parentheses
    const cleanWord = item.word
      .replace(/\s*\([^)]*\)/g, '')
      .replace(/\b(auf|über|an|für|mit|in|vor|bei|nach|zu|um|aus|von|gegen)\b.*/gi, '')
      .trim()
      .toLowerCase();

    const defaultSentences: Record<string, string> = {
      'sich freuen': 'Ich freue mich ___ die Hilfe.',
      'freuen': 'Ich freue mich ___ die Hilfe.',
      'warten': 'Wir warten ___ den Bus.',
      'sich interessieren': 'Er interessiert sich ___ Kunst.',
      'interessieren': 'Er interessiert sich ___ Kunst.',
      'denken': 'Ich denke oft ___ dich.',
      'träumen': 'Er träumt ___ einem schönen Urlaub.',
      'bitten': 'Sie bittet ___ dringende Hilfe.',
      'danken': 'Ich danke dir ___ deine Unterstützung.',
      'sprechen': 'Wir sprechen ___ das neue Projekt.',
      'diskutieren': 'Sie diskutieren ___ die beste Lösung.',
      'sich erinnern': 'Ich erinnere mich ___ unsere gemeinsame Reise.',
      'erinnern': 'Ich erinnere mich ___ unsere gemeinsame Reise.',
      'sich ärgern': 'Er ärgert sich ___ den lauten Lärm.',
      'ärgern': 'Er ärgert sich ___ den lauten Lärm.',
      'sich gewöhnen': 'Sie gewöhnt sich ___ das neue Wetter.',
      'gewöhnen': 'Sie gewöhnt sich ___ das neue Wetter.',
      'achten': 'Bitte achten Sie ___ die Verkehrsregeln.',
      'hoffen': 'Wir hoffen ___ gutes Wetter.',
      'teilnehmen': 'Er nimmt ___ dem Sprachkurs teil.',
      'fragen': 'Wir fragen ___ dem richtigen Weg.',
      'suchen': 'Er sucht ___ einer guten Lösung.',
      'passen': 'Das Hemd passt gut ___ dieser Hose.',
      'gehören': 'Das Buch gehört ___ mir.',
      'abhängen': 'Es hängt ___ den Umständen ab.',
      'rechnen': 'Wir rechnen ___ deiner pünktlichen Ankunft.',
      'zweifeln': 'Sie zweifelt ___ seiner Aussage.',
      'sich verlassen': 'Du kannst dich ___ mich verlassen.',
      'verlassen': 'Du kannst dich ___ mich verlassen.',
      'sich bewerben': 'Er bewirbt sich ___ die freie Stelle.',
      'bewerben': 'Er bewirbt sich ___ die freie Stelle.',
      'sich beschäftigen': 'Sie beschäftigt sich ___ dem wichtigen Thema.',
      'beschäftigen': 'Sie beschäftigt sich ___ dem wichtigen Thema.',
      'sich vorbereiten': 'Wir bereiten uns ___ die Prüfung vor.',
      'vorbereiten': 'Wir bereiten uns ___ die Prüfung vor.',
      'sich informieren': 'Er informiert sich ___ die Sprachkurse.',
      'informieren': 'Er informiert sich ___ die Sprachkurse.',
      'sich verabreden': 'Ich verabrede mich ___ meinen Freunden.',
      'verabreden': 'Ich verabrede mich ___ meinen Freunden.',
      'sich unterhalten': 'Wir unterhalten uns ___ den neuen Film.',
      'unterhalten': 'Wir unterhalten uns ___ den neuen Film.',
      'sich beschweren': 'Kunden beschweren sich ___ den Service.',
      'beschweren': 'Kunden beschweren sich ___ den Service.',
      'einladen': 'Ich lade dich ___ meiner Feier ein.',
      'lachen': 'Alle lachen ___ den guten Witz.',
      'schreiben': 'Er schreibt einen Brief ___ seine Familie.',
      'telefonieren': 'Sie telefoniert gerade ___ ihrer Großmutter.',
      'gratulieren': 'Wir gratulieren dir ___ deinem Geburtstag.',
      'helfen': 'Er hilft der Frau ___ den schweren Koffern.',
      'erzählen': 'Opa erzählt eine Geschichte ___ früher.',
      'berichten': 'Die Zeitung berichtet ___ den Vorfall.',
      'arbeiten': 'Sie arbeiten gemeinsam ___ einem neuen Projekt.',
      'anfangen': 'Wir fangen jetzt ___ der Arbeit an.',
      'aufhören': 'Er hört endlich ___ dem Rauchen auf.',
    };

    if (defaultSentences[cleanWord]) {
      return defaultSentences[cleanWord];
    }

    const baseWord = item.word.replace(/\s*\([^)]*\)/g, '').replace(/\b(auf|über|an|für|mit|in|vor|bei|nach|zu|um|aus|von|gegen)\b.*/gi, '').trim();
    if (baseWord.toLowerCase().startsWith('sich ')) {
      const verbPart = baseWord.substring(5).trim();
      let conjugated = verbPart;
      if (verbPart.endsWith('en')) {
        conjugated = verbPart.slice(0, -2) + 't';
      }
      return `Er / Sie ${conjugated} sich ___ das Thema.`;
    }

    let conjugated = baseWord;
    if (item.present3rd) {
      conjugated = item.present3rd.split(/[\/\s,]/)[0].trim();
    } else if (baseWord.toLowerCase().endsWith('en')) {
      conjugated = baseWord.slice(0, -2) + 't';
    }

    return `Er / Sie ${conjugated} ___ das Thema.`;
  };

  const getPrepositionChoices = (item: VocabItem): string[] => {
    const rawPrep = (item.preposition || '').trim();
    const correct = rawPrep.split(/[\/\s\(,]/)[0].trim().toLowerCase();
    if (!correct) return [];

    const commonPreps = ['auf', 'über', 'an', 'für', 'mit', 'in', 'vor', 'bei', 'nach', 'zu', 'um', 'aus', 'von', 'gegen'];
    const available = commonPreps.filter(p => p.toLowerCase() !== correct);

    let hash = 0;
    for (let i = 0; i < (item.id || '').length; i++) {
      hash = (hash << 5) - hash + item.id.charCodeAt(i);
      hash |= 0;
    }

    const distractors: string[] = [];
    const count = available.length;
    if (count >= 2) {
      const idx1 = Math.abs(hash) % count;
      distractors.push(available[idx1]);
      const idx2 = (idx1 + 1 + (Math.abs(hash) % (count - 1))) % count;
      distractors.push(available[idx2]);
    }

    const choices = [correct, ...distractors];
    const sortIndex = (str: string) => {
      let charSum = 0;
      for (let i = 0; i < str.length; i++) charSum += str.charCodeAt(i);
      return (charSum + Math.abs(hash)) % 100;
    };
    return choices.sort((a, b) => sortIndex(a) - sortIndex(b));
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

          {/* QUESTION TYPE ACCURACY BREAKDOWN */}
          {(() => {
            const translationAns = sessionItems.filter(it => answers[it.id]?.translationChecked).length;
            const translationCorr = sessionItems.filter(it => {
              const st = answers[it.id];
              if (!st?.translationChecked) return false;
              const target = (it.translationEn || it.translationAr || '').trim().toLowerCase();
              return st.selectedTranslation?.trim().toLowerCase() === target;
            }).length;

            const articleAns = sessionItems.filter(it => answers[it.id]?.articleChecked).length;
            const articleCorr = sessionItems.filter(it => {
              const st = answers[it.id];
              if (!st?.articleChecked) return false;
              return st.selectedArticle === it.gender;
            }).length;

            const pluralAns = sessionItems.filter(it => answers[it.id]?.pluralChecked).length;
            const pluralCorr = sessionItems.filter(it => {
              const st = answers[it.id];
              if (!st?.pluralChecked) return false;
              return evaluatePluralAnswer(st.pluralInput || '', it.plural);
            }).length;

            const verbAns = sessionItems.filter(it => answers[it.id]?.verbChecked).length;
            const verbCorr = sessionItems.filter(it => {
              const st = answers[it.id];
              if (!st?.verbChecked) return false;
              const conjugations = getVerbConjugations(it);
              const presOk = !settings.verbs.present3rd || evaluateGermanAnswer(st.present3rdInput || '', conjugations.present3rd);
              const praetOk = !settings.verbs.praeteritum || evaluateGermanAnswer(st.praeteritumInput || '', conjugations.praeteritum);
              const perfOk = !settings.verbs.perfekt || evaluateGermanAnswer(st.perfektInput || '', conjugations.perfekt, true);
              return presOk && praetOk && perfOk;
            }).length;

            const antonymAns = sessionItems.filter(it => answers[it.id]?.antonymChecked).length;
            const antonymCorr = sessionItems.filter(it => {
              const st = answers[it.id];
              if (!st?.antonymChecked) return false;
              const target = (it.antonym || getFallbackAntonym(it.word)).trim().toLowerCase();
              return st.selectedAntonym?.trim().toLowerCase() === target;
            }).length;

            const qTypeStats = [
              { key: 'translation', labelEn: 'Translation', icon: Languages, ans: translationAns, corr: translationCorr },
              { key: 'article', labelEn: 'Articles', icon: Tag, ans: articleAns, corr: articleCorr },
              { key: 'plural', labelEn: 'Plural Form', icon: Layers, ans: pluralAns, corr: pluralCorr },
              { key: 'conjugation', labelEn: 'Verb Conjugation', icon: Zap, ans: verbAns, corr: verbCorr },
              { key: 'antonym', labelEn: 'Antonyms', icon: ArrowLeftRight, ans: antonymAns, corr: antonymCorr },
            ].filter(q => q.ans > 0).map(q => ({
              ...q,
              pct: Math.round((q.corr / q.ans) * 100)
            }));

            if (qTypeStats.length === 0) return null;

            return (
              <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Accuracy by Question Type
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {qTypeStats.map(stat => {
                    const IconComponent = stat.icon;
                    const isHigh = stat.pct >= 80;
                    const isMed = stat.pct >= 50 && stat.pct < 80;

                    const barBgClass = isHigh ? 'bg-emerald-500' : isMed ? 'bg-amber-500' : 'bg-rose-500';
                    const badgeClass = isHigh
                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                      : isMed
                      ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                      : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800';

                    return (
                      <div
                        key={stat.key}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-2.5 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200 shrink-0">
                              <IconComponent className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-extrabold text-slate-900 dark:text-white text-xs block">
                                {stat.labelEn}
                              </span>
                            </div>
                          </div>

                          <span className={`px-2.5 py-1 rounded-xl text-xs font-black border ${badgeClass}`}>
                            {stat.pct}%
                          </span>
                        </div>

                        {/* Progress Bar & Sub-counts */}
                        <div className="space-y-1">
                          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 rounded-full ${barBgClass}`}
                              style={{ width: `${stat.pct}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 pt-0.5">
                            <span>Correct ({stat.corr} of {stat.ans})</span>
                            <span>{stat.corr}/{stat.ans}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

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
        <div className="pb-28">
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
              {pageItems.map((item) => {
                const qState = answers[item.id] || {};
                const normType = getNormalizedType(item);
                const isNoun = normType === 'noun';
                const isVerb = normType === 'verb';
                const isAdj = normType === 'adjective';
                const isExpr = normType === 'expression';
                const isOther = normType === 'others';

                const liveMasteryScore = vocabList.find(v => v.id === item.id)?.masteryScore ?? item.masteryScore ?? 0;
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
                    {/* CARD TOP BAR */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        {isAdj ? (
                          <span className="px-2.5 py-1 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-extrabold text-xs flex items-center gap-1.5 border border-amber-200 dark:border-amber-900">
                            <span>Adjective</span>
                          </span>
                        ) : isNoun ? (
                          <span className="px-2.5 py-1 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-extrabold text-xs flex items-center gap-1.5 border border-blue-200 dark:border-blue-900">
                            <BookOpen className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span>Noun</span>
                          </span>
                        ) : isVerb ? (
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-900">
                            <Zap className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>Verb</span>
                          </span>
                        ) : isExpr ? (
                          <span className="px-2.5 py-1 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-extrabold text-xs flex items-center gap-1.5 border border-purple-200 dark:border-purple-900">
                            <span>Expression</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold text-xs border border-slate-200 dark:border-slate-700 truncate max-w-[150px] whitespace-nowrap" title="Others">
                            <span className="truncate">Others</span>
                          </span>
                        )}

                        {item.category && (
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 hidden sm:inline">
                            ({item.category})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {(() => {
                          const badge = getMasteryBadgeStyle(liveMasteryScore);
                          return (
                            <span className={`text-xs font-black px-2.5 py-1 rounded-xl border flex items-center gap-1.5 transition-all ${badge.style}`}>
                              {badge.icon}
                              {!badge.starOnly && <span>Mastery: {liveMasteryScore}%</span>}
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {/* WORD DISPLAY */}
                    <div className="flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 dir-ltr">
                      <span className="text-2xl font-black text-slate-900 dark:text-white">
                        {item.word}
                      </span>
                      <AudioPlayer text={isNoun && item.gender ? `${item.gender} ${item.word}` : item.word} size="md" />
                    </div>

                    {/* EXERCISE TYPES: ADJECTIVE / NOUN / VERB / OTHERS */}
                    {isAdj ? (
                      /* ADJECTIVE EXERCISE: TRANSLATION & ANTONYM */
                      <div className="space-y-4 pt-1">
                        {/* 1. Translation Question */}
                        {settings.adjectives.translation && (
                          <div className="space-y-2">
                            <label className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                              {settings.adjectives.antonym ? '1. ' : ''}Select Translation for <span className="text-blue-600 dark:text-blue-400 font-black px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950 rounded-md dir-ltr">"{item.word}"</span>:
                            </label>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 dir-ltr">
                              {getTranslationChoices(item, vocabList).map(choice => {
                                const isSelected = qState.selectedTranslation === choice;
                                const correctTranslation = (item.translationEn || item.translationAr || '').trim();
                                const isTarget = choice.trim().toLowerCase() === correctTranslation.toLowerCase();

                                let styleClasses = 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50/50';

                                if (qState.translationChecked) {
                                  if (isTarget) {
                                    styleClasses = 'bg-emerald-600 text-white border-emerald-600 font-black shadow-xs';
                                  } else if (isSelected && !isTarget) {
                                    styleClasses = 'bg-rose-600 text-white border-rose-600 font-black';
                                  } else {
                                    styleClasses = 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-800 opacity-40';
                                  }
                                } else if (isSelected) {
                                  styleClasses = 'bg-blue-600 text-white border-blue-600 font-black';
                                }

                                return (
                                  <button
                                    key={choice}
                                    type="button"
                                    disabled={qState.translationChecked}
                                    onClick={() => handleTranslationClick(item, choice)}
                                    className={`py-3 px-4 rounded-2xl border text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-between gap-2 min-w-0 text-left ${styleClasses}`}
                                  >
                                    <span className="break-words leading-snug">{choice}</span>
                                    {qState.translationChecked && isTarget && <Check className="w-4 h-4 stroke-[3] shrink-0" />}
                                    {qState.translationChecked && isSelected && !isTarget && <X className="w-4 h-4 stroke-[3] shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* 2. Antonym Question */}
                        {settings.adjectives.antonym && (
                          <div className={`space-y-2 ${settings.adjectives.translation ? 'pt-3 border-t border-slate-100 dark:border-slate-800' : ''}`}>
                            <label className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                              {settings.adjectives.translation ? '2. ' : ''}Select the Opposite (Antonym) of <span className="text-blue-600 dark:text-blue-400 font-black px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950 rounded-md dir-ltr">"{item.word}"</span>:
                            </label>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 dir-ltr">
                              {getAntonymChoices(item, vocabList).map(choice => {
                                const isSelected = qState.selectedAntonym === choice;
                                const correctAntonym = item.antonym || getFallbackAntonym(item.word);
                                const isTarget = choice.trim().toLowerCase() === correctAntonym.trim().toLowerCase();

                                let styleClasses = 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50/50';

                                if (qState.antonymChecked) {
                                  if (isTarget) {
                                    styleClasses = 'bg-emerald-600 text-white border-emerald-600 font-black shadow-xs';
                                  } else if (isSelected && !isTarget) {
                                    styleClasses = 'bg-rose-600 text-white border-rose-600 font-black';
                                  } else {
                                    styleClasses = 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-800 opacity-40';
                                  }
                                } else if (isSelected) {
                                  styleClasses = 'bg-blue-600 text-white border-blue-600 font-black';
                                }

                                return (
                                  <button
                                    key={choice}
                                    type="button"
                                    disabled={qState.antonymChecked}
                                    onClick={() => handleAntonymClick(item, choice)}
                                    className={`py-3 px-4 rounded-2xl border text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-between gap-2 min-w-0 text-left ${styleClasses}`}
                                  >
                                    <span className="break-words leading-snug">{choice}</span>
                                    {qState.antonymChecked && isTarget && <Check className="w-4 h-4 stroke-[3] shrink-0" />}
                                    {qState.antonymChecked && isSelected && !isTarget && <X className="w-4 h-4 stroke-[3] shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : isNoun ? (
                      <div className="space-y-4 pt-1">
                        
                        {/* 1. English Translation Question (3 options side-by-side) */}
                        {settings.nouns.translation && (
                          <div className="space-y-2">
                            <label className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                              1. Select English Translation for <span className="text-blue-600 dark:text-blue-400 font-black px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950 rounded-md dir-ltr">"{item.word}"</span>:
                            </label>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 dir-ltr">
                              {getTranslationChoices(item, vocabList).map(choice => {
                                const isSelected = qState.selectedTranslation === choice;
                                const correctTranslation = (item.translationEn || item.translationAr || '').trim();
                                const isTarget = choice.trim().toLowerCase() === correctTranslation.toLowerCase();

                                let styleClasses = 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50/50';

                                if (qState.translationChecked) {
                                  if (isTarget) {
                                    styleClasses = 'bg-emerald-600 text-white border-emerald-600 font-black shadow-xs';
                                  } else if (isSelected && !isTarget) {
                                    styleClasses = 'bg-rose-600 text-white border-rose-600 font-black';
                                  } else {
                                    styleClasses = 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-800 opacity-40';
                                  }
                                } else if (isSelected) {
                                  styleClasses = 'bg-blue-600 text-white border-blue-600 font-black';
                                }

                                return (
                                  <button
                                    key={choice}
                                    type="button"
                                    disabled={qState.translationChecked}
                                    onClick={() => handleTranslationClick(item, choice)}
                                    className={`py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-between gap-2 min-w-0 text-left ${styleClasses}`}
                                  >
                                    <span className="break-words leading-snug">{choice}</span>
                                    {qState.translationChecked && isTarget && <Check className="w-4 h-4 stroke-[3] shrink-0" />}
                                    {qState.translationChecked && isSelected && !isTarget && <X className="w-4 h-4 stroke-[3] shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* 2. Artikel Selection */}
                        {settings.nouns.article && (
                          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <label className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                              2. Select Article (Artikel):
                            </label>
                            <div className="grid grid-cols-3 gap-2.5 dir-ltr">
                              {(['der', 'das', 'die'] as const).map(art => {
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
                                    className={`py-2.5 px-3 rounded-2xl border text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${styleClasses}`}
                                  >
                                    <span>{art}</span>
                                    {qState.articleChecked && isTargetGender && <Check className="w-4 h-4 stroke-[3]" />}
                                    {qState.articleChecked && isSelected && !isTargetGender && <X className="w-4 h-4 stroke-[3]" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* 3. Plural Input + "Check" button */}
                        {settings.nouns.plural && (
                          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <label className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                              3. Enter Plural Form (Plural):
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
                              <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 block px-1">
                                Correct: <span className="font-extrabold dir-ltr">{item.plural}</span>
                              </span>
                            )}
                          </div>
                        )}

                      </div>
                    ) : isVerb ? (
                      /* VERB EXERCISE */
                      <div className="space-y-4 pt-1">
                        {/* 1. English Translation Question (3 options side-by-side) */}
                        {settings.verbs.translation && (
                          <div className="space-y-2">
                            <label className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                              1. Select English Translation for <span className="text-emerald-600 dark:text-emerald-400 font-black px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950 rounded-md dir-ltr">"{item.word}"</span>:
                            </label>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 dir-ltr">
                              {getTranslationChoices(item, vocabList).map(choice => {
                                const isSelected = qState.selectedTranslation === choice;
                                const correctTranslation = (item.translationEn || item.translationAr || '').trim();
                                const isTarget = choice.trim().toLowerCase() === correctTranslation.toLowerCase();

                                let styleClasses = 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:bg-emerald-50/50';

                                if (qState.translationChecked) {
                                  if (isTarget) {
                                    styleClasses = 'bg-emerald-600 text-white border-emerald-600 font-black shadow-xs';
                                  } else if (isSelected && !isTarget) {
                                    styleClasses = 'bg-rose-600 text-white border-rose-600 font-black';
                                  } else {
                                    styleClasses = 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-800 opacity-40';
                                  }
                                } else if (isSelected) {
                                  styleClasses = 'bg-emerald-600 text-white border-emerald-600 font-black';
                                }

                                return (
                                  <button
                                    key={choice}
                                    type="button"
                                    disabled={qState.translationChecked}
                                    onClick={() => handleTranslationClick(item, choice)}
                                    className={`py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-between gap-2 min-w-0 text-left ${styleClasses}`}
                                  >
                                    <span className="break-words leading-snug">{choice}</span>
                                    {qState.translationChecked && isTarget && <Check className="w-4 h-4 stroke-[3] shrink-0" />}
                                    {qState.translationChecked && isSelected && !isTarget && <X className="w-4 h-4 stroke-[3] shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* 2. Verb Conjugations */}
                        {(settings.verbs.present3rd || settings.verbs.praeteritum || settings.verbs.perfekt) && (
                          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                              2. Verb Forms & Conjugations:
                            </span>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 dir-ltr">
                              {/* Present 3rd */}
                              {settings.verbs.present3rd && (
                                <div className="space-y-1">
                                  <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400 block text-left">
                                    Present (er/sie/es):
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
                                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 block">
                                      Correct: {conjugations.present3rd}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Praeteritum */}
                              {settings.verbs.praeteritum && (
                                <div className="space-y-1">
                                  <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400 block text-left">
                                    Past (Präteritum):
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
                                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 block">
                                      Correct: {conjugations.praeteritum}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Perfekt */}
                              {settings.verbs.perfekt && (
                                <div className="space-y-1">
                                  <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400 block text-left">
                                    Perfect (Perfekt):
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
                                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 block">
                                      Correct: {conjugations.perfekt}
                                    </span>
                                  )}
                                </div>
                              )}
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
                                <span className="p-1 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle2 className="w-5 h-5" />
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* OTHERS / EXPRESSION EXERCISE: 3 MULTIPLE CHOICE TRANSLATION OPTIONS */
                      ((normType === 'expression') ? (settings.expressions?.translation ?? true) : settings.others.translation) ? (
                        <div className="space-y-3 pt-1">
                          <label className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                            Select the correct translation for <span className="text-blue-600 dark:text-blue-400 font-black px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950 rounded-md">"{item.word}"</span>:
                          </label>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 dir-ltr">
                            {getTranslationChoices(item, vocabList).map(choice => {
                              const isSelected = qState.selectedTranslation === choice;
                              const correctTranslation = (item.translationEn || item.translationAr || '').trim();
                              const isTarget = choice.trim().toLowerCase() === correctTranslation.toLowerCase();

                              let styleClasses = 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50/50';

                              if (qState.translationChecked) {
                                if (isTarget) {
                                  styleClasses = 'bg-emerald-600 text-white border-emerald-600 font-black shadow-xs';
                                } else if (isSelected && !isTarget) {
                                  styleClasses = 'bg-rose-600 text-white border-rose-600 font-black';
                                } else {
                                  styleClasses = 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-800 opacity-40';
                                }
                              } else if (isSelected) {
                                styleClasses = 'bg-blue-600 text-white border-blue-600 font-black';
                              }

                              return (
                                <button
                                  key={choice}
                                  type="button"
                                  disabled={qState.translationChecked}
                                  onClick={() => handleTranslationClick(item, choice)}
                                  className={`py-3 px-4 rounded-2xl border text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-between gap-2 min-w-0 text-left ${styleClasses}`}
                                >
                                  <span className="break-words leading-snug">{choice}</span>
                                  {qState.translationChecked && isTarget && <Check className="w-4 h-4 stroke-[3] shrink-0" />}
                                  {qState.translationChecked && isSelected && !isTarget && <X className="w-4 h-4 stroke-[3] shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : null
                    )}

                    {/* Sentence Completion Question Block for items with Prepositions */}
                    {item.preposition && (
                      normType === 'verb' ? (settings.verbs.prepositionCase ?? true) :
                      normType === 'expression' ? (settings.expressions?.prepositionCase ?? true) :
                      true
                    ) && (() => {
                      const prepChoices = getPrepositionChoices(item);
                      const inputVal = (qState.prepositionInput || '').trim();
                      const selectedCase = qState.prepositionCaseSelected || '';

                      const rawPrep = (item.preposition || '').trim();
                      const coreTargetPrep = rawPrep.split(/[\/\s\(,]/)[0].trim().toLowerCase();
                      const isPrepOk = inputVal.toLowerCase() === rawPrep.toLowerCase() || (!!coreTargetPrep && inputVal.toLowerCase() === coreTargetPrep);
                      const isCaseOk = !item.prepositionCase || selectedCase.trim().toLowerCase() === item.prepositionCase.trim().toLowerCase();
                      const isOverallOk = isPrepOk && isCaseOk;

                      return (
                        <div className="space-y-3.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                          <label className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                            Sentence Completion (Preposition & Grammatical Case):
                          </label>

                          {/* Prompt Sentence with Blank */}
                          <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 rounded-2xl text-xs sm:text-sm font-black text-indigo-950 dark:text-indigo-200 dir-ltr flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            <span>
                              {renderSentenceWithBlank(item)}
                            </span>
                          </div>

                          {/* 1. Preposition Selection (3 choices) */}
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400 block text-left">
                              Select Preposition (اختر حرف الجر):
                            </span>
                            <div className="grid grid-cols-3 gap-2 dir-ltr">
                              {prepChoices.map(choice => {
                                const isSelected = inputVal.toLowerCase() === choice.toLowerCase();
                                const isTargetPrep = choice.toLowerCase() === rawPrep.toLowerCase() || choice.toLowerCase() === coreTargetPrep;

                                let styleClasses = 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-indigo-500';

                                if (qState.prepositionChecked) {
                                  if (isTargetPrep) {
                                    styleClasses = 'bg-emerald-600 text-white border-emerald-600 font-black shadow-xs';
                                  } else if (isSelected && !isTargetPrep) {
                                    styleClasses = 'bg-rose-600 text-white border-rose-600 font-black';
                                  } else {
                                    styleClasses = 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-800 opacity-40';
                                  }
                                } else if (isSelected) {
                                  styleClasses = 'bg-indigo-600 text-white border-indigo-600 font-black shadow-xs';
                                }

                                return (
                                  <button
                                    key={choice}
                                    type="button"
                                    disabled={qState.prepositionChecked}
                                    onClick={() => updateAnswerField(item.id, { prepositionInput: choice })}
                                    className={`py-2 px-3 rounded-xl border text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${styleClasses}`}
                                  >
                                    <span>{choice}</span>
                                    {qState.prepositionChecked && isTargetPrep && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                    {qState.prepositionChecked && isSelected && !isTargetPrep && <X className="w-3.5 h-3.5 stroke-[3]" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* 2. Grammatical Case Selection */}
                          {item.prepositionCase && (
                            <div className="space-y-1.5 pt-1">
                              <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400 block text-left">
                                Select Grammatical Case (اختر الحالة الإعرابية):
                              </span>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 dir-ltr">
                                {(['Akkusativ', 'Dativ', 'Genitiv', 'Wechsel'] as const).map(cName => {
                                  const isSelected = selectedCase === cName;
                                  const isTargetCase = item.prepositionCase === cName;

                                  let styleClasses = 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-indigo-500';

                                  if (qState.prepositionChecked) {
                                    if (isTargetCase) {
                                      styleClasses = 'bg-emerald-600 text-white border-emerald-600 font-black shadow-xs';
                                    } else if (isSelected && !isTargetCase) {
                                      styleClasses = 'bg-rose-600 text-white border-rose-600 font-black';
                                    } else {
                                      styleClasses = 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-800 opacity-40';
                                    }
                                  } else if (isSelected) {
                                    styleClasses = 'bg-indigo-600 text-white border-indigo-600 font-black shadow-xs';
                                  }

                                  return (
                                    <button
                                      key={cName}
                                      type="button"
                                      disabled={qState.prepositionChecked}
                                      onClick={() => updateAnswerField(item.id, { prepositionCaseSelected: cName })}
                                      className={`py-2 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${styleClasses}`}
                                    >
                                      <span>{getAbbreviatedCase(cName)}</span>
                                      {qState.prepositionChecked && isTargetCase && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                      {qState.prepositionChecked && isSelected && !isTargetCase && <X className="w-3.5 h-3.5 stroke-[3]" />}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Check Button or Results Banner */}
                          <div className="pt-2">
                            {!qState.prepositionChecked ? (
                              <button
                                type="button"
                                disabled={!inputVal || (item.prepositionCase && !selectedCase)}
                                onClick={() => handlePrepositionCheck(item)}
                                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-2xl text-xs cursor-pointer shadow-md transition-all flex items-center justify-center gap-2"
                              >
                                <Check className="w-4 h-4" />
                                <span>Check Answer</span>
                              </button>
                            ) : (
                              <div className={`p-3 rounded-2xl flex items-center justify-between border font-black text-xs ${
                                isOverallOk
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                                  : 'bg-rose-100 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                              }`}>
                                {isOverallOk ? (
                                  <span className="flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 stroke-[2.5]" />
                                    <span>Correct!</span>
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1.5">
                                    <AlertCircle className="w-4.5 h-4.5 text-rose-600 stroke-[2.5]" />
                                    <span>Correct: <strong className="underline mx-1">{item.preposition}</strong> {item.prepositionCase ? `+ (${getAbbreviatedCase(item.prepositionCase)})` : ''}</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                  </div>
                );
              })}

              {/* PAGINATION & COMPLETE SESSION BUTTON */}
              <div className="space-y-4 pt-2">
                {totalPages > 1 && (
                  <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-5 py-3 rounded-2xl shadow-2xs">
                    <button
                      disabled={safePage <= 1}
                      onClick={() => handlePageChange(safePage - 1)}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold disabled:opacity-40 cursor-pointer flex items-center gap-1.5 transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Previous</span>
                    </button>

                    <div className="text-center flex flex-col items-center justify-center">
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                        Page {safePage} of {totalPages}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        ({itemsPerPage} words/page)
                      </span>
                    </div>

                    <button
                      disabled={safePage >= totalPages}
                      onClick={() => handlePageChange(safePage + 1)}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold disabled:opacity-40 cursor-pointer flex items-center gap-1.5 transition-all"
                    >
                      <span>Next</span>
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

          {/* ------------------------------------------------------------------- */}
          {/* FIXED BOTTOM SESSION PROGRESS BAR */}
          {/* ------------------------------------------------------------------- */}
          {sessionItems.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-3 sm:px-6 sm:py-3.5 shadow-2xl">
              <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
                
                {/* Answered Count & Progress Bar on Same Line */}
                <div className="flex items-center gap-3 w-full">
                  <div className="text-xs font-black text-slate-800 dark:text-slate-200 whitespace-nowrap flex items-center gap-1.5 shrink-0">
                    <span className="p-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                    <span>Answered:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-black">{answeredCount}</span> / {totalInSession}
                  </div>

                  {/* Progress Bar */}
                  <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden border border-slate-200/60 dark:border-slate-700">
                    <div 
                      className="bg-gradient-to-r from-blue-500 via-teal-500 to-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
