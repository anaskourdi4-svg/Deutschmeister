import { useState, useEffect, useRef, useCallback } from 'react';
import { User } from 'firebase/auth';
import { VocabSet } from '../types';
import {
  initGoogleAuth,
  googleSignIn,
  googleLogout,
  getStoredAccessToken,
  getSavedLinkedSheet,
  saveLinkedSheet,
  syncAllDecksToGoogleSheets,
  importAllDecksFromGoogleSheets,
  LinkedSpreadsheetInfo,
  broadcastAutoSyncStatus,
  AutoSyncStatusEvent,
  computeVocabSetsSnapshot,
  mergeRemoteDecksWithLocalDecks,
} from '../services/googleSheets';

export type AutoSyncStatus =
  | 'idle'
  | 'pending'
  | 'syncing'
  | 'synced'
  | 'error'
  | 'unlinked'
  | 'unauthenticated';

interface UseAutoSyncProps {
  vocabSets: VocabSet[];
  onSyncAllSets: (sets: VocabSet[]) => void;
}

export function useAutoSync({ vocabSets, onSyncAllSets }: UseAutoSyncProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(getStoredAccessToken());
  const [linkedSheet, setLinkedSheet] = useState<LinkedSpreadsheetInfo | null>(getSavedLinkedSheet());
  const [syncStatus, setSyncStatus] = useState<AutoSyncStatus>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(
    linkedSheet?.lastSyncedAt || null
  );

  // Flags to prevent echo loops and unnecessary writes
  const isRemoteUpdatingRef = useRef<boolean>(false);
  const isInitialMountRef = useRef<boolean>(true);
  const hasDoneInitialPullRef = useRef<boolean>(false);
  const isSyncInProgressRef = useRef<boolean>(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestVocabSetsRef = useRef<VocabSet[]>(vocabSets);
  latestVocabSetsRef.current = vocabSets;

  // Snapshot tracking: only push when vocabulary actually changes locally
  const lastPushedSnapshotRef = useRef<string>(computeVocabSetsSnapshot(vocabSets));

  // Helper to update and broadcast status
  const updateStatus = useCallback((status: AutoSyncStatus, message?: string) => {
    setSyncStatus(status);
    if (message !== undefined) setStatusMessage(message);
    broadcastAutoSyncStatus({
      status,
      message,
      lastSyncedAt: lastSyncedAt || undefined,
    });
  }, [lastSyncedAt]);

  // Core function: Push current state to Google Sheets immediately
  const executePushNow = useCallback(async (customMessage?: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const activeSets = latestVocabSetsRef.current;
    const activeToken = getStoredAccessToken();
    const activeLinked = getSavedLinkedSheet();

    if (!activeToken || !activeLinked) return;
    if (isSyncInProgressRef.current) return;

    isSyncInProgressRef.current = true;
    try {
      updateStatus('syncing', customMessage || 'جارٍ الحفظ التلقائي في Google Sheets...');
      const updatedInfo = await syncAllDecksToGoogleSheets(
        activeLinked.spreadsheetId,
        activeSets,
        activeToken
      );

      if (updatedInfo.mergedDecks) {
        isRemoteUpdatingRef.current = true;
        lastPushedSnapshotRef.current = computeVocabSetsSnapshot(updatedInfo.mergedDecks);
        onSyncAllSets(updatedInfo.mergedDecks);
      } else {
        lastPushedSnapshotRef.current = computeVocabSetsSnapshot(activeSets);
      }

      setLinkedSheet(updatedInfo);
      setLastSyncedAt(updatedInfo.lastSyncedAt);
      updateStatus('synced', `تم الحفظ التلقائي: ${new Date().toLocaleTimeString()}`);
    } catch (err: any) {
      console.warn('Auto-sync push notice:', err);
      updateStatus('error', err.message || 'فشلت المزامنة التلقائية، سيتم إعادة المحاولة لاحقاً');
    } finally {
      isSyncInProgressRef.current = false;
    }
  }, [onSyncAllSets, updateStatus]);

  // Core function: Pull remote updates and merge
  const executePullNow = useCallback(async (isInitial = false) => {
    const token = getStoredAccessToken();
    const sheet = getSavedLinkedSheet();
    if (!token || !sheet) return;
    if (isSyncInProgressRef.current) return;

    isSyncInProgressRef.current = true;
    try {
      const msg = isInitial
        ? 'بدء التطبيق: فحص التحديثات في Google Sheets...'
        : 'فحص التحديثات في Google Sheets...';
      updateStatus('syncing', msg);

      const result = await importAllDecksFromGoogleSheets(sheet.spreadsheetId, token);
      if (result.decks && result.decks.length > 0) {
        const merge = mergeRemoteDecksWithLocalDecks(latestVocabSetsRef.current, result.decks);
        if (merge.hasChanges) {
          isRemoteUpdatingRef.current = true;
          lastPushedSnapshotRef.current = computeVocabSetsSnapshot(merge.mergedSets);
          onSyncAllSets(merge.mergedSets);
          setLastSyncedAt(new Date().toISOString());
          const successMsg = merge.newWordsCount > 0
            ? `تم العثور على ${merge.newWordsCount} مفردة جديدة في Google Sheets وإضافتها بنجاح`
            : 'تم تحديث المفردات من Google Sheets بنجاح';
          updateStatus('synced', successMsg);
        } else {
          updateStatus('synced', 'المزامنة التلقائية نشطة (متطابق)');
        }
      }
    } catch (e: any) {
      console.warn('Auto-sync pull notice:', e);
      updateStatus('synced', 'المزامنة التلقائية نشطة');
    } finally {
      isSyncInProgressRef.current = false;
    }
  }, [onSyncAllSets, updateStatus]);

  // 1. Initialize Google Auth listener & trigger initial pull on app open
  useEffect(() => {
    const unsub = initGoogleAuth(
      (user, token) => {
        setCurrentUser(user);
        setAccessToken(token);
        const saved = getSavedLinkedSheet();
        setLinkedSheet(saved);
        if (!saved) {
          updateStatus('unlinked', 'لم يتم ربط جدول بعد');
        } else {
          updateStatus('synced', 'المزامنة التلقائية مفعلة ونشطة');
          // 1. Automatic pull when opening the app!
          if (!hasDoneInitialPullRef.current) {
            hasDoneInitialPullRef.current = true;
            setTimeout(() => {
              executePullNow(true);
            }, 600);
          }
        }
      },
      () => {
        setCurrentUser(null);
        setAccessToken(null);
        updateStatus('unauthenticated', 'يرجى تسجيل الدخول لتفعيل المزامنة التلقائية');
      }
    );
    return () => unsub();
  }, [executePullNow, updateStatus]);

  // Listen to external broadcast events (e.g. from DecksManager or manual push/pull)
  useEffect(() => {
    const handleStatusEvent = (e: Event) => {
      const customEv = e as CustomEvent<AutoSyncStatusEvent>;
      if (customEv.detail) {
        if (customEv.detail.status) setSyncStatus(customEv.detail.status);
        if (customEv.detail.message) setStatusMessage(customEv.detail.message);
        if (customEv.detail.lastSyncedAt) setLastSyncedAt(customEv.detail.lastSyncedAt);
        // Refresh linked sheet state if updated
        setLinkedSheet(getSavedLinkedSheet());
      }
    };
    window.addEventListener('app:autosync-status', handleStatusEvent);
    return () => window.removeEventListener('app:autosync-status', handleStatusEvent);
  }, []);

  // 2A. Practice session completion immediate push
  useEffect(() => {
    const handleQuizCompleted = () => {
      executePushNow('اكتمال جلسة التدريب: جارٍ الحفظ التلقائي في Google Sheets...');
    };
    window.addEventListener('app:quiz-session-completed', handleQuizCompleted);
    return () => window.removeEventListener('app:quiz-session-completed', handleQuizCompleted);
  }, [executePushNow]);

  // 2B. Perform Debounced Auto-Push on vocabSets changes (decks or vocab edits)
  useEffect(() => {
    // Skip initial mount
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    // If change was initiated by a remote pull, update snapshot and skip pushing
    if (isRemoteUpdatingRef.current) {
      isRemoteUpdatingRef.current = false;
      lastPushedSnapshotRef.current = computeVocabSetsSnapshot(vocabSets);
      return;
    }

    // Guard: Only push if vocabSets actually changed content!
    const currentSnapshot = computeVocabSetsSnapshot(vocabSets);
    if (currentSnapshot === lastPushedSnapshotRef.current) {
      return;
    }

    const currentSheet = getSavedLinkedSheet();
    const token = getStoredAccessToken();

    if (!currentSheet) {
      updateStatus('unlinked', 'لم يتم ربط جدول Google Sheets');
      return;
    }

    if (!token) {
      updateStatus('unauthenticated', 'يلزم تسجيل الدخول بـ Google للمزامنة التلقائية');
      return;
    }

    // Set pending status
    updateStatus('pending', 'جارٍ التحضير للمزامنة التلقائية...');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 1.5 seconds debounce for responsive saving of word / deck changes
    debounceTimerRef.current = setTimeout(() => {
      executePushNow();
    }, 1500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [vocabSets, executePushNow, updateStatus]);

  // 3. Periodic background sync every 3 minutes
  useEffect(() => {
    const PERIODIC_SYNC_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes
    const intervalId = setInterval(() => {
      const token = getStoredAccessToken();
      const sheet = getSavedLinkedSheet();
      if (token && sheet && !isSyncInProgressRef.current) {
        executePullNow(false);
      }
    }, PERIODIC_SYNC_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [executePullNow]);

  // 4. Tab Visibility & Focus Handler (Auto-pull when switching back to tab)
  useEffect(() => {
    let lastCheckTime = 0;

    const handleFocusCheck = () => {
      const now = Date.now();
      if (now - lastCheckTime < 5000) return;
      lastCheckTime = now;
      executePullNow(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleFocusCheck();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocusCheck);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocusCheck);
    };
  }, [executePullNow]);

  // Manual Push trigger
  const triggerManualPush = async (): Promise<boolean> => {
    const token = getStoredAccessToken();
    const sheet = getSavedLinkedSheet();
    if (!token || !sheet) return false;

    updateStatus('syncing', 'جارٍ رفع كافة البيانات إلى Google Sheets...');
    try {
      const updated = await syncAllDecksToGoogleSheets(
        sheet.spreadsheetId,
        latestVocabSetsRef.current,
        token
      );
      if (updated.mergedDecks) {
        isRemoteUpdatingRef.current = true;
        lastPushedSnapshotRef.current = computeVocabSetsSnapshot(updated.mergedDecks);
        onSyncAllSets(updated.mergedDecks);
      } else {
        lastPushedSnapshotRef.current = computeVocabSetsSnapshot(latestVocabSetsRef.current);
      }
      setLinkedSheet(updated);
      setLastSyncedAt(updated.lastSyncedAt);
      updateStatus('synced', `تم الرفع بنجاح في ${new Date().toLocaleTimeString()}`);
      return true;
    } catch (err: any) {
      updateStatus('error', err.message || 'فشل رفع البيانات');
      throw err;
    }
  };

  // Manual Pull trigger
  const triggerManualPull = async (): Promise<VocabSet[] | null> => {
    const token = getStoredAccessToken();
    const sheet = getSavedLinkedSheet();
    if (!token || !sheet) return null;

    updateStatus('syncing', 'جارٍ جلب البيانات من Google Sheets...');
    try {
      const result = await importAllDecksFromGoogleSheets(sheet.spreadsheetId, token);
      if (result.decks && result.decks.length > 0) {
        const merge = mergeRemoteDecksWithLocalDecks(latestVocabSetsRef.current, result.decks);
        isRemoteUpdatingRef.current = true;
        lastPushedSnapshotRef.current = computeVocabSetsSnapshot(merge.mergedSets);
        onSyncAllSets(merge.mergedSets);
        setLastSyncedAt(new Date().toISOString());
        updateStatus('synced', `تم جلب البيانات بنجاح (${merge.newWordsCount} مفردة جديدة)`);
        return merge.mergedSets;
      }
      return null;
    } catch (err: any) {
      updateStatus('error', err.message || 'فشل جلب البيانات');
      throw err;
    }
  };

  // Quick Login
  const handleQuickLogin = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setAccessToken(res.accessToken);
        const sheet = getSavedLinkedSheet();
        if (sheet) {
          updateStatus('synced', 'تم تسجيل الدخول وتفعيل المزامنة التلقائية');
        } else {
          updateStatus('unlinked', 'يرجى ربط أو إنشاء جدول في Database');
        }
      }
    } catch (e: any) {
      if (
        e?.code === 'auth/popup-closed-by-user' ||
        e?.code === 'auth/cancelled-popup-request' ||
        e?.message?.includes('popup-closed-by-user')
      ) {
        return;
      }
      updateStatus('error', e.message || 'فشل تسجيل الدخول');
    }
  };

  return {
    currentUser,
    accessToken,
    linkedSheet,
    syncStatus,
    statusMessage,
    lastSyncedAt,
    triggerManualPush,
    triggerManualPull,
    handleQuickLogin,
    handleLogout: googleLogout,
  };
}
