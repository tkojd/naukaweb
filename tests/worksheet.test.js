import { describe, it, expect } from 'vitest';
import { buildWorksheet } from '../docs/js/logic/worksheet.js';
import { LEARNING_MODULES, AGE_LEVELS } from '../docs/js/logic/models.js';
import { itemsForCategory, categoriesFor } from '../docs/js/logic/content.js';

/**
 * A deterministic pseudo-random generator (mulberry32) so every test run
 * produces identical worksheets. Returns floats in [0,1).
 */
function makeRng(seed = 12345) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('buildWorksheet - question count', () => {
  it('returns exactly the requested number of exercises', () => {
    for (const count of [1, 5, 10, 20]) {
      const ws = buildWorksheet({
        module: LEARNING_MODULES.ENGLISH,
        questionCount: count,
        rng: makeRng()
      });
      expect(ws.exercises).toHaveLength(count);
      expect(ws.meta.questionCount).toBe(count);
    }
  });

  it('numbers exercises sequentially from 1', () => {
    const ws = buildWorksheet({
      module: LEARNING_MODULES.NUMBERS,
      questionCount: 8,
      rng: makeRng()
    });
    expect(ws.exercises.map((e) => e.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('clamps invalid/zero counts to at least one exercise', () => {
    const ws = buildWorksheet({ module: LEARNING_MODULES.COLORS, questionCount: 0, rng: makeRng() });
    expect(ws.exercises.length).toBeGreaterThanOrEqual(1);
  });
});

describe('buildWorksheet - determinism', () => {
  it('produces identical output for the same seed', () => {
    const a = buildWorksheet({ module: LEARNING_MODULES.ENGLISH, questionCount: 10, includeAnswerKey: true, rng: makeRng(7) });
    const b = buildWorksheet({ module: LEARNING_MODULES.ENGLISH, questionCount: 10, includeAnswerKey: true, rng: makeRng(7) });
    expect(a).toEqual(b);
  });

  it('produces different output for different seeds (usually)', () => {
    const a = buildWorksheet({ module: LEARNING_MODULES.ENGLISH, questionCount: 10, rng: makeRng(1) });
    const b = buildWorksheet({ module: LEARNING_MODULES.ENGLISH, questionCount: 10, rng: makeRng(999) });
    // Prompts should differ for distinct seeds across a 10-question sheet.
    const promptsA = a.exercises.map((e) => e.prompt).join('|');
    const promptsB = b.exercises.map((e) => e.prompt).join('|');
    expect(promptsA).not.toBe(promptsB);
  });
});

describe('buildWorksheet - answer key toggle', () => {
  it('omits (empty) the answer key when includeAnswerKey is false', () => {
    const ws = buildWorksheet({ module: LEARNING_MODULES.COLORS, questionCount: 6, includeAnswerKey: false, rng: makeRng() });
    expect(ws.answerKey).toEqual([]);
  });

  it('includes an answer key entry per exercise when includeAnswerKey is true', () => {
    const ws = buildWorksheet({ module: LEARNING_MODULES.COLORS, questionCount: 6, includeAnswerKey: true, rng: makeRng() });
    expect(ws.answerKey).toHaveLength(ws.exercises.length);
  });

  it('every exercise answer matches its answer-key entry (same number and value)', () => {
    const ws = buildWorksheet({
      module: LEARNING_MODULES.ENGLISH,
      questionCount: 15,
      includeAnswerKey: true,
      rng: makeRng(42)
    });
    const keyByNumber = new Map(ws.answerKey.map((k) => [k.number, k.answer]));
    for (const ex of ws.exercises) {
      expect(keyByNumber.has(ex.number)).toBe(true);
      expect(keyByNumber.get(ex.number)).toBe(ex.answer);
      expect(ex.answer).toBeTruthy();
    }
  });
});

describe('buildWorksheet - scope filters', () => {
  it('respects the module scope in meta and title', () => {
    const ws = buildWorksheet({ module: LEARNING_MODULES.NUMBERS, questionCount: 4, rng: makeRng() });
    expect(ws.meta.module).toBe(LEARNING_MODULES.NUMBERS);
    expect(ws.meta.moduleLabel).toBe('Cyfry');
    expect(ws.title).toContain('Cyfry');
  });

  it('respects a category filter: answers come only from that category', () => {
    const category = 'animals';
    const catItems = itemsForCategory(LEARNING_MODULES.ENGLISH, category);
    const allowedAnswers = new Set(catItems.map((i) => i.answer));
    const allowedPrompts = new Set(catItems.map((i) => i.prompt));

    const ws = buildWorksheet({
      module: LEARNING_MODULES.ENGLISH,
      category,
      questionCount: 6,
      includeAnswerKey: true,
      rng: makeRng(3)
    });
    expect(ws.meta.category).toBe(category);

    // For non-match exercises the answer must be an animal translation; for the
    // translate PL->EN direction the answer is the English prompt. So the answer
    // must belong to either the allowed answers or allowed prompts of the category
    // (except for 'match'/'truefalse' whose answers are composed strings).
    for (const ex of ws.exercises) {
      if (ex.kind === 'choose' || ex.kind === 'fill') {
        expect(allowedAnswers.has(ex.answer)).toBe(true);
      }
      if (ex.kind === 'translate') {
        expect(allowedAnswers.has(ex.answer) || allowedPrompts.has(ex.answer)).toBe(true);
      }
    }
  });

  it('respects an age-level filter for a leveled module', () => {
    const ws = buildWorksheet({
      module: LEARNING_MODULES.ENGLISH,
      level: AGE_LEVELS.EARLY,
      questionCount: 6,
      rng: makeRng()
    });
    expect(ws.meta.level).toBe(AGE_LEVELS.EARLY);
    expect(ws.meta.levelLabel).toBe('4-6 lat');
  });

  it('reflects the ACTUAL scope when a requested level would empty the pool', () => {
    // English sentences are all LATE-level. Requesting EARLY within that category
    // empties the level filter, so resolvePool drops it. The sheet must not then
    // advertise the EARLY band it could not enforce.
    const ws = buildWorksheet({
      module: LEARNING_MODULES.ENGLISH,
      category: 'sentences',
      level: AGE_LEVELS.EARLY,
      questionCount: 4,
      rng: makeRng()
    });
    // The applied level/levelLabel are cleared (not advertising a band we dropped).
    expect(ws.meta.level).toBeNull();
    expect(ws.meta.levelLabel).toBeNull();
    // The requested band is still recorded, and the widening is flagged honestly.
    expect(ws.meta.requestedLevel).toBe(AGE_LEVELS.EARLY);
    expect(ws.meta.scopeWidened).toBe(true);
    // The category that WAS applied stays advertised.
    expect(ws.meta.category).toBe('sentences');
  });

  it('does not flag scopeWidened when filters are honored', () => {
    const ws = buildWorksheet({
      module: LEARNING_MODULES.ENGLISH,
      level: AGE_LEVELS.EARLY,
      questionCount: 4,
      rng: makeRng()
    });
    expect(ws.meta.scopeWidened).toBe(false);
    expect(ws.meta.level).toBe(AGE_LEVELS.EARLY);
  });

  it('exposes categories for a module (sanity check against content helper)', () => {
    const cats = categoriesFor(LEARNING_MODULES.ENGLISH);
    expect(cats.length).toBeGreaterThan(0);
    expect(cats).toContain('animals');
  });
});

describe('buildWorksheet - robustness on small pools', () => {
  it('does not throw and still yields the requested count on a tiny category', () => {
    // Pick the smallest available English category to stress the generator.
    const cats = categoriesFor(LEARNING_MODULES.ENGLISH);
    let smallest = cats[0];
    let smallestSize = Infinity;
    for (const c of cats) {
      const size = itemsForCategory(LEARNING_MODULES.ENGLISH, c).length;
      if (size < smallestSize) {
        smallestSize = size;
        smallest = c;
      }
    }
    expect(() =>
      buildWorksheet({
        module: LEARNING_MODULES.ENGLISH,
        category: smallest,
        questionCount: 12,
        includeAnswerKey: true,
        rng: makeRng(5)
      })
    ).not.toThrow();

    const ws = buildWorksheet({
      module: LEARNING_MODULES.ENGLISH,
      category: smallest,
      questionCount: 12,
      includeAnswerKey: true,
      rng: makeRng(5)
    });
    expect(ws.exercises).toHaveLength(12);
    expect(ws.answerKey).toHaveLength(12);
  });

  it('returns a well-formed empty worksheet for an unknown module', () => {
    const ws = buildWorksheet({ module: 'NOT_A_MODULE', questionCount: 5, includeAnswerKey: true, rng: makeRng() });
    expect(ws.exercises).toEqual([]);
    expect(ws.answerKey).toEqual([]);
    expect(ws.title).toBeTruthy();
  });

  it('works without an injected rng (uses deterministic fallback, no throw)', () => {
    expect(() => buildWorksheet({ module: LEARNING_MODULES.COLORS, questionCount: 5 })).not.toThrow();
  });
});
