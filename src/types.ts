export type VocabType = 'noun' | 'verb' | 'adjective' | 'expression' | 'Others';

export type GrammaticalGender = 'der' | 'die' | 'das';

export type GrammaticalCase = 'Akkusativ' | 'Dativ' | 'Genitiv' | 'Wechsel';

export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface VocabItem {
  id: string;
  word: string; // e.g. "Tisch", "sehen", or "groß"
  type: VocabType;
  translationEn?: string;
  translationAr?: string;
  level?: CefrLevel;
  category?: string; // Optional legacy field
  
  // Nouns
  gender?: GrammaticalGender;
  plural?: string; // e.g. "die Tische" or "-e"
  
  // Verbs
  isIrregular?: boolean;
  present3rd?: string; // e.g. "sieht" or "fährt"
  praeteritum?: string; // e.g. "sah"
  perfekt?: string; // e.g. "hat gesehen"
  
  // Adjectives
  antonym?: string; // e.g. "klein" for "groß" (Gegenteil)
  
  // Prepositions & Fixed Prepositions with Case (e.g. sich kümmern + um + Akkusativ)
  case?: GrammaticalCase; // e.g. "Dativ" or "Akkusativ" (for prepositions)
  preposition?: string; // e.g. "um", "auf", "mit", "an", "bei" (fixed verb/expression preposition)
  prepositionCase?: GrammaticalCase; // e.g. "Akkusativ", "Dativ", "Genitiv", "Wechsel"

  // Examples (optional/legacy)
  exampleDe?: string;
  exampleAr?: string;
  
  // Mastery stats
  masteryScore: number; // 0 to 100
  attemptsCount: number;
  correctCount: number;
  lastPracticed?: string;
}

export interface EvaluationCorrection {
  field: 'gender' | 'plural' | 'meaning' | 'conjugation' | 'antonym' | 'case' | 'sentence' | 'preposition' | 'prepositionCase';
  fieldNameAr: string;
  expected: string;
  provided: string;
  isCorrect: boolean;
}

export interface ChatEvaluation {
  isCorrect: boolean;
  overallScore: number; // 0 to 100
  feedbackAr: string;
  feedbackDe?: string;
  grammarTipAr?: string;
  mnemonicTipAr?: string;
  corrections?: EvaluationCorrection[];
  masteryDelta: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  targetWord?: VocabItem;
  questionType?: 'gender' | 'plural' | 'verb_conjugation' | 'antonym' | 'preposition_case' | 'translation' | 'sentence' | 'comprehensive';
  evaluation?: ChatEvaluation;
}

export interface SentenceTask {
  id: string;
  targetWord: VocabItem;
  sentenceEn: string;
  sentenceAr: string;
  suggestedKeywordsDe?: string[];
  grammarHintAr?: string;
}

export interface SentenceEvaluationResult {
  isCorrect: boolean;
  accuracyScore: number;
  correctedGerman: string;
  feedbackAr: string;
  grammarNotesAr: string;
  masteryDelta: number;
}

export type ActiveTab = 'quiz' | 'vocab' | 'stats' | 'decks' | 'settings';

export interface QuizQuestionSettings {
  nouns: {
    translation: boolean;
    article: boolean;
    plural: boolean;
  };
  verbs: {
    translation: boolean;
    present3rd: boolean;
    praeteritum: boolean;
    perfekt: boolean;
    prepositionCase?: boolean;
    antonym?: boolean;
  };
  adjectives: {
    antonym: boolean;
    translation: boolean;
  };
  expressions: {
    translation: boolean;
    prepositionCase?: boolean;
  };
  others: {
    translation: boolean;
  };
}

export const DEFAULT_QUIZ_SETTINGS: QuizQuestionSettings = {
  nouns: {
    translation: true,
    article: true,
    plural: true,
  },
  verbs: {
    translation: true,
    present3rd: true,
    praeteritum: true,
    perfekt: true,
    prepositionCase: true,
  },
  adjectives: {
    antonym: true,
    translation: true,
  },
  expressions: {
    translation: true,
    prepositionCase: true,
  },
  others: {
    translation: true,
  },
};

export type AppLanguage = 'ar' | 'en' | 'de' | 'es';

export interface VocabSet {
  id: string;
  name: string;
  levelGroup?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'General' | string;
  description?: string;
  createdAt: string;
  items: VocabItem[];
}

export function getVocabItemKey(item: {
  word: string;
  preposition?: string;
  prepositionCase?: string;
  case?: string;
  translationAr?: string;
  translationEn?: string;
  type?: string;
}): string {
  const word = (item.word || '').trim().toLowerCase();
  const prep = (item.preposition || '').trim().toLowerCase();
  const prepCase = (item.prepositionCase || item.case || '').trim().toLowerCase();
  const trans = (item.translationAr || item.translationEn || '').trim().toLowerCase();
  const type = (item.type || '').trim().toLowerCase();
  return `${word}|${prep}|${prepCase}|${trans}|${type}`;
}

