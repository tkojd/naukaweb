// =============================================================================
// Printable worksheet / test (sprawdzian) generator - PURE LOGIC.
//
// Framework-free and DOM-free so it imports identically under Node (Vitest) and
// the browser. There are no browser globals here: determinism comes from an
// INJECTED `rng` (a function returning a float in [0,1) like Math.random). The
// view layer (docs/js/ui/worksheetView.js) turns the returned plain data
// structure into a print-friendly DOM section.
//
// -----------------------------------------------------------------------------
// DYDACTIC RULES ON PAPER (A + C1-C5)
// -----------------------------------------------------------------------------
// Printed sheets mirror the on-screen lesson methodology (docs/METODYKA.md):
//
//   A  - EARLY (ages ~3-6, non-readers) worksheets must be solvable WITHOUT the
//        CHILD reading. The instruction line is read aloud by the parent/teacher;
//        the child answers by looking at PICTURES, QUANTITIES or COLOURS. Reading,
//        spelling, translation and word/sentence tasks are reserved for LATE
//        (ages 7-10, readers).
//   C1 - The answer is never the same representation as the prompt (no digit==digit;
//        no printing the target colour swatch in the header and again as the answer).
//   C2 - A picture in the prompt never gives the answer away, and distractor
//        pictures differ from the correct one.
//   C3 - English worksheets teach the English word <-> meaning link. The stimulus
//        is the ENGLISH word (read aloud by the adult for EARLY, printed for LATE);
//        the answer for EARLY is a meaning PICTURE, never a Polish word tile.
//   C4 - Progression: the first letter stage uses only non-diacritic letters;
//        spelling/word-building appears only at LATE.
//   C5 - Every exercise has a concrete Polish instruction naming exactly what is
//        shown, with correct count-noun agreement (gwiazdka / gwiazdki / gwiazdek).
//
// buildWorksheet({ module, category, level, stage, questionCount, includeAnswerKey, rng })
// returns:
//   {
//     title, meta, exercises: [ exercise ], answerKey: [{number, answer}]
//   }
//
// An `exercise` is a plain object. Its `kind` tells the renderer how to draw it,
// and it carries structured, already-resolved fields (glyphs, swatches, picture
// choices, letter glyphs) so the renderer never has to print words a non-reader
// would have to read on an EARLY sheet:
//
//   { number, kind, level, instructions, requiresReading, promptRep, answerRep,
//     // kind-specific:
//     glyphs?, count?,                      // 'count'
//     picture?, swatches?, letterChoices?,  // pictures / swatch / glyph answers
//     pictureChoices?,                      // meaning-picture answers (English/colours)
//     promptText?, promptEmoji?, promptImageSrc?,
//     choices?, blankSlots?, matchColumns?, // LATE reading tasks
//     answer }                              // human-readable correct answer (answer key)
// =============================================================================

import { LEARNING_MODULES, AGE_LEVELS } from './models.js';
import {
  itemsFor,
  itemsForLevel,
  itemsForCategory,
  translationPair,
  countingPrompt,
  countingCountLabel,
  countingNounFor,
  hasPolishDiacritic,
  imageFor
} from './content.js';

/** Human-readable Polish module labels for worksheet headings. */
const MODULE_LABELS = Object.freeze({
  [LEARNING_MODULES.COLORS]: 'Kolory',
  [LEARNING_MODULES.POLISH_LETTERS]: 'Litery',
  [LEARNING_MODULES.NUMBERS]: 'Cyfry',
  [LEARNING_MODULES.ENGLISH]: 'Angielski'
});

/** Polish labels for the two age bands. */
const LEVEL_LABELS = Object.freeze({
  [AGE_LEVELS.EARLY]: '4-6 lat',
  [AGE_LEVELS.LATE]: '7-10 lat'
});

/** Representation kinds shared with the task-type engine (rule C1). */
export const WORKSHEET_REPRESENTATIONS = Object.freeze({
  DIGIT: 'digit',
  QUANTITY: 'quantity',
  SWATCH: 'swatch',
  PICTURE: 'picture',
  WORD: 'word',
  GLYPH: 'glyph'
});

/** Counting glyphs that have a proper Polish count-noun (see COUNTING_NOUNS). */
const COUNT_GLYPHS = ['⭐', '🍎', '🎈', '🐟', '🌼', '🐱', '🚗', '🌳'];

/**
 * A safe rng wrapper: falls back to a fixed sequence if no rng is injected so
 * the function never throws. Callers SHOULD inject a real rng for determinism.
 */
function normalizeRng(rng) {
  if (typeof rng === 'function') return rng;
  let seed = 0x2545f491;
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

/** Pick an integer in [0, n) using the injected rng. */
function randInt(rng, n) {
  if (n <= 0) return 0;
  return Math.floor(rng() * n);
}

/** Fisher-Yates shuffle returning a NEW array, driven by the injected rng. */
function shuffleWith(rng, array) {
  const copy = array.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Resolve the pool of content items honoring scope: module (required), an optional
 * category filter, and an optional age-level filter. Filters are intersected. If a
 * filter would empty the pool we relax it (category first, then level) so
 * generation never fails on a small/edge-case pool. Mirrors the on-screen leveled
 * selection so a printed EARLY sheet draws from EARLY-appropriate content.
 */
function resolvePool(module, category, level) {
  let pool = itemsFor(module);
  if (!pool || pool.length === 0) {
    return {
      pool: [],
      categoryApplied: false,
      levelApplied: false,
      categoryRelaxed: Boolean(category),
      levelRelaxed: Boolean(level)
    };
  }

  let categoryApplied = false;
  let categoryRelaxed = false;
  if (category) {
    const byCategory = itemsForCategory(module, category);
    if (byCategory.length > 0) {
      pool = byCategory;
      categoryApplied = true;
    } else {
      categoryRelaxed = true;
    }
  }

  let levelApplied = false;
  let levelRelaxed = false;
  if (level) {
    const byLevel = pool.filter((item) => {
      if (item.level === undefined || item.level === null) return true;
      const levels = Array.isArray(item.level) ? item.level : [item.level];
      return levels.includes(level);
    });
    if (byLevel.length > 0) {
      pool = byLevel;
      levelApplied = true;
    } else {
      levelRelaxed = true;
    }
  }

  return { pool, categoryApplied, categoryRelaxed, levelApplied, levelRelaxed };
}

/**
 * The EFFECTIVE level a sheet is generated for. When the caller does not request
 * a band we default to EARLY so the youngest, non-reading child is protected by
 * default (no reading unless the sheet was explicitly asked for LATE). This is a
 * generation-only default; the advertised meta.level still reflects the actual
 * requested/applied band (see buildWorksheet).
 */
function effectiveLevel(level) {
  return level === AGE_LEVELS.LATE ? AGE_LEVELS.LATE : AGE_LEVELS.EARLY;
}

// -----------------------------------------------------------------------------
// EARLY exercise builders (no reading by the child; instruction read aloud).
// -----------------------------------------------------------------------------

/**
 * NUMBERS - count the pictures and write the digit. prompt=QUANTITY, answer=DIGIT
 * (rule C1: never digit==digit). Uses a real counting glyph (not a generic dot)
 * and a concrete instruction with correct agreement (rule C5).
 */
function buildCountExercise(rng, item) {
  const count = Number.parseInt(item.prompt, 10);
  const safeCount = Number.isFinite(count) && count >= 0 ? count : 1;
  const glyph = COUNT_GLYPHS[randInt(rng, COUNT_GLYPHS.length)];
  return {
    kind: 'count',
    instructions: countingPrompt(glyph),
    requiresReading: false,
    promptRep: WORKSHEET_REPRESENTATIONS.QUANTITY,
    answerRep: WORKSHEET_REPRESENTATIONS.DIGIT,
    glyph,
    glyphs: new Array(safeCount).fill(glyph),
    count: safeCount,
    blankSlots: 1,
    answer: String(safeCount),
    countLabel: countingCountLabel(glyph, safeCount)
  };
}

/**
 * COLORS EARLY - the adult reads the colour name aloud; the child circles the
 * matching colour SWATCH among printed swatches. prompt=WORD(spoken by adult),
 * answer=SWATCH (rule C1: not the same swatch in the header). No swatch is printed
 * in the header, so the answer is never a copy of the prompt.
 */
function buildFindColorExercise(rng, item, pool) {
  const distractors = shuffleWith(rng, pool.filter((p) => p.id !== item.id)).slice(0, 3);
  const swatches = shuffleWith(rng, [item, ...distractors]).map((c) => ({
    id: c.id,
    colorHex: c.colorHex,
    isCorrect: c.id === item.id
  }));
  return {
    kind: 'find-color',
    instructions: `Zakreśl kolor: ${item.answer}`,
    requiresReading: false,
    promptRep: WORKSHEET_REPRESENTATIONS.WORD,
    answerRep: WORKSHEET_REPRESENTATIONS.SWATCH,
    swatches,
    answer: item.answer
  };
}

/**
 * LETTERS EARLY - show the example-word PICTURE; the child circles the LETTER the
 * word starts with, among printed letter glyphs. prompt=PICTURE, answer=GLYPH
 * (rule C1/C2: the picture stands for the example word, not the bare letter).
 * Stage-1 gating (non-diacritic letters only) is applied to the pool by the caller.
 */
function buildFirstLetterExercise(rng, item, pool) {
  const distractors = shuffleWith(rng, pool.filter((p) => p.id !== item.id)).slice(0, 3);
  const letterChoices = shuffleWith(rng, [item, ...distractors]).map((l) => ({
    id: l.id,
    glyph: l.prompt,
    isCorrect: l.id === item.id
  }));
  return {
    kind: 'first-letter',
    instructions: 'Zakreśl literę, od której zaczyna się nazwa obrazka.',
    requiresReading: false,
    promptRep: WORKSHEET_REPRESENTATIONS.PICTURE,
    answerRep: WORKSHEET_REPRESENTATIONS.GLYPH,
    promptEmoji: item.emoji,
    promptImageSrc: imageFor(item),
    letterChoices,
    answer: item.prompt
  };
}

/**
 * ENGLISH EARLY - the adult reads the ENGLISH word aloud; the child circles the
 * matching meaning PICTURE among printed pictures (rule C3: English stimulus, not
 * Polish; answer is a picture, never a Polish word tile). prompt=WORD(English, read
 * aloud), answer=PICTURE. Distractor pictures differ from the correct one (rule C2);
 * the header carries NO picture, so the answer is not given away.
 */
function buildEnglishPictureExercise(rng, item, pool) {
  const distractors = shuffleWith(
    rng,
    pool.filter((p) => p.id !== item.id && (p.emoji || '') !== (item.emoji || ''))
  ).slice(0, 3);
  const pictureChoices = shuffleWith(rng, [item, ...distractors]).map((p) => ({
    id: p.id,
    emoji: p.emoji,
    imageSrc: imageFor(p),
    isCorrect: p.id === item.id
  }));
  return {
    kind: 'english-picture',
    instructions: `Posłuchaj i zakreśl obrazek: „${item.prompt}”`,
    requiresReading: false,
    promptRep: WORKSHEET_REPRESENTATIONS.WORD,
    answerRep: WORKSHEET_REPRESENTATIONS.PICTURE,
    englishWord: item.prompt,
    pictureChoices,
    answer: `${item.prompt} (${item.answer})`
  };
}

// -----------------------------------------------------------------------------
// LATE exercise builders (readers): text-based reading/spelling/translation.
// -----------------------------------------------------------------------------

/** LATE - circle the correct written answer among printed word choices. */
function buildChooseExercise(rng, module, item, pool) {
  const distractors = shuffleWith(rng, pool.filter((p) => p.id !== item.id)).slice(0, 3);
  const choices = shuffleWith(rng, [item, ...distractors]).map((c) => c.answer);
  let promptText;
  let promptEmoji;
  if (module === LEARNING_MODULES.ENGLISH) {
    // Read the English word, choose the Polish meaning. No meaning picture in the
    // header (rule C2), so the icon does not give the answer away.
    promptText = item.prompt;
  } else if (module === LEARNING_MODULES.NUMBERS) {
    // Count-word for the digit: quantity/word prompt, word answer.
    promptText = `Ile to: ${item.prompt}?`;
  } else {
    promptText = item.prompt;
    promptEmoji = item.emoji;
  }
  return {
    kind: 'choose',
    instructions: 'Zakreśl poprawną odpowiedź.',
    requiresReading: true,
    promptText,
    promptEmoji,
    choices,
    answer: item.answer
  };
}

/** LATE - fill in the blank (write the answer). */
function buildFillExercise(module, item) {
  let promptText;
  let promptEmoji;
  if (module === LEARNING_MODULES.ENGLISH) {
    promptText = `${item.prompt} = ______________`;
  } else if (module === LEARNING_MODULES.POLISH_LETTERS && item.exampleWord) {
    promptText = `${item.exampleWord} - napisz pierwszą literę: ______`;
    promptEmoji = item.emoji;
  } else {
    promptText = `______________`;
    promptEmoji = item.emoji;
  }
  return {
    kind: 'fill',
    instructions: 'Uzupełnij lukę.',
    requiresReading: true,
    promptText,
    promptEmoji,
    blankSlots: 1,
    answer: item.answer
  };
}

/** LATE - translate a word EN<->PL (English module only). */
function buildTranslateExercise(item, direction) {
  const pair = translationPair(item, direction);
  const dirLabel =
    pair.direction === 'PL_TO_EN' ? 'Przetłumacz na angielski:' : 'Przetłumacz na polski:';
  return {
    kind: 'translate',
    instructions: dirLabel,
    requiresReading: true,
    promptText: `${pair.prompt} = ______________`,
    blankSlots: 1,
    answer: pair.answer
  };
}

/** LATE - true/false about a printed statement (rule C1: answer is a judgement). */
function buildTrueFalseExercise(rng, module, item, pool) {
  const makeTrue = rng() < 0.5;
  let statedAnswer = item.answer;
  if (!makeTrue) {
    const others = pool.filter((p) => p.id !== item.id && p.answer !== item.answer);
    if (others.length > 0) statedAnswer = others[randInt(rng, others.length)].answer;
  }
  const isTrue = statedAnswer === item.answer;
  const promptText =
    module === LEARNING_MODULES.ENGLISH
      ? `${item.prompt} = ${statedAnswer}`
      : `${item.prompt} = ${statedAnswer}`;
  return {
    kind: 'truefalse',
    instructions: 'Zakreśl: Prawda albo Fałsz.',
    requiresReading: true,
    promptText,
    promptEmoji: module === LEARNING_MODULES.ENGLISH ? undefined : item.emoji,
    choices: ['Prawda', 'Fałsz'],
    answer: isTrue ? 'Prawda' : 'Fałsz'
  };
}

/** LATE - match two written columns by drawing lines. */
function buildMatchExercise(rng, module, items) {
  const left = items.map((it) => it.prompt);
  const right = shuffleWith(rng, items).map((it) => it.answer);
  const answer = items.map((it) => `${it.prompt} - ${it.answer}`).join('; ');
  return {
    kind: 'match',
    instructions: 'Połącz elementy z lewej i prawej kolumny.',
    requiresReading: true,
    matchColumns: { left, right },
    answer
  };
}

// -----------------------------------------------------------------------------
// Per-(module, level) exercise-kind ordering.
// -----------------------------------------------------------------------------

/**
 * The ordered exercise kinds to attempt for a module at a level. EARLY kinds are
 * strictly non-reading (picture / quantity / colour); LATE kinds are reading
 * tasks. The generator walks the list round-robin so a sheet mixes formats.
 */
function kindsFor(module, level) {
  if (level === AGE_LEVELS.EARLY) {
    switch (module) {
      case LEARNING_MODULES.NUMBERS:
        return ['count'];
      case LEARNING_MODULES.COLORS:
        return ['find-color'];
      case LEARNING_MODULES.POLISH_LETTERS:
        return ['first-letter'];
      case LEARNING_MODULES.ENGLISH:
      default:
        return ['english-picture'];
    }
  }
  // LATE (readers)
  switch (module) {
    case LEARNING_MODULES.ENGLISH:
      return ['translate', 'choose', 'match', 'truefalse', 'fill'];
    case LEARNING_MODULES.NUMBERS:
      return ['count', 'choose', 'match'];
    case LEARNING_MODULES.POLISH_LETTERS:
      return ['fill', 'choose', 'match', 'truefalse'];
    case LEARNING_MODULES.COLORS:
    default:
      return ['choose', 'match', 'truefalse', 'fill'];
  }
}

/**
 * Build a printable worksheet as a plain data structure.
 *
 * @param {object} params
 * @param {string} params.module one of LEARNING_MODULES (required).
 * @param {string} [params.category] optional thematic category filter.
 * @param {('EARLY'|'LATE')} [params.level] optional age-level filter. Absent/EARLY
 *   produces a non-reading sheet; LATE produces a reading sheet.
 * @param {number} [params.stage] optional stage. For letters, stage <= 1 restricts
 *   to non-diacritic letters (rule C4).
 * @param {number} [params.questionCount=10] number of exercises to generate.
 * @param {boolean} [params.includeAnswerKey=false] include the answer key array.
 * @param {function} [params.rng] injected rng in [0,1) for determinism.
 * @returns {{title, meta, exercises, answerKey}}
 */
export function buildWorksheet({
  module,
  category,
  level,
  stage,
  questionCount = 10,
  includeAnswerKey = false,
  rng
} = {}) {
  const random = normalizeRng(rng);
  const moduleLabel = MODULE_LABELS[module] || 'Nauka';
  const count = Math.max(1, Math.floor(Number(questionCount) || 0) || 1);
  const genLevel = effectiveLevel(level);

  const resolved = resolvePool(module, category, level);
  let pool = resolved.pool;

  // Rule C4 - LETTERS first stage: restrict to non-diacritic letters so a beginner
  // never meets ą, ę, ó, ł, ś, ć, ń, ź, ż on the first sheet. Applied on the
  // generation pool only; scope reporting is unaffected.
  const isFirstLetterStage =
    module === LEARNING_MODULES.POLISH_LETTERS && (stage === undefined || stage <= 1);
  if (isFirstLetterStage) {
    const plain = pool.filter((it) => !hasPolishDiacritic(it.prompt));
    if (plain.length > 0) pool = plain;
  }

  const levelApplied = Boolean(level) && resolved.levelApplied;
  const categoryApplied = Boolean(category) && resolved.categoryApplied;
  const scopeWidened = Boolean(resolved.levelRelaxed || resolved.categoryRelaxed);

  const meta = {
    module: module || null,
    moduleLabel,
    requestedCategory: category || null,
    requestedLevel: level || null,
    category: categoryApplied ? category : null,
    level: levelApplied ? level : null,
    levelLabel: levelApplied ? LEVEL_LABELS[level] || null : null,
    // The level the exercises were actually built for (drives reading vs pictures).
    generationLevel: genLevel,
    scopeWidened,
    questionCount: count,
    date: ''
  };

  const titleParts = [`Sprawdzian: ${moduleLabel}`];
  if (categoryApplied) titleParts.push(`(${category})`);
  const title = titleParts.join(' ');

  if (pool.length === 0) {
    return { title, meta, exercises: [], answerKey: includeAnswerKey ? [] : [] };
  }

  const kinds = kindsFor(module, genLevel);
  const shuffledPool = shuffleWith(random, pool);
  let poolCursor = 0;
  const nextItem = () => {
    const item = shuffledPool[poolCursor % shuffledPool.length];
    poolCursor += 1;
    return item;
  };

  const exercises = [];
  let kindCursor = 0;
  let translateFlip = false;

  while (exercises.length < count) {
    const kind = kinds[kindCursor % kinds.length];
    kindCursor += 1;

    let exercise = null;
    switch (kind) {
      // --- EARLY (no reading) ---
      case 'count':
        exercise = buildCountExercise(random, nextItem());
        break;
      case 'find-color':
        exercise = buildFindColorExercise(random, nextItem(), shuffledPool);
        break;
      case 'first-letter':
        exercise = buildFirstLetterExercise(random, nextItem(), shuffledPool);
        break;
      case 'english-picture':
        exercise = buildEnglishPictureExercise(random, nextItem(), shuffledPool);
        break;
      // --- LATE (readers) ---
      case 'translate':
        if (module === LEARNING_MODULES.ENGLISH) {
          const dir = translateFlip ? 'PL_TO_EN' : 'EN_TO_PL';
          translateFlip = !translateFlip;
          exercise = buildTranslateExercise(nextItem(), dir);
        }
        break;
      case 'match': {
        if (shuffledPool.length >= 2) {
          const groupSize = Math.min(4, shuffledPool.length);
          const group = [];
          const seen = new Set();
          while (group.length < groupSize) {
            const it = nextItem();
            if (!seen.has(it.id)) {
              seen.add(it.id);
              group.push(it);
            }
            if (seen.size >= shuffledPool.length) break;
          }
          if (group.length >= 2) exercise = buildMatchExercise(random, module, group);
        }
        break;
      }
      case 'truefalse':
        exercise = buildTrueFalseExercise(random, module, nextItem(), shuffledPool);
        break;
      case 'fill':
        exercise = buildFillExercise(module, nextItem());
        break;
      case 'choose':
      default:
        exercise = buildChooseExercise(random, module, nextItem(), shuffledPool);
        break;
    }

    // Fallback: keep forward progress with a level-appropriate default. For EARLY
    // this MUST stay a non-reading kind so the "no reading" guarantee holds even on
    // tiny pools; for LATE a written 'choose' is fine.
    if (!exercise) {
      exercise =
        genLevel === AGE_LEVELS.EARLY
          ? buildEarlyFallback(random, module, nextItem(), shuffledPool)
          : buildChooseExercise(random, module, nextItem(), shuffledPool);
    }

    exercise.number = exercises.length + 1;
    exercise.level = genLevel;
    exercises.push(exercise);
  }

  const answerKey = includeAnswerKey
    ? exercises.map((ex) => ({ number: ex.number, answer: ex.answer }))
    : [];

  return { title, meta, exercises, answerKey };
}

/**
 * A non-reading EARLY fallback exercise for the given module, so a widened/edge
 * pool never forces a reading task onto an EARLY sheet.
 */
function buildEarlyFallback(rng, module, item, pool) {
  switch (module) {
    case LEARNING_MODULES.NUMBERS:
      return buildCountExercise(rng, item);
    case LEARNING_MODULES.COLORS:
      return buildFindColorExercise(rng, item, pool);
    case LEARNING_MODULES.POLISH_LETTERS:
      return buildFirstLetterExercise(rng, item, pool);
    case LEARNING_MODULES.ENGLISH:
    default:
      return buildEnglishPictureExercise(rng, item, pool);
  }
}

export const WORKSHEET_MODULE_LABELS = MODULE_LABELS;
export const WORKSHEET_LEVEL_LABELS = LEVEL_LABELS;
