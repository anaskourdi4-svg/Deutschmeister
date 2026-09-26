import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { VocabSet, VocabItem, getVocabItemKey } from '../types';
import { SHEET_HEADERS_17, vocabItemToSheetRow, parseGoogleSheetRows } from './vocabParser';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

const TOKEN_STORAGE_KEY = 'deutsch_meister_google_access_token_v1';
const TOKEN_EXPIRY_KEY = 'deutsch_meister_google_token_exp_v1';

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export function getStoredAccessToken(): string | null {
  if (cachedAccessToken) return cachedAccessToken;
  try {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    const exp = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (token && exp && Date.now() < Number(exp)) {
      cachedAccessToken = token;
      return token;
    }
  } catch (e) {
    // ignore
  }
  return null;
}

export function storeAccessToken(token: string | null, expiresInSeconds: number = 3300) {
  cachedAccessToken = token;
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + expiresInSeconds * 1000));
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
    }
  } catch (e) {
    // ignore
  }
}

export interface AutoSyncStatusEvent {
  status: 'idle' | 'pending' | 'syncing' | 'synced' | 'error' | 'unlinked' | 'unauthenticated';
  message?: string;
  lastSyncedAt?: string;
  changesSummary?: SyncChangesSummary;
  formattedMessage?: { title: string; details: string[]; fullText: string };
}

export function broadcastAutoSyncStatus(event: AutoSyncStatusEvent) {
  try {
    window.dispatchEvent(new CustomEvent('app:autosync-status', { detail: event }));
  } catch (e) {
    // ignore
  }
}

export const initGoogleAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const validToken = getStoredAccessToken();
      if (validToken) {
        cachedAccessToken = validToken;
        if (onAuthSuccess) onAuthSuccess(user, validToken);
      } else if (!isSigningIn) {
        // User logged in to Firebase but OAuth token expired
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      storeAccessToken(null);
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('لم يتم الحصول على رمز الوصول من حساب Google.');
    }

    cachedAccessToken = credential.accessToken;
    storeAccessToken(cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request' ||
      error?.message?.includes('popup-closed-by-user')
    ) {
      // User closed the popup before completing sign-in; handle smoothly
      return null;
    }
    if (
      error?.code === 'auth/unauthorized-domain' ||
      error?.message?.includes('auth/unauthorized-domain') ||
      error?.message?.includes('unauthorized-domain')
    ) {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'النطاق الحالي';
      const projectId = firebaseConfig.projectId;
      const customErr: any = new Error(
        `النطاق الحالي (${currentHost}) غير مضاف في قائمة النطاقات المصرح بها (Authorized Domains) في Firebase Authentication. يرجى إضافته من Firebase Console > Authentication > Settings.`
      );
      customErr.code = 'auth/unauthorized-domain';
      customErr.domain = currentHost;
      customErr.projectId = projectId;
      console.warn('Firebase unauthorized domain:', currentHost, error);
      throw customErr;
    }
    console.warn('Google Sign-In notice:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return getStoredAccessToken();
};

export const googleLogout = async () => {
  await signOut(auth);
  storeAccessToken(null);
  broadcastAutoSyncStatus({ status: 'unauthenticated', message: 'تم تسجيل الخروج من Google' });
};

export interface DriveSpreadsheetFile {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export interface LinkedSpreadsheetInfo {
  spreadsheetId: string;
  spreadsheetTitle: string;
  spreadsheetUrl: string;
  lastSyncedAt: string;
  deckCount: number;
  wordCount: number;
  mergedDecks?: VocabSet[];
  newWordsFound?: number;
}

export function computeVocabSetsSnapshot(sets: VocabSet[]): string {
  if (!sets || !Array.isArray(sets)) return '';
  return JSON.stringify(
    sets.map(s => ({
      id: s.id,
      name: (s.name || '').trim(),
      levelGroup: s.levelGroup,
      count: s.items?.length || 0,
      words: (s.items || []).map(i => `${i.id}_${(i.word || '').trim().toLowerCase()}_${i.masteryScore || 0}_${i.attemptsCount || 0}_${i.correctCount || 0}_${i.lastPracticed || ''}_${i.translationAr || ''}_${i.translationEn || ''}_${i.plural || ''}_${i.gender || ''}`),
    }))
  );
}

export interface DeckRenameChange {
  oldName: string;
  newName: string;
}

export interface SyncChangesSummary {
  addedWordsCount: number;
  deletedWordsCount: number;
  updatedWordsCount: number;
  addedWordsSamples: string[];
  deletedWordsSamples: string[];
  updatedWordsSamples: string[];
  renamedDecks: DeckRenameChange[];
  newDecksCount: number;
  newDecksNames: string[];
}

export interface MergeRemoteResult {
  mergedSets: VocabSet[];
  hasChanges: boolean;
  newWordsCount: number;
  updatedWordsCount: number;
  deletedWordsCount: number;
  changesSummary: SyncChangesSummary;
}

export function formatSyncChangesMessage(summary: SyncChangesSummary): { title: string; details: string[]; fullText: string } {
  const details: string[] = [];

  if (summary.addedWordsCount > 0) {
    const samples = summary.addedWordsSamples.length > 0 ? ` (${summary.addedWordsSamples.join('، ')})` : '';
    details.push(`تم إضافة ${summary.addedWordsCount} مفردة جديدة${samples}`);
  }
  if (summary.deletedWordsCount > 0) {
    const samples = summary.deletedWordsSamples.length > 0 ? ` (${summary.deletedWordsSamples.join('، ')})` : '';
    details.push(`تم حذف ${summary.deletedWordsCount} مفردة أزيلت من الجدول${samples}`);
  }
  if (summary.updatedWordsCount > 0) {
    const samples = summary.updatedWordsSamples.length > 0 ? ` (${summary.updatedWordsSamples.join('، ')})` : '';
    details.push(`تم تعديل بيانات ${summary.updatedWordsCount} مفردة${samples}`);
  }
  if (summary.renamedDecks && summary.renamedDecks.length > 0) {
    const renames = summary.renamedDecks.map(r => `«${r.oldName}» ➔ «${r.newName}»`).join('، ');
    details.push(`تم تغيير تسمية: ${renames}`);
  }
  if (summary.newDecksCount > 0) {
    const names = summary.newDecksNames.length > 0 ? ` (${summary.newDecksNames.join('، ')})` : '';
    details.push(`تم استيراد ${summary.newDecksCount} حزمة جديدة${names}`);
  }

  const title = details.length > 0
    ? `تم تلقي تحديثات جديدة من Google Sheets`
    : `البيانات متطابقة مع Google Sheets`;

  const fullText = details.length > 0 ? `${title}:\n• ` + details.join('\n• ') : title;

  return { title, details, fullText };
}

/**
 * Intelligent bidirectional merger between local decks and remote decks from Google Sheets.
 * - Retains original local deck IDs so activeSetId never breaks.
 * - Retains original local item IDs.
 * - Detects and adds new words added directly in Google Sheets.
 * - Detects words removed in Google Sheets.
 * - Detects renamed sheets/tabs and updates deck names smoothly.
 * - Updates translations and grammar definitions while preserving the user's highest quiz mastery stats.
 */
export function mergeRemoteDecksWithLocalDecks(
  localDecks: VocabSet[],
  remoteDecks: VocabSet[]
): MergeRemoteResult {
  let hasChanges = false;
  let newWordsCount = 0;
  let updatedWordsCount = 0;
  let deletedWordsCount = 0;
  let newDecksCount = 0;

  const addedWordsSamples: string[] = [];
  const deletedWordsSamples: string[] = [];
  const updatedWordsSamples: string[] = [];
  const renamedDecks: DeckRenameChange[] = [];
  const newDecksNames: string[] = [];

  const emptySummary: SyncChangesSummary = {
    addedWordsCount: 0,
    deletedWordsCount: 0,
    updatedWordsCount: 0,
    addedWordsSamples: [],
    deletedWordsSamples: [],
    updatedWordsSamples: [],
    renamedDecks: [],
    newDecksCount: 0,
    newDecksNames: [],
  };

  if (!remoteDecks || remoteDecks.length === 0) {
    return {
      mergedSets: localDecks,
      hasChanges: false,
      newWordsCount: 0,
      updatedWordsCount: 0,
      deletedWordsCount: 0,
      changesSummary: emptySummary,
    };
  }

  // Create deep copy of local decks
  const resultDecks: VocabSet[] = localDecks.map(d => ({
    ...d,
    items: [...(d.items || [])],
  }));

  const matchedLocalIndices = new Set<number>();

  remoteDecks.forEach(remoteDeck => {
    const cleanRemoteTitle = (remoteDeck.name || '').trim().toLowerCase();

    // 1. Find matching local deck
    let localIdx = resultDecks.findIndex(
      (ld, idx) => !matchedLocalIndices.has(idx) && ld.id === remoteDeck.id
    );

    if (localIdx === -1 && remoteDeck.googleSheetTabId !== undefined) {
      localIdx = resultDecks.findIndex(
        (ld, idx) => !matchedLocalIndices.has(idx) && ld.googleSheetTabId !== undefined && ld.googleSheetTabId === remoteDeck.googleSheetTabId
      );
    }

    if (localIdx === -1) {
      localIdx = resultDecks.findIndex(
        (ld, idx) => !matchedLocalIndices.has(idx) && (ld.name || '').trim().toLowerCase() === cleanRemoteTitle
      );
    }

    if (localIdx === -1 && remoteDeck.lastSyncedTabName) {
      localIdx = resultDecks.findIndex(
        (ld, idx) => !matchedLocalIndices.has(idx) && (ld.lastSyncedTabName || '').trim().toLowerCase() === remoteDeck.lastSyncedTabName.toLowerCase().trim()
      );
    }

    if (localIdx === -1) {
      localIdx = resultDecks.findIndex(
        (ld, idx) => !matchedLocalIndices.has(idx) && ld.levelGroup === remoteDeck.levelGroup && resultDecks.length === remoteDecks.length
      );
    }

    if (localIdx !== -1) {
      matchedLocalIndices.add(localIdx);
      const localDeck = resultDecks[localIdx];
      const localItems = localDeck.items || [];
      const remoteItems = remoteDeck.items || [];

      // Check if deck was renamed in Google Sheets
      const currentDeckName = (localDeck.name || '').trim();
      const newDeckName = (remoteDeck.name || '').trim();
      if (newDeckName && currentDeckName && newDeckName !== currentDeckName) {
        renamedDecks.push({ oldName: currentDeckName, newName: newDeckName });
        hasChanges = true;
      }

      // Check deletions if deck was previously linked and remote items were parsed
      const isLinkedDeck = localDeck.googleSheetTabId !== undefined || !!localDeck.lastSyncedTabName;
      let initialKeptItems: VocabItem[] = [];

      if (isLinkedDeck && remoteItems.length > 0) {
        const remoteItemKeySet = new Set(remoteItems.map(r => getVocabItemKey(r)));
        const remoteCleanWordsSet = new Set(remoteItems.map(r => (r.word || '').trim().toLowerCase()).filter(Boolean));

        localItems.forEach(localItem => {
          const itemKey = getVocabItemKey(localItem);
          const cleanW = (localItem.word || '').trim().toLowerCase();
          const isPresentInRemote = remoteItemKeySet.has(itemKey) || (cleanW ? remoteCleanWordsSet.has(cleanW) : false);

          if (!isPresentInRemote) {
            // Word was deleted from Google Sheets
            deletedWordsCount++;
            if (deletedWordsSamples.length < 4 && localItem.word) {
              deletedWordsSamples.push(localItem.word);
            }
            hasChanges = true;
          } else {
            initialKeptItems.push(localItem);
          }
        });
      } else {
        initialKeptItems = [...localItems];
      }

      // Index kept items by itemKey and normalized word
      const keptItemByKey = new Map<string, { item: VocabItem; index: number }>();
      const keptItemByWord = new Map<string, { item: VocabItem; index: number }>();

      initialKeptItems.forEach((item, i) => {
        keptItemByKey.set(getVocabItemKey(item), { item, index: i });
        const cleanW = (item.word || '').trim().toLowerCase();
        if (cleanW) {
          keptItemByWord.set(cleanW, { item, index: i });
        }
      });

      const mergedItems = [...initialKeptItems];

      remoteItems.forEach((remoteItem, rIdx) => {
        const itemKey = getVocabItemKey(remoteItem);
        const cleanW = (remoteItem.word || '').trim().toLowerCase();
        const existing = keptItemByKey.get(itemKey) || (cleanW ? keptItemByWord.get(cleanW) : undefined);

        if (!existing) {
          // New word found in Google Sheets!
          newWordsCount++;
          if (addedWordsSamples.length < 4 && remoteItem.word) {
            addedWordsSamples.push(remoteItem.word);
          }
          hasChanges = true;
          const newItem: VocabItem = {
            ...remoteItem,
            id: remoteItem.id || `item_gs_${Date.now()}_${rIdx}_${Math.random().toString(36).substring(2, 6)}`,
          };
          mergedItems.push(newItem);
          const newIdx = mergedItems.length - 1;
          keptItemByKey.set(getVocabItemKey(newItem), { item: newItem, index: newIdx });
          if (cleanW) keptItemByWord.set(cleanW, { item: newItem, index: newIdx });
        } else {
          // Existing word - merge updates from Google Sheets
          const target = { ...mergedItems[existing.index] };
          let itemUpdated = false;

          if (remoteItem.translationAr && remoteItem.translationAr !== target.translationAr) {
            target.translationAr = remoteItem.translationAr;
            itemUpdated = true;
          }
          if (remoteItem.translationEn && remoteItem.translationEn !== target.translationEn) {
            target.translationEn = remoteItem.translationEn;
            itemUpdated = true;
          }
          if (remoteItem.plural && remoteItem.plural !== target.plural) {
            target.plural = remoteItem.plural;
            itemUpdated = true;
          }
          if (remoteItem.gender && remoteItem.gender !== target.gender) {
            target.gender = remoteItem.gender;
            itemUpdated = true;
          }
          if (remoteItem.antonym && remoteItem.antonym !== target.antonym) {
            target.antonym = remoteItem.antonym;
            itemUpdated = true;
          }
          if (remoteItem.exampleDe && remoteItem.exampleDe !== target.exampleDe) {
            target.exampleDe = remoteItem.exampleDe;
            itemUpdated = true;
          }
          if (remoteItem.preposition && remoteItem.preposition !== target.preposition) {
            target.preposition = remoteItem.preposition;
            itemUpdated = true;
          }
          if (remoteItem.prepositionCase && remoteItem.prepositionCase !== target.prepositionCase) {
            target.prepositionCase = remoteItem.prepositionCase;
            itemUpdated = true;
          }
          if (remoteItem.present3rd && remoteItem.present3rd !== target.present3rd) {
            target.present3rd = remoteItem.present3rd;
            itemUpdated = true;
          }
          if (remoteItem.praeteritum && remoteItem.praeteritum !== target.praeteritum) {
            target.praeteritum = remoteItem.praeteritum;
            itemUpdated = true;
          }
          if (remoteItem.perfekt && remoteItem.perfekt !== target.perfekt) {
            target.perfekt = remoteItem.perfekt;
            itemUpdated = true;
          }

          // Preserve highest quiz score / stats
          const highestMastery = Math.max(target.masteryScore || 0, remoteItem.masteryScore || 0);
          const highestAttempts = Math.max(target.attemptsCount || 0, remoteItem.attemptsCount || 0);
          const highestCorrect = Math.max(target.correctCount || 0, remoteItem.correctCount || 0);

          if (highestMastery !== target.masteryScore) {
            target.masteryScore = highestMastery;
            itemUpdated = true;
          }
          if (highestAttempts !== target.attemptsCount) {
            target.attemptsCount = highestAttempts;
            itemUpdated = true;
          }
          if (highestCorrect !== target.correctCount) {
            target.correctCount = highestCorrect;
            itemUpdated = true;
          }
          if (remoteItem.isStarred && !target.isStarred) {
            target.isStarred = true;
            itemUpdated = true;
          }

          if (itemUpdated) {
            mergedItems[existing.index] = target;
            updatedWordsCount++;
            if (updatedWordsSamples.length < 4 && target.word) {
              updatedWordsSamples.push(target.word);
            }
            hasChanges = true;
          }
        }
      });

      resultDecks[localIdx] = {
        ...localDeck,
        name: newDeckName || localDeck.name,
        googleSheetTabId: localDeck.googleSheetTabId ?? remoteDeck.googleSheetTabId,
        lastSyncedTabName: newDeckName || localDeck.lastSyncedTabName,
        items: mergedItems,
      };
    } else {
      // Entirely new tab in Google Sheets - add as new deck
      const count = remoteDeck.items?.length || 0;
      newWordsCount += count;
      newDecksCount++;
      if (remoteDeck.name) newDecksNames.push(remoteDeck.name);
      if (remoteDeck.items && addedWordsSamples.length < 4) {
        remoteDeck.items.slice(0, 3).forEach(i => {
          if (i.word && addedWordsSamples.length < 4) addedWordsSamples.push(i.word);
        });
      }
      hasChanges = true;
      resultDecks.push({
        ...remoteDeck,
        googleSheetTabId: remoteDeck.googleSheetTabId,
        lastSyncedTabName: remoteDeck.name,
        id: remoteDeck.id || `set_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      });
    }
  });

  const changesSummary: SyncChangesSummary = {
    addedWordsCount: newWordsCount,
    deletedWordsCount,
    updatedWordsCount,
    addedWordsSamples,
    deletedWordsSamples,
    updatedWordsSamples,
    renamedDecks,
    newDecksCount,
    newDecksNames,
  };

  return {
    mergedSets: resultDecks,
    hasChanges,
    newWordsCount,
    updatedWordsCount,
    deletedWordsCount,
    changesSummary,
  };
}

const LINKED_SHEET_KEY = 'deutsch_meister_linked_sheet_v1';

const getTabMapKey = (spreadsheetId: string) => `deutsch_meister_tab_map_${spreadsheetId}`;

export function getDeckTabMapping(spreadsheetId: string): Record<string, { sheetId: number; tabTitle: string }> {
  try {
    const raw = localStorage.getItem(getTabMapKey(spreadsheetId));
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // ignore
  }
  return {};
}

export function saveDeckTabMapping(spreadsheetId: string, mapping: Record<string, { sheetId: number; tabTitle: string }>) {
  try {
    localStorage.setItem(getTabMapKey(spreadsheetId), JSON.stringify(mapping));
  } catch (e) {
    // ignore
  }
}

export function getSavedLinkedSheet(): LinkedSpreadsheetInfo | null {
  try {
    const raw = localStorage.getItem(LINKED_SHEET_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.spreadsheetId) return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse linked sheet info:', e);
  }
  return null;
}

export function saveLinkedSheet(info: LinkedSpreadsheetInfo | null) {
  try {
    if (!info) {
      localStorage.removeItem(LINKED_SHEET_KEY);
    } else {
      localStorage.setItem(LINKED_SHEET_KEY, JSON.stringify(info));
    }
  } catch (e) {
    console.warn('Failed to save linked sheet info:', e);
  }
}

/**
 * Extract Spreadsheet ID from full URL or return ID directly
 */
export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) {
    return match[1];
  }
  return trimmed;
}

/**
 * Robust fetch wrapper for Google APIs with retry and user-friendly error handling.
 */
export async function safeGoogleFetch(
  url: string,
  options: RequestInit,
  accessToken: string,
  maxRetries = 2
): Promise<Response> {
  if (!accessToken || typeof accessToken !== 'string' || accessToken.trim() === '') {
    storeAccessToken(null);
    broadcastAutoSyncStatus({
      status: 'unauthenticated',
      message: 'انتهت صلاحية جلسة Google، يرجى تسجيل الدخول مجدداً.',
    });
    throw new Error('انتهت صلاحية جلسة Google، يرجى تسجيل الدخول مجدداً لتفعيل المزامنة.');
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('لا يوجد اتصال بالإنترنت حالياً. تم حفظ بياناتك محلياً وستتم المزامنة تلقائياً عند عودة الاتصال.');
  }

  const mergedHeaders: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    ...(options.headers as Record<string, string> || {}),
  };

  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: mergedHeaders,
      });

      if (response.status === 401) {
        storeAccessToken(null);
        broadcastAutoSyncStatus({
          status: 'unauthenticated',
          message: 'انتهت صلاحية جلسة Google، يرجى تسجيل الدخول مجدداً.',
        });
        throw new Error('انتهت صلاحية جلسة Google، يرجى تسجيل الدخول مجدداً لتفعيل المزامنة.');
      }

      return response;
    } catch (err: any) {
      lastError = err;
      if (err.message && err.message.includes('انتهت صلاحية جلسة Google')) {
        throw err;
      }

      if (attempt < maxRetries) {
        await new Promise(res => setTimeout(res, 600 * (attempt + 1)));
      }
    }
  }

  const errMsg = lastError?.message || '';
  if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError') || !navigator.onLine) {
    throw new Error('تعذر الاتصال بخوادم Google حالياً (مشكلة مؤقتة في الشبكة أو انقطاع إنترنت). تم حفظ بياناتك محلياً وستتم المزامنة تلقائياً.');
  }

  throw lastError;
}

/**
 * Sanitize deck title so it conforms to Google Sheets tab name rules
 * (cannot contain: [ ] * ? : / \ and max length 100)
 */
export function sanitizeSheetTabTitle(name: string, fallbackIndex: number = 0): string {
  let clean = (name || `Deck ${fallbackIndex + 1}`).replace(/[\[\]*?:/\\]/g, '-').trim();
  if (!clean) clean = `Deck ${fallbackIndex + 1}`;
  if (clean.length > 95) clean = clean.substring(0, 95);
  return clean;
}

/**
 * List Google Sheets files owned or accessible by user in Google Drive
 */
export async function listUserSpreadsheets(accessToken: string): Promise<DriveSpreadsheetFile[]> {
  const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const response = await safeGoogleFetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime%20desc&pageSize=30&fields=files(id,name,modifiedTime,webViewLink)`,
    { method: 'GET' },
    accessToken
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`خطأ في الوصول إلى Google Drive: ${response.statusText} (${errText})`);
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Create a new Master Google Spreadsheet in Drive with a tab for each Deck.
 * Each tab contains the 17-column format (12 vocab columns + 5 mastery stats columns).
 */
export async function createSpreadsheetWithDecks(
  title: string,
  decks: VocabSet[],
  accessToken: string
): Promise<LinkedSpreadsheetInfo> {
  const validDecks = decks.length > 0 ? decks : [
    {
      id: 'default_deck',
      name: 'Vocabulary Deck',
      levelGroup: 'A1',
      createdAt: new Date().toISOString(),
      items: [],
    }
  ];

  // 1. Prepare initial sheets configuration
  const tabNames: string[] = [];
  const sheetsPayload = validDecks.map((deck, idx) => {
    let tabTitle = sanitizeSheetTabTitle(deck.name, idx);
    // Ensure uniqueness
    if (tabNames.includes(tabTitle)) {
      tabTitle = `${tabTitle} (${idx + 1})`;
    }
    tabNames.push(tabTitle);
    return {
      properties: {
        title: tabTitle,
        gridProperties: {
          frozenRowCount: 1,
        },
      },
    };
  });

  // 2. Create the spreadsheet
  const createRes = await safeGoogleFetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: title.trim() || 'DeutschMeister - German Vocabulary & Mastery',
      },
      sheets: sheetsPayload,
    }),
  }, accessToken);

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`فشل إنشاء جدول Google Sheet جديد: ${createRes.statusText} (${errText})`);
  }

  const createdData = await createRes.json();
  const spreadsheetId = createdData.spreadsheetId;
  const spreadsheetUrl = createdData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  const createdSheets = createdData.sheets || [];

  // 3. Batch write all values to all tabs
  const valueData = validDecks.map((deck, idx) => {
    const tabTitle = tabNames[idx];
    const dataRows = (deck.items || []).map(item => vocabItemToSheetRow(item));
    return {
      range: `'${tabTitle}'!A1:Q`,
      majorDimension: 'ROWS',
      values: [SHEET_HEADERS_17, ...dataRows],
    };
  });

  const writeRes = await safeGoogleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: valueData,
      }),
    },
    accessToken
  );

  if (!writeRes.ok) {
    console.warn('Initial value population had a warning, continuing...');
  }

  // 4. Format header rows (Bold, Background color) via batchUpdate
  try {
    const formatRequests: any[] = [];
    createdSheets.forEach((s: any) => {
      const sheetId = s.properties?.sheetId;
      if (sheetId !== undefined) {
        formatRequests.push({
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: SHEET_HEADERS_17.length,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.93, green: 0.95, blue: 0.99 },
                textFormat: { bold: true, fontSize: 10 },
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)',
          },
        });
      }
    });

    if (formatRequests.length > 0) {
      await safeGoogleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests: formatRequests }),
      }, accessToken);
    }
  } catch (fmtErr) {
    console.warn('Could not apply formatting to headers, but data saved:', fmtErr);
  }

  const totalWords = validDecks.reduce((acc, d) => acc + (d.items?.length || 0), 0);

  // Map each deck to its newly assigned Google Sheet tabId
  const mapping: Record<string, { sheetId: number; tabTitle: string }> = {};
  const enrichedDecks = validDecks.map((deck, idx) => {
    const sheetId = createdSheets[idx]?.properties?.sheetId;
    const tabTitle = tabNames[idx];
    if (sheetId !== undefined) {
      mapping[deck.id] = { sheetId, tabTitle };
    }
    return {
      ...deck,
      googleSheetTabId: sheetId,
      lastSyncedTabName: tabTitle,
    };
  });
  saveDeckTabMapping(spreadsheetId, mapping);

  const info: LinkedSpreadsheetInfo = {
    spreadsheetId,
    spreadsheetTitle: createdData.properties?.title || title,
    spreadsheetUrl,
    lastSyncedAt: new Date().toISOString(),
    deckCount: validDecks.length,
    wordCount: totalWords,
    mergedDecks: enrichedDecks,
  };

  saveLinkedSheet(info);
  return info;
}

/**
 * Synchronize all decks to an existing Google Spreadsheet.
 * - Intelligently renames existing sheet tabs in place (updateSheetProperties) when a deck's name changes.
 * - Never creates duplicate tabs for renamed decks.
 * - Missing tabs for genuinely new decks will be created.
 * - Pre-existing rows in sheets are read and preserved to prevent any data loss.
 * - Technical mastery stats and full 17-column format are safely updated.
 */
export async function syncAllDecksToGoogleSheets(
  spreadsheetId: string,
  decks: VocabSet[],
  accessToken: string
): Promise<LinkedSpreadsheetInfo> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  if (!cleanId) {
    throw new Error('يرجى تحديد معرف أو رابط Google Sheet صالح.');
  }

  // 1. Fetch current spreadsheet metadata to see existing sheets/tabs
  const metaRes = await safeGoogleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?fields=properties.title,sheets.properties`,
    { method: 'GET' },
    accessToken
  );

  if (!metaRes.ok) {
    if (metaRes.status === 404) throw new Error('لم يتم العثور على Google Sheet. يرجى التأكد من صحة الرابط.');
    if (metaRes.status === 403) throw new Error('ليس لديك صلاحية التعديل على هذا الشيت.');
    throw new Error(`فشل قراءة بيانات الشيت (${metaRes.statusText})`);
  }

  const metaData = await metaRes.json();
  const existingSheets = metaData.sheets || [];

  // 2. Read current rows from ALL existing tabs using current titles BEFORE any renaming
  const existingRemoteRowsBySheetId = new Map<number, string[][]>();
  const existingRemoteRowsByTitle = new Map<string, string[][]>();

  if (existingSheets.length > 0) {
    try {
      const rangesQuery = existingSheets
        .map((s: any) => `ranges=${encodeURIComponent(`'${s.properties.title}'!A1:Q5000`)}`)
        .join('&');
      const getRes = await safeGoogleFetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values:batchGet?${rangesQuery}`,
        { method: 'GET' },
        accessToken
      );
      if (getRes.ok) {
        const getData = await getRes.json();
        const valueRanges: any[] = getData.valueRanges || [];
        existingSheets.forEach((s: any, i: number) => {
          const rows = valueRanges[i]?.values || [];
          if (s.properties?.sheetId !== undefined) {
            existingRemoteRowsBySheetId.set(s.properties.sheetId, rows);
          }
          if (s.properties?.title) {
            existingRemoteRowsByTitle.set(s.properties.title.toLowerCase().trim(), rows);
          }
        });
      }
    } catch (readErr) {
      console.warn('Notice reading remote sheet rows before sync:', readErr);
    }
  }

  // 3. Load persistent deck-to-tab mapping
  const savedMapping = getDeckTabMapping(cleanId);

  // 4. Compute unique sanitized desired tab titles for each deck
  const desiredTitles: string[] = [];
  decks.forEach((deck, idx) => {
    const rawSanitized = sanitizeSheetTabTitle(deck.name, idx);
    let titleCandidate = rawSanitized;
    let counter = 1;
    while (desiredTitles.includes(titleCandidate)) {
      counter++;
      titleCandidate = `${rawSanitized} (${counter})`;
    }
    desiredTitles.push(titleCandidate);
  });

  // 5. Intelligent Multi-Tier Matching of decks to existing sheets
  interface DeckPlan {
    deck: VocabSet;
    desiredTitle: string;
    matchedSheetId?: number;
    matchedCurrentTitle?: string;
    isNew: boolean;
    needsRename: boolean;
  }

  const deckPlans: (DeckPlan | null)[] = new Array(decks.length).fill(null);
  const claimedSheetIds = new Set<number>();

  // Pass 1: Match by explicit deck.googleSheetTabId
  decks.forEach((deck, idx) => {
    if (deckPlans[idx] !== null) return;
    if (deck.googleSheetTabId !== undefined) {
      const targetSheet = existingSheets.find(
        (s: any) => s.properties?.sheetId === deck.googleSheetTabId && !claimedSheetIds.has(s.properties.sheetId)
      );
      if (targetSheet) {
        const sId = targetSheet.properties.sheetId;
        const curTitle = targetSheet.properties.title || '';
        claimedSheetIds.add(sId);
        deckPlans[idx] = {
          deck,
          desiredTitle: desiredTitles[idx],
          matchedSheetId: sId,
          matchedCurrentTitle: curTitle,
          isNew: false,
          needsRename: curTitle.toLowerCase().trim() !== desiredTitles[idx].toLowerCase().trim(),
        };
      }
    }
  });

  // Pass 2: Match by saved mapping in localStorage
  decks.forEach((deck, idx) => {
    if (deckPlans[idx] !== null) return;
    const mapped = savedMapping[deck.id];
    if (mapped?.sheetId !== undefined) {
      const targetSheet = existingSheets.find(
        (s: any) => s.properties?.sheetId === mapped.sheetId && !claimedSheetIds.has(s.properties.sheetId)
      );
      if (targetSheet) {
        const sId = targetSheet.properties.sheetId;
        const curTitle = targetSheet.properties.title || '';
        claimedSheetIds.add(sId);
        deckPlans[idx] = {
          deck,
          desiredTitle: desiredTitles[idx],
          matchedSheetId: sId,
          matchedCurrentTitle: curTitle,
          isNew: false,
          needsRename: curTitle.toLowerCase().trim() !== desiredTitles[idx].toLowerCase().trim(),
        };
      }
    }
  });

  // Pass 3: Match by deck.id pattern `deck_gs_${sheetId}_...`
  decks.forEach((deck, idx) => {
    if (deckPlans[idx] !== null) return;
    const match = (deck.id || '').match(/^deck_gs_(\d+)_/);
    if (match) {
      const parsedId = parseInt(match[1], 10);
      const targetSheet = existingSheets.find(
        (s: any) => s.properties?.sheetId === parsedId && !claimedSheetIds.has(s.properties.sheetId)
      );
      if (targetSheet) {
        const sId = targetSheet.properties.sheetId;
        const curTitle = targetSheet.properties.title || '';
        claimedSheetIds.add(sId);
        deckPlans[idx] = {
          deck,
          desiredTitle: desiredTitles[idx],
          matchedSheetId: sId,
          matchedCurrentTitle: curTitle,
          isNew: false,
          needsRename: curTitle.toLowerCase().trim() !== desiredTitles[idx].toLowerCase().trim(),
        };
      }
    }
  });

  // Pass 4: Match by deck.lastSyncedTabName
  decks.forEach((deck, idx) => {
    if (deckPlans[idx] !== null) return;
    if (deck.lastSyncedTabName) {
      const cleanLast = deck.lastSyncedTabName.toLowerCase().trim();
      const targetSheet = existingSheets.find(
        (s: any) =>
          s.properties?.title &&
          s.properties.title.toLowerCase().trim() === cleanLast &&
          !claimedSheetIds.has(s.properties.sheetId)
      );
      if (targetSheet) {
        const sId = targetSheet.properties.sheetId;
        const curTitle = targetSheet.properties.title || '';
        claimedSheetIds.add(sId);
        deckPlans[idx] = {
          deck,
          desiredTitle: desiredTitles[idx],
          matchedSheetId: sId,
          matchedCurrentTitle: curTitle,
          isNew: false,
          needsRename: curTitle.toLowerCase().trim() !== desiredTitles[idx].toLowerCase().trim(),
        };
      }
    }
  });

  // Pass 5: Match by exact desired title
  decks.forEach((deck, idx) => {
    if (deckPlans[idx] !== null) return;
    const cleanDes = desiredTitles[idx].toLowerCase().trim();
    const targetSheet = existingSheets.find(
      (s: any) =>
        s.properties?.title &&
        s.properties.title.toLowerCase().trim() === cleanDes &&
        !claimedSheetIds.has(s.properties.sheetId)
    );
    if (targetSheet) {
      const sId = targetSheet.properties.sheetId;
      const curTitle = targetSheet.properties.title || '';
      claimedSheetIds.add(sId);
      deckPlans[idx] = {
        deck,
        desiredTitle: desiredTitles[idx],
        matchedSheetId: sId,
        matchedCurrentTitle: curTitle,
        isNew: false,
        needsRename: false,
      };
    }
  });

  // Pass 6: Match by vocabulary content overlap for remaining unmatched
  decks.forEach((deck, idx) => {
    if (deckPlans[idx] !== null) return;
    const deckWords = new Set(
      (deck.items || []).map(i => (i.word || '').trim().toLowerCase()).filter(Boolean)
    );
    if (deckWords.size > 0) {
      let bestSheet: any = null;
      let bestCount = 0;
      for (const s of existingSheets) {
        const sId = s.properties?.sheetId;
        if (sId !== undefined && !claimedSheetIds.has(sId)) {
          const rows = existingRemoteRowsBySheetId.get(sId) || [];
          const sheetWords = rows.slice(1).map(r => (r[0] || '').trim().toLowerCase()).filter(Boolean);
          const matchCount = sheetWords.filter(w => deckWords.has(w)).length;
          if (matchCount > 0 && (matchCount / deckWords.size >= 0.25 || matchCount >= 3)) {
            if (matchCount > bestCount) {
              bestCount = matchCount;
              bestSheet = s;
            }
          }
        }
      }
      if (bestSheet) {
        const sId = bestSheet.properties.sheetId;
        const curTitle = bestSheet.properties.title || '';
        claimedSheetIds.add(sId);
        deckPlans[idx] = {
          deck,
          desiredTitle: desiredTitles[idx],
          matchedSheetId: sId,
          matchedCurrentTitle: curTitle,
          isNew: false,
          needsRename: curTitle.toLowerCase().trim() !== desiredTitles[idx].toLowerCase().trim(),
        };
      }
    }
  });

  // Pass 7: Positional 1-to-1 match for remaining unmatched decks and unclaimed sheets
  const unmatchedIndices = decks.map((_, i) => i).filter(i => deckPlans[i] === null);
  const unclaimedSheets = existingSheets.filter(
    (s: any) => s.properties?.sheetId !== undefined && !claimedSheetIds.has(s.properties.sheetId)
  );

  if (unmatchedIndices.length > 0 && unclaimedSheets.length > 0) {
    if (unmatchedIndices.length === 1 && unclaimedSheets.length === 1) {
      const idx = unmatchedIndices[0];
      const targetSheet = unclaimedSheets[0];
      const sId = targetSheet.properties.sheetId;
      const curTitle = targetSheet.properties.title || '';
      claimedSheetIds.add(sId);
      deckPlans[idx] = {
        deck: decks[idx],
        desiredTitle: desiredTitles[idx],
        matchedSheetId: sId,
        matchedCurrentTitle: curTitle,
        isNew: false,
        needsRename: curTitle.toLowerCase().trim() !== desiredTitles[idx].toLowerCase().trim(),
      };
    } else if (unmatchedIndices.length === unclaimedSheets.length) {
      unmatchedIndices.forEach((idx, i) => {
        const targetSheet = unclaimedSheets[i];
        const sId = targetSheet.properties.sheetId;
        const curTitle = targetSheet.properties.title || '';
        claimedSheetIds.add(sId);
        deckPlans[idx] = {
          deck: decks[idx],
          desiredTitle: desiredTitles[idx],
          matchedSheetId: sId,
          matchedCurrentTitle: curTitle,
          isNew: false,
          needsRename: curTitle.toLowerCase().trim() !== desiredTitles[idx].toLowerCase().trim(),
        };
      });
    }
  }

  // Pass 8: Any remaining unmatched decks are genuinely new decks
  decks.forEach((deck, idx) => {
    if (deckPlans[idx] === null) {
      deckPlans[idx] = {
        deck,
        desiredTitle: desiredTitles[idx],
        isNew: true,
        needsRename: false,
      };
    }
  });

  const finalDeckPlans = deckPlans as DeckPlan[];

  // 6. Build batchUpdate requests: Renames first, then Additions
  const batchRequests: any[] = [];
  const renamesList = finalDeckPlans.filter(p => !p.isNew && p.needsRename && p.matchedSheetId !== undefined);
  renamesList.forEach(plan => {
    batchRequests.push({
      updateSheetProperties: {
        properties: {
          sheetId: plan.matchedSheetId,
          title: plan.desiredTitle,
        },
        fields: 'title',
      },
    });
  });

  const newPlans = finalDeckPlans.filter(p => p.isNew);
  newPlans.forEach(plan => {
    batchRequests.push({
      addSheet: {
        properties: {
          title: plan.desiredTitle,
          gridProperties: {
            frozenRowCount: 1,
          },
        },
      },
    });
  });

  // 7. Execute batchUpdate if requests exist
  if (batchRequests.length > 0) {
    const batchRes = await safeGoogleFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}:batchUpdate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: batchRequests }),
      },
      accessToken
    );

    if (!batchRes.ok) {
      const errText = await batchRes.text();
      console.warn('Batch update sheets notice:', errText);
    } else {
      const batchData = await batchRes.json();
      const replies = batchData.replies || [];
      // Map replies for addSheet to newPlans
      let addReplyIndex = renamesList.length; // after renames
      newPlans.forEach(plan => {
        const rep = replies[addReplyIndex];
        const newSheetId = rep?.addSheet?.properties?.sheetId;
        if (newSheetId !== undefined) {
          plan.matchedSheetId = newSheetId;
          plan.matchedCurrentTitle = plan.desiredTitle;
        }
        addReplyIndex++;
      });
    }
  }

  // 8. Merge local items with remote rows from Google Sheets
  const mergedDecks: VocabSet[] = [];
  let totalNewRemoteWordsPreserved = 0;

  const valueData = finalDeckPlans.map(plan => {
    const tabTitle = plan.desiredTitle;
    let remoteRawRows: string[][] = [];

    if (plan.matchedSheetId !== undefined && existingRemoteRowsBySheetId.has(plan.matchedSheetId)) {
      remoteRawRows = existingRemoteRowsBySheetId.get(plan.matchedSheetId) || [];
    } else if (plan.matchedCurrentTitle && existingRemoteRowsByTitle.has(plan.matchedCurrentTitle.toLowerCase().trim())) {
      remoteRawRows = existingRemoteRowsByTitle.get(plan.matchedCurrentTitle.toLowerCase().trim()) || [];
    }

    const remoteItems = remoteRawRows.length > 0 ? parseGoogleSheetRows(remoteRawRows) : [];
    const localItems = [...(plan.deck.items || [])];
    const localWordKeys = new Set(localItems.map(item => (item.word || '').trim().toLowerCase()));

    const remoteOnlyItems: VocabItem[] = [];
    remoteItems.forEach(rItem => {
      const w = (rItem.word || '').trim().toLowerCase();
      if (w && !localWordKeys.has(w)) {
        remoteOnlyItems.push(rItem);
        localWordKeys.add(w);
        totalNewRemoteWordsPreserved++;
      }
    });

    const combinedItems = [...localItems, ...remoteOnlyItems];
    const mergedDeck: VocabSet = {
      ...plan.deck,
      name: tabTitle,
      googleSheetTabId: plan.matchedSheetId,
      lastSyncedTabName: tabTitle,
      items: combinedItems,
    };
    mergedDecks.push(mergedDeck);

    const dataRows = combinedItems.map(item => vocabItemToSheetRow(item));
    return {
      range: `'${tabTitle}'!A1:Q`,
      majorDimension: 'ROWS',
      values: [SHEET_HEADERS_17, ...dataRows],
      dataRowsCount: dataRows.length,
      remoteRowsCount: remoteRawRows.length,
      tabTitle,
    };
  });

  // 9. Write the merged data to Google Sheets
  const writeRes = await safeGoogleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: valueData.map(v => ({
          range: v.range,
          majorDimension: v.majorDimension,
          values: v.values,
        })),
      }),
    },
    accessToken
  );

  if (!writeRes.ok) {
    const errText = await writeRes.text();
    throw new Error(`فشل تحديث بيانات الجداول: ${writeRes.statusText} (${errText})`);
  }

  // 10. Only clear trailing rows if old sheet had more rows than the newly written dataset
  try {
    const trailingClearRanges: string[] = [];
    valueData.forEach(v => {
      if (v.remoteRowsCount > v.dataRowsCount + 1) {
        const startRow = v.dataRowsCount + 2;
        const endRow = Math.max(v.remoteRowsCount + 5, startRow + 50);
        trailingClearRanges.push(`'${v.tabTitle}'!A${startRow}:Q${endRow}`);
      }
    });

    if (trailingClearRanges.length > 0) {
      await safeGoogleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values:batchClear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ranges: trailingClearRanges }),
      }, accessToken);
    }
  } catch (clearErr) {
    console.warn('Clear trailing rows warning:', clearErr);
  }

  // 11. Update persistent mapping in localStorage
  const updatedMapping: Record<string, { sheetId: number; tabTitle: string }> = { ...savedMapping };
  mergedDecks.forEach(d => {
    if (d.googleSheetTabId !== undefined) {
      updatedMapping[d.id] = {
        sheetId: d.googleSheetTabId,
        tabTitle: d.name,
      };
    }
  });
  saveDeckTabMapping(cleanId, updatedMapping);

  const totalWords = mergedDecks.reduce((acc, d) => acc + (d.items?.length || 0), 0);
  const info: LinkedSpreadsheetInfo = {
    spreadsheetId: cleanId,
    spreadsheetTitle: metaData.properties?.title || 'Google Sheet',
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${cleanId}/edit`,
    lastSyncedAt: new Date().toISOString(),
    deckCount: mergedDecks.length,
    wordCount: totalWords,
    mergedDecks,
    newWordsFound: totalNewRemoteWordsPreserved,
  };

  saveLinkedSheet(info);
  return info;
}

/**
 * Import all decks and technical metadata from all tabs of a Google Spreadsheet.
 */
export async function importAllDecksFromGoogleSheets(
  spreadsheetId: string,
  accessToken: string
): Promise<{ title: string; decks: VocabSet[] }> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  if (!cleanId) {
    throw new Error('يرجى تحديد معرف أو رابط Google Sheet صالح.');
  }

  // 1. Fetch metadata to discover tabs
  const metaRes = await safeGoogleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?fields=properties.title,sheets.properties`,
    { method: 'GET' },
    accessToken
  );

  if (!metaRes.ok) {
    if (metaRes.status === 404) throw new Error('لم يتم العثور على Google Sheet.');
    if (metaRes.status === 403) throw new Error('ليس لديك صلاحية لقراءة هذا الشيت.');
    throw new Error(`فشل جلب تفاصيل الشيت (${metaRes.statusText})`);
  }

  const metaData = await metaRes.json();
  const docTitle = metaData.properties?.title || 'Google Sheet';
  const sheets = metaData.sheets || [];

  if (sheets.length === 0) {
    throw new Error('هذا الملف لا يحتوي على أي تبويبات.');
  }

  // 2. Batch get values from all tabs
  const rangesQuery = sheets
    .map((s: any) => `ranges=${encodeURIComponent(`'${s.properties.title}'!A1:Q5000`)}`)
    .join('&');

  const batchRes = await safeGoogleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values:batchGet?${rangesQuery}`,
    { method: 'GET' },
    accessToken
  );

  if (!batchRes.ok) {
    throw new Error(`فشل قراءة محتوى التبويبات (${batchRes.statusText})`);
  }

  const batchData = await batchRes.json();
  const valueRanges = batchData.valueRanges || [];

  const decks: VocabSet[] = [];
  const mapping: Record<string, { sheetId: number; tabTitle: string }> = {};

  sheets.forEach((s: any, idx: number) => {
    const tabTitle = s.properties?.title || `Deck ${idx + 1}`;
    const sheetId = s.properties?.sheetId ?? idx;
    const currentRange = valueRanges[idx];
    const rawRows: string[][] = currentRange?.values || [];

    // Parse with 17-column & backwards compatibility
    const items = parseGoogleSheetRows(rawRows);

    // Infer group from tab title or items
    let levelGroup = 'General';
    const lowerTitle = tabTitle.toLowerCase();
    if (lowerTitle.includes('a1')) levelGroup = 'A1';
    else if (lowerTitle.includes('a2')) levelGroup = 'A2';
    else if (lowerTitle.includes('b1')) levelGroup = 'B1';
    else if (lowerTitle.includes('b2')) levelGroup = 'B2';
    else if (lowerTitle.includes('c1')) levelGroup = 'C1';
    else if (items.length > 0) {
      const itemLvl = items.find(i => i.level && ['A1', 'A2', 'B1', 'B2', 'C1'].includes(i.level))?.level;
      if (itemLvl) levelGroup = itemLvl;
    }

    const deckId = `deck_gs_${sheetId}_${cleanId.substring(0, 6)}`;
    mapping[deckId] = { sheetId, tabTitle };

    decks.push({
      id: deckId,
      name: tabTitle,
      levelGroup,
      createdAt: new Date().toISOString(),
      items,
      googleSheetTabId: sheetId,
      lastSyncedTabName: tabTitle,
    });
  });

  saveDeckTabMapping(cleanId, mapping);

  const totalWords = decks.reduce((acc, d) => acc + (d.items?.length || 0), 0);
  saveLinkedSheet({
    spreadsheetId: cleanId,
    spreadsheetTitle: docTitle,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${cleanId}/edit`,
    lastSyncedAt: new Date().toISOString(),
    deckCount: decks.length,
    wordCount: totalWords,
    mergedDecks: decks,
  });

  return { title: docTitle, decks };
}

/**
 * Fetch rows from a single Google Sheet tab
 */
export async function fetchSpreadsheetRows(
  spreadsheetId: string,
  accessToken: string
): Promise<{ title: string; spreadsheetId: string; rows: string[][] }> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  if (!cleanId) {
    throw new Error('يرجى إدخال رابط أو معرف Google Sheet صحيح.');
  }

  const metaRes = await safeGoogleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?fields=properties.title,sheets.properties`,
    { method: 'GET' },
    accessToken
  );

  if (!metaRes.ok) {
    if (metaRes.status === 404) throw new Error('لم يتم العثور على Google Sheet.');
    if (metaRes.status === 403) throw new Error('ليس لديك صلاحية للوصول إلى هذا الشيت.');
    throw new Error(`فشل جلب بيانات الشيت (${metaRes.statusText})`);
  }

  const metaData = await metaRes.json();
  const docTitle = metaData.properties?.title || 'Google Sheet';
  const sheets = metaData.sheets || [];
  if (sheets.length === 0) {
    throw new Error('الملف لا يحتوي على أوراق عمل.');
  }

  const firstSheetTitle = sheets[0].properties?.title || 'Sheet1';
  const range = encodeURIComponent(`'${firstSheetTitle}'!A1:Q5000`);

  const valuesRes = await safeGoogleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${range}`,
    { method: 'GET' },
    accessToken
  );

  if (!valuesRes.ok) {
    throw new Error(`فشل قراءة محتوى الشيت (${valuesRes.statusText})`);
  }

  const valuesData = await valuesRes.json();
  return {
    title: docTitle,
    spreadsheetId: cleanId,
    rows: valuesData.values || [],
  };
}
