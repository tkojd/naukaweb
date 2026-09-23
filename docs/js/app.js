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

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', render);

// If the module loads after DOMContentLoaded already fired, render immediately.
if (document.readyState !== 'loading') render();
