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

/** Per-module accent used to tint the progress cards. */
const MODULE_ACCENTS = {
  [LEARNING_MODULES.COLORS]: '#FF6B6B',
  [LEARNING_MODULES.POLISH_LETTERS]: '#4D96FF',
  [LEARNING_MODULES.NUMBERS]: '#6BCB77',
  [LEARNING_MODULES.ENGLISH]: '#FFA45B'
};

const MODULE_ORDER = [
  LEARNING_MODULES.COLORS,
  LEARNING_MODULES.POLISH_LETTERS,
  LEARNING_MODULES.NUMBERS,
  LEARNING_MODULES.ENGLISH
];

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * @param {HTMLElement} root
 * @param {{profileId:string, onBack:Function}} params
 */
export function renderProgressScreen(root, { profileId, onBack }) {
  clear(root);
  const reduced = prefersReducedMotion();
  const container = el('section', {
    className: reduced ? 'screen screen--progress' : 'screen screen--progress anim-fade-slide-in'
  });
  root.appendChild(container);
  let stagger = 0; // running entrance delay for a gentle staggered reveal

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

  /** Apply a small staggered fade/slide-in delay to an entrance node. */
  const staged = (node) => {
    if (!reduced) {
      node.classList.add('anim-fade-slide-in');
      node.style.animationDelay = `${stagger}s`;
      stagger += 0.07;
    }
    return node;
  };

  container.appendChild(el('h1', { className: 'screen-title', text: 'Twoje postępy' }));

  const totalsBanner = el('div', { className: 'progress-banner' }, [
    el('div', { className: 'progress-banner-stat' }, [
      el('span', { className: 'progress-banner-value', text: `⭐ ${totalStars}` }),
      el('span', { className: 'progress-banner-label', text: 'gwiazdek' })
    ]),
    el('div', { className: 'progress-banner-stat' }, [
      el('span', { className: 'progress-banner-value', text: `${totalPoints}` }),
      el('span', { className: 'progress-banner-label', text: 'punktów' })
    ])
  ]);
  container.appendChild(staged(totalsBanner));

  const list = el('div', { className: 'progress-list' });
  for (const stat of moduleStats) {
    const accent = MODULE_ACCENTS[stat.module] || '#4D96FF';
    list.appendChild(
      staged(
        el('div', { className: 'module-card', style: { '--card-accent': accent } }, [
          el('div', { className: 'module-card-info' }, [
            el('span', { className: 'module-card-title', text: MODULE_TITLES[stat.module] }),
            el('span', {
              className: 'module-card-mastered',
              text: `Opanowane ${stat.mastered}/${stat.total}`
            })
          ]),
          buildStarRow(stat.stars)
        ])
      )
    );
  }
  container.appendChild(list);

  container.appendChild(el('h2', { className: 'badges-heading', text: 'Odznaki' }));
  const earned = new Set(storage.getEarnedBadgeIds(profileId));
  const badgeGrid = el('div', { className: 'badge-grid' });
  for (const badge of BADGES) {
    const isEarned = earned.has(badge.id);
    badgeGrid.appendChild(
      staged(
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
      )
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
