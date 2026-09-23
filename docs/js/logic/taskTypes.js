// =============================================================================
// Task-type engine (pure, DOM-free, no browser globals).
//
// Generates normalized question specs for every child-friendly task type, driven
// by the FEAT-002 content catalog and the learner's age level. Everything here
// is plain data in / plain data out so it is unit-testable under Node (Vitest)
// and shared identically with the browser UI. There is NO DOM, audio, storage or
// Math.random usage: all randomness is injected via an `rng` function returning a
// float in [0, 1) so tests can pass a deterministic sequence.
//
// -----------------------------------------------------------------------------
// NORMALIZED QUESTION SPEC
// -----------------------------------------------------------------------------
// Every generator returns an object shaped like:
//
//   {
//     type: string,          // one of TASK_TYPES
//     moduleType: string,    // the LEARNING_MODULES value of the primary item
//     item: object,          // the underlying content item (for progress recording)
//     prompt: {              // what to show/ask (UI decides how to render)
//       text?: string,
//       emoji?: string,
//       colorHex?: string,
//       direction?: string,  // EN_TO_PL | PL_TO_EN for translation questions
//       ...type specific
//     },
//     options: Array<{ id, label, emoji?, colorHex?, isCorrect:boolean }>,
//     correctItemId: string, // id of the correct option (== the correct option's id)
//     meta: object           // type-specific extras (tiles, statement, sceneDescriptor, ...)
//   }
//
// The `item` reference is always the primary content item so the UI can call
// progressService.recordAnswer(item.id, correct) regardless of task type.
// =============================================================================

import { LEARNING_MODULES, AGE_LEVELS } from './models.js';
import { translationPair, numbers } from './content.js';

/** String ids for every supported task type. */
export const TASK_TYPES = Object.freeze({
  MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
  MATCH_PAIRS: 'MATCH_PAIRS',
  LISTEN_CHOOSE: 'LISTEN_CHOOSE',
  SPELL_WORD: 'SPELL_WORD',
  TRUE_FALSE: 'TRUE_FALSE',
  COUNT_CHOOSE: 'COUNT_CHOOSE',
  WHICH_MATCHES: 'WHICH_MATCHES'
});

/** Translation direction constants (mirror content.translationPair). */
export const DIRECTIONS = Object.freeze({
  EN_TO_PL: 'EN_TO_PL',
  PL_TO_EN: 'PL_TO_EN'
});

// -----------------------------------------------------------------------------
// Deterministic random helpers (all take an injected rng => [0,1))
// -----------------------------------------------------------------------------

/** A safe default rng. Callers/tests should inject their own for determinism. */
export function defaultRng() {
  return Math.random();
}

function coerceRng(rng) {
  return typeof rng === 'function' ? rng : defaultRng;
}

/** Pick a random integer in [0, n). Returns 0 when n <= 0. */
function randInt(rng, n) {
  if (n <= 0) return 0;
  const r = coerceRng(rng)();
  const clamped = r < 0 ? 0 : r >= 1 ? 0.999999999 : r;
  return Math.floor(clamped * n);
}

/**
 * Return a shuffled COPY of `arr` using a Fisher-Yates shuffle driven by rng.
 * Never mutates the input and never throws on empty/short arrays.
 */
export function shuffle(arr, rng) {
  const out = Array.isArray(arr) ? arr.slice() : [];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

/** Pick one element from arr (or null when empty). */
function pickOne(arr, rng) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr[randInt(rng, arr.length)];
}

/**
 * Pick up to `count` distinct distractors from `pool`, excluding any item whose
 * id is in `excludeIds`. Degrades gracefully: returns as many as are available
 * (possibly fewer than `count`, possibly zero) and never throws.
 */
function pickDistractors(pool, excludeIds, count, rng) {
  const exclude = new Set(excludeIds);
  const candidates = (Array.isArray(pool) ? pool : []).filter(
    (it) => it && !exclude.has(it.id)
  );
  const shuffled = shuffle(candidates, rng);
  return shuffled.slice(0, Math.max(0, count));
}

// -----------------------------------------------------------------------------
// Option / label helpers
// -----------------------------------------------------------------------------

/**
 * The label shown for an item's ANSWER side. For colors we show the color name;
 * for everything else the `answer` field. Direction-aware translation callers
 * build their own labels via translationPair.
 */
function answerLabel(item) {
  return item.answer;
}

function makeOption(item, label, isCorrect) {
  const opt = { id: item.id, label, isCorrect };
  if (item.emoji !== undefined) opt.emoji = item.emoji;
  if (item.colorHex !== undefined) opt.colorHex = item.colorHex;
  return opt;
}

// -----------------------------------------------------------------------------
// Generators
// -----------------------------------------------------------------------------

/**
 * Classic multiple choice: show the prompt of `item`, choose the correct answer
 * from among `optionCount` options (1 correct + distractors from `pool`).
 *
 * For ENGLISH items a `direction` (EN_TO_PL | PL_TO_EN) controls which side is
 * shown and which side is the option label, so this doubles as the bidirectional
 * translation generator.
 *
 * @param {object} params
 * @param {object} params.item primary content item.
 * @param {Array<object>} params.pool candidate items for distractors.
 * @param {number} [params.optionCount=4] total options (>=1).
 * @param {('EN_TO_PL'|'PL_TO_EN')} [params.direction] translation direction (English only).
 * @param {Function} [params.rng] injected rng.
 * @returns {object} question spec
 */
export function generateMultipleChoice({ item, pool = [], optionCount = 4, direction, rng } = {}) {
  const isEnglish = item.moduleType === LEARNING_MODULES.ENGLISH && direction;
  const distractorCount = Math.max(0, (optionCount || 1) - 1);
  const distractors = pickDistractors(pool, [item.id], distractorCount, rng);

  let prompt;
  let correctLabel;
  let labelFor;
  if (isEnglish) {
    const pair = translationPair(item, direction);
    prompt = { text: pair.prompt, emoji: item.emoji, direction: pair.direction };
    correctLabel = pair.answer;
    labelFor = (it) => translationPair(it, direction).answer;
  } else {
    prompt = { text: item.prompt, emoji: item.emoji, colorHex: item.colorHex };
    correctLabel = answerLabel(item);
    labelFor = (it) => answerLabel(it);
  }

  const options = [
    makeOption(item, correctLabel, true),
    ...distractors.map((d) => makeOption(d, labelFor(d), false))
  ];

  return {
    type: TASK_TYPES.MULTIPLE_CHOICE,
    moduleType: item.moduleType,
    item,
    prompt,
    options: shuffle(options, rng),
    correctItemId: item.id,
    meta: { direction: isEnglish ? prompt.direction : undefined }
  };
}

/**
 * Bidirectional translation convenience wrapper (English). Defaults to EN->PL.
 */
export function generateTranslation({ item, pool = [], optionCount = 4, direction = DIRECTIONS.EN_TO_PL, rng } = {}) {
  return generateMultipleChoice({ item, pool, optionCount, direction, rng });
}

/**
 * Matching pairs (memory / match word-image). Produces `pairCount` pairs, each a
 * word side (label) and an image side (emoji/colorHex). Degrades to however many
 * items are available.
 *
 * @returns {object} spec whose meta.pairs is an array of {id, itemId, word, emoji?, colorHex?}
 */
export function generateMatchPairs({ items = [], pairCount = 4, rng } = {}) {
  const chosen = shuffle(items, rng).slice(0, Math.max(0, pairCount));
  const pairs = chosen.map((it) => ({
    id: it.id,
    itemId: it.id,
    word: it.answer,
    prompt: it.prompt,
    emoji: it.emoji,
    colorHex: it.colorHex
  }));
  const first = chosen[0] || null;
  // Options mirror the pairs so the spec has a uniform shape; each pair "matches
  // itself" so isCorrect is true for the intended pairing.
  const options = chosen.map((it) => makeOption(it, it.answer, true));
  return {
    type: TASK_TYPES.MATCH_PAIRS,
    moduleType: first ? first.moduleType : undefined,
    item: first,
    prompt: { text: 'Połącz w pary' },
    options,
    correctItemId: first ? first.id : null,
    meta: {
      pairs,
      wordCards: shuffle(pairs.map((p) => ({ pairId: p.id, label: p.word })), rng),
      imageCards: shuffle(
        pairs.map((p) => ({ pairId: p.id, emoji: p.emoji, colorHex: p.colorHex })),
        rng
      )
    }
  };
}

/**
 * Listen and choose: the audio prompt plays the target and the child taps the
 * matching image/word. `direction` (English) selects the spoken language and
 * option side. meta.speak describes what the UI should speak.
 */
export function generateListenChoose({ item, pool = [], optionCount = 4, direction, rng } = {}) {
  const isEnglish = item.moduleType === LEARNING_MODULES.ENGLISH && direction;
  const distractorCount = Math.max(0, (optionCount || 1) - 1);
  const distractors = pickDistractors(pool, [item.id], distractorCount, rng);

  // What to speak, and which side to show as tappable options.
  let speakText;
  let speakLang;
  let labelFor;
  if (isEnglish) {
    const pair = translationPair(item, direction);
    // We speak the PROMPT side of the pair; options show the ANSWER side.
    speakText = pair.prompt;
    speakLang = direction === DIRECTIONS.PL_TO_EN ? 'pl-PL' : 'en-US';
    labelFor = (it) => translationPair(it, direction).answer;
  } else {
    speakText = item.answer;
    speakLang = 'pl-PL';
    labelFor = (it) => answerLabel(it);
  }

  const options = [
    makeOption(item, labelFor(item), true),
    ...distractors.map((d) => makeOption(d, labelFor(d), false))
  ];

  return {
    type: TASK_TYPES.LISTEN_CHOOSE,
    moduleType: item.moduleType,
    item,
    prompt: { emoji: '🔊', direction: isEnglish ? direction : undefined },
    options: shuffle(options, rng),
    correctItemId: item.id,
    meta: {
      speak: { text: speakText, lang: speakLang, audioKey: item.audioKey }
    }
  };
}

/**
 * Spell the word: build the target word from letter tiles (no keyboard). Returns
 * the correct ordered letters plus a shuffled tile set that contains every
 * letter of the target and a few distractor letters.
 *
 * @param {object} params
 * @param {object} params.item content item; target defaults to its exampleWord
 *   (letters module) or its prompt (English word).
 * @param {string} [params.target] explicit target word to spell.
 * @param {number} [params.distractorCount=2] extra distractor tiles.
 * @param {Function} [params.rng]
 */
export function generateSpellWord({ item, target, distractorCount = 2, rng } = {}) {
  const word = String(
    target != null ? target : item && (item.exampleWord || item.prompt) ? item.exampleWord || item.prompt : ''
  );
  const letters = [...word];
  const correctTiles = letters.map((ch, i) => ({ id: `t${i}_${ch}`, label: ch }));

  // Distractor letters: pick from a small alphabet that is not already covered.
  const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const present = new Set(letters.map((c) => c.toLowerCase()));
  const distractorPool = ALPHABET.filter((c) => !present.has(c));
  const distractorLetters = shuffle(distractorPool, rng).slice(0, Math.max(0, distractorCount));
  const distractorTiles = distractorLetters.map((ch, i) => ({ id: `d${i}_${ch}`, label: ch, distractor: true }));

  const tiles = shuffle([...correctTiles, ...distractorTiles], rng);

  return {
    type: TASK_TYPES.SPELL_WORD,
    moduleType: item ? item.moduleType : undefined,
    item,
    prompt: { text: item ? item.answer : undefined, emoji: item ? item.emoji : undefined },
    options: tiles.map((t) => ({ id: t.id, label: t.label, isCorrect: !t.distractor })),
    correctItemId: item ? item.id : null,
    meta: { target: word, tiles, solution: letters }
  };
}

/**
 * Pure validator for SPELL_WORD. Compares the sequence of tile labels to the
 * target word (exact, case-insensitive). Accepts either an array of tile
 * objects ({label}) or an array of raw label strings.
 * @returns {boolean}
 */
export function isSpellingCorrect(tiles, target) {
  if (!Array.isArray(tiles) || target == null) return false;
  const built = tiles
    .map((t) => (typeof t === 'string' ? t : t && t.label != null ? t.label : ''))
    .join('');
  return built.toLowerCase() === String(target).toLowerCase();
}

/**
 * True/false with an image. Shows the item's emoji/color with a statement label
 * that is either the item's own answer (true) or a distractor's answer (false),
 * decided by rng. meta.expected is the correct boolean.
 *
 * @param {object} params
 * @param {object} params.item primary item.
 * @param {Array<object>} params.pool distractor pool (for false statements).
 * @param {boolean} [params.forceTruth] force a true (or false) case (for tests).
 * @param {Function} [params.rng]
 */
export function generateTrueFalse({ item, pool = [], forceTruth, rng } = {}) {
  const distractor = pickDistractors(pool, [item.id], 1, rng)[0] || null;
  // If we cannot find a distractor, we can only make a TRUE statement.
  let makeTrue;
  if (typeof forceTruth === 'boolean') {
    makeTrue = forceTruth || !distractor;
  } else {
    makeTrue = distractor ? randInt(rng, 2) === 0 : true;
  }

  const statementItem = makeTrue ? item : distractor;
  const statementLabel = statementItem.answer;

  return {
    type: TASK_TYPES.TRUE_FALSE,
    moduleType: item.moduleType,
    item,
    prompt: {
      text: statementLabel,
      emoji: item.emoji,
      colorHex: item.colorHex
    },
    options: [
      { id: 'true', label: 'Prawda', isCorrect: makeTrue },
      { id: 'false', label: 'Fałsz', isCorrect: !makeTrue }
    ],
    correctItemId: makeTrue ? 'true' : 'false',
    meta: { expected: makeTrue, statement: statementLabel }
  };
}

/**
 * Count and choose the number. Given a counting task (or an explicit count),
 * produce `count` glyphs and a set of number options including the correct one.
 *
 * @param {object} params
 * @param {object} [params.task] a countingTasks entry ({emoji, count, id}).
 * @param {number} [params.count] explicit count (used when no task supplied).
 * @param {string} [params.emoji] glyph to repeat.
 * @param {number} [params.optionCount=4] number of numeric options.
 * @param {number} [params.maxNumber=9] highest number that can appear as option.
 * @param {Function} [params.rng]
 */
export function generateCountChoose({ task, count, emoji, optionCount = 4, maxNumber = 9, rng } = {}) {
  const theCount = task ? task.count : count;
  const glyph = task ? task.emoji : emoji;
  const glyphs = new Array(Math.max(0, theCount)).fill(glyph);

  // Reinforce the REAL catalog digit the child just counted rather than a
  // synthetic `count_N` item. Recording a synthetic item would create an orphan
  // NUMBERS review state (keyed `count_N`) that maps to no real digit yet still
  // counts toward the `Mistrz Cyfr` numerator/denominator, skewing that badge and
  // polluting stored progress. `numbers` holds digits 0-9 whose `prompt` is the
  // digit string, so we look the digit up by prompt. When the count has no
  // matching catalog digit (e.g. counts > 9), `item` stays null so lessonView
  // skips recording and no orphan NUMBERS state is written; the glyphs still
  // render from meta so the task remains playable.
  const item = numbers.find((n) => n.prompt === String(theCount)) || null;

  // Build numeric options: the correct count plus distinct nearby distractors.
  const candidates = [];
  for (let n = 0; n <= maxNumber; n++) {
    if (n !== theCount) candidates.push(n);
  }
  const distractorCount = Math.max(0, (optionCount || 1) - 1);
  const distractors = shuffle(candidates, rng).slice(0, distractorCount);
  const numberOptions = shuffle([theCount, ...distractors], rng);

  return {
    type: TASK_TYPES.COUNT_CHOOSE,
    moduleType: LEARNING_MODULES.NUMBERS,
    item,
    prompt: { emoji: glyph, glyphs },
    options: numberOptions.map((n) => ({ id: `n_${n}`, label: String(n), isCorrect: n === theCount })),
    correctItemId: `n_${theCount}`,
    meta: { count: theCount, glyphs, glyph }
  };
}

/**
 * "Which matches" / find-a-color-in-a-scene. Given a target item and a set of
 * candidate items (the scene), mark which candidate matches the target. When a
 * `scene` descriptor is supplied (colorScenes entry), the scene emoji/description
 * is exposed in meta and the options are built from the scene's target + others,
 * resolved against `colorLookup`.
 *
 * @param {object} params
 * @param {object} [params.target] the target item to match (word-mode).
 * @param {Array<object>} [params.candidates] candidate items (word-mode).
 * @param {object} [params.scene] a colorScenes entry (find-color mode).
 * @param {Function} [params.colorLookup] name -> color item resolver (find-color mode).
 * @param {number} [params.optionCount=4]
 * @param {Function} [params.rng]
 */
export function generateWhichMatches({ target, candidates = [], scene, colorLookup, rng, optionCount = 4 } = {}) {
  // --- find-color-in-scene variant ---
  if (scene) {
    const resolve = typeof colorLookup === 'function' ? colorLookup : () => null;
    const targetItem = resolve(scene.target) || { id: `color_${scene.target}`, moduleType: LEARNING_MODULES.COLORS, prompt: scene.target, answer: scene.target };
    const otherItems = (scene.others || [])
      .map((name) => resolve(name) || { id: `color_${name}`, moduleType: LEARNING_MODULES.COLORS, prompt: name, answer: name });
    const optionItems = shuffle([targetItem, ...otherItems], rng);
    return {
      type: TASK_TYPES.WHICH_MATCHES,
      moduleType: LEARNING_MODULES.COLORS,
      item: targetItem,
      prompt: { text: scene.target, emoji: scene.emoji, description: scene.description },
      options: optionItems.map((it) => makeOption(it, it.answer, it.id === targetItem.id)),
      correctItemId: targetItem.id,
      meta: { variant: 'find-color', sceneDescriptor: { id: scene.id, description: scene.description, emoji: scene.emoji, target: scene.target } }
    };
  }

  // --- generic which-matches (word-mode) ---
  const distractorCount = Math.max(0, (optionCount || 1) - 1);
  const distractors = pickDistractors(candidates, [target.id], distractorCount, rng);
  const options = shuffle(
    [makeOption(target, target.answer, true), ...distractors.map((d) => makeOption(d, d.answer, false))],
    rng
  );
  return {
    type: TASK_TYPES.WHICH_MATCHES,
    moduleType: target.moduleType,
    item: target,
    prompt: { text: target.prompt, emoji: target.emoji, colorHex: target.colorHex },
    options,
    correctItemId: target.id,
    meta: { variant: 'which-matches' }
  };
}

// -----------------------------------------------------------------------------
// Lesson composition
// -----------------------------------------------------------------------------

/**
 * Age-appropriate task-type sets. EARLY favours image/audio-based tapping tasks
 * (no reading/spelling required); LATE adds spelling, translation and sentences.
 */
export const TASK_TYPES_BY_LEVEL = Object.freeze({
  [AGE_LEVELS.EARLY]: [
    TASK_TYPES.MULTIPLE_CHOICE,
    TASK_TYPES.LISTEN_CHOOSE,
    TASK_TYPES.MATCH_PAIRS,
    TASK_TYPES.TRUE_FALSE,
    TASK_TYPES.COUNT_CHOOSE,
    TASK_TYPES.WHICH_MATCHES
  ],
  [AGE_LEVELS.LATE]: [
    TASK_TYPES.MULTIPLE_CHOICE,
    TASK_TYPES.LISTEN_CHOOSE,
    TASK_TYPES.MATCH_PAIRS,
    TASK_TYPES.TRUE_FALSE,
    TASK_TYPES.COUNT_CHOOSE,
    TASK_TYPES.WHICH_MATCHES,
    TASK_TYPES.SPELL_WORD
  ]
});

/** Task types that only make sense for the LATE level. */
export const LATE_ONLY_TASK_TYPES = Object.freeze([TASK_TYPES.SPELL_WORD]);

/**
 * Return the task types appropriate for a level, intersected with an optional
 * caller-provided mix. Unknown/late-only types are stripped for EARLY.
 */
export function taskTypesForLevel(level, taskTypeMix) {
  const allowed = TASK_TYPES_BY_LEVEL[level] || TASK_TYPES_BY_LEVEL[AGE_LEVELS.EARLY];
  if (!Array.isArray(taskTypeMix) || taskTypeMix.length === 0) return allowed.slice();
  return taskTypeMix.filter((t) => allowed.includes(t));
}

/**
 * Dispatch to the right generator for a task type given a primary item and pool.
 * Returns null if the type cannot be generated for the given module/item, so the
 * composer can skip it without throwing.
 */
function generateForType(type, { item, pool, module, level, rng }) {
  switch (type) {
    case TASK_TYPES.MULTIPLE_CHOICE: {
      if (module === LEARNING_MODULES.ENGLISH) {
        const direction = randInt(rng, 2) === 0 ? DIRECTIONS.EN_TO_PL : DIRECTIONS.PL_TO_EN;
        return generateMultipleChoice({ item, pool, direction, rng });
      }
      return generateMultipleChoice({ item, pool, rng });
    }
    case TASK_TYPES.LISTEN_CHOOSE: {
      const direction = module === LEARNING_MODULES.ENGLISH
        ? (randInt(rng, 2) === 0 ? DIRECTIONS.EN_TO_PL : DIRECTIONS.PL_TO_EN)
        : undefined;
      return generateListenChoose({ item, pool, direction, rng });
    }
    case TASK_TYPES.MATCH_PAIRS: {
      const items = [item, ...pickDistractors(pool, [item.id], 3, rng)];
      return generateMatchPairs({ items, pairCount: items.length, rng });
    }
    case TASK_TYPES.TRUE_FALSE:
      return generateTrueFalse({ item, pool, rng });
    case TASK_TYPES.SPELL_WORD: {
      const word = item.exampleWord || (item.moduleType === LEARNING_MODULES.ENGLISH ? item.prompt : null);
      if (!word) return null;
      return generateSpellWord({ item, target: word, rng });
    }
    case TASK_TYPES.WHICH_MATCHES:
      return generateWhichMatches({ target: item, candidates: pool, rng });
    case TASK_TYPES.COUNT_CHOOSE: {
      // Only meaningful for the NUMBERS module; derive a count from the digit.
      if (module !== LEARNING_MODULES.NUMBERS) return null;
      const count = Number.parseInt(item.prompt, 10);
      if (Number.isNaN(count)) return null;
      return generateCountChoose({ count, emoji: '⭐', rng });
    }
    default:
      return null;
  }
}

/**
 * Compose an ordered lesson of question specs. Pure and deterministic under an
 * injected rng. Consumes only content + params (no progressService/storage).
 *
 * @param {object} params
 * @param {string} params.module a LEARNING_MODULES value.
 * @param {('EARLY'|'LATE')} params.level the learner's age level.
 * @param {number} [params.stage] optional stage (informational; caller usually
 *   pre-filters availableItems). Kept for signature completeness.
 * @param {Array<object>} params.availableItems age/stage-appropriate items.
 * @param {number} [params.questionCount=6] how many questions to produce.
 * @param {Array<string>} [params.taskTypeMix] restrict to these task types.
 * @param {Function} [params.rng]
 * @returns {Array<object>} ordered array of question specs (length up to questionCount).
 */
export function buildLesson({ module, level = AGE_LEVELS.EARLY, stage, availableItems = [], questionCount = 6, taskTypeMix, rng } = {}) {
  const items = Array.isArray(availableItems) ? availableItems.filter(Boolean) : [];
  const types = taskTypesForLevel(level, taskTypeMix);
  const specs = [];
  if (items.length === 0 || types.length === 0) return specs;

  let attempts = 0;
  const maxAttempts = questionCount * 6 + 12;
  let itemCursor = 0;
  const shuffledItems = shuffle(items, rng);

  while (specs.length < questionCount && attempts < maxAttempts) {
    attempts++;
    const item = shuffledItems[itemCursor % shuffledItems.length];
    itemCursor++;
    const type = types[randInt(rng, types.length)];
    const spec = generateForType(type, { item, pool: items, module, level, rng });
    if (spec) specs.push(spec);
  }

  return specs;
}
