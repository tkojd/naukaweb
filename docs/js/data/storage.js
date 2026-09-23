// localStorage-backed persistence for the web app. Mirrors the Android app's Room
// database + DataStore stores (ActiveProfileStore, ReviewStreakStore, ProgressRepository
// persistence) but keeps everything under a single namespaced key so the whole state
// can be read/written as one JSON blob. Framework-free; degrades gracefully when
// window.localStorage is unavailable or the stored JSON is corrupt.

import { AGE_LEVELS } from '../logic/models.js';

/** Single top-level key holding the entire app state. */
const STORAGE_KEY = 'naukaweb.v1';

/**
 * Shape of the persisted blob:
 * {
 *   activeProfileId: string|null,
 *   profiles: [{ id, name, avatar, level? }],  // level is an AGE_LEVELS value (optional)
 *   progress: {
 *     [profileId]: {
 *       reviewStates: { [itemId]: { itemId, box, dueTimestampMillis, lastReviewedMillis, correctStreak, moduleType } },
 *       modules: { [module]: { itemsCompleted, totalPoints, stars } },
 *       badges: { [badgeId]: earnedAtMillis },
 *       streak: { currentStreakDays, lastReviewEpochDay }
 *     }
 *   }
 * }
 */

function emptyState() {
  return { activeProfileId: null, profiles: [], progress: {}, muted: false };
}

/**
 * The default age level for a profile that predates the age-band feature. LATE
 * is chosen because its content set includes the reading/spelling task types, so
 * no existing content is hidden from legacy profiles. This is only a READ-time
 * default; the stored blob is never rewritten unless the user changes it, so the
 * migration stays non-destructive.
 */
const DEFAULT_LEVEL = AGE_LEVELS.LATE;

/** True if `level` is a recognised AGE_LEVELS value. */
function isValidLevel(level) {
  return level === AGE_LEVELS.EARLY || level === AGE_LEVELS.LATE;
}

/**
 * Non-destructive migration of a single stored profile: keep every existing
 * field (id, name, avatar, and any progress that lives elsewhere) and only
 * normalise the optional `level`. Missing/invalid levels are left absent on the
 * returned object so nothing is silently rewritten; callers use profileLevel()
 * to resolve a usable value.
 */
function migrateProfile(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const profile = {
    id: raw.id,
    name: raw.name,
    avatar: raw.avatar
  };
  if (isValidLevel(raw.level)) profile.level = raw.level;
  return profile;
}

/**
 * Resolve the effective age level for a profile, applying the read-time default
 * for legacy profiles that never chose a band.
 * @param {{level?:string}|null} profile
 * @returns {'EARLY'|'LATE'}
 */
export function profileLevel(profile) {
  return profile && isValidLevel(profile.level) ? profile.level : DEFAULT_LEVEL;
}

/** True if a working localStorage is available. */
function hasLocalStorage() {
  try {
    return typeof localStorage !== 'undefined' && localStorage !== null;
  } catch {
    return false;
  }
}

// In-memory fallback so the app still works (for the session) when localStorage is
// missing or throws (private mode, disabled cookies, etc.).
let memoryState = null;

function readState() {
  if (!hasLocalStorage()) {
    if (memoryState == null) memoryState = emptyState();
    return memoryState;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return emptyState();
    return {
      activeProfileId: parsed.activeProfileId ?? null,
      // Migrate profiles on read so pre-age-band blobs still load intact: only
      // the optional `level` is normalised, no profile or progress is dropped.
      profiles: Array.isArray(parsed.profiles) ? parsed.profiles.map(migrateProfile) : [],
      progress: parsed.progress && typeof parsed.progress === 'object' ? parsed.progress : {},
      // Preserve the persisted mute flag so it survives a reload.
      muted: parsed.muted === true
    };
  } catch {
    // Corrupt JSON or read error: start clean rather than crashing.
    return emptyState();
  }
}

function writeState(state) {
  if (!hasLocalStorage()) {
    memoryState = state;
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota or serialization failure: keep an in-memory copy so the session continues.
    memoryState = state;
  }
}

function ensureProfileBucket(state, profileId) {
  if (!state.progress[profileId]) {
    state.progress[profileId] = {
      reviewStates: {},
      modules: {},
      badges: {},
      streak: { currentStreakDays: 0, lastReviewEpochDay: null }
    };
  }
  const bucket = state.progress[profileId];
  if (!bucket.reviewStates) bucket.reviewStates = {};
  if (!bucket.modules) bucket.modules = {};
  if (!bucket.badges) bucket.badges = {};
  if (!bucket.streak) bucket.streak = { currentStreakDays: 0, lastReviewEpochDay: null };
  return bucket;
}

function newId() {
  // Sufficiently unique for a single-device kids app; avoids requiring crypto.
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// --- Profiles API -----------------------------------------------------------

/** @returns {Array<{id:string, name:string, avatar:string}>} all profiles. */
export function listProfiles() {
  return readState().profiles.slice();
}

/**
 * Create a new learner profile and persist it.
 * @param {string} name learner's name (imię).
 * @param {string} avatar emoji avatar glyph.
 * @param {('EARLY'|'LATE')} [level] optional age band (AGE_LEVELS). Omitted or
 *   invalid values leave the profile without a stored level (treated as the
 *   read-time default), keeping createProfile(name, avatar) callable.
 * @returns {{id:string, name:string, avatar:string, level?:string}}
 */
export function createProfile(name, avatar, level) {
  const state = readState();
  const profile = {
    id: newId(),
    name: (name || '').trim() || 'Uczeń',
    avatar: avatar || '🐱'
  };
  if (isValidLevel(level)) profile.level = level;
  state.profiles.push(profile);
  writeState(state);
  return profile;
}

/**
 * Update a profile's age level. Ignores unknown ids and invalid levels.
 * @param {string} id profile id.
 * @param {('EARLY'|'LATE')} level an AGE_LEVELS value.
 * @returns {{id:string, name:string, avatar:string, level?:string}|null}
 */
export function updateProfileLevel(id, level) {
  if (!isValidLevel(level)) return getProfile(id);
  const state = readState();
  const profile = state.profiles.find((p) => p.id === id);
  if (!profile) return null;
  profile.level = level;
  writeState(state);
  return profile;
}

/** @returns {{id:string, name:string, avatar:string}|null} the profile with `id`. */
export function getProfile(id) {
  return readState().profiles.find((p) => p.id === id) || null;
}

/** @returns {string|null} the active profile id (remembered across sessions). */
export function getActiveProfileId() {
  const state = readState();
  const id = state.activeProfileId;
  if (id && state.profiles.some((p) => p.id === id)) return id;
  return null;
}

/** Persist the active profile id. */
export function setActiveProfileId(id) {
  const state = readState();
  state.activeProfileId = id;
  writeState(state);
}

// --- Review states ----------------------------------------------------------

/**
 * @returns {object|null} the stored review state for an item, or null if never seen.
 */
export function getReviewState(profileId, itemId) {
  const bucket = readState().progress[profileId];
  if (!bucket || !bucket.reviewStates) return null;
  return bucket.reviewStates[itemId] || null;
}

/** @returns {Array<object>} all review states for a profile. */
export function getAllReviewStates(profileId) {
  const bucket = readState().progress[profileId];
  if (!bucket || !bucket.reviewStates) return [];
  return Object.values(bucket.reviewStates);
}

/**
 * Insert or replace a review state. `moduleType` is stored alongside so snapshot
 * assembly can group by module without a separate lookup.
 */
export function upsertReviewState(profileId, state, moduleType) {
  const root = readState();
  const bucket = ensureProfileBucket(root, profileId);
  bucket.reviewStates[state.itemId] = { ...state, moduleType: moduleType ?? state.moduleType };
  writeState(root);
}

// --- Module progress --------------------------------------------------------

/** @returns {{itemsCompleted:number, totalPoints:number, stars:number}|null} */
export function getModuleProgress(profileId, module) {
  const bucket = readState().progress[profileId];
  if (!bucket || !bucket.modules) return null;
  return bucket.modules[module] || null;
}

/** Insert or replace the aggregate progress for a module. */
export function upsertModuleProgress(profileId, module, progress) {
  const root = readState();
  const bucket = ensureProfileBucket(root, profileId);
  bucket.modules[module] = {
    itemsCompleted: progress.itemsCompleted ?? 0,
    totalPoints: progress.totalPoints ?? 0,
    stars: progress.stars ?? 0
  };
  writeState(root);
}

// --- Badges -----------------------------------------------------------------

/** @returns {Array<string>} ids of badges the profile has earned. */
export function getEarnedBadgeIds(profileId) {
  const bucket = readState().progress[profileId];
  if (!bucket || !bucket.badges) return [];
  return Object.keys(bucket.badges);
}

/** Persist a newly earned badge (idempotent: keeps the first earn time). */
export function addBadge(profileId, badgeId, earnedAtMillis) {
  const root = readState();
  const bucket = ensureProfileBucket(root, profileId);
  if (bucket.badges[badgeId] == null) {
    bucket.badges[badgeId] = earnedAtMillis;
  }
  writeState(root);
}

// --- Streak -----------------------------------------------------------------

/** @returns {{currentStreakDays:number, lastReviewEpochDay:(number|null)}} */
export function getStreak(profileId) {
  const bucket = readState().progress[profileId];
  if (!bucket || !bucket.streak) return { currentStreakDays: 0, lastReviewEpochDay: null };
  return {
    currentStreakDays: bucket.streak.currentStreakDays ?? 0,
    lastReviewEpochDay: bucket.streak.lastReviewEpochDay ?? null
  };
}

/** Persist the profile's consecutive-day review streak. */
export function setStreak(profileId, streak) {
  const root = readState();
  const bucket = ensureProfileBucket(root, profileId);
  bucket.streak = {
    currentStreakDays: streak.currentStreakDays ?? 0,
    lastReviewEpochDay: streak.lastReviewEpochDay ?? null
  };
  writeState(root);
}

// --- Settings (mute toggle) -------------------------------------------------

/** @returns {boolean} whether audio is muted (default false). */
export function isMuted() {
  const state = readState();
  return state.muted === true;
}

/** Persist the global mute toggle. */
export function setMuted(muted) {
  const state = readState();
  state.muted = muted === true;
  writeState(state);
}
