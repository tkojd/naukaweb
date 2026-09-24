// =============================================================================
// scripts/fetch-icons.mjs
//
// One-off, idempotent authoring helper. Downloads open-license OpenMoji color
// SVG icons (CC BY-SA 4.0) into docs/assets/img/ so the app can show real,
// unambiguous pictures instead of raw emoji glyphs (dydactic rebuild B3).
//
// OpenMoji SVGs are addressed by Unicode codepoint and are reliably reachable at
//   https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@15.0.0/color/svg/<CODEPOINT>.svg
// where <CODEPOINT> is the uppercase hex codepoint(s) of the emoji, joined by
// '-' for multi-codepoint sequences, WITHOUT the U+ prefix and WITHOUT any
// variation-selector (FE0F) unless OpenMoji actually ships that variant.
//
// This script is NOT run during build or tests. Run it once by hand:
//   node scripts/fetch-icons.mjs
// It skips files already present, throttles requests, and records a manifest at
// docs/assets/img/manifest.json. Re-running only fetches what is missing.
//
// The ICONS map below is CURATED: one codepoint per catalog concept that needs a
// picture (English vocabulary nouns, letter example words, colour target objects
// and counting glyphs). Icons are chosen to be unambiguous for a small child and
// to NOT trivially reveal an answer when reused as a distractor. Verbs,
// adjectives, phrases and sentences are intentionally omitted here (they are not
// represented by a single unambiguous picture and stay on the Web-Speech path).
// =============================================================================

import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { constants as FS } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(REPO_ROOT, 'docs', 'assets', 'img');
const OPENMOJI_VERSION = '15.0.0';
const BASE = `https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@${OPENMOJI_VERSION}/color/svg`;
const THROTTLE_MS = 250;
const LICENSE = 'CC BY-SA 4.0';
const SOURCE_PROJECT = 'https://openmoji.org/';

// key = asset name (without .svg); value = OpenMoji codepoint sequence.
// The key is a stable concept name that the asset-resolution layer maps to.
const ICONS = {
  // --- English: animals ---
  cat: '1F408',
  dog: '1F415',
  bird: '1F426',
  fish: '1F41F',
  horse: '1F40E',
  cow: '1F404',
  pig: '1F416',
  sheep: '1F411',
  duck: '1F986',
  rabbit: '1F407',
  bear: '1F43B',
  lion: '1F981',
  tiger: '1F405',
  elephant: '1F418',
  monkey: '1F412',
  frog: '1F438',
  bee: '1F41D',
  snake: '1F40D',
  fox: '1F98A',
  wolf: '1F43A',
  // --- English: food ---
  apple: '1F34E',
  milk: '1F95B',
  bread: '1F35E',
  water: '1F4A7',
  banana: '1F34C',
  egg: '1F95A',
  cheese: '1F9C0',
  cake: '1F370',
  soup: '1F372',
  rice: '1F35A',
  meat: '1F356',
  juice: '1F9C3',
  // --- English: body ---
  hand: '270B',
  eye: '1F441',
  nose: '1F443',
  ear: '1F442',
  mouth: '1F444',
  foot: '1F9B6',
  // --- English: clothes ---
  shirt: '1F455',
  shoes: '1F45F',
  hat: '1F9E2',
  dress: '1F457',
  socks: '1F9E6',
  coat: '1F9E5',
  gloves: '1F9E4',
  // --- English: house ---
  house: '1F3E0',
  door: '1F6AA',
  window: '1FA9F',
  bed: '1F6CF',
  chair: '1FA91',
  table: '1F37D',
  lamp: '1F4A1',
  key: '1F511',
  // --- English: nature ---
  sun: '2600',
  moon: '1F319',
  tree: '1F333',
  flower: '1F337',
  star: '2B50',
  rain: '1F327',
  snow: '2744',
  cloud: '2601',
  river: '1F3DE',
  mountain: '26F0',
  // --- English: transport ---
  car: '1F697',
  bus: '1F68C',
  train: '1F686',
  plane: '2708',
  bike: '1F6B2',
  boat: '26F5',
  ship: '1F6A2',
  // --- Letters: example-word objects (Polish alfabet) ---
  watermelon: '1F349', // arbuz (A)
  balloon: '1F388', // balon (B)
  onion: '1F9C5', // cebula (C)
  butterfly: '1F98B', // ćma (Ć)
  tv: '1F4FA', // ekran (E)
  goose: '1FABF', // gęś (Ę) - if missing, script records the miss
  flag: '1F6A9', // flaga (F)
  guitar: '1F3B8', // gitara (G)
  scooter: '1F6F4', // hulajnoga (H)
  needle: '1FAA1', // igła (I)
  boat_small: '1F6A4', // łódka (Ł)
  mouse: '1F42D', // mysz (M)
  snail: '1F40C', // ślimak (Ś)
  zebra: '1F993', // zebra (Z)
  // --- Colour target objects (unambiguous, do NOT reveal the colour name) ---
  // These are neutral objects a child recognises; the colour is conveyed by the
  // swatch elsewhere, the icon is only a friendly picture, not the answer key.
  paintbrush: '1F58C',
  crayon: '1F58D'
};

async function exists(p) {
  try {
    await access(p, FS.F_OK);
    return true;
  } catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const manifestPath = path.join(OUT_DIR, 'manifest.json');
  let manifest = { license: LICENSE, source: SOURCE_PROJECT, openmojiVersion: OPENMOJI_VERSION, icons: {} };
  if (await exists(manifestPath)) {
    try {
      manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
      manifest.icons = manifest.icons || {};
    } catch {
      /* start fresh on corrupt manifest */
    }
  }

  const misses = [];
  let fetched = 0;
  let skipped = 0;

  for (const [name, codepoint] of Object.entries(ICONS)) {
    const outFile = path.join(OUT_DIR, `${name}.svg`);
    const url = `${BASE}/${codepoint}.svg`;
    if (await exists(outFile)) {
      skipped += 1;
      manifest.icons[name] = { codepoint, url, license: LICENSE };
      continue;
    }
    try {
      const res = await fetch(url);
      if (!res.ok) {
        misses.push({ name, codepoint, status: res.status });
        await sleep(THROTTLE_MS);
        continue;
      }
      const svg = await res.text();
      if (!svg.includes('<svg')) {
        misses.push({ name, codepoint, status: 'not-svg' });
        await sleep(THROTTLE_MS);
        continue;
      }
      await writeFile(outFile, svg, 'utf8');
      manifest.icons[name] = { codepoint, url, license: LICENSE };
      fetched += 1;
      console.log(`fetched ${name} <- ${codepoint}`);
    } catch (err) {
      misses.push({ name, codepoint, error: String(err && err.message) });
    }
    await sleep(THROTTLE_MS);
  }

  manifest.generatedAt = new Date().toISOString();
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  console.log(`\nicons: fetched=${fetched} skipped(existing)=${skipped} missed=${misses.length}`);
  if (misses.length) console.log('misses:', JSON.stringify(misses, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
