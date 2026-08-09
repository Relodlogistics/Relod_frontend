'use client';

import { useCallback, useState } from 'react';

// The read-aloud voice is always English regardless of the app's UI
// language toggle — the two are independent settings on purpose. Most load
// data (place names, notes) is entered in English anyway, so switching the
// site's display language shouldn't also switch what the voice reads in.
const VOICE_LANG = 'en-IN';

export function useSpeak() {
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback(
    (text: string) => {
      if (!supported) return;

      const doSpeak = () => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = VOICE_LANG;

        // Voices load async on first use in most browsers — getVoices() can
        // return [] on the very first call, so a specific-language match
        // just silently falls back to the browser's default voice for
        // utterance.lang.
        const voices = window.speechSynthesis.getVoices();
        const match =
          voices.find((v) => v.lang === VOICE_LANG) ??
          voices.find((v) => v.lang.startsWith('en'));
        if (match) utterance.voice = match;

        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);

        setSpeaking(true);
        window.speechSynthesis.speak(utterance);
      };

      // Chrome (esp. on Windows) has a long-standing bug where speak()
      // called right after cancel() clips the first word or two of the new
      // utterance — the engine hasn't finished tearing down yet. Only
      // cancel (with a settle delay) when something is actually still
      // playing to interrupt; a fresh click with nothing active goes
      // straight to speak() so there's no cancel() to clip against at all.
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
        setTimeout(doSpeak, 150);
      } else {
        doSpeak();
      }
    },
    [supported],
  );

  return { speak, stop, speaking, supported };
}
