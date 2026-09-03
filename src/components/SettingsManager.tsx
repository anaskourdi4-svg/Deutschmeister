import React from 'react';
import { QuizQuestionSettings, DEFAULT_QUIZ_SETTINGS } from '../types';
import { Sliders, RotateCcw, Pencil } from 'lucide-react';

interface SettingsManagerProps {
  quizSettings: QuizQuestionSettings;
  onUpdateQuizSettings: (newSettings: QuizQuestionSettings) => void;
}

interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  activeColor?: string;
  ariaLabel?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  activeColor = 'bg-blue-600',
  ariaLabel,
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      dir="ltr"
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-blue-500/40 select-none ${
        checked ? activeColor : 'bg-slate-300 dark:bg-slate-700'
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
};

export const SettingsManager: React.FC<SettingsManagerProps> = ({
  quizSettings,
  onUpdateQuizSettings,
}) => {

  const toggleSetting = (
    category: keyof QuizQuestionSettings,
    field: string
  ) => {
    const categoryObj = (quizSettings[category] || {}) as Record<string, boolean | undefined>;
    const currentVal = categoryObj[field] !== false;
    const updatedCategory = {
      ...categoryObj,
      [field]: !currentVal,
    };

    onUpdateQuizSettings({
      ...quizSettings,
      [category]: updatedCategory,
    });
  };

  const toggleCardOption = (field: 'showEditButton') => {
    const currentVal = quizSettings.cardOptions?.[field] !== false;
    onUpdateQuizSettings({
      ...quizSettings,
      cardOptions: {
        ...quizSettings.cardOptions,
        [field]: !currentVal,
      },
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
              Question & Practice Settings
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            Customize practice questions, grammatical exercises, and flashcard controls.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetToDefaults}
          className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black transition-all cursor-pointer flex items-center gap-2 shrink-0 border border-slate-200 dark:border-slate-700"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset to Defaults</span>
        </button>
      </div>

      {/* Grid of Word Type & Feature Settings */}
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
                  Practice questions for German nouns
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {/* English Translation */}
            <div 
              onClick={() => toggleSetting('nouns', 'translation')}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all cursor-pointer select-none"
            >
              <div className="flex-1 min-w-0 pr-3">
                <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                  1. English Translation
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Multiple choice translation options
                </div>
              </div>
              <ToggleSwitch
                checked={quizSettings.nouns?.translation !== false}
                onChange={() => toggleSetting('nouns', 'translation')}
                activeColor="bg-blue-600"
                ariaLabel="Noun English Translation"
              />
            </div>

            {/* Article */}
            <div 
              onClick={() => toggleSetting('nouns', 'article')}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all cursor-pointer select-none"
            >
              <div className="flex-1 min-w-0 pr-3">
                <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                  2. Grammatical Article
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Select article (der / das / die)
                </div>
              </div>
              <ToggleSwitch
                checked={quizSettings.nouns?.article !== false}
                onChange={() => toggleSetting('nouns', 'article')}
                activeColor="bg-blue-600"
                ariaLabel="Noun Grammatical Article"
              />
            </div>

            {/* Plural Form */}
            <div 
              onClick={() => toggleSetting('nouns', 'plural')}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all cursor-pointer select-none"
            >
              <div className="flex-1 min-w-0 pr-3">
                <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                  3. Plural Form
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Enter plural form (e.g. die Tische)
                </div>
              </div>
              <ToggleSwitch
                checked={quizSettings.nouns?.plural !== false}
                onChange={() => toggleSetting('nouns', 'plural')}
                activeColor="bg-blue-600"
                ariaLabel="Noun Plural Form"
              />
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
                  Practice questions for German verbs
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {/* English Translation */}
            <div 
              onClick={() => toggleSetting('verbs', 'translation')}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all cursor-pointer select-none"
            >
              <div className="flex-1 min-w-0 pr-3">
                <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                  1. English Translation
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Multiple choice translation options
                </div>
              </div>
              <ToggleSwitch
                checked={quizSettings.verbs?.translation !== false}
                onChange={() => toggleSetting('verbs', 'translation')}
                activeColor="bg-emerald-600"
                ariaLabel="Verb English Translation"
              />
            </div>

            {/* Present 3rd Person */}
            <div 
              onClick={() => toggleSetting('verbs', 'present3rd')}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all cursor-pointer select-none"
            >
              <div className="flex-1 min-w-0 pr-3">
                <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                  2. Present 3rd Person (er/sie/es)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  e.g. sieht, fährt
                </div>
              </div>
              <ToggleSwitch
                checked={quizSettings.verbs?.present3rd !== false}
                onChange={() => toggleSetting('verbs', 'present3rd')}
                activeColor="bg-emerald-600"
                ariaLabel="Verb Present 3rd Person"
              />
            </div>

            {/* Past Tense / Präteritum */}
            <div 
              onClick={() => toggleSetting('verbs', 'praeteritum')}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all cursor-pointer select-none"
            >
              <div className="flex-1 min-w-0 pr-3">
                <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                  3. Past Tense (Präteritum)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  e.g. sah, ging
                </div>
              </div>
              <ToggleSwitch
                checked={quizSettings.verbs?.praeteritum !== false}
                onChange={() => toggleSetting('verbs', 'praeteritum')}
                activeColor="bg-emerald-600"
                ariaLabel="Verb Präteritum"
              />
            </div>

            {/* Perfect Tense / Perfekt */}
            <div 
              onClick={() => toggleSetting('verbs', 'perfekt')}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all cursor-pointer select-none"
            >
              <div className="flex-1 min-w-0 pr-3">
                <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                  4. Perfect Tense (Perfekt)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  e.g. hat gesehen, ist gefahren
                </div>
              </div>
              <ToggleSwitch
                checked={quizSettings.verbs?.perfekt !== false}
                onChange={() => toggleSetting('verbs', 'perfekt')}
                activeColor="bg-emerald-600"
                ariaLabel="Verb Perfekt"
              />
            </div>

            {/* Preposition & Case */}
            <div 
              onClick={() => toggleSetting('verbs', 'prepositionCase')}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all cursor-pointer select-none"
            >
              <div className="flex-1 min-w-0 pr-3">
                <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                  5. Preposition & Grammatical Case
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  e.g. sich kümmern + um (+ Akkusativ)
                </div>
              </div>
              <ToggleSwitch
                checked={quizSettings.verbs?.prepositionCase !== false}
                onChange={() => toggleSetting('verbs', 'prepositionCase')}
                activeColor="bg-emerald-600"
                ariaLabel="Verb Preposition and Case"
              />
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
                  Practice questions for German adjectives
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {/* Antonym */}
            <div 
              onClick={() => toggleSetting('adjectives', 'antonym')}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all cursor-pointer select-none"
            >
              <div className="flex-1 min-w-0 pr-3">
                <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                  1. Antonym (Opposite)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Select opposite word (e.g. groß ↔ klein)
                </div>
              </div>
              <ToggleSwitch
                checked={quizSettings.adjectives?.antonym !== false}
                onChange={() => toggleSetting('adjectives', 'antonym')}
                activeColor="bg-amber-600"
                ariaLabel="Adjective Antonym"
              />
            </div>

            {/* Translation */}
            <div 
              onClick={() => toggleSetting('adjectives', 'translation')}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all cursor-pointer select-none"
            >
              <div className="flex-1 min-w-0 pr-3">
                <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                  2. English Translation
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Multiple choice translation options
                </div>
              </div>
              <ToggleSwitch
                checked={quizSettings.adjectives?.translation !== false}
                onChange={() => toggleSetting('adjectives', 'translation')}
                activeColor="bg-amber-600"
                ariaLabel="Adjective Translation"
              />
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
                  Practice questions for German expressions
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {/* Translation */}
            <div 
              onClick={() => toggleSetting('expressions', 'translation')}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all cursor-pointer select-none"
            >
              <div className="flex-1 min-w-0 pr-3">
                <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                  1. English Translation / Meaning
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Multiple choice translation for expressions
                </div>
              </div>
              <ToggleSwitch
                checked={quizSettings.expressions?.translation !== false}
                onChange={() => toggleSetting('expressions', 'translation')}
                activeColor="bg-purple-600"
                ariaLabel="Expression Translation"
              />
            </div>

            {/* Preposition & Case */}
            <div 
              onClick={() => toggleSetting('expressions', 'prepositionCase')}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all cursor-pointer select-none"
            >
              <div className="flex-1 min-w-0 pr-3">
                <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                  2. Preposition & Grammatical Case
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Select preposition & case used in expression
                </div>
              </div>
              <ToggleSwitch
                checked={quizSettings.expressions?.prepositionCase !== false}
                onChange={() => toggleSetting('expressions', 'prepositionCase')}
                activeColor="bg-purple-600"
                ariaLabel="Expression Preposition and Case"
              />
            </div>
          </div>
        </div>

        {/* 5. Others & Connectors Settings */}
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
            {/* Translation */}
            <div 
              onClick={() => toggleSetting('others', 'translation')}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all cursor-pointer select-none"
            >
              <div className="flex-1 min-w-0 pr-3">
                <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                  1. English Translation
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Multiple choice translation options
                </div>
              </div>
              <ToggleSwitch
                checked={quizSettings.others?.translation !== false}
                onChange={() => toggleSetting('others', 'translation')}
                activeColor="bg-slate-600"
                ariaLabel="Other Words Translation"
              />
            </div>
          </div>
        </div>

        {/* 6. Practice Card Actions (Simplified) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-black text-xs flex items-center justify-center">
                <Pencil className="w-3.5 h-3.5" />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Practice Card Actions
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Quick buttons on flashcards
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {/* Edit Word Button */}
            <div 
              onClick={() => toggleCardOption('showEditButton')}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all cursor-pointer select-none"
            >
              <div className="flex-1 min-w-0 pr-3">
                <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                  Edit Word Button
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Show pen icon on cards to edit words
                </div>
              </div>
              <ToggleSwitch
                checked={quizSettings.cardOptions?.showEditButton !== false}
                onChange={() => toggleCardOption('showEditButton')}
                activeColor="bg-blue-600"
                ariaLabel="Edit Word Button"
              />
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
