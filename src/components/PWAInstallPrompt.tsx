import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Check, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem('pwa_prompt_dismissed') === 'true';
  });

  useEffect(() => {
    // Check if already in standalone / installed mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(iosDevice);

    // Listen for beforeinstallprompt event (Android / Desktop Chrome / Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosGuide(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (isInstalled || isDismissed) {
    return null;
  }

  // If no deferred prompt and not iOS, don't display
  if (!deferredPrompt && !isIos) {
    return null;
  }

  return (
    <>
      {/* Floating Install Banner */}
      <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-md z-50 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700/80 animate-bounce-short">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 text-blue-400 rounded-xl border border-blue-500/40 shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                <span>تثبيت تطبيق Deutschmeister</span>
              </h4>
              <p className="text-xs text-slate-300 font-medium mt-0.5 leading-snug">
                ثبّت التطبيق على هاتفك لاستخدامه بدون إنترنت وبسرعة فائقة!
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
            title="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={handleInstallClick}
            className="flex-1 py-2 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer border border-blue-400/30"
          >
            <Download className="w-4 h-4" />
            <span>{isIos ? 'تعليمات التثبيت (iOS)' : 'تثبيت الآن'}</span>
          </button>
          <button
            onClick={handleDismiss}
            className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer border border-slate-700"
          >
            لاحقاً
          </button>
        </div>
      </div>

      {/* iOS Instruction Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-6 rounded-3xl max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 text-right space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-600" />
                <span>طريقة التثبيت على iPhone / iPad</span>
              </h3>
              <button
                onClick={() => setShowIosGuide(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <ol className="space-y-3 text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed list-decimal list-inside">
              <li className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center gap-2">
                <Share className="w-4 h-4 text-blue-500 shrink-0" />
                <span>اضغط على زر <strong>مشاركة (Share)</strong> أسفل الشاشة في Safari.</span>
              </li>
              <li className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>اختر <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong>.</span>
              </li>
              <li className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center gap-2">
                <Download className="w-4 h-4 text-purple-500 shrink-0" />
                <span>اضغط <strong>إضافة (Add)</strong> في أعلى الزاوية.</span>
              </li>
            </ol>

            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 bg-blue-600 text-white font-black text-xs rounded-xl shadow-md hover:bg-blue-700 transition-all cursor-pointer"
            >
              فهمت ذلك
            </button>
          </div>
        </div>
      )}
    </>
  );
};
