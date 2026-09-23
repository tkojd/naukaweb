// Entry point + tiny hash-router. Wires the view modules into a single #app root and
// navigates between screens via location.hash. No framework, no build step.
//
// Routes:
//   #/profile               -> profile picker / creator
//   #/home                  -> home hub (requires an active profile)
//   #/lesson/<MODULE>        -> a lesson for the given module
//   #/progress              -> progress + badges screen

import * as storage from './data/storage.js';
import { LEARNING_MODULES } from './logic/models.js';
import { renderProfileScreen } from './ui/profileView.js';
import { renderHomeScreen } from './ui/homeView.js';
import { renderLessonScreen } from './ui/lessonView.js';
import { renderProgressScreen } from './ui/progressView.js';
import { el } from './ui/dom.js';
import { stop as stopSpeech } from './audio/speech.js';

// --- Persistent sound toggle -------------------------------------------------
// Rendered once into document.body (outside #app) so it stays visible on every
// screen and survives screen swaps. Controls BOTH effect sounds and speech, which
// both read storage.isMuted(). State persists across reloads via storage.setMuted().

let soundToggleButton = null;

function updateSoundToggle() {
  if (!soundToggleButton) return;
  const muted = storage.isMuted();
  soundToggleButton.textContent = muted ? '🔇' : '🔊';
  soundToggleButton.setAttribute('aria-pressed', String(muted));
  soundToggleButton.setAttribute(
    'aria-label',
    muted ? 'Włącz dźwięki' : 'Wycisz dźwięki'
  );
  soundToggleButton.setAttribute('title', muted ? 'Włącz dźwięki' : 'Wycisz dźwięki');
}

function mountSoundToggle() {
  if (soundToggleButton || typeof document === 'undefined' || !document.body) return;
  soundToggleButton = el('button', {
    type: 'button',
    className: 'sound-toggle touch-target',
    onClick: () => {
      const nextMuted = !storage.isMuted();
      storage.setMuted(nextMuted);
      if (nextMuted) stopSpeech(); // stop any in-flight speech immediately
      updateSoundToggle();
    }
  });
  updateSoundToggle();
  document.body.appendChild(soundToggleButton);
}

const VALID_MODULES = new Set(Object.values(LEARNING_MODULES));

function root() {
  return document.getElementById('app');
}

function navigate(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

function render() {
  const app = root();
  if (!app) return;
  const hash = location.hash.replace(/^#/, '') || '/';
  const parts = hash.split('/').filter(Boolean); // e.g. ['lesson', 'COLORS']
  const route = parts[0] || '';

  const activeProfileId = storage.getActiveProfileId();

  // Guard: everything except the profile screen needs an active profile.
  if (route !== 'profile' && !activeProfileId) {
    navigate('#/profile');
    return;
  }

  switch (route) {
    case 'home':
      renderHomeScreen(app, {
        onOpenModule: (module) => navigate(`#/lesson/${module}`),
        onOpenProgress: () => navigate('#/progress'),
        onSwitchProfile: () => navigate('#/profile')
      });
      break;
    case 'lesson': {
      const module = parts[1];
      if (!VALID_MODULES.has(module)) {
        navigate('#/home');
        return;
      }
      renderLessonScreen(app, {
        module,
        profileId: activeProfileId,
        onBack: () => navigate('#/home')
      });
      break;
    }
    case 'progress':
      renderProgressScreen(app, {
        profileId: activeProfileId,
        onBack: () => navigate('#/home')
      });
      break;
    case 'profile':
      renderProfileScreen(app, {
        onProfileReady: () => navigate('#/home')
      });
      break;
    default:
      // Unknown/empty route: go to home if signed in, else profile picker.
      navigate(activeProfileId ? '#/home' : '#/profile');
  }
}

function boot() {
  mountSoundToggle();
  render();
}

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', boot);

// If the module loads after DOMContentLoaded already fired, boot immediately.
if (document.readyState !== 'loading') boot();
