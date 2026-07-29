import React, { useState, useEffect } from 'react';
import { VocabItem, VocabType, GrammaticalGender, GrammaticalCase } from '../types';
import { AudioPlayer } from './AudioPlayer';
import { parseVocabFile, inferGender, generateFallbackPlural, exportVocabToCSV, cleanGermanCategory } from '../services/vocabParser';
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
  CheckSquare,
  Info,
  HelpCircle
} from 'lucide-react';
import { getVerbConjugations, sanitizeConjugationWord } from '../services/germanConjugator';

interface VocabManagerProps {
  vocabList: VocabItem[];
  onAddVocabItems: (items: VocabItem[]) => void;
  onDeleteVocabItem: (id: string) => void;
  onDeleteMultipleVocabItems?: (ids: string[]) => void;
  onResetDefaultVocab?: () => void;
}

export type MainCategoryTab = 'all' | 'noun' | 'verb' | 'irregular_verb';

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
  const conjugations = getVerbConjugations(item);
  const conjugationStr = formatVerbConjugation(
    conjugations.present3rd,
    conjugations.praeteritum,
    conjugations.perfekt
  );

  if (!conjugationStr) return null;

  return (
    <div className="mt-2 p-2.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-between gap-2 transition-all">
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200">
          Conjugation:
        </span>
        {item.isIrregular ? (
          <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-[10px] font-bold">
            Irregular
          </span>
        ) : (
          <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold">
            Regular
          </span>
        )}
      </div>

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

/* ------------------------------------------------------------------- */
/* VOCAB CARD COMPONENT */
/* ------------------------------------------------------------------- */
interface VocabCardProps {
  item: VocabItem;
  idx: number;
  onDeleteSingle: (id: string) => void;
}

const VocabCard: React.FC<VocabCardProps> = ({
  item,
  idx,
  onDeleteSingle,
}) => {
  const cleanPlural = cleanPluralText(item.plural);
  const displayCategory = cleanGermanCategory(item.category);
  const nounArticle = item.gender || (item.type === 'noun' ? inferGender(item.word) : undefined);

  return (
    <div className="group relative bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs hover:shadow-md transition-all duration-200">
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          {/* Card Number without # */}
          <span className="text-[11px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
            {idx + 1}
          </span>

          {/* Type Badge: der / die / das for Nouns */}
          {(item.type === 'noun' || nounArticle) && (
            <span className={`px-2.5 py-0.5 rounded-lg font-black text-xs border ${
              nounArticle === 'der'
                ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-900'
                : nounArticle === 'die'
                ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-900'
                : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900'
            }`}>
              {nounArticle || 'der'}
            </span>
          )}

          {item.type === 'verb' && (
            <span className="px-2.5 py-0.5 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-extrabold text-xs border border-purple-200 dark:border-purple-900">
              Verb
            </span>
          )}
        </div>

        {/* Delete Control */}
        <button
          type="button"
          onClick={() => onDeleteSingle(item.id)}
          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
          title="Delete Word"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Main German Word Display + Audio Button on the EXACT SAME LEVEL */}
      <div className="space-y-1 my-2">
        <div className="flex items-center justify-between gap-2 dir-ltr">
          <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            {item.gender ? `${item.gender} ` : ''}{item.word}
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

      {/* Verb Conjugation Block */}
      {item.type === 'verb' && <VerbConjugationBlock item={item} />}

      {/* Translation & German Category Only */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mt-3 flex items-center justify-between">
        <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400">
          {item.translationAr}
        </span>
        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
          {displayCategory}
        </span>
      </div>

      {/* Sample Sentence if available */}
      {item.exampleDe && (
        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] space-y-0.5">
          <p className="dir-ltr font-semibold text-slate-700 dark:text-slate-300">
            "{cleanDisplay(item.exampleDe)}"
          </p>
          {item.exampleAr && (
            <p className="text-slate-400 dark:text-slate-500 text-[10px]">
              {cleanDisplay(item.exampleAr)}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------- */
/* MAIN VOCAB MANAGER COMPONENT */
/* ------------------------------------------------------------------- */
export const VocabManager: React.FC<VocabManagerProps> = ({
  vocabList,
  onAddVocabItems,
  onDeleteVocabItem,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryTab, setActiveCategoryTab] = useState<MainCategoryTab>('all');
  
  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [showSmartAddInfo, setShowSmartAddInfo] = useState(false);
  const [showImportInfo, setShowImportInfo] = useState(false);
  
  // File Upload / Smart Import State
  const [fileText, setFileText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isAiBulkParsing, setIsAiBulkParsing] = useState(false);
  const [aiBulkParsedItems, setAiBulkParsedItems] = useState<VocabItem[] | null>(null);

  // SMART AUTO-FORMAT SINGLE WORD ADD
  const [smartWordInput, setSmartWordInput] = useState('');
  const [isSmartParsing, setIsSmartParsing] = useState(false);
  const [smartParsedItem, setSmartParsedItem] = useState<VocabItem | null>(null);
  const [smartParseError, setSmartParseError] = useState<string | null>(null);

  // Custom Modals & Toast State
  const [singleDeleteModalItem, setSingleDeleteModalItem] = useState<VocabItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
      handleExportCSV();
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

  // Category counts
  const nounCount = vocabList.filter(v => (v.type || '').toLowerCase() === 'noun' || v.gender).length;
  const verbCount = vocabList.filter(v => (v.type || '').toLowerCase() === 'verb').length;
  const irregularVerbCount = vocabList.filter(v => (v.type || '').toLowerCase() === 'verb' && v.isIrregular).length;

  // Filtered Vocab
  const filteredVocab = vocabList.filter(item => {
    const itemType = (item.type || (item.gender ? 'noun' : '')).toLowerCase();
    const isNounOrVerb = itemType === 'noun' || itemType === 'verb' || item.gender !== undefined;
    if (!isNounOrVerb) return false;

    const query = searchQuery.toLowerCase().trim();
    const wordText = (item.word || '').toLowerCase();
    const catText = cleanGermanCategory(item.category).toLowerCase();

    const matchesSearch =
      !query ||
      wordText.includes(query) ||
      catText.includes(query);

    let matchesCategory = true;
    if (activeCategoryTab === 'noun') {
      matchesCategory = itemType === 'noun' || item.gender !== undefined;
    } else if (activeCategoryTab === 'verb') {
      matchesCategory = itemType === 'verb';
    } else if (activeCategoryTab === 'irregular_verb') {
      matchesCategory = itemType === 'verb' && Boolean(item.isIrregular);
    }

    return matchesSearch && matchesCategory;
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

  // Handle File Input Selection
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setFileText(content);
        const parsed = parseVocabFile(content, file.name);
        if (parsed.length > 0) {
          setAiBulkParsedItems(parsed);
          showToast(`Inferred properties for ${parsed.length} items!`);
        }
      }
    };
    reader.readAsText(file);
  };

  // Handle Local Fast Text Parse
  const handleParsePastedText = () => {
    if (!fileText.trim()) return;
    const parsed = parseVocabFile(fileText, uploadedFileName || 'pasted_text.txt');
    if (parsed.length > 0) {
      setAiBulkParsedItems(parsed);
      showToast(`Parsed ${parsed.length} items!`);
    } else {
      showToast('Please check the pasted text format.');
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
      showToast('Preview list cleared.');
    } else {
      setAiBulkParsedItems(copy);
    }
  };

  // Handle AI Smart Bulk Parsing Endpoint
  const handleAiBulkParse = async () => {
    if (!fileText.trim() || isAiBulkParsing) return;

    setIsAiBulkParsing(true);
    setAiBulkParsedItems(null);

    try {
      const res = await fetch('/api/vocab/parse-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textInput: fileText.trim() }),
      });

      const data = await res.json();
      if (data.items && Array.isArray(data.items) && data.items.length > 0) {
        const normalized: VocabItem[] = data.items.map((raw: any, idx: number) => ({
          id: `ai_bulk_${Date.now()}_${idx}`,
          word: raw.word,
          type: (raw.type as VocabType) || 'noun',
          gender: raw.gender,
          plural: raw.plural,
          translationAr: raw.translationAr,
          level: 'A1',
          category: raw.category || 'Smart Import',
          isIrregular: raw.isIrregular,
          present3rd: raw.present3rd,
          praeteritum: raw.praeteritum,
          perfekt: raw.perfekt,
          antonym: raw.antonym,
          case: raw.case,
          exampleDe: raw.exampleDe,
          exampleAr: raw.exampleAr,
          masteryScore: 0,
          attemptsCount: 0,
          correctCount: 0,
        }));

        setAiBulkParsedItems(normalized);
      } else {
        showToast('No clear words found. Switched to direct parser.');
        handleParsePastedText();
      }
    } catch (err) {
      console.error('AI Bulk Parse Error:', err);
      showToast('Error connecting to AI service. Using direct grammar parser.');
      handleParsePastedText();
    } finally {
      setIsAiBulkParsing(false);
    }
  };

  const handleConfirmAiBulkSave = () => {
    if (!aiBulkParsedItems || aiBulkParsedItems.length === 0) return;
    const onlyNounsAndVerbs = aiBulkParsedItems.filter(
      item => item.type === 'noun' || item.type === 'verb' || Boolean(item.gender)
    );
    if (onlyNounsAndVerbs.length === 0) {
      showToast('No valid nouns or verbs found to import.');
      return;
    }
    onAddVocabItems(onlyNounsAndVerbs);
    showToast(`Successfully saved ${onlyNounsAndVerbs.length} words!`);
    setIsUploadOpen(false);
    setFileText('');
    setUploadedFileName('');
    setAiBulkParsedItems(null);
  };

  // SMART AUTO-FORMAT SINGLE WORD ADD
  const handleSmartWordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawInput = smartWordInput.trim();
    if (!rawInput || isSmartParsing) return;

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

      return {
        id: `smart_local_${Date.now()}`,
        word: word,
        type: type,
        gender: gender || (type === 'noun' ? 'der' : undefined),
        plural: plural,
        translationAr: str,
        level: 'A1',
        category: 'Personal Entry',
        isIrregular: false,
        exampleDe: `${gender ? gender + ' ' : ''}${word} ist hier.`,
        exampleAr: `${str} is here.`,
        masteryScore: 0,
        attemptsCount: 0,
        correctCount: 0,
      };
    };

    try {
      const res = await fetch('/api/vocab/parse-smart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wordInput: rawInput }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const data = await res.json();

      if (data && data.word && data.translationAr && !data.error) {
        let normalizedType: VocabType = (data.type as string || '').toLowerCase() === 'verb' ? 'verb' : 'noun';
        if (data.gender || /^[A-ZÄÖÜ]/.test(data.word)) {
          normalizedType = 'noun';
        }

        const newItem: VocabItem = {
          id: `smart_${Date.now()}`,
          word: data.word,
          type: normalizedType,
          gender: normalizedType === 'noun' ? (data.gender || 'der') : undefined,
          plural: normalizedType === 'noun' ? data.plural : undefined,
          translationAr: data.translationAr,
          level: 'A1',
          category: data.category || 'Personal Entry',
          isIrregular: data.isIrregular,
          present3rd: data.present3rd,
          praeteritum: data.praeteritum,
          perfekt: data.perfekt,
          antonym: data.antonym,
          case: data.case,
          exampleDe: data.exampleDe,
          exampleAr: data.exampleAr,
          masteryScore: 0,
          attemptsCount: 0,
          correctCount: 0,
        };

        setSmartParsedItem(newItem);
      } else {
        setSmartParsedItem(createFallbackItem(rawInput));
      }
    } catch (err) {
      console.warn('Smart Word Parse fetch fallback activated:', err);
      setSmartParsedItem(createFallbackItem(rawInput));
    } finally {
      setIsSmartParsing(false);
    }
  };

  const handleConfirmSmartSave = () => {
    if (!smartParsedItem) return;
    if (smartParsedItem.type !== 'noun' && smartParsedItem.type !== 'verb') {
      showToast('Only nouns and verbs are allowed.');
      return;
    }
    onAddVocabItems([smartParsedItem]);
    showToast('Word added successfully!');
    setSmartParsedItem(null);
    setSmartWordInput('');
    setIsAddOpen(false);
  };

  // Download Vocab as Spreadsheet (CSV)
  const handleExportCSV = () => {
    const csvStr = exportVocabToCSV(vocabList);
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Vocabulary_List_A1_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* ------------------------------------------------------------------- */}
      {/* Search Bar */}
      {/* ------------------------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Search Input Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search word name or category..."
            className="w-full pl-10 pr-24 py-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all dir-ltr"
          />
          {searchQuery ? (
            <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-black border border-blue-200 dark:border-blue-900">
                {filteredVocab.length} results
              </span>
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
      {/* Filter and Category Selection */}
      {/* ------------------------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-3xl shadow-xs space-y-3">
        
        <div className="flex items-center justify-between px-1 border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <div className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-slate-200">
            <Filter className="w-4 h-4 text-blue-500" />
            <span>Filter Vocabulary</span>
          </div>
          <span className="text-[11px] font-extrabold text-slate-400">
            Total: {vocabList.length} words
          </span>
        </div>

        {/* Filter Options Side-by-Side in One Single Row */}
        <div className="grid grid-cols-3 gap-2">
          
          {/* 1. Nouns */}
          <button
            onClick={() => setActiveCategoryTab(prev => prev === 'noun' ? 'all' : 'noun')}
            className={`px-3 py-2.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer flex items-center justify-between gap-1.5 border ${
              activeCategoryTab === 'noun'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-slate-50 text-slate-700 hover:bg-blue-50 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
            }`}
          >
            <span className="truncate">Nouns (der/die/das)</span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black shrink-0 ${
              activeCategoryTab === 'noun' ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
            }`}>
              {nounCount}
            </span>
          </button>

          {/* 2. Verbs */}
          <button
            onClick={() => setActiveCategoryTab(prev => prev === 'verb' ? 'all' : 'verb')}
            className={`px-3 py-2.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer flex items-center justify-between gap-1.5 border ${
              activeCategoryTab === 'verb'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-slate-50 text-slate-700 hover:bg-emerald-50 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
            }`}
          >
            <span className="truncate">Verbs</span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black shrink-0 ${
              activeCategoryTab === 'verb' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
            }`}>
              {verbCount}
            </span>
          </button>

          {/* 3. Irregular Verbs */}
          <button
            onClick={() => setActiveCategoryTab(prev => prev === 'irregular_verb' ? 'all' : 'irregular_verb')}
            className={`px-3 py-2.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer flex items-center justify-between gap-1.5 border ${
              activeCategoryTab === 'irregular_verb'
                ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                : 'bg-slate-50 text-slate-700 hover:bg-amber-50 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
            }`}
          >
            <span className="truncate">Irregular Verbs</span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black shrink-0 ${
              activeCategoryTab === 'irregular_verb' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
            }`}>
              {irregularVerbCount}
            </span>
          </button>

        </div>
      </div>

      {/* VOCAB GRID / CARDS DISPLAY */}
      {filteredVocab.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No vocabulary matches your filter.
          </h3>
          <p className="text-xs text-slate-400">Add new words using Smart Add or Import.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVocab.map((item, idx) => (
            <VocabCard
              key={`${item.id}_${idx}`}
              item={item}
              idx={idx}
              onDeleteSingle={handleDeleteSingleVocabItem}
            />
          ))}
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* SMART WORD ADD MODAL */}
      {/* ------------------------------------------------------------------- */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl animate-fade-in">
            
            {/* Modal Header with (i) Info Toggle */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-amber-500" />
                  <span>Add Word (Smart Auto-Format)</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowSmartAddInfo(prev => !prev)}
                  className="p-1 text-slate-400 hover:text-amber-500 rounded-lg transition-colors cursor-pointer"
                  title="How this works"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold p-1 cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            {/* Hidden guide toggled by (i) button */}
            {showSmartAddInfo && (
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-3.5 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <div className="font-extrabold flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Smart Grammar Auto-Format Guide:</span>
                </div>
                <p className="leading-relaxed">
                  Enter any German word (e.g. <strong>Tisch</strong>, <strong>laufen</strong>) or English term. The AI automatically detects article (der/die/das), plural form, word type, and sample sentence.
                </p>
              </div>
            )}

            {/* SMART AI AUTO-FORMAT FORM */}
            <div className="space-y-4">
              {!smartParsedItem ? (
                <form onSubmit={handleSmartWordSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-black text-slate-800 dark:text-slate-200 block mb-2">
                      Enter German or English word:
                    </label>

                    <input
                      type="text"
                      required
                      autoFocus
                      value={smartWordInput}
                      onChange={e => {
                        setSmartWordInput(e.target.value);
                        setSmartParseError(null);
                      }}
                      placeholder="e.g. Tisch or laufen"
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 dir-ltr"
                    />
                  </div>

                  {smartParseError && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold">
                      {smartParseError}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddOpen(false)}
                      className="px-5 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={isSmartParsing || !smartWordInput.trim()}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2 transition-all"
                    >
                      {isSmartParsing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Parsing & formatting...</span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4 text-amber-300" />
                          <span>Parse & Format ✨</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                /* SMART PARSED LIVE PREVIEW CARD */
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 text-xs text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Parsed successfully! Preview word card:</span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {smartParsedItem.gender === 'der' && (
                          <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 font-black text-xs">der</span>
                        )}
                        {smartParsedItem.gender === 'die' && (
                          <span className="px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-800 font-black text-xs">die</span>
                        )}
                        {smartParsedItem.gender === 'das' && (
                          <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-black text-xs">das</span>
                        )}
                        <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs">
                          {smartParsedItem.type === 'noun' ? 'Noun' : smartParsedItem.type === 'verb' ? 'Verb' : 'Word'}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 font-medium">{smartParsedItem.category}</span>
                    </div>

                    <div className="flex items-center justify-between dir-ltr">
                      <span className="text-2xl font-black text-slate-900 dark:text-white">
                        {smartParsedItem.gender ? `${smartParsedItem.gender} ` : ''}{smartParsedItem.word}
                      </span>
                      <AudioPlayer text={smartParsedItem.gender ? `${smartParsedItem.gender} ${smartParsedItem.word}` : smartParsedItem.word} size="md" />
                    </div>

                    <div className="text-sm font-black text-blue-600 dark:text-blue-400">
                      Translation: {smartParsedItem.translationAr}
                    </div>

                    {cleanPluralText(smartParsedItem.plural) && (
                      <div className="text-xs text-slate-600 dark:text-slate-300 dir-ltr bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                        <strong>{cleanPluralText(smartParsedItem.plural)}</strong>
                      </div>
                    )}

                    {/* Verb Conjugation Block - Strictly for Verbs */}
                    {smartParsedItem.type === 'verb' && (
                      <VerbConjugationBlock item={smartParsedItem} />
                    )}

                    {smartParsedItem.exampleDe && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-xs space-y-1">
                        <div className="dir-ltr font-semibold text-slate-800 dark:text-slate-200">"{smartParsedItem.exampleDe}"</div>
                        {smartParsedItem.exampleAr && <div className="text-slate-500 text-[11px]">{smartParsedItem.exampleAr}</div>}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSmartParsedItem(null);
                        setSmartWordInput('');
                      }}
                      className="px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
                    >
                      🔄 Add Another Word
                    </button>

                    <button
                      type="button"
                      onClick={handleConfirmSmartSave}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm & Save Word</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* UPLOAD / SMART IMPORT MODAL */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-xl w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <FolderUp className="w-5 h-5 text-blue-600" />
                  <span>Import Vocabulary</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowImportInfo(prev => !prev)}
                  className="p-1 text-slate-400 hover:text-blue-500 rounded-lg transition-colors cursor-pointer"
                  title="How import works"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => setIsUploadOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold p-1 cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            {/* Hidden guide toggled by (i) button */}
            {showImportInfo && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-100 dark:border-blue-900/50 flex items-start gap-2 text-xs text-blue-800 dark:text-blue-300">
                <Zap className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
                <span>
                  Smart Import automatically detects gender (der/die/das), word type (noun/verb), plural form, and A1 translations.
                </span>
              </div>
            )}

            {!aiBulkParsedItems ? (
              <>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-2">
                    Select file from your device (JSON, CSV, or TXT):
                  </label>
                  <input
                    type="file"
                    accept=".json,.csv,.txt"
                    onChange={handleFileUpload}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>

                <div className="relative flex py-1 items-center">
                  <div className="grow border-t border-slate-200 dark:border-slate-800"></div>
                  <span className="shrink mx-4 text-xs text-slate-400 font-bold">Or paste text below</span>
                  <div className="grow border-t border-slate-200 dark:border-slate-800"></div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Copied Vocabulary Text (one per line or raw text):
                  </label>
                  <textarea
                    value={fileText}
                    onChange={e => setFileText(e.target.value)}
                    rows={5}
                    placeholder="e.g.:
Tisch
die Zeitung
gehen
das Buch / die Bücher"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <button
                    onClick={() => {
                      setIsUploadOpen(false);
                      setFileText('');
                      setUploadedFileName('');
                      setAiBulkParsedItems(null);
                    }}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleParsePastedText}
                      disabled={!fileText.trim()}
                      className="px-4 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-300 disabled:opacity-50 cursor-pointer"
                    >
                      📄 Direct Import
                    </button>

                    <button
                      onClick={handleAiBulkParse}
                      disabled={!fileText.trim() || isAiBulkParsing}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                    >
                      {isAiBulkParsing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                          <span>Parsing & classifying...</span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4 text-amber-300" />
                          <span>Process & Import (AI)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* PREVIEW OF AI BULK PARSED ITEMS BEFORE CONFIRMATION */
              <div className="space-y-4 animate-fade-in">
                {/* Header & Category Stats */}
                <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>Parsed Vocabulary Preview ({aiBulkParsedItems.length} items)</span>
                    </span>
                    <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/80 px-2.5 py-1 rounded-full">
                      Preview Before Save
                    </span>
                  </div>

                  {/* Summary Badge Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 pt-1">
                    <span className="bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 px-2.5 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800">
                      Nouns: {aiBulkParsedItems.filter(i => i.type === 'noun').length}
                    </span>
                    <span className="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 px-2.5 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      Verbs: {aiBulkParsedItems.filter(i => i.type === 'verb').length}
                    </span>
                    <span className="bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 px-2.5 py-0.5 rounded-lg border border-purple-200 dark:border-purple-800">
                      Adjectives: {aiBulkParsedItems.filter(i => i.type === 'adjective' || i.type === 'adverb').length}
                    </span>
                  </div>
                </div>

                {/* Interactive Scrollable Item List */}
                <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
                  {aiBulkParsedItems.map((item, idx) => (
                    <div key={idx} className="p-3.5 bg-slate-50 dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs shadow-xs hover:border-blue-400 transition-all">
                      
                      {/* Top Row: Word, Article/Gender, Type Selector, Delete */}
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

                        {/* Type Selector Dropdown & Delete */}
                        <div className="flex items-center gap-2">
                          <select
                            value={item.type}
                            onChange={e => handleUpdatePreviewItem(idx, { type: e.target.value as VocabType })}
                            className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-extrabold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                          >
                            <option value="noun">🏷️ Noun</option>
                            <option value="verb">⚡ Verb</option>
                            <option value="adjective">🎨 Adjective</option>
                          </select>

                          <button
                            onClick={() => handleRemovePreviewItem(idx)}
                            title="Remove word"
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Bottom Row: Plural & Translation */}
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
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                            <span>Properties auto-inferred</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">Translation:</span>
                          <input
                            type="text"
                            value={item.translationAr}
                            onChange={e => handleUpdatePreviewItem(idx, { translationAr: e.target.value })}
                            className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                    </div>
                  ))}
                </div>

                {/* Preview Action Buttons */}
                <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => setAiBulkParsedItems(null)}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    🔄 Edit Input Text
                  </button>

                  <button
                    onClick={handleConfirmAiBulkSave}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Save All ({aiBulkParsedItems.length})</span>
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
                Are you sure you want to permanently delete <span className="font-extrabold text-slate-900 dark:text-white dir-ltr inline-block">"{singleDeleteModalItem.word}"</span> ({singleDeleteModalItem.translationAr})?
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

    </div>
  );
};
