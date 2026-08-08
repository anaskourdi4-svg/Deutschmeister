import React from 'react';
import { QuizQuestionSettings, DEFAULT_QUIZ_SETTINGS } from '../types';
import { Sliders, RotateCcw, Check, BookOpen, Layers, Type, Sparkles } from 'lucide-react';

interface SettingsManagerProps {
  quizSettings: QuizQuestionSettings;
  onUpdateQuizSettings: (newSettings: QuizQuestionSettings) => void;
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({
  quizSettings,
  onUpdateQuizSettings,
}) => {

  const toggleSetting = (
    category: keyof QuizQuestionSettings,
    field: string
  ) => {
    const categoryObj = quizSettings[category] as Record<string, boolean>;
    const updatedCategory = {
      ...categoryObj,
      [field]: !categoryObj[field],
    };

    onUpdateQuizSettings({
      ...quizSettings,
      [category]: updatedCategory,
    });
  };

  const handleResetToDefaults = () => {
    onUpdateQuizSettings(DEFAULT_QUIZ_SETTINGS);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in">
      
      {/* Top Banner / Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300">
              <Sliders className="w-6 h-6" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Question & Quiz Settings
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            Customize which questions and sub-questions are included during interactive practice sessions for each vocabulary type.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetToDefaults}
          className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black transition-all cursor-pointer flex items-center gap-2 shrink-0 border border-slate-200 dark:border-slate-700"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset Defaults</span>
        </button>
      </div>

      {/* Grid of Word Type Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* 1. Nouns Settings */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-black text-xs">
                N
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Nouns
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Practice questions for German Nouns
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {/* English Translation Option */}
            <div 
              onClick={() => toggleSetting('nouns', 'translation')}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all cursor-pointer"
            >
              <div>
                <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                  1. English Translation
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  3 options side-by-side multiple choice
                </div>
              </div>
              <div className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${quizSettings.nouns.translation ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${quizSettings.nouns.translation ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </div>

            {/* Article Option */}
            <div 
              onClick={() => toggleSetting('nouns', 'article')}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all cursor-pointer"
            >
              <div>
                <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                  2. Grammatical Article
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Select Article (der / das / die)
                </div>
              </div>
              <div className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${quizSettings.nouns.article ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${quizSettings.nouns.article ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </div>

            {/* Plural Form Option */}
            <div 
              onClick={() => toggleSetting('nouns', 'plural')}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all cursor-pointer"
            >
              <div>
                <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                  3. Plural Form
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Enter plural form (e.g. die Tische)
                </div>
              </div>
              <div className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${quizSettings.nouns.plural ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${quizSettings.nouns.plural ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </div>
          </div>
        </div>

        {/* 2. Verbs Settings */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-black text-xs">
                V
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Verbs
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Practice questions for German Verbs
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {/* English Translation Option */}
            <div 
              onClick={() => toggleSetting('verbs', 'translation')}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all cursor-pointer"
            >
              <div>
                <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                  1. English Translation
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  3 options side-by-side multiple choice
                </div>
              </div>
              <div className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${quizSettings.verbs.translation ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${quizSettings.verbs.translation ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </div>

            {/* Present 3rd Person Option */}
            <div 
              onClick={() => toggleSetting('verbs', 'present3rd')}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all cursor-pointer"
            >
              <div>
                <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                  2. Present 3rd Person (er/sie/es)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  e.g. sieht, fährt
                </div>
              </div>
              <div className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${quizSettings.verbs.present3rd ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${quizSettings.verbs.present3rd ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </div>

            {/* Past / Präteritum Option */}
            <div 
              onClick={() => toggleSetting('verbs', 'praeteritum')}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all cursor-pointer"
            >
              <div>
                <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                  3. Past Tense (Präteritum)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  e.g. sah, ging
                </div>
              </div>
              <div className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${quizSettings.verbs.praeteritum ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${quizSettings.verbs.praeteritum ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </div>

            {/* Perfect / Perfekt Option */}
            <div 
              onClick={() => toggleSetting('verbs', 'perfekt')}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all cursor-pointer"
            >
              <div>
                <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                  4. Perfect Tense (Perfekt)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  e.g. hat gesehen
                </div>
              </div>
              <div className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${quizSettings.verbs.perfekt ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${quizSettings.verbs.perfekt ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </div>

            {/* Preposition & Case Option for Verbs */}
            <div 
              onClick={() => toggleSetting('verbs', 'prepositionCase')}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all cursor-pointer"
            >
              <div>
                <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                  5. Preposition & Grammatical Case (حرف الجر والحالة الإعرابية)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  e.g. sich kümmern + um (+ Akkusativ)
                </div>
              </div>
              <div className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${(quizSettings.verbs.prepositionCase ?? true) ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${(quizSettings.verbs.prepositionCase ?? true) ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Adjectives Settings */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-black text-xs">
                Adj
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Adjectives
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Practice questions for German Adjectives
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {/* Antonym Option */}
            <div 
              onClick={() => toggleSetting('adjectives', 'antonym')}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all cursor-pointer"
            >
              <div>
                <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                  1. Antonym (Gegenteil)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Select Opposite Word (e.g. groß ↔ klein)
                </div>
              </div>
              <div className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${quizSettings.adjectives.antonym ? 'bg-amber-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${quizSettings.adjectives.antonym ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </div>

            {/* Translation Option */}
            <div 
              onClick={() => toggleSetting('adjectives', 'translation')}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all cursor-pointer"
            >
              <div>
                <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                  2. English Translation
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  3 choices multiple choice translation
                </div>
              </div>
              <div className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${quizSettings.adjectives.translation ? 'bg-amber-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${quizSettings.adjectives.translation ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </div>
          </div>
        </div>

        {/* 4. Expressions Settings */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-black text-xs">
                Expr
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Expressions & Phrases
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Practice questions for German Expressions
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {/* Translation Option */}
            <div 
              onClick={() => toggleSetting('expressions', 'translation')}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all cursor-pointer"
            >
              <div>
                <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                  1. English Translation / Meaning
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Multiple choice translation for expressions
                </div>
              </div>
              <div className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${(quizSettings.expressions?.translation ?? true) ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${(quizSettings.expressions?.translation ?? true) ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </div>

            {/* Preposition & Case Option */}
            <div 
              onClick={() => toggleSetting('expressions', 'prepositionCase')}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all cursor-pointer"
            >
              <div>
                <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                  2. Preposition & Grammatical Case (حرف الجر والحالة الإعرابية)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Select preposition & case used in expression
                </div>
              </div>
              <div className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${(quizSettings.expressions?.prepositionCase ?? true) ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${(quizSettings.expressions?.prepositionCase ?? true) ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </div>
          </div>
        </div>

        {/* 4. Others & Prepositions Settings */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-black text-xs">
                Etc
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Others & Connectors
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Practice questions for other word types
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {/* Translation Option */}
            <div 
              onClick={() => toggleSetting('others', 'translation')}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all cursor-pointer"
            >
              <div>
                <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                  1. English Translation
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  3 choices side-by-side multiple choice
                </div>
              </div>
              <div className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${quizSettings.others.translation ? 'bg-slate-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${quizSettings.others.translation ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
