// Worksheet / sprawdzian generator screen (a parent/teacher tool).
//
// Two parts:
//   1. A scope-selection form (module, category, age level, number of questions,
//      "include answer key" checkbox) built entirely with el().
//   2. On "Generuj", the pure buildWorksheet() engine produces a plain data
//      structure that we render into a print-friendly DOM section, with a
//      "Drukuj" button that calls window.print().
//
// The printed sheet mirrors the on-screen lesson methodology (docs/METODYKA.md):
//   * EARLY sheets are solvable WITHOUT the CHILD reading: the instruction line is
//     read aloud by the adult and the child answers by circling PICTURES, counting
//     QUANTITIES or picking COLOUR swatches. No colour-name-word matching, no
//     digit==digit, no answer-revealing picture in the header.
//   * LATE sheets are for readers: written choose / match / translate / fill.
//
// All DOM is created via el() - never innerHTML on dynamic data. Asset paths are
// RELATIVE (the app is served under /naukaweb/); an <img> falls back to the emoji
// when no curated icon exists.

import { el, clear } from './dom.js';
import { LEARNING_MODULES, AGE_LEVELS } from '../logic/models.js';
import { categoriesFor } from '../logic/content.js';
import { buildWorksheet, WORKSHEET_MODULE_LABELS } from '../logic/worksheet.js';

const MODULE_OPTIONS = [
  { value: LEARNING_MODULES.COLORS, label: '🎨 Kolory' },
  { value: LEARNING_MODULES.POLISH_LETTERS, label: '🔤 Litery' },
  { value: LEARNING_MODULES.NUMBERS, label: '🔢 Cyfry' },
  { value: LEARNING_MODULES.ENGLISH, label: '🇬🇧 Angielski' }
];

const LEVEL_OPTIONS = [
  { value: AGE_LEVELS.EARLY, label: '4-6 lat (bez czytania)' },
  { value: AGE_LEVELS.LATE, label: '7-10 lat (dla czytających)' }
];

/** Friendly Polish labels for known category ids (fallback: the raw id). */
const CATEGORY_LABELS = {
  animals: 'Zwierzęta',
  colors: 'Kolory',
  numbers: 'Liczby',
  family: 'Rodzina',
  food: 'Jedzenie',
  body: 'Ciało',
  clothes: 'Ubrania',
  house: 'Dom',
  nature: 'Przyroda',
  transport: 'Transport',
  verbs: 'Czasowniki',
  adjectives: 'Przymiotniki',
  greetings: 'Powitania',
  phrases: 'Zwroty',
  sentences: 'Zdania',
  letters: 'Litery'
};

function categoryLabel(id) {
  return CATEGORY_LABELS[id] || id;
}

/** A labelled form field wrapper. */
function field(labelText, controlEl, id) {
  return el('div', { className: 'worksheet-field' }, [
    el('label', { className: 'worksheet-label', for: id, text: labelText }),
    controlEl
  ]);
}

/**
 * A picture cell: a real <img> (relative curated icon) with the emoji as an
 * accessible/print fallback, so the child sees a clear picture and print still
 * shows something when the SVG is unavailable.
 */
function pictureCell(className, { emoji, imageSrc }) {
  const children = [];
  if (imageSrc) {
    children.push(
      el('img', {
        className: 'worksheet-pic-img',
        src: imageSrc,
        alt: '',
        width: '56',
        height: '56',
        loading: 'lazy'
      })
    );
  }
  // Emoji fallback (also visible in print where SVGs may not render).
  children.push(el('span', { className: 'worksheet-pic-emoji', text: emoji || '' }));
  return el('span', { className }, children);
}

/**
 * @param {HTMLElement} root
 * @param {{onBack:Function}} handlers
 */
export function renderWorksheetScreen(root, { onBack }) {
  clear(root);

  const container = el('section', { className: 'screen screen--worksheet anim-fade-slide-in' });
  root.appendChild(container);

  container.appendChild(el('h1', { className: 'screen-title', text: '🖨️ Arkusze do druku' }));
  container.appendChild(
    el('p', {
      className: 'worksheet-intro',
      text: 'Ułóż sprawdzian do wydrukowania. Wybierz zakres, a następnie wydrukuj arkusz. Arkusze dla 4-6 lat są do rozwiązania bez czytania - polecenie przeczyta dorosły.'
    })
  );

  // --- form controls --------------------------------------------------------
  const moduleSelect = el(
    'select',
    { id: 'ws-module', className: 'worksheet-select touch-target' },
    MODULE_OPTIONS.map((o) => el('option', { value: o.value, text: o.label }))
  );

  const categorySelect = el('select', {
    id: 'ws-category',
    className: 'worksheet-select touch-target'
  });

  const levelSelect = el(
    'select',
    { id: 'ws-level', className: 'worksheet-select touch-target' },
    LEVEL_OPTIONS.map((o) => el('option', { value: o.value, text: o.label }))
  );

  const countInput = el('input', {
    id: 'ws-count',
    className: 'worksheet-input touch-target',
    type: 'number',
    min: '1',
    max: '30',
    value: '10',
    inputmode: 'numeric'
  });

  const answerKeyCheckbox = el('input', {
    id: 'ws-answerkey',
    className: 'worksheet-checkbox',
    type: 'checkbox'
  });

  /** Repopulate the category dropdown for the currently selected module. */
  function refreshCategories() {
    clear(categorySelect);
    categorySelect.appendChild(el('option', { value: '', text: 'Wszystkie kategorie' }));
    for (const cat of categoriesFor(moduleSelect.value)) {
      categorySelect.appendChild(el('option', { value: cat, text: categoryLabel(cat) }));
    }
  }
  moduleSelect.addEventListener('change', refreshCategories);
  refreshCategories();

  const form = el('div', { className: 'worksheet-form' }, [
    field('Moduł', moduleSelect, 'ws-module'),
    field('Kategoria', categorySelect, 'ws-category'),
    field('Poziom (wiek)', levelSelect, 'ws-level'),
    field('Liczba pytań', countInput, 'ws-count'),
    el('div', { className: 'worksheet-field worksheet-field--check' }, [
      answerKeyCheckbox,
      el('label', {
        className: 'worksheet-label worksheet-label--inline',
        for: 'ws-answerkey',
        text: 'Dołącz klucz odpowiedzi'
      })
    ])
  ]);
  container.appendChild(form);

  const output = el('div', { className: 'worksheet-output' });

  const actions = el('div', { className: 'worksheet-actions' }, [
    el('button', {
      className: 'big-button big-button--go touch-target',
      type: 'button',
      text: '📝 Generuj arkusz',
      onClick: () => {
        const count = Math.min(30, Math.max(1, parseInt(countInput.value, 10) || 10));
        countInput.value = String(count);
        const data = buildWorksheet({
          module: moduleSelect.value,
          category: categorySelect.value || undefined,
          level: levelSelect.value || undefined,
          questionCount: count,
          includeAnswerKey: answerKeyCheckbox.checked,
          rng: Math.random
        });
        renderWorksheet(output, data, answerKeyCheckbox.checked);
      }
    }),
    el('button', {
      className: 'big-button big-button--secondary touch-target',
      type: 'button',
      text: '⬅ Wróć',
      onClick: onBack
    })
  ]);
  container.appendChild(actions);
  container.appendChild(output);
}

/**
 * Render a worksheet data structure into a print-friendly section.
 * @param {HTMLElement} host
 * @param {object} data the result of buildWorksheet.
 * @param {boolean} withKey whether the answer key should be shown/printed.
 */
function renderWorksheet(host, data, withKey) {
  clear(host);

  const sheet = el('article', {
    className: `worksheet-sheet${withKey ? ' worksheet-sheet--with-key' : ''}`
  });

  host.appendChild(
    el('div', { className: 'worksheet-print-bar' }, [
      el('button', {
        className: 'big-button big-button--go touch-target',
        type: 'button',
        text: '🖨️ Drukuj',
        onClick: () => {
          if (typeof window !== 'undefined' && typeof window.print === 'function') {
            window.print();
          }
        }
      })
    ])
  );

  const isEarly = data.meta.generationLevel === AGE_LEVELS.EARLY;
  const header = el('header', { className: 'worksheet-header' }, [
    el('h2', { className: 'worksheet-title', text: data.title }),
    el('div', { className: 'worksheet-meta' }, [
      el('span', { className: 'worksheet-meta-item', text: 'Imię: __________________' }),
      el('span', { className: 'worksheet-meta-item', text: `Data: ${today()}` }),
      data.meta.levelLabel
        ? el('span', { className: 'worksheet-meta-item', text: `Poziom: ${data.meta.levelLabel}` })
        : null,
      // For a non-reading sheet, tell the adult to read the instructions aloud.
      isEarly
        ? el('span', {
            className: 'worksheet-meta-item worksheet-meta-note',
            text: 'Polecenia czyta dorosły; dziecko odpowiada, wskazując obrazek, kolor lub liczbę.'
          })
        : null,
      data.meta.scopeWidened
        ? el('span', {
            className: 'worksheet-meta-item worksheet-meta-note',
            text: 'Zakres poszerzony (wszystkie poziomy)'
          })
        : null
    ])
  ]);
  sheet.appendChild(header);

  const list = el('ol', { className: 'worksheet-exercises' });
  for (const ex of data.exercises) {
    list.appendChild(renderExercise(ex));
  }
  sheet.appendChild(list);

  if (withKey && data.answerKey && data.answerKey.length > 0) {
    const keySection = el('section', { className: 'worksheet-answer-key' }, [
      el('h3', { className: 'worksheet-answer-key-title', text: 'Klucz odpowiedzi' }),
      el(
        'ol',
        { className: 'worksheet-answer-key-list' },
        data.answerKey.map((k) =>
          el('li', { className: 'worksheet-answer-key-item', value: String(k.number), text: k.answer })
        )
      )
    ]);
    sheet.appendChild(keySection);
  }

  host.appendChild(sheet);
}

/** Render a single exercise <li> with answer space appropriate to its kind. */
function renderExercise(ex) {
  const item = el('li', {
    className: `worksheet-exercise worksheet-exercise--${ex.kind}`,
    value: String(ex.number)
  });

  if (ex.instructions) {
    item.appendChild(el('p', { className: 'worksheet-instructions', text: ex.instructions }));
  }

  switch (ex.kind) {
    // --- EARLY (no reading) ---
    case 'count': {
      // A row of counting glyphs + a blank box for the digit. No target digit is
      // ever printed in the prompt (rule C1).
      const row = el(
        'div',
        { className: 'worksheet-glyph-row' },
        (ex.glyphs || []).map((g) => el('span', { className: 'worksheet-count-glyph', text: g }))
      );
      item.appendChild(row);
      item.appendChild(el('div', { className: 'worksheet-answer-box', 'aria-hidden': 'true' }));
      break;
    }
    case 'find-color': {
      // Colour swatches to circle; the target colour name is spoken by the adult
      // (in the instruction), never printed as the answer.
      const row = el(
        'div',
        { className: 'worksheet-choices worksheet-choices--swatch' },
        (ex.swatches || []).map((s) =>
          el('span', {
            className: 'worksheet-swatch',
            style: { backgroundColor: s.colorHex },
            'aria-hidden': 'true'
          })
        )
      );
      item.appendChild(row);
      break;
    }
    case 'first-letter': {
      // The example-word picture (no letter shown) + letter glyphs to circle.
      item.appendChild(
        pictureCell('worksheet-prompt-picture', { emoji: ex.promptEmoji, imageSrc: ex.promptImageSrc })
      );
      const row = el(
        'div',
        { className: 'worksheet-choices worksheet-choices--glyph' },
        (ex.letterChoices || []).map((l) =>
          el('span', { className: 'worksheet-glyph-choice', text: l.glyph })
        )
      );
      item.appendChild(row);
      break;
    }
    case 'english-picture': {
      // Meaning pictures to circle; the English word is read aloud by the adult
      // (in the instruction). The header carries NO picture (rule C2).
      const row = el(
        'div',
        { className: 'worksheet-choices worksheet-choices--picture' },
        (ex.pictureChoices || []).map((p) =>
          pictureCell('worksheet-pic-choice', { emoji: p.emoji, imageSrc: p.imageSrc })
        )
      );
      item.appendChild(row);
      break;
    }

    // --- LATE (readers) ---
    case 'choose':
    case 'truefalse': {
      if (ex.promptText) {
        const prompt = el('p', { className: 'worksheet-prompt' });
        if (ex.promptEmoji) {
          prompt.appendChild(el('span', { className: 'worksheet-prompt-emoji', text: ex.promptEmoji }));
        }
        prompt.appendChild(document.createTextNode(ex.promptText));
        item.appendChild(prompt);
      }
      const row = el('div', { className: 'worksheet-choices' });
      for (const choice of ex.choices || []) {
        row.appendChild(el('span', { className: 'worksheet-choice', text: choice }));
      }
      item.appendChild(row);
      break;
    }
    case 'match': {
      const cols = ex.matchColumns || { left: [], right: [] };
      const board = el('div', { className: 'worksheet-match' }, [
        el(
          'ul',
          { className: 'worksheet-match-col' },
          (cols.left || []).map((t) => el('li', { className: 'worksheet-match-cell', text: t }))
        ),
        el(
          'ul',
          { className: 'worksheet-match-col' },
          (cols.right || []).map((t) => el('li', { className: 'worksheet-match-cell', text: t }))
        )
      ]);
      item.appendChild(board);
      break;
    }
    case 'fill':
    case 'translate':
    default: {
      if (ex.promptText) {
        const prompt = el('p', { className: 'worksheet-prompt' });
        if (ex.promptEmoji) {
          prompt.appendChild(el('span', { className: 'worksheet-prompt-emoji', text: ex.promptEmoji }));
        }
        prompt.appendChild(document.createTextNode(ex.promptText));
        item.appendChild(prompt);
      }
      item.appendChild(el('div', { className: 'worksheet-answer-line', 'aria-hidden': 'true' }));
      break;
    }
  }

  return item;
}

/** Local date string dd.mm.yyyy for the printable header (view-side only). */
function today() {
  try {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
  } catch {
    return '__________';
  }
}

export { WORKSHEET_MODULE_LABELS };
