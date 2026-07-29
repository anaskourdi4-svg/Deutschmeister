import React, { useState } from 'react';
import { AudioPlayer } from './AudioPlayer';
import { BookOpen, GraduationCap } from 'lucide-react';

export const GrammarCheatsheet: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'gender' | 'verbs'>('gender');

  return (
    <div className="space-y-6 dir-ltr">
      
      {/* Tab Switcher Header */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('gender')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'gender'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Noun Genders & Rules (der / die / das)</span>
        </button>

        <button
          onClick={() => setActiveTab('verbs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'verbs'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Verb Conjugations (Starke & Schwache Verben)</span>
        </button>
      </div>

      {/* Tab 1: Gender der/die/das Rules */}
      {activeTab === 'gender' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-blue-600" />
              <span>How to determine German noun genders by word endings:</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              
              {/* DIE (Feminin) */}
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xl font-black text-rose-700 dark:text-rose-300">die</span>
                  <span className="text-xs font-bold bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100 px-2.5 py-0.5 rounded-full">
                    Feminine (100% Rule)
                  </span>
                </div>
                <p className="text-xs text-rose-900 dark:text-rose-200 font-semibold leading-relaxed">
                  Nouns with these endings are <strong>always die</strong>:
                </p>
                <ul className="text-xs space-y-1.5 font-mono text-rose-950 dark:text-rose-200">
                  <li>-ung: die Zeitung, die Wohnung</li>
                  <li>-heit: die Freiheit, die Krankheit</li>
                  <li>-keit: die Möglichkeit</li>
                  <li>-schaft: die Freundschaft</li>
                  <li>-ei: die Bäckerei</li>
                  <li>-ion: die Station</li>
                  <li>-tät: die Universität</li>
                </ul>
              </div>

              {/* DER (Maskulin) */}
              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xl font-black text-blue-700 dark:text-blue-300">der</span>
                  <span className="text-xs font-bold bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-100 px-2.5 py-0.5 rounded-full">
                    Masculine (Mostly)
                  </span>
                </div>
                <p className="text-xs text-blue-900 dark:text-blue-200 font-semibold leading-relaxed">
                  Nouns with these endings or male roles are <strong>der</strong>:
                </p>
                <ul className="text-xs space-y-1.5 font-mono text-blue-950 dark:text-blue-200">
                  <li>-ling: der Lehrling</li>
                  <li>-or: der Motor, der Doktor</li>
                  <li>-ismus: der Optimismus</li>
                  <li>-er (Persons): der Lehrer, der Tischler</li>
                  <li>Days/Months/Seasons: der Montag, der Juli, der Sommer</li>
                </ul>
              </div>

              {/* DAS (Neutral) */}
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xl font-black text-emerald-700 dark:text-emerald-300">das</span>
                  <span className="text-xs font-bold bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 px-2.5 py-0.5 rounded-full">
                    Neuter
                  </span>
                </div>
                <p className="text-xs text-emerald-900 dark:text-emerald-200 font-semibold leading-relaxed">
                  Diminutives, infinitives used as nouns, and languages are <strong>das</strong>:
                </p>
                <ul className="text-xs space-y-1.5 font-mono text-emerald-950 dark:text-emerald-200">
                  <li>-chen: das Mädchen, das Brötchen</li>
                  <li>-lein: das Fräulein</li>
                  <li>-ment: das Instrument</li>
                  <li>-um: das Museum, das Zentrum</li>
                  <li>Languages: das Deutsch, das Arabisch</li>
                </ul>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Irregular Verbs (Starke Verben) */}
      {activeTab === 'verbs' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-600" />
            <span>Important Irregular Verbs (Starke Verben)</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-extrabold border-b border-emerald-200 dark:border-emerald-800">
                  <th className="p-3">Verb (Infinitiv)</th>
                  <th className="p-3">Present (er/sie/es)</th>
                  <th className="p-3">Past (Präteritum)</th>
                  <th className="p-3">Perfect (Perfekt)</th>
                  <th className="p-3">English Translation</th>
                  <th className="p-3 text-center">Audio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-800 dark:text-slate-200">
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="p-3 font-bold text-emerald-600">sehen</td>
                  <td className="p-3 text-rose-600">sieht (e→ie)</td>
                  <td className="p-3">sah</td>
                  <td className="p-3 text-emerald-600 font-bold">hat gesehen</td>
                  <td className="p-3 font-sans">to see / watch</td>
                  <td className="p-3 text-center"><AudioPlayer text="sehen" size="sm" /></td>
                </tr>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="p-3 font-bold text-emerald-600">fahren</td>
                  <td className="p-3 text-rose-600">fährt (a→ä)</td>
                  <td className="p-3">fuhr</td>
                  <td className="p-3 text-emerald-600 font-bold">ist gefahren</td>
                  <td className="p-3 font-sans">to drive / travel</td>
                  <td className="p-3 text-center"><AudioPlayer text="fahren" size="sm" /></td>
                </tr>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="p-3 font-bold text-emerald-600">sprechen</td>
                  <td className="p-3 text-rose-600">spricht (e→i)</td>
                  <td className="p-3">sprach</td>
                  <td className="p-3 text-emerald-600 font-bold">hat gesprochen</td>
                  <td className="p-3 font-sans">to speak</td>
                  <td className="p-3 text-center"><AudioPlayer text="sprechen" size="sm" /></td>
                </tr>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="p-3 font-bold text-emerald-600">essen</td>
                  <td className="p-3 text-rose-600">isst (e→i)</td>
                  <td className="p-3">aß</td>
                  <td className="p-3 text-emerald-600 font-bold">hat gegessen</td>
                  <td className="p-3 font-sans">to eat</td>
                  <td className="p-3 text-center"><AudioPlayer text="essen" size="sm" /></td>
                </tr>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="p-3 font-bold text-emerald-600">schlafen</td>
                  <td className="p-3 text-rose-600">schläft (a→ä)</td>
                  <td className="p-3">schlief</td>
                  <td className="p-3 text-emerald-600 font-bold">hat geschlafen</td>
                  <td className="p-3 font-sans">to sleep</td>
                  <td className="p-3 text-center"><AudioPlayer text="schlafen" size="sm" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
