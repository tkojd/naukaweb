// Pure gamification rules ported from the Android app's Gamification.kt: awarding
// points for answers, converting a lesson score into a star rating, and evaluating
// which badges are newly earned. Deterministic and free of DOM/browser globals.

import { LEARNING_MODULES } from './models.js';

/** Points granted for a correct answer before any streak bonus. */
export const BASE_POINTS_PER_CORRECT = 10;

/** Extra points per consecutive correct answer, capped by MAX_STREAK_BONUS. */
export const STREAK_BONUS_PER_STEP = 2;

/** Ceiling on the streak bonus so scoring stays gentle and predictable. */
export const MAX_STREAK_BONUS = 20;

/** Number of English words that must be mastered to earn the Poliglota badge. */
export const POLYGLOT_TARGET = 10;

/** Consecutive-day streak required for the "Tydzień Nauki" badge. */
export const WEEK_STREAK_DAYS = 7;

/** The top Leitner box; an item is "mastered" when it reaches this box. */
export const MASTERED_BOX = 5;

/**
 * Frozen mastery denominators for the module-mastery badges, pinned to the
 * ORIGINAL core set sizes shipped in v1 (10 basic colors, the 32 Polish letters,
 * the 10 digits 0-9). The content expansion grew some modules (e.g. colors 10 -> 20),
 * but the "Mistrz *" badges intentionally reward mastering the CORE set so a child
 * who mastered the original set keeps the badge and does not have to master every
 * later-added shade/extra to hold it. Callers pass these to evaluateBadges via
 * `snapshot.masteryTargetsByModule`; when a target is absent the evaluator falls
 * back to `snapshot.totalItemsByModule` (preserving legacy behavior for callers
 * that do not supply frozen targets).
 * @type {Readonly<Object<string, number>>}
 */
export const MODULE_MASTERY_TARGETS = Object.freeze({
  [LEARNING_MODULES.COLORS]: 10,
  [LEARNING_MODULES.POLISH_LETTERS]: 32,
  [LEARNING_MODULES.NUMBERS]: 10
});

/**
 * All badges the learner can earn, with their exact Polish display titles.
 * @type {ReadonlyArray<{id:string, title:string, description:string}>}
 */
export const BADGES = Object.freeze([
  { id: 'first_steps', title: 'Pierwsze Kroki', description: 'Pierwsza poprawna odpowiedź.' },
  { id: 'color_master', title: 'Mistrz Kolorów', description: 'Poznane wszystkie kolory.' },
  { id: 'letter_master', title: 'Mistrz Liter', description: 'Poznane wszystkie polskie litery.' },
  { id: 'number_master', title: 'Mistrz Cyfr', description: 'Poznane wszystkie cyfry.' },
  { id: 'polyglot', title: 'Poliglota', description: 'Opanowane 10 angielskich słów.' },
  { id: 'week_of_learning', title: 'Tydzień Nauki', description: 'Nauka przez 7 dni z rzędu.' }
]);

function badge(id) {
  return BADGES.find((b) => b.id === id);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Score a single answer. Points are never negative: a wrong answer yields zero points
 * and resets the streak (positive reinforcement, no shaming).
 *
 * @param {boolean} correct whether the answer was correct.
 * @param {number} currentStreak the learner's streak *before* this answer.
 * @returns {{pointsAwarded:number, newStreak:number}}
 */
export function awardForAnswer(correct, currentStreak) {
  if (!correct) return { pointsAwarded: 0, newStreak: 0 };
  const bonus = clamp(currentStreak * STREAK_BONUS_PER_STEP, 0, MAX_STREAK_BONUS);
  return {
    pointsAwarded: BASE_POINTS_PER_CORRECT + bonus,
    newStreak: currentStreak + 1
  };
}

/**
 * Convert a completed lesson into a 1..3 star rating based on the ratio of correct
 * answers. A lesson with no questions (or no correct answers) yields 0 stars.
 * >= 90% -> 3, >= 70% -> 2, > 0 -> 1.
 *
 * @param {number} correctAnswers number of correct answers.
 * @param {number} totalQuestions number of questions in the lesson.
 * @returns {number} 0..3 stars.
 */
export function starsForLesson(correctAnswers, totalQuestions) {
  if (totalQuestions <= 0 || correctAnswers <= 0) return 0;
  const ratio = correctAnswers / totalQuestions;
  if (ratio >= 0.9) return 3;
  if (ratio >= 0.7) return 2;
  return 1;
}

function moduleComplete(snapshot, module) {
  // Prefer a frozen mastery target (the original core-set size) when the caller
  // supplies one; otherwise fall back to the reported total item count so legacy
  // callers keep their behavior.
  const frozen = (snapshot.masteryTargetsByModule || {})[module];
  const total = frozen != null && frozen > 0
    ? frozen
    : (snapshot.totalItemsByModule || {})[module];
  if (total == null || total <= 0) return false;
  const done = (snapshot.completedItemsByModule || {})[module] || 0;
  return done >= total;
}

/**
 * Evaluate which badges are *newly* earned given the progress snapshot. Badges already
 * present in `snapshot.alreadyEarnedBadgeIds` are never returned, so callers can persist
 * exactly the deltas.
 *
 * @param {{
 *   totalCorrectAnswers?:number,
 *   completedItemsByModule?:Object,
 *   totalItemsByModule?:Object,
 *   englishWordsMastered?:number,
 *   reviewStreakDays?:number,
 *   alreadyEarnedBadgeIds?:Array<string>|Set<string>
 * }} snapshot
 * @returns {Array<{id:string, title:string, description:string}>} newly-earned badges.
 */
export function evaluateBadges(snapshot) {
  const earnedIds = [];

  if ((snapshot.totalCorrectAnswers || 0) >= 1) earnedIds.push('first_steps');

  if (moduleComplete(snapshot, LEARNING_MODULES.COLORS)) earnedIds.push('color_master');
  if (moduleComplete(snapshot, LEARNING_MODULES.POLISH_LETTERS)) earnedIds.push('letter_master');
  if (moduleComplete(snapshot, LEARNING_MODULES.NUMBERS)) earnedIds.push('number_master');

  if ((snapshot.englishWordsMastered || 0) >= POLYGLOT_TARGET) earnedIds.push('polyglot');
  if ((snapshot.reviewStreakDays || 0) >= WEEK_STREAK_DAYS) earnedIds.push('week_of_learning');

  const already = snapshot.alreadyEarnedBadgeIds instanceof Set
    ? snapshot.alreadyEarnedBadgeIds
    : new Set(snapshot.alreadyEarnedBadgeIds || []);

  return earnedIds.filter((id) => !already.has(id)).map((id) => badge(id));
}
