// =============================================================================
// Printable worksheet / test (sprawdzian) generator - PURE LOGIC.
//
// Framework-free and DOM-free so it imports identically under Node (Vitest) and
// the browser. There are no browser globals here: determinism comes from an
// INJECTED `rng` (a function returning a float in [0,1) like Math.random). The
// view layer (docs/js/ui/worksheetView.js) turns the returned plain data
// structure into a print-friendly DOM section.
//
// buildWorksheet({ module, category, level, questionCount, includeAnswerKey, rng })
// returns:
//   {
//     title: string,
//     meta: { module, moduleLabel, category, level, levelLabel, questionCount, date },
//     exercises: [
//       { number, kind, prompt, instructions, choices?, blankSlots?, answer }
//     ],
//     answerKey: [{ number, answer }]   // present ONLY when includeAnswerKey
//   }
//
// Exercise `kind`s are paper-friendly (not interactive-only):
//   'match'     - match two columns (words <-> pictures/translations)
//   'fill'      - fill in the blank
//   'choose'    - circle the correct answer among printed choices
//   'count'     - count the pictures and write the number
//   'translate' - translate a word EN<->PL
//   'truefalse' - decide whether a printed statement is true or false
//
// Every exercise carries the correct `answer`, and every exercise's answer is
// mirrored into the `answerKey` (same order/number) when includeAnswerKey is on,
// so a parent/teacher can grade the sheet.
// =============================================================================

import { LEARNING_MODULES, AGE_LEVELS } from './models.js';
import {
  itemsFor,
  itemsForLevel,
  itemsForCategory,
  translationPair
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

/**
 * A safe rng wrapper: falls back to a fixed sequence if no rng is injected so
 * the function never throws. Callers SHOULD inject a real rng for determinism.
 */
function normalizeRng(rng) {
  if (typeof rng === 'function') return rng;
  // Deterministic fallback (small LCG) so output stays reproducible without a
  // browser global. Only used when the caller forgets to inject one.
  let seed = 0x2545f491;
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

/** Pick an integer in [0, n) using the injected rng. */
function randInt(rng, n) {
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
 * Resolve the pool of content items honoring scope: module (required), then an
 * optional category filter, then an optional age-level filter. Filters are
 * intersected. If a filter empties the pool we relax it (category first, then
 * level) so generation never fails on a small/edge-case pool.
 *
 * @returns {Array<object>}
 */
function resolvePool(module, category, level) {
  let pool = itemsFor(module);
  if (!pool || pool.length === 0) return [];

  if (category) {
    const byCategory = itemsForCategory(module, category);
    if (byCategory.length > 0) pool = byCategory;
  }

  if (level) {
    const byLevel = pool.filter((item) => {
      if (item.level === undefined || item.level === null) return true;
      const levels = Array.isArray(item.level) ? item.level : [item.level];
      return levels.includes(level);
    });
    // Only apply the level filter if it leaves something to work with.
    if (byLevel.length > 0) pool = byLevel;
  }

  return pool;
}

/**
 * Pretty label for an item's displayable picture/emoji, falling back to a dash.
 */
function pictureOf(item) {
  return item.emoji || '';
}

/**
 * Build a single "choose the correct answer" exercise: show the prompt, offer a
 * few printed options (one correct + distractors), the child circles one.
 */
function buildChooseExercise(rng, module, item, pool) {
  const distractors = shuffleWith(
    rng,
    pool.filter((p) => p.id !== item.id)
  ).slice(0, 3);
  const choices = shuffleWith(rng, [item, ...distractors]).map((c) => c.answer);
  let prompt;
  if (module === LEARNING_MODULES.ENGLISH) {
    prompt = `${item.prompt}${item.emoji ? ' ' + item.emoji : ''}`;
  } else if (module === LEARNING_MODULES.NUMBERS) {
    prompt = String(item.prompt);
  } else {
    prompt = `${pictureOf(item)} ${item.prompt}`.trim();
  }
  return {
    kind: 'choose',
    prompt,
    instructions: 'Zakreśl poprawną odpowiedź.',
    choices,
    answer: item.answer
  };
}

/**
 * Build a "fill in the blank" exercise: show a picture / clue and a blank slot
 * the child writes the answer into.
 */
function buildFillExercise(module, item) {
  let prompt;
  if (module === LEARNING_MODULES.ENGLISH) {
    prompt = `${item.prompt}${item.emoji ? ' ' + item.emoji : ''} = ______________`;
  } else if (module === LEARNING_MODULES.POLISH_LETTERS && item.exampleWord) {
    prompt = `${pictureOf(item)} ${item.exampleWord} - napisz pierwszą literę: ______`;
  } else {
    prompt = `${pictureOf(item)} ______________`;
  }
  return {
    kind: 'fill',
    prompt: prompt.trim(),
    instructions: 'Uzupełnij lukę.',
    blankSlots: 1,
    answer: item.answer
  };
}

/**
 * Build a "translate" exercise (English module only). Direction alternates so a
 * sheet mixes EN->PL and PL->EN.
 */
function buildTranslateExercise(item, direction) {
  const pair = translationPair(item, direction);
  const dirLabel =
    pair.direction === 'PL_TO_EN'
      ? 'Przetłumacz na angielski:'
      : 'Przetłumacz na polski:';
  return {
    kind: 'translate',
    prompt: `${item.emoji ? item.emoji + ' ' : ''}${pair.prompt} = ______________`,
    instructions: dirLabel,
    blankSlots: 1,
    answer: pair.answer
  };
}

/**
 * Build a "count and write" exercise for the NUMBERS module: print N copies of a
 * picture, the child counts and writes the digit. Uses the item's emoji when it
 * is a real picture; otherwise falls back to a generic dot.
 */
function buildCountExercise(rng, item) {
  // The number's `prompt` is its digit; count that many pictures.
  const count = Number(item.prompt);
  const glyph = '●';
  const safeCount = Number.isFinite(count) && count > 0 ? count : 1;
  return {
    kind: 'count',
    prompt: glyph.repeat(safeCount),
    instructions: 'Policz i napisz liczbę.',
    blankSlots: 1,
    answer: item.answer,
    // keep the numeric answer available too for graders
    countValue: safeCount
  };
}

/**
 * Build a true/false exercise: a printed statement pairing a prompt with an
 * answer that is EITHER correct (true) or swapped with another item (false).
 */
function buildTrueFalseExercise(rng, module, item, pool) {
  const makeTrue = rng() < 0.5;
  let statedAnswer = item.answer;
  if (!makeTrue) {
    const others = pool.filter((p) => p.id !== item.id && p.answer !== item.answer);
    if (others.length > 0) {
      statedAnswer = others[randInt(rng, others.length)].answer;
    }
  }
  const isTrue = statedAnswer === item.answer;
  let promptLeft;
  if (module === LEARNING_MODULES.ENGLISH) {
    promptLeft = `${item.emoji ? item.emoji + ' ' : ''}${item.prompt}`;
  } else {
    promptLeft = `${pictureOf(item)} ${item.prompt}`.trim();
  }
  return {
    kind: 'truefalse',
    prompt: `${promptLeft} = ${statedAnswer}`,
    instructions: 'Zakreśl: Prawda albo Fałsz.',
    choices: ['Prawda', 'Fałsz'],
    answer: isTrue ? 'Prawda' : 'Fałsz'
  };
}

/**
 * Build a single matching exercise from several items: two columns to connect by
 * drawing lines. The `answer` is a human-readable list of the correct pairings.
 */
function buildMatchExercise(rng, module, items) {
  const left = items.map((it) =>
    module === LEARNING_MODULES.ENGLISH || module === LEARNING_MODULES.POLISH_LETTERS
      ? `${it.emoji ? it.emoji + ' ' : ''}${it.prompt}`
      : `${pictureOf(it)} ${it.prompt}`.trim()
  );
  const rightItems = shuffleWith(rng, items);
  const right = rightItems.map((it) => it.answer);
  const answer = items.map((it) => `${it.prompt} - ${it.answer}`).join('; ');
  return {
    kind: 'match',
    prompt: 'Połącz w pary (narysuj linie).',
    instructions: 'Połącz elementy z lewej i prawej kolumny.',
    choices: { left, right },
    answer
  };
}

/**
 * The ordered set of exercise kinds worth trying for a module. The generator
 * walks this list round-robin so a sheet mixes formats; kinds that cannot be
 * built for a given item are skipped gracefully.
 */
function kindsForModule(module) {
  switch (module) {
    case LEARNING_MODULES.ENGLISH:
      return ['translate', 'choose', 'match', 'truefalse', 'fill'];
    case LEARNING_MODULES.NUMBERS:
      return ['count', 'choose', 'match', 'truefalse'];
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
 * @param {('EARLY'|'LATE')} [params.level] optional age-level filter.
 * @param {number} [params.questionCount=10] number of exercises to generate.
 * @param {boolean} [params.includeAnswerKey=false] include the answer key array.
 * @param {function} [params.rng] injected rng in [0,1) for determinism.
 * @returns {{title, meta, exercises, answerKey}}
 */
export function buildWorksheet({
  module,
  category,
  level,
  questionCount = 10,
  includeAnswerKey = false,
  rng
} = {}) {
  const random = normalizeRng(rng);
  const moduleLabel = MODULE_LABELS[module] || 'Nauka';
  const count = Math.max(1, Math.floor(Number(questionCount) || 0) || 1);

  const pool = resolvePool(module, category, level);

  const meta = {
    module: module || null,
    moduleLabel,
    category: category || null,
    level: level || null,
    levelLabel: level ? LEVEL_LABELS[level] || null : null,
    questionCount: count,
    // Placeholder for a printable date line; the view fills the real date so the
    // pure logic stays deterministic and testable.
    date: ''
  };

  const titleParts = [`Sprawdzian: ${moduleLabel}`];
  if (category) titleParts.push(`(${category})`);
  const title = titleParts.join(' ');

  const exercises = [];
  if (pool.length === 0) {
    // Nothing to build from: return a valid, empty-but-well-formed worksheet.
    return {
      title,
      meta,
      exercises: [],
      answerKey: includeAnswerKey ? [] : []
    };
  }

  const kinds = kindsForModule(module);
  const shuffledPool = shuffleWith(random, pool);
  let poolCursor = 0;
  const nextItem = () => {
    const item = shuffledPool[poolCursor % shuffledPool.length];
    poolCursor += 1;
    return item;
  };

  let kindCursor = 0;
  let translateFlip = false;

  while (exercises.length < count) {
    const kind = kinds[kindCursor % kinds.length];
    kindCursor += 1;

    let exercise = null;
    switch (kind) {
      case 'translate':
        if (module === LEARNING_MODULES.ENGLISH) {
          const dir = translateFlip ? 'PL_TO_EN' : 'EN_TO_PL';
          translateFlip = !translateFlip;
          exercise = buildTranslateExercise(nextItem(), dir);
        }
        break;
      case 'count':
        if (module === LEARNING_MODULES.NUMBERS) {
          exercise = buildCountExercise(random, nextItem());
        }
        break;
      case 'match': {
        // A match needs at least two distinct items; use up to 4.
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
          if (group.length >= 2) {
            exercise = buildMatchExercise(random, module, group);
          }
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

    // Fallback: if a kind was not applicable for this module, build a robust
    // 'choose' exercise so we always make forward progress.
    if (!exercise) {
      exercise = buildChooseExercise(random, module, nextItem(), shuffledPool);
    }

    exercise.number = exercises.length + 1;
    exercises.push(exercise);
  }

  const answerKey = includeAnswerKey
    ? exercises.map((ex) => ({ number: ex.number, answer: ex.answer }))
    : [];

  return { title, meta, exercises, answerKey };
}

export const WORKSHEET_MODULE_LABELS = MODULE_LABELS;
export const WORKSHEET_LEVEL_LABELS = LEVEL_LABELS;
