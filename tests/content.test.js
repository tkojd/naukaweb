import { describe, it, expect } from 'vitest';
import { LEARNING_MODULES, AGE_LEVELS, levelForAge } from '../docs/js/logic/models.js';
import {
  colors,
  polishLetters,
  numbers,
  englishWords,
  allItems,
  itemsFor,
  itemsForLevel,
  categoriesFor,
  itemsForCategory,
  stagesFor,
  itemsUpToStage,
  englishByKind,
  translationPair,
  colorMixes,
  colorScenes,
  letterCasePairs,
  lettersInWords,
  syllableWords,
  countingTasks,
  mathProblems,
  orderingSequences,
  hasPolishDiacritic,
  firstStageLetters,
  POLISH_DIACRITIC_CHARS,
  countingNounFor,
  countingPrompt,
  countingCountLabel,
  polishPluralCategory,
  polishCountNoun
} from '../docs/js/logic/content.js';

// -----------------------------------------------------------------------------
// Backward compatibility: original ids must all still be present and unchanged.
// -----------------------------------------------------------------------------

describe('models age levels', () => {
  it('exposes EARLY and LATE', () => {
    expect(AGE_LEVELS).toEqual({ EARLY: 'EARLY', LATE: 'LATE' });
  });

  it('levelForAge maps 4-6 to EARLY and 7-10 to LATE', () => {
    expect(levelForAge(4)).toBe('EARLY');
    expect(levelForAge(6)).toBe('EARLY');
    expect(levelForAge(7)).toBe('LATE');
    expect(levelForAge(10)).toBe('LATE');
  });
});

describe('original content ids preserved', () => {
  it('keeps the 10 basic color ids', () => {
    const original = [
      'color_czerwony', 'color_niebieski', 'color_zielony', 'color_żółty',
      'color_pomarańczowy', 'color_fioletowy', 'color_różowy', 'color_brązowy',
      'color_czarny', 'color_biały'
    ];
    const ids = new Set(colors.map((c) => c.id));
    for (const id of original) expect(ids.has(id)).toBe(true);
    expect(colors.length).toBeGreaterThanOrEqual(10);
    // first 10 remain the originals in order
    expect(colors.slice(0, 10).map((c) => c.id)).toEqual(original);
  });

  it('keeps exactly 32 Polish letters with all nine diacritics', () => {
    expect(polishLetters).toHaveLength(32);
    const chars = polishLetters.map((l) => l.prompt);
    for (const d of ['Ą', 'Ć', 'Ę', 'Ł', 'Ń', 'Ó', 'Ś', 'Ź', 'Ż']) {
      expect(chars).toContain(d);
    }
    expect(polishLetters.find((l) => l.id === 'letter_k').exampleWord).toBe('kot');
  });

  it('keeps digits 0-9 with their ids and Polish words', () => {
    expect(numbers).toHaveLength(10);
    expect(numbers.map((n) => n.id)).toEqual(
      Array.from({ length: 10 }, (_, i) => `number_${i}`)
    );
    expect(numbers[5].answer).toBe('pięć');
  });

  it('keeps every original english_* id present', () => {
    const original = [
      'english_cat', 'english_dog', 'english_bird', 'english_fish', 'english_horse',
      'english_red', 'english_blue', 'english_green', 'english_yellow',
      'english_one', 'english_two', 'english_three',
      'english_mother', 'english_father', 'english_sister', 'english_brother',
      'english_apple', 'english_milk', 'english_bread', 'english_water',
      'english_sun', 'english_moon', 'english_tree', 'english_house'
    ];
    const ids = new Set(englishWords.map((w) => w.id));
    for (const id of original) expect(ids.has(id)).toBe(true);
  });

  it('all ids across the catalog are unique', () => {
    const ids = allItems.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('itemsFor returns the right module arrays', () => {
    expect(itemsFor(LEARNING_MODULES.COLORS)).toBe(colors);
    expect(itemsFor(LEARNING_MODULES.POLISH_LETTERS)).toBe(polishLetters);
    expect(itemsFor(LEARNING_MODULES.NUMBERS)).toBe(numbers);
    expect(itemsFor(LEARNING_MODULES.ENGLISH)).toBe(englishWords);
    expect(itemsFor('NOPE')).toEqual([]);
  });
});

// -----------------------------------------------------------------------------
// English scale + tagging.
// -----------------------------------------------------------------------------

describe('English expansion', () => {
  it('provides a few hundred (but not thousands of) items', () => {
    expect(englishWords.length).toBeGreaterThanOrEqual(100);
    expect(englishWords.length).toBeLessThan(500);
  });

  it('covers all required thematic categories', () => {
    const cats = new Set(categoriesFor(LEARNING_MODULES.ENGLISH));
    for (const c of [
      'animals', 'colors', 'numbers', 'family', 'food', 'body', 'clothes',
      'house', 'nature', 'transport', 'verbs', 'adjectives', 'greetings',
      'phrases', 'sentences'
    ]) {
      expect(cats.has(c)).toBe(true);
    }
  });

  it('has word, phrase and sentence kinds', () => {
    expect(englishByKind('word').length).toBeGreaterThan(0);
    expect(englishByKind('phrase').length).toBeGreaterThan(0);
    expect(englishByKind('sentence').length).toBeGreaterThan(0);
    // every item has a defined kind
    for (const item of englishWords) {
      expect(['word', 'phrase', 'sentence']).toContain(item.kind);
    }
  });

  it('includes the required greetings/phrases and simple sentences', () => {
    const prompts = englishWords.map((w) => w.prompt);
    for (const p of ['Hello', 'How are you?', 'Thank you', 'Please', 'Good morning']) {
      expect(prompts).toContain(p);
    }
    expect(prompts).toContain('The cat is black.');
    expect(prompts).toContain('I have a red ball.');
  });

  it('derives both translation directions from a single item', () => {
    const cat = englishWords.find((w) => w.id === 'english_cat');
    expect(translationPair(cat, 'EN_TO_PL')).toEqual({
      prompt: 'cat', answer: 'kot', direction: 'EN_TO_PL'
    });
    expect(translationPair(cat, 'PL_TO_EN')).toEqual({
      prompt: 'kot', answer: 'cat', direction: 'PL_TO_EN'
    });
  });

  it('sentences are tagged LATE only', () => {
    for (const s of englishByKind('sentence')) {
      expect(s.level).toBe(AGE_LEVELS.LATE);
    }
  });
});

// -----------------------------------------------------------------------------
// Leveled / staged query helpers.
// -----------------------------------------------------------------------------

describe('leveled and staged helpers', () => {
  it('itemsForLevel includes level-less items in both bands', () => {
    // polishLetters have no level -> appear for both EARLY and LATE
    expect(itemsForLevel(LEARNING_MODULES.POLISH_LETTERS, AGE_LEVELS.EARLY)).toHaveLength(32);
    expect(itemsForLevel(LEARNING_MODULES.POLISH_LETTERS, AGE_LEVELS.LATE)).toHaveLength(32);
  });

  it('itemsForLevel filters English by the tagged level', () => {
    const early = itemsForLevel(LEARNING_MODULES.ENGLISH, AGE_LEVELS.EARLY);
    const late = itemsForLevel(LEARNING_MODULES.ENGLISH, AGE_LEVELS.LATE);
    // no sentence should be in the EARLY set
    expect(early.some((i) => i.kind === 'sentence')).toBe(false);
    expect(late.some((i) => i.kind === 'sentence')).toBe(true);
  });

  it('itemsForCategory returns only that category', () => {
    const animals = itemsForCategory(LEARNING_MODULES.ENGLISH, 'animals');
    expect(animals.length).toBeGreaterThan(0);
    expect(animals.every((i) => i.category === 'animals')).toBe(true);
  });

  it('stagesFor returns ascending distinct stages', () => {
    const stages = stagesFor(LEARNING_MODULES.ENGLISH);
    expect(stages).toEqual([...stages].sort((a, b) => a - b));
    expect(stages[0]).toBe(1);
    expect(new Set(stages).size).toBe(stages.length);
  });

  it('itemsUpToStage is monotonic (each stage is a superset of the previous)', () => {
    const stages = stagesFor(LEARNING_MODULES.ENGLISH);
    for (let i = 1; i < stages.length; i++) {
      const prev = new Set(itemsUpToStage(LEARNING_MODULES.ENGLISH, stages[i - 1]).map((x) => x.id));
      const curr = new Set(itemsUpToStage(LEARNING_MODULES.ENGLISH, stages[i]).map((x) => x.id));
      for (const id of prev) expect(curr.has(id)).toBe(true);
      expect(curr.size).toBeGreaterThanOrEqual(prev.size);
    }
  });

  it('itemsUpToStage stage 1 only includes stage-1 items', () => {
    const s1 = itemsUpToStage(LEARNING_MODULES.ENGLISH, 1);
    expect(s1.every((i) => (i.stage || 1) === 1)).toBe(true);
    expect(s1.length).toBeGreaterThan(0);
  });

  it('itemsUpToStage can be further filtered by level and stays monotonic per level', () => {
    const stages = stagesFor(LEARNING_MODULES.ENGLISH);
    for (let i = 1; i < stages.length; i++) {
      const prev = new Set(
        itemsUpToStage(LEARNING_MODULES.ENGLISH, stages[i - 1], AGE_LEVELS.LATE).map((x) => x.id)
      );
      const curr = new Set(
        itemsUpToStage(LEARNING_MODULES.ENGLISH, stages[i], AGE_LEVELS.LATE).map((x) => x.id)
      );
      for (const id of prev) expect(curr.has(id)).toBe(true);
    }
  });
});

// -----------------------------------------------------------------------------
// Expanded Colors / Letters / Numbers data structures.
// -----------------------------------------------------------------------------

describe('expanded Colors data', () => {
  it('adds extra colors beyond the basic 10 with valid hex', () => {
    expect(colors.length).toBeGreaterThan(10);
    for (const c of colors) {
      expect(c.colorHex).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('color mixing pairs reference known result colors', () => {
    const names = new Set(colors.map((c) => c.prompt));
    expect(colorMixes.length).toBeGreaterThan(0);
    for (const mix of colorMixes) {
      expect(names.has(mix.a)).toBe(true);
      expect(names.has(mix.b)).toBe(true);
      expect(names.has(mix.result)).toBe(true);
    }
  });

  it('color scenes have a target and distractors', () => {
    expect(colorScenes.length).toBeGreaterThan(0);
    for (const scene of colorScenes) {
      expect(typeof scene.target).toBe('string');
      expect(Array.isArray(scene.others)).toBe(true);
      expect(scene.others).not.toContain(scene.target);
    }
  });
});

describe('expanded Letters data', () => {
  it('case pairs cover all 32 letters', () => {
    expect(letterCasePairs).toHaveLength(32);
    const k = letterCasePairs.find((p) => p.upper === 'K');
    expect(k.lower).toBe('k');
  });

  it('letters-in-words locate the target letter in its example word', () => {
    expect(lettersInWords).toHaveLength(32);
    for (const entry of lettersInWords) {
      expect(entry.targetIndex).toBeGreaterThanOrEqual(0);
      expect(entry.word.toLowerCase()[entry.targetIndex]).toBe(entry.lower);
    }
  });

  it('syllable words split into the concatenated whole word', () => {
    expect(syllableWords.length).toBeGreaterThan(0);
    for (const s of syllableWords) {
      expect(s.syllables.join('')).toBe(s.word);
    }
  });

  it('hasPolishDiacritic detects the nine diacritic letters (any case)', () => {
    for (const d of POLISH_DIACRITIC_CHARS) {
      expect(hasPolishDiacritic(d)).toBe(true);
      expect(hasPolishDiacritic(d.toUpperCase())).toBe(true);
    }
    for (const plain of ['A', 'b', 'K', 'z']) {
      expect(hasPolishDiacritic(plain)).toBe(false);
    }
    expect(hasPolishDiacritic('')).toBe(false);
    expect(hasPolishDiacritic(undefined)).toBe(false);
  });

  it('diacritic letters carry a later default stage than plain letters (C4)', () => {
    const a = polishLetters.find((l) => l.id === 'letter_a');
    const aOgonek = polishLetters.find((l) => l.id === 'letter_ą');
    expect(a.stage).toBe(1);
    expect(aOgonek.stage).toBeGreaterThan(1);
    // Every diacritic letter is gated above stage 1; every plain letter is stage 1.
    for (const l of polishLetters) {
      if (hasPolishDiacritic(l.prompt)) expect(l.stage).toBeGreaterThan(1);
      else expect(l.stage).toBe(1);
    }
  });

  it('firstStageLetters returns only non-diacritic letters and is a strict subset', () => {
    const first = firstStageLetters();
    expect(first.length).toBeGreaterThan(0);
    expect(first.length).toBeLessThan(polishLetters.length);
    expect(first.every((l) => !hasPolishDiacritic(l.prompt))).toBe(true);
  });
});

describe('Polish count-noun agreement (C5)', () => {
  it('polishPluralCategory follows Polish rules including the teens exception', () => {
    expect(polishPluralCategory(0)).toBe('many');
    expect(polishPluralCategory(1)).toBe('one');
    expect(polishPluralCategory(3)).toBe('few');
    expect(polishPluralCategory(4)).toBe('few');
    expect(polishPluralCategory(5)).toBe('many');
    expect(polishPluralCategory(13)).toBe('many');
    expect(polishPluralCategory(23)).toBe('few');
  });

  it('polishCountNoun inflects using the supplied forms', () => {
    const forms = countingNounFor('⭐');
    expect(polishCountNoun(1, forms)).toBe('gwiazdka');
    expect(polishCountNoun(3, forms)).toBe('gwiazdki');
    expect(polishCountNoun(7, forms)).toBe('gwiazdek');
  });

  it('countingPrompt and countingCountLabel produce concrete, agreeing Polish copy', () => {
    expect(countingPrompt('⭐')).toBe('Ile gwiazdek widzisz?');
    expect(countingCountLabel('🍎', 1)).toBe('1 jabłko');
    expect(countingCountLabel('🍎', 2)).toBe('2 jabłka');
    expect(countingCountLabel('🍎', 5)).toBe('5 jabłek');
  });

  it('countingNounFor falls back to a neutral noun for unknown glyphs', () => {
    expect(countingNounFor('🦕')).toEqual({ one: 'obrazek', few: 'obrazki', many: 'obrazków' });
  });
});

describe('expanded Numbers data', () => {
  it('counting tasks stay within 0-9', () => {
    expect(countingTasks.length).toBeGreaterThan(0);
    for (const t of countingTasks) {
      expect(t.count).toBeGreaterThanOrEqual(0);
      expect(t.count).toBeLessThanOrEqual(9);
    }
  });

  it('math problems are internally consistent and small', () => {
    expect(mathProblems.length).toBeGreaterThan(0);
    for (const p of mathProblems) {
      const expected = p.operator === '+' ? p.operandA + p.operandB : p.operandA - p.operandB;
      expect(p.result).toBe(expected);
      expect(p.result).toBeGreaterThanOrEqual(0);
      expect(p.result).toBeLessThanOrEqual(9);
    }
  });

  it('ordering sequences solve to a sorted (asc or desc) arrangement', () => {
    expect(orderingSequences.length).toBeGreaterThan(0);
    for (const seq of orderingSequences) {
      expect([...seq.solution].sort((a, b) => a - b)).toEqual([...seq.digits].sort((a, b) => a - b));
      const sortedAsc = [...seq.digits].sort((a, b) => a - b);
      const expected = seq.descending ? [...sortedAsc].reverse() : sortedAsc;
      expect(seq.solution).toEqual(expected);
    }
  });
});
