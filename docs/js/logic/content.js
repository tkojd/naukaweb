// Static learning content for every module, ported EXACTLY from the Android app's
// ContentCatalog.kt. Framework-free plain data so it is validated by unit tests and
// shared with the browser UI. Id and audioKey schemes match the Kotlin source.

import { LEARNING_MODULES } from './models.js';

// --- builders ---------------------------------------------------------------

function color(name, hex) {
  return {
    id: `color_${name}`,
    moduleType: LEARNING_MODULES.COLORS,
    prompt: name,
    answer: name,
    colorHex: hex,
    audioKey: `audio_color_${name}`
  };
}

function letter(char, example, emoji) {
  const lower = char.toLowerCase();
  return {
    id: `letter_${lower}`,
    moduleType: LEARNING_MODULES.POLISH_LETTERS,
    prompt: char,
    answer: char,
    emoji,
    exampleWord: example,
    audioKey: `audio_letter_${lower}`
  };
}

function number(digit, word) {
  return {
    id: `number_${digit}`,
    moduleType: LEARNING_MODULES.NUMBERS,
    prompt: String(digit),
    answer: word,
    emoji: String(digit),
    audioKey: `audio_number_${digit}`
  };
}

function english(word, polish, emoji) {
  return {
    id: `english_${word}`,
    moduleType: LEARNING_MODULES.ENGLISH,
    prompt: word,
    answer: polish,
    emoji,
    audioKey: `audio_english_${word}`
  };
}

// --- catalog ----------------------------------------------------------------

/** Basic colors with Polish names and their hex values. */
export const colors = [
  color('czerwony', '#FF0000'),
  color('niebieski', '#0000FF'),
  color('zielony', '#008000'),
  color('żółty', '#FFEB00'),
  color('pomarańczowy', '#FF7F00'),
  color('fioletowy', '#8000FF'),
  color('różowy', '#FF69B4'),
  color('brązowy', '#8B4513'),
  color('czarny', '#000000'),
  color('biały', '#FFFFFF')
];

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

/** Digits 0-9 with their Polish number words. */
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

/** Starter English vocabulary, each paired with its Polish translation and an emoji hint. */
export const englishWords = [
  english('cat', 'kot', '🐱'),
  english('dog', 'pies', '🐶'),
  english('bird', 'ptak', '🐦'),
  english('fish', 'ryba', '🐟'),
  english('horse', 'koń', '🐴'),
  english('red', 'czerwony', '🔴'),
  english('blue', 'niebieski', '🔵'),
  english('green', 'zielony', '🟢'),
  english('yellow', 'żółty', '🟡'),
  english('one', 'jeden', '1️⃣'),
  english('two', 'dwa', '2️⃣'),
  english('three', 'trzy', '3️⃣'),
  english('mother', 'mama', '👩'),
  english('father', 'tata', '👨'),
  english('sister', 'siostra', '👧'),
  english('brother', 'brat', '👦'),
  english('apple', 'jabłko', '🍎'),
  english('milk', 'mleko', '🥛'),
  english('bread', 'chleb', '🍞'),
  english('water', 'woda', '💧'),
  english('sun', 'słońce', '☀️'),
  english('moon', 'księżyc', '🌙'),
  english('tree', 'drzewo', '🌳'),
  english('house', 'dom', '🏠')
];

/** All items across every module, useful for global lookups. */
export const allItems = [...colors, ...polishLetters, ...numbers, ...englishWords];

/**
 * The items for a given module.
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
