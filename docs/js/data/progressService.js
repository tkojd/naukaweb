// Records answers and exposes progress, porting the Android ProgressRepository. All
// learning rules are delegated to the pure FEAT-001 logic modules (srs, gamification,
// streak); this service only persists results (via storage.js) and assembles the
// ProgressSnapshot used for badge evaluation.

import { LEARNING_MODULES, createReviewState } from '../logic/models.js';
import { schedule, dueItems as srsDueItems } from '../logic/srs.js';
import {
  awardForAnswer,
  starsForLesson,
  evaluateBadges,
  MASTERED_BOX
} from '../logic/gamification.js';
import { epochDayOf, onReview } from '../logic/streak.js';
import { itemsFor } from '../logic/content.js';
import * as storage from './storage.js';

const ALL_MODULES = [
  LEARNING_MODULES.COLORS,
  LEARNING_MODULES.POLISH_LETTERS,
  LEARNING_MODULES.NUMBERS,
  LEARNING_MODULES.ENGLISH
];

/**
 * Record an answer for `item` by `profileId`, mirroring ProgressRepository.recordAnswer:
 *  1. advance the item's ReviewState via the Leitner scheduler and persist it,
 *  2. award points + streak bonus via gamification (no penalty for wrong answers),
 *  3. bump the module's aggregate progress (totalPoints, itemsCompleted),
 *  4. update the consecutive-day review streak,
 *  5. evaluate + persist any newly earned badges.
 *
 * @param {string} profileId
 * @param {object} item a learning item from the content catalog.
 * @param {boolean} correct
 * @param {number} now epoch millis.
 * @returns {{reviewState:object, pointsAwarded:number, newlyEarnedBadges:Array<object>}}
 */
export function recordAnswer(profileId, item, correct, now) {
  const previous = storage.getReviewState(profileId, item.id) || createReviewState(item.id);

  const updated = schedule(previous, correct, now);
  storage.upsertReviewState(profileId, updated, item.moduleType);

  const reward = awardForAnswer(correct, previous.correctStreak);

  const existingProgress = storage.getModuleProgress(profileId, item.moduleType);
  const itemsCompleted = countCompleted(profileId, item.moduleType);
  storage.upsertModuleProgress(profileId, item.moduleType, {
    itemsCompleted,
    totalPoints: (existingProgress?.totalPoints ?? 0) + reward.pointsAwarded,
    stars: existingProgress?.stars ?? 0
  });

  const streakDays = updateReviewStreak(profileId, now);
  const newBadges = evaluateAndPersistBadges(profileId, now, streakDays);

  return {
    reviewState: updated,
    pointsAwarded: reward.pointsAwarded,
    newlyEarnedBadges: newBadges
  };
}

/**
 * Items whose review is due at `now`, ordered by urgency (across all modules, like the
 * Android DAO). The lesson controller filters to the requested module.
 * @returns {Array<object>} due review states.
 */
export function dueItems(profileId, now) {
  return srsDueItems(storage.getAllReviewStates(profileId), now);
}

/** Persist a completed-lesson star rating for a module (keeps the best score achieved). */
export function recordLessonStars(profileId, module, correctAnswers, totalQuestions) {
  const stars = starsForLesson(correctAnswers, totalQuestions);
  const existing = storage.getModuleProgress(profileId, module);
  storage.upsertModuleProgress(profileId, module, {
    itemsCompleted: existing?.itemsCompleted ?? 0,
    totalPoints: existing?.totalPoints ?? 0,
    stars: Math.max(existing?.stars ?? 0, stars)
  });
}

// --- internals --------------------------------------------------------------

function countCompleted(profileId, module) {
  return storage
    .getAllReviewStates(profileId)
    .filter((s) => s.moduleType === module && s.box >= MASTERED_BOX).length;
}

function updateReviewStreak(profileId, now) {
  const today = epochDayOf(now);
  const updated = onReview(storage.getStreak(profileId), today);
  storage.setStreak(profileId, updated);
  return updated.currentStreakDays;
}

function evaluateAndPersistBadges(profileId, now, reviewStreakDays) {
  const already = storage.getEarnedBadgeIds(profileId);
  const reviewStates = storage.getAllReviewStates(profileId);

  const totalCorrect = reviewStates.reduce((sum, s) => sum + (s.correctStreak || 0), 0);

  const completedByModule = {};
  const totalByModule = {};
  for (const module of ALL_MODULES) {
    completedByModule[module] = reviewStates.filter(
      (s) => s.moduleType === module && s.box >= MASTERED_BOX
    ).length;
    totalByModule[module] = itemsFor(module).length;
  }

  const englishMastered = reviewStates.filter(
    (s) => s.moduleType === LEARNING_MODULES.ENGLISH && s.box >= MASTERED_BOX
  ).length;

  const snapshot = {
    totalCorrectAnswers: totalCorrect,
    completedItemsByModule: completedByModule,
    totalItemsByModule: totalByModule,
    englishWordsMastered: englishMastered,
    reviewStreakDays,
    alreadyEarnedBadgeIds: already
  };

  const newBadges = evaluateBadges(snapshot);
  for (const badge of newBadges) {
    storage.addBadge(profileId, badge.id, now);
  }
  return newBadges;
}
