// Home hub screen. Mirrors the Android HomeScreen: greet the active child, show total
// stars/points, present four large colorful module tiles plus a Postępy tile and a
// switch-profile button.

import { el, clear } from './dom.js';
import { LEARNING_MODULES } from '../logic/models.js';
import * as storage from '../data/storage.js';

const TILES = [
  { module: LEARNING_MODULES.COLORS, title: 'Kolory', emoji: '🎨', color: '#FF6B6B' },
  { module: LEARNING_MODULES.POLISH_LETTERS, title: 'Litery', emoji: '🔤', color: '#4D96FF' },
  { module: LEARNING_MODULES.NUMBERS, title: 'Cyfry', emoji: '🔢', color: '#6BCB77' },
  { module: LEARNING_MODULES.ENGLISH, title: 'Angielski', emoji: '🇬🇧', color: '#FFA45B' },
  { module: null, title: 'Postępy', emoji: '🏆', color: '#B983FF' }
];

/**
 * @param {HTMLElement} root
 * @param {{onOpenModule:Function, onOpenProgress:Function, onSwitchProfile:Function}} handlers
 */
export function renderHomeScreen(root, { onOpenModule, onOpenProgress, onSwitchProfile }) {
  clear(root);
  const profileId = storage.getActiveProfileId();
  const profile = storage.getProfile(profileId);
  if (!profile) {
    onSwitchProfile();
    return;
  }

  let totalStars = 0;
  let totalPoints = 0;
  const starsByModule = {};
  for (const tile of TILES) {
    if (!tile.module) continue;
    const mp = storage.getModuleProgress(profileId, tile.module);
    if (mp) {
      totalStars += mp.stars || 0;
      totalPoints += mp.totalPoints || 0;
      starsByModule[tile.module] = mp.stars || 0;
    }
  }

  const container = el('section', { className: 'screen screen--home anim-fade-slide-in' });

  const totalsEl = el('p', {
    className: 'home-totals',
    text: `⭐ ${totalStars}   •   0 pkt`
  });
  const header = el('div', { className: 'home-header' }, [
    el('span', { className: 'home-avatar', text: profile.avatar }),
    el('div', { className: 'home-greeting' }, [
      el('h1', { className: 'screen-title', text: `Cześć, ${profile.name}!` }),
      totalsEl
    ])
  ]);
  container.appendChild(header);

  container.appendChild(
    el('p', { className: 'home-prompt', text: 'Czego chcesz się dziś nauczyć?' })
  );

  const grid = el('div', { className: 'tile-grid' });
  for (const tile of TILES) {
    const subtitle = tile.module != null ? `⭐ ${starsByModule[tile.module] || 0}` : null;
    const isProgress = tile.module == null;
    grid.appendChild(
      el('button', {
        className: `tile touch-target${isProgress ? ' tile--progress' : ''}`,
        type: 'button',
        style: { '--tile-accent': tile.color },
        onClick: () => {
          if (tile.module != null) onOpenModule(tile.module);
          else onOpenProgress();
        }
      }, [
        el('span', { className: 'tile-emoji', text: tile.emoji }),
        el('span', { className: 'tile-title', text: tile.title }),
        subtitle ? el('span', { className: 'tile-subtitle', text: subtitle }) : null
      ])
    );
  }
  container.appendChild(grid);

  // Animated count-up for total points (guarded by prefers-reduced-motion).
  animatePoints(totalsEl, totalStars, totalPoints);

  container.appendChild(
    el('button', {
      className: 'big-button big-button--secondary touch-target',
      type: 'button',
      text: '🔄 Zmień profil',
      onClick: onSwitchProfile
    })
  );

  root.appendChild(container);
}

/**
 * Count the points up from 0 to `points`, then add a tiny bounce. Falls back to the
 * final value immediately when reduced motion is preferred or the target is 0.
 */
function animatePoints(target, stars, points) {
  const setLabel = (n) => {
    target.textContent = `⭐ ${stars}   •   ${n} pkt`;
  };
  const prefersReduced =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReduced || points <= 0 || typeof requestAnimationFrame !== 'function') {
    setLabel(points);
    return;
  }

  const duration = 700;
  const startAt = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  function step(now) {
    const elapsed = now - startAt;
    const t = Math.min(1, elapsed / duration);
    const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
    setLabel(Math.round(eased * points));
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      setLabel(points);
      target.classList.add('anim-count-up');
    }
  }
  requestAnimationFrame(step);
}
