import { useEffect, useState } from 'react';

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      // منع العرض التلقائي للسماح لنا بالتحكم في متى نعرض prompt
      try {
        (e as any).preventDefault();
      } catch {}
      setDeferredPrompt(e);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler as EventListener);
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    try {
      (deferredPrompt as any).prompt();
      const choice = await (deferredPrompt as any).userChoice;
      console.log('PWA install choice:', choice);
    } catch (err) {
      console.warn('Install prompt failed:', err);
    } finally {
      setVisible(false);
      setDeferredPrompt(null);
    }
  };

  if (!visible) return null;

  return (
    <button
      onClick={install}
      aria-label="Install App"
      className="fixed right-4 bottom-4 z-[9999] px-4 py-2 rounded-md bg-slate-900 text-white shadow-lg"
    >
      تثبيت التطبيق
    </button>
  );
}
