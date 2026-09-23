// Worksheet / sprawdzian generator screen (a parent/teacher tool).
//
// Two parts:
//   1. A scope-selection form (module, category, age level, number of questions,
//      "include answer key" checkbox) built entirely with el().
//   2. On "Generuj", the pure buildWorksheet() engine produces a plain data
//      structure that we render into a print-friendly DOM section, with a
//      "Drukuj" button that calls window.print().
//
// Screen styling reuses the app's design language (tokens, 3D buttons, focus);
// the @media print rules in styles.css switch the printed output to clean B/W.
// All DOM is created via el() - never innerHTML on dynamic data.

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
  { value: '', label: 'Wszystkie poziomy' },
  { value: AGE_LEVELS.EARLY, label: '4-6 lat' },
  { value: AGE_LEVELS.LATE, label: '7-10 lat' }
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
      text: 'Ułóż sprawdzian do wydrukowania. Wybierz zakres, a następnie wydrukuj arkusz.'
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

  // Output area where the generated worksheet is rendered.
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

  // --- Drukuj action (hidden when printing) --------------------------------
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

  // --- Header ---------------------------------------------------------------
  const header = el('header', { className: 'worksheet-header' }, [
    el('h2', { className: 'worksheet-title', text: data.title }),
    el('div', { className: 'worksheet-meta' }, [
      el('span', { className: 'worksheet-meta-item', text: 'Imię: __________________' }),
      el('span', {
        className: 'worksheet-meta-item',
        text: `Data: ${today()}`
      }),
      data.meta.levelLabel
        ? el('span', { className: 'worksheet-meta-item', text: `Poziom: ${data.meta.levelLabel}` })
        : null,
      // Be honest when a requested age band/category could not be enforced (the
      // pool would have been empty), so the sheet does not misrepresent its scope.
      data.meta.scopeWidened
        ? el('span', {
            className: 'worksheet-meta-item worksheet-meta-note',
            text: 'Zakres poszerzony (wszystkie poziomy)'
          })
        : null
    ])
  ]);
  sheet.appendChild(header);

  // --- Exercises ------------------------------------------------------------
  const list = el('ol', { className: 'worksheet-exercises' });
  for (const ex of data.exercises) {
    list.appendChild(renderExercise(ex));
  }
  sheet.appendChild(list);

  // --- Answer key (optional) ------------------------------------------------
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
  const item = el('li', { className: `worksheet-exercise worksheet-exercise--${ex.kind}`, value: String(ex.number) });

  if (ex.instructions) {
    item.appendChild(el('p', { className: 'worksheet-instructions', text: ex.instructions }));
  }
  item.appendChild(el('p', { className: 'worksheet-prompt', text: ex.prompt }));

  switch (ex.kind) {
    case 'choose':
    case 'truefalse': {
      const row = el('div', { className: 'worksheet-choices' });
      for (const choice of ex.choices || []) {
        row.appendChild(el('span', { className: 'worksheet-choice', text: choice }));
      }
      item.appendChild(row);
      break;
    }
    case 'match': {
      const cols = ex.choices || { left: [], right: [] };
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
    case 'count':
    default: {
      // A visible answer line the child writes on. 'count'/'fill'/'translate'
      // already print a blank in the prompt; add a generous writing line too.
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
