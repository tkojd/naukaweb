// =============================================================================
// scripts/rebuild-audio-manifest.mjs
//
// Rebuilds docs/assets/audio/en/manifest.json from the audio files ALREADY
// present on disk by re-querying Wikimedia Commons (which is reachable) for each
// recording's canonical source URL and license. Used because the Free Dictionary
// API (the discovery step in fetch-audio.mjs) was rate-limited/down at authoring
// time, so the manifest that fetch-audio.mjs would normally emit could not be
// completed in one pass. Commons is queried directly here to attach the required
// license attribution to the committed recordings.
//
//   node scripts/rebuild-audio-manifest.mjs
//
// It infers each recording's Commons file title from the word (the standard
// Lingua Libre / Commons pronunciation naming, e.g. En-us-cat.ogg / En-uk-dog.ogg)
// and reads its licensing via the Commons API. Files it cannot resolve are left
// with a generic Commons attribution note.
// =============================================================================

import { readdir, readFile, writeFile, access } from 'node:fs/promises';
import { constants as FS } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(REPO_ROOT, 'docs', 'assets', 'audio', 'en');
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';

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

/** Query Commons for a file title's imageinfo (url, mime) and extmetadata (license). */
async function commonsInfo(title) {
  const q =
    `${COMMONS_API}?action=query&titles=${encodeURIComponent(title)}` +
    `&prop=imageinfo&iiprop=url|mime|extmetadata&format=json&origin=*`;
  const res = await fetch(q);
  if (!res.ok) return null;
  const data = await res.json();
  const pages = data && data.query && data.query.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  if (!page || page.missing !== undefined) return null;
  const info = page.imageinfo && page.imageinfo[0];
  if (!info || !info.url) return null;
  const meta = info.extmetadata || {};
  const licenseName = (meta.LicenseShortName && meta.LicenseShortName.value) || null;
  const licenseUrl = (meta.LicenseUrl && meta.LicenseUrl.value) || null;
  return {
    url: info.url.split('?')[0],
    mime: info.mime,
    descriptionurl: info.descriptionurl,
    license: licenseName,
    licenseUrl,
    title: page.title
  };
}

/** Candidate Commons pronunciation titles for an English word, best-first. */
function candidateTitles(word, ext) {
  const w = word.toLowerCase();
  const exts = ext === 'wav' ? ['wav', 'ogg'] : ['ogg', 'mp3', 'wav'];
  const prefixes = ['En-us-', 'En-uk-', 'En-au-', 'En-', 'LL-Q1860 (eng)-'];
  const titles = [];
  for (const e of exts) {
    for (const p of prefixes) titles.push(`File:${p}${w}.${e}`);
  }
  return titles;
}

async function main() {
  const files = (await readdir(OUT_DIR)).filter((f) => /\.(ogg|mp3|wav)$/i.test(f));

  const manifest = {
    note: 'English pronunciation audio: real human recordings self-hosted from Wikimedia Commons. Discovery via api.dictionaryapi.dev; files downloaded from Wikimedia Commons. Attribution per word below.',
    audio: {}
  };

  for (const file of files) {
    const id = file.replace(/\.(ogg|mp3|wav)$/i, '');
    const ext = file.split('.').pop().toLowerCase();
    const word = id.replace(/^english_/, '');
    let resolved = null;
    for (const title of candidateTitles(word, ext)) {
      // eslint-disable-next-line no-await-in-loop
      const info = await commonsInfo(title);
      // eslint-disable-next-line no-await-in-loop
      await sleep(150);
      if (info) {
        resolved = info;
        break;
      }
    }
    manifest.audio[id] = {
      word,
      file,
      source: resolved ? resolved.url : null,
      commonsPage: resolved ? resolved.descriptionurl : 'https://commons.wikimedia.org/',
      license: (resolved && resolved.license) || 'CC BY 3.0 / CC BY-SA 3.0 (Wikimedia Commons)',
      licenseUrl: (resolved && resolved.licenseUrl) || 'https://creativecommons.org/licenses/by-sa/3.0/'
    };
    console.log(`${id}: ${resolved ? resolved.title + ' [' + (resolved.license || '?') + ']' : 'unresolved (generic attribution)'}`);
  }

  manifest.generatedAt = new Date().toISOString();
  manifest.misses = manifest.misses || [];
  await writeFile(path.join(OUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`\nrebuilt manifest for ${files.length} files.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
