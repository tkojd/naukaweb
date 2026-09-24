import { describe, it, expect } from 'vitest';
import { LEARNING_MODULES, AGE_LEVELS } from '../docs/js/logic/models.js';
import {
  itemsFor,
  itemsForLevel,
  englishWords,
  colorScenes,
  colors,
  polishLetters,
  numbers,
  hasPolishDiacritic,
  firstStageLetters,
  countingPrompt,
  countingCountLabel,
  polishPluralCategory
} from '../docs/js/logic/content.js';
import {
  TASK_TYPES,
  DIRECTIONS,
  shuffle,
  generateMultipleChoice,
  generateTranslation,
  generateMatchPairs,
  generateListenChoose,
  generateSpellWord,
  isSpellingCorrect,
  generateTrueFalse,
  generateCountChoose,
  generateWhichMatches,
  taskTypesForLevel,
  buildLesson,
  TASK_TYPES_BY_LEVEL
} from '../docs/js/logic/taskTypes.js';

// A deterministic rng that cycles through an injected sequence of [0,1) floats.
function seqRng(values) {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i++;
    return v;
  };
}

// Convenience content slices.
const colorItems = itemsFor(LEARNING_MODULES.COLORS);
const numberItems = itemsFor(LEARNING_MODULES.NUMBERS);
const letterItems = itemsFor(LEARNING_MODULES.POLISH_LETTERS);
const catItem = englishWords.find((w) => w.id === 'english_cat');
const dogItem = englishWords.find((w) => w.id === 'english_dog');

function exactlyOneCorrect(spec) {
  return spec.options.filter((o) => o.isCorrect).length === 1;
}

describe('TASK_TYPES constant', () => {
  it('defines a string id for every task type', () => {
    for (const key of [
      'MULTIPLE_CHOICE',
      'MATCH_PAIRS',
      'LISTEN_CHOOSE',
      'SPELL_WORD',
      'TRUE_FALSE',
      'COUNT_CHOOSE',
      'WHICH_MATCHES'
    ]) {
      expect(typeof TASK_TYPES[key]).toBe('string');
    }
  });
});

describe('shuffle', () => {
  it('does not mutate the input and preserves elements', () => {
    const src = [1, 2, 3, 4, 5];
    const out = shuffle(src, seqRng([0.1, 0.9, 0.3, 0.7]));
    expect(src).toEqual([1, 2, 3, 4, 5]);
    expect(out.slice().sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('is deterministic under a fixed rng', () => {
    const a = shuffle([1, 2, 3, 4], seqRng([0.5, 0.5, 0.5]));
    const b = shuffle([1, 2, 3, 4], seqRng([0.5, 0.5, 0.5]));
    expect(a).toEqual(b);
  });
});

describe('generateMultipleChoice', () => {
  it('returns a well-formed spec with exactly one correct option and correct correctItemId', () => {
    const spec = generateMultipleChoice({
      item: colorItems[0],
      pool: colorItems,
      optionCount: 4,
      rng: seqRng([0.1, 0.4, 0.7, 0.2, 0.9])
    });
    expect(spec.type).toBe(TASK_TYPES.MULTIPLE_CHOICE);
    expect(spec.item).toBe(colorItems[0]);
    expect(spec.options.length).toBe(4);
    expect(exactlyOneCorrect(spec)).toBe(true);
    const correct = spec.options.find((o) => o.isCorrect);
    expect(correct.id).toBe(spec.correctItemId);
    expect(spec.correctItemId).toBe(colorItems[0].id);
  });

  it('does not include the answer item as a distractor', () => {
    const spec = generateMultipleChoice({
      item: catItem,
      pool: englishWords,
      optionCount: 4,
      rng: seqRng([0.2, 0.5, 0.8, 0.1])
    });
    const ids = spec.options.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length); // no duplicates
  });
});

describe('translation direction', () => {
  it('EN_TO_PL shows English prompt and Polish answer label', () => {
    const spec = generateTranslation({
      item: catItem,
      pool: englishWords,
      direction: DIRECTIONS.EN_TO_PL,
      rng: seqRng([0.3, 0.6, 0.1])
    });
    expect(spec.prompt.text).toBe('cat');
    expect(spec.prompt.direction).toBe(DIRECTIONS.EN_TO_PL);
    const correct = spec.options.find((o) => o.isCorrect);
    expect(correct.label).toBe('kot');
  });

  it('PL_TO_EN switches the sides', () => {
    const spec = generateTranslation({
      item: catItem,
      pool: englishWords,
      direction: DIRECTIONS.PL_TO_EN,
      rng: seqRng([0.3, 0.6, 0.1])
    });
    expect(spec.prompt.text).toBe('kot');
    expect(spec.prompt.direction).toBe(DIRECTIONS.PL_TO_EN);
    const correct = spec.options.find((o) => o.isCorrect);
    expect(correct.label).toBe('cat');
  });

  it('supports phrase and sentence kinds', () => {
    const phrase = englishWords.find((w) => w.kind === 'phrase');
    const sentence = englishWords.find((w) => w.kind === 'sentence');
    for (const item of [phrase, sentence]) {
      const spec = generateTranslation({
        item,
        pool: englishWords,
        direction: DIRECTIONS.EN_TO_PL,
        rng: seqRng([0.2, 0.5])
      });
      expect(spec.prompt.text).toBe(item.prompt);
      expect(exactlyOneCorrect(spec)).toBe(true);
    }
  });
});

describe('generateMatchPairs', () => {
  it('produces the requested number of pairs with matching cards', () => {
    const spec = generateMatchPairs({ items: colorItems, pairCount: 4, rng: seqRng([0.2, 0.6, 0.4, 0.8]) });
    expect(spec.type).toBe(TASK_TYPES.MATCH_PAIRS);
    expect(spec.meta.pairs.length).toBe(4);
    expect(spec.meta.wordCards.length).toBe(4);
    expect(spec.meta.imageCards.length).toBe(4);
    // Every word card references a real pair id.
    const pairIds = new Set(spec.meta.pairs.map((p) => p.id));
    for (const wc of spec.meta.wordCards) expect(pairIds.has(wc.pairId)).toBe(true);
  });
});

describe('generateListenChoose', () => {
  it('speaks Polish for a non-English module', () => {
    const spec = generateListenChoose({ item: colorItems[0], pool: colorItems, rng: seqRng([0.1, 0.5, 0.9]) });
    expect(spec.type).toBe(TASK_TYPES.LISTEN_CHOOSE);
    expect(spec.meta.speak.lang).toBe('pl-PL');
    expect(spec.meta.speak.audioKey).toBe(colorItems[0].audioKey);
    expect(exactlyOneCorrect(spec)).toBe(true);
  });

  it('speaks the English side for EN_TO_PL', () => {
    const spec = generateListenChoose({
      item: catItem,
      pool: englishWords,
      direction: DIRECTIONS.EN_TO_PL,
      rng: seqRng([0.2, 0.4, 0.6])
    });
    expect(spec.meta.speak.text).toBe('cat');
    expect(spec.meta.speak.lang).toBe('en-US');
  });
});

describe('generateSpellWord and isSpellingCorrect', () => {
  it('tiles contain every letter of the target plus distractors', () => {
    const spec = generateSpellWord({ item: catItem, target: 'cat', distractorCount: 3, rng: seqRng([0.1, 0.5, 0.9, 0.3, 0.7]) });
    expect(spec.type).toBe(TASK_TYPES.SPELL_WORD);
    expect(spec.meta.solution).toEqual(['c', 'a', 't']);
    const labels = spec.meta.tiles.map((t) => t.label);
    for (const ch of ['c', 'a', 't']) expect(labels).toContain(ch);
    // Includes distractors -> more tiles than letters.
    expect(spec.meta.tiles.length).toBe(3 + 3);
    // Exactly the target-letter tiles are marked correct.
    expect(spec.options.filter((o) => o.isCorrect).length).toBe(3);
  });

  it('validates correct vs incorrect orderings', () => {
    expect(isSpellingCorrect([{ label: 'c' }, { label: 'a' }, { label: 't' }], 'cat')).toBe(true);
    expect(isSpellingCorrect(['C', 'A', 'T'], 'cat')).toBe(true);
    expect(isSpellingCorrect([{ label: 't' }, { label: 'a' }, { label: 'c' }], 'cat')).toBe(false);
    expect(isSpellingCorrect([{ label: 'c' }, { label: 'a' }], 'cat')).toBe(false);
    expect(isSpellingCorrect(null, 'cat')).toBe(false);
  });

  it('spells a Polish example word from a letter item', () => {
    const aItem = letterItems.find((l) => l.exampleWord);
    const spec = generateSpellWord({ item: aItem, rng: seqRng([0.2, 0.6]) });
    expect(spec.meta.target).toBe(aItem.exampleWord);
    expect(isSpellingCorrect(spec.meta.solution.map((c) => ({ label: c })), spec.meta.target)).toBe(true);
  });
});

describe('generateTrueFalse', () => {
  it('produces a true case that speaks the item own ENGLISH word (C3), not Polish', () => {
    const spec = generateTrueFalse({ item: catItem, pool: englishWords, forceTruth: true, rng: seqRng([0.1]) });
    expect(spec.type).toBe(TASK_TYPES.TRUE_FALSE);
    expect(spec.meta.expected).toBe(true);
    // The spoken statement is the ENGLISH word (cat), never the Polish answer (kot).
    expect(spec.meta.speak.text).toBe(catItem.prompt);
    expect(spec.meta.speak.lang).toBe('en-US');
    expect(spec.meta.speak.text).not.toBe(catItem.answer);
    // The correct English pronunciation of the pictured item is available to replay.
    expect(spec.meta.englishSpeak.text).toBe(catItem.prompt);
    expect(spec.correctItemId).toBe('true');
    expect(exactlyOneCorrect(spec)).toBe(true);
  });

  it('produces a false case that speaks a DISTRACTOR English word (C3)', () => {
    const spec = generateTrueFalse({ item: catItem, pool: englishWords, forceTruth: false, rng: seqRng([0.2]) });
    expect(spec.meta.expected).toBe(false);
    // A false statement speaks a different (distractor) English word.
    expect(spec.meta.speak.text).not.toBe(catItem.prompt);
    expect(spec.meta.speak.lang).toBe('en-US');
    // The pictured item's correct pronunciation is still the cat's own English word.
    expect(spec.meta.englishSpeak.text).toBe(catItem.prompt);
    expect(spec.correctItemId).toBe('false');
    expect(exactlyOneCorrect(spec)).toBe(true);
  });

  it('falls back to a true statement when no distractor exists', () => {
    const spec = generateTrueFalse({ item: catItem, pool: [catItem], rng: seqRng([0.9]) });
    expect(spec.meta.expected).toBe(true);
  });
});

describe('generateCountChoose', () => {
  it('glyph count matches the number and the number is among options', () => {
    const spec = generateCountChoose({ count: 3, emoji: '🍎', optionCount: 4, rng: seqRng([0.1, 0.4, 0.7, 0.9, 0.2]) });
    expect(spec.type).toBe(TASK_TYPES.COUNT_CHOOSE);
    expect(spec.meta.glyphs.length).toBe(3);
    expect(spec.meta.glyphs.every((g) => g === '🍎')).toBe(true);
    const labels = spec.options.map((o) => o.label);
    expect(labels).toContain('3');
    expect(spec.correctItemId).toBe('n_3');
    expect(exactlyOneCorrect(spec)).toBe(true);
    expect(spec.options.length).toBe(4);
  });

  it('accepts a countingTasks-style task object', () => {
    const spec = generateCountChoose({ task: { id: 'count_x', emoji: '⭐', count: 5 }, rng: seqRng([0.3, 0.6, 0.1]) });
    expect(spec.meta.glyphs.length).toBe(5);
    // The recorded item must be the REAL catalog digit (number_5), never a
    // synthetic count_* item, so recording reinforces the actual digit and does
    // not create an orphan NUMBERS review state that skews the Mistrz Cyfr badge.
    expect(spec.item).not.toBeNull();
    expect(spec.item.id).toBe('number_5');
    expect(spec.item.moduleType).toBe(LEARNING_MODULES.NUMBERS);
    expect(spec.item.prompt).toBe('5');
  });

  it('records the real number_N catalog item for an explicit count', () => {
    const spec = generateCountChoose({ count: 3, emoji: '🍎', rng: seqRng([0.1, 0.4, 0.7]) });
    // The recorded item is the real digit item, matching a member of `numbers`.
    expect(spec.item).toBe(numberItems.find((n) => n.id === 'number_3'));
    expect(spec.item.id).toBe('number_3');
    // No synthetic count_* id is produced anywhere on the recorded item.
    expect(spec.item.id.startsWith('count_')).toBe(false);
  });

  it('emits no orphan item (item null) when the count has no 0-9 catalog digit', () => {
    // Counts outside 0-9 (e.g. 12) have no real catalog digit; item must be null so
    // the UI skips recording and never writes an orphan NUMBERS review state.
    const spec = generateCountChoose({ count: 12, emoji: '⭐', maxNumber: 15, rng: seqRng([0.2, 0.5, 0.8]) });
    expect(spec.item).toBeNull();
    expect(spec.meta.glyphs.length).toBe(12);
    // The correct option is still present and exactly one option is correct.
    expect(spec.options.some((o) => o.label === '12' && o.isCorrect)).toBe(true);
    expect(exactlyOneCorrect(spec)).toBe(true);
  });
});

describe('generateWhichMatches', () => {
  it('word-mode marks the target as the only correct candidate', () => {
    const spec = generateWhichMatches({ target: colorItems[0], candidates: colorItems, rng: seqRng([0.2, 0.5, 0.8]) });
    expect(spec.type).toBe(TASK_TYPES.WHICH_MATCHES);
    expect(spec.meta.variant).toBe('which-matches');
    expect(spec.correctItemId).toBe(colorItems[0].id);
    expect(exactlyOneCorrect(spec)).toBe(true);
  });

  it('find-color-in-scene resolves options from a color lookup', () => {
    const lookup = (name) => colors.find((c) => c.prompt === name) || null;
    const scene = colorScenes[0];
    const spec = generateWhichMatches({ scene, colorLookup: lookup, rng: seqRng([0.1, 0.5, 0.9, 0.3]) });
    expect(spec.meta.variant).toBe('find-color');
    expect(spec.meta.sceneDescriptor.id).toBe(scene.id);
    expect(spec.options.length).toBe(1 + scene.others.length);
    expect(exactlyOneCorrect(spec)).toBe(true);
    const correct = spec.options.find((o) => o.isCorrect);
    // Options are colour SWATCHES (rule A/C1): no text label, a real colour tile,
    // and the correct swatch matches the named target colour.
    expect(correct.label).toBe('');
    expect(correct.colorHex).toBe(lookup(scene.target).colorHex);
    // The prompt names the target colour by word/audio, not by echoing a swatch.
    expect(spec.prompt.speak.text).toBe(scene.target);
    expect(spec.meta.answerRep).toBe('swatch');
    expect(spec.meta.promptRep).toBe('spoken');
  });
});

describe('taskTypesForLevel', () => {
  it('EARLY excludes SPELL_WORD, LATE includes it', () => {
    expect(taskTypesForLevel(AGE_LEVELS.EARLY)).not.toContain(TASK_TYPES.SPELL_WORD);
    expect(taskTypesForLevel(AGE_LEVELS.LATE)).toContain(TASK_TYPES.SPELL_WORD);
  });

  it('intersects a caller-provided mix with the level allowance', () => {
    const mix = [TASK_TYPES.SPELL_WORD, TASK_TYPES.MULTIPLE_CHOICE];
    expect(taskTypesForLevel(AGE_LEVELS.EARLY, mix)).toEqual([TASK_TYPES.MULTIPLE_CHOICE]);
    expect(taskTypesForLevel(AGE_LEVELS.LATE, mix).sort()).toEqual(mix.slice().sort());
  });
});

describe('buildLesson', () => {
  it('returns questionCount well-formed specs and is deterministic', () => {
    const params = {
      module: LEARNING_MODULES.ENGLISH,
      level: AGE_LEVELS.LATE,
      availableItems: englishWords,
      questionCount: 6,
      rng: seqRng([0.1, 0.3, 0.5, 0.7, 0.9, 0.2, 0.4, 0.6, 0.8, 0.05])
    };
    const a = buildLesson(params);
    const b = buildLesson({ ...params, rng: seqRng([0.1, 0.3, 0.5, 0.7, 0.9, 0.2, 0.4, 0.6, 0.8, 0.05]) });
    expect(a.length).toBe(6);
    expect(a.map((s) => s.type)).toEqual(b.map((s) => s.type));
    for (const spec of a) {
      expect(typeof spec.type).toBe('string');
      expect(Array.isArray(spec.options)).toBe(true);
    }
  });

  it('EARLY lessons never use SPELL_WORD', () => {
    const specs = buildLesson({
      module: LEARNING_MODULES.ENGLISH,
      level: AGE_LEVELS.EARLY,
      availableItems: englishWords,
      questionCount: 12,
      rng: seqRng([0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95])
    });
    expect(specs.length).toBe(12);
    expect(specs.some((s) => s.type === TASK_TYPES.SPELL_WORD)).toBe(false);
  });

  it('LATE English lessons can include SPELL_WORD', () => {
    // A high, constant rng steers type selection toward the last allowed type
    // (SPELL_WORD) so we deterministically prove LATE lessons can produce it.
    const specs = buildLesson({
      module: LEARNING_MODULES.ENGLISH,
      level: AGE_LEVELS.LATE,
      availableItems: englishWords,
      questionCount: 30,
      rng: () => 0.99
    });
    expect(specs.some((s) => s.type === TASK_TYPES.SPELL_WORD)).toBe(true);
  });

  it('respects a caller-provided taskTypeMix', () => {
    const specs = buildLesson({
      module: LEARNING_MODULES.COLORS,
      level: AGE_LEVELS.LATE,
      availableItems: colorItems,
      questionCount: 5,
      taskTypeMix: [TASK_TYPES.MULTIPLE_CHOICE],
      rng: seqRng([0.1, 0.2, 0.3, 0.4, 0.5])
    });
    expect(specs.length).toBe(5);
    expect(specs.every((s) => s.type === TASK_TYPES.MULTIPLE_CHOICE)).toBe(true);
  });

  it('NUMBERS lessons fill entirely with COUNT_CHOOSE (quantity->digit) and concrete prompts', () => {
    // NUMBERS only supports COUNT_CHOOSE (a bare digit MC is rejected), so the
    // composer must still fill the lesson by falling through to the valid type.
    const specs = buildLesson({
      module: LEARNING_MODULES.NUMBERS,
      level: AGE_LEVELS.EARLY,
      availableItems: numberItems,
      questionCount: 6,
      rng: seqRng([0.1, 0.83, 0.17, 0.66, 0.42, 0.29, 0.55, 0.7, 0.05, 0.9])
    });
    expect(specs.length).toBe(6);
    expect(specs.every((s) => s.type === TASK_TYPES.COUNT_CHOOSE)).toBe(true);
    for (const s of specs) {
      expect(s.meta.promptRep).toBe('quantity');
      expect(s.meta.answerRep).toBe('digit');
      expect(typeof s.prompt.text).toBe('string');
      expect(s.prompt.text.startsWith('Ile ')).toBe(true);
    }
  });

  it('returns an empty array for empty input instead of throwing', () => {
    expect(buildLesson({ module: LEARNING_MODULES.COLORS, availableItems: [] })).toEqual([]);
    expect(buildLesson({})).toEqual([]);
  });
});

describe('graceful degradation on tiny pools', () => {
  it('generators do not throw with single-item or empty pools', () => {
    expect(() => generateMultipleChoice({ item: catItem, pool: [catItem], optionCount: 4, rng: seqRng([0.5]) })).not.toThrow();
    expect(() => generateListenChoose({ item: catItem, pool: [], rng: seqRng([0.5]) })).not.toThrow();
    expect(() => generateMatchPairs({ items: [catItem], pairCount: 4, rng: seqRng([0.5]) })).not.toThrow();
    expect(() => generateTrueFalse({ item: catItem, pool: [], rng: seqRng([0.5]) })).not.toThrow();
    expect(() => generateWhichMatches({ target: catItem, candidates: [], rng: seqRng([0.5]) })).not.toThrow();
    expect(() => generateCountChoose({ count: 0, emoji: '🍎', rng: seqRng([0.5]) })).not.toThrow();
    expect(() => generateSpellWord({ item: catItem, target: '', rng: seqRng([0.5]) })).not.toThrow();

    // With a 1-item pool multiple choice yields just the correct option.
    const spec = generateMultipleChoice({ item: catItem, pool: [catItem], optionCount: 4, rng: seqRng([0.5]) });
    expect(spec.options.length).toBe(1);
    expect(exactlyOneCorrect(spec)).toBe(true);
  });
});

// =============================================================================
// DYDACTIC RULE ENFORCEMENT (A, C1-C5). These tests would FAIL if any rule were
// reverted to the old flawed behaviour, so they guard the pedagogy directly.
// =============================================================================

const nonDiacriticLetters = polishLetters.filter((l) => !hasPolishDiacritic(l.prompt));
const englishAnimalsWithPics = englishWords.filter((w) => w.category === 'animals');

function correctOption(spec) {
  return spec.options.find((o) => o.isCorrect);
}
function distractorOptions(spec) {
  return spec.options.filter((o) => !o.isCorrect);
}

describe('RULE C1: correct option is a DIFFERENT representation than the prompt', () => {
  it('NUMBERS: plain digit->digit multiple choice is rejected (returns null)', () => {
    const four = numbers.find((n) => n.id === 'number_4');
    // Old behaviour showed "4" in the header and offered "4" as an option; the
    // engine now refuses to build that, forcing a quantity<->digit COUNT_CHOOSE.
    expect(generateMultipleChoice({ item: four, pool: numbers, rng: seqRng([0.5]) })).toBeNull();
  });

  it('NUMBERS COUNT_CHOOSE pairs a QUANTITY prompt with DIGIT options (never digit->digit)', () => {
    const spec = generateCountChoose({ count: 4, emoji: '⭐', rng: seqRng([0.1, 0.4, 0.7, 0.9]) });
    expect(spec.meta.promptRep).toBe('quantity');
    expect(spec.meta.answerRep).toBe('digit');
    expect(spec.meta.promptRep).not.toBe(spec.meta.answerRep);
    // The prompt shows a group of glyphs, never the digit itself.
    expect(spec.prompt.glyphs.length).toBe(4);
    expect(spec.prompt.text).not.toContain('4');
  });

  it('COLORS multiple choice puts NO swatch in the prompt and uses swatch options', () => {
    const red = colors[0];
    const spec = generateMultipleChoice({ item: red, pool: colors, level: AGE_LEVELS.EARLY, rng: seqRng([0.2, 0.5, 0.8, 0.3]) });
    // Prompt carries the spoken colour name, not a colour swatch identical to a tile.
    expect(spec.prompt.colorHex).toBeUndefined();
    expect(spec.prompt.speak.text).toBe(red.prompt);
    expect(spec.meta.promptRep).toBe('spoken');
    expect(spec.meta.answerRep).toBe('swatch');
    // Every option is a real swatch (colorHex), no bare text label.
    for (const o of spec.options) {
      expect(typeof o.colorHex).toBe('string');
      expect(o.label).toBe('');
    }
  });
});

describe('RULE C2: the prompt picture never appears on the correct option; distractors differ', () => {
  it('ENGLISH listen-choose: correct picture option is distinct from every distractor', () => {
    const spec = generateListenChoose({ item: catItem, pool: englishAnimalsWithPics, level: AGE_LEVELS.EARLY, rng: seqRng([0.15, 0.35, 0.55, 0.75]) });
    const correct = correctOption(spec);
    // The prompt is a sound only (no give-away picture in the header).
    expect(spec.prompt.emoji).toBe('🔊');
    expect(spec.prompt.picture).toBeUndefined();
    // Distractor pictures differ from the correct picture (no identical icon).
    for (const d of distractorOptions(spec)) {
      expect(d.emoji).not.toBe(correct.emoji);
    }
  });

  it('ENGLISH multiple choice: prompt has no picture and distractor emojis differ from the answer', () => {
    const drawItem = englishWords.find((w) => w.id === 'english_draw');
    const spec = generateMultipleChoice({ item: drawItem, pool: englishWords, level: AGE_LEVELS.EARLY, rng: seqRng([0.1, 0.3, 0.6, 0.8]) });
    // Old bug: "draw" prompt with a palette icon AND a palette-icon correct option.
    expect(spec.prompt.emoji).toBeUndefined();
    const correct = correctOption(spec);
    for (const d of distractorOptions(spec)) {
      expect(d.emoji).not.toBe(correct.emoji);
    }
  });
});

describe('RULE C3: English teaches the ENGLISH sound/spelling <-> meaning, never Polish', () => {
  it('EARLY English multiple choice: options are PICTURES, stimulus is spoken English', () => {
    const spec = generateMultipleChoice({ item: catItem, pool: englishAnimalsWithPics, level: AGE_LEVELS.EARLY, rng: seqRng([0.2, 0.5, 0.8, 0.3]) });
    expect(spec.meta.answerRep).toBe('picture');
    // No English/Polish TEXT to read on the options for a non-reader.
    for (const o of spec.options) expect(o.label).toBe('');
    // The stimulus (and post-answer replay) is the ENGLISH word, never Polish.
    expect(spec.meta.englishSpeak.text).toBe('cat');
    expect(spec.meta.englishSpeak.lang).toBe('en-US');
    expect(spec.meta.englishSpeak.text).not.toBe(catItem.answer);
  });

  it('EARLY English match-pairs pairs the ENGLISH word/sound with a picture, never Polish text', () => {
    const items = englishAnimalsWithPics.slice(0, 4);
    const spec = generateMatchPairs({ items, pairCount: 4, level: AGE_LEVELS.EARLY, rng: seqRng([0.2, 0.6, 0.4, 0.8]) });
    expect(spec.meta.isEnglish).toBe(true);
    for (const wc of spec.meta.wordCards) {
      // For non-readers the word card carries spoken ENGLISH, no Polish text.
      expect(wc.label).toBe('');
      expect(wc.speak.lang).toBe('en-US');
      const item = items.find((i) => i.id === wc.pairId);
      expect(wc.speak.text).toBe(item.prompt); // English word
      expect(wc.speak.text).not.toBe(item.answer); // never the Polish translation
    }
  });

  it('LATE English match-pairs may show English TEXT for readers (never Polish)', () => {
    const items = englishAnimalsWithPics.slice(0, 4);
    const spec = generateMatchPairs({ items, pairCount: 4, level: AGE_LEVELS.LATE, rng: seqRng([0.2, 0.6, 0.4, 0.8]) });
    for (const wc of spec.meta.wordCards) {
      const item = items.find((i) => i.id === wc.pairId);
      expect(wc.label).toBe(item.prompt); // English text, not Polish
      expect(wc.label).not.toBe(item.answer);
    }
  });

  it('English listen-choose always speaks ENGLISH and exposes the pronunciation to replay', () => {
    const spec = generateListenChoose({ item: catItem, pool: englishAnimalsWithPics, level: AGE_LEVELS.EARLY, rng: seqRng([0.2, 0.4, 0.6]) });
    expect(spec.meta.speak.lang).toBe('en-US');
    expect(spec.meta.speak.text).toBe('cat');
    expect(spec.meta.englishSpeak.text).toBe('cat');
  });

  it('buildLesson EARLY English never emits reading text on options and never Polish audio as the stimulus', () => {
    const early = itemsForLevel(LEARNING_MODULES.ENGLISH, AGE_LEVELS.EARLY);
    const specs = buildLesson({
      module: LEARNING_MODULES.ENGLISH,
      level: AGE_LEVELS.EARLY,
      availableItems: early,
      questionCount: 20,
      rng: seqRng([0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95, 0.12, 0.28, 0.44])
    });
    expect(specs.length).toBe(20);
    for (const spec of specs) {
      // No spec speaks Polish as the English learning material.
      if (spec.meta && spec.meta.speak) {
        expect(spec.meta.speak.lang).toBe('en-US');
      }
      // Options never carry text to read for EARLY English.
      for (const o of spec.options) {
        if (o.id === 'true' || o.id === 'false') continue; // true/false controls
        expect(o.label).toBe('');
      }
    }
  });
});

describe('RULE C4: real progression - letters start simple, spelling unlocks later', () => {
  it('firstStageLetters exposes only non-diacritic letters', () => {
    expect(firstStageLetters().length).toBeGreaterThan(0);
    for (const l of firstStageLetters()) {
      expect(hasPolishDiacritic(l.prompt)).toBe(false);
    }
    // It is a strict subset (the diacritic letters are excluded).
    expect(firstStageLetters().length).toBeLessThan(polishLetters.length);
  });

  it('buildLesson first letter stage contains NO diacritic letters', () => {
    const specs = buildLesson({
      module: LEARNING_MODULES.POLISH_LETTERS,
      level: AGE_LEVELS.EARLY,
      stage: 1,
      availableItems: polishLetters,
      questionCount: 30,
      rng: seqRng([0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95, 0.12, 0.28, 0.44, 0.6, 0.72])
    });
    expect(specs.length).toBe(30);
    for (const spec of specs) {
      expect(hasPolishDiacritic(spec.item.prompt)).toBe(false);
    }
  });

  it('buildLesson first letter stage never emits SPELL_WORD', () => {
    const specs = buildLesson({
      module: LEARNING_MODULES.POLISH_LETTERS,
      level: AGE_LEVELS.LATE, // even for readers, stage 1 has no spelling
      stage: 1,
      availableItems: polishLetters,
      questionCount: 30,
      rng: () => 0.99 // steer toward the last allowed type
    });
    expect(specs.some((s) => s.type === TASK_TYPES.SPELL_WORD)).toBe(false);
  });

  it('EARLY never emits SPELL_WORD for any module', () => {
    for (const mod of [LEARNING_MODULES.ENGLISH, LEARNING_MODULES.POLISH_LETTERS, LEARNING_MODULES.COLORS]) {
      const specs = buildLesson({
        module: mod,
        level: AGE_LEVELS.EARLY,
        availableItems: itemsFor(mod),
        questionCount: 20,
        rng: () => 0.99
      });
      expect(specs.some((s) => s.type === TASK_TYPES.SPELL_WORD)).toBe(false);
    }
  });

  it('LATE letters at a higher stage CAN include diacritic letters and SPELL_WORD', () => {
    const specs = buildLesson({
      module: LEARNING_MODULES.POLISH_LETTERS,
      level: AGE_LEVELS.LATE,
      stage: 2,
      availableItems: polishLetters,
      questionCount: 40,
      rng: () => 0.99
    });
    // At stage 2 the diacritic letters are back in the pool.
    expect(specs.some((s) => hasPolishDiacritic(s.item.prompt))).toBe(true);
  });
});

describe('RULE C5: concrete counting prompt with correct Polish agreement', () => {
  it('countingPrompt names exactly what is shown (genitive plural question form)', () => {
    expect(countingPrompt('⭐')).toBe('Ile gwiazdek widzisz?');
    expect(countingPrompt('🍎')).toBe('Ile jabłek widzisz?');
  });

  it('polishPluralCategory picks one/few/many correctly', () => {
    expect(polishPluralCategory(1)).toBe('one');
    expect(polishPluralCategory(2)).toBe('few');
    expect(polishPluralCategory(4)).toBe('few');
    expect(polishPluralCategory(5)).toBe('many');
    expect(polishPluralCategory(12)).toBe('many'); // teens are "many"
    expect(polishPluralCategory(22)).toBe('few');
  });

  it('countingCountLabel agrees in number (1 gwiazdka / 2 gwiazdki / 5 gwiazdek)', () => {
    expect(countingCountLabel('⭐', 1)).toBe('1 gwiazdka');
    expect(countingCountLabel('⭐', 2)).toBe('2 gwiazdki');
    expect(countingCountLabel('⭐', 5)).toBe('5 gwiazdek');
  });

  it('COUNT_CHOOSE spec carries the concrete prompt and agreeing count label', () => {
    const spec = generateCountChoose({ count: 2, emoji: '⭐', rng: seqRng([0.1, 0.4, 0.7, 0.9]) });
    expect(spec.prompt.text).toBe('Ile gwiazdek widzisz?');
    expect(spec.meta.countLabel).toBe('2 gwiazdki');
  });
});
