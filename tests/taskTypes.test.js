import { describe, it, expect } from 'vitest';
import { LEARNING_MODULES, AGE_LEVELS } from '../docs/js/logic/models.js';
import {
  itemsFor,
  englishWords,
  colorScenes,
  colors
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
  it('produces a true case with the item own label', () => {
    const spec = generateTrueFalse({ item: catItem, pool: englishWords, forceTruth: true, rng: seqRng([0.1]) });
    expect(spec.type).toBe(TASK_TYPES.TRUE_FALSE);
    expect(spec.meta.expected).toBe(true);
    expect(spec.meta.statement).toBe(catItem.answer);
    expect(spec.correctItemId).toBe('true');
    expect(exactlyOneCorrect(spec)).toBe(true);
  });

  it('produces a false case with a distractor label', () => {
    const spec = generateTrueFalse({ item: catItem, pool: englishWords, forceTruth: false, rng: seqRng([0.2]) });
    expect(spec.meta.expected).toBe(false);
    expect(spec.meta.statement).not.toBe(catItem.answer);
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
    expect(correct.label).toBe(scene.target);
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
