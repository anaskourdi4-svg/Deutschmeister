import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, CheckCircle2, X, PlusCircle, Trash2, Edit3, FolderSync, ArrowRight } from 'lucide-react';
import { SyncChangesSummary } from '../services/googleSheets';

interface SyncNotificationToastProps {
  onNavigateToVocab?: () => void;
  onNavigateToDecks?: () => void;
}

interface ToastData {
  id: string;
  summary: SyncChangesSummary;
  formatted: { title: string; details: string[]; fullText: string };
  timestamp: string;
}

export function SyncNotificationToast({
  onNavigateToVocab,
  onNavigateToDecks,
}: SyncNotificationToastProps) {
  const [toast, setToast] = useState<ToastData | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(100);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const DURATION_MS = 8000;

  // Listen to auto-sync changes event
  useEffect(() => {
    const handleChanges = (e: Event) => {
      const custom = e as CustomEvent<{
        summary: SyncChangesSummary;
        formatted: { title: string; details: string[]; fullText: string };
        timestamp: string;
      }>;

      if (custom.detail && custom.detail.summary) {
        // Only show toast if there are actual user-visible changes!
        const s = custom.detail.summary;
        const hasVisibleChanges =
          s.addedWordsCount > 0 ||
          s.deletedWordsCount > 0 ||
          s.updatedWordsCount > 0 ||
          (s.renamedDecks && s.renamedDecks.length > 0) ||
          s.newDecksCount > 0;

        if (hasVisibleChanges) {
          setToast({
            id: `toast_${Date.now()}`,
            summary: s,
            formatted: custom.detail.formatted,
            timestamp: custom.detail.timestamp,
          });
          setProgress(100);
        }
      }
    };

    window.addEventListener('app:autosync-changes', handleChanges);
    return () => window.removeEventListener('app:autosync-changes', handleChanges);
  }, []);

  // Handle auto-dismiss and progress bar
  useEffect(() => {
    if (!toast) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    if (isHovered) return;

    const startTime = Date.now();
    const intervalMs = 100;

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPct = Math.max(0, 100 - (elapsed / DURATION_MS) * 100);
      setProgress(remainingPct);
    }, intervalMs);

    timerRef.current = setTimeout(() => {
      setToast(null);
    }, DURATION_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [toast, isHovered]);

  if (!toast) return null;

  const { summary } = toast;

  return (
    <aside
      aria-label="تنبيه مزامنة Google Sheets"
      className="fixed top-4 right-4 z-50 max-w-sm sm:max-w-md w-[calc(100vw-2rem)] sm:w-full animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      dir="rtl"
    >
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-blue-200 dark:border-blue-900/50 p-4 overflow-hidden relative transition-all">
        {/* Progress bar */}
        <div
          className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
              <RefreshCw className="w-4 h-4 animate-spin-once" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                تحديثات جديدة من Google Sheets
                <span className="inline-flex items-center px-1.5 py-0.2 text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-full">
                  مباشر
                </span>
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                تم تحديث بيانات الجدول بنجاح دون مقاطعة استخدامك
              </p>
            </div>
          </div>

          <button
            onClick={() => setToast(null)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="إغلاق التنبيه"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Change breakdown */}
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 my-2 space-y-2 text-xs border border-slate-100 dark:border-slate-800">
          {/* Added words */}
          {summary.addedWordsCount > 0 && (
            <div className="flex items-start gap-2 text-emerald-700 dark:text-emerald-400">
              <PlusCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <span className="font-semibold">تم إضافة {summary.addedWordsCount} مفردة جديدة</span>
                {summary.addedWordsSamples.length > 0 && (
                  <span className="text-[11px] text-slate-600 dark:text-slate-300 block font-normal mt-0.5">
                    مثال: {summary.addedWordsSamples.join('، ')}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Deleted words */}
          {summary.deletedWordsCount > 0 && (
            <div className="flex items-start gap-2 text-rose-700 dark:text-rose-400">
              <Trash2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" />
              <div>
                <span className="font-semibold">تم حذف {summary.deletedWordsCount} مفردة أزيلت من الجدول</span>
                {summary.deletedWordsSamples.length > 0 && (
                  <span className="text-[11px] text-slate-600 dark:text-slate-300 block font-normal mt-0.5">
                    مثال: {summary.deletedWordsSamples.join('، ')}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Updated words */}
          {summary.updatedWordsCount > 0 && (
            <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
              <Edit3 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <span className="font-semibold">تم تعديل {summary.updatedWordsCount} مفردة</span>
                {summary.updatedWordsSamples.length > 0 && (
                  <span className="text-[11px] text-slate-600 dark:text-slate-300 block font-normal mt-0.5">
                    مثال: {summary.updatedWordsSamples.join('، ')}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Renamed Decks */}
          {summary.renamedDecks && summary.renamedDecks.length > 0 && (
            <div className="flex items-start gap-2 text-blue-700 dark:text-blue-400">
              <FolderSync className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
              <div>
                <span className="font-semibold">تم تغيير تسمية الحزمة:</span>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5 mt-0.5">
                  {summary.renamedDecks.map((r, i) => (
                    <div key={i}>
                      «{r.oldName}» ➔ <span className="font-semibold text-blue-600 dark:text-blue-300">«{r.newName}»</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* New Decks imported */}
          {summary.newDecksCount > 0 && (
            <div className="flex items-start gap-2 text-purple-700 dark:text-purple-400">
              <FolderSync className="w-3.5 h-3.5 mt-0.5 shrink-0 text-purple-600 dark:text-purple-400" />
              <div>
                <span className="font-semibold">تم استيراد {summary.newDecksCount} حزمة جديدة</span>
                {summary.newDecksNames.length > 0 && (
                  <span className="text-[11px] text-slate-600 dark:text-slate-300 block font-normal mt-0.5">
                    «{summary.newDecksNames.join('»، «')}»
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>متطابق ومحفوظ محلياً</span>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToVocab && (summary.addedWordsCount > 0 || summary.updatedWordsCount > 0 || summary.deletedWordsCount > 0) && (
              <button
                onClick={() => {
                  onNavigateToVocab();
                  setToast(null);
                }}
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 px-2.5 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors flex items-center gap-1"
              >
                <span>استعراض المفردات</span>
                <ArrowRight className="w-3 h-3 rotate-180" />
              </button>
            )}

            {onNavigateToDecks && summary.renamedDecks && summary.renamedDecks.length > 0 && (
              <button
                onClick={() => {
                  onNavigateToDecks();
                  setToast(null);
                }}
                className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 px-2.5 py-1 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-colors flex items-center gap-1"
              >
                <span>عرض الأقسام</span>
                <ArrowRight className="w-3 h-3 rotate-180" />
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
