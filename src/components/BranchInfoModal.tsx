import React, { useState, useEffect } from 'react';
import {
  X,
  GitBranch,
  GitCommit,
  GitMerge,
  Clock,
  Calendar,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import {
  GitCommitInfo,
  BranchSyncInfo,
  INITIAL_DEV_COMMITS,
  INITIAL_SYNC_INFO,
  fetchLatestDevCommits,
  fetchBranchSyncInfo,
  formatArabicDate,
  formatTimeAgo,
  REPO_OWNER,
  REPO_NAME,
} from '../services/githubBranchService';

interface BranchInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'dev' | 'main';
}

export const BranchInfoModal: React.FC<BranchInfoModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'dev',
}) => {
  const [activeTab, setActiveTab] = useState<'dev' | 'main'>(initialTab);
  const [commits, setCommits] = useState<GitCommitInfo[]>(INITIAL_DEV_COMMITS);
  const [syncInfo, setSyncInfo] = useState<BranchSyncInfo>(INITIAL_SYNC_INFO);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      loadData();
    }
  }, [isOpen, initialTab]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [commitsData, syncData] = await Promise.all([
        fetchLatestDevCommits(),
        fetchBranchSyncInfo(),
      ]);
      setCommits(commitsData);
      setSyncInfo(syncData);
      setLastRefreshed(new Date());
    } finally {
      setIsLoading(false);
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                معلومات الفروع والنشر
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                مستودع GitHub: <span className="font-mono text-blue-600 dark:text-blue-400">{REPO_OWNER}/{REPO_NAME}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              title="تحديث البيانات من GitHub"
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Branch Switch Tabs */}
        <div className="p-3 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200/70 dark:bg-slate-950/70 rounded-xl">
            {/* dev Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('dev')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'dev'
                  ? 'bg-emerald-600 text-white shadow-xs font-black'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>فرع dev (آخر 3 تعديلات)</span>
            </button>

            {/* main Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('main')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'main'
                  ? 'bg-slate-800 text-white dark:bg-slate-700 shadow-xs font-black'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <GitMerge className="w-3.5 h-3.5 text-blue-400" />
              <span>فرع main (آخر مزامنة)</span>
            </button>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'dev' ? (
            /* DEV TAB CONTENT */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-400 dark:border-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    dev
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    أسماء آخر 3 تعديلات وتواريخها:
                  </span>
                </div>
                {syncInfo.aheadBy > 0 && (
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    متقدم بـ {syncInfo.aheadBy} تعديلات
                  </span>
                )}
              </div>

              {/* 3 Commits List */}
              <div className="space-y-3">
                {commits.map((commit, index) => {
                  const timeAgo = formatTimeAgo(commit.date);
                  return (
                    <div
                      key={commit.sha}
                      className="p-3.5 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200/80 dark:border-slate-700/80 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all space-y-2 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-mono text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5 border border-emerald-200 dark:border-emerald-800">
                            {index + 1}
                          </span>
                          <div>
                            <p className="text-xs font-extrabold text-slate-900 dark:text-white leading-snug">
                              {commit.message}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {commit.authorName}
                              </span>
                              <span>•</span>
                              <span className="font-mono text-[10px] bg-slate-200/80 dark:bg-slate-700 px-1.5 py-0.2 rounded text-slate-600 dark:text-slate-300">
                                {commit.shortSha}
                              </span>
                            </div>
                          </div>
                        </div>

                        <a
                          href={commit.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors shrink-0"
                          title="عرض التعديل في GitHub"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      {/* Date & Time */}
                      <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                          <Calendar className="w-3.5 h-3.5 text-blue-500" />
                          <span className="font-medium">{formatArabicDate(commit.date)}</span>
                        </div>
                        {timeAgo && (
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                            {timeAgo}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Last Checked Timestamp */}
              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  آخر فحص: {lastRefreshed.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ) : (
            /* MAIN TAB CONTENT */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    main
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    تاريخ وحالة آخر مزامنة من dev إلى main:
                  </span>
                </div>
              </div>

              {/* Primary Sync Highlight Card */}
              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50/60 dark:from-slate-800/90 dark:to-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900/60 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 text-xs font-extrabold">
                    <GitMerge className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>تاريخ آخر مزامنة (Last Sync/Merge):</span>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-700">
                    {formatTimeAgo(syncInfo.lastSyncDate)}
                  </span>
                </div>

                <div className="bg-white/80 dark:bg-slate-900/80 p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/50 space-y-1.5">
                  <div className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>{formatArabicDate(syncInfo.lastSyncDate)}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    التعديل المتزامن: <span className="font-bold text-slate-800 dark:text-slate-100">{syncInfo.lastSyncCommitMessage}</span>
                  </p>
                  <p className="text-[11px] font-mono text-slate-400">
                    Commit SHA: {syncInfo.lastSyncCommitSha}
                  </p>
                </div>
              </div>

              {/* Status Comparison Card */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    حالة فرع dev مقارنة بـ main:
                  </span>
                  {syncInfo.aheadBy > 0 ? (
                    <span className="text-[11px] font-black text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/70 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                      يوجد {syncInfo.aheadBy} تعديلات بانتظار المزامنة
                    </span>
                  ) : (
                    <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/70 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      الفروع متطابقة تماماً ومحدثة
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {syncInfo.aheadBy > 0
                    ? `فرع dev يحتوي على ${syncInfo.aheadBy} تعديلات جديدة لم تُدمج بعد في فرع main المستقر.`
                    : `كافة التعديلات الموجودة في dev تم دمجها بنجاح في main.`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            انقر على الشارة في أي وقت لمتابعة المزامنة والتعديلات
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold rounded-xl transition-all cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
