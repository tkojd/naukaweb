// =============================================================================
// Printable-worksheet dydactic guarantee tests (FEAT-005).
//
// These enforce that PRINTED sheets follow the same rules A + C1-C5 as the
// on-screen lessons (docs/METODYKA.md):
//   A  - EARLY sheets require NO reading by the child (pictures / quantities /
//        colours; the instruction is read aloud by the adult). Reading, spelling,
//        translation and matching are LATE only.
//   C1 - answer representation differs from the prompt representation (no
//        digit==digit; no target swatch printed in the header AND as the answer).
//   C2 - a prompt picture never gives the answer away; distractor pictures differ.
//   C3 - English EARLY stimulus is the ENGLISH word, answers are meaning PICTURES,
//        never a Polish word tile.
//   C4 - the first letter stage prints only non-diacritic letters.
//   C5 - concrete Polish instructions with correct count-noun agreement.
//
// All tests are deterministic (injected rng) and never touch the network.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { buildWorksheet, WORKSHEET_REPRESENTATIONS } from '../docs/js/logic/worksheet.js';
import { LEARNING_MODULES, AGE_LEVELS } from '../docs/js/logic/models.js';
import {
  itemsForCategory,
  categoriesFor,
  hasPolishDiacritic,
  numbers,
  colors,
  polishLetters,
  countingNounFor
} from '../docs/js/logic/content.js';

/** A deterministic pseudo-random generator (mulberry32). Returns floats [0,1). */
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

const ALL_MODULES = Object.values(LEARNING_MODULES);

// -----------------------------------------------------------------------------
// Structural sanity: counts, numbering, determinism, answer key.
// -----------------------------------------------------------------------------
describe('buildWorksheet - structure', () => {
  it('returns exactly the requested number of exercises, numbered from 1', () => {
    for (const module of ALL_MODULES) {
      for (const level of [AGE_LEVELS.EARLY, AGE_LEVELS.LATE]) {
        const ws = buildWorksheet({ module, level, questionCount: 8, rng: makeRng(1) });
        expect(ws.exercises).toHaveLength(8);
        expect(ws.exercises.map((e) => e.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
        expect(ws.meta.questionCount).toBe(8);
      }
    }
  });

  it('clamps invalid/zero counts to at least one exercise', () => {
    const ws = buildWorksheet({ module: LEARNING_MODULES.COLORS, questionCount: 0, rng: makeRng() });
    expect(ws.exercises.length).toBeGreaterThanOrEqual(1);
  });

  it('produces identical output for the same seed (deterministic)', () => {
    const a = buildWorksheet({ module: LEARNING_MODULES.ENGLISH, level: AGE_LEVELS.LATE, questionCount: 10, includeAnswerKey: true, rng: makeRng(7) });
    const b = buildWorksheet({ module: LEARNING_MODULES.ENGLISH, level: AGE_LEVELS.LATE, questionCount: 10, includeAnswerKey: true, rng: makeRng(7) });
    expect(a).toEqual(b);
  });

  it('produces different LATE sheets for different seeds (usually)', () => {
    const a = buildWorksheet({ module: LEARNING_MODULES.ENGLISH, level: AGE_LEVELS.LATE, questionCount: 10, rng: makeRng(1) });
    const b = buildWorksheet({ module: LEARNING_MODULES.ENGLISH, level: AGE_LEVELS.LATE, questionCount: 10, rng: makeRng(999) });
    const sig = (ws) => ws.exercises.map((e) => `${e.kind}:${e.answer}`).join('|');
    expect(sig(a)).not.toBe(sig(b));
  });

  it('answer key mirrors every exercise answer when requested, and is empty otherwise', () => {
    const off = buildWorksheet({ module: LEARNING_MODULES.COLORS, level: AGE_LEVELS.LATE, questionCount: 6, includeAnswerKey: false, rng: makeRng() });
    expect(off.answerKey).toEqual([]);

    const on = buildWorksheet({ module: LEARNING_MODULES.ENGLISH, level: AGE_LEVELS.LATE, questionCount: 12, includeAnswerKey: true, rng: makeRng(42) });
    const keyByNumber = new Map(on.answerKey.map((k) => [k.number, k.answer]));
    expect(on.answerKey).toHaveLength(on.exercises.length);
    for (const ex of on.exercises) {
      expect(keyByNumber.get(ex.number)).toBe(ex.answer);
      expect(ex.answer).toBeTruthy();
    }
  });

  it('returns a well-formed empty worksheet for an unknown module', () => {
    const ws = buildWorksheet({ module: 'NOT_A_MODULE', questionCount: 5, includeAnswerKey: true, rng: makeRng() });
    expect(ws.exercises).toEqual([]);
    expect(ws.answerKey).toEqual([]);
    expect(ws.title).toBeTruthy();
  });

  it('works without an injected rng (deterministic fallback, no throw)', () => {
    expect(() => buildWorksheet({ module: LEARNING_MODULES.COLORS, questionCount: 5 })).not.toThrow();
  });
});

// -----------------------------------------------------------------------------
// RULE A - EARLY sheets require NO reading by the child.
// -----------------------------------------------------------------------------
describe('RULE A: EARLY worksheets are solvable without the child reading', () => {
  it('every module: EARLY exercises are non-reading picture/quantity/colour kinds', () => {
    const NON_READING = new Set(['count', 'find-color', 'first-letter', 'english-picture']);
    for (const module of ALL_MODULES) {
      const ws = buildWorksheet({ module, level: AGE_LEVELS.EARLY, questionCount: 12, rng: makeRng(3) });
      expect(ws.exercises.length).toBeGreaterThan(0);
      expect(ws.meta.generationLevel).toBe(AGE_LEVELS.EARLY);
      for (const ex of ws.exercises) {
        expect(NON_READING.has(ex.kind)).toBe(true);
        expect(ex.requiresReading).toBe(false);
        // No reading/spelling/translation/match kinds sneak into an EARLY sheet.
        expect(['choose', 'fill', 'translate', 'match', 'truefalse']).not.toContain(ex.kind);
      }
    }
  });

  it('no requested level defaults to a non-reading (EARLY) sheet', () => {
    // A caller who forgets the level must NOT get a reading sheet for the youngest.
    const ws = buildWorksheet({ module: LEARNING_MODULES.ENGLISH, questionCount: 8, rng: makeRng(5) });
    expect(ws.meta.generationLevel).toBe(AGE_LEVELS.EARLY);
    for (const ex of ws.exercises) expect(ex.requiresReading).toBe(false);
  });

  it('LATE worksheets DO use reading tasks (contrast with EARLY)', () => {
    const ws = buildWorksheet({ module: LEARNING_MODULES.ENGLISH, level: AGE_LEVELS.LATE, questionCount: 12, rng: makeRng(9) });
    expect(ws.meta.generationLevel).toBe(AGE_LEVELS.LATE);
    expect(ws.exercises.some((ex) => ex.requiresReading === true)).toBe(true);
  });
});

// -----------------------------------------------------------------------------
// CYFRY - counting (C1: quantity -> digit, never digit==digit; C5 agreement).
// -----------------------------------------------------------------------------
describe('CYFRY worksheets: count -> digit, concrete prompt (C1/C5)', () => {
  for (const level of [AGE_LEVELS.EARLY, AGE_LEVELS.LATE]) {
    it(`${level}: counting exercises pair a QUANTITY with a DIGIT and never print the target digit`, () => {
      const ws = buildWorksheet({ module: LEARNING_MODULES.NUMBERS, level, questionCount: 12, includeAnswerKey: true, rng: makeRng(11) });
      const counts = ws.exercises.filter((e) => e.kind === 'count');
      expect(counts.length).toBeGreaterThan(0);
      for (const ex of counts) {
        expect(ex.promptRep).toBe(WORKSHEET_REPRESENTATIONS.QUANTITY);
        expect(ex.answerRep).toBe(WORKSHEET_REPRESENTATIONS.DIGIT);
        // The rendered prompt is the group of glyphs, not the digit.
        expect(ex.glyphs.length).toBe(ex.count);
        expect(ex.answer).toBe(String(ex.count));
        // Rule C5: concrete "Ile ... widzisz?" with the glyph's noun.
        expect(ex.instructions.startsWith('Ile ')).toBe(true);
        expect(ex.instructions.endsWith('widzisz?')).toBe(true);
        expect(ex.instructions).toContain(countingNounFor(ex.glyph).many);
      }
    });
  }

  it('EARLY numbers sheet is entirely counting (no digit-word matching for non-readers)', () => {
    const ws = buildWorksheet({ module: LEARNING_MODULES.NUMBERS, level: AGE_LEVELS.EARLY, questionCount: 10, rng: makeRng(2) });
    for (const ex of ws.exercises) expect(ex.kind).toBe('count');
  });

  it('count answers are real 0-9 digits (no orphan ids)', () => {
    const ws = buildWorksheet({ module: LEARNING_MODULES.NUMBERS, level: AGE_LEVELS.EARLY, questionCount: 10, includeAnswerKey: true, rng: makeRng(6) });
    const digits = new Set(numbers.map((n) => n.prompt));
    for (const ex of ws.exercises) expect(digits.has(ex.answer)).toBe(true);
  });
});

// -----------------------------------------------------------------------------
// KOLORY - EARLY find-colour (C1: name spoken -> swatch, no swatch in header).
// -----------------------------------------------------------------------------
describe('KOLORY worksheets: EARLY find-colour by swatch, no colour-name reading', () => {
  const ws = buildWorksheet({ module: LEARNING_MODULES.COLORS, level: AGE_LEVELS.EARLY, questionCount: 10, includeAnswerKey: true, rng: makeRng(13) });

  it('every exercise is a find-colour with SWATCH answers (rule A / C1)', () => {
    for (const ex of ws.exercises) {
      expect(ex.kind).toBe('find-color');
      expect(ex.promptRep).toBe(WORKSHEET_REPRESENTATIONS.WORD);
      expect(ex.answerRep).toBe(WORKSHEET_REPRESENTATIONS.SWATCH);
      expect(ex.promptRep).not.toBe(ex.answerRep); // C1
      // Answers are colour tiles (hex), never a printed colour NAME the child reads.
      expect(ex.swatches.length).toBeGreaterThanOrEqual(2);
      for (const s of ex.swatches) expect(typeof s.colorHex).toBe('string');
      // Exactly one correct swatch, and it resolves to a real colour.
      const correct = ex.swatches.filter((s) => s.isCorrect);
      expect(correct).toHaveLength(1);
      expect(colors.find((c) => c.id === correct[0].id)).toBeTruthy();
    }
  });

  it('the correct colour name is only in the (adult-read) instruction and answer key, never as an option tile', () => {
    for (const ex of ws.exercises) {
      expect(ex.instructions).toContain(ex.answer); // e.g. "Zakreśl kolor: żółty"
      // No swatch carries the colour name as visible text (they are hex tiles only).
      for (const s of ex.swatches) expect(s.label).toBeUndefined();
    }
  });
});

// -----------------------------------------------------------------------------
// LITERY - EARLY first-letter (C2: picture is example word; C4: stage-1 gating).
// -----------------------------------------------------------------------------
describe('LITERY worksheets: EARLY recognise the first letter, stage-1 non-diacritic (C2/C4)', () => {
  const ws = buildWorksheet({ module: LEARNING_MODULES.POLISH_LETTERS, level: AGE_LEVELS.EARLY, stage: 1, questionCount: 12, includeAnswerKey: true, rng: makeRng(17) });

  it('every exercise is first-letter: example picture -> letter GLYPH answer', () => {
    for (const ex of ws.exercises) {
      expect(ex.kind).toBe('first-letter');
      expect(ex.promptRep).toBe(WORKSHEET_REPRESENTATIONS.PICTURE);
      expect(ex.answerRep).toBe(WORKSHEET_REPRESENTATIONS.GLYPH);
      expect(ex.letterChoices.length).toBeGreaterThanOrEqual(2);
      const correct = ex.letterChoices.filter((l) => l.isCorrect);
      expect(correct).toHaveLength(1);
    }
  });

  it('the prompt picture never IS the answer letter glyph (C2)', () => {
    for (const ex of ws.exercises) {
      const correct = ex.letterChoices.find((l) => l.isCorrect);
      // The picture (emoji of the example word) is not the bare letter it teaches.
      expect(ex.promptEmoji).not.toBe(correct.glyph);
    }
  });

  it('stage 1 prints NO Polish diacritic letters (C4)', () => {
    for (const ex of ws.exercises) {
      expect(hasPolishDiacritic(ex.answer)).toBe(false);
      for (const l of ex.letterChoices) expect(hasPolishDiacritic(l.glyph)).toBe(false);
    }
  });

  it('a later stage MAY bring diacritic letters back', () => {
    const later = buildWorksheet({ module: LEARNING_MODULES.POLISH_LETTERS, level: AGE_LEVELS.EARLY, stage: 2, questionCount: 30, rng: makeRng(4) });
    // The full alphabet includes diacritic letters; a stage-2 pool can surface them.
    const anyDiacritic = later.exercises.some((ex) => hasPolishDiacritic(ex.answer));
    expect(anyDiacritic).toBe(true);
  });
});

// -----------------------------------------------------------------------------
// ANGIELSKI - EARLY english-picture (C3: English stimulus, picture answer; C2).
// -----------------------------------------------------------------------------
describe('ANGIELSKI worksheets: EARLY hear-English -> circle picture (C2/C3)', () => {
  const ws = buildWorksheet({ module: LEARNING_MODULES.ENGLISH, level: AGE_LEVELS.EARLY, category: 'animals', questionCount: 10, includeAnswerKey: true, rng: makeRng(19) });

  it('every exercise pairs an ENGLISH word with meaning PICTURES, never a Polish word tile (C3)', () => {
    const animals = itemsForCategory(LEARNING_MODULES.ENGLISH, 'animals');
    const englishWordsInCat = new Set(animals.map((a) => a.prompt));
    const polishWordsInCat = new Set(animals.map((a) => a.answer));
    for (const ex of ws.exercises) {
      expect(ex.kind).toBe('english-picture');
      expect(ex.promptRep).toBe(WORKSHEET_REPRESENTATIONS.WORD);
      expect(ex.answerRep).toBe(WORKSHEET_REPRESENTATIONS.PICTURE);
      // The stimulus is the English word, read aloud (in the instruction).
      expect(englishWordsInCat.has(ex.englishWord)).toBe(true);
      expect(polishWordsInCat.has(ex.englishWord)).toBe(false);
      // Options are pictures (emoji/imageSrc), never a text word to read.
      for (const p of ex.pictureChoices) {
        expect(p.label).toBeUndefined();
        expect(p.emoji || p.imageSrc).toBeTruthy();
      }
    }
  });

  it('the correct picture is present and distractor pictures differ from it (C2)', () => {
    for (const ex of ws.exercises) {
      const correct = ex.pictureChoices.filter((p) => p.isCorrect);
      expect(correct).toHaveLength(1);
      const correctEmoji = correct[0].emoji;
      for (const p of ex.pictureChoices) {
        if (!p.isCorrect && correctEmoji) expect(p.emoji).not.toBe(correctEmoji);
      }
    }
  });
});

// -----------------------------------------------------------------------------
// LATE reading tasks stay meaningful (English EN<->PL reading link, C3 at LATE).
// -----------------------------------------------------------------------------
describe('LATE worksheets: reading tasks for readers', () => {
  it('English LATE choose/fill answers are Polish meanings; prompt has no give-away picture (C2/C3)', () => {
    const category = 'animals';
    const catItems = itemsForCategory(LEARNING_MODULES.ENGLISH, category);
    const allowedAnswers = new Set(catItems.map((i) => i.answer));
    const allowedPrompts = new Set(catItems.map((i) => i.prompt));
    const ws = buildWorksheet({ module: LEARNING_MODULES.ENGLISH, level: AGE_LEVELS.LATE, category, questionCount: 10, includeAnswerKey: true, rng: makeRng(23) });
    expect(ws.meta.category).toBe(category);
    for (const ex of ws.exercises) {
      if (ex.kind === 'choose' || ex.kind === 'fill') {
        expect(allowedAnswers.has(ex.answer)).toBe(true);
        // No meaning emoji is printed in an English reading prompt (would give it away).
        expect(ex.promptEmoji).toBeUndefined();
      }
      if (ex.kind === 'translate') {
        expect(allowedAnswers.has(ex.answer) || allowedPrompts.has(ex.answer)).toBe(true);
      }
    }
  });

  it('a category filter keeps every LATE answer within the category', () => {
    const category = 'food';
    const catItems = itemsForCategory(LEARNING_MODULES.ENGLISH, category);
    const allowed = new Set(catItems.flatMap((i) => [i.answer, i.prompt]));
    const ws = buildWorksheet({ module: LEARNING_MODULES.ENGLISH, level: AGE_LEVELS.LATE, category, questionCount: 8, includeAnswerKey: true, rng: makeRng(31) });
    for (const ex of ws.exercises) {
      if (ex.kind === 'choose' || ex.kind === 'fill' || ex.kind === 'translate') {
        expect(allowed.has(ex.answer)).toBe(true);
      }
    }
  });
});

// -----------------------------------------------------------------------------
// Scope reporting (honest meta), preserved from the original behaviour.
// -----------------------------------------------------------------------------
describe('buildWorksheet - scope reporting', () => {
  it('respects the module scope in meta and title', () => {
    const ws = buildWorksheet({ module: LEARNING_MODULES.NUMBERS, questionCount: 4, rng: makeRng() });
    expect(ws.meta.module).toBe(LEARNING_MODULES.NUMBERS);
    expect(ws.meta.moduleLabel).toBe('Cyfry');
    expect(ws.title).toContain('Cyfry');
  });

  it('advertises an applied age band', () => {
    const ws = buildWorksheet({ module: LEARNING_MODULES.ENGLISH, level: AGE_LEVELS.EARLY, questionCount: 6, rng: makeRng() });
    expect(ws.meta.level).toBe(AGE_LEVELS.EARLY);
    expect(ws.meta.levelLabel).toBe('4-6 lat');
    expect(ws.meta.scopeWidened).toBe(false);
  });

  it('reflects the ACTUAL scope when a requested level would empty the pool', () => {
    const ws = buildWorksheet({
      module: LEARNING_MODULES.ENGLISH,
      category: 'sentences',
      level: AGE_LEVELS.EARLY,
      questionCount: 4,
      rng: makeRng()
    });
    expect(ws.meta.level).toBeNull();
    expect(ws.meta.levelLabel).toBeNull();
    expect(ws.meta.requestedLevel).toBe(AGE_LEVELS.EARLY);
    expect(ws.meta.scopeWidened).toBe(true);
    expect(ws.meta.category).toBe('sentences');
  });

  it('exposes categories for a module (sanity check against content helper)', () => {
    const cats = categoriesFor(LEARNING_MODULES.ENGLISH);
    expect(cats.length).toBeGreaterThan(0);
    expect(cats).toContain('animals');
  });

  it('does not throw and still yields the requested count on a tiny category', () => {
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
    const ws = buildWorksheet({
      module: LEARNING_MODULES.ENGLISH,
      level: AGE_LEVELS.LATE,
      category: smallest,
      questionCount: 12,
      includeAnswerKey: true,
      rng: makeRng(5)
    });
    expect(ws.exercises).toHaveLength(12);
    expect(ws.answerKey).toHaveLength(12);
  });
});
