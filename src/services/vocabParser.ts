import { VocabItem, VocabType, GrammaticalGender, GrammaticalCase } from '../types';

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
    if (lower.includes('verb') || lower.includes('فعل')) return 'verb';
    return 'noun';
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

  return 'noun';
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

export function exportVocabToCSV(items: VocabItem[]): string {
  // Add UTF-8 BOM for Microsoft Excel and Google Sheets Arabic encoding compatibility
  const BOM = '\uFEFF';
  const headers = [
    'الكلمة (Word)',
    'الأداة (Gender/Article)',
    'الجمع (Plural)',
    'النوع (Type)',
    'الترجمة العربية (Translation)',
    'التصنيف (Category)',
    'نسبة الإتقان (Mastery %)',
    'تصريف الفعل / العكس (Conjugation/Antonym)',
    'جملة نموذجية (Example DE)',
    'ترجمة الجملة (Example AR)'
  ];

  const escapeField = (val?: string | number) => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = items.map(item => {
    let extraDetails = '';
    if (item.type === 'verb') {
      const conjugations = [item.present3rd, item.praeteritum, item.perfekt].filter(Boolean);
      if (conjugations.length > 0) extraDetails = conjugations.join(', ');
    } else if (item.antonym) {
      extraDetails = `العكس: ${item.antonym}`;
    }

    return [
      escapeField(item.word),
      escapeField(item.gender || ''),
      escapeField(item.plural || ''),
      escapeField(item.type === 'noun' ? 'اسم' : item.type === 'verb' ? 'فعل' : item.type || ''),
      escapeField(item.translationAr),
      escapeField(item.category || 'عام'),
      escapeField(`${item.masteryScore}%`),
      escapeField(extraDetails),
      escapeField(item.exampleDe || ''),
      escapeField(item.exampleAr || '')
    ].join(',');
  });

  return BOM + [headers.join(','), ...rows].join('\n');
}
