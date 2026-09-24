import { describe, it, expect } from 'vitest';
import { readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  imageFor,
  iconNameFor,
  audioForEnglish,
  withAssets,
  ENGLISH_AUDIO,
  IMG_DIR,
  AUDIO_EN_DIR
} from '../docs/js/logic/assets.js';
import { englishWords, polishLetters, colors, numbers, allItems } from '../docs/js/logic/content.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const IMG_ABS = path.join(REPO_ROOT, 'docs', IMG_DIR);
const AUDIO_ABS = path.join(REPO_ROOT, 'docs', AUDIO_EN_DIR);

describe('asset-resolution layer (pure)', () => {
  it('returns RELATIVE paths (never starting with "/")', () => {
    for (const item of allItems) {
      const img = imageFor(item);
      if (img !== null) expect(img.startsWith('/')).toBe(false);
      const audio = audioForEnglish(item);
      if (audio !== null) expect(audio.startsWith('/')).toBe(false);
    }
  });

  it('imageFor returns null (emoji fallback) for items without a curated icon', () => {
    // plain colours and bare digits are intentionally NOT given icons
    expect(imageFor(colors[0])).toBeNull();
    expect(imageFor(numbers[0])).toBeNull();
    // unknown item id => null
    expect(imageFor({ id: 'does_not_exist' })).toBeNull();
    expect(imageFor(null)).toBeNull();
    expect(imageFor({})).toBeNull();
  });

  it('maps a known English word to its OpenMoji svg', () => {
    const cat = englishWords.find((w) => w.id === 'english_cat');
    expect(imageFor(cat)).toBe(`${IMG_DIR}/cat.svg`);
    expect(iconNameFor(cat)).toBe('cat');
  });

  it('every mapped ICON file actually exists on disk', () => {
    for (const item of allItems) {
      const name = iconNameFor(item);
      if (name) {
        expect(existsSync(path.join(IMG_ABS, `${name}.svg`))).toBe(true);
      }
    }
  });

  it('audioForEnglish resolves only for ids with a fetched recording, else null', () => {
    const cat = englishWords.find((w) => w.id === 'english_cat');
    expect(audioForEnglish(cat)).toBe(`${AUDIO_EN_DIR}/english_cat.${ENGLISH_AUDIO.english_cat}`);
    // a word we know has no recording falls back (null) to Web Speech
    const wolf = englishWords.find((w) => w.id === 'english_wolf');
    expect(audioForEnglish(wolf)).toBeNull();
    expect(audioForEnglish({ id: 'english_nope' })).toBeNull();
  });

  it('every ENGLISH_AUDIO entry points at a file that exists on disk', () => {
    for (const [id, ext] of Object.entries(ENGLISH_AUDIO)) {
      expect(existsSync(path.join(AUDIO_ABS, `${id}.${ext}`))).toBe(true);
    }
  });

  it('every committed audio file is declared in ENGLISH_AUDIO', () => {
    const onDisk = readdirSync(AUDIO_ABS).filter((f) => /\.(ogg|mp3|wav)$/i.test(f));
    for (const file of onDisk) {
      const id = file.replace(/\.(ogg|mp3|wav)$/i, '');
      expect(ENGLISH_AUDIO[id]).toBeDefined();
      expect(file).toBe(`${id}.${ENGLISH_AUDIO[id]}`);
    }
  });

  it('withAssets attaches imageSrc/audioSrc without mutating the source item', () => {
    const cat = englishWords.find((w) => w.id === 'english_cat');
    const before = { ...cat };
    const enriched = withAssets(cat);
    expect(enriched).not.toBe(cat);
    expect(enriched.imageSrc).toBe(`${IMG_DIR}/cat.svg`);
    expect(enriched.audioSrc).toBe(`${AUDIO_EN_DIR}/english_cat.ogg`);
    // original untouched
    expect(cat).toEqual(before);
    expect(cat.imageSrc).toBeUndefined();
  });

  it('letter items resolve to their example-word picture', () => {
    const p = polishLetters.find((l) => l.id === 'letter_p'); // pies -> dog
    expect(imageFor(p)).toBe(`${IMG_DIR}/dog.svg`);
  });
});
