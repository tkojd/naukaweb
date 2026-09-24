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

// --- start-of-utterance clipping fix ----------------------------------------
//
// Some browsers swallow the first phonemes of the very first spoken utterance
// (the user heard "asto" instead of "ciasto"). We PRIME the synthesizer once, on
// the first speak call, with a near-silent warm-up utterance so the audio engine
// is already running when the real utterance starts. We ALSO prepend a tiny
// leading pad (a thin space) to each utterance as a second line of defence, so
// the first real phoneme is never the first sample emitted.

let primed = false;

/** A zero-width-ish leading pad so the first real phoneme is not clipped. */
const LEADING_PAD = '\u2009'; // thin space: spoken as a micro-pause, not a word

/** Warm up speechSynthesis once so the first real utterance is not clipped. */
function prime() {
  if (primed) return;
  const s = synth();
  if (!s) return;
  try {
    const warm = new window.SpeechSynthesisUtterance(LEADING_PAD);
    warm.volume = 0; // silent
    warm.rate = 1;
    s.speak(warm);
    primed = true;
  } catch {
    /* ignore priming failures */
  }
}

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
    prime();
    s.cancel();
    const utterance = new window.SpeechSynthesisUtterance(`${LEADING_PAD}${String(text)}`);
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

/** @returns {boolean} true when the HTML Audio element is usable here. */
function canPlayAudio() {
  try {
    return typeof window !== 'undefined' && typeof window.Audio !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * Play a specific pre-recorded audio asset (e.g. a self-hosted English
 * pronunciation MP3/OGG), FALLING BACK to Web Speech when the asset is missing
 * or cannot be played. Mute-aware and a safe no-op under Node/Vitest.
 *
 * Usage: playAudioOrSpeak(item.audioSrc, item.prompt, 'en-US') - plays the real
 * recording if `url` is a non-empty string and playback starts; otherwise speaks
 * `fallbackText` in `fallbackLang` via speech synthesis.
 *
 * @param {string|null|undefined} url relative asset URL, or null when none.
 * @param {string} fallbackText text to speak when there is no playable asset.
 * @param {string} [fallbackLang] BCP-47 tag for the fallback (default en-US).
 * @returns {void}
 */
export function playAudioOrSpeak(url, fallbackText, fallbackLang = ENGLISH_LANG) {
  if (isMuted()) return;
  // No real asset, or no Audio support here: fall back to speech synthesis.
  if (!url || !String(url).trim() || !canPlayAudio()) {
    speak(fallbackText, fallbackLang);
    return;
  }
  try {
    const audio = new window.Audio(String(url));
    let fellBack = false;
    const fallback = () => {
      if (fellBack) return;
      fellBack = true;
      speak(fallbackText, fallbackLang);
    };
    // If the file fails to load/decode, fall back to synthesis.
    audio.addEventListener('error', fallback, { once: true });
    const started = audio.play();
    // audio.play() returns a promise in modern browsers; a rejection (e.g. the
    // file is unreachable or autoplay blocked outside a gesture) triggers fallback.
    if (started && typeof started.then === 'function') {
      started.catch(fallback);
    }
  } catch {
    // Constructing/playing threw: fall back to synthesis.
    speak(fallbackText, fallbackLang);
  }
}

/**
 * Convenience for English content: play the recording at `url` (relative asset
 * path) or fall back to English speech synthesis of `word`.
 * @param {string|null|undefined} url
 * @param {string} word English word/phrase to speak on fallback.
 */
export function playEnglishAudio(url, word) {
  playAudioOrSpeak(url, word, ENGLISH_LANG);
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
