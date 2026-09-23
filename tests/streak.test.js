import { describe, it, expect } from 'vitest';
import { onReview, epochDayOf, MILLIS_PER_DAY } from '../docs/js/logic/streak.js';

const EMPTY = { currentStreakDays: 0, lastReviewEpochDay: null };

describe('epochDayOf', () => {
  it('floor-divides millis into whole epoch days', () => {
    expect(MILLIS_PER_DAY).toBe(86_400_000);
    expect(epochDayOf(0)).toBe(0);
    expect(epochDayOf(MILLIS_PER_DAY - 1)).toBe(0);
    expect(epochDayOf(MILLIS_PER_DAY)).toBe(1);
    expect(epochDayOf(10 * MILLIS_PER_DAY + 500)).toBe(10);
  });
});

describe('onReview', () => {
  it('starts a fresh streak at 1 for the first-ever review', () => {
    const s = onReview(EMPTY, 100);
    expect(s).toEqual({ currentStreakDays: 1, lastReviewEpochDay: 100 });
  });

  it('leaves the streak unchanged for a same-day review (min 1)', () => {
    const prev = { currentStreakDays: 3, lastReviewEpochDay: 100 };
    const s = onReview(prev, 100);
    expect(s).toEqual({ currentStreakDays: 3, lastReviewEpochDay: 100 });
  });

  it('increments by one for a next-day review', () => {
    const prev = { currentStreakDays: 3, lastReviewEpochDay: 100 };
    const s = onReview(prev, 101);
    expect(s).toEqual({ currentStreakDays: 4, lastReviewEpochDay: 101 });
  });

  it('resets to 1 after a gap of two or more days', () => {
    const prev = { currentStreakDays: 5, lastReviewEpochDay: 100 };
    expect(onReview(prev, 102)).toEqual({ currentStreakDays: 1, lastReviewEpochDay: 102 });
    expect(onReview(prev, 110)).toEqual({ currentStreakDays: 1, lastReviewEpochDay: 110 });
  });

  it('treats a backwards clock as a fresh streak', () => {
    const prev = { currentStreakDays: 5, lastReviewEpochDay: 100 };
    expect(onReview(prev, 99)).toEqual({ currentStreakDays: 1, lastReviewEpochDay: 99 });
  });

  it('reaches 7 after seven consecutive days', () => {
    let state = EMPTY;
    for (let day = 100; day < 107; day++) {
      state = onReview(state, day);
    }
    expect(state.currentStreakDays).toBe(7);
    expect(state.lastReviewEpochDay).toBe(106);
  });
});
