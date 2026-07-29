import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface AudioPlayerProps {
  text: string;
  lang?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  text,
  lang = 'de-DE',
  size = 'md',
  className = '',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const speak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!text || !text.trim()) return;

    if (!('speechSynthesis' in window)) {
      alert('المتصفح لا يدعم نطق الصوت المباشر.');
      return;
    }

    try {
      window.speechSynthesis.cancel(); // cancel any ongoing speech
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utterance = new SpeechSynthesisUtterance(text.trim());
      utterance.lang = lang;
      utterance.rate = 0.9; // Slightly slower for language learners

      // Try to get German voice
      const voices = window.speechSynthesis.getVoices();
      const germanVoice = voices.find(v => v.lang.startsWith('de'));
      if (germanVoice) {
        utterance.voice = germanVoice;
      }

      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('Audio playback error:', err);
      setIsPlaying(false);
    }
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const buttonPaddings = {
    sm: 'p-1',
    md: 'p-1.5',
    lg: 'p-2',
  };

  return (
    <button
      onClick={speak}
      title="استمع للنطق الألماني"
      type="button"
      className={`inline-flex items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 transition-colors dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 ${buttonPaddings[size]} ${className}`}
    >
      {isPlaying ? (
        <VolumeX className={`${iconSizes[size]} animate-pulse text-emerald-600`} />
      ) : (
        <Volume2 className={iconSizes[size]} />
      )}
    </button>
  );
};
