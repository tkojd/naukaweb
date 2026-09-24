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
import {
  translationPair,
  numbers,
  countingPrompt,
  countingCountLabel,
  hasPolishDiacritic,
  imageFor,
  audioForEnglish
} from './content.js';

/**
 * Representation kinds a prompt or an option can use. Rule C1 forbids the correct
 * option from being in the SAME representation as the prompt (e.g. digit -> digit,
 * or an identical colour swatch in the header and among the options). The engine
 * tags each C1-relevant spec with meta.promptRep / meta.answerRep so both the UI
 * and the tests can assert the two differ.
 */
export const REPRESENTATIONS = Object.freeze({
  DIGIT: 'digit',        // a written numeral, e.g. "4"
  QUANTITY: 'quantity',  // a group of counted pictures
  SWATCH: 'swatch',      // a solid colour tile
  PICTURE: 'picture',    // a meaning picture (icon/emoji)
  SPOKEN: 'spoken',      // spoken audio only
  WORD: 'word',          // written text (reading)
  GLYPH: 'glyph'         // a letter glyph
});

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

/**
 * A PICTURE option for an item: shows the item's meaning picture (curated icon
 * when available, else the emoji) and NO text label, so a non-reader can answer
 * by image alone (rule A). `label` is kept empty on purpose - the UI renders the
 * picture, not words. Rule C2 is enforced by the caller (the prompt picture must
 * never be reused as the correct option's picture, and distractors differ).
 */
function makePictureOption(item, isCorrect) {
  const opt = { id: item.id, label: '', isCorrect, rep: REPRESENTATIONS.PICTURE };
  const src = imageFor(item);
  if (src) opt.imageSrc = src;
  if (item.emoji !== undefined) opt.emoji = item.emoji;
  return opt;
}

/** A colour SWATCH option: a solid tile in the item's colour, no text (rule A). */
function makeSwatchOption(item, isCorrect) {
  return { id: item.id, label: '', isCorrect, colorHex: item.colorHex, rep: REPRESENTATIONS.SWATCH };
}

/** The English pronunciation descriptor to replay after a correct answer (C3). */
function englishSpeak(item) {
  return { text: item.prompt, lang: 'en-US', audioKey: item.audioKey, audioSrc: audioForEnglish(item) };
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
export function generateMultipleChoice({ item, pool = [], optionCount = 4, direction, level = AGE_LEVELS.EARLY, rng } = {}) {
  const module = item.moduleType;
  const distractorCount = Math.max(0, (optionCount || 1) - 1);

  // ---------------------------------------------------------------------------
  // NUMBERS: never digit -> identical digit (rule C1). A bare digit prompt whose
  // options are digits lets the child answer by matching the same symbol. Counting
  // (quantity -> digit) is the valid number MC and is produced by COUNT_CHOOSE, so
  // we skip plain-digit MC entirely and let the composer pick COUNT_CHOOSE instead.
  // ---------------------------------------------------------------------------
  if (module === LEARNING_MODULES.NUMBERS) {
    return null;
  }

  // ---------------------------------------------------------------------------
  // COLORS: pair a NAMED colour (spoken; text shown only for readers at LATE)
  // with colour SWATCH options. The header carries NO swatch, so the correct tile
  // is never a copy of the prompt (rule C1). Non-readers answer by tapping the
  // colour they hear (rule A).
  // ---------------------------------------------------------------------------
  if (module === LEARNING_MODULES.COLORS) {
    const distractors = pickDistractors(pool, [item.id], distractorCount, rng);
    const options = shuffle(
      [makeSwatchOption(item, true), ...distractors.map((d) => makeSwatchOption(d, false))],
      rng
    );
    const prompt = {
      speak: { text: item.answer, lang: 'pl-PL', audioKey: item.audioKey },
      promptRep: REPRESENTATIONS.SPOKEN
    };
    if (level === AGE_LEVELS.LATE) prompt.text = item.prompt; // readers may see the word
    return {
      type: TASK_TYPES.MULTIPLE_CHOICE,
      moduleType: module,
      item,
      prompt,
      options,
      correctItemId: item.id,
      meta: { promptRep: prompt.promptRep, answerRep: REPRESENTATIONS.SWATCH }
    };
  }

  // ---------------------------------------------------------------------------
  // POLISH LETTERS: spoken letter sound (+ example-word picture) -> tap the LETTER
  // glyph. Prompt is a sound/picture, options are glyphs, so the two never match
  // as identical symbols (C1/C2).
  // ---------------------------------------------------------------------------
  if (module === LEARNING_MODULES.POLISH_LETTERS) {
    const distractors = pickDistractors(pool, [item.id], distractorCount, rng);
    const options = shuffle(
      [
        { id: item.id, label: item.prompt, isCorrect: true, rep: REPRESENTATIONS.GLYPH },
        ...distractors.map((d) => ({ id: d.id, label: d.prompt, isCorrect: false, rep: REPRESENTATIONS.GLYPH }))
      ],
      rng
    );
    const prompt = {
      speak: { text: item.prompt, lang: 'pl-PL', audioKey: item.audioKey },
      picture: { emoji: item.emoji, imageSrc: imageFor(item) },
      promptRep: REPRESENTATIONS.PICTURE
    };
    return {
      type: TASK_TYPES.MULTIPLE_CHOICE,
      moduleType: module,
      item,
      prompt,
      options,
      correctItemId: item.id,
      meta: { promptRep: prompt.promptRep, answerRep: REPRESENTATIONS.GLYPH }
    };
  }

  // ---------------------------------------------------------------------------
  // ENGLISH (rule C3): the learning stimulus is the ENGLISH word (spoken, and
  // written only at LATE). The child links that English sound/spelling to MEANING.
  //   * EARLY: hear the English word -> tap the matching meaning PICTURE. Options
  //     are pictures (never text to read); the prompt shows NO picture so the
  //     answer is not given away (C2).
  //   * LATE (readers): show the written English word -> tap the meaning picture,
  //     OR (reading English) English text options. We use picture options so the
  //     meaning link is explicit; English text stays available via LATE reading
  //     tasks elsewhere. Either way the prompt is English, never Polish.
  // The correct English pronunciation is always exposed in meta.speak so the
  // renderer can replay it after a correct answer (playback happens in FEAT-003).
  // ---------------------------------------------------------------------------
  if (module === LEARNING_MODULES.ENGLISH) {
    // Distractors must have a distinct meaning picture from the correct item (C2).
    const distractors = pickDistractors(pool, [item.id], distractorCount, rng)
      .filter((d) => (d.emoji || '') !== (item.emoji || ''));
    const options = shuffle(
      [makePictureOption(item, true), ...distractors.map((d) => makePictureOption(d, false))],
      rng
    );
    const prompt = {
      speak: englishSpeak(item),
      promptRep: level === AGE_LEVELS.LATE ? REPRESENTATIONS.WORD : REPRESENTATIONS.SPOKEN
    };
    if (level === AGE_LEVELS.LATE) prompt.text = item.prompt; // readers see the English word
    return {
      type: TASK_TYPES.MULTIPLE_CHOICE,
      moduleType: module,
      item,
      prompt,
      options,
      correctItemId: item.id,
      meta: {
        promptRep: prompt.promptRep,
        answerRep: REPRESENTATIONS.PICTURE,
        englishSpeak: prompt.speak
      }
    };
  }

  // Fallback (unknown module): classic word MC.
  const distractors = pickDistractors(pool, [item.id], distractorCount, rng);
  const options = shuffle(
    [makeOption(item, answerLabel(item), true), ...distractors.map((d) => makeOption(d, answerLabel(d), false))],
    rng
  );
  return {
    type: TASK_TYPES.MULTIPLE_CHOICE,
    moduleType: module,
    item,
    prompt: { text: item.prompt, emoji: item.emoji },
    options,
    correctItemId: item.id,
    meta: {}
  };
}

/**
 * Bidirectional English translation with TEXT options (reading). This is a
 * READERS-ONLY task (LATE): both sides are written words, so it must never be used
 * for EARLY / non-readers. It links the English spelling to meaning via the Polish
 * word for a child who can already read. The correct English pronunciation is
 * exposed in meta.englishSpeak so the renderer can replay it after a correct
 * answer (rule C3). Defaults to EN->PL.
 */
export function generateTranslation({ item, pool = [], optionCount = 4, direction = DIRECTIONS.EN_TO_PL, rng } = {}) {
  const distractorCount = Math.max(0, (optionCount || 1) - 1);
  const distractors = pickDistractors(pool, [item.id], distractorCount, rng);
  const pair = translationPair(item, direction);
  const labelFor = (it) => translationPair(it, direction).answer;
  const options = shuffle(
    [makeOption(item, pair.answer, true), ...distractors.map((d) => makeOption(d, labelFor(d), false))],
    rng
  );
  return {
    type: TASK_TYPES.MULTIPLE_CHOICE,
    moduleType: item.moduleType,
    item,
    prompt: { text: pair.prompt, emoji: item.emoji, direction: pair.direction, promptRep: REPRESENTATIONS.WORD },
    options,
    correctItemId: item.id,
    meta: { direction: pair.direction, promptRep: REPRESENTATIONS.WORD, answerRep: REPRESENTATIONS.WORD, englishSpeak: englishSpeak(item) }
  };
}

/**
 * Matching pairs (memory / match word-image). Produces `pairCount` pairs, each a
 * word side (label) and an image side (emoji/colorHex). Degrades to however many
 * items are available.
 *
 * @returns {object} spec whose meta.pairs is an array of {id, itemId, word, emoji?, colorHex?}
 */
export function generateMatchPairs({ items = [], pairCount = 4, level = AGE_LEVELS.EARLY, rng } = {}) {
  const chosen = shuffle(items, rng).slice(0, Math.max(0, pairCount));
  const first = chosen[0] || null;
  const module = first ? first.moduleType : undefined;
  const isEnglish = module === LEARNING_MODULES.ENGLISH;

  // The "sound/word" side of each pair. Rule C3: in English this MUST be the
  // ENGLISH word/sound (never the Polish translation). English text is shown only
  // for readers (LATE); for EARLY the card carries the spoken English word and no
  // Polish text. Colours use the Polish colour NAME paired with the SWATCH; letters
  // use the letter GLYPH paired with its example picture.
  const pairs = chosen.map((it) => {
    const base = { id: it.id, itemId: it.id, emoji: it.emoji, colorHex: it.colorHex, imageSrc: imageFor(it) };
    if (isEnglish) {
      return {
        ...base,
        word: level === AGE_LEVELS.LATE ? it.prompt : '', // English text for readers only
        speak: englishSpeak(it)
      };
    }
    if (module === LEARNING_MODULES.COLORS) {
      // Rule A: a young non-reader learning colours does NOT yet read the colour
      // NAME ("granatowy", "żółty", ...). For EARLY the word card is a SPOKEN
      // colour name (no text) that the child matches to the SWATCH by sound; the
      // colour name text appears only for readers (LATE). This removes the
      // "match the colour NAME word to a colour tile" give-away the user flagged.
      return {
        ...base,
        word: level === AGE_LEVELS.LATE ? it.answer : '',
        speak: { text: it.answer, lang: 'pl-PL', audioKey: it.audioKey }
      };
    }
    // Letters: the "word" side is the single LETTER GLYPH the child is learning to
    // recognise (not a word to read), paired with its example-word picture. A
    // single glyph is a recognition target under rule A, so it is shown at both
    // levels. Other modules fall back to the prompt glyph/text.
    return { ...base, word: it.prompt, speak: { text: it.prompt, lang: 'pl-PL', audioKey: it.audioKey } };
  });

  // Options mirror the pairs so the spec has a uniform shape; each pair "matches
  // itself" so isCorrect is true for the intended pairing.
  const options = chosen.map((it) => makeOption(it, isEnglish ? it.prompt : it.answer, true));
  return {
    type: TASK_TYPES.MATCH_PAIRS,
    moduleType: module,
    item: first,
    prompt: { text: 'Połącz w pary' },
    options,
    correctItemId: first ? first.id : null,
    meta: {
      pairs,
      isEnglish,
      wordCards: shuffle(pairs.map((p) => ({ pairId: p.id, label: p.word, speak: p.speak })), rng),
      imageCards: shuffle(
        pairs.map((p) => ({ pairId: p.id, emoji: p.emoji, colorHex: p.colorHex, imageSrc: p.imageSrc })),
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
export function generateListenChoose({ item, pool = [], optionCount = 4, level = AGE_LEVELS.EARLY, rng } = {}) {
  const module = item.moduleType;
  const distractorCount = Math.max(0, (optionCount || 1) - 1);

  // ENGLISH (rule C3): ALWAYS speak the ENGLISH word and let the child pick the
  // matching meaning PICTURE. The old PL->EN "speak Polish, choose English word"
  // variant is gone - Polish audio is never the material for learning English.
  if (module === LEARNING_MODULES.ENGLISH) {
    const distractors = pickDistractors(pool, [item.id], distractorCount, rng)
      .filter((d) => (d.emoji || '') !== (item.emoji || ''));
    const options = shuffle(
      [makePictureOption(item, true), ...distractors.map((d) => makePictureOption(d, false))],
      rng
    );
    return {
      type: TASK_TYPES.LISTEN_CHOOSE,
      moduleType: module,
      item,
      prompt: { emoji: '🔊', promptRep: REPRESENTATIONS.SPOKEN },
      options,
      correctItemId: item.id,
      meta: {
        speak: englishSpeak(item),
        englishSpeak: englishSpeak(item),
        promptRep: REPRESENTATIONS.SPOKEN,
        answerRep: REPRESENTATIONS.PICTURE
      }
    };
  }

  // COLORS: hear the colour NAME (Polish) -> tap the matching SWATCH.
  if (module === LEARNING_MODULES.COLORS) {
    const distractors = pickDistractors(pool, [item.id], distractorCount, rng);
    const options = shuffle(
      [makeSwatchOption(item, true), ...distractors.map((d) => makeSwatchOption(d, false))],
      rng
    );
    return {
      type: TASK_TYPES.LISTEN_CHOOSE,
      moduleType: module,
      item,
      prompt: { emoji: '🔊', promptRep: REPRESENTATIONS.SPOKEN },
      options,
      correctItemId: item.id,
      meta: {
        speak: { text: item.answer, lang: 'pl-PL', audioKey: item.audioKey },
        promptRep: REPRESENTATIONS.SPOKEN,
        answerRep: REPRESENTATIONS.SWATCH
      }
    };
  }

  // POLISH LETTERS: hear the letter sound -> tap the matching letter GLYPH.
  if (module === LEARNING_MODULES.POLISH_LETTERS) {
    const distractors = pickDistractors(pool, [item.id], distractorCount, rng);
    const options = shuffle(
      [
        { id: item.id, label: item.prompt, isCorrect: true, rep: REPRESENTATIONS.GLYPH },
        ...distractors.map((d) => ({ id: d.id, label: d.prompt, isCorrect: false, rep: REPRESENTATIONS.GLYPH }))
      ],
      rng
    );
    return {
      type: TASK_TYPES.LISTEN_CHOOSE,
      moduleType: module,
      item,
      prompt: { emoji: '🔊', promptRep: REPRESENTATIONS.SPOKEN },
      options,
      correctItemId: item.id,
      meta: {
        speak: { text: item.prompt, lang: 'pl-PL', audioKey: item.audioKey },
        promptRep: REPRESENTATIONS.SPOKEN,
        answerRep: REPRESENTATIONS.GLYPH
      }
    };
  }

  // Fallback (e.g. NUMBERS if ever routed here): hear the word, pick a picture.
  const distractors = pickDistractors(pool, [item.id], distractorCount, rng);
  const options = shuffle(
    [makePictureOption(item, true), ...distractors.map((d) => makePictureOption(d, false))],
    rng
  );
  return {
    type: TASK_TYPES.LISTEN_CHOOSE,
    moduleType: module,
    item,
    prompt: { emoji: '🔊', promptRep: REPRESENTATIONS.SPOKEN },
    options,
    correctItemId: item.id,
    meta: {
      speak: { text: item.answer, lang: 'pl-PL', audioKey: item.audioKey },
      promptRep: REPRESENTATIONS.SPOKEN,
      answerRep: REPRESENTATIONS.PICTURE
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
export function generateTrueFalse({ item, pool = [], forceTruth, level = AGE_LEVELS.EARLY, rng } = {}) {
  const distractor = pickDistractors(pool, [item.id], 1, rng)[0] || null;
  // If we cannot find a distractor, we can only make a TRUE statement.
  let makeTrue;
  if (typeof forceTruth === 'boolean') {
    makeTrue = forceTruth || !distractor;
  } else {
    makeTrue = distractor ? randInt(rng, 2) === 0 : true;
  }
  const module = item.moduleType;

  // ENGLISH (rule C3): show the item's MEANING picture and an ENGLISH word/sound;
  // ask whether the spoken/written English word names the picture. TRUE uses the
  // item's own English word, FALSE a distractor's English word. Never a Polish
  // word. The spoken English word (whichever is presented) is exposed so the
  // renderer plays it, and the CORRECT English pronunciation is replayed after a
  // correct answer.
  if (module === LEARNING_MODULES.ENGLISH) {
    const spokenItem = makeTrue ? item : distractor;
    const prompt = {
      picture: { emoji: item.emoji, imageSrc: imageFor(item) },
      promptRep: REPRESENTATIONS.PICTURE
    };
    // For readers (LATE) also show the English word text under the picture.
    if (level === AGE_LEVELS.LATE) prompt.text = spokenItem.prompt;
    return {
      type: TASK_TYPES.TRUE_FALSE,
      moduleType: module,
      item,
      prompt,
      options: [
        { id: 'true', label: 'Tak', isCorrect: makeTrue },
        { id: 'false', label: 'Nie', isCorrect: !makeTrue }
      ],
      correctItemId: makeTrue ? 'true' : 'false',
      meta: {
        expected: makeTrue,
        // What English word is being SPOKEN as the statement.
        speak: englishSpeak(spokenItem),
        // The CORRECT English pronunciation for the pictured item, replayed after
        // a correct answer regardless of whether the statement was true or false.
        englishSpeak: englishSpeak(item),
        promptRep: REPRESENTATIONS.PICTURE
      }
    };
  }

  // COLORS: show a SWATCH and speak a colour NAME; is the name the swatch's colour?
  if (module === LEARNING_MODULES.COLORS) {
    const namedItem = makeTrue ? item : distractor;
    const prompt = { colorHex: item.colorHex, promptRep: REPRESENTATIONS.SWATCH };
    if (level === AGE_LEVELS.LATE) prompt.text = namedItem.answer;
    return {
      type: TASK_TYPES.TRUE_FALSE,
      moduleType: module,
      item,
      prompt,
      options: [
        { id: 'true', label: 'Tak', isCorrect: makeTrue },
        { id: 'false', label: 'Nie', isCorrect: !makeTrue }
      ],
      correctItemId: makeTrue ? 'true' : 'false',
      meta: {
        expected: makeTrue,
        speak: { text: namedItem.answer, lang: 'pl-PL', audioKey: namedItem.audioKey },
        promptRep: REPRESENTATIONS.SWATCH
      }
    };
  }

  // Default (letters / other): show the item's picture and speak a word; TRUE when
  // the spoken word names the picture. Text label shown only at LATE.
  const spokenItem = makeTrue ? item : distractor;
  const prompt = {
    emoji: item.emoji,
    picture: { emoji: item.emoji, imageSrc: imageFor(item) },
    promptRep: REPRESENTATIONS.PICTURE
  };
  if (level === AGE_LEVELS.LATE) prompt.text = spokenItem.answer;
  return {
    type: TASK_TYPES.TRUE_FALSE,
    moduleType: module,
    item,
    prompt,
    options: [
      { id: 'true', label: 'Tak', isCorrect: makeTrue },
      { id: 'false', label: 'Nie', isCorrect: !makeTrue }
    ],
    correctItemId: makeTrue ? 'true' : 'false',
    meta: {
      expected: makeTrue,
      speak: { text: spokenItem.answer, lang: 'pl-PL', audioKey: spokenItem.audioKey },
      promptRep: REPRESENTATIONS.PICTURE
    }
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

  // Rule C5: a concrete Polish prompt that names exactly what is shown, e.g.
  // "Ile gwiazdek widzisz?" (the "Ile ...?" question governs the genitive plural).
  // The number-agreeing count label (1 gwiazdka / 2 gwiazdki / 5 gwiazdek) is
  // exposed for post-answer reinforcement. Prompt = QUANTITY, options = DIGIT, so
  // the answer is never a copy of the prompt representation (rule C1).
  const promptText = countingPrompt(glyph);
  const countLabel = countingCountLabel(glyph, theCount);

  return {
    type: TASK_TYPES.COUNT_CHOOSE,
    moduleType: LEARNING_MODULES.NUMBERS,
    item,
    prompt: { text: promptText, emoji: glyph, glyphs, promptRep: REPRESENTATIONS.QUANTITY },
    options: numberOptions.map((n) => ({ id: `n_${n}`, label: String(n), isCorrect: n === theCount, rep: REPRESENTATIONS.DIGIT })),
    correctItemId: `n_${theCount}`,
    meta: {
      count: theCount,
      glyphs,
      glyph,
      promptText,
      countLabel,
      promptRep: REPRESENTATIONS.QUANTITY,
      answerRep: REPRESENTATIONS.DIGIT
    }
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
  // The child hears/sees the target colour NAME and taps the matching SWATCH in
  // the scene. Options are colour swatches (rule A / C1: not a text copy of the
  // named target), and the correct swatch is not shown in the header prompt.
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
      prompt: {
        text: `Znajdź kolor: ${scene.target}`,
        speak: { text: scene.target, lang: 'pl-PL', audioKey: targetItem.audioKey },
        description: scene.description,
        promptRep: REPRESENTATIONS.SPOKEN
      },
      options: optionItems.map((it) => makeSwatchOption(it, it.id === targetItem.id)),
      correctItemId: targetItem.id,
      meta: {
        variant: 'find-color',
        promptRep: REPRESENTATIONS.SPOKEN,
        answerRep: REPRESENTATIONS.SWATCH,
        sceneDescriptor: { id: scene.id, description: scene.description, emoji: scene.emoji, target: scene.target }
      }
    };
  }

  // --- generic which-matches (word-mode) ---
  // Only meaningful when the prompt and options are in different representations
  // (rule C1). We speak/label the target and offer meaning PICTURES so the correct
  // tile is not a copy of the prompt.
  const distractorCount = Math.max(0, (optionCount || 1) - 1);
  const distractors = pickDistractors(candidates, [target.id], distractorCount, rng)
    .filter((d) => (d.emoji || '') !== (target.emoji || ''));
  const options = shuffle(
    [makePictureOption(target, true), ...distractors.map((d) => makePictureOption(d, false))],
    rng
  );
  const isEnglish = target.moduleType === LEARNING_MODULES.ENGLISH;
  const prompt = isEnglish
    ? { speak: englishSpeak(target), promptRep: REPRESENTATIONS.SPOKEN }
    : { text: target.answer, speak: { text: target.answer, lang: 'pl-PL', audioKey: target.audioKey }, promptRep: REPRESENTATIONS.WORD };
  return {
    type: TASK_TYPES.WHICH_MATCHES,
    moduleType: target.moduleType,
    item: target,
    prompt,
    options,
    correctItemId: target.id,
    meta: {
      variant: 'which-matches',
      promptRep: prompt.promptRep,
      answerRep: REPRESENTATIONS.PICTURE,
      englishSpeak: isEnglish ? englishSpeak(target) : undefined
    }
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
/**
 * A representative glyph for a counted digit, so the counting picture is a real
 * object (not the bare digit). Cycles a small set of unambiguous glyphs.
 */
const COUNT_GLYPHS = ['⭐', '🍎', '🎈', '🐟', '🌼'];

function generateForType(type, { item, pool, module, level, rng }) {
  switch (type) {
    case TASK_TYPES.MULTIPLE_CHOICE: {
      // NUMBERS multiple choice is intentionally handled as COUNT_CHOOSE (quantity
      // -> digit); a bare digit->digit MC is rejected by generateMultipleChoice.
      return generateMultipleChoice({ item, pool, level, rng });
    }
    case TASK_TYPES.LISTEN_CHOOSE: {
      // Numbers have no single meaning picture (their emoji IS the digit), so a
      // listen->picture task would echo the digit; skip and let COUNT_CHOOSE cover
      // numbers.
      if (module === LEARNING_MODULES.NUMBERS) return null;
      return generateListenChoose({ item, pool, level, rng });
    }
    case TASK_TYPES.MATCH_PAIRS: {
      if (module === LEARNING_MODULES.NUMBERS) return null;
      const items = [item, ...pickDistractors(pool, [item.id], 3, rng)];
      return generateMatchPairs({ items, pairCount: items.length, level, rng });
    }
    case TASK_TYPES.TRUE_FALSE: {
      if (module === LEARNING_MODULES.NUMBERS) return null;
      return generateTrueFalse({ item, pool, level, rng });
    }
    case TASK_TYPES.SPELL_WORD: {
      // Reading/spelling is a LATE-only, readers-only task (rule A / C4). Never for
      // EARLY. Letters also gate this behind their first stage in buildLesson.
      if (level !== AGE_LEVELS.LATE) return null;
      const word = item.exampleWord || (item.moduleType === LEARNING_MODULES.ENGLISH ? item.prompt : null);
      if (!word) return null;
      return generateSpellWord({ item, target: word, rng });
    }
    case TASK_TYPES.WHICH_MATCHES: {
      // Numbers would be digit->digit here; skip.
      if (module === LEARNING_MODULES.NUMBERS) return null;
      return generateWhichMatches({ target: item, candidates: pool, rng });
    }
    case TASK_TYPES.COUNT_CHOOSE: {
      // Only meaningful for the NUMBERS module; derive a count from the digit.
      if (module !== LEARNING_MODULES.NUMBERS) return null;
      const count = Number.parseInt(item.prompt, 10);
      if (Number.isNaN(count)) return null;
      const glyph = COUNT_GLYPHS[randInt(rng, COUNT_GLYPHS.length)];
      return generateCountChoose({ count, emoji: glyph, rng });
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
  let items = Array.isArray(availableItems) ? availableItems.filter(Boolean) : [];

  // Rule C4 - real progression for LETTERS. When this is the FIRST letter stage
  // (stage 1 or unspecified), restrict to plain Latin letters WITHOUT Polish
  // diacritics (ą, ę, ó, ł, ś, ć, ń, ź, ż) so a beginner does not meet diacritic
  // letters on lesson one. Diacritic letters unlock at higher stages. Filtering
  // here means the composer never even considers a diacritic letter for stage 1.
  const isFirstLetterStage =
    module === LEARNING_MODULES.POLISH_LETTERS && (stage === undefined || stage <= 1);
  if (isFirstLetterStage) {
    items = items.filter((it) => !hasPolishDiacritic(it.prompt));
  }

  let types = taskTypesForLevel(level, taskTypeMix);

  // Rule C4 - SPELL_WORD (building a word from letters) never appears at the first
  // letter stage. Combined with the LATE-only gate in generateForType, EARLY never
  // spells at all and letter lesson one is limited to recognition tasks.
  if (isFirstLetterStage) {
    types = types.filter((t) => t !== TASK_TYPES.SPELL_WORD);
  }

  const specs = [];
  if (items.length === 0 || types.length === 0) return specs;

  let attempts = 0;
  const maxAttempts = questionCount * 8 + 16;
  let itemCursor = 0;
  const shuffledItems = shuffle(items, rng);

  while (specs.length < questionCount && attempts < maxAttempts) {
    attempts++;
    const item = shuffledItems[itemCursor % shuffledItems.length];
    itemCursor++;
    // Prefer a randomly chosen type, but if it cannot make a VALID spec for this
    // item/module/level (generateForType returns null rather than emitting a
    // flawed one), fall through the remaining allowed types so modules with few
    // valid types (e.g. NUMBERS -> COUNT_CHOOSE only) still fill reliably. We
    // never emit a flawed spec; we only skip invalid (type, item) combinations.
    const start = randInt(rng, types.length);
    let spec = null;
    for (let k = 0; k < types.length && !spec; k++) {
      const type = types[(start + k) % types.length];
      spec = generateForType(type, { item, pool: items, module, level, rng });
    }
    if (spec) specs.push(spec);
  }

  return specs;
}
