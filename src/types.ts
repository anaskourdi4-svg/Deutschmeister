export type VocabType = 'noun' | 'verb';

export type GrammaticalGender = 'der' | 'die' | 'das';

export type GrammaticalCase = 'Akkusativ' | 'Dativ' | 'Genitiv' | 'Wechsel';

export interface VocabItem {
  id: string;
  word: string; // e.g. "Tisch" or "sehen"
  type: VocabType;
  translationAr: string;
  translationEn?: string;
  level: 'A1' | 'A2' | 'B1';
  category: string; // e.g. "Alltag", "Wohnung", "Verben", "Grammatik"
  
  // Nouns
  gender?: GrammaticalGender;
  plural?: string; // e.g. "die Tische" or "-e"
  
  // Verbs
  isIrregular?: boolean;
  present3rd?: string; // e.g. "sieht" or "fährt"
  praeteritum?: string; // e.g. "sah"
  perfekt?: string; // e.g. "hat gesehen"
  
  // Adjectives
  antonym?: string; // e.g. "klein" for "groß"
  
  // Prepositions
  case?: GrammaticalCase; // e.g. "Dativ" or "Akkusativ"
  
  // Examples
  exampleDe?: string;
  exampleAr?: string;
  
  // Mastery stats
  masteryScore: number; // 0 to 100
  attemptsCount: number;
  correctCount: number;
  lastPracticed?: string;
}

export interface EvaluationCorrection {
  field: 'gender' | 'plural' | 'meaning' | 'conjugation' | 'antonym' | 'case' | 'sentence';
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

export type ActiveTab = 'quiz' | 'sentences' | 'stats' | 'vocab' | 'grammar';

export type AppLanguage = 'ar' | 'en' | 'de' | 'es';

export interface VocabSet {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  items: VocabItem[];
}

