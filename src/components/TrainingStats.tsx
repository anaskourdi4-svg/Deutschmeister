import React from 'react';
import { VocabItem } from '../types';
import {
  BarChart3,
  Award,
  AlertCircle,
  BrainCircuit,
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import { AudioPlayer } from './AudioPlayer';

interface TrainingStatsProps {
  vocabList: VocabItem[];
  onNavigateToQuiz: () => void;
  onNavigateToVocab: () => void;
}

export const TrainingStats: React.FC<TrainingStatsProps> = ({
  vocabList,
  onNavigateToQuiz,
  onNavigateToVocab,
}) => {
  // Calculate total mastery percentage
  const totalMastery = vocabList.length > 0
    ? Math.round(vocabList.reduce((acc, curr) => acc + curr.masteryScore, 0) / vocabList.length)
    : 0;

  const masteredCount = vocabList.filter(v => v.masteryScore >= 80).length;
  const inProgressCount = vocabList.filter(v => v.masteryScore > 0 && v.masteryScore < 80).length;
  const unpracticedCount = vocabList.filter(v => v.attemptsCount === 0).length;

  // Breakdown by word type (Nouns & Verbs)
  const nouns = vocabList.filter(v => v.type === 'noun' || v.gender);
  const verbs = vocabList.filter(v => v.type === 'verb');
  const irregularVerbs = vocabList.filter(v => v.type === 'verb' && v.isIrregular);

  const calcMastery = (items: VocabItem[]) => {
    if (items.length === 0) return 0;
    return Math.round(items.reduce((acc, curr) => acc + curr.masteryScore, 0) / items.length);
  };

  const nounMastery = calcMastery(nouns);
  const verbMastery = calcMastery(verbs);
  const irregularVerbMastery = calcMastery(irregularVerbs);

  // Words needing practice sorted by lowest score or attempts
  const wordsNeedingReview = [...vocabList]
    .sort((a, b) => a.masteryScore - b.masteryScore)
    .slice(0, 6);

  return (
    <div className="space-y-8 max-w-4xl mx-auto dir-ltr">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-extrabold mb-3 border border-blue-200 dark:border-blue-800">
            <BarChart3 className="w-4 h-4" />
            <span>Training Statistics & Progress</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            German Mastery Level (A1)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Track your vocabulary and grammar retention through interactive performance indicators.
          </p>
        </div>

        <button
          onClick={onNavigateToQuiz}
          className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0"
        >
          <BrainCircuit className="w-4 h-4" />
          <span>Start Practice Session</span>
        </button>
      </div>

      {/* OVERALL MASTERY PROGRESS BAR SECTION */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-lg border border-indigo-900/50 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span>Overall Mastery Index</span>
            </h3>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              Word mastery is based on correct practice responses and active usage.
            </p>
          </div>

          <div className="text-left">
            <span className="text-3xl sm:text-4xl font-black text-amber-400">{totalMastery}%</span>
            <span className="text-xs text-slate-400 block font-bold">Overall Level</span>
          </div>
        </div>

        {/* Big Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold text-slate-300">
            <span>Progress Towards 100% Mastery</span>
            <span>{masteredCount} of {vocabList.length} words mastered</span>
          </div>
          <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 rounded-full transition-all duration-700 shadow-sm"
              style={{ width: `${totalMastery}%` }}
            />
          </div>
        </div>

        {/* Status Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 text-center">
            <span className="text-xs text-slate-400 block font-semibold">Mastered Words (≥80%)</span>
            <span className="text-xl font-black text-emerald-400">{masteredCount} words</span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 text-center">
            <span className="text-xs text-slate-400 block font-semibold">In Progress</span>
            <span className="text-xl font-black text-amber-400">{inProgressCount} words</span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 text-center col-span-2 sm:col-span-1">
            <span className="text-xs text-slate-400 block font-semibold">Unpracticed</span>
            <span className="text-xl font-black text-slate-300">{unpracticedCount} words</span>
          </div>
        </div>
      </div>

      {/* MASTERY BY WORD TYPE BREAKDOWN */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <span>Mastery Breakdown by Vocabulary Category</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Nouns */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2.5 py-1 rounded-lg">
                Nouns
              </span>
              <span className="text-sm font-black text-slate-900 dark:text-white">{nounMastery}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${nounMastery}%` }}
              />
            </div>
            <div className="space-y-1 text-xs font-semibold pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                <span>Practiced Words:</span>
                <span>{nouns.filter(n => n.correctCount > 0 || n.masteryScore >= 60).length} of {nouns.length} nouns</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Mastered (≥80%):</span>
                <span>{nouns.filter(n => n.masteryScore >= 80).length}</span>
              </div>
            </div>
          </div>

          {/* Verbs */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-lg">
                Verbs
              </span>
              <span className="text-sm font-black text-slate-900 dark:text-white">{verbMastery}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                style={{ width: `${verbMastery}%` }}
              />
            </div>
            <div className="space-y-1 text-xs font-semibold pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                <span>Practiced Words:</span>
                <span>{verbs.filter(v => v.correctCount > 0 || v.masteryScore >= 60).length} of {verbs.length} verbs</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Mastered (≥80%):</span>
                <span>{verbs.filter(v => v.masteryScore >= 80).length}</span>
              </div>
            </div>
          </div>

          {/* Irregular Verbs */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-2.5 py-1 rounded-lg">
                Irregular Verbs
              </span>
              <span className="text-sm font-black text-slate-900 dark:text-white">{irregularVerbMastery}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${irregularVerbMastery}%` }}
              />
            </div>
            <div className="space-y-1 text-xs font-semibold pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                <span>Practiced Words:</span>
                <span>{irregularVerbs.filter(iv => iv.correctCount > 0 || iv.masteryScore >= 60).length} of {irregularVerbs.length} irregular verbs</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Mastered (≥80%):</span>
                <span>{irregularVerbs.filter(iv => iv.masteryScore >= 80).length}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* RECOMMENDED WORDS FOR PRACTICE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <span>Recommended Words for Review</span>
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              Words with lower mastery scores in your practice records
            </p>
          </div>

          <button
            onClick={onNavigateToQuiz}
            className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>Practice Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {wordsNeedingReview.map(item => (
            <div
              key={item.id}
              className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between"
            >
              <div>
                <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {item.gender ? `${item.gender} ` : ''}{item.word}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {item.translationAr}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <AudioPlayer text={item.word} size="sm" />
                <span className="text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800">
                  {item.masteryScore}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
