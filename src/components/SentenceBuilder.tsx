import React, { useState, useEffect } from 'react';
import { VocabItem, SentenceTask, SentenceEvaluationResult } from '../types';
import { AudioPlayer } from './AudioPlayer';
import {
  PenTool,
  Sparkles,
  Send,
  RotateCw,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Award,
  HelpCircle,
  ChevronRight
} from 'lucide-react';

interface SentenceBuilderProps {
  vocabList: VocabItem[];
  onUpdateVocabMastery: (id: string, delta: number) => void;
}

export const SentenceBuilder: React.FC<SentenceBuilderProps> = ({
  vocabList,
  onUpdateVocabMastery,
}) => {
  // Sort vocab list by lowest mastery score first
  const lowMasteryList = [...vocabList].sort((a, b) => a.masteryScore - b.masteryScore);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [task, setTask] = useState<SentenceTask | null>(null);
  const [isTaskLoading, setIsTaskLoading] = useState(false);
  const [userGermanInput, setUserGermanInput] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<SentenceEvaluationResult | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  const activeWord = lowMasteryList[currentIndex] || vocabList[0];

  // Listen to header dropdown actions
  useEffect(() => {
    const handleSentenceReset = () => {
      setUserGermanInput('');
      setEvaluation(null);
      if (activeWord) {
        loadSentenceTaskForWord(activeWord);
      }
    };
    window.addEventListener('app:sentences-reset', handleSentenceReset);
    return () => {
      window.removeEventListener('app:sentences-reset', handleSentenceReset);
    };
  }, [activeWord]);

  // Fetch or generate a sentence translation task for the target word
  const loadSentenceTaskForWord = async (word: VocabItem) => {
    setIsTaskLoading(true);
    setEvaluation(null);
    setUserGermanInput('');

    try {
      const res = await fetch('/api/sentences/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetWord: word }),
      });

      if (res.ok) {
        const data = await res.json();
        setTask({
          id: `task_${word.id}__${Date.now()}`,
          targetWord: word,
          sentenceEn: data.sentenceEn || `Translate a sentence using "${word.word}"`,
          sentenceAr: data.sentenceAr || `Translation helper: ${word.translationEn || word.translationAr}`,
          suggestedKeywordsDe: data.suggestedKeywordsDe || [],
          grammarHintAr: data.grammarHintAr || 'Pay attention to German word order and conjugations.',
        });
      } else {
        throw new Error('Failed to generate sentence');
      }
    } catch (err) {
      console.warn('Falling back to local default example:', err);
      // Fallback if network or AI service fails
      setTask({
        id: `task_fallback_${word.id}`,
        targetWord: word,
        sentenceEn: word.exampleDe ? `Please translate: "${word.exampleDe}"` : `Use the word "${word.word}" in a simple sentence.`,
        sentenceAr: `Translation: ${word.translationEn || word.translationAr}`,
        suggestedKeywordsDe: [word.word],
        grammarHintAr: 'Place the word in its correct grammatical position in the sentence.',
      });
    } finally {
      setIsTaskLoading(false);
    }
  };

  useEffect(() => {
    if (activeWord) {
      loadSentenceTaskForWord(activeWord);
    }
  }, [currentIndex]);

  const handleNextWord = () => {
    setCurrentIndex(prev => (prev + 1) % lowMasteryList.length);
  };

  const handleSubmitTranslation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userGermanInput.trim() || isEvaluating || !activeWord || !task) return;

    setIsEvaluating(true);

    try {
      const res = await fetch('/api/sentences/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetWord: activeWord,
          sentenceEn: task.sentenceEn,
          userGerman: userGermanInput.trim(),
        }),
      });

      if (res.ok) {
        const evalData: SentenceEvaluationResult = await res.json();
        setEvaluation(evalData);

        // Update mastery score for this word
        if (typeof evalData.masteryDelta === 'number') {
          onUpdateVocabMastery(activeWord.id, evalData.masteryDelta);
        }
      } else {
        throw new Error('Evaluation failed');
      }
    } catch (err) {
      console.error('Error evaluating sentence:', err);
      // Local fallback evaluation
      const isGood = userGermanInput.toLowerCase().includes(activeWord.word.toLowerCase());
      const fallbackEval: SentenceEvaluationResult = {
        isCorrect: isGood,
        accuracyScore: isGood ? 85 : 40,
        correctedGerman: activeWord.exampleDe || `${activeWord.word} ...`,
        feedbackAr: isGood ? 'Great job! The target word was used correctly in the sentence.' : 'Try to include the target word correctly in the sentence.',
        grammarNotesAr: 'Ensure the verb is in the second position and articles are correct.',
        masteryDelta: isGood ? 15 : -5,
      };
      setEvaluation(fallbackEval);
      onUpdateVocabMastery(activeWord.id, fallbackEval.masteryDelta);
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto dir-ltr">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold border border-emerald-200 dark:border-emerald-800">
            <PenTool className="w-4 h-4" />
            <span>German Sentence Practice</span>
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2">
          German Sentence Builder & Translation
        </h2>
      </div>

      {/* MAIN SENTENCE PRACTICE CARD */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-md space-y-6">
        
        {isTaskLoading ? (
          <div className="py-12 text-center space-y-3">
            <RotateCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500">Generating sentence task with AI...</p>
          </div>
        ) : task ? (
          <>
            {/* Task Banner */}
            <div className="space-y-3 bg-blue-50/70 dark:bg-blue-950/40 p-5 rounded-2xl border border-blue-200/80 dark:border-blue-900/60">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-black text-blue-900 dark:text-blue-300">
                  Task: Translate the following sentence into German:
                </span>
              </div>

              {/* English Sentence */}
              <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-blue-100 dark:border-blue-900/50 space-y-1">
                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">English Sentence:</div>
                <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                  "{task.sentenceEn}"
                </div>
              </div>

              {/* Suggested Keywords & Grammar Hint */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                {task.suggestedKeywordsDe && task.suggestedKeywordsDe.length > 0 && (
                  <div className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-300">
                    <span>German Keywords:</span>
                    <div className="flex gap-1">
                      {task.suggestedKeywordsDe.map((kw, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-black text-slate-800 dark:text-slate-200">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {task.grammarHintAr && (
                  <div className="flex items-center gap-1 text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950 px-2.5 py-1 rounded-lg font-bold border border-amber-200 dark:border-amber-800 text-[11px]">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Grammar Hint: {task.grammarHintAr}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Translation Input Form */}
            <form onSubmit={handleSubmitTranslation} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-2">
                  Write your full German sentence translation here:
                </label>
                <textarea
                  rows={3}
                  value={userGermanInput}
                  onChange={e => setUserGermanInput(e.target.value)}
                  placeholder="e.g. Ich bleibe heute zu Hause..."
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-slate-400 font-medium">
                  Ensure correct word order and articles in your sentence.
                </span>

                <button
                  type="submit"
                  disabled={isEvaluating || !userGermanInput.trim()}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl text-xs sm:text-sm cursor-pointer transition-all disabled:opacity-40 flex items-center gap-2 shadow-md shrink-0"
                >
                  {isEvaluating ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      <span>Evaluating Sentence...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Translation</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Evaluation Result */}
            {evaluation && (
              <div className={`p-6 rounded-3xl border space-y-4 animate-fade-in ${
                evaluation.isCorrect
                  ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100'
                  : 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-100'
              }`}>
                {/* Status Bar */}
                <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    {evaluation.isCorrect ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
                    )}
                    <div>
                      <h4 className="text-sm font-black">
                        {evaluation.isCorrect ? 'Excellent translation & correct grammar!' : 'Grammar feedback & suggestions available'}
                      </h4>
                      <p className="text-xs opacity-80 font-medium">
                        Instant evaluation to build sentence construction skills.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xs">
                      Accuracy: {evaluation.accuracyScore}%
                    </span>
                  </div>
                </div>

                {/* Corrected German Sentence */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-500 dark:text-slate-400">
                      Ideal German Sentence:
                    </span>
                    <AudioPlayer text={evaluation.correctedGerman} size="sm" />
                  </div>
                  <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    "{evaluation.correctedGerman}"
                  </div>
                </div>

                {/* Detailed Feedback */}
                <div className="space-y-2 text-xs font-medium">
                  <div className="font-extrabold flex items-center gap-1.5 text-slate-900 dark:text-white">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Feedback & Notes:</span>
                  </div>
                  <p className="leading-relaxed bg-white/60 dark:bg-slate-900/60 p-3 rounded-xl border border-black/5 dark:border-white/5">
                    {evaluation.feedbackAr}
                  </p>

                  {evaluation.grammarNotesAr && (
                    <div className="p-3 bg-amber-100/60 dark:bg-amber-900/40 rounded-xl border border-amber-200/60 dark:border-amber-800/60 text-amber-900 dark:text-amber-200">
                      💡 <strong>Grammar Note:</strong> {evaluation.grammarNotesAr}
                    </div>
                  )}
                </div>

                {/* Mastery Score Updated Message */}
                <div className="flex items-center justify-between pt-2 border-t border-black/10 dark:border-white/10 text-xs font-bold">
                  <span className="flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-500" />
                    <span>Mastery Impact:</span>
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                    evaluation.masteryDelta > 0
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  }`}>
                    {evaluation.masteryDelta > 0 ? `+${evaluation.masteryDelta}% Mastery` : `${evaluation.masteryDelta}%`}
                  </span>
                </div>
              </div>
            )}

            {/* Bottom Carousel Action */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Click to practice the next sentence</span>
              <button
                onClick={handleNextWord}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs cursor-pointer inline-flex items-center gap-2 shadow-sm transition-all"
              >
                <span>Next Sentence</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : null}

      </div>

    </div>
  );
};
