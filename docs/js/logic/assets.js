// =============================================================================
// Pure asset-resolution layer (DOM-free, browser-free).
//
// Resolves, per content item, a RELATIVE path to a self-hosted open-license
// picture (OpenMoji SVG, CC BY-SA 4.0) and a RELATIVE path to a self-hosted
// English pronunciation recording (real human audio from Wikimedia Commons),
// or null when no such asset exists. The rest of the app (lesson/worksheet
// views, audio layer) consumes these helpers so it can show real pictures
// instead of raw emoji and play a correct English recording instead of relying
// on speech synthesis.
//
// PURITY: this module has no DOM and no browser globals, so Vitest imports it
// directly. It only maps ids/words to string paths.
//
// PATHS ARE RELATIVE. The app is served from the /naukaweb/ subpath on GitHub
// Pages, so an asset path MUST NOT start with '/'. All paths returned here are
// relative to docs/ (the served root), e.g. 'assets/img/cat.svg'. HTML/JS that
// lives under docs/ references them exactly as returned.
//
// FALLBACKS:
//   * imageFor(item) => a picture path when we have a curated icon for the item,
//     otherwise null. Callers fall back to item.emoji.
//   * audioForEnglish(item) => a recording path when a file was fetched for that
//     English item, otherwise null. Callers fall back to Web Speech en-US.
//
// The icon/audio SETS are curated by the committed scripts/fetch-icons.mjs and
// scripts/fetch-audio.mjs helpers. When those scripts add/remove assets, update
// the maps below (ICON_BY_ID / the manifests) accordingly.
// =============================================================================

/** Directory (relative to docs/) holding OpenMoji SVG icons. */
export const IMG_DIR = 'assets/img';
/** Directory (relative to docs/) holding English pronunciation recordings. */
export const AUDIO_EN_DIR = 'assets/audio/en';

// --- image mapping -----------------------------------------------------------
//
// Maps a content item id to the icon basename under IMG_DIR (without extension).
// Only concepts that have an UNAMBIGUOUS single picture appropriate for a small
// child are listed. Verbs, adjectives, phrases, sentences, plain colours and
// bare digits are intentionally absent (they are not conveyed by one icon and
// stay on emoji / colour-swatch / glyph rendering).
//
// English item ids follow `english_<word>`. Letter item ids follow
// `letter_<lower>`; their picture is the example-word object.

/** English word id -> icon basename. */
const ENGLISH_ICON = {
  // animals
  english_cat: 'cat',
  english_dog: 'dog',
  english_bird: 'bird',
  english_fish: 'fish',
  english_horse: 'horse',
  english_cow: 'cow',
  english_pig: 'pig',
  english_sheep: 'sheep',
  english_duck: 'duck',
  english_rabbit: 'rabbit',
  english_bear: 'bear',
  english_lion: 'lion',
  english_tiger: 'tiger',
  english_elephant: 'elephant',
  english_monkey: 'monkey',
  english_frog: 'frog',
  english_bee: 'bee',
  english_snake: 'snake',
  english_fox: 'fox',
  english_wolf: 'wolf',
  // food
  english_apple: 'apple',
  english_milk: 'milk',
  english_bread: 'bread',
  english_water: 'water',
  english_banana: 'banana',
  english_egg: 'egg',
  english_cheese: 'cheese',
  english_cake: 'cake',
  english_soup: 'soup',
  english_rice: 'rice',
  english_meat: 'meat',
  english_juice: 'juice',
  // body
  english_hand: 'hand',
  english_eye: 'eye',
  english_nose: 'nose',
  english_ear: 'ear',
  english_mouth: 'mouth',
  english_foot: 'foot',
  // clothes
  english_shirt: 'shirt',
  english_shoes: 'shoes',
  english_hat: 'hat',
  english_dress: 'dress',
  english_socks: 'socks',
  english_coat: 'coat',
  english_gloves: 'gloves',
  // house
  english_house: 'house',
  english_door: 'door',
  english_window: 'window',
  english_bed: 'bed',
  english_chair: 'chair',
  english_table: 'table',
  english_lamp: 'lamp',
  english_key: 'key',
  // nature
  english_sun: 'sun',
  english_moon: 'moon',
  english_tree: 'tree',
  english_flower: 'flower',
  english_star: 'star',
  english_rain: 'rain',
  english_snow: 'snow',
  english_cloud: 'cloud',
  english_river: 'river',
  english_mountain: 'mountain',
  // transport
  english_car: 'car',
  english_bus: 'bus',
  english_train: 'train',
  english_plane: 'plane',
  english_bike: 'bike',
  english_boat: 'boat',
  english_ship: 'ship'
};

/** Letter item id -> icon basename (the example-word object). */
const LETTER_ICON = {
  letter_a: 'watermelon', // arbuz
  letter_b: 'balloon', // balon
  letter_c: 'onion', // cebula
  letter_ć: 'butterfly', // ćma
  letter_e: 'tv', // ekran
  letter_ę: 'goose', // gęś
  letter_f: 'flag', // flaga
  letter_g: 'guitar', // gitara
  letter_h: 'scooter', // hulajnoga
  letter_i: 'needle', // igła
  letter_j: 'apple', // jabłko
  letter_k: 'cat', // kot
  letter_l: 'lamp', // lampa
  letter_ł: 'boat_small', // łódka
  letter_m: 'mouse', // mysz
  letter_n: 'nose', // nos
  letter_ń: 'horse', // koń
  letter_o: 'eye', // oko
  letter_p: 'dog', // pies
  letter_r: 'fish', // ryba
  letter_s: 'sun', // słońce
  letter_ś: 'snail', // ślimak
  letter_t: 'tiger', // tygrys
  letter_u: 'bee', // ul
  letter_w: 'water', // woda
  letter_y: 'fish', // ryba
  letter_z: 'zebra', // zebra
  letter_ź: 'horse', // źrebak
  letter_ż: 'frog' // żaba
};

const ICON_BY_ID = { ...ENGLISH_ICON, ...LETTER_ICON };

/**
 * The icon basename (without extension) curated for an item, or null when the
 * item has no unambiguous picture.
 * @param {{id?:string}} item
 * @returns {string|null}
 */
export function iconNameFor(item) {
  if (!item || !item.id) return null;
  return ICON_BY_ID[item.id] || null;
}

/**
 * A RELATIVE picture path for an item (e.g. 'assets/img/cat.svg') or null when
 * no curated icon exists. Callers fall back to item.emoji when this is null.
 * @param {{id?:string}} item
 * @returns {string|null}
 */
export function imageFor(item) {
  const name = iconNameFor(item);
  return name ? `${IMG_DIR}/${name}.svg` : null;
}

// --- English audio mapping ---------------------------------------------------
//
// Recordings were fetched once by scripts/fetch-audio.mjs. Coverage is partial
// (the source API skips words it has no recording for), so the set of ids WITH
// audio is recorded here as data. Each value is the file EXTENSION that was
// downloaded ('ogg' for most Wikimedia recordings, 'mp3' where available), so
// the runtime resolves the exact self-hosted file. Ids not present here have no
// recording and fall back to Web Speech en-US.
//
// This map is generated from docs/assets/audio/en/manifest.json (see
// scripts/sync-audio-map.mjs is not needed - it is a small static list). Keep it
// in sync with the committed files when re-running the fetch script.

/**
 * English item id -> downloaded file extension. Only the words for which a real
 * recording was successfully fetched appear here (see manifest.json). All other
 * English items intentionally have NO entry and fall back to Web Speech en-US.
 *
 * NOTE: the upstream Free Dictionary API / Wikimedia media hosts were heavily
 * rate-limited/partly down at authoring time, so this real-recording set is a
 * small curated seed. Re-running scripts/fetch-audio.mjs when the API is healthy
 * will download more; add their ids/extensions here to activate them.
 */
export const ENGLISH_AUDIO = {
  english_bird: 'ogg',
  english_cat: 'ogg',
  english_cow: 'ogg',
  english_dog: 'ogg',
  english_duck: 'ogg',
  english_fish: 'ogg',
  english_horse: 'ogg',
  english_pig: 'ogg',
  english_rabbit: 'ogg',
  english_sheep: 'ogg',
  english_two: 'wav'
};

/**
 * A RELATIVE English pronunciation path for an English item (e.g.
 * 'assets/audio/en/english_cat.ogg') or null when no recording was fetched.
 * Callers fall back to Web Speech en-US when this is null.
 * @param {{id?:string, moduleType?:string}} item
 * @returns {string|null}
 */
export function audioForEnglish(item) {
  if (!item || !item.id) return null;
  const ext = ENGLISH_AUDIO[item.id];
  return ext ? `${AUDIO_EN_DIR}/${item.id}.${ext}` : null;
}

/**
 * Attach resolved asset fields to a shallow COPY of an item without mutating the
 * catalog: `imageSrc` (or null) and, for English items, `audioSrc` (or null).
 * Pure helper for builders/views that prefer fields over function calls.
 * @param {object} item
 * @returns {object} a new object with imageSrc/audioSrc added.
 */
export function withAssets(item) {
  if (!item) return item;
  const out = { ...item, imageSrc: imageFor(item) };
  out.audioSrc = audioForEnglish(item);
  return out;
}
