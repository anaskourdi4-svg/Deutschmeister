import React, { useState, useEffect, useRef } from 'react';
import { VocabItem, ChatMessage, VocabType, GrammaticalGender } from '../types';
import { AudioPlayer } from './AudioPlayer';
import { Sparkles, Send, RefreshCw, CheckCircle2, XCircle, Lightbulb, GraduationCap, Award, HelpCircle, ArrowRight } from 'lucide-react';

let globalMsgCounter = 0;
const makeMsgId = (prefix: string) => {
  globalMsgCounter += 1;
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${globalMsgCounter}`;
};

interface AiChatTrainerProps {
  vocabList: VocabItem[];
  onUpdateVocabMastery: (id: string, delta: number) => void;
}

export const AiChatTrainer: React.FC<AiChatTrainerProps> = ({
  vocabList,
  onUpdateVocabMastery,
}) => {
  const [filterType, setFilterType] = useState<VocabType | 'all'>('all');
  const [currentTargetWord, setCurrentTargetWord] = useState<VocabItem | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [selectedGender, setSelectedGender] = useState<GrammaticalGender | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [generalQuestion, setGeneralQuestion] = useState('');
  const [isAskingGeneral, setIsAskingGeneral] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitializedRef = useRef(false);

  // Auto scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Listen to header dropdown actions
  useEffect(() => {
    const handleResetChat = () => {
      setMessages([]);
      hasInitializedRef.current = false;
    };
    const handleSetFilter = (e: Event) => {
      const custom = e as CustomEvent<VocabType | 'all'>;
      if (custom.detail) {
        setFilterType(custom.detail);
        pickRandomWord(custom.detail);
      }
    };
    window.addEventListener('app:reset-chat', handleResetChat);
    window.addEventListener('app:set-chat-filter', handleSetFilter);
    return () => {
      window.removeEventListener('app:reset-chat', handleResetChat);
      window.removeEventListener('app:set-chat-filter', handleSetFilter);
    };
  }, [vocabList]);

  // Select a random word based on filter type
  const pickRandomWord = (overrideType?: VocabType | 'all') => {
    const activeType = overrideType || filterType;
    let filtered = vocabList;
    if (activeType !== 'all') {
      filtered = vocabList.filter(v => v.type === activeType);
    }

    if (filtered.length === 0) {
      filtered = vocabList; // fallback
    }

    // Prioritize words with lower mastery scores
    filtered.sort((a, b) => a.masteryScore - b.masteryScore);
    const candidatePool = filtered.slice(0, Math.max(5, Math.floor(filtered.length * 0.4)));
    const selected = candidatePool[Math.floor(Math.random() * candidatePool.length)];

    setCurrentTargetWord(selected);
    setUserAnswer('');
    setSelectedGender(null);

    // Add AI message prompting the new word
    if (selected) {
      const promptText = getPromptForWord(selected);
      const newAiMsg: ChatMessage = {
        id: makeMsgId('msg_ai'),
        sender: 'ai',
        text: promptText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        targetWord: selected,
      };
      setMessages(prev => [...prev, newAiMsg]);
    }
  };

  // Generate question text depending on word type
  const getPromptForWord = (item: VocabItem): string => {
    switch (item.type) {
      case 'noun':
        return `Noun Test: What is the grammatical gender article (der, die, das) for "${item.word}", its plural form, and its English translation?`;
      case 'verb':
        return item.isIrregular
          ? `Irregular Verb Test: What is the meaning of "${item.word}"? Provide its conjugations for er/sie/es in Present, Past (Präteritum), and Perfect (Perfekt).`
          : `Verb Test: What is the meaning of "${item.word}" and how is it used in a sentence?`;
      default:
        return `What is the meaning of "${item.word}" and how is it used?`;
    }
  };

  // Trigger initial question on mount
  useEffect(() => {
    if (vocabList.length > 0 && messages.length === 0 && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      pickRandomWord();
    }
  }, [vocabList]);

  // Submit Answer to Gemini AI
  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTargetWord || isLoading) return;

    let finalAnswer = userAnswer.trim();
    if (selectedGender && currentTargetWord.type === 'noun') {
      finalAnswer = `${selectedGender} ${currentTargetWord.word} ${finalAnswer}`.trim();
    }

    if (!finalAnswer) return;

    // Append user message
    const userMsg: ChatMessage = {
      id: makeMsgId('msg_user'),
      sender: 'user',
      text: finalAnswer,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      targetWord: currentTargetWord,
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setUserAnswer('');

    try {
      const response = await fetch('/api/chat/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetWord: currentTargetWord,
          userAnswer: finalAnswer,
          questionType: currentTargetWord.type,
        }),
      });

      if (!response.ok) {
        throw new Error('AI evaluation failed');
      }

      const evalData = await response.json();

      // Update mastery score in global state
      if (evalData.masteryDelta) {
        onUpdateVocabMastery(currentTargetWord.id, evalData.masteryDelta);
      }

      // Add AI Response with Evaluation
      const aiResponseMsg: ChatMessage = {
        id: makeMsgId('msg_ai_eval'),
        sender: 'ai',
        text: evalData.nextQuestionText || evalData.feedbackAr,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        targetWord: currentTargetWord,
        evaluation: evalData,
      };

      setMessages(prev => [...prev, aiResponseMsg]);
    } catch (err: any) {
      console.error('Error evaluating answer:', err);
      // Fallback local evaluation
      const isGenderMatch = selectedGender === currentTargetWord.gender;
      const fallbackAiMsg: ChatMessage = {
        id: makeMsgId('msg_ai_fallback'),
        sender: 'ai',
        text: `Word: ${currentTargetWord.gender || ''} ${currentTargetWord.word} (${currentTargetWord.translationEn || currentTargetWord.translationAr})`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        targetWord: currentTargetWord,
        evaluation: {
          isCorrect: isGenderMatch,
          overallScore: isGenderMatch ? 80 : 40,
          feedbackAr: isGenderMatch
            ? `Great job! The correct article is ${currentTargetWord.gender}.`
            : `The correct article is ${currentTargetWord.gender || ''} ${currentTargetWord.word}.`,
          grammarTipAr: currentTargetWord.exampleDe ? `Example: ${currentTargetWord.exampleDe}` : undefined,
          masteryDelta: isGenderMatch ? 15 : -5,
        },
      };
      setMessages(prev => [...prev, fallbackAiMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Ask General Question to Gemini Coach
  const handleAskGeneralQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generalQuestion.trim() || isAskingGeneral) return;

    const qText = generalQuestion.trim();
    setGeneralQuestion('');

    const userMsg: ChatMessage = {
      id: makeMsgId('msg_user_gen'),
      sender: 'user',
      text: qText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsAskingGeneral(true);

    try {
      const response = await fetch('/api/chat/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: qText }),
      });

      const data = await response.json();

      const aiMsg: ChatMessage = {
        id: makeMsgId('msg_ai_gen'),
        sender: 'ai',
        text: data.text || 'AI explanation is currently unavailable.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAskingGeneral(false);
    }
  };

  return (
    <div className="space-y-6 dir-ltr">
      
      {/* Category Filter & Random Question Generator Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1.5">
              Select Vocabulary Type for Practice:
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => { setFilterType('all'); pickRandomWord('all'); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterType === 'all'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                🎲 All Vocabulary
              </button>
              <button
                onClick={() => { setFilterType('noun'); pickRandomWord('noun'); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterType === 'noun'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300'
                }`}
              >
                🟦 Nouns (der / die / das)
              </button>
              <button
                onClick={() => { setFilterType('verb'); pickRandomWord('verb'); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterType === 'verb'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950 dark:text-purple-300'
                }`}
              >
                🟩 Verbs (Verben)
              </button>
            </div>
          </div>

          <button
            onClick={() => pickRandomWord()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold text-xs shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>New Random Word 🎲</span>
          </button>

        </div>
      </div>

      {/* Main Target Word Testing Box */}
      {currentTargetWord && (
        <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-blue-700/50 relative overflow-hidden">
          
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-indigo-300 to-amber-400" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-blue-500/30 text-blue-200 border border-blue-400/30 uppercase tracking-wider">
                {currentTargetWord.type === 'noun' && 'Noun'}
                {currentTargetWord.type === 'verb' && 'Verb'}
                {currentTargetWord.type === 'adjective' && 'Adjective'}
                {currentTargetWord.type === 'preposition' && 'Preposition'}
                {currentTargetWord.type === 'adverb' && 'Adverb'}
              </span>

              <span className="text-xs text-blue-200/80 font-medium">
                Level: A1 • {currentTargetWord.category}
              </span>
            </div>

            <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-bold">
              <span className="text-slate-300">Mastery Score:</span>
              <span className="text-emerald-400 font-extrabold">{currentTargetWord.masteryScore}%</span>
            </div>
          </div>

          {/* Target Word Display */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/60 backdrop-blur-md p-5 rounded-2xl border border-white/10 mb-6">
            <div>
              <div className="text-xs text-blue-300 font-semibold mb-1">Target Practice Word:</div>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-black text-white tracking-wide">
                  {currentTargetWord.word}
                </span>
                <AudioPlayer text={currentTargetWord.word} size="lg" />
              </div>
              <p className="text-xs text-slate-300 mt-2 font-medium">
                Translation: <span className="text-amber-300 font-bold">{currentTargetWord.translationEn || currentTargetWord.translationAr}</span>
              </p>
            </div>

            <button
              onClick={() => pickRandomWord()}
              className="text-xs text-blue-200 hover:text-white flex items-center gap-1 underline self-end sm:self-center cursor-pointer"
            >
              <span>Skip word</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Article Buttons for Nouns */}
          {currentTargetWord.type === 'noun' && (
            <div className="mb-4">
              <label className="text-xs font-bold text-blue-200 block mb-2">
                Select Article (Grammatical Gender):
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedGender('der')}
                  className={`py-2.5 px-4 rounded-xl font-black text-sm transition-all border cursor-pointer ${
                    selectedGender === 'der'
                      ? 'bg-blue-500 text-white border-blue-300 ring-2 ring-blue-300/50 shadow-lg scale-102'
                      : 'bg-blue-950/60 text-blue-200 border-blue-800 hover:bg-blue-900/80'
                  }`}
                >
                  der (Masculine)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedGender('die')}
                  className={`py-2.5 px-4 rounded-xl font-black text-sm transition-all border cursor-pointer ${
                    selectedGender === 'die'
                      ? 'bg-rose-500 text-white border-rose-300 ring-2 ring-rose-300/50 shadow-lg scale-102'
                      : 'bg-rose-950/60 text-rose-200 border-rose-800 hover:bg-rose-900/80'
                  }`}
                >
                  die (Feminine)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedGender('das')}
                  className={`py-2.5 px-4 rounded-xl font-black text-sm transition-all border cursor-pointer ${
                    selectedGender === 'das'
                      ? 'bg-emerald-500 text-white border-emerald-300 ring-2 ring-emerald-300/50 shadow-lg scale-102'
                      : 'bg-emerald-950/60 text-emerald-200 border-emerald-800 hover:bg-emerald-900/80'
                  }`}
                >
                  das (Neuter)
                </button>
              </div>
            </div>
          )}

          {/* Text Input & Submit Form */}
          <form onSubmit={handleSubmitAnswer} className="space-y-3">
            <div>
              <label className="text-xs font-bold text-blue-200 block mb-1">
                {currentTargetWord.type === 'noun' && 'Enter plural form, translation or example sentence:'}
                {currentTargetWord.type === 'verb' && 'Enter conjugations, meaning or example sentence:'}
                {currentTargetWord.type === 'adjective' && 'Enter antonym or translation:'}
                {currentTargetWord.type === 'preposition' && 'Enter case (Akkusativ / Dativ) or translation:'}
                {currentTargetWord.type === 'adverb' && 'Enter translation or sentence:'}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userAnswer}
                  onChange={e => setUserAnswer(e.target.value)}
                  placeholder={
                    currentTargetWord.type === 'noun'
                      ? 'e.g. die Tische...'
                      : currentTargetWord.type === 'verb'
                      ? 'e.g. sieht / sah / hat gesehen'
                      : 'Enter your answer...'
                  }
                  className="w-full bg-slate-900/80 text-white placeholder-slate-400 px-4 py-3 rounded-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                />
                <button
                  type="submit"
                  disabled={isLoading || (currentTargetWord.type === 'noun' && !selectedGender && !userAnswer.trim())}
                  className="px-6 py-3 bg-amber-500 text-slate-950 hover:bg-amber-400 font-extrabold text-sm rounded-xl shadow-lg flex items-center gap-2 shrink-0 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isLoading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>Check Answer</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

        </div>
      )}

      {/* Chat Messages Stream & Instant AI Evaluation Cards */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs min-h-96 flex flex-col justify-between">
        
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              AI Tutor Feedback & Correction Log
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {messages.length} messages
          </span>
        </div>

        {/* Message Log */}
        <div className="space-y-4 mb-6">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3 animate-bounce" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                Click "New Random Word" to start practicing!
              </p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={`${msg.id}_${idx}`}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              {/* User Message Bubble */}
              {msg.sender === 'user' && (
                <div className="bg-blue-600 text-white px-4 py-2.5 rounded-2xl rounded-bl-xs text-sm font-bold max-w-lg shadow-xs">
                  {msg.text}
                </div>
              )}

              {/* AI Evaluation / Response Card */}
              {msg.sender === 'ai' && (
                <div className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 rounded-2xl p-4 space-y-3">
                  
                  {/* AI Evaluation Header */}
                  <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                        AI
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        DeutschMeister AI
                      </span>
                    </div>

                    {msg.evaluation && (
                      <div className="flex items-center gap-2">
                        {msg.evaluation.isCorrect ? (
                          <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-700 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Correct (100%)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-extrabold text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-300 px-2.5 py-1 rounded-full border border-amber-300">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Feedback</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* AI Text Output */}
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                    {msg.text}
                  </p>

                  {/* Structured Evaluation Breakdown */}
                  {msg.evaluation && (
                    <div className="space-y-3 pt-2">
                      
                      {/* Grammar Tip Box */}
                      {msg.evaluation.grammarTipAr && (
                        <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
                          <GraduationCap className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-extrabold block mb-0.5">Grammar Rule:</span>
                            <span>{msg.evaluation.grammarTipAr}</span>
                          </div>
                        </div>
                      )}

                      {/* Mnemonic Trick Box */}
                      {msg.evaluation.mnemonicTipAr && (
                        <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                          <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-extrabold block mb-0.5">Mnemonic Tip:</span>
                            <span>{msg.evaluation.mnemonicTipAr}</span>
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-3 p-4 bg-blue-50/60 dark:bg-slate-800 rounded-2xl border border-blue-100 dark:border-slate-700">
              <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
              <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
                AI Tutor is analyzing your answer...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Free-form Open Ask Box */}
        <form onSubmit={handleAskGeneralQuestion} className="border-t border-slate-100 dark:border-slate-800 pt-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={generalQuestion}
              onChange={e => setGeneralQuestion(e.target.value)}
              placeholder="Ask the AI Tutor any question about German grammar or vocabulary..."
              className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={isAskingGeneral || !generalQuestion.trim()}
              className="px-4 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:bg-slate-800 shrink-0 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isAskingGeneral ? 'Analyzing...' : 'Ask Tutor'}
            </button>
          </div>
        </form>

      </div>

    </div>
  );
};
