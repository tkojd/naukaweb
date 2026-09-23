import { describe, it, expect } from 'vitest';
import { LEARNING_MODULES } from '../docs/js/logic/models.js';
import {
  awardForAnswer,
  starsForLesson,
  evaluateBadges,
  BADGES,
  BASE_POINTS_PER_CORRECT,
  STREAK_BONUS_PER_STEP,
  MAX_STREAK_BONUS,
  POLYGLOT_TARGET,
  WEEK_STREAK_DAYS,
  MASTERED_BOX
} from '../docs/js/logic/gamification.js';

describe('constants', () => {
  it('match the exact pedagogy values', () => {
    expect(BASE_POINTS_PER_CORRECT).toBe(10);
    expect(STREAK_BONUS_PER_STEP).toBe(2);
    expect(MAX_STREAK_BONUS).toBe(20);
    expect(POLYGLOT_TARGET).toBe(10);
    expect(WEEK_STREAK_DAYS).toBe(7);
    expect(MASTERED_BOX).toBe(5);
  });
});

describe('awardForAnswer', () => {
  it('awards 10 points for the first correct answer (streak 0)', () => {
    expect(awardForAnswer(true, 0)).toEqual({ pointsAwarded: 10, newStreak: 1 });
  });

  it('grows the bonus with the streak (streak 1 -> 12, streak 5 -> 20)', () => {
    expect(awardForAnswer(true, 1)).toEqual({ pointsAwarded: 12, newStreak: 2 });
    expect(awardForAnswer(true, 5)).toEqual({ pointsAwarded: 20, newStreak: 6 });
  });

  it('caps the bonus at 20 for high streaks', () => {
    // streak 10 => bonus would be 20, streak 15 => clamped to 20 as well
    expect(awardForAnswer(true, 10)).toEqual({ pointsAwarded: 30, newStreak: 11 });
    expect(awardForAnswer(true, 15)).toEqual({ pointsAwarded: 30, newStreak: 16 });
    expect(awardForAnswer(true, 100)).toEqual({ pointsAwarded: 30, newStreak: 101 });
  });

  it('gives 0 points and resets streak to 0 (never negative) on a wrong answer', () => {
    expect(awardForAnswer(false, 0)).toEqual({ pointsAwarded: 0, newStreak: 0 });
    expect(awardForAnswer(false, 7)).toEqual({ pointsAwarded: 0, newStreak: 0 });
  });
});

describe('starsForLesson', () => {
  it('gives 3 stars at >= 90%', () => {
    expect(starsForLesson(9, 10)).toBe(3);
    expect(starsForLesson(10, 10)).toBe(3);
  });

  it('gives 2 stars at >= 70% and < 90%', () => {
    expect(starsForLesson(7, 10)).toBe(2);
    expect(starsForLesson(8, 10)).toBe(2);
  });

  it('gives 1 star for any positive score below 70%', () => {
    expect(starsForLesson(1, 10)).toBe(1);
    expect(starsForLesson(6, 10)).toBe(1);
  });

  it('gives 0 stars for no correct answers or no questions', () => {
    expect(starsForLesson(0, 10)).toBe(0);
    expect(starsForLesson(0, 0)).toBe(0);
    expect(starsForLesson(5, 0)).toBe(0);
  });
});

describe('BADGES catalog', () => {
  it('has all six badges with exact Polish titles', () => {
    const byId = Object.fromEntries(BADGES.map((b) => [b.id, b.title]));
    expect(byId.first_steps).toBe('Pierwsze Kroki');
    expect(byId.color_master).toBe('Mistrz Kolorów');
    expect(byId.letter_master).toBe('Mistrz Liter');
    expect(byId.number_master).toBe('Mistrz Cyfr');
    expect(byId.polyglot).toBe('Poliglota');
    expect(byId.week_of_learning).toBe('Tydzień Nauki');
  });
});

describe('evaluateBadges', () => {
  const ids = (badges) => badges.map((b) => b.id);

  it('earns first_steps after the first correct answer', () => {
    expect(ids(evaluateBadges({ totalCorrectAnswers: 0 }))).toEqual([]);
    expect(ids(evaluateBadges({ totalCorrectAnswers: 1 }))).toContain('first_steps');
  });

  it('earns a module master only when that module is fully completed', () => {
    const partial = evaluateBadges({
      completedItemsByModule: { [LEARNING_MODULES.COLORS]: 9 },
      totalItemsByModule: { [LEARNING_MODULES.COLORS]: 10 }
    });
    expect(ids(partial)).not.toContain('color_master');

    const done = evaluateBadges({
      completedItemsByModule: { [LEARNING_MODULES.COLORS]: 10 },
      totalItemsByModule: { [LEARNING_MODULES.COLORS]: 10 }
    });
    expect(ids(done)).toContain('color_master');
  });

  it('uses a frozen mastery target when provided, ignoring the grown total', () => {
    // The colors catalog grew to 20, but the badge should be earned by mastering
    // the original core set of 10. A child with 10 mastered colors keeps the badge
    // even though totalItemsByModule now reports 20.
    const earned = evaluateBadges({
      completedItemsByModule: { [LEARNING_MODULES.COLORS]: 10 },
      totalItemsByModule: { [LEARNING_MODULES.COLORS]: 20 },
      masteryTargetsByModule: { [LEARNING_MODULES.COLORS]: 10 }
    });
    expect(ids(earned)).toContain('color_master');

    // Below the frozen target it is still not earned.
    const partial = evaluateBadges({
      completedItemsByModule: { [LEARNING_MODULES.COLORS]: 9 },
      totalItemsByModule: { [LEARNING_MODULES.COLORS]: 20 },
      masteryTargetsByModule: { [LEARNING_MODULES.COLORS]: 10 }
    });
    expect(ids(partial)).not.toContain('color_master');
  });

  it('does not earn a module master when totals are zero/missing', () => {
    const none = evaluateBadges({
      completedItemsByModule: { [LEARNING_MODULES.NUMBERS]: 0 },
      totalItemsByModule: { [LEARNING_MODULES.NUMBERS]: 0 }
    });
    expect(ids(none)).not.toContain('number_master');
  });

  it('earns polyglot only at 10 mastered English words', () => {
    expect(ids(evaluateBadges({ englishWordsMastered: 9 }))).not.toContain('polyglot');
    expect(ids(evaluateBadges({ englishWordsMastered: 10 }))).toContain('polyglot');
  });

  it('earns week_of_learning only at 7 consecutive review days', () => {
    expect(ids(evaluateBadges({ reviewStreakDays: 6 }))).not.toContain('week_of_learning');
    expect(ids(evaluateBadges({ reviewStreakDays: 7 }))).toContain('week_of_learning');
  });

  it('never re-earns an already-earned badge', () => {
    const earned = evaluateBadges({
      totalCorrectAnswers: 5,
      reviewStreakDays: 8,
      alreadyEarnedBadgeIds: ['first_steps']
    });
    expect(ids(earned)).not.toContain('first_steps');
    expect(ids(earned)).toContain('week_of_learning');
  });

  it('accepts alreadyEarnedBadgeIds as a Set as well as an array', () => {
    const earned = evaluateBadges({
      totalCorrectAnswers: 1,
      alreadyEarnedBadgeIds: new Set(['first_steps'])
    });
    expect(ids(earned)).toEqual([]);
  });
});
