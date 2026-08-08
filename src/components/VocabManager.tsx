import React, { useState, useEffect } from 'react';
import { VocabItem, VocabType, GrammaticalGender, GrammaticalCase, CefrLevel, getVocabItemKey } from '../types';
import { AudioPlayer } from './AudioPlayer';
import { parseVocabFile, parseExcelBuffer, parseGoogleSheetRows, parseTextOrCSV, parseRowContentHeuristic, inferGender, generateFallbackPlural, exportVocabToCSV, exportVocabToExcelBuffer, cleanGermanCategory } from '../services/vocabParser';
import {
  initGoogleAuth,
  googleSignIn,
  googleLogout,
  listUserSpreadsheets,
  fetchSpreadsheetRows,
  DriveSpreadsheetFile
} from '../services/googleSheets';
import { User } from 'firebase/auth';
import {
  Search,
  FolderUp,
  FileSpreadsheet,
  Trash2,
  RefreshCw,
  Wand2,
  CheckCircle2,
  BookOpen,
  Layers,
  Zap,
  X,
  Sparkles,
  Filter,
  FilterX,
  ChevronDown,
  CheckSquare,
  Info,
  HelpCircle,
  LogIn,
  LogOut,
  Link2,
  ExternalLink,
  Sliders,
  ArrowUp,
  ArrowUpDown,
  Award,
  Plus,
  PlusCircle,
  PenTool,
  FileText,
  Pencil,
  ArrowLeftRight
} from 'lucide-react';
import { getVerbConjugations, sanitizeConjugationWord, checkIsIrregularVerb } from '../services/germanConjugator';

interface VocabManagerProps {
  vocabList: VocabItem[];
  onAddVocabItems: (items: VocabItem[]) => void;
  onUpdateVocabItem?: (item: VocabItem) => void;
  onDeleteVocabItem: (id: string) => void;
  onDeleteMultipleVocabItems?: (ids: string[]) => void;
  onResetDefaultVocab?: () => void;
}

export type MainCategoryTab = 'noun' | 'verb' | 'adjective' | 'expression' | 'Others' | null;

export const getItemType = (item: Partial<VocabItem>): 'noun' | 'verb' | 'adjective' | 'expression' | 'Others' => {
  if (item.type) {
    const t = item.type.toLowerCase();
    if (t === 'noun' || t === 'nomen') return 'noun';
    if (t === 'verb' || t === 'verben') return 'verb';
    if (t === 'adjective' || t === 'adjektiv' || t === 'adj') return 'adjective';
    if (t === 'expression' || t === 'phrase' || t === 'redewendung' || t === 'عبارة' || t === 'تعبير') return 'expression';
    return 'Others';
  }
  if (item.gender) return 'noun';
  if (item.present3rd || item.praeteritum || item.perfekt) return 'verb';
  return 'Others';
};

// Helper to clean display text and prevent long raw string overflow
const cleanDisplay = (text?: string, maxLen = 60): string => {
  if (!text) return '';
  let str = String(text)
    .replace(/```[\s\S]*?```/gi, '')
    .replace(/[\{\}\"\[\]]/g, '')
    .split('\n')[0]
    .trim();
  if (str.length > maxLen) {
    str = str.substring(0, maxLen) + '...';
  }
  return str;
};

const formatVerbConjugation = (present3rd?: string, praeteritum?: string, perfekt?: string): string => {
  const cleanP3 = sanitizeConjugationWord(present3rd);
  const cleanPr = sanitizeConjugationWord(praeteritum);
  const cleanPe = sanitizeConjugationWord(perfekt);

  if (!cleanP3 && !cleanPr && !cleanPe) return '';

  const capP3 = cleanP3 ? cleanP3.charAt(0).toUpperCase() + cleanP3.slice(1) : '';
  const parts = [capP3, cleanPr, cleanPe].filter(Boolean);
  return parts.join(', ') + '.';
};

interface VerbConjugationBlockProps {
  item: VocabItem;
}

const VerbConjugationBlock: React.FC<VerbConjugationBlockProps> = ({ item }) => {
  const conjugationStr = formatVerbConjugation(
    item.present3rd,
    item.praeteritum,
    item.perfekt
  );

  if (!conjugationStr) return null;

  return (
    <div className="mt-2 p-2 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-between gap-2 transition-all">
      {/* Regular / Irregular Badge on Left */}
      <div className="shrink-0">
        {checkIsIrregularVerb(item) ? (
          <span className="px-2 py-0.5 rounded-lg bg-[#78281f] text-[#fadbd8] text-xs font-black border border-[#512e5f] dark:bg-[#5b1e18] dark:text-[#fadbd8] dark:border-[#78281f]">
            Irregular
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-black border border-emerald-200 dark:border-emerald-900">
            Regular
          </span>
        )}
      </div>

      {/* Conjugation String on Right */}
      <div className="text-xs font-bold dir-ltr text-emerald-950 dark:text-emerald-100 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-emerald-100 dark:border-emerald-900/50 shadow-xs">
        {conjugationStr}
      </div>
    </div>
  );
};

// Helper to sanitize plural text display
const cleanPluralText = (pluralText?: string): string => {
  if (!pluralText) return '';
  const cleaned = pluralText.trim();
  if (cleaned.toLowerCase() === 'die -' || cleaned.toLowerCase() === 'die null' || cleaned === '—' || cleaned === '-') return '';
  return cleaned;
};

// Helper to abbreviate grammatical case names
export const getAbbreviatedCase = (c?: string): string => {
  if (!c) return '';
  const lower = c.trim().toLowerCase();
  if (lower.startsWith('akk')) return 'Akk.';
  if (lower.startsWith('dat')) return 'Dat.';
  if (lower.startsWith('gen')) return 'Gen.';
  if (lower.startsWith('wech')) return 'Wechsel';
  return c;
};

/* ------------------------------------------------------------------- */
/* VOCAB CARD COMPONENT */
/* ------------------------------------------------------------------- */
interface VocabCardProps {
  item: VocabItem;
  idx: number;
  onEdit?: (item: VocabItem) => void;
  onDeleteSingle: (id: string) => void;
}

const VocabCard: React.FC<VocabCardProps> = ({
  item,
  idx,
  onEdit,
  onDeleteSingle,
}) => {
  const itemType = getItemType(item);
  const cleanPlural = itemType === 'noun' ? cleanPluralText(item.plural) : '';
  const nounArticle = itemType === 'noun' ? (item.gender || inferGender(item.word)) : undefined;

  const score = item.masteryScore ?? 0;
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
    return {
      style: 'bg-gradient-to-r from-amber-100 via-amber-200/70 to-yellow-100 dark:from-amber-950/90 dark:via-yellow-950/80 dark:to-amber-950/90 text-amber-950 dark:text-amber-200 border-amber-400/80 dark:border-amber-600/80 shadow-2xs font-black',
      icon: <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />,
      starOnly: true,
    };
  };

  const masteryBadge = getMasteryBadgeStyle(score);

  return (
    <div className="group relative bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs hover:shadow-md transition-all duration-200">
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Card Number */}
          <span className="text-[11px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
            {idx + 1}
          </span>

          {/* Type Badges */}
          {itemType === 'noun' && (
            <span className="px-2.5 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-extrabold text-xs border border-blue-200 dark:border-blue-900">
              Noun
            </span>
          )}

          {itemType === 'verb' && (
            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs border border-emerald-200 dark:border-emerald-900">
              Verb
            </span>
          )}

          {itemType === 'adjective' && (
            <span className="px-2.5 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-extrabold text-xs border border-amber-200 dark:border-amber-900">
              Adjective
            </span>
          )}

          {itemType === 'expression' && (
            <span className="px-2.5 py-0.5 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-extrabold text-xs border border-purple-200 dark:border-purple-900">
              Expression
            </span>
          )}

          {itemType === 'Others' && (
            <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold text-xs border border-slate-200 dark:border-slate-700">
              Others
            </span>
          )}

          {/* CEFR Level Badge in Corner next to Word Type */}
          <span className="px-2 py-0.5 rounded-lg bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-300 font-extrabold text-xs border border-yellow-200 dark:border-yellow-900 shadow-2xs">
            {item.level || 'A1'}
          </span>

          {/* Mastery Score Badge */}
          <span className={`px-2 py-0.5 rounded-lg font-extrabold text-xs border flex items-center gap-1 shadow-2xs ${masteryBadge.style}`}>
            {masteryBadge.icon}
            {!masteryBadge.starOnly && <span>{score}%</span>}
          </span>
        </div>

        {/* Actions (Edit & Delete) */}
        <div className="flex items-center gap-1">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
              title="تعديل الكلمة / Edit Word"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onDeleteSingle(item.id)}
            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            title="Delete Word"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main German Word Display + Preposition & Case inline + Audio Button */}
      <div className="space-y-1 my-2">
        <div className="flex items-center justify-between gap-2 dir-ltr">
          <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 flex-wrap">
            {nounArticle ? (
              <>
                <span className={
                  nounArticle === 'der'
                    ? 'text-blue-600 dark:text-blue-400 font-black'
                    : nounArticle === 'die'
                    ? 'text-rose-600 dark:text-rose-400 font-black'
                    : 'text-emerald-600 dark:text-emerald-400 font-black'
                }>
                  {nounArticle}{' '}
                </span>
                {item.word}
              </>
            ) : (
              item.word
            )}
            {item.preposition && (
              <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/70 px-2.5 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                {item.preposition} {item.prepositionCase ? `+ (${getAbbreviatedCase(item.prepositionCase)})` : ''}
              </span>
            )}
          </h4>
          <AudioPlayer
            text={item.gender ? `${item.gender} ${item.word}` : item.word}
            size="sm"
          />
        </div>

        {/* Plural if noun */}
        {cleanPlural && (
          <p className="text-xs font-extrabold text-slate-500 dark:text-slate-400 dir-ltr">
            Plural: <span className="text-slate-700 dark:text-slate-300">{cleanPlural}</span>
          </p>
        )}
      </div>

      {/* Antonym / Opposites (Adjectives ONLY) */}
      {itemType === 'adjective' && item.antonym && (
        <div className="mt-2.5 p-2.5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-800/80 flex items-center justify-between gap-2 shadow-2xs">
          <span className="text-xs font-black text-amber-900 dark:text-amber-200 flex items-center gap-1">
            <ArrowLeftRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            Opposite (الضد):
          </span>
          <span className="text-xs font-black dir-ltr text-amber-950 dark:text-amber-100 bg-white dark:bg-slate-900 px-3 py-1 rounded-xl border border-amber-300 dark:border-amber-800 shadow-2xs">
            {item.antonym}
          </span>
        </div>
      )}

      {/* Verb Conjugation Block */}
      {itemType === 'verb' && <VerbConjugationBlock item={item} />}

      {/* Translation Row (English Translation before Example) */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mt-2.5 flex items-center justify-between">
        <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 dir-ltr">
          {item.translationEn || item.translationAr}
        </span>
      </div>

      {/* Example Sentence Inline at Bottom of Card */}
      {item.exampleDe && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mt-2">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 dir-ltr leading-snug">
            <span className="font-extrabold text-slate-400 mr-1.5 uppercase text-[10px]">Example:</span>
            <span>{item.exampleDe}</span>
          </p>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------- */
/* VOCAB EDIT MODAL COMPONENT */
/* ------------------------------------------------------------------- */
interface VocabEditModalProps {
  item: VocabItem;
  onSave: (updatedItem: VocabItem) => void;
  onClose: () => void;
}

const VocabEditModal: React.FC<VocabEditModalProps> = ({ item, onSave, onClose }) => {
  const [wordType, setWordType] = useState<VocabType>(item.type || 'noun');
  const [word, setWord] = useState<string>(item.word || '');
  const [translationEn, setTranslationEn] = useState<string>(item.translationEn || '');
  const [level, setLevel] = useState<CefrLevel>(item.level || 'A1');

  // Noun fields
  const [gender, setGender] = useState<GrammaticalGender | ''>(item.gender || '');
  const [plural, setPlural] = useState<string>(item.plural || '');
  const [noPlural, setNoPlural] = useState<boolean>(item.plural === 'ohne Plural' || item.plural === '-');

  // Verb fields
  const [present3rd, setPresent3rd] = useState<string>(item.present3rd || '');
  const [praeteritum, setPraeteritum] = useState<string>(item.praeteritum || '');
  const [perfekt, setPerfekt] = useState<string>(item.perfekt || '');
  const [isIrregular, setIsIrregular] = useState<boolean>(!!item.isIrregular);

  // Adjective fields
  const [antonym, setAntonym] = useState<string>(item.antonym || '');

  // Preposition fields (For Verbs & Phrases)
  const [enablePreposition, setEnablePreposition] = useState<boolean>(Boolean(item.preposition || item.prepositionCase || item.case));
  const [preposition, setPreposition] = useState<string>(item.preposition || '');
  const [prepositionCase, setPrepositionCase] = useState<GrammaticalCase | ''>(item.prepositionCase || item.case || '');

  // Example fields
  const [exampleDe, setExampleDe] = useState<string>(item.exampleDe || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim()) return;

    const hasPrepAndCase = (wordType === 'verb' || wordType === 'Others' || wordType === 'expression') && enablePreposition;

    const updatedItem: VocabItem = {
      ...item,
      word: word.trim(),
      type: wordType,
      translationAr: item.translationAr,
      translationEn: translationEn.trim() || undefined,
      level: level,
      gender: wordType === 'noun' ? (gender || undefined) : undefined,
      plural: wordType === 'noun' ? (noPlural ? 'ohne Plural' : (plural.trim() || undefined)) : undefined,
      present3rd: wordType === 'verb' ? (present3rd.trim() || undefined) : undefined,
      praeteritum: wordType === 'verb' ? (praeteritum.trim() || undefined) : undefined,
      perfekt: wordType === 'verb' ? (perfekt.trim() || undefined) : undefined,
      isIrregular: wordType === 'verb' ? isIrregular : undefined,
      antonym: wordType === 'adjective' && antonym.trim() ? antonym.trim() : undefined,
      preposition: hasPrepAndCase ? (preposition.trim() || undefined) : undefined,
      prepositionCase: hasPrepAndCase ? ((prepositionCase || undefined) as GrammaticalCase | undefined) : undefined,
      case: hasPrepAndCase ? ((prepositionCase || undefined) as GrammaticalCase | undefined) : undefined,
      exampleDe: exampleDe.trim() || undefined,
      exampleAr: item.exampleAr,
    };

    onSave(updatedItem);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full space-y-5 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Pencil className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Edit Vocabulary Item</span>
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold p-1 cursor-pointer"
          >
            ✕ Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* 1. Word Type Selection */}
          <div>
            <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block mb-1.5">
              Word Type:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { type: 'noun' as VocabType, label: 'Noun', activeBg: 'bg-blue-600 text-white border-blue-600' },
                { type: 'verb' as VocabType, label: 'Verb', activeBg: 'bg-emerald-600 text-white border-emerald-600' },
                { type: 'adjective' as VocabType, label: 'Adjective', activeBg: 'bg-amber-600 text-white border-amber-600' },
                { type: 'expression' as VocabType, label: 'Expression', activeBg: 'bg-purple-600 text-white border-purple-600' },
                { type: 'Others' as VocabType, label: 'Others', activeBg: 'bg-slate-600 text-white border-slate-600' },
              ].map(t => (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => setWordType(t.type)}
                  className={`py-2 px-2.5 rounded-2xl border text-xs font-black transition-all cursor-pointer text-center ${
                    wordType === t.type
                      ? `${t.activeBg} shadow-xs`
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. German Word */}
          <div>
            <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block mb-1">
              German Word <span className="text-rose-500">*</span>:
            </label>
            <input
              type="text"
              required
              value={word}
              onChange={e => setWord(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 dir-ltr"
            />
          </div>

          {/* 3. English Translation */}
          <div>
            <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block mb-1">
              English Translation:
            </label>
            <input
              type="text"
              value={translationEn}
              onChange={e => setTranslationEn(e.target.value)}
              placeholder="English meaning"
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 dir-ltr"
            />
          </div>

          {/* 4. Level Selection */}
          <div>
            <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block mb-1">
              CEFR Level:
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const).map(l => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLevel(l)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                    level === l
                      ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Noun-specific fields */}
          {wordType === 'noun' && (
            <div className="p-4 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-2xl space-y-3">
              <span className="text-xs font-black text-blue-900 dark:text-blue-300 block">
                Noun Properties:
              </span>

              {/* Article / Gender */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Article:
                </label>
                <div className="grid grid-cols-4 gap-2 dir-ltr">
                  {(['der', 'die', 'das', ''] as const).map(g => (
                    <button
                      key={g || 'none'}
                      type="button"
                      onClick={() => setGender(g as GrammaticalGender)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-black border transition-all cursor-pointer text-center ${
                        gender === g
                          ? g === 'der' ? 'bg-blue-600 text-white border-blue-600'
                            : g === 'die' ? 'bg-rose-600 text-white border-rose-600'
                            : g === 'das' ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-700 text-white border-slate-700'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {g ? g : 'No Article'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Plural Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                    Plural Form:
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={noPlural}
                      onChange={e => {
                        setNoPlural(e.target.checked);
                        if (e.target.checked) setPlural('');
                      }}
                      className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400">
                      No Plural Form (ohne Plural)
                    </span>
                  </label>
                </div>
                {!noPlural && (
                  <input
                    type="text"
                    value={plural}
                    onChange={e => setPlural(e.target.value)}
                    placeholder="e.g. die Tische or -e"
                    className="w-full p-2.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 dir-ltr"
                  />
                )}
              </div>
            </div>
          )}

          {/* Verb-specific fields */}
          {wordType === 'verb' && (
            <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-900 dark:text-emerald-300 block">
                  Verb Conjugations:
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isIrregular}
                    onChange={e => setIsIrregular(e.target.checked)}
                    className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300">
                    Irregular Verb
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Präsens (3rd Person Sing.)
                  </label>
                  <input
                    type="text"
                    value={present3rd}
                    onChange={e => setPresent3rd(e.target.value)}
                    placeholder="e.g. sieht / geht"
                    className="w-full p-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 dir-ltr"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Präteritum
                  </label>
                  <input
                    type="text"
                    value={praeteritum}
                    onChange={e => setPraeteritum(e.target.value)}
                    placeholder="e.g. sah / ging"
                    className="w-full p-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 dir-ltr"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Perfekt
                  </label>
                  <input
                    type="text"
                    value={perfekt}
                    onChange={e => setPerfekt(e.target.value)}
                    placeholder="e.g. hat gesehen"
                    className="w-full p-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 dir-ltr"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Antonym / Opposite field (Adjectives ONLY) */}
          {wordType === 'adjective' && (
            <div className="p-4 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 rounded-2xl space-y-2">
              <span className="text-xs font-black text-amber-900 dark:text-amber-300 block">
                Opposite / Antonym (الضد):
              </span>
              <div>
                <input
                  type="text"
                  value={antonym}
                  onChange={e => setAntonym(e.target.value)}
                  placeholder="e.g. klein or aufhören"
                  className="w-full p-2.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 dir-ltr"
                />
              </div>
            </div>
          )}

          {/* Preposition & Prepositional Cases - For Verbs, Expressions & Others */}
          {(wordType === 'verb' || wordType === 'Others' || wordType === 'expression') && (
            <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={enablePreposition}
                    onChange={e => setEnablePreposition(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="text-xs font-black text-indigo-900 dark:text-indigo-300">
                    Enable Preposition & Grammatical Case
                  </span>
                </label>
              </div>

              {enablePreposition && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Preposition:
                    </label>
                    <input
                      type="text"
                      value={preposition}
                      onChange={e => setPreposition(e.target.value)}
                      placeholder="e.g. auf, mit, für"
                      className="w-full p-2.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 dir-ltr"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Grammatical Case:
                    </label>
                    <select
                      value={prepositionCase}
                      onChange={e => setPrepositionCase(e.target.value as GrammaticalCase | '')}
                      className="w-full p-2.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 dir-ltr"
                    >
                      <option value="">-- Select Case --</option>
                      <option value="Akkusativ">Akkusativ</option>
                      <option value="Dativ">Dativ</option>
                      <option value="Genitiv">Genitiv</option>
                      <option value="Wechsel">Wechsel (Akk/Dat)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* German Example Sentence */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block">
              German Example Sentence:
            </label>
            <input
              type="text"
              value={exampleDe}
              onChange={e => setExampleDe(e.target.value)}
              placeholder="e.g. Ich freue mich auf die Hilfe."
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 dir-ltr"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-black cursor-pointer transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md cursor-pointer transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

/* ------------------------------------------------------------------- */
/* MAIN VOCAB MANAGER COMPONENT */
/* ------------------------------------------------------------------- */
export const VocabManager: React.FC<VocabManagerProps> = ({
  vocabList,
  onAddVocabItems,
  onUpdateVocabItem,
  onDeleteVocabItem,
  onDeleteMultipleVocabItems,
  onResetDefaultVocab,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryTab, setActiveCategoryTab] = useState<MainCategoryTab>(null);
  const [activeLevelTab, setActiveLevelTab] = useState<CefrLevel | null>(null);
  
  // Edit Word Modal state
  const [editingItem, setEditingItem] = useState<VocabItem | null>(null);
  
  // Modals & Sidebar & Filter Panel state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [showSmartAddInfo, setShowSmartAddInfo] = useState(false);
  const [showImportInfo, setShowImportInfo] = useState(false);
  
  // File Upload / Smart Import State
  const [importTab, setImportTab] = useState<'file' | 'manual'>('file');
  const [fileText, setFileText] = useState('');
  const [manualInputText, setManualInputText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isAiBulkParsing, setIsAiBulkParsing] = useState(false);
  const [aiBulkParsedItems, setAiBulkParsedItems] = useState<VocabItem[] | null>(null);
  const [excelParsedItems, setExcelParsedItems] = useState<VocabItem[] | null>(null);
  const [omittedDuplicateCount, setOmittedDuplicateCount] = useState<number>(0);

  // SMART AUTO-FORMAT & MANUAL SINGLE WORD ADD
  const [addTab, setAddTab] = useState<'smart' | 'manual'>('smart');
  const [smartWordInput, setSmartWordInput] = useState('');
  const [isSmartParsing, setIsSmartParsing] = useState(false);
  const [smartParsedItem, setSmartParsedItem] = useState<VocabItem | null>(null);
  const [smartParseError, setSmartParseError] = useState<string | null>(null);

  // Manual Word Form State
  const [manualType, setManualType] = useState<VocabType>('noun');
  const [manualWord, setManualWord] = useState('');
  const [manualGender, setManualGender] = useState<'der' | 'die' | 'das' | ''>('der');
  const [manualPlural, setManualPlural] = useState('');
  const [manualNoPlural, setManualNoPlural] = useState(false);
  const [manualIsIrregular, setManualIsIrregular] = useState(false);
  const [manualPresent3rd, setManualPresent3rd] = useState('');
  const [manualPraeteritum, setManualPraeteritum] = useState('');
  const [manualPerfekt, setManualPerfekt] = useState('');
  const [manualAntonym, setManualAntonym] = useState('');
  const [manualHasPreposition, setManualHasPreposition] = useState(false);
  const [manualPreposition, setManualPreposition] = useState('');
  const [manualPrepositionCase, setManualPrepositionCase] = useState<GrammaticalCase | ''>('');
  const [manualTranslationEn, setManualTranslationEn] = useState('');
  const [manualLevel, setManualLevel] = useState<CefrLevel>('A1');
  const [manualCategory, setManualCategory] = useState('General');
  const [manualExampleDe, setManualExampleDe] = useState('');

  // Custom Modals & Toast State
  const [singleDeleteModalItem, setSingleDeleteModalItem] = useState<VocabItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [sortMode, setSortMode] = useState<'alphabetical' | 'newest'>(() => {
    const saved = localStorage.getItem('vocab_sort_mode');
    return saved === 'newest' ? 'newest' : 'alphabetical';
  });

  useEffect(() => {
    const handleSortChange = (e: Event) => {
      const customEv = e as CustomEvent<string>;
      if (customEv.detail && (customEv.detail === 'alphabetical' || customEv.detail === 'newest')) {
        setSortMode(customEv.detail as 'alphabetical' | 'newest');
      }
    };
    window.addEventListener('app:vocab-set-sort', handleSortChange);
    return () => window.removeEventListener('app:vocab-set-sort', handleSortChange);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Google Auth & Sheets State
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [userSheets, setUserSheets] = useState<DriveSpreadsheetFile[]>([]);
  const [sheetInput, setSheetInput] = useState('');
  const [isFetchingSheet, setIsFetchingSheet] = useState(false);

  useEffect(() => {
    const unsubscribe = initGoogleAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
        listUserSpreadsheets(token)
          .then(files => setUserSheets(files))
          .catch(err => console.error('Drive listing error:', err));
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
        setUserSheets([]);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setGoogleToken(result.accessToken);
        showToast(`Successfully signed in: ${result.user.displayName || result.user.email}`);
        const files = await listUserSpreadsheets(result.accessToken);
        setUserSheets(files);
      }
    } catch (err) {
      console.error('Sign-in error:', err);
      showToast('Could not sign in with Google account.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await googleLogout();
      setGoogleUser(null);
      setGoogleToken(null);
      setUserSheets([]);
      showToast('Signed out of Google');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleFetchFromGoogleSheet = async (targetIdOrUrl?: string) => {
    const rawTarget = targetIdOrUrl || sheetInput;
    if (!rawTarget || !rawTarget.trim()) {
      showToast('Please select a sheet from Google Drive or enter a sheet URL or ID.');
      return;
    }

    let token = googleToken;
    if (!token) {
      try {
        setIsGoogleLoading(true);
        const res = await googleSignIn();
        if (res) {
          setGoogleUser(res.user);
          setGoogleToken(res.accessToken);
          token = res.accessToken;
          const files = await listUserSpreadsheets(res.accessToken);
          setUserSheets(files);
        }
      } catch (err) {
        showToast('Reading Google Sheets requires signing in.');
        setIsGoogleLoading(false);
        return;
      } finally {
        setIsGoogleLoading(false);
      }
    }

    if (!token) return;

    setIsFetchingSheet(true);
    try {
      const sheetData = await fetchSpreadsheetRows(rawTarget, token);
      if (!sheetData.rows || sheetData.rows.length === 0) {
        showToast('Google Sheet is empty or contains no data.');
        return;
      }

      const parsedItems = parseGoogleSheetRows(sheetData.rows);
      if (parsedItems.length > 0) {
        setAiBulkParsedItems(parsedItems);
        setUploadedFileName(`Google Sheet: ${sheetData.title}`);
        showToast(`Successfully fetched ${parsedItems.length} items from "${sheetData.title}"!`);
      } else {
        showToast('Could not recognize vocabulary in sheet. Please verify column formatting.');
      }
    } catch (err: any) {
      console.error('Sheet fetch error:', err);
      showToast(err.message || 'Error reading Google Sheet');
    } finally {
      setIsFetchingSheet(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 3500);
  };

  // Listen to custom header events
  useEffect(() => {
    const handleOpenSmartAdd = () => {
      setIsAddOpen(true);
      setSmartParsedItem(null);
      setSmartParseError(null);
    };
    const handleOpenImport = () => {
      setIsUploadOpen(true);
    };
    const handleExportSheet = () => {
      handleExportExcel();
    };

    window.addEventListener('app:vocab-open-smart-add', handleOpenSmartAdd);
    window.addEventListener('app:vocab-open-import', handleOpenImport);
    window.addEventListener('app:vocab-export-sheet', handleExportSheet);

    return () => {
      window.removeEventListener('app:vocab-open-smart-add', handleOpenSmartAdd);
      window.removeEventListener('app:vocab-open-import', handleOpenImport);
      window.removeEventListener('app:vocab-export-sheet', handleExportSheet);
    };
  }, [vocabList]);

  // Category & Type counts
  const nounCount = vocabList.filter(v => getItemType(v) === 'noun').length;
  const verbCount = vocabList.filter(v => getItemType(v) === 'verb').length;
  const adjectiveCount = vocabList.filter(v => getItemType(v) === 'adjective').length;
  const expressionCount = vocabList.filter(v => getItemType(v) === 'expression').length;
  const othersCount = vocabList.filter(v => getItemType(v) === 'Others').length;

  // CEFR Level counts
  const levelCounts: Record<CefrLevel, number> = {
    A1: vocabList.filter(v => (v.level || 'A1').toUpperCase() === 'A1').length,
    A2: vocabList.filter(v => (v.level || 'A1').toUpperCase() === 'A2').length,
    B1: vocabList.filter(v => (v.level || 'A1').toUpperCase() === 'B1').length,
    B2: vocabList.filter(v => (v.level || 'A1').toUpperCase() === 'B2').length,
    C1: vocabList.filter(v => (v.level || 'A1').toUpperCase() === 'C1').length,
    C2: vocabList.filter(v => (v.level || 'A1').toUpperCase() === 'C2').length,
  };

  // Filtered Vocab
  const rawFilteredVocab = vocabList.filter(item => {
    const itemType = getItemType(item);

    const query = searchQuery.toLowerCase().trim();
    const wordText = (item.word || '').toLowerCase();
    const transText = (item.translationEn || item.translationAr || '').toLowerCase();
    const levelText = (item.level || '').toLowerCase();

    const matchesSearch =
      !query ||
      wordText.includes(query) ||
      transText.includes(query) ||
      levelText.includes(query);

    let matchesCategory = true;
    if (activeCategoryTab === 'noun') {
      matchesCategory = itemType === 'noun';
    } else if (activeCategoryTab === 'adjective') {
      matchesCategory = itemType === 'adjective';
    } else if (activeCategoryTab === 'verb') {
      matchesCategory = itemType === 'verb';
    } else if (activeCategoryTab === 'expression') {
      matchesCategory = itemType === 'expression';
    } else if (activeCategoryTab === 'Others') {
      matchesCategory = itemType === 'Others';
    }

    let matchesLevel = true;
    if (activeLevelTab) {
      matchesLevel = (item.level || 'A1').toUpperCase() === activeLevelTab;
    }

    return matchesSearch && matchesCategory && matchesLevel;
  });

  const filteredVocab = [...rawFilteredVocab].sort((a, b) => {
    if (sortMode === 'newest') {
      return vocabList.indexOf(a) - vocabList.indexOf(b);
    }
    if (sortMode === 'oldest') {
      return vocabList.indexOf(b) - vocabList.indexOf(a);
    }
    // Default: 'alphabetical'
    return a.word.localeCompare(b.word, 'de', { sensitivity: 'base' });
  });

  const handleDeleteSingleVocabItem = (id: string) => {
    const item = vocabList.find(v => v.id === id);
    if (item) {
      setSingleDeleteModalItem(item);
    } else {
      onDeleteVocabItem(id);
      showToast('Word deleted successfully');
    }
  };

  const handleConfirmSingleDelete = (id: string) => {
    onDeleteVocabItem(id);
    setSingleDeleteModalItem(null);
    showToast('Word deleted successfully');
  };

  // Handle File Input Selection (Spreadsheets & Excel)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setExcelParsedItems(null);
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const buffer = event.target?.result as ArrayBuffer;
        if (buffer) {
          const { items, plainText } = parseExcelBuffer(buffer);
          setFileText(plainText);
          if (items.length > 0) {
            setExcelParsedItems(items);
            showToast(`Excel file recognized successfully (${items.length} words)`);
          } else {
            showToast(`Loaded Excel file: ${file.name}`);
          }
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          setFileText(content);
          const parsed = parseVocabFile(content, file.name);
          if (parsed.length > 0) {
            setExcelParsedItems(parsed);
          }
          showToast(`File selected: ${file.name}`);
        }
      };
      reader.readAsText(file, 'utf-8');
    }
  };

  // Helper to filter out duplicate words from preview and track omitted duplicate count
  const processItemsForPreview = (rawItems: VocabItem[]) => {
    const existingWordKeys = new Set(vocabList.map(v => getVocabItemKey(v)));
    const newItems: VocabItem[] = [];
    const seenInBatch = new Set<string>();
    let duplicates = 0;

    for (const item of rawItems) {
      const key = getVocabItemKey(item);
      if (!key) continue;
      if (existingWordKeys.has(key) || seenInBatch.has(key)) {
        duplicates++;
      } else {
        seenInBatch.add(key);
        newItems.push(item);
      }
    }

    setOmittedDuplicateCount(duplicates);
    setAiBulkParsedItems(newItems);

    if (newItems.length === 0) {
      if (duplicates > 0) {
        showToast(`All imported items (${duplicates}) are duplicates and already exist in the list!`);
      } else {
        showToast('No valid vocabulary items found.');
      }
    } else {
      if (duplicates > 0) {
        showToast(`Showing new items only (${newItems.length}). Omitted ${duplicates} duplicate items.`);
      } else {
        showToast(`Extracted ${newItems.length} new items for preview!`);
      }
    }
  };

  // Process & Import Spreadsheet / Text Handler -> Direct Local Parser
  const handleProcessAndImportSpreadsheet = () => {
    if (importTab === 'file') {
      if (excelParsedItems && excelParsedItems.length > 0) {
        processItemsForPreview(excelParsedItems);
        return;
      }
      if (!fileText.trim()) {
        showToast('Please select a file first.');
        return;
      }
      const parsed = parseVocabFile(fileText, uploadedFileName || 'spreadsheet.csv');
      if (parsed.length > 0) {
        processItemsForPreview(parsed);
      } else {
        showToast('Could not extract data from file. Please check file formatting.');
      }
    } else {
      if (!manualInputText.trim()) {
        showToast('Please enter or paste vocabulary first.');
        return;
      }
      const parsed = parseVocabFile(manualInputText, 'manual_input.txt');
      if (parsed.length > 0) {
        processItemsForPreview(parsed);
      } else {
        showToast('Could not parse written vocabulary syntax.');
      }
    }
  };

  const handleUpdatePreviewItem = (index: number, updatedFields: Partial<VocabItem>) => {
    if (!aiBulkParsedItems) return;
    const copy = [...aiBulkParsedItems];
    const target = { ...copy[index], ...updatedFields };

    if (updatedFields.type === 'noun') {
      if (!target.gender) {
        target.gender = inferGender(target.word);
      }
      if (!target.plural) {
        target.plural = generateFallbackPlural(target.word, target.gender);
      }
    } else if (updatedFields.type) {
      target.gender = undefined;
      target.plural = undefined;
    }

    copy[index] = target;
    setAiBulkParsedItems(copy);
  };

  const handleRemovePreviewItem = (index: number) => {
    if (!aiBulkParsedItems) return;
    const copy = aiBulkParsedItems.filter((_, i) => i !== index);
    if (copy.length === 0) {
      setAiBulkParsedItems(null);
      showToast('Cleared preview list.');
    } else {
      setAiBulkParsedItems(copy);
    }
  };

  // Handle Local Client-side Bulk Text Parsing
  const handleAiBulkParse = async () => {
    const rawText = importTab === 'manual' ? manualInputText : fileText;
    if (!rawText.trim() || isAiBulkParsing) {
      showToast('Please select a file or enter text first.');
      return;
    }

    setIsAiBulkParsing(true);
    setAiBulkParsedItems(null);

    try {
      const parsedItems = parseTextOrCSV(rawText.trim());
      if (parsedItems && Array.isArray(parsedItems) && parsedItems.length > 0) {
        processItemsForPreview(parsedItems);
      } else {
        handleProcessAndImportSpreadsheet();
      }
    } catch (err) {
      console.error('Bulk Parse Error:', err);
      handleProcessAndImportSpreadsheet();
    } finally {
      setIsAiBulkParsing(false);
    }
  };

  const handleConfirmAiBulkSave = () => {
    if (!aiBulkParsedItems || aiBulkParsedItems.length === 0) return;

    onAddVocabItems(aiBulkParsedItems);
    showToast(`تم إضافة ${aiBulkParsedItems.length} مفردة جديدة بنجاح!`);

    setIsUploadOpen(false);
    setFileText('');
    setUploadedFileName('');
    setAiBulkParsedItems(null);
    setOmittedDuplicateCount(0);
  };

  // SMART AUTO-FORMAT SINGLE WORD ADD
  const handleSmartWordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawInput = smartWordInput.trim();
    if (!rawInput || isSmartParsing) return;

    if (/[\u0600-\u06FF]/.test(rawInput)) {
      setSmartParseError('الرجاء إدخال الكلمة باللغة الألمانية حصراً (مثال: der Tisch, schwimmen, schön).');
      return;
    }

    setIsSmartParsing(true);
    setSmartParseError(null);
    setSmartParsedItem(null);

    const createFallbackItem = (str: string): VocabItem => {
      const articleMatch = str.match(/^(der|die|das)\s+(.+)$/i);
      let gender: 'der' | 'die' | 'das' | undefined = undefined;
      let word = str;

      if (articleMatch) {
        gender = articleMatch[1].toLowerCase() as 'der' | 'die' | 'das';
        word = articleMatch[2].trim();
      }

      const isCapitalized = /^[A-ZÄÖÜ]/.test(word);
      const isNoun = gender !== undefined || isCapitalized;
      const lower = word.toLowerCase();

      let type: VocabType = isNoun ? 'noun' : 'verb';
      if (!gender && !isCapitalized) {
        if (lower.endsWith('en') || lower.endsWith('n')) {
          type = 'verb';
        } else {
          type = 'noun';
        }
      }

      let plural: string | undefined = undefined;
      if (type === 'noun') {
        if (gender === 'die' && (lower.endsWith('ung') || lower.endsWith('heit') || lower.endsWith('keit') || lower.endsWith('schaft') || lower.endsWith('in'))) {
          plural = `die ${word}en`;
        } else {
          plural = `die ${word}s`;
        }
      }

      let present3rd: string | undefined;
      let praeteritum: string | undefined;
      let perfekt: string | undefined;

      if (type === 'verb') {
        const conjugations = getVerbConjugations(word);
        present3rd = conjugations.present3rd;
        praeteritum = conjugations.praeteritum;
        perfekt = conjugations.perfekt;
      }

      const exampleDe = type === 'noun' ? `Das ist ${gender || 'der'} ${word}.` : `Ich möchte gerne ${word}.`;
      const exampleAr = type === 'noun' ? `هذا هو ${str}.` : `أود أن أتعلم ${str}.`;

      return {
        id: `smart_local_${Date.now()}`,
        word: word,
        type: type,
        gender: gender || (type === 'noun' ? 'der' : undefined),
        plural: plural,
        translationEn: str,
        translationAr: str,
        level: 'A1',
        category: 'Personal Entry',
        isIrregular: checkIsIrregularVerb({ word, type, present3rd, praeteritum, perfekt }),
        present3rd,
        praeteritum,
        perfekt,
        exampleDe,
        exampleAr,
        masteryScore: 0,
        attemptsCount: 0,
        correctCount: 0,
      };
    };

    try {
      const parsed = parseRowContentHeuristic([rawInput]) || createFallbackItem(rawInput);
      setSmartParsedItem(parsed);
    } catch (err) {
      setSmartParsedItem(createFallbackItem(rawInput));
    } finally {
      setIsSmartParsing(false);
    }
  };

  const handleConfirmSmartSave = () => {
    if (!smartParsedItem) return;
    const key = getVocabItemKey(smartParsedItem);
    const exists = vocabList.some(v => getVocabItemKey(v) === key);

    if (exists) {
      showToast(`Word "${smartParsedItem.word}" ${smartParsedItem.preposition ? `(${smartParsedItem.preposition})` : ''} is already in the list!`);
    } else {
      onAddVocabItems([smartParsedItem]);
      showToast(`Word "${smartParsedItem.word}" added successfully!`);
    }

    setSmartParsedItem(null);
    setSmartWordInput('');
    setIsAddOpen(false);
  };

  const handleManualWordSubmit = (e: React.FormEvent, keepOpen = false) => {
    e.preventDefault();
    let finalWord = manualWord.trim();
    if (!finalWord) return;

    let finalGender = manualGender;
    if (manualType === 'noun') {
      const match = finalWord.match(/^(der|die|das)\s+(.+)$/i);
      if (match) {
        finalGender = match[1].toLowerCase() as 'der' | 'die' | 'das';
        finalWord = match[2].trim();
      }
    }

    const newItem: VocabItem = {
      id: Date.now().toString() + '_' + Math.random().toString(36).substring(2, 7),
      word: finalWord,
      type: manualType,
      gender: manualType === 'noun' && finalGender ? finalGender : undefined,
      plural: manualType === 'noun' && !manualNoPlural && manualPlural.trim() ? manualPlural.trim() : undefined,
      isIrregular: manualType === 'verb' ? manualIsIrregular : undefined,
      present3rd: manualType === 'verb' && manualPresent3rd.trim() ? manualPresent3rd.trim() : undefined,
      praeteritum: manualType === 'verb' && manualPraeteritum.trim() ? manualPraeteritum.trim() : undefined,
      perfekt: manualType === 'verb' && manualPerfekt.trim() ? manualPerfekt.trim() : undefined,
      antonym: manualType === 'adjective' && manualAntonym.trim() ? manualAntonym.trim() : undefined,
      preposition: manualHasPreposition && manualPreposition.trim() ? manualPreposition.trim() : undefined,
      prepositionCase: manualHasPreposition && manualPrepositionCase ? manualPrepositionCase : undefined,
      translationAr: manualTranslationEn.trim() || finalWord,
      translationEn: manualTranslationEn.trim() || undefined,
      level: manualLevel,
      category: manualCategory.trim() || 'General',
      exampleDe: manualExampleDe.trim() || undefined,
      masteryScore: 0,
      attemptsCount: 0,
      correctCount: 0,
    };

    const key = getVocabItemKey(newItem);
    const exists = vocabList.some(v => getVocabItemKey(v) === key);

    if (exists) {
      showToast(`Word "${finalWord}" ${newItem.preposition ? `with preposition "${newItem.preposition}" ` : ''}is already in the vocabulary list!`);
      return;
    }

    onAddVocabItems([newItem]);
    showToast(`Word "${newItem.word}" added successfully!`);

    // Reset form
    setManualWord('');
    setManualPlural('');
    setManualNoPlural(false);
    setManualPresent3rd('');
    setManualPraeteritum('');
    setManualPerfekt('');
    setManualAntonym('');
    setManualHasPreposition(false);
    setManualPreposition('');
    setManualPrepositionCase('');
    setManualTranslationEn('');
    setManualExampleDe('');

    if (!keepOpen) {
      setIsAddOpen(false);
    }
  };

  // Download Vocab as Excel Spreadsheet (.xlsx)
  const handleExportExcel = () => {
    const uint8Array = exportVocabToExcelBuffer(vocabList);
    const blob = new Blob([uint8Array], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `German_Vocabulary_List_${Date.now()}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير الجدول بصيغة Excel (.xlsx) مع حفظ كافة الحروف الألمانية (Umlaut)');
  };

  // Download Vocab as CSV (UTF-8 with BOM)
  const handleExportCSV = () => {
    const csvStr = exportVocabToCSV(vocabList);
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `German_Vocabulary_List_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير الجدول بصيغة CSV (UTF-8) بنجاح');
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      
      {/* ------------------------------------------------------------------- */}
      {/* ROW 1: Standalone Search Box */}
      {/* ------------------------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search word name, translation, category, or level..."
            className="w-full pl-10 pr-24 py-2.5 sm:py-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all dir-ltr"
          />
          {searchQuery ? (
            <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* ROW 2: Filter Line (Single line when closed, expandable, result count, reset button) */}
      {/* ------------------------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
        
        {/* LINE 1: Single row with Expandable Filter button, Result Count, and Reset Filter button */}
        <div className="flex items-center justify-between gap-3">
          
          {/* Expandable Filter Button with Down Arrow */}
          <button
            type="button"
            onClick={() => setIsFilterOpen(prev => !prev)}
            className={`px-4 py-2 rounded-2xl font-black text-xs flex items-center gap-2 cursor-pointer transition-all border shadow-2xs ${
              isFilterOpen || activeCategoryTab || activeLevelTab
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filter Menu</span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isFilterOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Right Side: Result Count Badge & Reset/Cancel Filter Button */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-black flex items-center gap-1.5">
              <span>{(activeCategoryTab || activeLevelTab || searchQuery) ? 'Results:' : 'Total Words:'}</span>
              <span className="text-blue-600 dark:text-blue-400 font-extrabold">
                {(activeCategoryTab || activeLevelTab || searchQuery) ? filteredVocab.length : vocabList.length}
              </span>
            </span>

            {(activeCategoryTab || activeLevelTab) ? (
              <button
                type="button"
                onClick={() => {
                  setActiveCategoryTab(null);
                  setActiveLevelTab(null);
                }}
                className="p-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-2xl cursor-pointer transition-all flex items-center justify-center shadow-2xs"
                title="Clear Filters"
                aria-label="Clear Filters"
              >
                <FilterX className="w-4 h-4 text-rose-500" />
              </button>
            ) : null}
          </div>
        </div>

        {/* LINE 2: Active Filters Tag Chips (Appears on line 2 if filters are active) */}
        {(activeCategoryTab || activeLevelTab) && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400">Active Filters:</span>
            {activeCategoryTab && (
              <span className={`px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 border ${
                activeCategoryTab === 'noun'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-900'
                  : activeCategoryTab === 'verb'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900'
                  : activeCategoryTab === 'adjective'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-900'
                  : activeCategoryTab === 'expression'
                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-900'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}>
                <span>Type: {activeCategoryTab}</span>
                <button
                  type="button"
                  onClick={() => setActiveCategoryTab(null)}
                  className="hover:opacity-75 cursor-pointer text-xs"
                >
                  ✕
                </button>
              </span>
            )}

            {activeLevelTab && (
              <span className="px-2.5 py-1 rounded-xl bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300 text-xs font-black flex items-center gap-1.5 border border-yellow-200 dark:border-yellow-900">
                <span>Level: {activeLevelTab}</span>
                <button
                  type="button"
                  onClick={() => setActiveLevelTab(null)}
                  className="hover:text-yellow-600 cursor-pointer text-xs"
                >
                  ✕
                </button>
              </span>
            )}
          </div>
        )}

        {/* Collapsible Filter Choices Panel (Word Types and CEFR Levels) */}
        {isFilterOpen && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 animate-in fade-in duration-150">
            
            {/* 1. Word Type Selection */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => setActiveCategoryTab(prev => prev === 'noun' ? null : 'noun')}
                className={`px-3 py-2 rounded-2xl font-black text-xs transition-all cursor-pointer flex items-center justify-between gap-1 border ${
                  activeCategoryTab === 'noun'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-blue-50 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>Noun</span>
                <span className={`px-1.5 py-0.5 rounded-lg text-[10px] font-black ${
                  activeCategoryTab === 'noun' ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                }`}>
                  {nounCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCategoryTab(prev => prev === 'verb' ? null : 'verb')}
                className={`px-3 py-2 rounded-2xl font-black text-xs transition-all cursor-pointer flex items-center justify-between gap-1 border ${
                  activeCategoryTab === 'verb'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-emerald-50 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>Verb</span>
                <span className={`px-1.5 py-0.5 rounded-lg text-[10px] font-black ${
                  activeCategoryTab === 'verb' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                }`}>
                  {verbCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCategoryTab(prev => prev === 'adjective' ? null : 'adjective')}
                className={`px-3 py-2 rounded-2xl font-black text-xs transition-all cursor-pointer flex items-center justify-between gap-1 border ${
                  activeCategoryTab === 'adjective'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-amber-50 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>Adjective</span>
                <span className={`px-1.5 py-0.5 rounded-lg text-[10px] font-black ${
                  activeCategoryTab === 'adjective' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}>
                  {adjectiveCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCategoryTab(prev => prev === 'expression' ? null : 'expression')}
                className={`px-3 py-2 rounded-2xl font-black text-xs transition-all cursor-pointer flex items-center justify-between gap-1 border ${
                  activeCategoryTab === 'expression'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-purple-50 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>Expression</span>
                <span className={`px-1.5 py-0.5 rounded-lg text-[10px] font-black ${
                  activeCategoryTab === 'expression' ? 'bg-purple-700 text-white' : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                }`}>
                  {expressionCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCategoryTab(prev => prev === 'Others' ? null : 'Others')}
                className={`px-3 py-2 rounded-2xl font-black text-xs transition-all cursor-pointer flex items-center justify-between gap-1 border ${
                  activeCategoryTab === 'Others'
                    ? 'bg-slate-600 text-white border-slate-600 shadow-2xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>Others</span>
                <span className={`px-1.5 py-0.5 rounded-lg text-[10px] font-black shrink-0 ${
                  activeCategoryTab === 'Others' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
                }`}>
                  {othersCount}
                </span>
              </button>
            </div>

            {/* 2. CEFR Level Selection - Single row for all levels (A1 to C2) */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="grid grid-cols-6 gap-1 sm:gap-1.5">
                {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const).map(lvl => {
                  const isActive = activeLevelTab === lvl;
                  const count = levelCounts[lvl];
                  return (
                    <div key={lvl} className="flex flex-col items-center min-w-0">
                      <button
                        type="button"
                        onClick={() => setActiveLevelTab(prev => prev === lvl ? null : lvl)}
                        className={`w-full py-1.5 px-1 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center justify-center border ${
                          isActive
                            ? 'bg-yellow-500 text-yellow-950 border-yellow-500 shadow-2xs'
                            : 'bg-slate-50 text-slate-700 hover:bg-yellow-50 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <span>{lvl}</span>
                      </button>
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                        ( {count} )
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Sort Order Selection */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
              <div className="text-[11px] font-black text-slate-400 flex items-center gap-1.5 px-0.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-blue-500" />
                <span>Sort Order:</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSortMode('alphabetical');
                    localStorage.setItem('vocab_sort_mode', 'alphabetical');
                    window.dispatchEvent(new CustomEvent('app:vocab-set-sort', { detail: 'alphabetical' }));
                  }}
                  className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer border text-center ${
                    sortMode === 'alphabetical'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Alphabetical
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSortMode('newest');
                    localStorage.setItem('vocab_sort_mode', 'newest');
                    window.dispatchEvent(new CustomEvent('app:vocab-set-sort', { detail: 'newest' }));
                  }}
                  className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer border text-center ${
                    sortMode === 'newest'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Newest first
                </button>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ------------------------------------------------------------------- */}
      {/* CARDS DISPLAY GRID */}
      {/* ------------------------------------------------------------------- */}
      {filteredVocab.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No vocabulary matches your filter.
          </h3>
          <p className="text-xs text-slate-400">Add new words using Smart Add or Import.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredVocab.map((item, idx) => (
            <VocabCard
              key={`${item.id}_${idx}`}
              item={item}
              idx={idx}
              onEdit={(itemToEdit) => setEditingItem(itemToEdit)}
              onDeleteSingle={handleDeleteSingleVocabItem}
            />
          ))}
        </div>
      )}

      {/* Edit Word Modal */}
      {editingItem && (
        <VocabEditModal
          item={editingItem}
          onSave={(updatedItem) => {
            if (onUpdateVocabItem) {
              onUpdateVocabItem(updatedItem);
            }
            setEditingItem(null);
            showToast('Word updated successfully!');
          }}
          onClose={() => setEditingItem(null)}
        />
      )}

      {/* Back to Top button at the end of vocabulary list */}
      {filteredVocab.length > 0 && (
        <div className="flex justify-center pt-6 pb-2">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="px-6 py-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-black flex items-center gap-2 shadow-xs cursor-pointer transition-all hover:-translate-y-0.5"
          >
            <ArrowUp className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
            <span>Back to Top</span>
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* SMART / MANUAL WORD ADD MODAL */}
      {/* ------------------------------------------------------------------- */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full space-y-5 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>Add New Word</span>
              </h3>

              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold p-1 cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            {/* MANUAL FORM ENTRY */}
            <form onSubmit={e => handleManualWordSubmit(e, false)} className="space-y-4 animate-fade-in pt-1">
                
                {/* 1. Word Type Selection (Checkboxes / Radio Pills) */}
                <div>
                  <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block mb-1.5">
                    1. Word Type:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <button
                      type="button"
                      onClick={() => setManualType('noun')}
                      className={`py-2.5 px-3 rounded-2xl border text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        manualType === 'noun'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                      }`}
                    >
                      <span>Noun</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setManualType('verb')}
                      className={`py-2.5 px-3 rounded-2xl border text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        manualType === 'verb'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                      }`}
                    >
                      <span>Verb</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setManualType('adjective')}
                      className={`py-2.5 px-3 rounded-2xl border text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        manualType === 'adjective'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                      }`}
                    >
                      <span>Adjective</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setManualType('expression')}
                      className={`py-2.5 px-3 rounded-2xl border text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        manualType === 'expression'
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-purple-400'
                      }`}
                    >
                      <span>Expression</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setManualType('other')}
                      className={`py-2.5 px-3 rounded-2xl border text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        manualType === 'other' || manualType === 'preposition'
                          ? 'bg-slate-600 text-white border-slate-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                      }`}
                    >
                      <span>Other</span>
                    </button>
                  </div>
                </div>

                {/* 2. Main German Word */}
                <div>
                  <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block mb-1">
                    2. German Word <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    value={manualWord}
                    onChange={e => setManualWord(e.target.value)}
                    placeholder={
                      manualType === 'noun' ? 'e.g. Tisch or der Tisch' :
                      manualType === 'verb' ? 'e.g. gehen or schwimmen' :
                      manualType === 'adjective' ? 'e.g. schön or groß' :
                      manualType === 'expression' ? 'e.g. Angst haben or im Grunde' : 'e.g. schnell'
                    }
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 dir-ltr"
                  />
                </div>

                {/* 3. TYPE-SPECIFIC FIELDS */}
                {manualType === 'noun' && (
                  <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-2xl space-y-3">
                    <span className="text-xs font-black text-blue-900 dark:text-blue-300 block">
                      Noun Details:
                    </span>

                    {/* Gender / Article Pills */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Article / Gender:
                      </label>
                      <div className="grid grid-cols-4 gap-2 dir-ltr">
                        {(['der', 'die', 'das', ''] as const).map(g => (
                          <button
                            key={g || 'none'}
                            type="button"
                            onClick={() => setManualGender(g)}
                            className={`py-1.5 px-2 rounded-xl text-xs font-black border transition-all cursor-pointer text-center ${
                              manualGender === g
                                ? g === 'der' ? 'bg-blue-600 text-white border-blue-600'
                                  : g === 'die' ? 'bg-rose-600 text-white border-rose-600'
                                  : g === 'das' ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-slate-700 text-white border-slate-700'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                            }`}
                          >
                            {g ? g : 'None'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Plural Input with No Plural Checkbox */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                          Plural Form:
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={manualNoPlural}
                            onChange={e => {
                              setManualNoPlural(e.target.checked);
                              if (e.target.checked) setManualPlural('');
                            }}
                            className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                            No plural form (Kein Plural)
                          </span>
                        </label>
                      </div>
                      {!manualNoPlural && (
                        <input
                          type="text"
                          value={manualPlural}
                          onChange={e => setManualPlural(e.target.value)}
                          placeholder="e.g. die Tische or Tische"
                          className="w-full p-2.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 dir-ltr"
                        />
                      )}
                    </div>
                  </div>
                )}

                {manualType === 'verb' && (
                  <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-900 dark:text-emerald-300 block">
                        Verb Conjugations:
                      </span>

                      {/* Irregular Checkbox */}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={manualIsIrregular}
                          onChange={e => setManualIsIrregular(e.target.checked)}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span className="text-xs font-black text-emerald-900 dark:text-emerald-300">
                          Irregular Verb
                        </span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 dir-ltr">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                          Präsens (3rd) [er/sie/es]:
                        </label>
                        <input
                          type="text"
                          value={manualPresent3rd}
                          onChange={e => setManualPresent3rd(e.target.value)}
                          placeholder="e.g. sieht / geht"
                          className="w-full p-2.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                          Präteritum:
                        </label>
                        <input
                          type="text"
                          value={manualPraeteritum}
                          onChange={e => setManualPraeteritum(e.target.value)}
                          placeholder="e.g. sah / ging"
                          className="w-full p-2.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                          Perfekt:
                        </label>
                        <input
                          type="text"
                          value={manualPerfekt}
                          onChange={e => setManualPerfekt(e.target.value)}
                          placeholder="e.g. hat gesehen / ist gegangen"
                          className="w-full p-2.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {manualType === 'adjective' && (
                  <div className="p-3.5 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 rounded-2xl space-y-2">
                    <label className="text-xs font-black text-amber-900 dark:text-amber-300 block mb-1">
                      Antonym / Opposite:
                    </label>
                    <input
                      type="text"
                      value={manualAntonym}
                      onChange={e => setManualAntonym(e.target.value)}
                      placeholder="e.g. klein (for groß) or hässlich (for schön)"
                      className="w-full p-2.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 dir-ltr"
                    />
                  </div>
                )}

                {/* 4. Preposition & Grammatical Case Section with Checkbox (Available for Verbs, Expressions & Other) */}
                {(manualType === 'verb' || manualType === 'expression' || manualType === 'other') && (
                  <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 rounded-2xl space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={manualHasPreposition}
                        onChange={e => {
                          setManualHasPreposition(e.target.checked);
                          if (!e.target.checked) {
                            setManualPreposition('');
                            setManualPrepositionCase('');
                          }
                        }}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="text-xs font-black text-indigo-950 dark:text-indigo-200">
                        Add Preposition & Grammatical Case
                      </span>
                    </label>

                    {manualHasPreposition && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 animate-fade-in">
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Fixed Preposition:
                          </label>
                          <input
                            type="text"
                            value={manualPreposition}
                            onChange={e => setManualPreposition(e.target.value)}
                            placeholder="e.g. um, mit, auf, an, bei, für"
                            className="w-full p-2.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 dir-ltr"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Grammatical Case:
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 dir-ltr">
                            {(['Akkusativ', 'Dativ', 'Genitiv', 'Wechsel'] as const).map(c => {
                              const label = c === 'Akkusativ' ? 'Akk.' : c === 'Dativ' ? 'Dat.' : c === 'Genitiv' ? 'Gen.' : 'Wechsel';
                              return (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => setManualPrepositionCase(prev => prev === c ? '' : c)}
                                  className={`py-1.5 px-2 rounded-xl text-[11px] font-black border transition-all cursor-pointer text-center ${
                                    manualPrepositionCase === c
                                      ? 'bg-indigo-600 text-white border-indigo-600'
                                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                                  }`}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. English Translation */}
                <div>
                  <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block mb-1">
                    English Translation:
                  </label>
                  <input
                    type="text"
                    value={manualTranslationEn}
                    onChange={e => setManualTranslationEn(e.target.value)}
                    placeholder="e.g. table, swim, beautiful"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 dir-ltr"
                  />
                </div>

                {/* 6. Level Selection */}
                <div>
                  <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block mb-1">
                    CEFR Level:
                  </label>
                  <div className="grid grid-cols-4 gap-1.5 dir-ltr">
                    {(['A1', 'A2', 'B1', 'B2'] as const).map(lvl => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setManualLevel(lvl)}
                        className={`py-2 px-2 rounded-xl text-xs font-black border transition-all cursor-pointer text-center ${
                          manualLevel === lvl
                            ? 'bg-yellow-500 text-yellow-950 border-yellow-500 shadow-2xs'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-yellow-400'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 7. Example Sentence */}
                <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block">
                    Example Sentence (German):
                  </label>

                  <input
                    type="text"
                    value={manualExampleDe}
                    onChange={e => setManualExampleDe(e.target.value)}
                    placeholder="e.g. Der Tisch ist groß."
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 dir-ltr"
                  />
                </div>

                {/* Modal Footer / Action Buttons */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={!manualWord.trim()}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5 transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Save Word</span>
                    </button>
                  </div>
                </div>

              </form>

          </div>
        </div>
      )}

      {/* UPLOAD / SMART IMPORT MODAL */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-xl w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <FolderUp className="w-5 h-5 text-blue-600" />
                <span>Import Vocabulary</span>
              </h3>

              <button
                onClick={() => {
                  setIsUploadOpen(false);
                  setAiBulkParsedItems(null);
                  setExcelParsedItems(null);
                  setUploadedFileName('');
                  setFileText('');
                  setManualInputText('');
                }}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold p-1 cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            {!aiBulkParsedItems ? (
              <div className="space-y-4">
                {/* Import Method Tabs: File Upload vs Paste CSV Code */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setImportTab('file')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      importTab === 'file'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/80 dark:border-slate-800'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <FolderUp className="w-4 h-4 shrink-0" />
                    <span>Upload file</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportTab('manual')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      importTab === 'manual'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/80 dark:border-slate-800'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4 shrink-0" />
                    <span>Paste CSV Code</span>
                  </button>
                </div>

                {importTab === 'file' ? (
                  /* File Upload Area */
                  <div className="space-y-4 animate-fade-in">
                    <div>
                      <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block mb-2">
                        Select vocabulary file (.xlsx, .xls, .csv, .txt, .json):
                      </label>

                      <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all group">
                        <FileSpreadsheet className="w-8 h-8 text-blue-500 group-hover:scale-110 transition-transform mb-2" />
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                          Click to select Excel or CSV file
                        </span>
                        <span className="text-[11px] font-bold text-slate-400 mt-1">
                          Standard 12-column format supported (Type | Article | Word | Plural | regular/irregular | Conjugation | Preposition | Case | Antonym | EN_translation | Example | CEFR level)
                        </span>
                        <input
                          type="file"
                          accept=".csv,.xlsx,.xls,.tsv,.json,.txt,text/csv,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/comma-separated-values,*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {uploadedFileName && (
                      <div className="p-3.5 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-center justify-between gap-3 animate-fade-in">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileSpreadsheet className="w-5 h-5 text-blue-600 shrink-0" />
                          <div className="truncate">
                            <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                              {uploadedFileName}
                            </div>
                            <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300">
                              File loaded and ready for preview & import
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setUploadedFileName('');
                            setFileText('');
                            setExcelParsedItems(null);
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer text-xs font-bold shrink-0"
                          title="Delete file"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Paste CSV Code Textarea Area */
                  <div className="space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block">
                        Paste CSV code or vocabulary lines here:
                      </label>
                    </div>

                    <textarea
                      rows={7}
                      value={manualInputText}
                      onChange={e => setManualInputText(e.target.value)}
                      placeholder=""
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 dir-ltr"
                    />
                  </div>
                )}

                {/* Direct Table / CSV Import Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleProcessAndImportSpreadsheet}
                    disabled={importTab === 'file' ? !fileText.trim() : !manualInputText.trim()}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <span>Preview & Import</span>
                  </button>
                </div>
              </div>
            ) : (
              /* PREVIEW OF AI BULK PARSED ITEMS BEFORE CONFIRMATION */
              <div className="space-y-4 animate-fade-in">
                {/* Header & Category Stats */}
                <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-black text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>Showing new words only ({aiBulkParsedItems.length} new items)</span>
                    </span>
                    <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/80 px-2.5 py-1 rounded-full">
                      Preview Before Save
                    </span>
                  </div>

                  {/* Duplicate count notice */}
                  {omittedDuplicateCount > 0 && (
                    <div className="p-2.5 rounded-xl bg-amber-100/90 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200 text-xs font-bold flex items-center justify-between">
                      <span>Omitted duplicate items:</span>
                      <span className="bg-amber-200/80 dark:bg-amber-900/90 px-2.5 py-0.5 rounded-lg font-black text-amber-950 dark:text-amber-100 border border-amber-300 dark:border-amber-700">
                        {omittedDuplicateCount} duplicates
                      </span>
                    </div>
                  )}

                  {/* Summary Badge Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 pt-1">
                    <span className="bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 px-2.5 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800">
                      Nouns: {aiBulkParsedItems.filter(i => i.type === 'noun').length}
                    </span>
                    <span className="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 px-2.5 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      Verbs: {aiBulkParsedItems.filter(i => i.type === 'verb').length}
                    </span>
                    <span className="bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 px-2.5 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800">
                      Adjectives: {aiBulkParsedItems.filter(i => i.type === 'adjective' || i.type === 'adverb').length}
                    </span>
                    <span className="bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 px-2.5 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                      Expressions: {aiBulkParsedItems.filter(i => i.type === 'expression').length}
                    </span>
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      Others: {aiBulkParsedItems.filter(i => i.type === 'Others' || i.type === 'other' || i.type === 'preposition').length}
                    </span>
                  </div>
                </div>

                {/* Interactive Scrollable Item List */}
                <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
                  {aiBulkParsedItems.map((item, idx) => (
                    <div key={idx} className="p-3.5 bg-slate-50 dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs shadow-xs hover:border-blue-400 transition-all">
                      
                      {/* Top Row: Word, Article/Gender, Type Selector, CEFR Level, Delete */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-700/80 pb-2">
                        
                        {/* Word & Article */}
                        <div className="flex items-center gap-2 dir-ltr">
                          {/* Gender selector for nouns */}
                          {item.type === 'noun' && (
                            <select
                              value={item.gender || 'der'}
                              onChange={e => handleUpdatePreviewItem(idx, { gender: e.target.value as GrammaticalGender })}
                              className={`px-2 py-1 rounded-lg text-xs font-black dir-ltr focus:outline-none cursor-pointer border ${
                                item.gender === 'der' ? 'bg-blue-600 text-white border-blue-700' :
                                item.gender === 'die' ? 'bg-rose-600 text-white border-rose-700' :
                                'bg-amber-600 text-white border-amber-700'
                              }`}
                            >
                              <option value="der">der</option>
                              <option value="die">die</option>
                              <option value="das">das</option>
                            </select>
                          )}

                          {/* Word Input */}
                          <input
                            type="text"
                            value={item.word}
                            onChange={e => handleUpdatePreviewItem(idx, { word: e.target.value })}
                            className="font-extrabold text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg text-sm dir-ltr focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>

                        {/* Type Selector Dropdown, CEFR & Delete */}
                        <div className="flex items-center gap-2">
                          <select
                            value={item.type}
                            onChange={e => handleUpdatePreviewItem(idx, { type: e.target.value as VocabType })}
                            className={`px-2.5 py-1 rounded-lg text-xs font-extrabold cursor-pointer border focus:ring-2 focus:ring-blue-500 ${
                              item.type === 'noun' ? 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800' :
                              item.type === 'verb' ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' :
                              item.type === 'adjective' ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800' :
                              item.type === 'expression' ? 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800' :
                              'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <option value="noun">🏷️ Noun</option>
                            <option value="verb">⚡ Verb</option>
                            <option value="adjective">🎨 Adjective</option>
                            <option value="expression">💬 Expression</option>
                            <option value="Others">🧩 Other</option>
                          </select>

                          {/* CEFR Level Selector - Yellow Badge Style */}
                          <select
                            value={item.level || 'A1'}
                            onChange={e => handleUpdatePreviewItem(idx, { level: e.target.value as CefrLevel })}
                            className="px-2 py-1 bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-300 font-extrabold rounded-lg text-xs border border-yellow-200 dark:border-yellow-900 cursor-pointer shadow-2xs"
                          >
                            <option value="A1">A1</option>
                            <option value="A2">A2</option>
                            <option value="B1">B1</option>
                            <option value="B2">B2</option>
                            <option value="C1">C1</option>
                            <option value="C2">C2</option>
                          </select>

                          <button
                            onClick={() => handleRemovePreviewItem(idx)}
                            title="Delete Word"
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Bottom Row: Plural / Grammar Props & Translation */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                        {item.type === 'noun' ? (
                          <div className="flex items-center gap-1.5 dir-ltr">
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Plural:</span>
                            <input
                              type="text"
                              value={item.plural || ''}
                              placeholder="e.g. die Tische"
                              onChange={e => handleUpdatePreviewItem(idx, { plural: e.target.value })}
                              className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 dir-ltr focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1 text-[11px] font-bold dir-ltr">
                            {item.type === 'verb' && (
                              <>
                                <span className="text-emerald-700 dark:text-emerald-400">
                                  Verb Forms: {item.present3rd || item.praeteritum || item.perfekt ? `${item.present3rd || '—'} / ${item.praeteritum || '—'} / ${item.perfekt || '—'}` : 'Conjugations auto-parsed'}
                                </span>
                                {item.preposition && (
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/70 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800 shadow-2xs">
                                      {item.preposition} {item.prepositionCase ? `+ (${getAbbreviatedCase(item.prepositionCase)})` : ''}
                                    </span>
                                  </div>
                                )}
                              </>
                            )}
                            {item.type === 'expression' && (
                              <div>
                                {item.preposition ? (
                                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/70 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800 shadow-2xs">
                                    {item.preposition} {item.prepositionCase ? `+ (${getAbbreviatedCase(item.prepositionCase)})` : ''}
                                  </span>
                                ) : (
                                  <span className="text-indigo-700 dark:text-indigo-400">Fixed phrase / Expression</span>
                                )}
                              </div>
                            )}
                            {item.type === 'adjective' && (
                              <span className="text-amber-700 dark:text-amber-400">
                                {item.antonym ? `Opposite: ${item.antonym}` : 'Adjective (Gegenteil)'}
                              </span>
                            )}
                            {item.type === 'Others' && (
                              <span className="text-slate-500 dark:text-slate-400">
                                Direct word translation
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">Translation:</span>
                          <input
                            type="text"
                            value={item.translationAr || item.translationEn || ''}
                            onChange={e => handleUpdatePreviewItem(idx, { translationAr: e.target.value, translationEn: e.target.value })}
                            className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                    </div>
                  ))}
                </div>

                {/* Preview Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setAiBulkParsedItems(null);
                      setUploadedFileName('');
                      setFileText('');
                    }}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Back to File Selection</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmAiBulkSave}
                    className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Save Vocabulary</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* SINGLE DELETE CONFIRMATION MODAL */}
      {singleDeleteModalItem && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Confirm Word Deletion</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                Are you sure you want to permanently delete <span className="font-extrabold text-slate-900 dark:text-white dir-ltr inline-block">"{singleDeleteModalItem.word}"</span> ({singleDeleteModalItem.translationEn || singleDeleteModalItem.translationAr})?
              </p>
            </div>
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSingleDeleteModalItem(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmSingleDelete(singleDeleteModalItem.id)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Word</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-extrabold text-xs sm:text-sm border border-slate-700 dark:border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Floating Scroll to Top Button */}
      {showScrollTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 p-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-xl transition-all duration-200 cursor-pointer flex items-center justify-center animate-fade-in border border-blue-500 hover:scale-105"
          title="Back to Top"
          aria-label="Back to Top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

    </div>
  );
};
