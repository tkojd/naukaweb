// =============================================================================
// FEAT-004 per-module dydactic guarantee tests.
//
// These walk EVERY task type the composer can emit for EACH module at EACH level
// and lock in rules A + C1-C5 module by module. Each `describe` maps directly to
// a specific user complaint from .agents/USER_REQUEST_VERBATIM.md so that if a
// guarantee were reverted the offending case would resurface and a test here
// would fail. They are deliberately non-vacuous: assertions inspect the RENDERED
// surface of the spec (what a child actually sees / hears), not internal-only
// mirror fields.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { LEARNING_MODULES, AGE_LEVELS } from '../docs/js/logic/models.js';
import {
  itemsFor,
  itemsForLevel,
  englishWords,
  colors,
  polishLetters,
  numbers,
  hasPolishDiacritic
} from '../docs/js/logic/content.js';
import {
  TASK_TYPES,
  buildLesson,
  generateMatchPairs
} from '../docs/js/logic/taskTypes.js';

function seqRng(values) {
  let i = 0;
  return () => values[i++ % values.length];
}

// A long, varied but deterministic rng so buildLesson exercises many task types.
const LONG_SEQ = [
  0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95, 0.12, 0.28, 0.44,
  0.6, 0.72, 0.88, 0.03, 0.17, 0.31, 0.47, 0.59, 0.71, 0.83
];

/** Build a large lesson for (module, level) to sample the full type mix. */
function lessonFor(module, level, extra = {}) {
  let items = itemsForLevel(module, level);
  if (!items.length) items = itemsFor(module);
  return buildLesson({
    module,
    level,
    availableItems: items,
    questionCount: 40,
    rng: seqRng(LONG_SEQ),
    ...extra
  });
}

/** The text a child would actually have to READ on an option, or '' if none. */
function readableOptionText(spec, option) {
  if (option.id === 'true' || option.id === 'false') return ''; // Tak/Nie controls
  if (option.rep === 'glyph') return ''; // single letter glyph = recognition target
  if (spec.type === TASK_TYPES.COUNT_CHOOSE) return ''; // numerals, not reading
  return option.label || '';
}

// -----------------------------------------------------------------------------
// KOLORY
// -----------------------------------------------------------------------------
describe('KOLORY: EARLY solvable by sound+image with swatch answers, no name reading', () => {
  const specs = lessonFor(LEARNING_MODULES.COLORS, AGE_LEVELS.EARLY);

  it('emits at least one colour task and every task is answerable without reading', () => {
    expect(specs.length).toBeGreaterThan(0);
    for (const spec of specs) {
      for (const o of spec.options) {
        expect(readableOptionText(spec, o)).toBe('');
      }
    }
  });

  it('answer options are colour SWATCHES, never a text colour name (rule A)', () => {
    const choiceSpecs = specs.filter(
      (s) => s.type === TASK_TYPES.MULTIPLE_CHOICE || s.type === TASK_TYPES.LISTEN_CHOOSE
    );
    expect(choiceSpecs.length).toBeGreaterThan(0);
    for (const spec of choiceSpecs) {
      for (const o of spec.options) {
        expect(typeof o.colorHex).toBe('string');
        expect(o.label).toBe('');
      }
    }
  });

  it('the header NEVER carries the target swatch (the jasnoniebieski give-away is gone, C1)', () => {
    for (const spec of specs) {
      if (spec.meta && spec.meta.promptRep && spec.meta.answerRep) {
        // Whenever prompt and answer are in the SAME kind (both swatch) the give-away
        // is present. The engine tags reps so this can never happen.
        expect(spec.meta.promptRep).not.toBe(spec.meta.answerRep);
      }
      // For swatch-answer tasks (multiple choice / listen), the header must NOT
      // itself be a swatch identical to a tile. TRUE_FALSE legitimately shows a
      // single swatch whose answer is the Tak/Nie judgement (a different rep), so
      // it is excluded here.
      if (spec.meta && spec.meta.answerRep === 'swatch') {
        expect(spec.prompt.colorHex).toBeUndefined();
      }
    }
  });

  it('EARLY match-pairs pairs a SPOKEN colour name with a swatch, never a name word to read', () => {
    // Directly generate a colours board so the assertion is precise.
    const spec = generateMatchPairs({
      items: colors.slice(0, 4),
      pairCount: 4,
      level: AGE_LEVELS.EARLY,
      rng: seqRng([0.2, 0.6, 0.4, 0.8])
    });
    expect(spec.moduleType).toBe(LEARNING_MODULES.COLORS);
    for (const wc of spec.meta.wordCards) {
      expect(wc.label).toBe(''); // no colour NAME text for a non-reader
      expect(wc.speak.lang).toBe('pl-PL');
      const item = colors.find((c) => c.id === wc.pairId);
      expect(wc.speak.text).toBe(item.answer); // the colour name is spoken instead
    }
  });

  it('colour-name TEXT appears only for LATE readers', () => {
    const spec = generateMatchPairs({
      items: colors.slice(0, 4),
      pairCount: 4,
      level: AGE_LEVELS.LATE,
      rng: seqRng([0.2, 0.6, 0.4, 0.8])
    });
    for (const wc of spec.meta.wordCards) {
      const item = colors.find((c) => c.id === wc.pairId);
      expect(wc.label).toBe(item.answer); // readers may see the colour name
    }
  });
});

// -----------------------------------------------------------------------------
// LITERY
// -----------------------------------------------------------------------------
describe('LITERY: stage 1 only non-diacritic single-letter recognition, no word building', () => {
  const stage1 = buildLesson({
    module: LEARNING_MODULES.POLISH_LETTERS,
    level: AGE_LEVELS.EARLY,
    stage: 1,
    availableItems: polishLetters,
    questionCount: 40,
    rng: seqRng(LONG_SEQ)
  });

  it('stage 1 contains NO Polish diacritic letters (C4)', () => {
    expect(stage1.length).toBeGreaterThan(0);
    for (const spec of stage1) {
      expect(hasPolishDiacritic(spec.item.prompt)).toBe(false);
    }
  });

  it('stage 1 never emits SPELL_WORD (word building), even for readers', () => {
    const readerStage1 = buildLesson({
      module: LEARNING_MODULES.POLISH_LETTERS,
      level: AGE_LEVELS.LATE,
      stage: 1,
      availableItems: polishLetters,
      questionCount: 40,
      rng: () => 0.99
    });
    expect(readerStage1.some((s) => s.type === TASK_TYPES.SPELL_WORD)).toBe(false);
  });

  it('the example-word picture never equals the letter it teaches (C2)', () => {
    for (const spec of stage1) {
      const pic = spec.prompt && spec.prompt.picture;
      if (pic) {
        // The picture stands for an example word, not the bare letter glyph.
        const correct = spec.options.find((o) => o.isCorrect);
        if (correct && correct.rep === 'glyph') {
          expect(pic.emoji).not.toBe(correct.label);
        }
      }
    }
  });

  it('higher stages CAN bring back diacritic letters and word building', () => {
    const stage2 = buildLesson({
      module: LEARNING_MODULES.POLISH_LETTERS,
      level: AGE_LEVELS.LATE,
      stage: 2,
      availableItems: polishLetters,
      questionCount: 40,
      rng: () => 0.99
    });
    expect(stage2.some((s) => hasPolishDiacritic(s.item.prompt))).toBe(true);
  });
});

// -----------------------------------------------------------------------------
// CYFRY
// -----------------------------------------------------------------------------
describe('CYFRY: never digit-in-prompt + identical-digit-answer; concrete counting', () => {
  for (const level of [AGE_LEVELS.EARLY, AGE_LEVELS.LATE]) {
    const specs = lessonFor(LEARNING_MODULES.NUMBERS, level);

    it(`${level}: every number task is COUNT_CHOOSE (quantity -> digit), never digit -> digit`, () => {
      expect(specs.length).toBeGreaterThan(0);
      for (const spec of specs) {
        expect(spec.type).toBe(TASK_TYPES.COUNT_CHOOSE);
        expect(spec.meta.promptRep).toBe('quantity');
        expect(spec.meta.answerRep).toBe('digit');
      }
    });

    it(`${level}: the prompt shows a group of pictures and NOT the target digit`, () => {
      for (const spec of specs) {
        const digit = String(spec.meta.count);
        // The concrete question does not spell out the answer digit.
        expect(spec.prompt.text.includes(digit)).toBe(false);
        // The prompt renders `count` glyphs, never the digit itself.
        expect(spec.prompt.glyphs.length).toBe(spec.meta.count);
      }
    });

    it(`${level}: prompt is concrete Polish ("Ile ... widzisz?") (C5)`, () => {
      for (const spec of specs) {
        expect(spec.prompt.text.startsWith('Ile ')).toBe(true);
        expect(spec.prompt.text.endsWith('widzisz?')).toBe(true);
      }
    });

    it(`${level}: counting reinforces a REAL 0-9 catalog digit (no orphan ids)`, () => {
      for (const spec of specs) {
        if (spec.item) {
          const real = numbers.find((n) => n.id === spec.item.id);
          expect(real).toBeTruthy();
          expect(spec.item.id.startsWith('count_')).toBe(false);
        }
      }
    });
  }
});

// -----------------------------------------------------------------------------
// ANGIELSKI
// -----------------------------------------------------------------------------
describe('ANGIELSKI: every task teaches English sound/spelling <-> meaning (C3)', () => {
  const early = lessonFor(LEARNING_MODULES.ENGLISH, AGE_LEVELS.EARLY);
  const late = lessonFor(LEARNING_MODULES.ENGLISH, AGE_LEVELS.LATE);

  it('EARLY answers are PICTURES; no English/Polish text to read on options', () => {
    expect(early.length).toBeGreaterThan(0);
    for (const spec of early) {
      for (const o of spec.options) {
        expect(readableOptionText(spec, o)).toBe('');
      }
    }
  });

  it('the learning stimulus is always ENGLISH audio, never Polish (no "ciasto"->cake)', () => {
    for (const spec of [...early, ...late]) {
      if (spec.meta && spec.meta.speak) {
        expect(spec.meta.speak.lang).toBe('en-US');
      }
      if (spec.prompt && spec.prompt.speak) {
        expect(spec.prompt.speak.lang).toBe('en-US');
      }
    }
  });

  it('EARLY match-pairs pair the ENGLISH word/sound with a picture, never Polish text', () => {
    // Generate an English board directly so the guarantee is exact regardless of
    // which task types a particular rng sequence happens to emit in a lesson.
    const items = englishWords.filter((w) => w.category === 'animals').slice(0, 4);
    const spec = generateMatchPairs({
      items,
      pairCount: 4,
      level: AGE_LEVELS.EARLY,
      rng: seqRng([0.2, 0.6, 0.4, 0.8])
    });
    expect(spec.meta.isEnglish).toBe(true);
    for (const wc of spec.meta.wordCards) {
      expect(wc.label).toBe(''); // non-reader: sound card, not text
      expect(wc.speak.lang).toBe('en-US');
      const item = items.find((w) => w.id === wc.pairId);
      expect(wc.speak.text).toBe(item.prompt); // English word
      expect(wc.speak.text).not.toBe(item.answer); // never the Polish word
    }
  });

  it('the prompt picture never appears on the correct option (no palette "draw" give-away, C2)', () => {
    for (const spec of [...early, ...late]) {
      const promptEmoji =
        (spec.prompt && spec.prompt.emoji) ||
        (spec.prompt && spec.prompt.picture && spec.prompt.picture.emoji) ||
        null;
      if (!promptEmoji || promptEmoji === '🔊') continue;
      const correct = spec.options.find((o) => o.isCorrect);
      if (correct && correct.emoji) {
        expect(promptEmoji).not.toBe(correct.emoji);
      }
    }
  });

  it('TRUE_FALSE pairs an English word/sound with a picture (no meat-icon + Polish "cztery")', () => {
    const tfs = [...early, ...late].filter((s) => s.type === TASK_TYPES.TRUE_FALSE);
    expect(tfs.length).toBeGreaterThan(0);
    for (const spec of tfs) {
      // The spoken statement is an English word (en-US), never a Polish word.
      expect(spec.meta.speak.lang).toBe('en-US');
      // Options are the Tak/Nie judgement, not a readable word.
      expect(spec.options.map((o) => o.id).sort()).toEqual(['false', 'true']);
    }
  });

  it('every English task exposes the correct English pronunciation to replay after a correct answer', () => {
    for (const spec of [...early, ...late]) {
      // MATCH_PAIRS replays per matched pair via each pair.speak; other types via
      // meta.englishSpeak. Confirm the correct English pronunciation is available.
      if (spec.type === TASK_TYPES.MATCH_PAIRS) {
        for (const p of spec.meta.pairs) {
          expect(p.speak.lang).toBe('en-US');
        }
      } else if (spec.type === TASK_TYPES.SPELL_WORD) {
        // spelling is a LATE reading task; the item itself is English.
        expect(spec.item.moduleType).toBe(LEARNING_MODULES.ENGLISH);
      } else {
        expect(spec.meta.englishSpeak).toBeTruthy();
        expect(spec.meta.englishSpeak.lang).toBe('en-US');
      }
    }
  });

  it('EARLY never surfaces reading (English text options) or spelling', () => {
    expect(early.some((s) => s.type === TASK_TYPES.SPELL_WORD)).toBe(false);
  });
});

// -----------------------------------------------------------------------------
// GLOBAL PROGRESSION GUARANTEE
// -----------------------------------------------------------------------------
describe('Progression: EARLY never surfaces reading/spelling tasks in any module', () => {
  for (const module of Object.values(LEARNING_MODULES)) {
    it(`${module}: EARLY lesson has no SPELL_WORD and no readable option text`, () => {
      const specs = lessonFor(module, AGE_LEVELS.EARLY);
      expect(specs.length).toBeGreaterThan(0);
      expect(specs.some((s) => s.type === TASK_TYPES.SPELL_WORD)).toBe(false);
      for (const spec of specs) {
        if (spec.type === TASK_TYPES.MATCH_PAIRS) {
          for (const wc of spec.meta.wordCards) {
            // Colours/English word cards are silent (sound); letters may show a
            // single glyph (a recognition target, not reading).
            if (module === LEARNING_MODULES.POLISH_LETTERS && wc.label) {
              expect([...wc.label].length).toBe(1);
            } else {
              expect(wc.label).toBe('');
            }
          }
        } else {
          for (const o of spec.options) {
            expect(readableOptionText(spec, o)).toBe('');
          }
        }
      }
    });
  }
});
