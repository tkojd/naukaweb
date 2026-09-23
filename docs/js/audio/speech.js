// Thin wrapper over the Web Speech API (window.speechSynthesis), the browser analogue
// of the Android app's SpeechManager. Speaks Polish content in pl-PL and English content
// in en-US, picking a matching voice when the browser exposes one. Every entry point is
// a safe no-op when speechSynthesis is unavailable (e.g. under Node/Vitest), so nothing
// ever throws. Honors a global mute toggle persisted via storage.js.

import { isMuted } from '../data/storage.js';

const POLISH_LANG = 'pl-PL';
const ENGLISH_LANG = 'en-US';

/** @returns {SpeechSynthesis|null} the synth if available in this environment. */
function synth() {
  try {
    if (typeof window !== 'undefined' && window.speechSynthesis) return window.speechSynthesis;
  } catch {
    /* accessing window may throw in some sandboxes */
  }
  return null;
}

let cachedVoices = [];

function refreshVoices() {
  const s = synth();
  if (!s) return;
  try {
    const voices = s.getVoices();
    if (voices && voices.length) cachedVoices = voices;
  } catch {
    /* ignore */
  }
}

// Voices may load asynchronously; listen for voiceschanged so we can match by language.
(function initVoices() {
  const s = synth();
  if (!s) return;
  refreshVoices();
  try {
    if (typeof s.addEventListener === 'function') {
      s.addEventListener('voiceschanged', refreshVoices);
    } else {
      s.onvoiceschanged = refreshVoices;
    }
  } catch {
    /* ignore */
  }
})();

/** Find the best voice for a BCP-47 language tag, or null if none match. */
function pickVoice(lang) {
  if (!cachedVoices.length) refreshVoices();
  const short = lang.slice(0, 2).toLowerCase();
  // Prefer an exact lang match, then any voice sharing the base language.
  return (
    cachedVoices.find((v) => v.lang && v.lang.toLowerCase() === lang.toLowerCase()) ||
    cachedVoices.find((v) => v.lang && v.lang.toLowerCase().replace('_', '-').startsWith(short)) ||
    null
  );
}

/**
 * Speak `text` in `lang`. Cancels any in-flight utterance first. No-op when speech is
 * unavailable, when muted, or when `text` is blank.
 * @param {string} text
 * @param {string} lang BCP-47 tag such as 'pl-PL' or 'en-US'.
 */
export function speak(text, lang) {
  const s = synth();
  if (!s) return;
  if (!text || !String(text).trim()) return;
  if (isMuted()) return;
  try {
    s.cancel();
    const utterance = new window.SpeechSynthesisUtterance(String(text));
    utterance.lang = lang;
    const voice = pickVoice(lang);
    if (voice) utterance.voice = voice;
    utterance.rate = 0.9; // a touch slower for young learners
    s.speak(utterance);
  } catch {
    /* never throw from speech */
  }
}

/** Speak Polish content (pl-PL). */
export function speakPolish(text) {
  speak(text, POLISH_LANG);
}

/** Speak English content (en-US). */
export function speakEnglish(text) {
  speak(text, ENGLISH_LANG);
}

/** Stop any current speech. Safe no-op when unavailable. */
export function stop() {
  const s = synth();
  if (!s) return;
  try {
    s.cancel();
  } catch {
    /* ignore */
  }
}
