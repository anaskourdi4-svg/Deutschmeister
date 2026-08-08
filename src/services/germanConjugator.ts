import { VocabItem } from '../types';

export interface VerbConjugation {
  present3rd: string; // e.g. "sieht" or "fährt" or "geht"
  praeteritum: string; // e.g. "sah" or "fuhr" or "ging"
  perfekt: string;    // e.g. "hat gesehen" or "ist gefahren" or "ist gegangen"
}

// Comprehensive Dictionary for Irregular & Common German Verbs (A1/A2/B1)
const GERMAN_VERB_DICTIONARY: Record<string, VerbConjugation> = {
  // A1/A2/B1 Core Verbs
  'bieten': { present3rd: 'bietet', praeteritum: 'bot', perfekt: 'hat geboten' },
  'verbieten': { present3rd: 'verbietet', praeteritum: 'verbot', perfekt: 'hat verboten' },
  'anbieten': { present3rd: 'bietet an', praeteritum: 'bot an', perfekt: 'hat angeboten' },
  'verbinden': { present3rd: 'verbindet', praeteritum: 'verband', perfekt: 'hat verbunden' },
  'versprechen': { present3rd: 'verspricht', praeteritum: 'versprach', perfekt: 'hat versprochen' },
  'empfehlen': { present3rd: 'empfiehlt', praeteritum: 'empfahl', perfekt: 'hat empfohlen' },
  'entscheiden': { present3rd: 'entscheidet', praeteritum: 'entschied', perfekt: 'hat entschieden' },
  'beschreiben': { present3rd: 'beschreibt', praeteritum: 'beschrieb', perfekt: 'hat beschrieben' },
  'vergleichen': { present3rd: 'vergleicht', praeteritum: 'verglich', perfekt: 'hat verglichen' },
  'sehen': { present3rd: 'sieht', praeteritum: 'sah', perfekt: 'hat gesehen' },
  'fahren': { present3rd: 'fährt', praeteritum: 'fuhr', perfekt: 'ist gefahren' },
  'sprechen': { present3rd: 'spricht', praeteritum: 'sprach', perfekt: 'hat gesprochen' },
  'essen': { present3rd: 'isst', praeteritum: 'aß', perfekt: 'hat gegessen' },
  'trinken': { present3rd: 'trinkt', praeteritum: 'trank', perfekt: 'hat getrunken' },
  'gehen': { present3rd: 'geht', praeteritum: 'ging', perfekt: 'ist gegangen' },
  'kommen': { present3rd: 'kommt', praeteritum: 'kam', perfekt: 'ist gekommen' },
  'schlafen': { present3rd: 'schläft', praeteritum: 'schlief', perfekt: 'hat geschlafen' },
  'bleiben': { present3rd: 'bleibt', praeteritum: 'blieb', perfekt: 'ist geblieben' },
  'lesen': { present3rd: 'liest', praeteritum: 'las', perfekt: 'hat gelesen' },
  'schreiben': { present3rd: 'schreibt', praeteritum: 'schrieb', perfekt: 'hat geschrieben' },
  'laufen': { present3rd: 'läuft', praeteritum: 'lief', perfekt: 'ist gelaufen' },
  'schwimmen': { present3rd: 'schwimmt', praeteritum: 'schwamm', perfekt: 'ist geschwommen' },
  'fliegen': { present3rd: 'fliegt', praeteritum: 'flog', perfekt: 'ist geflogen' },
  'helfen': { present3rd: 'hilft', praeteritum: 'half', perfekt: 'hat geholfen' },
  'treffen': { present3rd: 'trifft', praeteritum: 'traf', perfekt: 'hat getroffen' },
  'nehmen': { present3rd: 'nimmt', praeteritum: 'nahm', perfekt: 'hat genommen' },
  'geben': { present3rd: 'gibt', praeteritum: 'gab', perfekt: 'hat gegeben' },
  'bringen': { present3rd: 'bringt', praeteritum: 'brachte', perfekt: 'hat gebracht' },
  'denken': { present3rd: 'denkt', praeteritum: 'dachte', perfekt: 'hat gedacht' },
  'wissen': { present3rd: 'weiß', praeteritum: 'wusste', perfekt: 'hat gewusst' },
  'haben': { present3rd: 'hat', praeteritum: 'hatte', perfekt: 'hat gehabt' },
  'sein': { present3rd: 'ist', praeteritum: 'war', perfekt: 'ist gewesen' },
  'werden': { present3rd: 'wird', praeteritum: 'wurde', perfekt: 'ist geworden' },
  'stehen': { present3rd: 'steht', praeteritum: 'stand', perfekt: 'hat gestanden' },
  'sitzen': { present3rd: 'sitzt', praeteritum: 'saß', perfekt: 'hat gesessen' },
  'liegen': { present3rd: 'liegt', praeteritum: 'lag', perfekt: 'hat gelegen' },
  'schließen': { present3rd: 'schließt', praeteritum: 'schloss', perfekt: 'hat geschlossen' },
  'öffnen': { present3rd: 'öffnet', praeteritum: 'öffnete', perfekt: 'hat geöffnet' },
  'kennen': { present3rd: 'kennt', praeteritum: 'kannte', perfekt: 'hat gekannt' },
  'nennen': { present3rd: 'nennt', praeteritum: 'nannte', perfekt: 'hat genannt' },
  'rennen': { present3rd: 'rennt', praeteritum: 'rannte', perfekt: 'ist gerannt' },
  'verstehen': { present3rd: 'versteht', praeteritum: 'verstand', perfekt: 'hat verstanden' },
  'vergessen': { present3rd: 'vergisst', praeteritum: 'vergaß', perfekt: 'hat vergessen' },
  'verlieren': { present3rd: 'verliert', praeteritum: 'verlor', perfekt: 'hat verloren' },
  'gewinnen': { present3rd: 'gewinnt', praeteritum: 'gewann', perfekt: 'hat gewonnen' },
  'bekommen': { present3rd: 'bekommt', praeteritum: 'bekam', perfekt: 'hat bekommen' },
  'beginnen': { present3rd: 'beginnt', praeteritum: 'begann', perfekt: 'hat begonnen' },
  'gefallen': { present3rd: 'gefällt', praeteritum: 'gefiel', perfekt: 'hat gefallen' },
  'einladen': { present3rd: 'lädt ein', praeteritum: 'lud ein', perfekt: 'hat eingeladen' },
  'fangen': { present3rd: 'fängt', praeteritum: 'fing', perfekt: 'hat gefangen' },
  'anfangen': { present3rd: 'fängt an', praeteritum: 'fing an', perfekt: 'hat angefangen' },
  'halten': { present3rd: 'hält', praeteritum: 'hielt', perfekt: 'hat gehalten' },
  'lassen': { present3rd: 'lässt', praeteritum: 'ließ', perfekt: 'hat gelassen' },
  'verlassen': { present3rd: 'verlässt', praeteritum: 'verließ', perfekt: 'hat verlassen' },
  'fallen': { present3rd: 'fällt', praeteritum: 'fiel', perfekt: 'ist gefallen' },
  'tragen': { present3rd: 'trägt', praeteritum: 'trug', perfekt: 'hat getragen' },
  'waschen': { present3rd: 'wäscht', praeteritum: 'wusch', perfekt: 'hat gewaschen' },
  'schlagen': { present3rd: 'schlägt', praeteritum: 'schlug', perfekt: 'hat geschlagen' },
  'finden': { present3rd: 'findet', praeteritum: 'fand', perfekt: 'hat gefunden' },
  'bitten': { present3rd: 'bittet', praeteritum: 'bat', perfekt: 'hat gebeten' },
  'schneiden': { present3rd: 'schneidet', praeteritum: 'schnitt', perfekt: 'hat geschnitten' },
  'ziehen': { present3rd: 'zieht', praeteritum: 'zog', perfekt: 'hat gezogen' },
  'aufstehen': { present3rd: 'steht auf', praeteritum: 'stand auf', perfekt: 'ist aufgestanden' },
  'mitkommen': { present3rd: 'kommt mit', praeteritum: 'kam mit', perfekt: 'ist mitgekommen' },
  'einkaufen': { present3rd: 'kauft ein', praeteritum: 'kaufte ein', perfekt: 'hat eingekauft' },
  'anrufen': { present3rd: 'ruft an', praeteritum: 'rief an', perfekt: 'hat angerufen' },
  'fernsehen': { present3rd: 'sieht fern', praeteritum: 'sah fern', perfekt: 'hat ferngesehen' },
  'anziehen': { present3rd: 'zieht an', praeteritum: 'zog an', perfekt: 'hat angezogen' },
  'ausziehen': { present3rd: 'zieht aus', praeteritum: 'zog aus', perfekt: 'hat ausgezogen' },
  'können': { present3rd: 'kann', praeteritum: 'konnte', perfekt: 'hat gekonnt' },
  'müssen': { present3rd: 'muss', praeteritum: 'musste', perfekt: 'hat gemusst' },
  'wollen': { present3rd: 'will', praeteritum: 'wollte', perfekt: 'hat gewollt' },
  'sollen': { present3rd: 'soll', praeteritum: 'sollte', perfekt: 'hat gesollt' },
  'dürfen': { present3rd: 'darf', praeteritum: 'durfte', perfekt: 'hat gedurft' },
  'mögen': { present3rd: 'mag', praeteritum: 'mochte', perfekt: 'hat gemocht' },
  'wünschen': { present3rd: 'wünscht', praeteritum: 'wünschte', perfekt: 'hat gewünscht' },
  'brauchen': { present3rd: 'braucht', praeteritum: 'brauchte', perfekt: 'hat gebraucht' },
  'suchen': { present3rd: 'sucht', praeteritum: 'suchte', perfekt: 'hat gesucht' },
  'kaufen': { present3rd: 'kauft', praeteritum: 'kaufte', perfekt: 'hat gekauft' },
  'verkaufen': { present3rd: 'verkauft', praeteritum: 'verkaufte', perfekt: 'hat verkauft' },
  'machen': { present3rd: 'macht', praeteritum: 'machte', perfekt: 'hat gemacht' },
  'lernen': { present3rd: 'lernt', praeteritum: 'lernte', perfekt: 'hat gelernt' },
  'arbeiten': { present3rd: 'arbeitet', praeteritum: 'arbeitete', perfekt: 'hat gearbeitet' },
  'kochen': { present3rd: 'kocht', praeteritum: 'kochte', perfekt: 'hat gekocht' },
  'wohnen': { present3rd: 'wohnt', praeteritum: 'wohnte', perfekt: 'hat gewohnt' },
  'spielen': { present3rd: 'spielt', praeteritum: 'spielte', perfekt: 'hat gespielt' },
  'reisen': { present3rd: 'reist', praeteritum: 'reiste', perfekt: 'ist gereist' },
  'fragen': { present3rd: 'fragt', praeteritum: 'fragte', perfekt: 'hat gefragt' },
  'antworten': { present3rd: 'antwortet', praeteritum: 'antwortete', perfekt: 'hat geantwortet' },
  'sagen': { present3rd: 'sagt', praeteritum: 'sagte', perfekt: 'hat gesagt' },
  'glauben': { present3rd: 'glaubt', praeteritum: 'glaubte', perfekt: 'hat geglaubt' },
  'fühlen': { present3rd: 'fühlt', praeteritum: 'fühlte', perfekt: 'hat gefühlt' },
  'zahlen': { present3rd: 'zahlt', praeteritum: 'zahlte', perfekt: 'hat gezahlt' },
  'bezahlen': { present3rd: 'bezahlt', praeteritum: 'bezahlte', perfekt: 'hat bezahlt' },
  'kosten': { present3rd: 'kostet', praeteritum: 'kostete', perfekt: 'hat gekostet' },
  'tanzen': { present3rd: 'tanzt', praeteritum: 'tanzte', perfekt: 'hat getanzt' },
  'singen': { present3rd: 'singt', praeteritum: 'sang', perfekt: 'hat gesungen' },
  'lachen': { present3rd: 'lacht', praeteritum: 'lachte', perfekt: 'hat gelacht' },
  'weinen': { present3rd: 'weint', praeteritum: 'weinte', perfekt: 'hat geweint' },
  'hören': { present3rd: 'hört', praeteritum: 'hörte', perfekt: 'hat gehört' },
  'holen': { present3rd: 'holt', praeteritum: 'holte', perfekt: 'hat geholt' },
};

/**
 * Cleans raw string input to ensure ONLY pure German verb conjugation forms are returned,
 * stripping out any English commentary, AI prompt clutter, slash notes, or check logs.
 */
export function sanitizeConjugationWord(str?: string): string {
  if (!str) return '';
  let s = String(str).trim();

  // Strip labels like "Partizip II:", "Präteritum:", "Perfekt:", "present3rd:", "interal", etc.
  s = s.replace(/\b(Partizip(\s*(II|2))?|Präteritum|Präsens|Perfekt|Perf|Present3rd|Präsens3|V1|V2|V3|interal|internal|praeteritum)\b/gi, '');

  // Strip parenthetical text e.g. "gefangen (Partizip II: gefa, fangte...)"
  if (s.includes('(')) {
    s = s.split('(')[0].trim();
  }

  // If string contains English AI commentary, prompt checks, or code comments
  if (/check:|grammatically|example|tense|yes|no|\/\/|formality|lightness|correct for|partizip/i.test(s)) {
    return '';
  }

  // Remove German personal pronouns
  s = s.replace(/\b(er|sie|es|er\/sie\/es|er,sie,es)\b/gi, '').trim();

  // Clean trailing / leading punctuation or stray commas/colons/dots
  s = s.replace(/^[^\wäöüß\s]+|[^\wäöüß\s]+$/gi, '').replace(/[\:\,\.]/g, ' ').replace(/\s+/g, ' ').trim();

  // If multiple words were crammed into one field (e.g. "holt holte hat geholt"), extract just the single conjugation token
  const wordTokens = s.split(/\s+/).filter(Boolean);
  if (wordTokens.length > 2 && !/^(hat|ist)$/i.test(wordTokens[0])) {
    s = wordTokens[0];
  }

  // If still suspiciously long, discard
  if (s.length > 35) {
    return '';
  }

  return s;
}

/**
 * Get accurate dictionary conjugation or generate fallback regular conjugations
 */
export function getVerbConjugations(itemInput: VocabItem | Partial<VocabItem> | string): VerbConjugation {
  const item: Partial<VocabItem> = typeof itemInput === 'string' ? { word: itemInput } : itemInput;
  if (item.present3rd || item.praeteritum || item.perfekt) {
    return {
      present3rd: item.present3rd || '',
      praeteritum: item.praeteritum || '',
      perfekt: item.perfekt || '',
    };
  }
  const wordLower = (item.word || '').trim().toLowerCase();

  // 1. Direct dictionary match (Authority source)
  if (GERMAN_VERB_DICTIONARY[wordLower]) {
    return GERMAN_VERB_DICTIONARY[wordLower];
  }

  // 2. Check compound verb with separable or inseparable prefix (e.g. abfangen -> base verb fangen, verbieten -> base verb bieten)
  const separablePrefixes = ['an', 'auf', 'aus', 'ein', 'mit', 'ab', 'zu', 'vor', 'nach', 'bei', 'weg', 'weiter', 'zurück', 'her', 'hin'];
  for (const prefix of separablePrefixes) {
    if (wordLower.startsWith(prefix) && wordLower.length > prefix.length + 2) {
      const base = wordLower.slice(prefix.length);
      if (GERMAN_VERB_DICTIONARY[base]) {
        const baseDict = GERMAN_VERB_DICTIONARY[base];
        const pres3 = baseDict.present3rd.includes(' ') ? baseDict.present3rd : `${baseDict.present3rd} ${prefix}`;
        const praet = baseDict.praeteritum.includes(' ') ? baseDict.praeteritum : `${baseDict.praeteritum} ${prefix}`;
        let perf = baseDict.perfekt;
        if (perf.includes(' ge')) {
          perf = perf.replace(' ge', ` ${prefix}ge`);
        } else if (perf.startsWith('hat ') || perf.startsWith('ist ')) {
          const parts = perf.split(' ');
          perf = `${parts[0]} ${prefix}${parts[1]}`;
        }
        return { present3rd: pres3, praeteritum: praet, perfekt: perf };
      }
    }
  }

  const inseparablePrefixes = ['ver', 'be', 'emp', 'ent', 'er', 'ge', 'miss', 'zer'];
  for (const prefix of inseparablePrefixes) {
    if (wordLower.startsWith(prefix) && wordLower.length > prefix.length + 2) {
      const base = wordLower.slice(prefix.length);
      if (GERMAN_VERB_DICTIONARY[base]) {
        const baseDict = GERMAN_VERB_DICTIONARY[base];
        const pres3 = `${prefix}${baseDict.present3rd}`;
        const praet = `${prefix}${baseDict.praeteritum}`;
        let perf = baseDict.perfekt;
        if (perf.includes(' ge')) {
          perf = perf.replace(' ge', ` ${prefix}`);
        } else if (perf.startsWith('hat ') || perf.startsWith('ist ')) {
          const parts = perf.split(' ');
          perf = `${parts[0]} ${prefix}${parts[1]}`;
        }
        return { present3rd: pres3, praeteritum: praet, perfekt: perf };
      }
    }
  }

  const cleanItemP3 = sanitizeConjugationWord(item.present3rd);
  const cleanItemPr = sanitizeConjugationWord(item.praeteritum);
  const cleanItemPe = sanitizeConjugationWord(item.perfekt);

  // 3. If item already has explicit clean values defined
  if (cleanItemP3 && cleanItemPr && cleanItemPe) {
    return {
      present3rd: cleanItemP3,
      praeteritum: cleanItemPr,
      perfekt: cleanItemPe,
    };
  }

  // 4. Fallback conjugation rule generation for regular verbs
  let stem = wordLower;
  if (wordLower.endsWith('en')) {
    stem = wordLower.slice(0, -2);
  } else if (wordLower.endsWith('n')) {
    stem = wordLower.slice(0, -1);
  }

  const needsExtraE = /[dt]$/.test(stem) || /[^aeiouäöü][mn]$/.test(stem);
  const presSuffix = needsExtraE ? 'et' : 't';
  const praetSuffix = needsExtraE ? 'ete' : 'te';

  const isMovement = /^(reisen|wandern|joggen|klettern|segeln|rudern|tauchen|springen|fallen|fliehen|landen|passieren|fahren|gehen|kommen|fliegen|rennen|schwimmen)$/.test(wordLower);
  const aux = isMovement ? 'ist' : 'hat';

  const isInseparable = /^(be|emp|ent|er|ge|miss|ver|zer)/.test(wordLower);
  const isIeren = wordLower.endsWith('ieren');
  const gePart = (isInseparable || isIeren) ? '' : 'ge';

  const present3rd = cleanItemP3 || `${stem}${presSuffix}`;
  const praeteritum = cleanItemPr || `${stem}${praetSuffix}`;
  const perfekt = cleanItemPe || `${aux} ${gePart}${stem}t`;

  return { present3rd, praeteritum, perfekt };
}

/**
 * String normalizer for German vocabulary matching
 */
export function normalizeGermanText(text: string): string {
  if (!text) return '';
  let clean = text.trim().toLowerCase();

  // Remove common punctuation marks
  clean = clean.replace(/[\.,\/\#!$%\^&\*;:{}=\-_`~()"'?\u2013\u2014]/g, ' ');

  // Remove German personal pronouns
  clean = clean.replace(/\b(er|sie|es|er\/sie\/es|er,sie,es|ich|du|wir|ihr)\b/gi, ' ');

  // Remove articles
  clean = clean.replace(/\b(die|der|das|ein|eine|einen|einem|einer)\b/gi, ' ');

  return clean.replace(/\s+/g, ' ').trim();
}

/**
 * Strict evaluation function for German Plural matching (Nominativ Plural exclusively)
 */
export function evaluatePluralAnswer(userInput: string, targetPlural: string): boolean {
  if (!userInput || !targetPlural) return false;

  const u = userInput.trim().toLowerCase();
  const t = targetPlural.trim().toLowerCase();

  // 1. Exact string match (e.g. "die Tische" === "die Tische")
  if (u === t) return true;

  // 2. Handle special cases: "kein Plural" or "—"
  if (t.includes('kein plural') || t.includes('—') || t.includes('ohne plural')) {
    return u.includes('kein') || u.includes('—') || u.includes('ohne') || u.includes('keine');
  }

  // 3. Normalize both by stripping leading articles (die/der/das) and punctuation
  const normUser = normalizeGermanText(u);
  const normTarget = normalizeGermanText(t);

  // If user typed bare plural word (e.g. "Tische") and target is "die Tische" (normTarget: "tische")
  if (normUser && normTarget && normUser === normTarget) {
    return true;
  }

  return false;
}

/**
 * Match evaluation function for verbs and text answers
 */
export function evaluateGermanAnswer(userInput: string, targetValue: string, isPerfekt: boolean = false): boolean {
  if (!userInput || !targetValue) return false;

  const u = userInput.trim().toLowerCase();
  const t = targetValue.trim().toLowerCase();

  if (!u || !t) return false;

  // Standardize helper to handle Umlaut equivalences (ä->ae, ö->oe, ü->ue, ß->ss) & stripped pronouns
  const standardize = (str: string) => {
    let clean = normalizeGermanText(str);
    clean = clean
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss');
    return clean.replace(/\s+/g, ' ').trim();
  };

  const normUser = standardize(u);
  if (!normUser) return false;

  // Split target by comma, slash or 'oder' to support multiple acceptable answers
  const targetOptions = t.split(/[\/,]|\boder\b/i).map(s => s.trim()).filter(Boolean);

  for (const opt of targetOptions) {
    const normTarget = standardize(opt);
    if (!normTarget) continue;

    // 1. Direct match after normalization
    if (normUser === normTarget) return true;

    // 2. Space-insensitive match (e.g. "lädt ein" vs "lädtein")
    if (normUser.replace(/\s+/g, '') === normTarget.replace(/\s+/g, '')) return true;

    // 3. Separable verb prefix handling (e.g. target="laedt ein" vs user="laedt")
    const targetFirstWord = normTarget.split(' ')[0];
    if (targetFirstWord && normUser === targetFirstWord) return true;

    // 4. Special handling for Perfekt (e.g., "hat gesehen" vs "gesehen" or "ist gefahren")
    if (isPerfekt) {
      // Check if user provided an auxiliary verb (hat/ist)
      const targetAuxMatch = opt.match(/\b(hat|ist)\b/i);
      const userAuxMatch = u.match(/\b(hat|ist)\b/i);

      const targetAux = targetAuxMatch ? targetAuxMatch[1].toLowerCase() : null;
      const userAux = userAuxMatch ? userAuxMatch[1].toLowerCase() : null;

      // If user provided an auxiliary verb and it disagrees with target auxiliary verb -> INCORRECT
      if (userAux && targetAux && userAux !== targetAux) {
        continue;
      }

      // Compare bare participle without auxiliary or pronouns
      const userBare = normUser.replace(/\b(hat|ist|haben|sein|waren|hatte)\b/g, '').trim();
      const targetBare = normTarget.replace(/\b(hat|ist|haben|sein|waren|hatte)\b/g, '').trim();

      if (userBare && targetBare && (userBare === targetBare || userBare.replace(/\s+/g, '') === targetBare.replace(/\s+/g, ''))) {
        return true;
      }
    }
  }

  return false;
}

const IRREGULAR_VERB_BASE_SET = new Set([
  'sehen', 'fahren', 'sprechen', 'essen', 'trinken', 'gehen', 'kommen',
  'schlafen', 'bleiben', 'lesen', 'schreiben', 'laufen', 'schwimmen',
  'fliegen', 'helfen', 'treffen', 'nehmen', 'geben', 'bringen', 'denken',
  'wissen', 'haben', 'sein', 'werden', 'stehen', 'sitzen', 'liegen',
  'schließen', 'kennen', 'nennen', 'rennen', 'verstehen', 'vergessen',
  'verlieren', 'gewinnen', 'bekommen', 'beginnen', 'gefallen', 'einladen',
  'fangen', 'anfangen', 'halten', 'lassen', 'verlassen', 'fallen', 'tragen',
  'waschen', 'schlagen', 'finden', 'bieten', 'bitten', 'schneiden', 'ziehen',
  'aufstehen', 'mitkommen', 'anrufen', 'fernsehen', 'anziehen', 'ausziehen',
  'können', 'müssen', 'wollen', 'sollen', 'dürfen', 'mögen', 'singen'
]);

/**
 * Accurately determines if a German verb is irregular / strong / modal.
 */
export function checkIsIrregularVerb(item: Partial<VocabItem> | string): boolean {
  if (typeof item === 'string') {
    const w = item.trim().toLowerCase();
    if (IRREGULAR_VERB_BASE_SET.has(w)) return true;
    const prefixes = ['an', 'auf', 'aus', 'ein', 'mit', 'ab', 'zu', 'vor', 'nach', 'bei', 'weg', 'weiter', 'zurück', 'her', 'hin', 'ver', 'be', 'ge', 'er', 'ent', 'zer'];
    for (const prefix of prefixes) {
      if (w.startsWith(prefix) && w.length > prefix.length + 2) {
        if (IRREGULAR_VERB_BASE_SET.has(w.slice(prefix.length))) return true;
      }
    }
    return false;
  }

  if (item.isIrregular === true) return true;
  if (!item.word) return false;

  const w = item.word.trim().toLowerCase();
  if (IRREGULAR_VERB_BASE_SET.has(w)) return true;

  const prefixes = ['an', 'auf', 'aus', 'ein', 'mit', 'ab', 'zu', 'vor', 'nach', 'bei', 'weg', 'weiter', 'zurück', 'her', 'hin', 'ver', 'be', 'ge', 'er', 'ent', 'zer'];
  for (const prefix of prefixes) {
    if (w.startsWith(prefix) && w.length > prefix.length + 2) {
      if (IRREGULAR_VERB_BASE_SET.has(w.slice(prefix.length))) return true;
    }
  }

  // Check conjugations if available
  const p3 = item.present3rd ? item.present3rd.toLowerCase() : '';
  const pr = item.praeteritum ? item.praeteritum.toLowerCase() : '';
  const pe = item.perfekt ? item.perfekt.toLowerCase() : '';

  if (/[äöü]|ie\b|immt|ibt|itst|isst/i.test(p3) && !w.includes('ä') && !w.includes('ö') && !w.includes('ü')) {
    return true;
  }

  if (pr && !/(te|tete)\b/i.test(pr.replace(/\b(er|sie|es)\b/gi, '').trim())) {
    return true;
  }

  if (pe && /en\b/i.test(pe)) {
    return true;
  }

  return false;
}

/**
 * Generates clear educational explanation for German verb conjugation rules and rationale
 */
export function getVerbExplanationText(
  word: string,
  conjugations: VerbConjugation,
  isIrregularFlag?: boolean
): string {
  const w = word.trim().toLowerCase();
  const p3 = (conjugations.present3rd || '').replace(/\b(er|sie|es)\b/gi, '').trim();
  const pr = (conjugations.praeteritum || '').replace(/\b(er|sie|es)\b/gi, '').trim();
  const pe = (conjugations.perfekt || '').trim();

  const isModal = /^(können|müssen|wollen|sollen|dürfen|mögen)$/i.test(w);
  const isSeparable = /\s+/.test(p3) || /^(an|auf|aus|ein|mit|ab|zu|vor|nach|bei|weg|weiter)/i.test(w);
  const isAuxIst = /\bist\b/i.test(pe);
  const isIrregular = isIrregularFlag === true || checkIsIrregularVerb({ word, present3rd: p3, praeteritum: pr, perfekt: pe });

  const explanationParts: string[] = [];

  // Type of verb
  if (isModal) {
    explanationParts.push(`فعل مساعد (Modalverb): يتغير جذره في الحاضر والماضي ولا يأخذ سابقة (ge-) في زمن الحاضر التام عند اقترانه بفعل آخر.`);
  } else if (isSeparable) {
    const spaceIndex = p3.indexOf(' ');
    const prefix = spaceIndex !== -1 ? p3.slice(spaceIndex + 1) : '';
    explanationParts.push(`فعل منفصل${isIrregular ? ' وشاذ' : ' قياسي'} (Trennbares Verb): تنفصل السابقة${prefix ? ` (${prefix})` : ''} وتأتي في نهاية الجملة في الحاضر والماضي. وفي الحاضر التام تُدرج (ge-) بين السابقة وجذر الفعل.`);
  } else if (isIrregular) {
    explanationParts.push(`فعل شاذ / قوي (Starkes Verb): يتغير حرف العلة أو جذر الفعل عند تصريحه في الماضي (${pr}) والحاضر التام (${pe}).`);
  } else {
    explanationParts.push(`فعل قياسي منتظم (Schwaches Verb): يحافظ على جذر الفعل ثابتاً، ويصاغ بإضافة (t) في الحاضر، واللاحقة (te) في الماضي، وسابقة (ge-) ولاحقة (-t) في الحاضر التام.`);
  }

  // Auxiliary verb rule
  if (isAuxIst) {
    explanationParts.push(`يُستخدم الفعل المساعد (ist) في زمن الحاضر التام (Perfekt) لأنه يدل على حركة انتقال من مكان إلى آخر أو تغير في الحالة.`);
  }

  return explanationParts.join(' ');
}
