// Pure consecutive-day review streak logic ported from the Android app's
// ReviewStreak.kt. Deterministic (the "current day" is passed in as an epoch day) and
// free of DOM/browser globals.

/** Milliseconds in a day, for converting an epoch-millis clock to an epoch day. */
export const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Convert an epoch-millis timestamp to a whole epoch day (floor division).
 * @param {number} nowMillis epoch millis.
 * @returns {number} days since the Unix epoch.
 */
export function epochDayOf(nowMillis) {
  return Math.floor(nowMillis / MILLIS_PER_DAY);
}

/**
 * Fold a new review recorded on `todayEpochDay` into the `previous` streak:
 * - same day as the last review -> unchanged (min 1).
 * - next day (exactly one day later) -> increment by one.
 * - a gap of two or more days (or the first-ever review) -> reset to 1.
 * A review appearing before the recorded last day is treated as a fresh streak (1).
 *
 * @param {{currentStreakDays:number, lastReviewEpochDay:(number|null)}} previous
 * @param {number} todayEpochDay
 * @returns {{currentStreakDays:number, lastReviewEpochDay:number}}
 */
export function onReview(previous, todayEpochDay) {
  const last = previous.lastReviewEpochDay;
  const current = previous.currentStreakDays;
  let newStreak;
  if (last == null) {
    newStreak = 1;
  } else if (todayEpochDay === last) {
    newStreak = Math.max(current, 1);
  } else if (todayEpochDay === last + 1) {
    newStreak = current + 1;
  } else {
    newStreak = 1;
  }
  return { currentStreakDays: newStreak, lastReviewEpochDay: todayEpochDay };
}
