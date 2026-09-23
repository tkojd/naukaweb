// Spaced-repetition scheduler using the Leitner box system (boxes 1..5), ported
// from the Android app's SpacedRepetitionScheduler.kt. Pure and deterministic:
// `now` is always passed in and a new review state is returned rather than mutating
// the input. No DOM/browser globals.

import { LEITNER } from './models.js';

/** Milliseconds in a day. */
export const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Default interval schedule (in days), one entry per Leitner box. The steps roughly
 * double, mirroring the expanding-interval spacing of the Ebbinghaus forgetting curve.
 */
export const DEFAULT_INTERVALS_DAYS = Object.freeze({
  1: 1,
  2: 2,
  3: 4,
  4: 7,
  5: 15
});

/**
 * The review interval for `box`, in whole days.
 * @param {number} box Leitner box level (1..5).
 * @param {object} [intervals] optional override map, defaults to DEFAULT_INTERVALS_DAYS.
 */
export function intervalDays(box, intervals = DEFAULT_INTERVALS_DAYS) {
  const value = intervals[box];
  return value != null ? value : DEFAULT_INTERVALS_DAYS[box];
}

/**
 * The review interval for `box`, in epoch millis.
 * @param {number} box Leitner box level (1..5).
 * @param {object} [intervals] optional override map.
 */
export function intervalMillis(box, intervals = DEFAULT_INTERVALS_DAYS) {
  return intervalDays(box, intervals) * MILLIS_PER_DAY;
}

function promote(box) {
  return box === LEITNER.LAST ? LEITNER.LAST : LEITNER.ofLevel(box + 1);
}

/**
 * Produce the next review state after the learner answered the item. Pure: returns a
 * new object and does not mutate `state`.
 *
 * - Correct -> promote to next box (capped at 5), increment correct streak, schedule
 *   the next review `now + interval(nextBox)`.
 * - Wrong -> demote to box 1 (shortest interval), reset streak; comes back soon.
 *
 * @param {object} state current review state.
 * @param {boolean} correct whether the answer was correct.
 * @param {number} now current time in epoch millis.
 * @param {object} [intervals] optional interval override map for testability.
 * @returns {object} a new review state.
 */
export function schedule(state, correct, now, intervals = DEFAULT_INTERVALS_DAYS) {
  let nextBox;
  let nextStreak;
  if (correct) {
    nextBox = promote(state.box);
    nextStreak = state.correctStreak + 1;
  } else {
    nextBox = LEITNER.FIRST;
    nextStreak = 0;
  }
  return {
    ...state,
    box: nextBox,
    correctStreak: nextStreak,
    lastReviewedMillis: now,
    dueTimestampMillis: now + intervalMillis(nextBox, intervals)
  };
}

/**
 * Return the states that are due for review at `now` (due timestamp <= now), ordered
 * so the most overdue items come first, tie-broken by box level then item id.
 *
 * @param {Array<object>} states review states.
 * @param {number} now current time in epoch millis.
 * @returns {Array<object>} due states (a new array; input is not mutated).
 */
export function dueItems(states, now) {
  return states
    .filter((s) => s.dueTimestampMillis <= now)
    .slice()
    .sort((a, b) => {
      if (a.dueTimestampMillis !== b.dueTimestampMillis) {
        return a.dueTimestampMillis - b.dueTimestampMillis;
      }
      if (a.box !== b.box) return a.box - b.box;
      if (a.itemId < b.itemId) return -1;
      if (a.itemId > b.itemId) return 1;
      return 0;
    });
}
