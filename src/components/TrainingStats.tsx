import React from 'react';
import { VocabItem } from '../types';
import { checkIsIrregularVerb } from '../services/germanConjugator';
import {
  Award,
  AlertCircle,
  TrendingUp,
  ArrowRight,
  XCircle
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

  // Breakdown by word type
  const nouns = vocabList.filter(v => v.type === 'noun' || v.gender);
  const verbs = vocabList.filter(v => v.type === 'verb');
  const irregularVerbs = vocabList.filter(v => v.type === 'verb' && checkIsIrregularVerb(v));
  const adjectives = vocabList.filter(v => v.type === 'adjective');
  const expressions = vocabList.filter(v => v.type === 'expression');
  const others = vocabList.filter(v => v.type !== 'noun' && !v.gender && v.type !== 'verb' && v.type !== 'adjective' && v.type !== 'expression');

  const calcMastery = (items: VocabItem[]) => {
    if (items.length === 0) return 0;
    return Math.round(items.reduce((acc, curr) => acc + curr.masteryScore, 0) / items.length);
  };

  const nounMastery = calcMastery(nouns);
  const verbMastery = calcMastery(verbs);
  const irregularVerbMastery = calcMastery(irregularVerbs);
  const adjMastery = calcMastery(adjectives);
  const exprMastery = calcMastery(expressions);
  const othersMastery = calcMastery(others);

  // Words needing review sorted primarily by MOST WRONG ATTEMPTS (most frequent errors)
  const wordsNeedingReview = vocabList
    .map(item => {
      const attempts = item.attemptsCount || 0;
      const correct = item.correctCount || 0;
      const wrongAttempts = Math.max(0, attempts - correct);
      return { ...item, wrongAttempts };
    })
    .sort((a, b) => {
      // 1. Sort by wrong attempts descending (most errors first)
      if (b.wrongAttempts !== a.wrongAttempts) {
        return b.wrongAttempts - a.wrongAttempts;
      }
      // 2. Sort by mastery score ascending (lowest score first)
      if (a.masteryScore !== b.masteryScore) {
        return a.masteryScore - b.masteryScore;
      }
      // 3. Sort by total attempts descending
      return (b.attemptsCount || 0) - (a.attemptsCount || 0);
    })
    .filter(item => {
      // Include words with 2 or more wrong attempts
      return item.wrongAttempts >= 2;
    });

  // Handler to start practice session for words needing review
  const handlePracticeNow = () => {
    window.dispatchEvent(
      new CustomEvent('app:quiz-start-session', {
        detail: {
          count: 'all',
          wordType: 'all',
          level: 'all',
          hardWordsOnly: true,
          useSrs: false,
        },
      })
    );
    onNavigateToQuiz();
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto dir-ltr">

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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Nouns */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2.5 py-1 rounded-lg">
                Nouns
              </span>
              <span className="text-sm font-black text-slate-900 dark:text-white">{nounMastery}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
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
              <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2.5 py-1 rounded-lg">
                Irregular Verbs
              </span>
              <span className="text-sm font-black text-slate-900 dark:text-white">{irregularVerbMastery}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
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

          {/* Adjectives */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-2.5 py-1 rounded-lg">
                Adjectives
              </span>
              <span className="text-sm font-black text-slate-900 dark:text-white">{adjMastery}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-600 rounded-full transition-all duration-500"
                style={{ width: `${adjMastery}%` }}
              />
            </div>
            <div className="space-y-1 text-xs font-semibold pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                <span>Practiced Words:</span>
                <span>{adjectives.filter(a => a.correctCount > 0 || a.masteryScore >= 60).length} of {adjectives.length} adjectives</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Mastered (≥80%):</span>
                <span>{adjectives.filter(a => a.masteryScore >= 80).length}</span>
              </div>
            </div>
          </div>

          {/* Expressions */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 px-2.5 py-1 rounded-lg">
                Expressions
              </span>
              <span className="text-sm font-black text-slate-900 dark:text-white">{exprMastery}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-600 rounded-full transition-all duration-500"
                style={{ width: `${exprMastery}%` }}
              />
            </div>
            <div className="space-y-1 text-xs font-semibold pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                <span>Practiced Words:</span>
                <span>{expressions.filter(e => e.correctCount > 0 || e.masteryScore >= 60).length} of {expressions.length} expressions</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Mastered (≥80%):</span>
                <span>{expressions.filter(e => e.masteryScore >= 80).length}</span>
              </div>
            </div>
          </div>

          {/* Others */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                Others
              </span>
              <span className="text-sm font-black text-slate-900 dark:text-white">{othersMastery}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-600 rounded-full transition-all duration-500"
                style={{ width: `${othersMastery}%` }}
              />
            </div>
            <div className="space-y-1 text-xs font-semibold pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                <span>Practiced Words:</span>
                <span>{others.filter(o => o.correctCount > 0 || o.masteryScore >= 60).length} of {others.length} items</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Mastered (≥80%):</span>
                <span>{others.filter(o => o.masteryScore >= 80).length}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* RECOMMENDED WORDS FOR REVIEW */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <span>Recommended Words for Review</span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 text-xs font-black border border-amber-200 dark:border-amber-900">
                {wordsNeedingReview.length} words
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Words with 2 or more incorrect attempts during practice sessions (sorted by error count).
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-nowrap shrink-0">
            <button
              type="button"
              onClick={handlePracticeNow}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0"
            >
              <span>Practice Now</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>

        {wordsNeedingReview.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs font-semibold">
            🎉 Great job! No words currently require review (no words with 2 or more incorrect attempts).
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] uppercase font-black text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Word</th>
                  <th className="py-3 px-4">Translation</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-center">Practice Errors</th>
                  <th className="py-3 px-4 text-right">Mastery</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {wordsNeedingReview.map(item => {
                  const itemType = item.type === 'noun' || item.gender ? 'Noun'
                    : item.type === 'verb' ? 'Verb'
                    : item.type === 'adjective' ? 'Adjective'
                    : item.type === 'expression' ? 'Expression'
                    : 'Others';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2 dir-ltr">
                          <span>{item.gender ? `${item.gender} ` : ''}{item.word}</span>
                          <AudioPlayer text={item.word} size="sm" />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {item.translationEn || item.translationAr}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          title={itemType}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-black border truncate max-w-[130px] whitespace-nowrap inline-block align-middle ${
                            itemType === 'Noun' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-900' :
                            itemType === 'Verb' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900' :
                            itemType === 'Adjective' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-900' :
                            itemType === 'Expression' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-900' :
                            'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {itemType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black ${
                          item.wrongAttempts > 0
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {item.wrongAttempts > 0 && <XCircle className="w-3 h-3 text-rose-500" />}
                          <span>{item.wrongAttempts} {item.wrongAttempts === 1 ? 'error' : 'errors'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/80 px-2.5 py-1 rounded-xl border border-amber-200 dark:border-amber-800">
                          {item.masteryScore}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
