// Framework-free Web Audio API effect sounds. Small, pleasant, short oscillator tones
// used for positive feedback (correct answer, earned badge) - "z umiarem": quiet and
// brief so they stay gentle for young learners. Every entry point is a safe no-op when
// the Web Audio API is unavailable (e.g. under Node/Vitest) OR when audio is muted
// (reusing the same storage.isMuted() flag that gates speech.js). Nothing ever throws.
// No binary audio assets: all sounds are synthesized on the fly.

import { isMuted } from '../data/storage.js';

/** @returns {typeof AudioContext|null} the AudioContext constructor if available. */
function audioContextCtor() {
  try {
    if (typeof window === 'undefined') return null;
    return window.AudioContext || window.webkitAudioContext || null;
  } catch {
    return null;
  }
}

// Lazily created, shared context. Created/resumed only on a user gesture so autoplay
// policies do not block us and we avoid spinning one up under Node.
let ctx = null;

/** Get a running AudioContext, creating/resuming it lazily. Returns null on failure. */
function getContext() {
  const Ctor = audioContextCtor();
  if (!Ctor) return null;
  try {
    if (!ctx) ctx = new Ctor();
    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      // resume() returns a promise; we ignore it and let it settle in the background.
      ctx.resume().catch(() => {});
    }
    return ctx;
  } catch {
    return null;
  }
}

/**
 * Play a single short oscillator note through a gentle gain envelope.
 * @param {AudioContext} context
 * @param {number} freq frequency in Hz
 * @param {number} startAt absolute context time to start
 * @param {number} duration seconds
 * @param {number} peak peak gain (kept low for a quiet sound)
 * @param {OscillatorType} type waveform
 */
function playNote(context, freq, startAt, duration, peak = 0.12, type = 'sine') {
  try {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startAt);

    // Quick attack, smooth exponential release so notes never click or feel harsh.
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(startAt);
    osc.stop(startAt + duration + 0.02);
  } catch {
    /* never throw from a sound effect */
  }
}

/**
 * Guard shared by every effect: returns a running context only when audio is allowed
 * (Web Audio available and not muted), otherwise null so the caller no-ops.
 */
function readyContext() {
  try {
    if (isMuted()) return null;
  } catch {
    return null;
  }
  return getContext();
}

/** A soft rising two-note "ding" for a correct answer. Short and quiet. */
export function playCorrect() {
  const context = readyContext();
  if (!context) return;
  const now = context.currentTime;
  // E5 -> A5, a friendly little lift (~260ms total).
  playNote(context, 659.25, now, 0.14, 0.1, 'sine');
  playNote(context, 880.0, now + 0.12, 0.16, 0.1, 'sine');
}

/** A brief celebratory arpeggio for earning a badge (~330ms total). */
export function playBadge() {
  const context = readyContext();
  if (!context) return;
  const now = context.currentTime;
  // C5 - E5 - G5 - C6 rising major arpeggio, kept light with a triangle wave.
  playNote(context, 523.25, now, 0.12, 0.09, 'triangle');
  playNote(context, 659.25, now + 0.09, 0.12, 0.09, 'triangle');
  playNote(context, 783.99, now + 0.18, 0.12, 0.09, 'triangle');
  playNote(context, 1046.5, now + 0.27, 0.16, 0.1, 'triangle');
}

/** A tiny, very quiet tap/click for button feedback. Optional. */
export function playTap() {
  const context = readyContext();
  if (!context) return;
  const now = context.currentTime;
  playNote(context, 440.0, now, 0.06, 0.05, 'sine');
}
