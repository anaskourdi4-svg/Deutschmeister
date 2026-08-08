import { VocabItem, VocabType, GrammaticalGender, GrammaticalCase, CefrLevel } from '../types';
import { getVerbConjugations } from './germanConjugator';
import * as XLSX from 'xlsx';

export function parseExcelBuffer(buffer: ArrayBuffer): { items: VocabItem[]; plainText: string } {
  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) return { items: [], plainText: '' };

    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' });
    const rows: string[][] = rawRows.map(row => (Array.isArray(row) ? row.map(cell => String(cell || '').trim()) : []));

    const plainText = XLSX.utils.sheet_to_csv(worksheet);

    const items = parseGoogleSheetRows(rows);
    return { items, plainText };
  } catch (e) {
    console.error('Error reading Excel spreadsheet buffer:', e);
    return { items: [], plainText: '' };
  }
}

export function detectDelimiter(csvContent: string): string {
  if (!csvContent) return ',';

  const lines = csvContent
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .slice(0, 15);

  if (lines.length === 0) return ',';

  const candidates = ['\t', ';', ',', '|', '::', ':'];
  let bestDelim = ',';
  let maxCount = 0;

  for (const delim of candidates) {
    let count = 0;
    for (const line of lines) {
      let inside = false;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') inside = !inside;
        else if (line[i] === delim && !inside) count++;
      }
    }
    if (count > maxCount) {
      maxCount = count;
      bestDelim = delim;
    }
  }

  if (maxCount === 0) {
    if (lines.some(l => l.includes('\t'))) return '\t';
    if (lines.some(l => / {2,}/.test(l))) return 'MULTI_SPACE';
  }

  return bestDelim;
}

export function parseCSVLine(line: string, customDelimiter?: string): string[] {
  let trimmed = line.trim();
  if (!trimmed) return [];

  if (customDelimiter === 'MULTI_SPACE') {
    return trimmed.split(/ {2,}/).map(s => s.trim().replace(/^"(.*)"$/, '$1'));
  }

  // If the entire line is wrapped in outer quotes
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    const unquoted = trimmed.slice(1, -1);
    if ((unquoted.includes(',') || unquoted.includes('\t') || unquoted.includes(';') || unquoted.includes('|')) && !unquoted.includes('","')) {
      trimmed = unquoted;
    }
  }

  let delimiter = customDelimiter || ',';
  if (!customDelimiter) {
    if (trimmed.includes('\t')) delimiter = '\t';
    else if (trimmed.includes(';') && !trimmed.includes(',')) delimiter = ';';
    else if (trimmed.includes('|') && !trimmed.includes(',')) delimiter = '|';
  }

  const cells: string[] = [];
  let insideQuotes = false;
  let currentCell = '';

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    if (char === '"') {
      if (insideQuotes && trimmed[i + 1] === '"') {
        currentCell += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      cells.push(currentCell.trim().replace(/^"(.*)"$/, '$1'));
      currentCell = '';
    } else {
      currentCell += char;
    }
  }
  cells.push(currentCell.trim().replace(/^"(.*)"$/, '$1'));
  return cells;
}

export function parseCSVToRows(csvContent: string): string[][] {
  if (!csvContent) return [];
  const content = csvContent.replace(/^\uFEFF/, '');
  const detectedDelim = detectDelimiter(content);

  const rawLines = content.split(/\r?\n/);
  const combinedLines: string[] = [];
  let currentLine = '';
  let inQuotes = false;

  for (const line of rawLines) {
    if (!currentLine) {
      currentLine = line;
    } else {
      currentLine += '\n' + line;
    }

    let quoteCount = 0;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') quoteCount++;
    }

    if (quoteCount % 2 !== 0) {
      inQuotes = !inQuotes;
    }

    if (!inQuotes) {
      if (currentLine.trim()) {
        combinedLines.push(currentLine);
      }
      currentLine = '';
    }
  }
  if (currentLine.trim()) {
    combinedLines.push(currentLine);
  }

  return combinedLines.map(l => parseCSVLine(l, detectedDelim));
}

export function parseCSVContent(csvContent: string): VocabItem[] {
  if (!csvContent) return [];
  const rows = parseCSVToRows(csvContent);
  if (rows.length === 0) return [];
  return parseGoogleSheetRows(rows);
}

export function parseVocabFile(fileContent: string, fileName: string): VocabItem[] {
  const extension = fileName.split('.').pop()?.toLowerCase();

  if (extension === 'json' || fileContent.trim().startsWith('[')) {
    try {
      const data = JSON.parse(fileContent);
      if (Array.isArray(data)) {
        return data.map((item, index) => normalizeParsedItem(item, index));
      }
    } catch (e) {
      console.warn('JSON parsing failed, falling back to line parser:', e);
    }
  }

  // Check if CSV format (file extension OR headers containing comma/tab OR matching table columns)
  const trimmed = fileContent.trim();
  const firstLine = trimmed.split(/\r?\n/)[0] || '';
  const isCSV = extension === 'csv' ||
    firstLine.includes(',') ||
    firstLine.includes('\t') ||
    /^(type|article|the word|word|german|kategorie|geschlecht|wort|nomen|verb|adjective)/i.test(firstLine);

  if (isCSV) {
    const csvParsed = parseCSVContent(fileContent);
    if (csvParsed.length > 0) {
      return csvParsed;
    }
  }

  // Parse CSV or Text lines using our pattern recognition engine
  return parseTextOrCSV(fileContent);
}

export function cleanGermanCategory(category?: string): string {
  if (!category) return 'Allgemein';
  // Remove parenthetical translations (e.g., (المسكن) or (Home))
  let cleaned = category.replace(/\s*[\(\[].*?[\)\]]/g, '').trim();
  // Remove any remaining Arabic characters
  cleaned = cleaned.replace(/[\u0600-\u06FF]/g, '').trim();
  if (cleaned.endsWith('-')) cleaned = cleaned.slice(0, -1).trim();
  return cleaned || 'Allgemein';
}

function normalizeParsedItem(raw: any, index: number): VocabItem {
  const rawWord = String(raw.word || raw.german || raw.wort || '').trim();
  const rawGender = raw.gender ? String(raw.gender).toLowerCase().trim() : undefined;
  
  let gender: GrammaticalGender | undefined = (['der', 'die', 'das'].includes(rawGender || '')
    ? rawGender
    : undefined) as GrammaticalGender | undefined;

  let cleanWord = rawWord;
  const articleMatch = cleanWord.match(/^(der|die|das)\s+(.+)$/i);
  if (articleMatch) {
    gender = articleMatch[1].toLowerCase() as GrammaticalGender;
    cleanWord = articleMatch[2].trim();
  }

  const type: VocabType = determineType(raw.type, cleanWord, gender);

  return {
    id: raw.id || `custom_${Date.now()}_${index}`,
    word: cleanWord,
    type,
    translationAr: String(raw.translationAr || raw.arabic || raw.meaning || raw.arabisch || '').trim() || 'بدون ترجمة',
    translationEn: raw.translationEn || raw.english,
    level: raw.level || 'A1',
    category: cleanGermanCategory(raw.category || 'Allgemein'),
    gender: type === 'noun' ? (gender || inferGender(cleanWord)) : undefined,
    plural: raw.plural || (type === 'noun' ? generateFallbackPlural(cleanWord, gender || inferGender(cleanWord)) : undefined),
    isIrregular: Boolean(raw.isIrregular),
    present3rd: raw.present3rd,
    praeteritum: raw.praeteritum,
    perfekt: raw.perfekt,
    antonym: raw.antonym || raw.opposite,
    case: (['Akkusativ', 'Dativ', 'Genitiv', 'Wechsel'].includes(raw.case) ? raw.case : undefined) as GrammaticalCase | undefined,
    preposition: raw.preposition || raw.verbPreposition,
    prepositionCase: (['Akkusativ', 'Dativ', 'Genitiv', 'Wechsel'].includes(raw.prepositionCase) ? raw.prepositionCase : undefined) as GrammaticalCase | undefined,
    exampleDe: raw.exampleDe || raw.example,
    exampleAr: raw.exampleAr,
    masteryScore: Number(raw.masteryScore) || 0,
    attemptsCount: Number(raw.attemptsCount) || 0,
    correctCount: Number(raw.correctCount) || 0,
  };
}

function determineType(explicitType?: string, word: string = '', gender?: GrammaticalGender): VocabType {
  if (explicitType) {
    const lower = explicitType.toLowerCase().trim();
    if (
      lower.includes('adverb') ||
      lower.includes('ظرف') ||
      lower === 'adv' ||
      lower === 'adv.'
    ) return 'Others';

    if (
      lower.includes('noun') ||
      lower.includes('اسم') ||
      lower.includes('nomen') ||
      lower.includes('substantiv') ||
      lower === 'n' ||
      lower === 'n.'
    ) return 'noun';

    if (
      lower.includes('adj') ||
      lower.includes('صفة') ||
      lower === 'a' ||
      lower === 'a.'
    ) return 'adjective';

    if (
      lower === 'verb' ||
      lower === 'v' ||
      lower === 'v.' ||
      lower.includes('فعل') ||
      lower.includes('شاذ') ||
      (lower.includes('verb') && !lower.includes('adverb'))
    ) return 'verb';

    if (
      lower.includes('expression') ||
      lower.includes('phrase') ||
      lower.includes('redewendung') ||
      lower.includes('تعبير') ||
      lower.includes('عبارة') ||
      lower.includes('جملة')
    ) return 'expression';

    if (
      lower.includes('other') ||
      lower.includes('sonstiges') ||
      lower.includes('prep') ||
      lower.includes('حرف') ||
      lower.includes('آخر')
    ) return 'Others';
  }

  if (gender) return 'noun';

  const clean = word.trim();
  const lower = clean.toLowerCase();

  // German grammar rules: Nouns start with a capital letter
  if (/^[A-ZÄÖÜ]/.test(clean)) {
    return 'noun';
  }

  // Verbs: lowercase and ends with -en, -n, -eln, -ern
  if (/^(lernen|machen|gehen|kochen|trinken|essen|haben|sein|kommen|wohnen|arbeiten|spielen|sprechen|schreiben|lesen|sehen|hören|fahren|reisen|suchen|kaufen|brauchen|fragen|antworten|stehen|sitzen|liegen|bleiben|bringen|geben|nehmen|finden|denken|wissen|sagen|glauben|fühlen|helfen|treffen|öffnen|schließen|zahlen|kosten|tanzen|singen|lachen|weinen|schwimmen|laufen|schlafen|werden|müssen|können|wollen|sollen|dürfen|mögen|[a-zäöü]+en|[a-zäöü]+n|[a-zäöü]+eln|[a-zäöü]+ern)$/.test(lower)) {
    return 'verb';
  }

  // Lowercase non-verbs are typically adjectives in German A1-C2 lists
  return 'adjective';
}

export function inferGender(word: string): GrammaticalGender {
  const w = word.trim().toLowerCase();
  
  // Feminine endings (die)
  if (/(ung|heit|keit|schaft|tät|ion|ik|ei|in|e)$/.test(w)) {
    return 'die';
  }
  
  // Masculine endings (der)
  if (/(er|ling|ismus|or|ant|ent)$/.test(w)) {
    return 'der';
  }

  // Neuter endings (das)
  if (/(chen|lein|um|ment|nis|tum)$/.test(w)) {
    return 'das';
  }

  return 'der';
}

function applyUmlaut(word: string): string {
  if (/au/i.test(word)) return word.replace(/au/gi, (m) => (m === 'AU' ? 'ÄU' : m === 'Au' ? 'Äu' : 'äu'));
  if (/a/i.test(word)) return word.replace(/a/gi, (m) => (m === 'A' ? 'Ä' : 'ä'));
  if (/o/i.test(word)) return word.replace(/o/gi, (m) => (m === 'O' ? 'Ö' : 'ö'));
  if (/u/i.test(word)) return word.replace(/u/gi, (m) => (m === 'U' ? 'Ü' : 'ü'));
  return word;
}

export function expandPluralAbbreviation(word: string, abbr: string): string {
  const cleanAbbr = abbr.trim().replace(/^[-–—"'\/\(\)]+/, '').replace(/[\(\)]/g, '').trim();
  
  if (!cleanAbbr) return '';
  if (cleanAbbr.toLowerCase().startsWith('die ')) return cleanAbbr;
  if (/^kein/i.test(cleanAbbr) || cleanAbbr === '-' || cleanAbbr === '—' || cleanAbbr.toLowerCase().includes('singular')) return 'لا يوجد جمع';

  const hasUmlaut = cleanAbbr.includes('¨') || cleanAbbr.includes('"') || cleanAbbr.includes('^');
  let suffix = cleanAbbr.replace(/[¨"\^\-]/g, '').trim();

  let pluralWord = word;
  if (hasUmlaut) {
    pluralWord = applyUmlaut(word);
  }
  
  if (suffix) {
    // If suffix is full word already e.g. "Tische" or "Bücher"
    if (suffix.toLowerCase().startsWith(pluralWord.toLowerCase())) {
      pluralWord = suffix;
    } else {
      if (pluralWord.endsWith('e') && suffix === 'en') {
        pluralWord += 'n';
      } else {
        pluralWord += suffix;
      }
    }
  }

  return `die ${pluralWord}`;
}

export function generateFallbackPlural(word: string, gender?: GrammaticalGender): string {
  const w = word.trim();
  const lower = w.toLowerCase();

  if (lower.endsWith('ung') || lower.endsWith('heit') || lower.endsWith('keit') || lower.endsWith('schaft') || lower.endsWith('ion') || lower.endsWith('tät')) {
    return `die ${w}en`;
  }
  if (lower.endsWith('in')) {
    return `die ${w}nen`;
  }
  if (lower.endsWith('e')) {
    return `die ${w}n`;
  }
  if (lower.endsWith('chen') || lower.endsWith('lein')) {
    return `die ${w}`;
  }
  if (lower.endsWith('er') || lower.endsWith('el') || lower.endsWith('en')) {
    return `die ${w}`;
  }
  return `die ${w}e`;
}

export function inferPrepositionCase(prep: string): GrammaticalCase {
  const p = prep.trim().toLowerCase();
  if (['mit', 'bei', 'nach', 'aus', 'von', 'zu', 'seit', 'gegenüber'].includes(p)) return 'Dativ';
  if (['für', 'durch', 'gegen', 'ohne', 'um', 'bis'].includes(p)) return 'Akkusativ';
  if (['in', 'an', 'auf', 'über', 'unter', 'vor', 'hinter', 'neben', 'zwischen'].includes(p)) return 'Wechsel';
  if (['wegen', 'trotz', 'während', 'statt', 'anstatt'].includes(p)) return 'Genitiv';
  return 'Akkusativ';
}

/**
 * Intelligent Pattern Recognition Engine for Written Vocabulary Lines
 * Handles formats like:
 * - "der Tisch, die Tische - طاولة"
 * - "die Katze, -n (قطة)"
 * - "das Buch, -¨er = كتاب"
 * - "schreiben - يكتب"
 * - "groß - كبير"
 * - "mit + Dativ = مع"
 * - "r Tisch / e Tische = طاولة"
 */
export function parseTextOrCSV(content: string): VocabItem[] {
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const result: VocabItem[] = [];

  lines.forEach((line, index) => {
    // Skip header lines
    if (index === 0 && (line.toLowerCase().includes('word') || line.toLowerCase().includes('german') || line.toLowerCase().includes('كلمة'))) {
      return;
    }

    // 1. Extract Arabic Translation if present in line
    let translationAr = '';
    const arabicMatch = line.match(/[\u0600-\u06FF\s0-9\(\)\.\،\؟\!]+/g);
    if (arabicMatch) {
      const candidateAr = arabicMatch.join(' ').replace(/[\(\)]/g, '').trim();
      if (candidateAr.length >= 2 && !/^(m|f|n|v|adj|prep)$/i.test(candidateAr)) {
        translationAr = candidateAr;
      }
    }

    // Remove Arabic chars to clean the German part of the line
    let germanPart = line.replace(/[\u0600-\u06FF]+/g, '').trim();

    // 2. Extract Type Overrides e.g. (noun), (verb), (اسم), (فعل)
    let explicitType: VocabType | undefined = undefined;
    if (/\(noun\)|\(nomen\)|\(اسم\)/i.test(line)) explicitType = 'noun';
    else if (/\(verb\)|\(v\)|\(فعل\)/i.test(line)) explicitType = 'verb';

    // 4. Clean up separators and extract word, article, plural
    // Remove trailing equals, dashes, colons, slashes
    germanPart = germanPart.replace(/[:=\-\t|\/,;]+$/, '').trim();

    // Split German part by separators
    const parts = germanPart.split(/[:=\-\t|;]+/).map(p => p.trim()).filter(Boolean);
    if (parts.length === 0) return;

    let firstChunk = parts[0];

    // Check Gender / Article patterns
    let gender: GrammaticalGender | undefined = undefined;

    // Pattern A: "der Tisch", "die Katze", "das Buch"
    const leadingArticleMatch = firstChunk.match(/^(der|die|das)\s+(.+)$/i);
    let mainWord = firstChunk;

    if (leadingArticleMatch) {
      gender = leadingArticleMatch[1].toLowerCase() as GrammaticalGender;
      mainWord = leadingArticleMatch[2].trim();
    } else {
      // Pattern B: "r Tisch", "e Katze", "s Buch"
      const shortArticleMatch = firstChunk.match(/^(r|e|s)\s+(.+)$/i);
      if (shortArticleMatch) {
        const letter = shortArticleMatch[1].toLowerCase();
        gender = letter === 'r' ? 'der' : letter === 'e' ? 'die' : 'das';
        mainWord = shortArticleMatch[2].trim();
      }
    }

    // Pattern C: "Tisch (m)", "Katze (f)", "Buch (n)", "Tisch [m]"
    if (!gender) {
      if (/\(m\)|\(der\)|\[m\]|\,?\s*m$/i.test(line)) gender = 'der';
      else if (/\(f\)|\(die\)|\[f\]|\,?\s*f$/i.test(line)) gender = 'die';
      else if (/\(n\)|\(das\)|\[n\]|\,?\s*n$/i.test(line)) gender = 'das';
    }

    // Clean word of parenthetical tags
    mainWord = mainWord.replace(/\((m|f|n|der|die|das|v|adj|prep)\)/gi, '').replace(/\[(m|f|n)\]/gi, '').trim();

    // Extract Plural
    let plural: string | undefined = undefined;

    // Check for plural in second chunk or after comma/slash/parentheses
    // e.g. "Tisch, die Tische" or "Katze, -n" or "Buch (-¨er)"
    const pluralMatch = line.match(/(?:,|;|\/|\(|\s)\s*(die\s+[A-Za-zÄÖÜäöüß]+|-?["'¨\^]?[a-zA-ZäöüÄÖÜß]+|\-¨|\-¨er|\-¨e|\-n|\-en|\-s|\-e|\-er)\b/i);

    if (pluralMatch && pluralMatch[1]) {
      const matchedPluralStr = pluralMatch[1].trim();
      if (!/^(der|das|m|f|n|Akk|Dat|Gen)$/i.test(matchedPluralStr)) {
        plural = expandPluralAbbreviation(mainWord, matchedPluralStr);
      }
    }

    // Determine Final Word Type
    const type = explicitType || determineType(undefined, mainWord, gender);

    // If type is Noun and gender is still not found, infer gender & fallback plural
    if (type === 'noun') {
      if (!gender) {
        gender = inferGender(mainWord);
      }
      if (!plural) {
        plural = generateFallbackPlural(mainWord, gender);
      }
    }

    // Fallback translation if empty
    if (!translationAr) {
      if (parts.length > 1 && !/[\{\}\"]/.test(parts[1])) {
        translationAr = parts[1].replace(/^(die|der|das)\s+/, '').trim();
      }
      if (!translationAr) {
        translationAr = type === 'noun' ? mainWord : `فعل (${mainWord})`;
      }
    }

    // Build Example Sentences
    let exampleDe = `${mainWord} ist مهم.`;
    if (type === 'noun') {
      exampleDe = `${gender || 'der'} ${mainWord} ist hier.`;
    } else if (type === 'verb') {
      exampleDe = `Ich ${mainWord.endsWith('en') ? mainWord.slice(0, -2) + 'e' : mainWord} gerne.`;
    }

    result.push({
      id: `imported_${Date.now()}_${index}`,
      word: mainWord,
      type,
      gender: type === 'noun' ? gender : undefined,
      plural: type === 'noun' ? plural : undefined,
      translationAr,
      level: 'A1',
      category: 'استيراد تلقائي',
      exampleDe,
      exampleAr: translationAr,
      masteryScore: 0,
      attemptsCount: 0,
      correctCount: 0,
    });
  });

  return result;
}

export function exportVocabToJson(items: VocabItem[]): string {
  return JSON.stringify(items, null, 2);
}

export function exportVocabToExcelBuffer(items: VocabItem[]): Uint8Array {
  const headers = [
    'Type',
    'Article',
    'Word',
    'Plural',
    'regular/irregular',
    'Conjugation',
    'Preposition',
    'Case',
    'Antonym',
    'EN_translation',
    'Example',
    'CEFR level'
  ];

  const getTypeRank = (item: VocabItem) => {
    if (item.type === 'noun') return 1;
    if (item.type === 'verb') return 2;
    if (item.type === 'adjective') return 3;
    return 4;
  };

  const sortedItems = [...items].sort((a, b) => {
    const rankA = getTypeRank(a);
    const rankB = getTypeRank(b);
    if (rankA !== rankB) return rankA - rankB;
    return (a.word || '').localeCompare(b.word || '', 'de');
  });

  const rows = sortedItems.map(item => {
    const isIrregularVerb = item.type === 'verb' && item.isIrregular;
    const typeStr = item.type === 'noun'
      ? 'Noun'
      : item.type === 'verb'
      ? (isIrregularVerb ? 'Verb (irregular)' : 'Verb')
      : item.type === 'adjective'
      ? 'Adjective'
      : 'Others';

    const articleStr = item.type === 'noun' ? (item.gender || '') : '';
    const wordStr = item.word || '';
    const pluralStr = item.type === 'noun' ? (item.plural || '') : '';
    const regIrregStr = item.isIrregular ? 'irregular' : (item.type === 'verb' ? 'regular' : '');

    let conjugationStr = '';
    if (item.type === 'verb') {
      const parts = [item.present3rd, item.praeteritum, item.perfekt].filter(Boolean);
      if (parts.length > 0) {
        conjugationStr = parts.join(', ');
      }
    }

    const antonymStr = item.type === 'adjective' ? (item.antonym || '') : '';
    const prepositionStr = item.preposition || '';
    const prepositionCaseStr = item.prepositionCase || '';
    const translationEnStr = item.translationEn || item.translationAr || '';
    const exampleStr = item.exampleDe || '';
    const levelStr = item.level || 'A1';

    return [
      typeStr,
      articleStr,
      wordStr,
      pluralStr,
      regIrregStr,
      conjugationStr,
      prepositionStr,
      prepositionCaseStr,
      antonymStr,
      translationEnStr,
      exampleStr,
      levelStr
    ];
  });

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Vocabulary');
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(excelBuffer);
}

export function exportVocabToCSV(items: VocabItem[]): string {
  // Add UTF-8 BOM (\uFEFF) for Microsoft Excel and Google Sheets encoding compatibility
  const BOM = '\uFEFF';
  const headers = [
    'Type',
    'Article',
    'Word',
    'Plural',
    'regular/irregular',
    'Conjugation',
    'Preposition',
    'Case',
    'Antonym',
    'EN_translation',
    'Example',
    'CEFR level'
  ];

  const escapeField = (val?: string | number) => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const getTypeRank = (item: VocabItem) => {
    if (item.type === 'noun') return 1;
    if (item.type === 'verb') return 2;
    if (item.type === 'adjective') return 3;
    return 4;
  };

  const sortedItems = [...items].sort((a, b) => {
    const rankA = getTypeRank(a);
    const rankB = getTypeRank(b);
    if (rankA !== rankB) return rankA - rankB;
    return (a.word || '').localeCompare(b.word || '', 'de');
  });

  const rows = sortedItems.map(item => {
    const isIrregularVerb = item.type === 'verb' && item.isIrregular;
    const typeStr = item.type === 'noun'
      ? 'Noun'
      : item.type === 'verb'
      ? (isIrregularVerb ? 'Verb (irregular)' : 'Verb')
      : item.type === 'adjective'
      ? 'Adjective'
      : 'Others';

    const articleStr = item.type === 'noun' ? (item.gender || '') : '';
    const wordStr = item.word || '';
    const pluralStr = item.type === 'noun' ? (item.plural || '') : '';
    const regIrregStr = item.isIrregular ? 'irregular' : (item.type === 'verb' ? 'regular' : '');

    let conjugationStr = '';
    if (item.type === 'verb') {
      const parts = [item.present3rd, item.praeteritum, item.perfekt].filter(Boolean);
      if (parts.length > 0) {
        conjugationStr = parts.join(', ');
      }
    }

    const antonymStr = item.type === 'adjective' ? (item.antonym || '') : '';
    const prepositionStr = item.preposition || '';
    const prepositionCaseStr = item.prepositionCase || '';
    const translationEnStr = item.translationEn || item.translationAr || '';
    const exampleStr = item.exampleDe || '';
    const levelStr = item.level || 'A1';

    return [
      escapeField(typeStr),
      escapeField(articleStr),
      escapeField(wordStr),
      escapeField(pluralStr),
      escapeField(regIrregStr),
      escapeField(conjugationStr),
      escapeField(prepositionStr),
      escapeField(prepositionCaseStr),
      escapeField(antonymStr),
      escapeField(translationEnStr),
      escapeField(exampleStr),
      escapeField(levelStr)
    ].join(',');
  });

  return BOM + [headers.join(','), ...rows].join('\n');
}

export function parseRowContentHeuristic(row: string[], rowIdx: number = 0): VocabItem | null {
  if (!row || row.length === 0) return null;

  const cleanCells = row.map(c => (c || '').toString().trim()).filter(Boolean);
  if (cleanCells.length === 0) return null;

  const joined = cleanCells.join(' ').toLowerCase();
  if (
    (joined.includes('type') && joined.includes('word')) ||
    (joined.includes('نوع') && joined.includes('كلمة')) ||
    joined.includes('regular/irregular') ||
    joined === 'type article word plural conjugation antonym translation example level'
  ) {
    return null;
  }

  let rawWord = '';
  let rawArticle = '';
  let rawType = '';
  let rawPlural = '';
  let rawConjugation = '';
  let rawAntonym = '';
  let translationAr = '';
  let translationEn = '';
  let exampleDe = '';
  let level: CefrLevel | undefined = undefined;

  const unclassified: string[] = [];

  for (const cell of cleanCells) {

    // 1. CEFR Level
    if (/^(a1|a2|b1|b2|c1|c2)$/i.test(cell)) {
      level = cell.toUpperCase() as CefrLevel;
      continue;
    }

    // 2. Article / Gender
    if (!rawArticle && /^(der|die|das)$/i.test(cell)) {
      rawArticle = cell.toLowerCase();
      continue;
    }
    if (!rawArticle && /^(m|f|n|männlich|weiblich|sachlich|مذكر|مؤنث|محايد)$/i.test(cell)) {
      if (/^(m|männlich|مذكر)$/i.test(cell)) rawArticle = 'der';
      else if (/^(f|weiblich|مؤنث)$/i.test(cell)) rawArticle = 'die';
      else if (/^(n|sachlich|محايد)$/i.test(cell)) rawArticle = 'das';
      continue;
    }

    // 3. Explicit Type
    if (!rawType && /^(noun|verb|adjective|adj|adverb|adv|adv\.|others|other|nomen|substantiv|فعل|أفعال|صفة|صفات|ظرف|اسم|أسماء|حرف|verb\s*\(.*?\)|irregular\s*verb|verben|فعل\s*شاذ|v|v\.|n|n\.|a|a\.|sonstiges)$/i.test(cell)) {
      rawType = cell;
      continue;
    }

    // 4. Arabic Translation
    if (!translationAr && /[\u0600-\u06FF]/.test(cell)) {
      translationAr = cell;
      continue;
    }

    // 5. Verb Conjugation or regular/irregular
    if (!rawConjugation && (cell.includes(',') || /^(regular|irregular|شاذ|عادي)$/i.test(cell)) && /(hat|ist|ge[a-z]+|te\b|[a-z]+t\b|regular|irregular|شاذ)/i.test(cell)) {
      rawConjugation = cell;
      continue;
    }

    // 6. Plural form
    if (!rawPlural && (/^die\s+[A-ZÄÖÜa-zäöüß]+/i.test(cell) || /^(\-|\+)?(e|en|n|er|s|¨e|¨er)\b/i.test(cell))) {
      rawPlural = cell;
      continue;
    }

    // 7. Example Sentence
    if (!exampleDe && (/[.?!]$/.test(cell) || (cell.split(/\s+/).length >= 3 && /[A-ZÄÖÜa-zäöüß]/.test(cell)))) {
      exampleDe = cell;
      continue;
    }

    unclassified.push(cell);
  }

  for (const cell of unclassified) {
    if (!rawWord) {
      const artMatch = cell.match(/^(der|die|das)\s+(.+)$/i);
      if (artMatch) {
        if (!rawArticle) rawArticle = artMatch[1].toLowerCase();
        rawWord = artMatch[2].trim();
        continue;
      }
      if (/[A-ZÄÖÜa-zäöüß]/.test(cell)) {
        rawWord = cell;
        continue;
      }
    }

    if (rawWord && !translationEn) {
      if (/^(≠|!=|opposite:)/i.test(cell)) {
        rawAntonym = cell.replace(/^(≠|!=|opposite:)\s*/i, '').trim();
        continue;
      }
      translationEn = cell;
      continue;
    }

    if (rawWord && translationEn && !rawAntonym) {
      rawAntonym = cell;
      continue;
    }
  }

  if (!rawWord) return null;

  let gender: GrammaticalGender | undefined = undefined;
  if (['der', 'die', 'das'].includes(rawArticle.toLowerCase())) {
    gender = rawArticle.toLowerCase() as GrammaticalGender;
  }

  let cleanWord = rawWord.trim();
  const leadingArt = cleanWord.match(/^(der|die|das)\s+(.+)$/i);
  if (leadingArt) {
    gender = leadingArt[1].toLowerCase() as GrammaticalGender;
    cleanWord = leadingArt[2].trim();
  }

  const isIrregular = rawType.toLowerCase().includes('irregular') || rawType.toLowerCase().includes('شاذ');
  const type: VocabType = rawType
    ? determineType(rawType, cleanWord, gender)
    : (gender || /^[A-ZÄÖÜ]/.test(cleanWord) ? 'noun' : determineType('', cleanWord, gender));

  let pluralFormatted: string | undefined = undefined;
  if (type === 'noun') {
    if (rawPlural) {
      pluralFormatted = expandPluralAbbreviation(cleanWord, rawPlural);
    } else {
      pluralFormatted = generateFallbackPlural(cleanWord, gender || inferGender(cleanWord));
    }
  }

  let present3rd: string | undefined;
  let praeteritum: string | undefined;
  let perfekt: string | undefined;
  if (type === 'verb' && rawConjugation) {
    const parts = rawConjugation.split(',').map(s => s.trim());
    if (parts.length >= 3) {
      present3rd = parts[0];
      praeteritum = parts[1];
      perfekt = parts[2];
    } else if (parts.length === 2) {
      present3rd = parts[0];
      praeteritum = parts[1];
    } else if (parts.length === 1) {
      present3rd = parts[0];
    }
  }

  return {
    id: `custom_${Date.now()}_${rowIdx}_${Math.random().toString(36).substr(2, 4)}`,
    word: cleanWord,
    type,
    gender: type === 'noun' ? (gender || inferGender(cleanWord)) : undefined,
    plural: pluralFormatted,
    isIrregular,
    present3rd,
    praeteritum,
    perfekt,
    antonym: rawAntonym || undefined,
    translationEn: translationEn || undefined,
    translationAr: translationAr || 'بدون ترجمة',
    exampleDe: exampleDe || undefined,
    level: level || 'A1',
    category: 'Allgemein',
    masteryScore: 0,
    attemptsCount: 0,
    correctCount: 0,
  };
}

export function parseGoogleSheetRows(rawRowsInput: string[][]): VocabItem[] {
  if (!rawRowsInput || rawRowsInput.length === 0) return [];

  const rows: string[][] = rawRowsInput.map(row => {
    if (row.length === 1 && (row[0].includes(',') || row[0].includes('\t') || row[0].includes(';') || row[0].includes('|'))) {
      const delim = detectDelimiter(row[0]);
      return parseCSVLine(row[0], delim);
    }
    return row;
  });

  const headerRow = rows[0].map(c => (c || '').toString().trim().toLowerCase());
  const hasHeader = headerRow.some(cell =>
    cell.includes('كلمة') || cell.includes('word') || cell.includes('ترجمة') || cell.includes('translation') ||
    cell.includes('نوع') || cell.includes('type') || cell.includes('أداة') || cell.includes('article') ||
    cell.includes('german') || cell.includes('wort') || cell.includes('plural') || cell.includes('level') ||
    cell.includes('example') || cell.includes('مثال') || cell.includes('antonym') || cell.includes('conjugation') ||
    cell.includes('cefr')
  );

  let typeIdx = -1;
  let articleIdx = -1;
  let wordIdx = -1;
  let pluralIdx = -1;
  let regIrregIdx = -1;
  let conjugationIdx = -1;
  let antonymIdx = -1;
  let prepositionIdx = -1;
  let prepositionCaseIdx = -1;
  let translationIdx = -1;
  let exampleIdx = -1;
  let levelIdx = -1;

  if (hasHeader) {
    headerRow.forEach((col, idx) => {
      const c = col.trim().toLowerCase();
      if (c === 'type' || c.includes('نوع') || c === 'word type' || c === 'kategorie') typeIdx = idx;
      else if (c === 'article' || c === 'gender' || c.includes('أداة') || c === 'geschlecht') articleIdx = idx;
      else if (c === 'word' || c === 'the word' || c === 'german' || c === 'wort' || c === 'deutsch' || c.includes('كلمة') || c.includes('المفردة') || c.includes('الألماني')) wordIdx = idx;
      else if (c === 'plural' || c.includes('جمع')) pluralIdx = idx;
      else if (c === 'regular/irregular' || c === 'regular' || c === 'irregular' || c.includes('شاذ') || c.includes('عادي')) regIrregIdx = idx;
      else if (c === 'conjegation' || c.includes('conjugation') || c.includes('تصريف') || c.includes('konjugation')) conjugationIdx = idx;
      else if (c === 'preposition' || c.includes('حرف الجر') || c === 'prep') prepositionIdx = idx;
      else if (c === 'case' || c.includes('preposition_case') || c.includes('preposition case') || c.includes('الحالة الإعرابية') || c.includes('الحالة') || c === 'prepositioncase' || c === 'prepcase') prepositionCaseIdx = idx;
      else if (c === 'antonym' || c.includes('opposite') || c.includes('gegenteil') || c.includes('ضد') || c.includes('عكس')) antonymIdx = idx;
      else if (c === 'en_translation' || c === 'en translation' || c === 'en' || c === 'translation' || c.includes('english') || c.includes('meaning') || c.includes('ترجمة')) translationIdx = idx;
      else if (c.includes('example') || c.includes('beispiel') || c.includes('مثال') || c.includes('جملة')) exampleIdx = idx;
      else if (c.includes('cefr') || c === 'level' || c.includes('مستوى') || c === 'stufe') levelIdx = idx;
    });
  }

  const isStrict10Column = hasHeader && wordIdx !== -1 && (translationIdx !== -1 || typeIdx !== -1);

  if (typeIdx === -1) typeIdx = 0;
  if (articleIdx === -1) articleIdx = 1;
  if (wordIdx === -1) wordIdx = 2;
  if (pluralIdx === -1) pluralIdx = 3;
  if (regIrregIdx === -1) regIrregIdx = 4;
  if (conjugationIdx === -1) conjugationIdx = 5;
  if (prepositionIdx === -1) prepositionIdx = 6;
  if (prepositionCaseIdx === -1) prepositionCaseIdx = 7;
  if (antonymIdx === -1) antonymIdx = 8;
  if (translationIdx === -1) translationIdx = 9;
  if (exampleIdx === -1) exampleIdx = 10;
  if (levelIdx === -1) levelIdx = 11;

  const dataRows = hasHeader ? rows.slice(1) : rows;
  const vocabItems: VocabItem[] = [];

  const isHeaderString = (str: string) => {
    const l = str.toLowerCase().trim();
    return (
      l.includes('type,article') ||
      l.includes('word,plural') ||
      l.includes('the word,plural') ||
      l.includes('regular/irregular') ||
      l.includes('conjegation') ||
      l.includes('cefr level') ||
      l === 'type' ||
      l === 'article' ||
      l === 'the word' ||
      l === 'word' ||
      l === 'plural' ||
      l === 'regular/irregular' ||
      l === 'conjegation' ||
      l === 'conjugation' ||
      l === 'antonym' ||
      l === 'en_translation' ||
      l === 'en translation' ||
      l === 'example' ||
      l === 'cefr level' ||
      l === 'نوع' ||
      l === 'أداة' ||
      l === 'المفردة' ||
      l === 'الكلمة'
    );
  };

  dataRows.forEach((row, rowIdx) => {
    if (!row || row.every(cell => !cell || !cell.trim())) return;

    if (isStrict10Column && row.length >= 3) {
      const getVal = (idx: number) => (idx !== -1 && idx < row.length ? row[idx]?.trim() : '');
      const rawWord = getVal(wordIdx);
      if (rawWord && !isHeaderString(rawWord)) {
        const rawType = getVal(typeIdx);
        const rawArticle = getVal(articleIdx);
        const rawPlural = getVal(pluralIdx);
        const rawRegIrreg = getVal(regIrregIdx);
        const rawConjugation = getVal(conjugationIdx);
        const rawAntonym = getVal(antonymIdx);
        const rawPreposition = getVal(prepositionIdx);
        const rawPrepositionCase = getVal(prepositionCaseIdx);
        const rawTranslation = getVal(translationIdx);
        const rawExample = getVal(exampleIdx);
        const rawLevel = getVal(levelIdx);

        let gender: GrammaticalGender | undefined = undefined;
        const lowerArt = (rawArticle || '').toLowerCase();
        if (['der', 'die', 'das'].includes(lowerArt)) {
          gender = lowerArt as GrammaticalGender;
        }

        let cleanWord = rawWord;
        const artMatch = cleanWord.match(/^(der|die|das)\s+(.+)$/i);
        if (artMatch) {
          gender = artMatch[1].toLowerCase() as GrammaticalGender;
          cleanWord = artMatch[2].trim();
        }

        const lowerType = rawType.toLowerCase();
        const lowerRegIrreg = rawRegIrreg.toLowerCase();
        const isIrregular = lowerType.includes('irregular') || lowerRegIrreg.includes('irregular') || lowerRegIrreg.includes('شاذ');
        const type: VocabType = rawType
          ? determineType(rawType, cleanWord, gender)
          : (gender || /^[A-ZÄÖÜ]/.test(cleanWord) ? 'noun' : determineType('', cleanWord, gender));

        let present3rd: string | undefined;
        let praeteritum: string | undefined;
        let perfekt: string | undefined;
        if (type === 'verb' && rawConjugation) {
          const parts = rawConjugation.split(',').map(s => s.trim());
          if (parts.length >= 3) {
            present3rd = parts[0];
            praeteritum = parts[1];
            perfekt = parts[2];
          } else if (parts.length === 2) {
            present3rd = parts[0];
            praeteritum = parts[1];
          } else if (parts.length === 1) {
            present3rd = parts[0];
          }
        }

        const isAr = /[\u0600-\u06FF]/.test(rawTranslation);

        vocabItems.push({
          id: `gs_${Date.now()}_${rowIdx}`,
          word: cleanWord,
          type,
          gender: type === 'noun' ? (gender || inferGender(cleanWord)) : undefined,
          plural: type === 'noun' ? (rawPlural ? expandPluralAbbreviation(cleanWord, rawPlural) : generateFallbackPlural(cleanWord, gender || inferGender(cleanWord))) : undefined,
          isIrregular,
          present3rd,
          praeteritum,
          perfekt,
          antonym: rawAntonym || undefined,
          preposition: rawPreposition || undefined,
          prepositionCase: (['Akkusativ', 'Dativ', 'Genitiv', 'Wechsel'].includes(rawPrepositionCase || '') ? rawPrepositionCase : undefined) as GrammaticalCase | undefined,
          translationEn: !isAr ? rawTranslation : undefined,
          translationAr: isAr ? rawTranslation : (rawTranslation || 'بدون ترجمة'),
          exampleDe: rawExample || undefined,
          level: (/^(A1|A2|B1|B2|C1|C2)$/i.test(rawLevel.trim()) ? rawLevel.trim().toUpperCase() : 'A1') as CefrLevel,
          category: 'Allgemein',
          masteryScore: 0,
          attemptsCount: 0,
          correctCount: 0,
        });
        return;
      }
    }

    const item = parseRowContentHeuristic(row, rowIdx);
    if (item) {
      vocabItems.push(item);
    }
  });

  return vocabItems;
}

