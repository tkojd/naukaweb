// Profile picker + creator screen. Mirrors the Android ProfileScreen: list existing
// learner profiles as large tappable cards, or a create-form (imię + emoji avatar
// chooser). Selecting/creating persists the active profile and routes home.

import { el, clear } from './dom.js';
import * as storage from '../data/storage.js';

/** Emoji avatars offered to new profiles (child-friendly animals). */
const AVATARS = ['🐱', '🐶', '🐰', '🦊', '🐻', '🐼', '🐨', '🦁', '🐯', '🐸', '🐵', '🐷', '🐮', '🐔', '🦄'];

/**
 * Render the profile screen into `root`.
 * @param {HTMLElement} root
 * @param {{onProfileReady:Function}} handlers
 */
export function renderProfileScreen(root, { onProfileReady }) {
  clear(root);
  const profiles = storage.listProfiles();
  let creating = profiles.length === 0;

  const container = el('section', { className: 'screen screen--profile' });
  root.appendChild(container);

  function draw() {
    clear(container);
    container.appendChild(el('h1', { className: 'screen-title', text: 'Kto się dziś uczy?' }));

    if (creating) {
      container.appendChild(buildCreateForm(onProfileReady));
    } else {
      const list = el('div', { className: 'profile-list' });
      for (const profile of storage.listProfiles()) {
        list.appendChild(
          el('button', {
            className: 'profile-card touch-target',
            type: 'button',
            onClick: () => {
              storage.setActiveProfileId(profile.id);
              onProfileReady();
            }
          }, [
            el('span', { className: 'profile-avatar', text: profile.avatar }),
            el('span', { className: 'profile-name', text: profile.name })
          ])
        );
      }
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
      onClick: () => {
        selectedAvatar = glyph;
        buttons.forEach((b) => b.classList.toggle('avatar-choice--selected', b === btn));
      }
    });
    if (glyph === selectedAvatar) btn.classList.add('avatar-choice--selected');
    buttons.push(btn);
    grid.appendChild(btn);
  }
  wrap.appendChild(grid);

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
        const profile = storage.createProfile(nameInput.value, selectedAvatar);
        storage.setActiveProfileId(profile.id);
        onProfileReady();
      }
    })
  );

  return wrap;
}
