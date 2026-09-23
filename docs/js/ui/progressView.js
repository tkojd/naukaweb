// Progress + badges screen. Mirrors the Android ProgressScreen: total stars/points,
// per-module progress (mastered count + stars), and every badge shown as earned or
// still locked, with encouraging copy. No score is framed negatively.

import { el, clear } from './dom.js';
import { LEARNING_MODULES } from '../logic/models.js';
import { BADGES } from '../logic/gamification.js';
import { itemsFor } from '../logic/content.js';
import { MASTERED_BOX } from '../logic/gamification.js';
import * as storage from '../data/storage.js';

const MODULE_TITLES = {
  [LEARNING_MODULES.COLORS]: '🎨 Kolory',
  [LEARNING_MODULES.POLISH_LETTERS]: '🔤 Litery',
  [LEARNING_MODULES.NUMBERS]: '🔢 Cyfry',
  [LEARNING_MODULES.ENGLISH]: '🇬🇧 Angielski'
};

const MODULE_ORDER = [
  LEARNING_MODULES.COLORS,
  LEARNING_MODULES.POLISH_LETTERS,
  LEARNING_MODULES.NUMBERS,
  LEARNING_MODULES.ENGLISH
];

/**
 * @param {HTMLElement} root
 * @param {{profileId:string, onBack:Function}} params
 */
export function renderProgressScreen(root, { profileId, onBack }) {
  clear(root);
  const container = el('section', { className: 'screen screen--progress' });
  root.appendChild(container);

  const reviewStates = storage.getAllReviewStates(profileId);
  const masteredByModule = {};
  for (const module of MODULE_ORDER) {
    masteredByModule[module] = reviewStates.filter(
      (s) => s.moduleType === module && s.box >= MASTERED_BOX
    ).length;
  }

  let totalStars = 0;
  let totalPoints = 0;
  const moduleStats = MODULE_ORDER.map((module) => {
    const mp = storage.getModuleProgress(profileId, module);
    totalStars += mp?.stars || 0;
    totalPoints += mp?.totalPoints || 0;
    return {
      module,
      stars: mp?.stars || 0,
      mastered: masteredByModule[module],
      total: itemsFor(module).length
    };
  });

  container.appendChild(el('h1', { className: 'screen-title', text: 'Twoje postępy' }));
  container.appendChild(
    el('p', {
      className: 'progress-totals',
      text: `⭐ ${totalStars} gwiazdek   •   ${totalPoints} punktów`
    })
  );

  const list = el('div', { className: 'progress-list' });
  for (const stat of moduleStats) {
    list.appendChild(
      el('div', { className: 'module-card' }, [
        el('div', { className: 'module-card-info' }, [
          el('span', { className: 'module-card-title', text: MODULE_TITLES[stat.module] }),
          el('span', {
            className: 'module-card-mastered',
            text: `Opanowane ${stat.mastered}/${stat.total}`
          })
        ]),
        buildStarRow(stat.stars)
      ])
    );
  }
  container.appendChild(list);

  container.appendChild(el('h2', { className: 'badges-heading', text: 'Odznaki' }));
  const earned = new Set(storage.getEarnedBadgeIds(profileId));
  const badgeGrid = el('div', { className: 'badge-grid' });
  for (const badge of BADGES) {
    const isEarned = earned.has(badge.id);
    badgeGrid.appendChild(
      el('div', { className: `badge-card ${isEarned ? 'badge-card--earned' : 'badge-card--locked'}` }, [
        el('span', { className: 'badge-icon', text: isEarned ? '🏅' : '🔒' }),
        el('div', { className: 'badge-info' }, [
          el('span', { className: 'badge-title', text: badge.title }),
          el('span', {
            className: 'badge-desc',
            text: isEarned ? badge.description : 'Jeszcze chwila i ją zdobędziesz!'
          })
        ])
      ])
    );
  }
  container.appendChild(badgeGrid);

  container.appendChild(
    el('button', {
      className: 'big-button big-button--secondary touch-target',
      type: 'button',
      text: '⬅ Wróć',
      onClick: onBack
    })
  );
}

function buildStarRow(count) {
  const row = el('div', { className: 'star-row' });
  for (let i = 0; i < 3; i++) {
    row.appendChild(el('span', { className: 'star', text: i < count ? '⭐' : '☆' }));
  }
  return row;
}
