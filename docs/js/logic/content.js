// =============================================================================
// Learning content catalog (pure data + pure query helpers).
//
// Framework-free, DOM-free plain data so it is validated by unit tests and
// shared identically between Node (Vitest) and the browser UI. Id and audioKey
// schemes match the original Android app's ContentCatalog.kt and MUST stay
// stable so stored progress under the localStorage key `naukaweb.v1` keeps
// resolving.
//
// -----------------------------------------------------------------------------
// ITEM DATA FORMAT
// -----------------------------------------------------------------------------
// Every learnable item is a plain object with this shape:
//
//   {
//     id: string,            // stable unique id, e.g. 'english_cat' (NEVER change existing ids)
//     moduleType: string,    // one of LEARNING_MODULES
//     prompt: string,        // what is shown/asked (English word, letter, digit, color name)
//     answer: string,        // the expected answer (Polish translation, letter, number word, color name)
//     emoji?: string,        // optional emoji hint / picture
//     colorHex?: string,     // colors only: hex value
//     exampleWord?: string,  // letters only: an example word starting with the letter
//     audioKey: string,      // stable key used by the audio layer
//
//     // --- OPTIONAL scaling metadata (added in the content expansion) ---
//     level?: 'EARLY'|'LATE'|Array<'EARLY'|'LATE'>, // age suitability; ABSENT = both levels
//     category?: string,     // thematic group, e.g. 'animals','food','greetings'
//     stage?: number,        // integer >= 1: staged unlock ordering (stage 1 first)
//     kind?: 'word'|'phrase'|'sentence' // English only: granularity of the content
//   }
//
// Backward compatibility rule: the OPTIONAL metadata fields are additive. Items
// without `level` are treated as available to BOTH age levels, items without
// `stage` default to stage 1, and items without `category`/`kind` are simply
// excluded from those specific filtered queries. All original items therefore
// keep working unchanged.
//
// Both translation directions are always derivable from a single item because
// `prompt` (English) and `answer` (Polish) are both present: EN->PL uses
// prompt->answer, PL->EN uses answer->prompt. There is no need to duplicate
// items for direction.
//
// -----------------------------------------------------------------------------
// HOW TO GROW VOCABULARY TOWARD ~2000 WORDS (in later batches)
// -----------------------------------------------------------------------------
// The English vocabulary is intentionally a representative STARTER set (a few
// hundred items), not the full 2000. To add more later:
//
//   1. Add builder calls to `englishWords` (or the per-category arrays that feed
//      it) using the `english(word, polish, emoji, opts)` builder. Always pass
//      opts = { category, stage, level, kind }.
//        - category: one of the thematic groups (animals, colors, numbers,
//          family, food, body, clothes, house, nature, transport, verbs,
//          adjectives, greetings, phrases, sentences). Add new categories freely.
//        - stage: introduce vocabulary gradually. Stage 1 = first words a child
//          meets; higher stages unlock later. Keep a category's easiest words in
//          the lowest stage. `itemsUpToStage` guarantees monotonic supersets so
//          higher stages always include everything from lower ones.
//        - level: 'EARLY' (4-6), 'LATE' (7-10), or omit for both. Reserve
//          phrases and sentences for 'LATE'.
//        - kind: 'word' | 'phrase' | 'sentence'. Default is 'word'.
//   2. New ids MUST be unique. The english() builder derives the id from the
//      word; for phrases/sentences pass an explicit opts.id to keep it short and
//      stable (e.g. 'english_phrase_hello').
//   3. Never rename or remove an existing id/audioKey - stored progress keys off
//      them. Only ADD.
//   4. Add tests in tests/content.test.js when introducing new categories/stages.
//
// The Colors, Letters and Numbers modules follow the same additive pattern and
// expose extra pure data structures (mixing pairs, scenes, syllables, math
// problems, ordering sequences) alongside the core items.
// =============================================================================

import { LEARNING_MODULES, AGE_LEVELS } from './models.js';

// --- builders ---------------------------------------------------------------

/**
 * Merge optional scaling metadata (level, category, stage, kind, ...) onto a
 * base item, skipping undefined values so the item shape stays clean.
 */
function withMeta(base, opts) {
  if (!opts) return base;
  const out = { ...base };
  for (const key of ['level', 'category', 'stage', 'kind', 'lower']) {
    if (opts[key] !== undefined) out[key] = opts[key];
  }
  return out;
}

function color(name, hex, opts) {
  return withMeta(
    {
      id: `color_${name}`,
      moduleType: LEARNING_MODULES.COLORS,
      prompt: name,
      answer: name,
      colorHex: hex,
      category: 'colors',
      audioKey: `audio_color_${name}`
    },
    opts
  );
}

function letter(char, example, emoji, opts) {
  const lower = char.toLowerCase();
  return withMeta(
    {
      id: `letter_${lower}`,
      moduleType: LEARNING_MODULES.POLISH_LETTERS,
      prompt: char,
      answer: char,
      emoji,
      exampleWord: example,
      lower,
      category: 'letters',
      audioKey: `audio_letter_${lower}`
    },
    opts
  );
}

function number(digit, word, opts) {
  return withMeta(
    {
      id: `number_${digit}`,
      moduleType: LEARNING_MODULES.NUMBERS,
      prompt: String(digit),
      answer: word,
      emoji: String(digit),
      category: 'numbers',
      audioKey: `audio_number_${digit}`
    },
    opts
  );
}

/**
 * Build an English item.
 * @param {string} word the English word/phrase (prompt).
 * @param {string} polish the Polish translation (answer).
 * @param {string} emoji an emoji hint.
 * @param {object} [opts] optional metadata: { category, stage, level, kind, id }.
 *   Pass an explicit `id` for phrases/sentences to keep ids short and stable.
 */
function english(word, polish, emoji, opts) {
  const id = opts && opts.id ? opts.id : `english_${word}`;
  const base = {
    id,
    moduleType: LEARNING_MODULES.ENGLISH,
    prompt: word,
    answer: polish,
    emoji,
    kind: 'word',
    audioKey: `audio_${id}`
  };
  return withMeta(base, opts);
}

// --- catalog: COLORS ---------------------------------------------------------

/**
 * Colors module items. The first ten ids are the ORIGINAL basic colors and must
 * never change. Additional shades follow with new distinct ids.
 */
export const colors = [
  // --- original 10 (ids frozen) ---
  color('czerwony', '#FF0000', { stage: 1, level: AGE_LEVELS.EARLY }),
  color('niebieski', '#0000FF', { stage: 1, level: AGE_LEVELS.EARLY }),
  color('zielony', '#008000', { stage: 1, level: AGE_LEVELS.EARLY }),
  color('żółty', '#FFEB00', { stage: 1, level: AGE_LEVELS.EARLY }),
  color('pomarańczowy', '#FF7F00', { stage: 1, level: AGE_LEVELS.EARLY }),
  color('fioletowy', '#8000FF', { stage: 1, level: AGE_LEVELS.EARLY }),
  color('różowy', '#FF69B4', { stage: 1, level: AGE_LEVELS.EARLY }),
  color('brązowy', '#8B4513', { stage: 1, level: AGE_LEVELS.EARLY }),
  color('czarny', '#000000', { stage: 1, level: AGE_LEVELS.EARLY }),
  color('biały', '#FFFFFF', { stage: 1, level: AGE_LEVELS.EARLY }),
  // --- extra colors and shades (new ids) ---
  color('szary', '#808080', { stage: 2 }),
  color('turkusowy', '#40E0D0', { stage: 2 }),
  color('granatowy', '#000080', { stage: 2 }),
  color('złoty', '#FFD700', { stage: 2 }),
  color('srebrny', '#C0C0C0', { stage: 2 }),
  color('jasnoniebieski', '#87CEEB', { stage: 3, level: AGE_LEVELS.LATE }),
  color('ciemnozielony', '#006400', { stage: 3, level: AGE_LEVELS.LATE }),
  color('jasnozielony', '#90EE90', { stage: 3, level: AGE_LEVELS.LATE }),
  color('bordowy', '#800000', { stage: 3, level: AGE_LEVELS.LATE }),
  color('beżowy', '#F5F5DC', { stage: 3, level: AGE_LEVELS.LATE })
];

/**
 * Color-mixing pairs expressed as pure data. Each entry names two source colors
 * and the resulting color (by color name so it can be looked up in `colors`).
 */
export const colorMixes = [
  { id: 'mix_orange', a: 'czerwony', b: 'żółty', result: 'pomarańczowy' },
  { id: 'mix_green', a: 'niebieski', b: 'żółty', result: 'zielony' },
  { id: 'mix_purple', a: 'czerwony', b: 'niebieski', result: 'fioletowy' },
  { id: 'mix_pink', a: 'czerwony', b: 'biały', result: 'różowy' },
  { id: 'mix_gray', a: 'czarny', b: 'biały', result: 'szary' }
];

/**
 * "Find a color in a scene" data: a short scene descriptor plus the target color
 * the child should find, and a few distractor colors present in the scene.
 */
export const colorScenes = [
  {
    id: 'scene_garden',
    description: 'Ogród pełen kwiatów',
    emoji: '🌷🌳🌼',
    target: 'zielony',
    others: ['czerwony', 'żółty', 'różowy']
  },
  {
    id: 'scene_sea',
    description: 'Morze i plaża',
    emoji: '🌊🏖️⛵',
    target: 'niebieski',
    others: ['żółty', 'biały', 'brązowy']
  },
  {
    id: 'scene_night',
    description: 'Niebo nocą',
    emoji: '🌙⭐🌌',
    target: 'czarny',
    others: ['żółty', 'granatowy', 'biały']
  },
  {
    id: 'scene_fruit',
    description: 'Miska z owocami',
    emoji: '🍎🍌🍇',
    target: 'czerwony',
    others: ['żółty', 'fioletowy', 'zielony']
  }
];

// --- catalog: POLISH LETTERS -------------------------------------------------

/** The full Polish alphabet (32 letters) including all nine diacritic letters. */
export const polishLetters = [
  letter('A', 'arbuz', '🍉'),
  letter('Ą', 'wąż', '🐍'),
  letter('B', 'balon', '🎈'),
  letter('C', 'cebula', '🧅'),
  letter('Ć', 'ćma', '🦋'),
  letter('D', 'dom', '🏠'),
  letter('E', 'ekran', '📺'),
  letter('Ę', 'gęś', '🦢'),
  letter('F', 'flaga', '🚩'),
  letter('G', 'gitara', '🎸'),
  letter('H', 'hulajnoga', '🛴'),
  letter('I', 'igła', '🪡'),
  letter('J', 'jabłko', '🍎'),
  letter('K', 'kot', '🐱'),
  letter('L', 'lampa', '💡'),
  letter('Ł', 'łódka', '🚤'),
  letter('M', 'mysz', '🐭'),
  letter('N', 'nos', '👃'),
  letter('Ń', 'koń', '🐴'),
  letter('O', 'oko', '👁️'),
  letter('Ó', 'ósemka', '8️⃣'),
  letter('P', 'pies', '🐶'),
  letter('R', 'ryba', '🐟'),
  letter('S', 'słońce', '☀️'),
  letter('Ś', 'ślimak', '🐌'),
  letter('T', 'tygrys', '🐯'),
  letter('U', 'ul', '🐝'),
  letter('W', 'woda', '💧'),
  letter('Y', 'ryba', '🐟'),
  letter('Z', 'zebra', '🦓'),
  letter('Ź', 'źrebak', '🐴'),
  letter('Ż', 'żaba', '🐸')
];

/**
 * Uppercase/lowercase pairing for every letter, derived from the catalog.
 * Each entry: { id, upper, lower }.
 */
export const letterCasePairs = polishLetters.map((l) => ({
  id: `case_${l.lower}`,
  upper: l.prompt,
  lower: l.lower
}));

/**
 * "Letter in a word" recognition data. For each letter we use its exampleWord
 * and mark the index of the target letter within that word (first occurrence,
 * case-insensitive). `targetIndex` is -1 only if not found (should not happen).
 */
export const lettersInWords = polishLetters.map((l) => {
  const word = l.exampleWord;
  const idx = word.toLowerCase().indexOf(l.lower);
  return {
    id: `inword_${l.lower}`,
    letter: l.prompt,
    lower: l.lower,
    word,
    emoji: l.emoji,
    targetIndex: idx
  };
});

/**
 * Simple Polish syllable data for a starter set of easy words. Each entry lists
 * the whole word and its syllables so the child can build the word.
 */
export const syllableWords = [
  { id: 'syl_kotek', word: 'kotek', syllables: ['ko', 'tek'], emoji: '🐱' },
  { id: 'syl_mama', word: 'mama', syllables: ['ma', 'ma'], emoji: '👩' },
  { id: 'syl_tata', word: 'tata', syllables: ['ta', 'ta'], emoji: '👨' },
  { id: 'syl_woda', word: 'woda', syllables: ['wo', 'da'], emoji: '💧' },
  { id: 'syl_lato', word: 'lato', syllables: ['la', 'to'], emoji: '☀️' },
  { id: 'syl_domek', word: 'domek', syllables: ['do', 'mek'], emoji: '🏠' },
  { id: 'syl_ryba', word: 'ryba', syllables: ['ry', 'ba'], emoji: '🐟' },
  { id: 'syl_lampa', word: 'lampa', syllables: ['lam', 'pa'], emoji: '💡' },
  { id: 'syl_balon', word: 'balon', syllables: ['ba', 'lon'], emoji: '🎈' },
  { id: 'syl_zaba', word: 'żaba', syllables: ['ża', 'ba'], emoji: '🐸' }
];

// --- catalog: NUMBERS --------------------------------------------------------

/** Digits 0-9 with their Polish number words (original ids frozen). */
export const numbers = [
  number(0, 'zero'),
  number(1, 'jeden'),
  number(2, 'dwa'),
  number(3, 'trzy'),
  number(4, 'cztery'),
  number(5, 'pięć'),
  number(6, 'sześć'),
  number(7, 'siedem'),
  number(8, 'osiem'),
  number(9, 'dziewięć')
];

/**
 * Counting tasks: an emoji repeated `count` times; the child counts them and
 * picks the matching digit.
 */
export const countingTasks = [
  { id: 'count_apples_3', emoji: '🍎', count: 3, level: AGE_LEVELS.EARLY },
  { id: 'count_stars_5', emoji: '⭐', count: 5, level: AGE_LEVELS.EARLY },
  { id: 'count_cats_2', emoji: '🐱', count: 2, level: AGE_LEVELS.EARLY },
  { id: 'count_balloons_4', emoji: '🎈', count: 4, level: AGE_LEVELS.EARLY },
  { id: 'count_fish_6', emoji: '🐟', count: 6, level: AGE_LEVELS.EARLY },
  { id: 'count_flowers_7', emoji: '🌼', count: 7, level: AGE_LEVELS.LATE },
  { id: 'count_cars_8', emoji: '🚗', count: 8, level: AGE_LEVELS.LATE },
  { id: 'count_trees_9', emoji: '🌳', count: 9, level: AGE_LEVELS.LATE }
];

/**
 * Simple picture-based addition/subtraction problems as pure data. All operands
 * and results are kept within 0-9 so a single-digit emoji picture works.
 */
export const mathProblems = [
  { id: 'add_1_1', operandA: 1, operandB: 1, operator: '+', result: 2, emoji: '🍎', level: AGE_LEVELS.EARLY },
  { id: 'add_2_1', operandA: 2, operandB: 1, operator: '+', result: 3, emoji: '⭐', level: AGE_LEVELS.EARLY },
  { id: 'add_2_2', operandA: 2, operandB: 2, operator: '+', result: 4, emoji: '🎈', level: AGE_LEVELS.EARLY },
  { id: 'add_3_2', operandA: 3, operandB: 2, operator: '+', result: 5, emoji: '🐟', level: AGE_LEVELS.LATE },
  { id: 'add_4_3', operandA: 4, operandB: 3, operator: '+', result: 7, emoji: '🌼', level: AGE_LEVELS.LATE },
  { id: 'sub_2_1', operandA: 2, operandB: 1, operator: '-', result: 1, emoji: '🍎', level: AGE_LEVELS.EARLY },
  { id: 'sub_3_1', operandA: 3, operandB: 1, operator: '-', result: 2, emoji: '⭐', level: AGE_LEVELS.EARLY },
  { id: 'sub_5_2', operandA: 5, operandB: 2, operator: '-', result: 3, emoji: '🐟', level: AGE_LEVELS.LATE },
  { id: 'sub_9_4', operandA: 9, operandB: 4, operator: '-', result: 5, emoji: '🚗', level: AGE_LEVELS.LATE }
];

/**
 * Number-ordering sequences: arrays of digits the child must arrange in order.
 */
export const orderingSequences = [
  { id: 'order_123', digits: [3, 1, 2], solution: [1, 2, 3], level: AGE_LEVELS.EARLY },
  { id: 'order_234', digits: [4, 2, 3], solution: [2, 3, 4], level: AGE_LEVELS.EARLY },
  { id: 'order_1to4', digits: [2, 4, 1, 3], solution: [1, 2, 3, 4], level: AGE_LEVELS.LATE },
  { id: 'order_5to8', digits: [7, 5, 8, 6], solution: [5, 6, 7, 8], level: AGE_LEVELS.LATE },
  { id: 'order_desc', digits: [1, 3, 2], solution: [3, 2, 1], descending: true, level: AGE_LEVELS.LATE }
];

// --- catalog: ENGLISH --------------------------------------------------------
// Representative starter set (~a few hundred items) across the required thematic
// categories, plus greetings/phrases and simple LATE-level sentences. Grow this
// later following the documentation at the top of this file.

// Animals -----------------------------------------------------------
const englishAnimals = [
  english('cat', 'kot', '🐱', { category: 'animals', stage: 1, level: AGE_LEVELS.EARLY }),
  english('dog', 'pies', '🐶', { category: 'animals', stage: 1, level: AGE_LEVELS.EARLY }),
  english('bird', 'ptak', '🐦', { category: 'animals', stage: 1, level: AGE_LEVELS.EARLY }),
  english('fish', 'ryba', '🐟', { category: 'animals', stage: 1, level: AGE_LEVELS.EARLY }),
  english('horse', 'koń', '🐴', { category: 'animals', stage: 1, level: AGE_LEVELS.EARLY }),
  english('cow', 'krowa', '🐮', { category: 'animals', stage: 2 }),
  english('pig', 'świnia', '🐷', { category: 'animals', stage: 2 }),
  english('sheep', 'owca', '🐑', { category: 'animals', stage: 2 }),
  english('duck', 'kaczka', '🦆', { category: 'animals', stage: 2 }),
  english('rabbit', 'królik', '🐰', { category: 'animals', stage: 2 }),
  english('bear', 'niedźwiedź', '🐻', { category: 'animals', stage: 2 }),
  english('lion', 'lew', '🦁', { category: 'animals', stage: 3 }),
  english('tiger', 'tygrys', '🐯', { category: 'animals', stage: 3 }),
  english('elephant', 'słoń', '🐘', { category: 'animals', stage: 3 }),
  english('monkey', 'małpa', '🐵', { category: 'animals', stage: 3 }),
  english('frog', 'żaba', '🐸', { category: 'animals', stage: 3 }),
  english('bee', 'pszczoła', '🐝', { category: 'animals', stage: 3 }),
  english('snake', 'wąż', '🐍', { category: 'animals', stage: 3, level: AGE_LEVELS.LATE }),
  english('fox', 'lis', '🦊', { category: 'animals', stage: 3, level: AGE_LEVELS.LATE }),
  english('wolf', 'wilk', '🐺', { category: 'animals', stage: 4, level: AGE_LEVELS.LATE })
];

// Colors (English color words; distinct ids from the Polish color module) ----
const englishColors = [
  english('red', 'czerwony', '🔴', { category: 'colors', stage: 1, level: AGE_LEVELS.EARLY }),
  english('blue', 'niebieski', '🔵', { category: 'colors', stage: 1, level: AGE_LEVELS.EARLY }),
  english('green', 'zielony', '🟢', { category: 'colors', stage: 1, level: AGE_LEVELS.EARLY }),
  english('yellow', 'żółty', '🟡', { category: 'colors', stage: 1, level: AGE_LEVELS.EARLY }),
  english('orange', 'pomarańczowy', '🟠', { category: 'colors', stage: 2 }),
  english('purple', 'fioletowy', '🟣', { category: 'colors', stage: 2 }),
  english('pink', 'różowy', '🌸', { category: 'colors', stage: 2 }),
  english('brown', 'brązowy', '🟤', { category: 'colors', stage: 2 }),
  english('black', 'czarny', '⚫', { category: 'colors', stage: 2 }),
  english('white', 'biały', '⚪', { category: 'colors', stage: 2 }),
  english('gray', 'szary', '🩶', { category: 'colors', stage: 3, level: AGE_LEVELS.LATE })
];

// Numbers (English number words) --------------------------------------------
const englishNumbers = [
  english('one', 'jeden', '1️⃣', { category: 'numbers', stage: 1, level: AGE_LEVELS.EARLY }),
  english('two', 'dwa', '2️⃣', { category: 'numbers', stage: 1, level: AGE_LEVELS.EARLY }),
  english('three', 'trzy', '3️⃣', { category: 'numbers', stage: 1, level: AGE_LEVELS.EARLY }),
  english('four', 'cztery', '4️⃣', { category: 'numbers', stage: 2 }),
  english('five', 'pięć', '5️⃣', { category: 'numbers', stage: 2 }),
  english('six', 'sześć', '6️⃣', { category: 'numbers', stage: 2 }),
  english('seven', 'siedem', '7️⃣', { category: 'numbers', stage: 2 }),
  english('eight', 'osiem', '8️⃣', { category: 'numbers', stage: 2 }),
  english('nine', 'dziewięć', '9️⃣', { category: 'numbers', stage: 2 }),
  english('ten', 'dziesięć', '🔟', { category: 'numbers', stage: 2 })
];

// Family --------------------------------------------------------------------
const englishFamily = [
  english('mother', 'mama', '👩', { category: 'family', stage: 1, level: AGE_LEVELS.EARLY }),
  english('father', 'tata', '👨', { category: 'family', stage: 1, level: AGE_LEVELS.EARLY }),
  english('sister', 'siostra', '👧', { category: 'family', stage: 1, level: AGE_LEVELS.EARLY }),
  english('brother', 'brat', '👦', { category: 'family', stage: 1, level: AGE_LEVELS.EARLY }),
  english('baby', 'dziecko', '👶', { category: 'family', stage: 2 }),
  english('grandmother', 'babcia', '👵', { category: 'family', stage: 2 }),
  english('grandfather', 'dziadek', '👴', { category: 'family', stage: 2 }),
  english('family', 'rodzina', '👨‍👩‍👧‍👦', { category: 'family', stage: 3, level: AGE_LEVELS.LATE })
];

// Food ----------------------------------------------------------------------
const englishFood = [
  english('apple', 'jabłko', '🍎', { category: 'food', stage: 1, level: AGE_LEVELS.EARLY }),
  english('milk', 'mleko', '🥛', { category: 'food', stage: 1, level: AGE_LEVELS.EARLY }),
  english('bread', 'chleb', '🍞', { category: 'food', stage: 1, level: AGE_LEVELS.EARLY }),
  english('water', 'woda', '💧', { category: 'food', stage: 1, level: AGE_LEVELS.EARLY }),
  english('banana', 'banan', '🍌', { category: 'food', stage: 2 }),
  english('egg', 'jajko', '🥚', { category: 'food', stage: 2 }),
  english('cheese', 'ser', '🧀', { category: 'food', stage: 2 }),
  english('cake', 'ciasto', '🍰', { category: 'food', stage: 2 }),
  english('soup', 'zupa', '🍲', { category: 'food', stage: 2 }),
  english('rice', 'ryż', '🍚', { category: 'food', stage: 3, level: AGE_LEVELS.LATE }),
  english('meat', 'mięso', '🍖', { category: 'food', stage: 3, level: AGE_LEVELS.LATE }),
  english('juice', 'sok', '🧃', { category: 'food', stage: 3 })
];

// Body ----------------------------------------------------------------------
const englishBody = [
  english('hand', 'ręka', '✋', { category: 'body', stage: 1, level: AGE_LEVELS.EARLY }),
  english('eye', 'oko', '👁️', { category: 'body', stage: 1, level: AGE_LEVELS.EARLY }),
  english('nose', 'nos', '👃', { category: 'body', stage: 1, level: AGE_LEVELS.EARLY }),
  english('ear', 'ucho', '👂', { category: 'body', stage: 2 }),
  english('mouth', 'usta', '👄', { category: 'body', stage: 2 }),
  english('foot', 'stopa', '🦶', { category: 'body', stage: 2 }),
  english('hair', 'włosy', '💇', { category: 'body', stage: 3, level: AGE_LEVELS.LATE }),
  english('head', 'głowa', '🗣️', { category: 'body', stage: 3, level: AGE_LEVELS.LATE })
];

// Clothes -------------------------------------------------------------------
const englishClothes = [
  english('shirt', 'koszula', '👕', { category: 'clothes', stage: 1, level: AGE_LEVELS.EARLY }),
  english('shoes', 'buty', '👟', { category: 'clothes', stage: 1, level: AGE_LEVELS.EARLY }),
  english('hat', 'czapka', '🧢', { category: 'clothes', stage: 2 }),
  english('dress', 'sukienka', '👗', { category: 'clothes', stage: 2 }),
  english('socks', 'skarpetki', '🧦', { category: 'clothes', stage: 2 }),
  english('coat', 'płaszcz', '🧥', { category: 'clothes', stage: 3, level: AGE_LEVELS.LATE }),
  english('gloves', 'rękawiczki', '🧤', { category: 'clothes', stage: 3, level: AGE_LEVELS.LATE })
];

// House ---------------------------------------------------------------------
const englishHouse = [
  english('house', 'dom', '🏠', { category: 'house', stage: 1, level: AGE_LEVELS.EARLY }),
  english('door', 'drzwi', '🚪', { category: 'house', stage: 1, level: AGE_LEVELS.EARLY }),
  english('window', 'okno', '🪟', { category: 'house', stage: 2 }),
  english('bed', 'łóżko', '🛏️', { category: 'house', stage: 2 }),
  english('chair', 'krzesło', '🪑', { category: 'house', stage: 2 }),
  english('table', 'stół', '🍽️', { category: 'house', stage: 2 }),
  english('lamp', 'lampa', '💡', { category: 'house', stage: 3, level: AGE_LEVELS.LATE }),
  english('key', 'klucz', '🔑', { category: 'house', stage: 3, level: AGE_LEVELS.LATE })
];

// Nature --------------------------------------------------------------------
const englishNature = [
  english('sun', 'słońce', '☀️', { category: 'nature', stage: 1, level: AGE_LEVELS.EARLY }),
  english('moon', 'księżyc', '🌙', { category: 'nature', stage: 1, level: AGE_LEVELS.EARLY }),
  english('tree', 'drzewo', '🌳', { category: 'nature', stage: 1, level: AGE_LEVELS.EARLY }),
  english('flower', 'kwiat', '🌸', { category: 'nature', stage: 2 }),
  english('star', 'gwiazda', '⭐', { category: 'nature', stage: 2 }),
  english('rain', 'deszcz', '🌧️', { category: 'nature', stage: 2 }),
  english('snow', 'śnieg', '❄️', { category: 'nature', stage: 2 }),
  english('cloud', 'chmura', '☁️', { category: 'nature', stage: 3, level: AGE_LEVELS.LATE }),
  english('river', 'rzeka', '🏞️', { category: 'nature', stage: 3, level: AGE_LEVELS.LATE }),
  english('mountain', 'góra', '⛰️', { category: 'nature', stage: 4, level: AGE_LEVELS.LATE })
];

// Transport -----------------------------------------------------------------
const englishTransport = [
  english('car', 'samochód', '🚗', { category: 'transport', stage: 1, level: AGE_LEVELS.EARLY }),
  english('bus', 'autobus', '🚌', { category: 'transport', stage: 1, level: AGE_LEVELS.EARLY }),
  english('train', 'pociąg', '🚆', { category: 'transport', stage: 2 }),
  english('plane', 'samolot', '✈️', { category: 'transport', stage: 2 }),
  english('bike', 'rower', '🚲', { category: 'transport', stage: 2 }),
  english('boat', 'łódka', '⛵', { category: 'transport', stage: 3, level: AGE_LEVELS.LATE }),
  english('ship', 'statek', '🚢', { category: 'transport', stage: 3, level: AGE_LEVELS.LATE })
];

// Verbs / actions -----------------------------------------------------------
const englishVerbs = [
  english('go', 'iść', '🚶', { category: 'verbs', stage: 1, level: AGE_LEVELS.EARLY }),
  english('eat', 'jeść', '🍽️', { category: 'verbs', stage: 1, level: AGE_LEVELS.EARLY }),
  english('drink', 'pić', '🥤', { category: 'verbs', stage: 1, level: AGE_LEVELS.EARLY }),
  english('sleep', 'spać', '😴', { category: 'verbs', stage: 2 }),
  english('run', 'biegać', '🏃', { category: 'verbs', stage: 2 }),
  english('jump', 'skakać', '🤸', { category: 'verbs', stage: 2 }),
  english('play', 'bawić się', '🎮', { category: 'verbs', stage: 2 }),
  english('read', 'czytać', '📖', { category: 'verbs', stage: 3, level: AGE_LEVELS.LATE }),
  english('write', 'pisać', '✍️', { category: 'verbs', stage: 3, level: AGE_LEVELS.LATE }),
  english('sing', 'śpiewać', '🎤', { category: 'verbs', stage: 3, level: AGE_LEVELS.LATE }),
  english('draw', 'rysować', '🎨', { category: 'verbs', stage: 3, level: AGE_LEVELS.LATE })
];

// Adjectives ----------------------------------------------------------------
const englishAdjectives = [
  english('big', 'duży', '🐘', { category: 'adjectives', stage: 1, level: AGE_LEVELS.EARLY }),
  english('small', 'mały', '🐭', { category: 'adjectives', stage: 1, level: AGE_LEVELS.EARLY }),
  english('happy', 'szczęśliwy', '😊', { category: 'adjectives', stage: 2 }),
  english('sad', 'smutny', '😢', { category: 'adjectives', stage: 2 }),
  english('hot', 'gorący', '🔥', { category: 'adjectives', stage: 2 }),
  english('cold', 'zimny', '🧊', { category: 'adjectives', stage: 2 }),
  english('fast', 'szybki', '⚡', { category: 'adjectives', stage: 3, level: AGE_LEVELS.LATE }),
  english('slow', 'wolny', '🐌', { category: 'adjectives', stage: 3, level: AGE_LEVELS.LATE }),
  english('good', 'dobry', '👍', { category: 'adjectives', stage: 3, level: AGE_LEVELS.LATE }),
  english('bad', 'zły', '👎', { category: 'adjectives', stage: 3, level: AGE_LEVELS.LATE })
];

// Greetings / phrases -------------------------------------------------------
const englishGreetings = [
  english('Hello', 'Cześć', '👋', { id: 'english_phrase_hello', category: 'greetings', kind: 'phrase', stage: 1, level: AGE_LEVELS.EARLY }),
  english('Bye', 'Pa', '👋', { id: 'english_phrase_bye', category: 'greetings', kind: 'phrase', stage: 1, level: AGE_LEVELS.EARLY }),
  english('Good morning', 'Dzień dobry', '🌅', { id: 'english_phrase_good_morning', category: 'greetings', kind: 'phrase', stage: 2 }),
  english('Good night', 'Dobranoc', '🌙', { id: 'english_phrase_good_night', category: 'greetings', kind: 'phrase', stage: 2 }),
  english('How are you?', 'Jak się masz?', '🙂', { id: 'english_phrase_how_are_you', category: 'phrases', kind: 'phrase', stage: 2, level: AGE_LEVELS.LATE }),
  english('Thank you', 'Dziękuję', '🙏', { id: 'english_phrase_thank_you', category: 'phrases', kind: 'phrase', stage: 2 }),
  english('Please', 'Proszę', '🙏', { id: 'english_phrase_please', category: 'phrases', kind: 'phrase', stage: 2 }),
  english('Yes', 'Tak', '✅', { id: 'english_phrase_yes', category: 'phrases', kind: 'phrase', stage: 1, level: AGE_LEVELS.EARLY }),
  english('No', 'Nie', '❌', { id: 'english_phrase_no', category: 'phrases', kind: 'phrase', stage: 1, level: AGE_LEVELS.EARLY }),
  english('My name is', 'Mam na imię', '🙋', { id: 'english_phrase_my_name_is', category: 'phrases', kind: 'phrase', stage: 3, level: AGE_LEVELS.LATE })
];

// Simple sentences (LATE level) ---------------------------------------------
const englishSentences = [
  english('The cat is black.', 'Kot jest czarny.', '🐱', { id: 'english_sentence_cat_black', category: 'sentences', kind: 'sentence', stage: 3, level: AGE_LEVELS.LATE }),
  english('I have a red ball.', 'Mam czerwoną piłkę.', '🔴', { id: 'english_sentence_red_ball', category: 'sentences', kind: 'sentence', stage: 3, level: AGE_LEVELS.LATE }),
  english('The dog is big.', 'Pies jest duży.', '🐶', { id: 'english_sentence_dog_big', category: 'sentences', kind: 'sentence', stage: 3, level: AGE_LEVELS.LATE }),
  english('I like apples.', 'Lubię jabłka.', '🍎', { id: 'english_sentence_like_apples', category: 'sentences', kind: 'sentence', stage: 4, level: AGE_LEVELS.LATE }),
  english('The sun is yellow.', 'Słońce jest żółte.', '☀️', { id: 'english_sentence_sun_yellow', category: 'sentences', kind: 'sentence', stage: 4, level: AGE_LEVELS.LATE }),
  english('This is my house.', 'To jest mój dom.', '🏠', { id: 'english_sentence_my_house', category: 'sentences', kind: 'sentence', stage: 4, level: AGE_LEVELS.LATE }),
  english('I can jump.', 'Umiem skakać.', '🤸', { id: 'english_sentence_can_jump', category: 'sentences', kind: 'sentence', stage: 4, level: AGE_LEVELS.LATE }),
  english('The bird can fly.', 'Ptak umie latać.', '🐦', { id: 'english_sentence_bird_fly', category: 'sentences', kind: 'sentence', stage: 5, level: AGE_LEVELS.LATE })
];

/**
 * Starter English vocabulary. The FIRST 24 items preserve the original
 * `english_*` ids and order exactly so stored progress still resolves; the rest
 * are the expanded categorized/staged/leveled content.
 *
 * NOTE: the original 24 words are the first entries of their category arrays, so
 * we assemble `englishWords` by concatenating the category arrays. Every
 * original id (english_cat, english_dog, ... english_house) remains present.
 */
export const englishWords = [
  ...englishAnimals,
  ...englishColors,
  ...englishNumbers,
  ...englishFamily,
  ...englishFood,
  ...englishBody,
  ...englishClothes,
  ...englishHouse,
  ...englishNature,
  ...englishTransport,
  ...englishVerbs,
  ...englishAdjectives,
  ...englishGreetings,
  ...englishSentences
];

// --- aggregate ---------------------------------------------------------------

/** All items across every module, useful for global lookups. */
export const allItems = [...colors, ...polishLetters, ...numbers, ...englishWords];

// --- core lookup (backward compatible) --------------------------------------

/**
 * The items for a given module.
 *
 * BACKWARD-COMPATIBILITY NOTE: for COLORS, POLISH_LETTERS and NUMBERS this
 * returns the full exported array. Those arrays are supersets that still begin
 * with the original items, and the pre-existing lesson picks a random subset, so
 * exposing extra colors/letters as options does not break stored progress.
 *
 * For ENGLISH this returns the full `englishWords` superset (which now spans all
 * categories and includes phrases/sentences). The original lesson selects a
 * random subset of questions, so difficulty is not silently pinned to a specific
 * item set; all original ids remain present. Callers that need a controlled,
 * age-appropriate slice should use the leveled/staged helpers below.
 *
 * @param {string} module one of LEARNING_MODULES.
 * @returns {Array<object>}
 */
export function itemsFor(module) {
  switch (module) {
    case LEARNING_MODULES.COLORS:
      return colors;
    case LEARNING_MODULES.POLISH_LETTERS:
      return polishLetters;
    case LEARNING_MODULES.NUMBERS:
      return numbers;
    case LEARNING_MODULES.ENGLISH:
      return englishWords;
    default:
      return [];
  }
}

// --- pure query helpers ------------------------------------------------------

/** Normalise an item's `level` field to an array of level strings. */
function levelsOf(item) {
  if (item.level === undefined || item.level === null) {
    // no level = appropriate for both age bands
    return [AGE_LEVELS.EARLY, AGE_LEVELS.LATE];
  }
  return Array.isArray(item.level) ? item.level : [item.level];
}

/** An item's stage, defaulting to 1 when unset. */
function stageOf(item) {
  return typeof item.stage === 'number' ? item.stage : 1;
}

/**
 * Items of a module appropriate for the given age level. Items with no `level`
 * are appropriate for every level and are always included.
 * @param {string} module one of LEARNING_MODULES.
 * @param {'EARLY'|'LATE'} level an AGE_LEVELS value.
 * @returns {Array<object>}
 */
export function itemsForLevel(module, level) {
  return itemsFor(module).filter((item) => levelsOf(item).includes(level));
}

/**
 * The distinct thematic categories present in a module, sorted alphabetically
 * for deterministic output.
 * @param {string} module one of LEARNING_MODULES.
 * @returns {Array<string>}
 */
export function categoriesFor(module) {
  const set = new Set();
  for (const item of itemsFor(module)) {
    if (item.category) set.add(item.category);
  }
  return [...set].sort();
}

/**
 * Items of a module belonging to a given category, in catalog order.
 * @param {string} module one of LEARNING_MODULES.
 * @param {string} category the thematic category.
 * @returns {Array<object>}
 */
export function itemsForCategory(module, category) {
  return itemsFor(module).filter((item) => item.category === category);
}

/**
 * The distinct stage numbers present in a module, ascending.
 * @param {string} module one of LEARNING_MODULES.
 * @returns {Array<number>}
 */
export function stagesFor(module) {
  const set = new Set();
  for (const item of itemsFor(module)) {
    set.add(stageOf(item));
  }
  return [...set].sort((a, b) => a - b);
}

/**
 * All items of a module up to and including the given stage, optionally further
 * filtered by age level. This is guaranteed MONOTONIC: the result for stage `n`
 * is always a superset of the result for stage `n-1` (for the same level).
 * @param {string} module one of LEARNING_MODULES.
 * @param {number} stage the highest stage to include (inclusive).
 * @param {('EARLY'|'LATE')} [level] optional age-level filter.
 * @returns {Array<object>}
 */
export function itemsUpToStage(module, stage, level) {
  let items = itemsFor(module).filter((item) => stageOf(item) <= stage);
  if (level) {
    items = items.filter((item) => levelsOf(item).includes(level));
  }
  return items;
}

/**
 * English items of a given `kind` ('word' | 'phrase' | 'sentence').
 * @param {'word'|'phrase'|'sentence'} kind
 * @returns {Array<object>}
 */
export function englishByKind(kind) {
  return englishWords.filter((item) => (item.kind || 'word') === kind);
}

/**
 * Build a translation prompt in either direction from an English item. Both
 * directions are always derivable because every item carries prompt (English)
 * and answer (Polish).
 * @param {object} item an English item.
 * @param {'EN_TO_PL'|'PL_TO_EN'} direction
 * @returns {{prompt:string, answer:string, direction:string}}
 */
export function translationPair(item, direction) {
  if (direction === 'PL_TO_EN') {
    return { prompt: item.answer, answer: item.prompt, direction };
  }
  return { prompt: item.prompt, answer: item.answer, direction: 'EN_TO_PL' };
}
