// Pure, framework-free domain models ported from the Android app's domain layer
// (ReviewState.kt and LearningModule.kt). No DOM/browser globals so this imports
// cleanly under Node (Vitest) as well as in the browser.

/**
 * The four learning modules offered by the app.
 * Mirrors LearningModule.kt.
 */
export const LEARNING_MODULES = Object.freeze({
  COLORS: 'COLORS',
  POLISH_LETTERS: 'POLISH_LETTERS',
  NUMBERS: 'NUMBERS',
  ENGLISH: 'ENGLISH'
});

/**
 * The five Leitner boxes (levels 1..5). Box 1 holds fragile items (reviewed most
 * often); box 5 holds mastered items (reviewed rarely). Mirrors LeitnerBox in
 * ReviewState.kt.
 */
export const LEITNER = Object.freeze({
  FIRST: 1,
  LAST: 5,
  /** Return the box level for the given `level`, clamping out-of-range values to 1..5. */
  ofLevel(level) {
    if (level < LEITNER.FIRST) return LEITNER.FIRST;
    if (level > LEITNER.LAST) return LEITNER.LAST;
    return level;
  }
});

/**
 * Factory for a fresh review state for a single learning item.
 * Mirrors the default ReviewState in ReviewState.kt.
 *
 * @param {string} itemId the id of the learning item this state tracks.
 * @returns {{itemId:string, box:number, dueTimestampMillis:number, lastReviewedMillis:(number|null), correctStreak:number}}
 */
export function createReviewState(itemId) {
  return {
    itemId,
    box: LEITNER.FIRST,
    dueTimestampMillis: 0,
    lastReviewedMillis: null,
    correctStreak: 0
  };
}
