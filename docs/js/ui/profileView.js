// Profile picker + creator screen. Mirrors the Android ProfileScreen: list existing
// learner profiles as large tappable cards, or a create-form (imię + emoji avatar
// chooser). Selecting/creating persists the active profile and routes home.

import { el, clear } from './dom.js';
import { AGE_LEVELS } from '../logic/models.js';
import * as storage from '../data/storage.js';
import { playTap } from '../audio/soundEffects.js';

/** Age-band choices offered on the create form (Polish labels). */
const AGE_BANDS = [
  { level: AGE_LEVELS.EARLY, label: '4-6 lat', emoji: '🧸' },
  { level: AGE_LEVELS.LATE, label: '7-10 lat', emoji: '🎒' }
];

/** Emoji avatars offered to new profiles (child-friendly animals). */
const AVATARS = ['🐱', '🐶', '🐰', '🦊', '🐻', '🐼', '🐨', '🦁', '🐯', '🐸', '🐵', '🐷', '🐮', '🐔', '🦄'];

/** A soft accent per profile card, cycled so the list stays colorful. */
const CARD_ACCENTS = ['#FF6B6B', '#4D96FF', '#6BCB77', '#FFA45B', '#B983FF'];

/**
 * Render the profile screen into `root`.
 * @param {HTMLElement} root
 * @param {{onProfileReady:Function}} handlers
 */
export function renderProfileScreen(root, { onProfileReady }) {
  clear(root);
  const profiles = storage.listProfiles();
  let creating = profiles.length === 0;

  const container = el('section', { className: 'screen screen--profile anim-fade-slide-in' });
  root.appendChild(container);

  function draw() {
    clear(container);
    container.appendChild(
      el('h1', { className: 'screen-title hero-title', text: 'Kto się dziś uczy?' })
    );

    if (creating) {
      container.appendChild(buildCreateForm(onProfileReady));
    } else {
      const list = el('div', { className: 'profile-list' });
      storage.listProfiles().forEach((profile, i) => {
        const accent = CARD_ACCENTS[i % CARD_ACCENTS.length];
        list.appendChild(
          el('button', {
            className: 'profile-card touch-target',
            type: 'button',
            style: { '--card-accent': accent },
            onClick: () => {
              playTap(); // also resumes the AudioContext on this real user gesture
              storage.setActiveProfileId(profile.id);
              onProfileReady();
            }
          }, [
            el('span', { className: 'profile-avatar', text: profile.avatar }),
            el('span', { className: 'profile-name', text: profile.name })
          ])
        );
      });
      container.appendChild(list);
      container.appendChild(
        el('button', {
          className: 'big-button big-button--secondary touch-target',
          type: 'button',
          text: '➕ Nowy profil',
          onClick: () => {
            creating = true;
            draw();
          }
        })
      );
    }
  }

  draw();
}

function buildCreateForm(onProfileReady) {
  const wrap = el('div', { className: 'create-form' });
  wrap.appendChild(
    el('p', { className: 'create-hint', text: 'Wybierz zwierzątko i wpisz imię' })
  );

  let selectedAvatar = AVATARS[0];
  const grid = el('div', { className: 'avatar-grid' });
  const buttons = [];
  for (const glyph of AVATARS) {
    const btn = el('button', {
      className: 'avatar-choice touch-target',
      type: 'button',
      text: glyph,
      'aria-pressed': 'false',
      onClick: () => {
        selectedAvatar = glyph;
        buttons.forEach((b) => {
          const on = b === btn;
          b.classList.toggle('avatar-choice--selected', on);
          b.setAttribute('aria-pressed', String(on));
        });
      }
    });
    if (glyph === selectedAvatar) {
      btn.classList.add('avatar-choice--selected');
      btn.setAttribute('aria-pressed', 'true');
    }
    buttons.push(btn);
    grid.appendChild(btn);
  }
  wrap.appendChild(grid);

  // --- age band selector -----------------------------------------------------
  wrap.appendChild(
    el('p', { className: 'create-hint', text: 'Ile masz lat?' })
  );

  let selectedLevel = AGE_BANDS[0].level;
  const bandRow = el('div', { className: 'age-band-row', role: 'group', 'aria-label': 'Wiek' });
  const bandButtons = [];
  for (const band of AGE_BANDS) {
    const btn = el('button', {
      className: 'age-band touch-target',
      type: 'button',
      'aria-pressed': String(band.level === selectedLevel),
      onClick: () => {
        selectedLevel = band.level;
        bandButtons.forEach((b) => {
          const on = b === btn;
          b.classList.toggle('age-band--selected', on);
          b.setAttribute('aria-pressed', String(on));
        });
      }
    }, [
      el('span', { className: 'age-band-emoji', text: band.emoji }),
      el('span', { className: 'age-band-label', text: band.label })
    ]);
    if (band.level === selectedLevel) btn.classList.add('age-band--selected');
    bandButtons.push(btn);
    bandRow.appendChild(btn);
  }
  wrap.appendChild(bandRow);

  const nameInput = el('input', {
    className: 'name-input',
    type: 'text',
    placeholder: 'Imię',
    maxlength: '20',
    'aria-label': 'Imię'
  });
  wrap.appendChild(nameInput);

  wrap.appendChild(
    el('button', {
      className: 'big-button big-button--go touch-target',
      type: 'button',
      text: 'Zaczynamy! 🚀',
      onClick: () => {
        playTap(); // resumes the AudioContext on a real user gesture
        const profile = storage.createProfile(nameInput.value, selectedAvatar, selectedLevel);
        storage.setActiveProfileId(profile.id);
        onProfileReady();
      }
    })
  );

  return wrap;
}
