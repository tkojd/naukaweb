import { describe, it, expect } from 'vitest';
import { createReviewState, LEITNER } from '../docs/js/logic/models.js';
import {
  schedule,
  dueItems,
  intervalDays,
  intervalMillis,
  DEFAULT_INTERVALS_DAYS,
  MILLIS_PER_DAY
} from '../docs/js/logic/srs.js';

const NOW = 1_000_000_000_000;

describe('interval table', () => {
  it('matches the exact Leitner day intervals {1:1,2:2,3:4,4:7,5:15}', () => {
    expect(DEFAULT_INTERVALS_DAYS[1]).toBe(1);
    expect(DEFAULT_INTERVALS_DAYS[2]).toBe(2);
    expect(DEFAULT_INTERVALS_DAYS[3]).toBe(4);
    expect(DEFAULT_INTERVALS_DAYS[4]).toBe(7);
    expect(DEFAULT_INTERVALS_DAYS[5]).toBe(15);
  });

  it('converts days to millis', () => {
    expect(MILLIS_PER_DAY).toBe(86_400_000);
    expect(intervalDays(3)).toBe(4);
    expect(intervalMillis(3)).toBe(4 * MILLIS_PER_DAY);
    expect(intervalMillis(5)).toBe(15 * MILLIS_PER_DAY);
  });
});

describe('schedule - correct answers', () => {
  it('promotes the box, increments the streak, and lengthens the interval', () => {
    const s = createReviewState('color_czerwony');
    const next = schedule(s, true, NOW);
    expect(next.box).toBe(2);
    expect(next.correctStreak).toBe(1);
    expect(next.lastReviewedMillis).toBe(NOW);
    // box 2 => 2 days
    expect(next.dueTimestampMillis).toBe(NOW + 2 * MILLIS_PER_DAY);
  });

  it('due timestamp always equals now + interval of the resulting box', () => {
    let state = createReviewState('x');
    const expectedByBox = { 2: 2, 3: 4, 4: 7, 5: 15 };
    for (const box of [2, 3, 4, 5]) {
      state = schedule(state, true, NOW);
      expect(state.box).toBe(box);
      expect(state.dueTimestampMillis).toBe(NOW + expectedByBox[box] * MILLIS_PER_DAY);
    }
  });

  it('never exceeds box 5 after repeated correct answers but keeps counting the streak', () => {
    let state = createReviewState('x');
    for (let i = 0; i < 20; i++) {
      state = schedule(state, true, NOW);
    }
    expect(state.box).toBe(LEITNER.LAST);
    expect(state.box).toBe(5);
    expect(state.correctStreak).toBe(20);
    // at box 5 the interval is the 15-day cap
    expect(state.dueTimestampMillis).toBe(NOW + 15 * MILLIS_PER_DAY);
  });

  it('does not mutate the input state (pure)', () => {
    const s = createReviewState('immutable');
    const before = { ...s };
    schedule(s, true, NOW);
    expect(s).toEqual(before);
  });
});

describe('schedule - wrong answers', () => {
  it('resets to box 1 and resets the streak, rescheduling with the box-1 interval', () => {
    let state = createReviewState('y');
    // climb to box 4 first
    state = schedule(state, true, NOW);
    state = schedule(state, true, NOW);
    state = schedule(state, true, NOW);
    expect(state.box).toBe(4);
    expect(state.correctStreak).toBe(3);

    const wrong = schedule(state, false, NOW);
    expect(wrong.box).toBe(1);
    expect(wrong.correctStreak).toBe(0);
    expect(wrong.lastReviewedMillis).toBe(NOW);
    expect(wrong.dueTimestampMillis).toBe(NOW + 1 * MILLIS_PER_DAY);
  });
});

describe('dueItems', () => {
  it('filters out items due in the future and keeps those due now or earlier', () => {
    const states = [
      { itemId: 'a', box: 1, dueTimestampMillis: NOW - 10 },
      { itemId: 'b', box: 2, dueTimestampMillis: NOW },
      { itemId: 'c', box: 3, dueTimestampMillis: NOW + 10 }
    ];
    const due = dueItems(states, NOW);
    expect(due.map((s) => s.itemId)).toEqual(['a', 'b']);
  });

  it('orders most-overdue-first, tie-breaking by box then itemId', () => {
    const states = [
      { itemId: 'z', box: 2, dueTimestampMillis: NOW - 5 },
      { itemId: 'a', box: 2, dueTimestampMillis: NOW - 5 }, // same due & box -> itemId tiebreak
      { itemId: 'q', box: 1, dueTimestampMillis: NOW - 5 }, // same due, lower box first
      { itemId: 'w', box: 5, dueTimestampMillis: NOW - 100 } // most overdue first
    ];
    const due = dueItems(states, NOW);
    expect(due.map((s) => s.itemId)).toEqual(['w', 'q', 'a', 'z']);
  });

  it('does not mutate the input array', () => {
    const states = [
      { itemId: 'b', box: 1, dueTimestampMillis: NOW - 1 },
      { itemId: 'a', box: 1, dueTimestampMillis: NOW - 2 }
    ];
    const snapshot = states.map((s) => s.itemId);
    dueItems(states, NOW);
    expect(states.map((s) => s.itemId)).toEqual(snapshot);
  });
});

describe('multi-round convergence', () => {
  it('a run of correct answers converges to box 5 and stays there', () => {
    let state = createReviewState('converge');
    const boxes = [];
    for (let i = 0; i < 8; i++) {
      state = schedule(state, true, NOW);
      boxes.push(state.box);
    }
    // 2,3,4,5 then capped at 5 thereafter
    expect(boxes).toEqual([2, 3, 4, 5, 5, 5, 5, 5]);
  });
});
