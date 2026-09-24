// =============================================================================
// scripts/fetch-audio.mjs
//
// One-off, idempotent authoring helper. For each single-word English vocabulary
// item it queries the Free Dictionary API (https://api.dictionaryapi.dev) to
// DISCOVER a real human pronunciation recording (hosted on Wikimedia Commons,
// typically CC BY 3.0 / CC BY-SA 3.0), then downloads the actual audio file
// straight from Wikimedia Commons and self-hosts it at
//   docs/assets/audio/en/<id>.<ext>
// so English words are spoken with a correct, non-clipped English recording
// instead of broken speech synthesis (dydactic rebuild B2).
//
// WHY WE FETCH FROM WIKIMEDIA, NOT THE dictionaryapi.dev MEDIA PROXY:
// The dictionaryapi.dev media proxy (…/media/pronunciations/en/<word>.mp3) was
// returning HTTP 522 (origin down) at authoring time and hanging ~20s/request.
// The upstream recordings it points at live on Wikimedia Commons and ARE
// reachable and fast. We therefore resolve each phonetic entry's Commons page
// (via sourceUrl curid) to the real upload.wikimedia.org file and download that.
// Commons pronunciation recordings are predominantly Ogg Vorbis (.ogg), which
// every modern browser plays via new Audio(); a few are .mp3. We keep the source
// extension. The runtime audio layer resolves whichever file exists and falls
// back to Web Speech en-US when none does (FEAT-002).
//
// The API coverage is INCOMPLETE and rate-limited/slow, so this script:
//   * throttles requests (THROTTLE_MS between calls),
//   * tolerates and SKIPS words with no audio (records them as misses),
//   * is idempotent (skips ids whose audio already exists),
//   * writes a manifest (docs/assets/audio/en/manifest.json) recording the
//     Commons source URL + license per word, as the licenses require.
// Words without a recording fall back to Web Speech en-US at runtime (FEAT-002).
//
// This script is NOT run during build or tests. Run it once by hand:
//   node scripts/fetch-audio.mjs
// =============================================================================

import { mkdir, writeFile, readFile, access, readdir } from 'node:fs/promises';
import { constants as FS } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { englishWords } from '../docs/js/logic/content.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(REPO_ROOT, 'docs', 'assets', 'audio', 'en');
const API = 'https://api.dictionaryapi.dev/api/v2/entries/en';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const THROTTLE_MS = 250;

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

const REQUEST_TIMEOUT_MS = 8000;

/** fetch with an abort timeout so a single hung host cannot stall the run. */
async function fetchT(url, ms = REQUEST_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/** All phonetics entries that carry an audio URL, across every dictionary entry. */
function phoneticsWithAudio(entries) {
  if (!Array.isArray(entries)) return [];
  const phonetics = entries.flatMap((e) => (Array.isArray(e.phonetics) ? e.phonetics : []));
  return phonetics.filter((p) => p && p.audio && String(p.audio).trim());
}

/** Prefer a UK, then US, then any recording. */
function preferPhon(list) {
  return (
    list.find((p) => /-uk\.(mp3|ogg)$/i.test(p.audio)) ||
    list.find((p) => /-us\.(mp3|ogg)$/i.test(p.audio)) ||
    list[0] ||
    null
  );
}

/** Extract the Wikimedia Commons curid (pageid) from a phonetic entry sourceUrl. */
function curidFrom(phon) {
  const url = phon && phon.sourceUrl;
  if (!url) return null;
  const m = String(url).match(/curid=(\d+)/);
  return m ? m[1] : null;
}

/** Resolve a Commons pageid to { url, mime, title } of the actual media file. */
async function resolveCommons(curid) {
  const q = `${COMMONS_API}?action=query&pageids=${curid}&prop=imageinfo&iiprop=url|mime&format=json&origin=*`;
  const res = await fetchT(q);
  if (!res.ok) return null;
  const data = await res.json();
  const pages = data && data.query && data.query.pages;
  if (!pages) return null;
  const page = pages[curid] || Object.values(pages)[0];
  const info = page && page.imageinfo && page.imageinfo[0];
  if (!info || !info.url) return null;
  // Strip tracking query params so we download the raw original file.
  const clean = info.url.split('?')[0];
  return { url: clean, mime: info.mime, title: page.title, descriptionurl: info.descriptionurl };
}

function extFromUrl(url, mime) {
  const m = url.toLowerCase().match(/\.(ogg|mp3|oga|wav)(?:$|\?)/);
  if (m) return m[1] === 'oga' ? 'ogg' : m[1];
  if (mime && mime.includes('mpeg')) return 'mp3';
  return 'ogg';
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const manifestPath = path.join(OUT_DIR, 'manifest.json');
  let manifest = {
    note: 'English pronunciation audio discovered via api.dictionaryapi.dev and downloaded directly from Wikimedia Commons. See license per word.',
    audio: {}
  };
  if (await exists(manifestPath)) {
    try {
      manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
      manifest.audio = manifest.audio || {};
    } catch {
      /* start fresh on corrupt manifest */
    }
  }

  const existingFiles = new Set(await readdir(OUT_DIR).catch(() => []));
  const hasAudioFor = (id) => [...existingFiles].some((f) => f.startsWith(`${id}.`) && f !== `${id}.json`);

  // Only single English words (skip phrases/sentences: those stay on Web Speech).
  const words = englishWords.filter((it) => (it.kind || 'word') === 'word');

  const misses = [];
  let fetched = 0;
  let skipped = 0;

  // Resolve + download one item. Returns 'skipped' | 'fetched' | 'miss'.
  async function processItem(item) {
    if (hasAudioFor(item.id)) {
      skipped += 1;
      return;
    }
    const word = encodeURIComponent(String(item.prompt).toLowerCase());
    try {
      const res = await fetchT(`${API}/${word}`);
      if (!res.ok) {
        misses.push({ id: item.id, word: item.prompt, status: res.status });
        return;
      }
      const data = await res.json();
      const candidates = phoneticsWithAudio(data);
      const phon = preferPhon(candidates);
      const curid = phon && curidFrom(phon);
      if (!phon || !curid) {
        misses.push({ id: item.id, word: item.prompt, status: 'no-audio-or-source' });
        return;
      }
      const commons = await resolveCommons(curid);
      if (!commons) {
        misses.push({ id: item.id, word: item.prompt, status: 'commons-unresolved' });
        return;
      }
      const audioRes = await fetchT(commons.url, 15000);
      if (!audioRes.ok) {
        misses.push({ id: item.id, word: item.prompt, status: `dl-${audioRes.status}` });
        return;
      }
      const buf = Buffer.from(await audioRes.arrayBuffer());
      if (!buf.length) {
        misses.push({ id: item.id, word: item.prompt, status: 'empty' });
        return;
      }
      const ext = extFromUrl(commons.url, commons.mime);
      const fileName = `${item.id}.${ext}`;
      await writeFile(path.join(OUT_DIR, fileName), buf);
      existingFiles.add(fileName);
      manifest.audio[item.id] = {
        word: item.prompt,
        file: fileName,
        source: commons.url,
        commonsPage: commons.descriptionurl || (phon.sourceUrl || null),
        license: (phon.license && phon.license.name) || 'see source',
        licenseUrl: (phon.license && phon.license.url) || null
      };
      fetched += 1;
      console.log(`fetched ${item.id} <- ${item.prompt} (${ext}, ${buf.length} bytes)`);
    } catch (err) {
      misses.push({ id: item.id, word: item.prompt, error: String(err && err.message) });
    }
  }

  // The free API is slow and flaky (intermittent HTTP 522 / timeouts) and
  // rate-limits under concurrency, so we go SEQUENTIALLY and RETRY the whole set
  // a few times. Each pass skips words already downloaded (idempotent), so only
  // the still-missing words are retried; transient failures usually succeed on a
  // later pass. Genuine "no recording" words simply stay missing (Web Speech).
  const MAX_PASSES = 4;
  for (let pass = 1; pass <= MAX_PASSES; pass += 1) {
    const before = fetched;
    misses.length = 0;
    for (const item of words) {
      await processItem(item);
      await sleep(THROTTLE_MS);
    }
    console.log(`pass ${pass}: total fetched=${fetched} (+${fetched - before}) still-missing=${misses.length}`);
    if (misses.length === 0) break;
  }

  manifest.generatedAt = new Date().toISOString();
  manifest.misses = misses.map((m) => m.word);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  console.log(`\naudio: fetched=${fetched} skipped(existing)=${skipped} missed=${misses.length}`);
  if (misses.length) console.log('misses:', JSON.stringify(misses, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
