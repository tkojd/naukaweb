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
 * Age levels used to gate difficulty and staged vocabulary.
 * EARLY covers ages 4-6 (simplest content, no reading required where possible),
 * LATE covers ages 7-10 (adds reading, phrases and simple sentences).
 *
 * Content items may carry an optional `level` field: either one of these values
 * or an array of them. Items with no level are treated as appropriate for BOTH
 * levels so that all pre-existing content keeps working unchanged.
 */
export const AGE_LEVELS = Object.freeze({
  EARLY: 'EARLY',
  LATE: 'LATE'
});

/**
 * Map a child's age to an age level.
 * @param {number} age the child's age in years.
 * @returns {'EARLY'|'LATE'} EARLY for ages <= 6, otherwise LATE.
 */
export function levelForAge(age) {
  return age <= 6 ? AGE_LEVELS.EARLY : AGE_LEVELS.LATE;
}

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
