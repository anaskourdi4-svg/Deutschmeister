import React, { useState, useEffect, useMemo } from 'react';
import { VocabSet } from '../types';
import {
  FolderKanban,
  Check,
  Plus,
  Trash2,
  Edit3,
  X,
  FileText,
  Search,
  Upload,
  Download,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Info,
  CheckCircle2,
  Layers,
  AlertCircle,
  MoreVertical,
  FolderInput,
  ArrowRightLeft,
  Eraser,
  Cloud,
  CloudOff,
  RefreshCw,
  ExternalLink,
  FileSpreadsheet,
  CheckCheck,
  Globe,
  Database,
  Link,
  Unlink,
  Sparkles,
} from 'lucide-react';
import {
  initGoogleAuth,
  googleSignIn,
  googleLogout,
  listUserSpreadsheets,
  createSpreadsheetWithDecks,
  syncAllDecksToGoogleSheets,
  importAllDecksFromGoogleSheets,
  getSavedLinkedSheet,
  saveLinkedSheet,
  LinkedSpreadsheetInfo,
  DriveSpreadsheetFile,
  extractSpreadsheetId,
  mergeRemoteDecksWithLocalDecks,
} from '../services/googleSheets';
import { User } from 'firebase/auth';

interface DecksManagerProps {
  vocabSets: VocabSet[];
  activeSetId: string;
  onSelectVocabSet: (id: string) => void;
  onCreateVocabSet: (name: string, levelGroup?: string) => void;
  onRenameVocabSet: (id: string, newName: string) => void;
  onMoveVocabSet?: (id: string, targetGroup: string) => void;
  onDeleteVocabSet: (id: string) => void;
  onTransferDeckItems?: (sourceSetId: string, targetSetId: string) => void;
  onClearDeckItems?: (setId: string) => void;
  onBatchImportSets?: (sets: VocabSet[], targetGroup?: string) => void;
  onExportAllSets?: () => void;
  onSyncAllSets?: (sets: VocabSet[]) => void;
  autoSyncStatus?: {
    status: 'idle' | 'pending' | 'syncing' | 'synced' | 'error' | 'unlinked' | 'unauthenticated' | string;
    message?: string;
    lastSyncedAt?: string | null;
  };
}

const GROUPS_LIST = [
  { id: 'A1', name: 'A1 German', color: 'emerald', badgeClass: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800' },
  { id: 'A2', name: 'A2 German', color: 'sky', badgeClass: 'bg-sky-100 text-sky-900 dark:bg-sky-950/80 dark:text-sky-200 border-sky-300 dark:border-sky-800' },
  { id: 'B1', name: 'B1 German', color: 'purple', badgeClass: 'bg-purple-100 text-purple-900 dark:bg-purple-950/80 dark:text-purple-200 border-purple-300 dark:border-purple-800' },
  { id: 'B2', name: 'B2 German', color: 'amber', badgeClass: 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border-amber-300 dark:border-amber-800' },
  { id: 'C1', name: 'C1 German', color: 'rose', badgeClass: 'bg-rose-100 text-rose-900 dark:bg-rose-950/80 dark:text-rose-200 border-rose-300 dark:border-rose-800' },
  { id: 'General', name: 'General & Custom', color: 'slate', badgeClass: 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700' },
];

const DECKS_PER_PAGE = 12;

export const DecksManager: React.FC<DecksManagerProps> = ({
  vocabSets,
  activeSetId,
  onSelectVocabSet,
  onCreateVocabSet,
  onRenameVocabSet,
  onMoveVocabSet,
  onDeleteVocabSet,
  onTransferDeckItems,
  onClearDeckItems,
  onBatchImportSets,
  onExportAllSets,
  onSyncAllSets,
  autoSyncStatus,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [deckSubPage, setDeckSubPage] = useState(1);

  const [newSetName, setNewSetName] = useState('');
  const [newSetGroup, setNewSetGroup] = useState('A1');
  const [isCreating, setIsCreating] = useState(false);

  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deletingSetId, setDeletingSetId] = useState<string | null>(null);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showExportGroupModal, setShowExportGroupModal] = useState(false);

  // 3-dots dropdown menu state & Move deck state
  const [openMenuSetId, setOpenMenuSetId] = useState<string | null>(null);
  const [movingDeck, setMovingDeck] = useState<VocabSet | null>(null);
  const [targetMoveGroup, setTargetMoveGroup] = useState<string>('A1');

  // Transfer Deck Items state
  const [transferringDeck, setTransferringDeck] = useState<VocabSet | null>(null);
  const [targetTransferSetId, setTargetTransferSetId] = useState<string>('');
  const [targetGroupFilter, setTargetGroupFilter] = useState<string>('all');
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);

  // Clear Deck Items state
  const [clearingDeck, setClearingDeck] = useState<VocabSet | null>(null);

  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [showInfoHeader, setShowInfoHeader] = useState(false);
  const [stagedSetId, setStagedSetId] = useState<string>(activeSetId);

  // Google Sheets Cloud Sync State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentAccessToken, setCurrentAccessToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [linkedSheet, setLinkedSheet] = useState<LinkedSpreadsheetInfo | null>(getSavedLinkedSheet);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [driveFiles, setDriveFiles] = useState<DriveSpreadsheetFile[]>([]);
  const [isLoadingDriveFiles, setIsLoadingDriveFiles] = useState(false);
  const [manualSheetInput, setManualSheetInput] = useState('');
  const [newSheetTitle, setNewSheetTitle] = useState('DeutschMeister - German Vocabulary & Mastery');
  const [syncModalTab, setSyncModalTab] = useState<'status' | 'create' | 'link'>('status');

  // Confirmation Modals for Destructive/Mutating Operations
  const [confirmPushModalOpen, setConfirmPushModalOpen] = useState(false);
  const [confirmPullModalOpen, setConfirmPullModalOpen] = useState(false);
  const [pendingPullData, setPendingPullData] = useState<{ title: string; decks: VocabSet[] } | null>(null);

  // Listen for Google Auth changes
  useEffect(() => {
    const unsub = initGoogleAuth(
      (user, token) => {
        setCurrentUser(user);
        setCurrentAccessToken(token);
      },
      () => {
        setCurrentUser(null);
        setCurrentAccessToken(null);
      }
    );
    return () => unsub();
  }, []);

  const loadDriveFiles = async (token: string) => {
    setIsLoadingDriveFiles(true);
    try {
      const files = await listUserSpreadsheets(token);
      setDriveFiles(files);
    } catch (e: any) {
      console.warn('Failed to list Google Drive spreadsheets:', e);
    } finally {
      setIsLoadingDriveFiles(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsAuthLoading(true);
    setSyncFeedback(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setCurrentAccessToken(res.accessToken);
        loadDriveFiles(res.accessToken);
      }
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request' ||
        err?.message?.includes('popup-closed-by-user')
      ) {
        return;
      }
      console.warn('Google Sign-In notice:', err);
      setSyncFeedback({ type: 'error', message: err.message || 'فشل تسجيل الدخول باستخدام حساب Google' });
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleGoogleLogout = async () => {
    await googleLogout();
    setCurrentUser(null);
    setCurrentAccessToken(null);
    setDriveFiles([]);
  };

  // Create brand new master spreadsheet in Google Drive
  const handleCreateNewMasterSheet = async () => {
    if (!currentAccessToken) {
      handleGoogleLogin();
      return;
    }
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const info = await createSpreadsheetWithDecks(
        newSheetTitle || 'DeutschMeister - German Vocabulary & Mastery',
        vocabSets,
        currentAccessToken
      );
      setLinkedSheet(info);
      setSyncFeedback({
        type: 'success',
        message: `تم إنشاء جدول Google Sheet بنجاح في درايف مع ${info.deckCount} تبويب (${info.wordCount} مفردة مع كافة البيانات التقنية)!`
      });
      setSyncModalTab('status');
    } catch (err: any) {
      console.warn('Create sheet notice:', err);
      setSyncFeedback({ type: 'error', message: err.message || 'فشل إنشاء الجدول في Google Drive.' });
    } finally {
      setIsSyncing(false);
    }
  };

  // Link existing spreadsheet
  const handleLinkExistingSheet = async (targetIdOrUrl: string) => {
    if (!currentAccessToken) {
      handleGoogleLogin();
      return;
    }
    const cleanId = extractSpreadsheetId(targetIdOrUrl);
    if (!cleanId) {
      setSyncFeedback({ type: 'error', message: 'يرجى إدخال رابط أو معرف Google Sheet صحيح.' });
      return;
    }
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const result = await importAllDecksFromGoogleSheets(cleanId, currentAccessToken);
      const totalWords = result.decks.reduce((acc, d) => acc + (d.items?.length || 0), 0);
      const info: LinkedSpreadsheetInfo = {
        spreadsheetId: cleanId,
        spreadsheetTitle: result.title,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${cleanId}/edit`,
        lastSyncedAt: new Date().toISOString(),
        deckCount: result.decks.length,
        wordCount: totalWords,
      };
      setLinkedSheet(info);
      saveLinkedSheet(info);
      setSyncFeedback({
        type: 'success',
        message: `تم ربط الجدول بنجاح: "${result.title}" (${result.decks.length} تبويب، ${totalWords} مفردة).`
      });
      setManualSheetInput('');
      setSyncModalTab('status');
    } catch (err: any) {
      console.warn('Link sheet notice:', err);
      setSyncFeedback({ type: 'error', message: err.message || 'فشل ربط الجدول. يرجى التأكد من صحة الرابط والصلاحيات.' });
    } finally {
      setIsSyncing(false);
    }
  };

  // Push all decks to Google Sheets
  const handleExecutePushToSheets = async () => {
    if (!linkedSheet || !currentAccessToken) return;
    setConfirmPushModalOpen(false);
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const updatedInfo = await syncAllDecksToGoogleSheets(
        linkedSheet.spreadsheetId,
        vocabSets,
        currentAccessToken
      );
      if (updatedInfo.mergedDecks) {
        onSyncAllSets?.(updatedInfo.mergedDecks);
      }
      setLinkedSheet(updatedInfo);
      setSyncFeedback({
        type: 'success',
        message: updatedInfo.newWordsFound && updatedInfo.newWordsFound > 0
          ? `تمت المزامنة بنجاح! تم حفظ المفردات واكتشاف ${updatedInfo.newWordsFound} مفردة جديدة من Google Sheets ودمجها.`
          : `تمت المزامنة بنجاح! تم تحديث ${updatedInfo.deckCount} تبويب (${updatedInfo.wordCount} مفردة) في Google Sheets.`
      });
    } catch (err: any) {
      console.warn('Push to sheets notice:', err);
      setSyncFeedback({ type: 'error', message: err.message || 'فشل تحديث الجدول في Google Sheets.' });
    } finally {
      setIsSyncing(false);
    }
  };

  // Pull all decks from Google Sheets
  const handleRequestPullFromSheets = async () => {
    if (!linkedSheet || !currentAccessToken) return;
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const result = await importAllDecksFromGoogleSheets(
        linkedSheet.spreadsheetId,
        currentAccessToken
      );
      setPendingPullData(result);
      setConfirmPullModalOpen(true);
    } catch (err: any) {
      console.warn('Pull from sheets notice:', err);
      setSyncFeedback({ type: 'error', message: err.message || 'فشل قراءة محتوى Google Sheets.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExecutePullConfirmed = () => {
    if (!pendingPullData || !pendingPullData.decks || pendingPullData.decks.length === 0) return;
    const merge = mergeRemoteDecksWithLocalDecks(vocabSets, pendingPullData.decks);
    onSyncAllSets?.(merge.mergedSets);
    const totalWords = merge.mergedSets.reduce((acc, d) => acc + (d.items?.length || 0), 0);
    setSyncFeedback({
      type: 'success',
      message: `تم جلب ودمج البيانات بنجاح: تم إضافة ${merge.newWordsCount} مفردة جديدة وتحديث ${merge.updatedWordsCount} مفردة (إجمالي ${totalWords} مفردة).`
    });
    setConfirmPullModalOpen(false);
    setPendingPullData(null);
  };

  const handleUnlinkSheet = () => {
    saveLinkedSheet(null);
    setLinkedSheet(null);
    setSyncFeedback({ type: 'success', message: 'تم إلغاء ربط الجدول.' });
  };

  useEffect(() => {
    setStagedSetId(activeSetId);
  }, [activeSetId]);

  // Click outside to close 3-dots menu
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuSetId(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const currentSet = vocabSets.find(s => s.id === activeSetId) || vocabSets[0];

  // Helper to calculate mastery percentage for a deck
  const calculateDeckMastery = (set: VocabSet): number => {
    if (!set.items || set.items.length === 0) return 0;
    const total = set.items.reduce((acc, item) => acc + (item.masteryScore ?? 0), 0);
    return Math.round(total / set.items.length);
  };

  // Map each deck to its group
  const getDeckGroup = (set: VocabSet): string => {
    if (set.levelGroup && GROUPS_LIST.some(g => g.id === set.levelGroup)) {
      return set.levelGroup;
    }
    const u = (set.name || '').toUpperCase();
    if (u.includes('A2')) return 'A2';
    if (u.includes('B1')) return 'B1';
    if (u.includes('B2')) return 'B2';
    if (u.includes('C1')) return 'C1';
    if (u.includes('A1')) return 'A1';
    if (set.items && set.items.length > 0) {
      const lvl = set.items.find(i => i.level && ['A1', 'A2', 'B1', 'B2', 'C1'].includes(i.level))?.level;
      if (lvl) return lvl;
    }
    return 'General';
  };

  // Filtered Decks based on Search
  const totalDatabaseWords = useMemo(() => {
    return vocabSets.reduce((acc, curr) => acc + (curr.items?.length || 0), 0);
  }, [vocabSets]);

  const matchingSearchDecks = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return vocabSets.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.description && s.description.toLowerCase().includes(q)) ||
      getDeckGroup(s).toLowerCase().includes(q)
    );
  }, [vocabSets, searchQuery]);

  // Grouped Decks Count & Word Stats for Main Group Screen
  const groupStats = useMemo(() => {
    const stats: Record<string, { deckCount: number; wordCount: number; totalMasterySum: number; decks: VocabSet[] }> = {};
    GROUPS_LIST.forEach(g => {
      stats[g.id] = { deckCount: 0, wordCount: 0, totalMasterySum: 0, decks: [] };
    });

    vocabSets.forEach(set => {
      const grp = getDeckGroup(set);
      if (!stats[grp]) {
        stats[grp] = { deckCount: 0, wordCount: 0, totalMasterySum: 0, decks: [] };
      }
      const deckWords = set.items ? set.items.length : 0;
      const deckMastery = calculateDeckMastery(set);
      
      stats[grp].deckCount += 1;
      stats[grp].wordCount += deckWords;
      stats[grp].totalMasterySum += (deckMastery * (deckWords || 1));
      stats[grp].decks.push(set);
    });

    return stats;
  }, [vocabSets]);

  // Current Group Decks (Sub-screen view)
  const groupDecks = useMemo(() => {
    if (!selectedGroup) return [];
    return (groupStats[selectedGroup]?.decks || []);
  }, [groupStats, selectedGroup]);

  // Sub-screen pagination
  const totalSubPages = Math.ceil(groupDecks.length / DECKS_PER_PAGE) || 1;
  const currentSubPageDecks = useMemo(() => {
    const safeP = Math.min(deckSubPage, totalSubPages);
    const start = (safeP - 1) * DECKS_PER_PAGE;
    return groupDecks.slice(start, start + DECKS_PER_PAGE);
  }, [groupDecks, deckSubPage, totalSubPages]);

  // Group stats calculation
  const currentGroupMeta = GROUPS_LIST.find(g => g.id === selectedGroup);
  const selectedGroupStat = selectedGroup ? groupStats[selectedGroup] : null;
  const groupTotalWords = selectedGroupStat?.wordCount || 0;
  const groupAverageMastery = selectedGroupStat && selectedGroupStat.wordCount > 0
    ? Math.round(selectedGroupStat.totalMasterySum / selectedGroupStat.wordCount)
    : 0;

  const DEFAULT_CEFR_GROUPS = ['A1', 'A2', 'B1', 'B2', 'C1', 'General'];
  const isCustomGroup = selectedGroup ? !DEFAULT_CEFR_GROUPS.includes(selectedGroup) : false;

  // Handlers
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetName.trim()) return;
    const targetGroup = selectedGroup || newSetGroup || 'A1';
    onCreateVocabSet(newSetName.trim(), targetGroup);
    setNewSetName('');
    setIsCreating(false);
  };

  const handleRenameSubmit = (id: string) => {
    if (!editingName.trim()) return;
    onRenameVocabSet(id, editingName.trim());
    setEditingSetId(null);
  };

  const handleExportSingleDeck = (set: VocabSet) => {
    const jsonStr = JSON.stringify(set, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deck_${set.name.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportGroupSets = () => {
    if (!selectedGroup) return;
    const groupDecksList = vocabSets.filter(s => getDeckGroup(s) === selectedGroup);
    if (groupDecksList.length === 0) return;
    const jsonStr = JSON.stringify(groupDecksList, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `German_Vocab_${selectedGroup}_Group_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        let importedSetsArray: VocabSet[] = [];

        if (Array.isArray(parsed)) {
          if (parsed.length > 0 && (parsed[0].word || parsed[0].german || parsed[0].term)) {
            // It's an array of raw vocab items!
            const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
            importedSetsArray = [{
              id: `deck_imported_${Date.now()}`,
              name: cleanName || 'Imported Vocabulary Deck',
              levelGroup: selectedGroup || 'General',
              createdAt: new Date().toISOString(),
              items: parsed,
            }];
          } else {
            importedSetsArray = parsed;
          }
        } else if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.vocabSets)) {
            importedSetsArray = parsed.vocabSets;
          } else if (Array.isArray(parsed.decks)) {
            importedSetsArray = parsed.decks;
          } else if (Array.isArray(parsed.sets)) {
            importedSetsArray = parsed.sets;
          } else if (parsed.items || parsed.words || parsed.vocabList) {
            importedSetsArray = [parsed];
          } else if (parsed.word || parsed.german) {
            const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
            importedSetsArray = [{
              id: `deck_imported_${Date.now()}`,
              name: cleanName || 'Imported Vocabulary Deck',
              levelGroup: selectedGroup || 'General',
              createdAt: new Date().toISOString(),
              items: [parsed],
            }];
          }
        }

        if (importedSetsArray.length > 0 && onBatchImportSets) {
          onBatchImportSets(importedSetsArray, selectedGroup || undefined);
          const totalWordsCount = importedSetsArray.reduce((acc, curr) => {
            const list = curr.items || (curr as any).words || (curr as any).vocabList || [];
            return acc + list.length;
          }, 0);
          setImportNotice(`Successfully imported ${importedSetsArray.length} deck(s) with ${totalWordsCount} words!`);
          setTimeout(() => setImportNotice(null), 5000);
        } else {
          alert('Invalid JSON structure. Ensure file contains deck objects or a word list.');
        }
      } catch (err) {
        alert('Failed to parse JSON file. Please check file format.');
      }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Title & Decks Badge + (i) button on opposite side */}
          <div className="flex items-center justify-between w-full lg:w-auto gap-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded-2xl shrink-0">
                <FolderKanban className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    Database
                  </h2>
                  
                  {/* Decks Badge */}
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                    {vocabSets.length} Decks
                  </span>

                  {/* Google Sheets Sync Pill Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSyncModalOpen(true);
                      if (currentAccessToken && driveFiles.length === 0) {
                        loadDriveFiles(currentAccessToken);
                      }
                    }}
                    className={`text-xs font-black px-3 py-1 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                      linkedSheet
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                        : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:border-emerald-400 hover:text-emerald-700'
                    }`}
                    title="Google Sheets Cloud Sync"
                  >
                    <FileSpreadsheet className={`w-3.5 h-3.5 ${linkedSheet ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                    <span>{linkedSheet ? 'Sheets Synced' : 'Google Sheets Sync'}</span>
                    <span className={`w-2 h-2 rounded-full ${linkedSheet ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Info (i) icon on the opposite far right side */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowInfoHeader(prev => !prev)}
                className={`p-1.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                  showInfoHeader
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
                title="Vocabulary Database Information"
              >
                <Info className="w-4 h-4 text-blue-500 shrink-0" />
              </button>

              {showInfoHeader && (
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 max-w-[calc(100vw-2.5rem)] p-4 bg-slate-900 text-white dark:bg-slate-800 rounded-2xl shadow-2xl text-xs z-50 space-y-2 animate-fade-in border border-slate-700 origin-top-right">
                  <div className="font-black text-blue-300 flex items-center gap-1.5 border-b border-slate-700 pb-1.5">
                    <Info className="w-4 h-4 text-blue-400" />
                    <span>Database Features & Backup Info</span>
                  </div>
                  <p className="font-medium text-slate-300 leading-relaxed">
                    Organized by level groups (A1, A2, B1, etc.). Select any deck to practice instantly or create custom collections.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Following: Active Practice Deck Indicator Box */}
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 dark:from-blue-950/60 dark:via-indigo-950/50 dark:to-blue-950/60 border border-blue-200 dark:border-blue-800/80 px-3.5 py-2 rounded-2xl flex items-center justify-between gap-3 shadow-2xs min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 bg-blue-600 text-white rounded-lg shrink-0">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] font-extrabold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                  Active Practice Deck:
                </div>
                <div className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[140px] sm:max-w-[180px]">
                  {currentSet?.name || 'Default Deck'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-extrabold bg-blue-600 text-white px-2 py-0.5 rounded-lg">
                {currentSet?.items?.length || 0} words
              </span>
              <span className="text-[11px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-lg border border-emerald-300 dark:border-emerald-800">
                {calculateDeckMastery(currentSet)}%
              </span>
            </div>
          </div>

        </div>

        {/* Divider line before Search Bar */}
        <div className="border-t border-slate-100 dark:border-slate-800 my-3.5" />

        {/* Search Input Box Only */}
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setDeckSubPage(1);
            }}
            placeholder="Search any deck name..."
            className="w-full pl-9 pr-8 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Import Notification Banner */}
        {importNotice && (
          <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{importNotice}</span>
          </div>
        )}

      </div>

      {/* Google Sheets Cloud Database Sync Banner */}
      {linkedSheet ? (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-950/40 border border-emerald-200/90 dark:border-emerald-800/80 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="p-3 bg-emerald-600 text-white rounded-2xl shrink-0 shadow-xs relative">
              <FileSpreadsheet className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-white dark:border-slate-900 rounded-full animate-pulse" />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                  {linkedSheet.spreadsheetTitle}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>المزامنة التلقائية مفعلة دائماً</span>
                </span>
                <a
                  href={linkedSheet.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <span>Open in Sheets</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium flex items-center gap-2 flex-wrap">
                <span>يتم حفظ تقدمك وتعديلات المفردات تلقائياً في السحابة فوراً.</span>
                {autoSyncStatus && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    autoSyncStatus.status === 'syncing'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 animate-pulse'
                      : autoSyncStatus.status === 'pending'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : autoSyncStatus.status === 'synced'
                      ? 'bg-emerald-100/70 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {autoSyncStatus.status === 'syncing'
                      ? '🔄 جارٍ الحفظ التلقائي...'
                      : autoSyncStatus.status === 'pending'
                      ? '⏳ تعديلات قيد الحفظ...'
                      : autoSyncStatus.status === 'synced'
                      ? `✓ آخر مزامنة: ${autoSyncStatus.lastSyncedAt ? new Date(autoSyncStatus.lastSyncedAt).toLocaleTimeString() : 'الآن'}`
                      : 'متزامن'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap shrink-0">
            <button
              type="button"
              disabled={isSyncing}
              onClick={() => {
                if (!currentAccessToken) {
                  handleGoogleLogin();
                } else {
                  setConfirmPushModalOpen(true);
                }
              }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="رفع يدوي مباشر لكافة الحزم ونسب الإتقان إلى Google Sheets"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>رفع يدوي (Push)</span>
            </button>

            <button
              type="button"
              disabled={isSyncing}
              onClick={() => {
                if (!currentAccessToken) {
                  handleGoogleLogin();
                } else {
                  handleRequestPullFromSheets();
                }
              }}
              className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="جلب يدوي لأحدث البيانات ونسب الإتقان من Google Sheets"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>جلب يدوي (Pull)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSyncModalOpen(true)}
              className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              title="إعدادات مزامنة Google Sheets"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-blue-950/40 border border-blue-200/90 dark:border-blue-800/80 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shrink-0 shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  المزامنة التلقائية مع Google Sheets
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                  Cloud Database
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                اربط جدولك أو أنشئ جدولاً جديداً في Google Drive ليتم حفظ تقدمك ومفرداتك تلقائياً وبشكل دائم في السحابة.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsSyncModalOpen(true);
              if (currentAccessToken && driveFiles.length === 0) {
                loadDriveFiles(currentAccessToken);
              }
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>ربط وتفعيل المزامنة التلقائية</span>
          </button>
        </div>
      )}

      {/* Move Deck Modal */}
      {movingDeck && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-2xl shrink-0">
                  <FolderInput className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">نقل الـ Deck إلى مجموعة أخرى</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Move Deck to another Group</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMovingDeck(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] uppercase font-extrabold text-slate-400 block">Deck Name</span>
                <span className="text-xs font-black text-slate-800 dark:text-slate-100 truncate block">{movingDeck.name}</span>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] uppercase font-extrabold text-slate-400 block">Current Group</span>
                <span className="text-xs font-black text-purple-600 dark:text-purple-400">{getDeckGroup(movingDeck)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 block">
                اختر المجموعة الهدف (Target Group):
              </label>
              <div className="grid grid-cols-2 gap-2">
                {GROUPS_LIST.map(g => {
                  const isCurrent = getDeckGroup(movingDeck) === g.id;
                  const isSelected = targetMoveGroup === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setTargetMoveGroup(g.id)}
                      className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/60 ring-2 ring-purple-500/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-purple-300 bg-white dark:bg-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${g.badgeClass}`}>
                          {g.id}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] text-slate-400 font-bold">(Current)</span>
                        )}
                      </div>
                      <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                        {g.name}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setMovingDeck(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                إلغاء (Cancel)
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onMoveVocabSet && movingDeck) {
                    onMoveVocabSet(movingDeck.id, targetMoveGroup);
                    const targetGrp = GROUPS_LIST.find(g => g.id === targetMoveGroup);
                    setImportNotice(`تم نقل الـ Deck "${movingDeck.name}" إلى مجموعة ${targetGrp?.name || targetMoveGroup} بنجاح!`);
                    setTimeout(() => setImportNotice(null), 4000);
                  }
                  setMovingDeck(null);
                }}
                disabled={getDeckGroup(movingDeck) === targetMoveGroup}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <FolderInput className="w-3.5 h-3.5" />
                <span>تأكيد النقل (Confirm Move)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Words to Another Deck Modal */}
      {transferringDeck && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => setTransferringDeck(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl shrink-0">
                  <ArrowRightLeft className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Transfer Words</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Move all vocabulary items to another deck</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTransferringDeck(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Source Deck Info */}
            {(() => {
              const srcGrp = getDeckGroup(transferringDeck);
              const srcGrpMeta = GROUPS_LIST.find(g => g.id === srcGrp) || GROUPS_LIST[5];
              return (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col gap-1.5 shrink-0">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <FolderKanban className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Source Deck</span>
                  </div>
                  <div className="flex items-center justify-between gap-2.5 flex-wrap">
                    <span className="text-sm font-black text-slate-900 dark:text-white truncate max-w-[280px]">
                      {transferringDeck.name}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700/80 px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-600">
                        {transferringDeck.items?.length || 0} words
                      </span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${srcGrpMeta.badgeClass}`}>
                        {srcGrpMeta.name}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {(!transferringDeck.items || transferringDeck.items.length === 0) ? (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-2xl text-center space-y-2">
                <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 mx-auto" />
                <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  This deck is empty and contains no words to transfer.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setTransferringDeck(null);
                    setShowTransferConfirm(false);
                  }}
                  className="px-4 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0 space-y-3">
                <div className="flex items-center justify-between shrink-0">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300 block">
                    Select Target Deck:
                  </label>
                  {targetTransferSetId && (
                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 truncate max-w-[220px]">
                      Selected: {vocabSets.find(s => s.id === targetTransferSetId)?.name}
                    </span>
                  )}
                </div>

                {/* Level group filter buttons - wraps to next line */}
                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setTargetGroupFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold shrink-0 cursor-pointer transition-colors ${
                      targetGroupFilter === 'all'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    All Decks
                  </button>
                  {GROUPS_LIST.map(grp => (
                    <button
                      key={grp.id}
                      type="button"
                      onClick={() => setTargetGroupFilter(grp.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold shrink-0 cursor-pointer transition-colors ${
                        targetGroupFilter === grp.id
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {grp.id}
                    </button>
                  ))}
                </div>

                {/* Target Deck Interactive List - Expanded height without disclaimer */}
                {(() => {
                  const availableDecks = vocabSets.filter(s => {
                    if (s.id === transferringDeck.id) return false;
                    if (targetGroupFilter !== 'all' && getDeckGroup(s) !== targetGroupFilter) return false;
                    return true;
                  });

                  return (
                    <div className="flex-1 overflow-y-auto min-h-[220px] max-h-72 rounded-2xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-1.5 space-y-1 shadow-inner">
                      {availableDecks.length === 0 ? (
                        <div className="py-12 text-center text-xs text-slate-400 font-medium">
                          No decks available in this group
                        </div>
                      ) : (
                        availableDecks.map(deck => {
                          const isSelected = deck.id === targetTransferSetId;
                          const grp = getDeckGroup(deck);
                          const grpMeta = GROUPS_LIST.find(g => g.id === grp) || GROUPS_LIST[5];
                          return (
                            <div
                              key={deck.id}
                              onClick={() => setTargetTransferSetId(deck.id)}
                              className={`p-3 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all duration-150 ${
                                isSelected
                                  ? 'bg-indigo-50/90 dark:bg-indigo-950/80 border border-indigo-400 dark:border-indigo-600 shadow-xs ring-1 ring-indigo-500/20'
                                  : 'hover:bg-white dark:hover:bg-slate-800/80 border border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                                  isSelected
                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                                }`}>
                                  {isSelected && <Check className="w-3 h-3" />}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                                    {deck.name}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-medium">
                                    {deck.items?.length || 0} words
                                  </div>
                                </div>
                              </div>
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border shrink-0 ${grpMeta.badgeClass}`}>
                                {grpMeta.id}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  );
                })()}

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setTransferringDeck(null);
                      setShowTransferConfirm(false);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!targetTransferSetId || targetTransferSetId === transferringDeck.id}
                    onClick={() => setShowTransferConfirm(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Confirm Transfer</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transfer Confirmation Modal */}
      {showTransferConfirm && transferringDeck && targetTransferSetId && (
        <div
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-60 p-4 animate-fade-in"
          onClick={() => setShowTransferConfirm(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-2xl shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Confirm Word Transfer</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Please review the transfer details</p>
              </div>
            </div>

            {/* Source and Target Decks Summary */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-500 dark:text-slate-400">From (Source):</span>
                <span className="font-black text-slate-800 dark:text-slate-100 truncate max-w-[200px]">
                  {transferringDeck.name} ({transferringDeck.items?.length || 0} words)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-500 dark:text-slate-400">To (Target):</span>
                <span className="font-black text-indigo-600 dark:text-indigo-400 truncate max-w-[200px]">
                  {vocabSets.find(s => s.id === targetTransferSetId)?.name}
                </span>
              </div>
            </div>

            {/* Disclaimer text moved to confirmation modal */}
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
              All <strong className="font-black">{transferringDeck.items?.length || 0} words</strong> will be moved to the target deck. Duplicate entries will be automatically filtered, and this deck will be cleared.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowTransferConfirm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onTransferDeckItems && transferringDeck && targetTransferSetId) {
                    const targetDeck = vocabSets.find(s => s.id === targetTransferSetId);
                    const count = transferringDeck.items?.length || 0;
                    onTransferDeckItems(transferringDeck.id, targetTransferSetId);
                    setImportNotice(`Transferred ${count} words from "${transferringDeck.name}" to "${targetDeck?.name || 'target deck'}" successfully!`);
                    setTimeout(() => setImportNotice(null), 4500);
                  }
                  setShowTransferConfirm(false);
                  setTransferringDeck(null);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Confirm Transfer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Words in Deck Modal */}
      {clearingDeck && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-2xl shrink-0">
                  <Eraser className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Clear All Words</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Remove all vocabulary items from this deck</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setClearingDeck(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 dark:text-slate-100">{clearingDeck.name}</span>
                <span className="text-xs font-black text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 px-2.5 py-0.5 rounded-lg">
                  {clearingDeck.items?.length || 0} words
                </span>
              </div>
              <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
                Are you sure you want to clear all vocabulary from this deck? The deck will be preserved, but its vocabulary count will be reset to 0.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setClearingDeck(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClearDeckItems && clearingDeck) {
                    onClearDeckItems(clearingDeck.id);
                    setImportNotice(`All vocabulary from "${clearingDeck.name}" cleared successfully!`);
                    setTimeout(() => setImportNotice(null), 4000);
                  }
                  setClearingDeck(null);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>Confirm Clear</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Confirmation Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-2xl">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Export Vocabulary Backup</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Confirm backup file generation</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              You are about to export a complete JSON backup containing <strong className="text-slate-900 dark:text-white font-extrabold">{vocabSets.length} decks</strong> and <strong className="text-slate-900 dark:text-white font-extrabold">{totalDatabaseWords} words</strong>.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onExportAllSets) onExportAllSets();
                  setShowExportModal(false);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Confirm & Download Backup</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Screen vs Sub-Screen vs Search */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs">
        
        {/* SEARCH RESULTS MODE */}
        {searchQuery.trim() ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-black text-slate-700 dark:text-slate-300">
              <span>Search Results ({matchingSearchDecks.length} Decks found):</span>
              <button
                onClick={() => setSearchQuery('')}
                className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Clear Search
              </button>
            </div>

            {matchingSearchDecks.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <p className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
                  No vocabulary decks match "{searchQuery}"
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {matchingSearchDecks.map(set => {
                    const isStaged = set.id === stagedSetId;
                    const isCurrentlyActive = set.id === activeSetId;
                    const isEditing = editingSetId === set.id;
                    const isDeleting = deletingSetId === set.id;
                    const groupName = getDeckGroup(set);
                    const grpMeta = GROUPS_LIST.find(g => g.id === groupName) || GROUPS_LIST[0];
                    const masteryPct = calculateDeckMastery(set);

                    return (
                      <div
                        key={set.id}
                        onClick={() => setStagedSetId(set.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isStaged
                            ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 dark:bg-blue-950/50 dark:border-blue-600 shadow-xs'
                            : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {isDeleting ? (
                          <div className="flex-1 flex items-center justify-between gap-2 bg-rose-50 dark:bg-rose-950/60 p-2.5 rounded-xl border border-rose-200 dark:border-rose-800 animate-fade-in" onClick={e => e.stopPropagation()}>
                            <span className="text-xs font-extrabold text-rose-700 dark:text-rose-300">
                              Delete this deck?
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteVocabSet(set.id);
                                  setDeletingSetId(null);
                                }}
                                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-black cursor-pointer shadow-xs"
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingSetId(null)}
                                className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : isEditing ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleRenameSubmit(set.id);
                            }}
                            className="flex-1 flex items-center gap-2 min-w-0 w-full"
                            onClick={e => e.stopPropagation()}
                          >
                            <input
                              type="text"
                              value={editingName}
                              onChange={e => setEditingName(e.target.value)}
                              autoFocus
                              placeholder="Deck name..."
                              className="flex-1 min-w-0 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-blue-500 dark:border-blue-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="submit"
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-2xs transition-colors"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingSetId(null)}
                                className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <div className="flex-1 flex items-center gap-3 min-w-0">
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                                isStaged ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700'
                              }`}>
                                {isStaged && <Check className="w-3.5 h-3.5" />}
                              </div>

                              <div className="min-w-0">
                                <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2 truncate">
                                  <span className="truncate">{set.name}</span>
                                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border shrink-0 ${grpMeta.badgeClass}`}>
                                    {grpMeta.name}
                                  </span>
                                  {isCurrentlyActive && (
                                    <span className="text-[10px] font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded-md shrink-0">
                                      Active
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                    {set.items?.length || 0} words
                                  </span>
                                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                    {masteryPct}%
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* 3-dots Menu Button */}
                            <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => setOpenMenuSetId(openMenuSetId === set.id ? null : set.id)}
                                title="Deck Options"
                                className={`p-1.5 rounded-xl transition-all cursor-pointer border ${
                                  openMenuSetId === set.id
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border-transparent'
                                }`}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {openMenuSetId === set.id && (
                                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuSetId(null);
                                      setEditingSetId(set.id);
                                      setEditingName(set.name);
                                      setDeletingSetId(null);
                                    }}
                                    className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer transition-colors"
                                  >
                                    <Edit3 className="w-4 h-4 text-blue-500 shrink-0" />
                                    <span>Rename Deck</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuSetId(null);
                                      setTransferringDeck(set);
                                      setShowTransferConfirm(false);
                                      setTargetGroupFilter('all');
                                      const other = vocabSets.find(s => s.id !== set.id);
                                      setTargetTransferSetId(other?.id || '');
                                    }}
                                    className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 flex items-center gap-2.5 cursor-pointer transition-colors"
                                  >
                                    <ArrowRightLeft className="w-4 h-4 text-indigo-500 shrink-0" />
                                    <span>Transfer Words</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuSetId(null);
                                      setClearingDeck(set);
                                    }}
                                    className="w-full px-3.5 py-2 text-left text-xs font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 flex items-center gap-2.5 cursor-pointer transition-colors"
                                  >
                                    <Eraser className="w-4 h-4 text-amber-500 shrink-0" />
                                    <span>Clear All Words</span>
                                  </button>

                                  <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuSetId(null);
                                      setDeletingSetId(set.id);
                                      setEditingSetId(null);
                                    }}
                                    className="w-full px-3.5 py-2 text-left text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center gap-2.5 cursor-pointer transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
                                    <span>Delete Deck</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Single Confirm Button at the End of Search Results List */}
                <div className="flex justify-end pt-4 pb-1 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      if (stagedSetId) {
                        onSelectVocabSet(stagedSetId);
                      }
                    }}
                    disabled={!stagedSetId}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition-all border shadow-2xs ${
                      activeSetId === stagedSetId
                        ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 cursor-default'
                        : 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Check className={`w-4 h-4 ${activeSetId === stagedSetId ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`} />
                    <span>
                      {activeSetId === stagedSetId ? 'Confirmed' : 'Confirm'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : selectedGroup ? (
          
          /* SUB-SCREEN MODE: DECKS IN SELECTED GROUP */
          <div className="space-y-5 animate-fade-in">
            
            {/* Harmonious Sub-screen Header Card */}
            <div className="bg-gradient-to-r from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-800/80 dark:via-blue-950/20 dark:to-slate-800/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              
              {/* Back arrow + Group Name */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGroup(null);
                    setDeckSubPage(1);
                    setIsDeletingGroup(false);
                  }}
                  className="p-2 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-xl cursor-pointer shadow-2xs transition-all shrink-0 inline-flex items-center justify-center"
                  title="Back to Main Groups"
                >
                  <ArrowLeft className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </button>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  {currentGroupMeta?.name || selectedGroup}
                </h3>
              </div>

              {/* Line 3: Decks count, total words, mastery */}
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                <span>{groupDecks.length} Decks</span>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span>{groupTotalWords} Total Words</span>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{groupAverageMastery}% Mastery</span>
              </div>

              {/* Line 4: Divider line */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-3" />

              {/* Line 5: Actions Layout: Import & Export side-by-side, New Deck underneath */}
              <div className="space-y-2.5">
                
                {/* Row 1: Import Backup & Export Group side-by-side */}
                <div className="flex items-center gap-2">
                  <label className="flex-1 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Import Backup</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowExportGroupModal(true)}
                    className="flex-1 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                    title={`Export all decks in ${selectedGroup}`}
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Export Group</span>
                  </button>
                </div>

                {/* Row 2: New Deck button underneath (+ Delete Group if custom non-default group) */}
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreating(true)}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Deck</span>
                  </button>

                  {/* Delete Group - only for custom user-created groups */}
                  {isCustomGroup && groupDecks.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsDeletingGroup(true)}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:hover:bg-rose-900 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
                      title={`Delete all decks in ${selectedGroup}`}
                    >
                      <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      <span>Delete Group</span>
                    </button>
                  )}
                </div>

              </div>

            </div>

            {/* Export Group Confirmation Modal */}
            {showExportGroupModal && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-2xl">
                      <Download className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">Export {selectedGroup} Group Backup</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Confirm backup file download</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    You are about to export a backup containing <strong className="text-slate-900 dark:text-white font-extrabold">{groupDecks.length} decks</strong> and <strong className="text-slate-900 dark:text-white font-extrabold">{groupTotalWords} words</strong> in group <strong className="text-blue-600 dark:text-blue-400 font-extrabold">{selectedGroup}</strong>.
                  </p>

                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowExportGroupModal(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleExportGroupSets();
                        setShowExportGroupModal(false);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Confirm & Download</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Delete Entire Group Confirmation Modal */}
            {isDeletingGroup && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-2xl">
                      <Trash2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">Delete Group "{selectedGroup}"?</h3>
                      <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5 font-bold">{groupDecks.length} decks will be removed</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    This action will permanently remove all <strong className="text-slate-900 dark:text-white font-extrabold">{groupDecks.length} vocabulary decks</strong> and their <strong className="text-slate-900 dark:text-white font-extrabold">{groupTotalWords} words</strong> in group <strong className="text-slate-900 dark:text-white font-extrabold">{selectedGroup}</strong>.
                  </p>

                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsDeletingGroup(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        groupDecks.forEach(deck => onDeleteVocabSet(deck.id));
                        setIsDeletingGroup(false);
                        setSelectedGroup(null);
                      }}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Confirm & Delete All</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Inline Create Deck */}
            {isCreating && (
              <form onSubmit={handleCreateSubmit} className="flex gap-2 p-3 bg-blue-50/80 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-800 animate-fade-in">
                <input
                  type="text"
                  required
                  autoFocus
                  value={newSetName}
                  onChange={e => setNewSetName(e.target.value)}
                  placeholder={`New ${selectedGroup} deck name (e.g., Kapitel 1 Words)`}
                  className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </form>
            )}

            {/* Bounded Decks Grid (12 decks per page max) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentSubPageDecks.length === 0 ? (
                <div className="col-span-full text-center py-12 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
                    No decks in {selectedGroup} group yet.
                  </p>
                  <button
                    onClick={() => setIsCreating(true)}
                    className="mt-3 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl cursor-pointer shadow-2xs"
                  >
                    Create First {selectedGroup} Deck
                  </button>
                </div>
              ) : (
                currentSubPageDecks.map(set => {
                  const isSelected = set.id === activeSetId;
                  const isEditing = editingSetId === set.id;
                  const isDeleting = deletingSetId === set.id;
                  const masteryPct = calculateDeckMastery(set);

                  return (
                    <div
                      key={set.id}
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 dark:bg-blue-950/50 dark:border-blue-600'
                          : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {isDeleting ? (
                        <div className="flex-1 flex items-center justify-between gap-2 bg-rose-50 dark:bg-rose-950/60 p-2.5 rounded-xl border border-rose-200 dark:border-rose-800 animate-fade-in">
                          <span className="text-xs font-extrabold text-rose-700 dark:text-rose-300">
                            Delete this deck?
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteVocabSet(set.id);
                                setDeletingSetId(null);
                              }}
                              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-black cursor-pointer shadow-xs"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingSetId(null)}
                              className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : isEditing ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleRenameSubmit(set.id);
                          }}
                          className="flex-1 flex items-center gap-2 min-w-0 w-full"
                          onClick={e => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={editingName}
                            onChange={e => setEditingName(e.target.value)}
                            autoFocus
                            placeholder="Deck name..."
                            className="flex-1 min-w-0 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-blue-500 dark:border-blue-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="submit"
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-2xs transition-colors"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingSetId(null)}
                              className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div
                            onClick={() => setStagedSetId(set.id)}
                            className="flex-1 flex items-center gap-3 cursor-pointer min-w-0"
                          >
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                              set.id === stagedSetId ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700'
                            }`}>
                              {set.id === stagedSetId && <Check className="w-3.5 h-3.5" />}
                            </div>

                            <div className="min-w-0">
                              <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2 truncate">
                                <span className="truncate">{set.name}</span>
                                {set.id === activeSetId && (
                                  <span className="text-[10px] font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded-md shrink-0">
                                    Active
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                  {set.items?.length || 0} German words
                                </span>
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                  {masteryPct}%
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* 3-dots Menu Button */}
                          <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setOpenMenuSetId(openMenuSetId === set.id ? null : set.id)}
                              title="Deck Options"
                              className={`p-1.5 rounded-xl transition-all cursor-pointer border ${
                                openMenuSetId === set.id
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border-transparent'
                              }`}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openMenuSetId === set.id && (
                              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuSetId(null);
                                    setEditingSetId(set.id);
                                    setEditingName(set.name);
                                    setDeletingSetId(null);
                                  }}
                                  className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer transition-colors"
                                >
                                  <Edit3 className="w-4 h-4 text-blue-500 shrink-0" />
                                  <span>Rename Deck</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuSetId(null);
                                    setTransferringDeck(set);
                                    setShowTransferConfirm(false);
                                    setTargetGroupFilter('all');
                                    const other = vocabSets.find(s => s.id !== set.id);
                                    setTargetTransferSetId(other?.id || '');
                                  }}
                                  className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 flex items-center gap-2.5 cursor-pointer transition-colors"
                                >
                                  <ArrowRightLeft className="w-4 h-4 text-indigo-500 shrink-0" />
                                  <span>Transfer Words</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuSetId(null);
                                    setClearingDeck(set);
                                  }}
                                  className="w-full px-3.5 py-2 text-left text-xs font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 flex items-center gap-2.5 cursor-pointer transition-colors"
                                >
                                  <Eraser className="w-4 h-4 text-amber-500 shrink-0" />
                                  <span>Clear All Words</span>
                                </button>

                                <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuSetId(null);
                                    setDeletingSetId(set.id);
                                    setEditingSetId(null);
                                  }}
                                  className="w-full px-3.5 py-2 text-left text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center gap-2.5 cursor-pointer transition-colors"
                                >
                                  <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
                                  <span>Delete Deck</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination Controls */}
            {totalSubPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  disabled={deckSubPage <= 1}
                  onClick={() => setDeckSubPage(p => Math.max(1, p - 1))}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 disabled:opacity-40 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Prev</span>
                </button>

                <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                  Page {deckSubPage} of {totalSubPages} ({DECKS_PER_PAGE} decks/page)
                </span>

                <button
                  disabled={deckSubPage >= totalSubPages}
                  onClick={() => setDeckSubPage(p => Math.min(totalSubPages, p + 1))}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 disabled:opacity-40 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Confirm Selection Button at the End of Sub-screen Deck List */}
            {groupDecks.length > 0 && (
              <div className="flex justify-end pt-5 pb-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    if (stagedSetId) {
                      onSelectVocabSet(stagedSetId);
                    }
                  }}
                  disabled={!stagedSetId}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition-all border shadow-2xs ${
                    activeSetId === stagedSetId
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 cursor-default'
                      : 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <Check className={`w-4 h-4 ${activeSetId === stagedSetId ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`} />
                  <span>
                    {activeSetId === stagedSetId ? 'Confirmed' : 'Confirm'}
                  </span>
                </button>
              </div>
            )}

          </div>

        ) : (

          /* MAIN SCREEN MODE: MAIN GROUPS */
          <div className="space-y-4">
            
            {/* Inline Create Deck Input */}
            {isCreating && (
              <form onSubmit={handleCreateSubmit} className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 animate-fade-in">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    required
                    autoFocus
                    value={newSetName}
                    onChange={e => setNewSetName(e.target.value)}
                    placeholder="New deck name (e.g., A1 Verbs & Articles)"
                    className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  <select
                    value={newSetGroup}
                    onChange={e => setNewSetGroup(e.target.value)}
                    className="px-3 py-2 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  >
                    {GROUPS_LIST.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-3 py-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-2xs"
                  >
                    Save Deck
                  </button>
                </div>
              </form>
            )}

            {/* Main Group Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {GROUPS_LIST.map(grp => {
                const stat = groupStats[grp.id] || { deckCount: 0, wordCount: 0, totalMasterySum: 0 };
                const groupMastery = stat.wordCount > 0 ? Math.round(stat.totalMasterySum / stat.wordCount) : 0;

                return (
                  <div
                    key={grp.id}
                    onClick={() => {
                      setSelectedGroup(grp.id);
                      setDeckSubPage(1);
                    }}
                    className="group p-5 bg-white dark:bg-slate-800/60 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 border border-slate-200 dark:border-slate-700/80 hover:border-blue-400 dark:hover:border-blue-600 rounded-2xl cursor-pointer transition-all duration-200 shadow-2xs hover:shadow-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-black px-3 py-1.5 rounded-xl border ${grp.badgeClass}`}>
                          {grp.id}
                        </span>
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                          {groupMastery}%
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
                      <span>{stat.deckCount} {stat.deckCount === 1 ? 'Deck' : 'Decks'}</span>
                      <span className="font-black text-slate-800 dark:text-slate-200">
                        {stat.wordCount} words
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

        )}

      </div>

      {/* ------------------------------------------------------------- */}
      {/* CONFIRM PUSH TO SHEETS DIALOG (MANDATORY WORKSPACE CONFIRMATION) */}
      {/* ------------------------------------------------------------- */}
      {confirmPushModalOpen && linkedSheet && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-2xl shrink-0">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">تأكيد المزامنة مع Google Sheets</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Confirm Push to Google Sheets</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl text-xs space-y-2 border border-slate-200 dark:border-slate-700">
              <div className="font-extrabold text-slate-900 dark:text-white flex items-center justify-between">
                <span>Target Sheet:</span>
                <span className="text-emerald-600 dark:text-emerald-400 truncate max-w-[200px]">{linkedSheet.spreadsheetTitle}</span>
              </div>
              <div className="text-slate-600 dark:text-slate-300">
                سيتم تحديث الشيت بـ <span className="font-black text-slate-900 dark:text-white">{vocabSets.length} تبويب (حزم Decks)</span> بإجمالي <span className="font-black text-slate-900 dark:text-white">{totalDatabaseWords} مفردة</span> وتحديث درجات الإتقان وسجل الممارسة (17 عمود).
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmPushModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                إلغاء / Cancel
              </button>
              <button
                type="button"
                disabled={isSyncing}
                onClick={handleExecutePushToSheets}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                {isSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>موافق، مزامنة للشيت</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CONFIRM PULL FROM SHEETS DIALOG (MANDATORY WORKSPACE CONFIRMATION) */}
      {/* ------------------------------------------------------------- */}
      {confirmPullModalOpen && pendingPullData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-2xl shrink-0">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">تأكيد استيراد البيانات من الشيت</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Confirm Pull from Google Sheets</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl text-xs space-y-2 border border-slate-200 dark:border-slate-700">
              <div className="font-extrabold text-slate-900 dark:text-white flex items-center justify-between">
                <span>Source File:</span>
                <span className="text-blue-600 dark:text-blue-400 truncate max-w-[200px]">{pendingPullData.title}</span>
              </div>
              <div className="text-slate-600 dark:text-slate-300">
                تم العثور على <span className="font-black text-slate-900 dark:text-white">{pendingPullData.decks.length} حزمة</span> تحتوي على <span className="font-black text-slate-900 dark:text-white">{pendingPullData.decks.reduce((acc, d) => acc + (d.items?.length || 0), 0)} مفردة</span> متضمنة نسب الإتقان والمحاولات. هل ترغب بتحديث قاعدة بيانات التطبيق بهذه المفردات؟
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmPullModalOpen(false);
                  setPendingPullData(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                إلغاء / Cancel
              </button>
              <button
                type="button"
                onClick={handleExecutePullConfirmed}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                <Check className="w-3.5 h-3.5" />
                <span>موافق، تحديث التطبيق</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* GOOGLE SHEETS MANAGEMENT MODAL */}
      {/* ------------------------------------------------------------- */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-xl w-full space-y-5 shadow-2xl animate-fade-in max-h-[92vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 rounded-2xl shrink-0">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Google Sheets Cloud Database</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    مزامنة حزم المفردات مع جدول خارجي في Google Drive
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsSyncModalOpen(false);
                  setSyncFeedback(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold p-1 cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            {/* Google Authentication Box */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              {currentUser ? (
                <div className="flex items-center gap-3 min-w-0">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'Google User'}
                      className="w-10 h-10 rounded-full border border-slate-300 dark:border-slate-600 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-black flex items-center justify-center shrink-0 text-sm">
                      {(currentUser.displayName || currentUser.email || 'G')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {currentUser.displayName || 'Google User'}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {currentUser.email}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-xs font-black text-slate-900 dark:text-white">
                    Google Drive & Sheets Access
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    قم بتسجيل الدخول لإنشاء أو ربط جدول المفردات في حسابك
                  </div>
                </div>
              )}

              <div className="shrink-0 w-full sm:w-auto">
                {currentUser ? (
                  <button
                    type="button"
                    onClick={handleGoogleLogout}
                    className="px-3.5 py-1.5 bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-extrabold rounded-xl transition-all cursor-pointer"
                  >
                    تسجيل الخروج / Sign out
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isAuthLoading}
                    onClick={handleGoogleLogin}
                    className="gsi-material-button w-full sm:w-auto"
                  >
                    <div className="gsi-material-button-state"></div>
                    <div className="gsi-material-button-content-wrapper">
                      <div className="gsi-material-button-icon">
                        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                          <path fill="none" d="M0 0h48v48H0z"></path>
                        </svg>
                      </div>
                      <span className="gsi-material-button-contents">
                        {isAuthLoading ? 'Connecting...' : 'Sign in with Google'}
                      </span>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Sync Feedback Message */}
            {syncFeedback && (
              <div
                className={`p-3.5 rounded-2xl text-xs font-bold border flex items-center gap-2 animate-fade-in ${
                  syncFeedback.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/70 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                }`}
              >
                {syncFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                )}
                <span>{syncFeedback.message}</span>
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setSyncModalTab('status')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  syncModalTab === 'status'
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs border border-slate-200 dark:border-slate-800'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>الجدول المرتبط (Sync)</span>
              </button>
              <button
                type="button"
                onClick={() => setSyncModalTab('create')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  syncModalTab === 'create'
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs border border-slate-200 dark:border-slate-800'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إنشاء جدول جديد</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSyncModalTab('link');
                  if (currentAccessToken && driveFiles.length === 0) {
                    loadDriveFiles(currentAccessToken);
                  }
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  syncModalTab === 'link'
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs border border-slate-200 dark:border-slate-800'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Link className="w-3.5 h-3.5" />
                <span>ربط جدول موجود</span>
              </button>
            </div>

            {/* TAB 1: CONNECTED SHEET STATUS & SYNC */}
            {syncModalTab === 'status' && (
              <div className="space-y-4 animate-fade-in">
                {linkedSheet ? (
                  <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          الجدول السحابي النشط
                        </span>
                      </div>
                      <a
                        href={linkedSheet.spreadsheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-black rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950 flex items-center gap-1"
                      >
                        <span>فتح في Google Sheets</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <div className="bg-white dark:bg-slate-900/90 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900 text-xs space-y-1.5">
                      <div className="font-extrabold text-slate-900 dark:text-white truncate">
                        {linkedSheet.spreadsheetTitle}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium flex-wrap">
                        <span>{vocabSets.length} حزم (Decks)</span>
                        <span>•</span>
                        <span>{totalDatabaseWords} مفردة</span>
                        <span>•</span>
                        <span>آخر مزامنة: {new Date(linkedSheet.lastSyncedAt).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    {/* Sync Actions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <button
                        type="button"
                        disabled={isSyncing}
                        onClick={() => {
                          if (!currentAccessToken) handleGoogleLogin();
                          else setConfirmPushModalOpen(true);
                        }}
                        className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                        <span>مزامنة للشيت (Push)</span>
                      </button>

                      <button
                        type="button"
                        disabled={isSyncing}
                        onClick={() => {
                          if (!currentAccessToken) handleGoogleLogin();
                          else handleRequestPullFromSheets();
                        }}
                        className="py-2.5 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                      >
                        <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>استيراد من الشيت (Pull)</span>
                      </button>
                    </div>

                    <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 flex justify-end">
                      <button
                        type="button"
                        onClick={handleUnlinkSheet}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1 cursor-pointer"
                      >
                        <Unlink className="w-3.5 h-3.5" />
                        <span>فصل الربط عن هذا الجدول</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
                    <CloudOff className="w-10 h-10 text-slate-400 mx-auto" />
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                        لم يتم ربط جدول حتى الآن
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                        يمكنك إنشاء جدول رئيسي جديد في Google Drive بضغطة زر، أو ربط جدول Google Sheet موجود بالفعل.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setSyncModalTab('create')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer"
                      >
                        إنشاء جدول جديد الآن
                      </button>
                      <button
                        type="button"
                        onClick={() => setSyncModalTab('link')}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black border border-slate-200 dark:border-slate-700 cursor-pointer"
                      >
                        ربط جدول موجود
                      </button>
                    </div>
                  </div>
                )}

                {/* Structure Explainer */}
                <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-2xl text-xs space-y-1.5">
                  <div className="font-black text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>هيكلية الجدول وقاعدة البيانات (17 عمود):</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                    يحتوي الجدول على تبويب مستقل لكل حزمة Deck، مقسمة إلى 12 عموداً لمعلومات المفردة (Type, Article, Word, Plural, Conjugation, Preposition, Case, Antonym, Translation, Example, CEFR level)، بالإضافة إلى 5 أعمدة تقنية خاصة بالتطبيق لحفظ درجات الإتقان (Mastery_Score)، المحاولات (Attempts_Count)، الإجابات الصحيحة (Correct_Count)، تاريخ الممارسة (Last_Practiced)، والمفضلة (Is_Starred).
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: CREATE MASTER SHEET */}
            {syncModalTab === 'create' && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block">
                    اسم ملف Google Sheet الجديد:
                  </label>
                  <input
                    type="text"
                    value={newSheetTitle}
                    onChange={e => setNewSheetTitle(e.target.value)}
                    placeholder="DeutschMeister - German Vocabulary & Mastery"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[11px] text-slate-400 block">
                    سيتم حفظ الملف في حساب Google Drive الخاص بك تلقائياً.
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                  <div className="font-extrabold text-slate-800 dark:text-slate-200">
                    التبويبات التي سيتم إنشاؤها فوراً ({vocabSets.length} حزم):
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                    {vocabSets.map((s, idx) => (
                      <span
                        key={s.id || idx}
                        className="px-2.5 py-1 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold"
                      >
                        {s.name} ({s.items?.length || 0})
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={handleCreateNewMasterSheet}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري إنشاء الجدول في Google Drive ومزامنة البيانات...</span>
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>إنشاء الجدول في Drive ومزامنة كافة الحزم الآن</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* TAB 3: LINK EXISTING SHEET */}
            {syncModalTab === 'link' && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-2">
                  <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block">
                    رابط أو معرف Google Sheet:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualSheetInput}
                      onChange={e => setManualSheetInput(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 dir-ltr"
                    />
                    <button
                      type="button"
                      disabled={!manualSheetInput.trim() || isSyncing}
                      onClick={() => handleLinkExistingSheet(manualSheetInput)}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer shrink-0"
                    >
                      ربط الشيت
                    </button>
                  </div>
                </div>

                {/* Drive Spreadsheets List */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                      أو اختر من ملفات Google Sheets في درايف:
                    </span>
                    {currentAccessToken && (
                      <button
                        type="button"
                        onClick={() => loadDriveFiles(currentAccessToken)}
                        className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 ${isLoadingDriveFiles ? 'animate-spin' : ''}`} />
                        <span>تحديث القائمة</span>
                      </button>
                    )}
                  </div>

                  {!currentAccessToken ? (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-center text-xs text-slate-500">
                      سجل الدخول بحساب Google لعرض جداولك الموجودة في Drive تلقائياً.
                    </div>
                  ) : isLoadingDriveFiles ? (
                    <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                      <span>جاري جلب ملفات Google Drive...</span>
                    </div>
                  ) : driveFiles.length > 0 ? (
                    <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                      {driveFiles.map(file => (
                        <div
                          key={file.id}
                          className="p-2.5 bg-slate-50 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-2 text-xs transition-all"
                        >
                          <div className="min-w-0">
                            <div className="font-extrabold text-slate-900 dark:text-white truncate">
                              {file.name}
                            </div>
                            {file.modifiedTime && (
                              <div className="text-[10px] text-slate-400">
                                معدل: {new Date(file.modifiedTime).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            disabled={isSyncing}
                            onClick={() => handleLinkExistingSheet(file.id)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black shrink-0 cursor-pointer"
                          >
                            ربط
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                      لم يتم العثور على جداول بيانات حديثة في Drive. يمكنك إدخال الرابط أعلاه يدوياً.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
