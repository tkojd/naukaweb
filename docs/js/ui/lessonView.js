// One self-paced lesson used by every module. Ports LessonViewModel + LessonScreen
// and now composes each lesson through the pure task-type engine (taskTypes.buildLesson)
// driven by the active profile's age level. Every question is a normalized spec that we
// render by dispatching on spec.type; each renderer builds real DOM via el().
//
// Feedback stays positive-only: '🎉 Brawo!' + advance on correct, a gentle
// '🙂 Spróbuj jeszcze raz' (same question, no points, no penalty) on wrong, with the
// correct-answer pop + sparkles + playCorrect(), badge pulse + playBadge(), and the
// wrong-answer nudge. Every task type records its answer through progressService with
// spec.item so Leitner/points/streak/badges keep working.

import { el, clear, shuffle } from './dom.js';
import { LEARNING_MODULES } from '../logic/models.js';
import { itemsForLevel } from '../logic/content.js';
import { buildLesson, TASK_TYPES, isSpellingCorrect } from '../logic/taskTypes.js';
import { starsForLesson } from '../logic/gamification.js';
import * as progressService from '../data/progressService.js';
import * as storage from '../data/storage.js';
import { speakPolish, speakEnglish, stop as stopSpeech } from '../audio/speech.js';
import { playCorrect, playBadge } from '../audio/soundEffects.js';

const QUESTIONS_PER_LESSON = 6;

const MODULE_TITLES = {
  [LEARNING_MODULES.COLORS]: 'Kolory',
  [LEARNING_MODULES.POLISH_LETTERS]: 'Litery',
  [LEARNING_MODULES.NUMBERS]: 'Cyfry',
  [LEARNING_MODULES.ENGLISH]: 'Angielski'
};

/** Per-module accent used to theme the lesson screen. */
const MODULE_ACCENTS = {
  [LEARNING_MODULES.COLORS]: '#FF6B6B',
  [LEARNING_MODULES.POLISH_LETTERS]: '#4D96FF',
  [LEARNING_MODULES.NUMBERS]: '#6BCB77',
  [LEARNING_MODULES.ENGLISH]: '#FFA45B'
};

/** True when the user asked the OS/browser to reduce motion. */
function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * @param {HTMLElement} root
 * @param {{module:string, profileId:string, onBack:Function}} params
 */
export function renderLessonScreen(root, { module, profileId, onBack }) {
  clear(root);
  stopSpeech();

  const profile = storage.getProfile(profileId);
  const level = storage.profileLevel(profile);
  // Age-appropriate items for this module; fall back to the full module set when a
  // level yields nothing (keeps every module playable regardless of content tags).
  let levelItems = itemsForLevel(module, level);
  if (!levelItems || levelItems.length === 0) {
    levelItems = itemsForLevel(module, 'EARLY').concat(itemsForLevel(module, 'LATE'));
  }

  const accent = MODULE_ACCENTS[module] || '#4D96FF';
  const container = el('section', {
    className: 'screen screen--lesson',
    style: { '--lesson-accent': accent }
  });
  root.appendChild(container);

  // --- lesson state ---
  let queue = [];
  let index = 0;
  let correctCount = 0;
  let points = 0;
  let answered = false; // true once the current question is answered correctly

  function buildQueue() {
    // Compose a lesson of normalized specs via the pure engine. The engine handles
    // the age-appropriate task-type mix; we simply render each spec.
    const specs = buildLesson({
      module,
      level,
      availableItems: levelItems,
      questionCount: QUESTIONS_PER_LESSON
    });
    return specs;
  }

  function start() {
    queue = buildQueue();
    index = 0;
    correctCount = 0;
    points = 0;
    presentCurrent();
  }

  function presentCurrent() {
    answered = false;
    if (index >= queue.length) {
      finishLesson();
      return;
    }
    drawQuestion(queue[index]);
  }

  function drawQuestion(spec) {
    clear(container);
    container.appendChild(el('h1', { className: 'screen-title', text: MODULE_TITLES[module] }));
    container.appendChild(
      el('p', {
        className: 'lesson-counter',
        text: `Pytanie ${index + 1} / ${queue.length}`
      })
    );

    // Animated progress bar tied to the question counter (fills as questions advance).
    const total = Math.max(queue.length, 1);
    const pct = Math.round(((index + 1) / total) * 100);
    const bar = el('div', {
      className: 'lesson-progress',
      role: 'progressbar',
      'aria-valuemin': '0',
      'aria-valuemax': String(queue.length),
      'aria-valuenow': String(index + 1),
      'aria-label': `Pytanie ${index + 1} z ${queue.length}`
    }, [el('div', { className: 'lesson-progress-fill' })]);
    container.appendChild(bar);
    const fill = bar.firstChild;
    if (prefersReducedMotion()) {
      fill.style.width = `${pct}%`;
    } else {
      const prevPct = Math.round((index / total) * 100);
      fill.style.width = `${prevPct}%`;
      requestAnimationFrame(() => {
        fill.style.width = `${pct}%`;
      });
    }

    // Fade/slide the question block in on each presentCurrent.
    const questionBlock = el('div', {
      className: prefersReducedMotion() ? 'lesson-question' : 'lesson-question anim-fade-slide-in'
    });
    container.appendChild(questionBlock);
    renderSpec(questionBlock, spec);
  }

  /** Dispatch a normalized spec to its renderer. */
  function renderSpec(host, spec) {
    switch (spec.type) {
      case TASK_TYPES.LISTEN_CHOOSE:
        renderListenChoose(host, spec);
        break;
      case TASK_TYPES.MATCH_PAIRS:
        renderMatchPairs(host, spec);
        break;
      case TASK_TYPES.SPELL_WORD:
        renderSpellWord(host, spec);
        break;
      case TASK_TYPES.TRUE_FALSE:
        renderTrueFalse(host, spec);
        break;
      case TASK_TYPES.COUNT_CHOOSE:
        renderCountChoose(host, spec);
        break;
      case TASK_TYPES.WHICH_MATCHES:
      case TASK_TYPES.MULTIPLE_CHOICE:
      default:
        renderChoiceTask(host, spec);
        break;
    }
  }

  // --- shared building blocks ------------------------------------------------

  /** A feedback slot every renderer shares. */
  function feedbackSlot() {
    return el('div', { className: 'feedback-slot' });
  }

  /** A speaker button that repeats the spoken prompt for this spec. */
  function speakerButton(spec) {
    return el('div', { className: 'speaker-row' }, [
      el('button', {
        className: 'speaker-button touch-target',
        type: 'button',
        'aria-label': 'Powtórz',
        text: '🔊',
        onClick: () => speakSpec(spec)
      })
    ]);
  }

  /**
   * Record the current spec's answer and drive positive-only feedback + advance.
   * `optionEl` (optional) is nudged on a wrong tap. When correct the caller's
   * answer surface is replaced by a Dalej control (via replaceWithNext).
   */
  function resolveAnswer(spec, correct, feedback, optionEl, onCorrectCleanup) {
    if (answered) return;
    const outcome = progressService.recordAnswer(profileId, spec.item, correct, Date.now());
    if (correct) {
      answered = true;
      correctCount += 1;
      points += outcome.pointsAwarded;
      clear(feedback);
      const banner = buildFeedbackBanner(true, outcome.newlyEarnedBadges);
      feedback.appendChild(banner);

      playCorrect();
      if (!prefersReducedMotion()) banner.classList.add('anim-correct-pop');
      addSparkles(feedback);

      const newBadges = outcome.newlyEarnedBadges || [];
      if (newBadges.length > 0) {
        playBadge();
        if (!prefersReducedMotion()) {
          for (const b of banner.querySelectorAll('.feedback-badge')) {
            b.classList.add('anim-badge-pulse');
          }
        }
      }
      if (typeof onCorrectCleanup === 'function') onCorrectCleanup();
    } else {
      clear(feedback);
      feedback.appendChild(buildFeedbackBanner(false, []));
      nudge(optionEl);
    }
  }

  /** Gentle, non-alarming wrong-tap nudge (reduced-motion safe via CSS). */
  function nudge(optionEl) {
    if (!optionEl || prefersReducedMotion()) return;
    optionEl.classList.remove('answer--nudge');
    void optionEl.offsetWidth; // reflow so the animation can retrigger
    optionEl.classList.add('answer--nudge');
    optionEl.addEventListener(
      'animationend',
      () => optionEl.classList.remove('answer--nudge'),
      { once: true }
    );
  }

  /** Replace an answer surface with the Dalej (Next) control after a correct answer. */
  function appendNext(host) {
    const nextRow = el('div', { className: 'answer-grid answer-grid--done' }, [
      el('button', {
        className: 'big-button big-button--go touch-target',
        type: 'button',
        text: 'Dalej ➡',
        onClick: () => {
          index += 1;
          presentCurrent();
        }
      })
    ]);
    host.appendChild(nextRow);
  }

  // --- renderers -------------------------------------------------------------

  /**
   * MULTIPLE_CHOICE / WHICH_MATCHES: a prompt card + a grid of tappable options.
   * Keeps the classic look (color swatches for colors, letter/word tiles otherwise).
   */
  function renderChoiceTask(host, spec) {
    host.appendChild(buildPromptCard(spec));
    host.appendChild(speakerButton(spec));
    const feedback = feedbackSlot();
    host.appendChild(feedback);

    const grid = el('div', { className: 'answer-grid' });
    for (const option of spec.options) {
      grid.appendChild(buildOptionButton(spec, option, feedback, grid));
    }
    host.appendChild(grid);
    speakSpec(spec);
  }

  function buildOptionButton(spec, option, feedback, grid) {
    const isColor = spec.moduleType === LEARNING_MODULES.COLORS && option.colorHex;
    let optionEl;
    if (isColor) {
      optionEl = el('button', {
        className: 'answer answer--color touch-target',
        type: 'button',
        'aria-label': option.label,
        style: { backgroundColor: option.colorHex }
      });
    } else {
      optionEl = el('button', {
        className: 'answer touch-target',
        type: 'button'
      }, [
        option.emoji ? el('span', { className: 'answer-emoji', text: option.emoji }) : null,
        el('span', { className: 'answer-label', text: option.label })
      ]);
    }
    optionEl.addEventListener('click', () => {
      resolveAnswer(spec, option.isCorrect, feedback, optionEl, () => {
        clear(grid);
        grid.classList.add('answer-grid--done');
        grid.appendChild(
          el('button', {
            className: 'big-button big-button--go touch-target',
            type: 'button',
            text: 'Dalej ➡',
            onClick: () => {
              index += 1;
              presentCurrent();
            }
          })
        );
      });
    });
    return optionEl;
  }

  /**
   * LISTEN_CHOOSE: a large speaker card (auto-plays + repeats) and a grid of
   * tappable image/word options.
   */
  function renderListenChoose(host, spec) {
    const card = el('div', { className: 'prompt-card prompt-card--listen' }, [
      el('button', {
        className: 'listen-big-button touch-target',
        type: 'button',
        'aria-label': 'Posłuchaj',
        text: '🔊',
        onClick: () => speakSpec(spec)
      }),
      el('span', { className: 'prompt-listen-hint', text: 'Posłuchaj i wybierz' })
    ]);
    host.appendChild(card);

    const feedback = feedbackSlot();
    host.appendChild(feedback);

    const grid = el('div', { className: 'answer-grid' });
    for (const option of spec.options) {
      grid.appendChild(buildOptionButton(spec, option, feedback, grid));
    }
    host.appendChild(grid);
    speakSpec(spec);
  }

  /**
   * MATCH_PAIRS: two columns of tap-to-connect cards (words vs images). Tap a
   * word then its matching image (or vice versa). Correct pairs lock in; the
   * question resolves once every pair is matched.
   */
  function renderMatchPairs(host, spec) {
    host.appendChild(el('p', { className: 'match-title', text: 'Połącz w pary' }));
    const feedback = feedbackSlot();
    host.appendChild(feedback);

    const wordCards = spec.meta.wordCards || [];
    const imageCards = spec.meta.imageCards || [];
    const totalPairs = (spec.meta.pairs || []).length;
    let matchedCount = 0;
    let selected = null; // { pairId, el, kind }

    const board = el('div', { className: 'match-board' });
    const wordCol = el('div', { className: 'match-col' });
    const imageCol = el('div', { className: 'match-col' });

    function tryResolve() {
      if (matchedCount >= totalPairs && totalPairs > 0) {
        // Whole matching game counts as one correct answer for progress.
        resolveAnswer(spec, true, feedback, null, () => appendNext(host));
      }
    }

    function makeCard(kind, pairId, children) {
      const cardEl = el('button', {
        className: 'match-card touch-target',
        type: 'button'
      }, children);
      cardEl.addEventListener('click', () => {
        if (answered) return;
        if (cardEl.classList.contains('match-card--matched')) return;
        if (selected && selected.el === cardEl) {
          // tap again to deselect
          cardEl.classList.remove('match-card--selected');
          selected = null;
          return;
        }
        if (!selected) {
          selected = { pairId, el: cardEl, kind };
          cardEl.classList.add('match-card--selected');
          return;
        }
        // A card is already selected; only a card of the OTHER column can pair.
        if (selected.kind === kind) {
          selected.el.classList.remove('match-card--selected');
          selected = { pairId, el: cardEl, kind };
          cardEl.classList.add('match-card--selected');
          return;
        }
        const first = selected;
        selected = null;
        first.el.classList.remove('match-card--selected');
        if (first.pairId === pairId) {
          first.el.classList.add('match-card--matched');
          cardEl.classList.add('match-card--matched');
          first.el.disabled = true;
          cardEl.disabled = true;
          matchedCount += 1;
          tryResolve();
        } else {
          // Wrong pairing: gentle nudge, no penalty, cards stay in play.
          nudge(cardEl);
          nudge(first.el);
        }
      });
      return cardEl;
    }

    for (const w of wordCards) {
      wordCol.appendChild(makeCard('word', w.pairId, [
        el('span', { className: 'match-word', text: w.label })
      ]));
    }
    for (const im of imageCards) {
      const children = [];
      if (im.emoji) {
        children.push(el('span', { className: 'match-emoji', text: im.emoji }));
      } else if (im.colorHex) {
        children.push(el('span', {
          className: 'match-swatch',
          'aria-hidden': 'true',
          style: { backgroundColor: im.colorHex }
        }));
      }
      imageCol.appendChild(makeCard('image', im.pairId, children));
    }
    board.appendChild(wordCol);
    board.appendChild(imageCol);
    host.appendChild(board);
  }

  /**
   * SPELL_WORD: tappable letter tiles that assemble into a slot row, with
   * clear/backspace affordances and a Sprawdź button validated by isSpellingCorrect.
   */
  function renderSpellWord(host, spec) {
    host.appendChild(buildPromptCard(spec));
    host.appendChild(speakerButton(spec));
    const feedback = feedbackSlot();
    host.appendChild(feedback);

    const slots = el('div', { className: 'spell-slots', 'aria-live': 'polite' });
    const built = []; // array of { tileId, label, tileEl }
    host.appendChild(slots);

    const bank = el('div', { className: 'letter-bank' });
    const tileEls = new Map();

    function renderSlots() {
      clear(slots);
      if (built.length === 0) {
        slots.appendChild(el('span', { className: 'spell-slots-empty', text: '…' }));
      }
      for (const b of built) {
        slots.appendChild(el('span', { className: 'spell-slot', text: b.label }));
      }
    }

    function checkComplete() {
      if (built.length !== spec.meta.solution.length) return;
      const correct = isSpellingCorrect(built, spec.meta.target);
      if (correct) {
        resolveAnswer(spec, true, feedback, null, () => {
          controls.remove();
          bank.remove();
          appendNext(host);
        });
      } else {
        // Not correct yet: gentle nudge, clear so the child can retry, no penalty.
        clear(feedback);
        feedback.appendChild(buildFeedbackBanner(false, []));
        nudge(slots);
      }
    }

    for (const tile of spec.meta.tiles) {
      const tileEl = el('button', {
        className: 'letter-tile touch-target',
        type: 'button',
        text: tile.label
      });
      tileEl.addEventListener('click', () => {
        if (answered || tileEl.disabled) return;
        tileEl.disabled = true;
        tileEl.classList.add('letter-tile--used');
        built.push({ tileId: tile.id, label: tile.label, tileEl });
        renderSlots();
        checkComplete();
      });
      tileEls.set(tile.id, tileEl);
      bank.appendChild(tileEl);
    }

    function backspace() {
      if (answered) return;
      const last = built.pop();
      if (last) {
        last.tileEl.disabled = false;
        last.tileEl.classList.remove('letter-tile--used');
      }
      clear(feedback);
      renderSlots();
    }

    function clearAll() {
      if (answered) return;
      while (built.length) {
        const b = built.pop();
        b.tileEl.disabled = false;
        b.tileEl.classList.remove('letter-tile--used');
      }
      clear(feedback);
      renderSlots();
    }

    const controls = el('div', { className: 'spell-controls' }, [
      el('button', {
        className: 'big-button big-button--secondary touch-target',
        type: 'button',
        'aria-label': 'Cofnij literę',
        text: '⌫',
        onClick: backspace
      }),
      el('button', {
        className: 'big-button big-button--secondary touch-target',
        type: 'button',
        text: 'Wyczyść',
        onClick: clearAll
      })
    ]);

    renderSlots();
    host.appendChild(controls);
    host.appendChild(bank);
    speakSpec(spec);
  }

  /**
   * TRUE_FALSE: image/word + a statement, with big Prawda / Fałsz buttons.
   */
  function renderTrueFalse(host, spec) {
    const card = el('div', { className: 'prompt-card prompt-card--truefalse' });
    if (spec.moduleType === LEARNING_MODULES.COLORS && spec.prompt.colorHex) {
      card.classList.add('prompt-card--color');
      card.style.backgroundColor = spec.prompt.colorHex;
      card.appendChild(el('span', { className: 'prompt-color-name', text: spec.prompt.text }));
    } else {
      if (spec.prompt.emoji) {
        card.appendChild(el('span', { className: 'prompt-emoji', text: spec.prompt.emoji }));
      }
      card.appendChild(el('span', { className: 'prompt-word', text: spec.prompt.text }));
    }
    host.appendChild(card);
    host.appendChild(speakerButton(spec));

    const feedback = feedbackSlot();
    host.appendChild(feedback);

    const grid = el('div', { className: 'truefalse-row' });
    for (const option of spec.options) {
      const isTrue = option.id === 'true';
      const btn = el('button', {
        className: `truefalse-button touch-target truefalse-button--${isTrue ? 'true' : 'false'}`,
        type: 'button'
      }, [
        el('span', { className: 'truefalse-emoji', text: isTrue ? '✅' : '❌' }),
        el('span', { className: 'truefalse-label', text: option.label })
      ]);
      btn.addEventListener('click', () => {
        resolveAnswer(spec, option.isCorrect, feedback, btn, () => {
          clear(grid);
          appendNext(host);
        });
      });
      grid.appendChild(btn);
    }
    host.appendChild(grid);
    speakSpec(spec);
  }

  /**
   * COUNT_CHOOSE: render the glyphs to count, then number option buttons.
   */
  function renderCountChoose(host, spec) {
    const glyphs = spec.meta.glyphs || [];
    const card = el('div', { className: 'prompt-card prompt-card--count' });
    card.appendChild(el('p', { className: 'count-hint', text: 'Policz i wybierz liczbę' }));
    const glyphWrap = el('div', { className: 'count-glyphs', 'aria-label': `${glyphs.length}` });
    for (const g of glyphs) {
      glyphWrap.appendChild(el('span', { className: 'count-glyph', text: g }));
    }
    card.appendChild(glyphWrap);
    host.appendChild(card);

    const feedback = feedbackSlot();
    host.appendChild(feedback);

    const grid = el('div', { className: 'answer-grid count-options' });
    for (const option of spec.options) {
      const btn = el('button', {
        className: 'answer answer--number touch-target',
        type: 'button',
        text: option.label
      });
      btn.addEventListener('click', () => {
        resolveAnswer(spec, option.isCorrect, feedback, btn, () => {
          clear(grid);
          grid.classList.add('answer-grid--done');
          grid.appendChild(
            el('button', {
              className: 'big-button big-button--go touch-target',
              type: 'button',
              text: 'Dalej ➡',
              onClick: () => {
                index += 1;
                presentCurrent();
              }
            })
          );
        });
      });
      grid.appendChild(btn);
    }
    host.appendChild(grid);
  }

  // --- prompt card + feedback helpers ---------------------------------------

  /**
   * Build the prompt card for choice-style specs (multiple choice, listen-choose
   * fallback, spelling, which-matches). Themed per module like the original.
   */
  function buildPromptCard(spec) {
    const card = el('div', { className: 'prompt-card' });
    const p = spec.prompt || {};
    if (spec.moduleType === LEARNING_MODULES.COLORS && p.colorHex) {
      card.classList.add('prompt-card--color');
      card.style.backgroundColor = p.colorHex;
      card.appendChild(el('span', { className: 'prompt-color-name', text: p.text || '' }));
      return card;
    }
    if (spec.type === TASK_TYPES.WHICH_MATCHES && spec.meta && spec.meta.variant === 'find-color') {
      // find-color-in-scene prompt
      const scene = spec.meta.sceneDescriptor || {};
      card.appendChild(el('span', { className: 'prompt-scene-emoji', text: scene.emoji || '' }));
      card.appendChild(el('span', { className: 'prompt-scene-desc', text: scene.description || '' }));
      card.appendChild(el('span', { className: 'prompt-find', text: `Znajdź kolor: ${p.text || ''}` }));
      return card;
    }
    if (spec.moduleType === LEARNING_MODULES.POLISH_LETTERS) {
      if (p.text) card.appendChild(el('span', { className: 'prompt-letter', text: p.text }));
      if (p.emoji) card.appendChild(el('span', { className: 'prompt-example', text: p.emoji }));
      return card;
    }
    if (spec.moduleType === LEARNING_MODULES.NUMBERS) {
      card.appendChild(el('span', { className: 'prompt-digit', text: p.text || '' }));
      return card;
    }
    // ENGLISH (and default): emoji + word/translation prompt.
    if (p.emoji) card.appendChild(el('span', { className: 'prompt-emoji', text: p.emoji }));
    if (p.text) card.appendChild(el('span', { className: 'prompt-word', text: p.text }));
    return card;
  }

  function buildFeedbackBanner(correct, newBadges) {
    const banner = el('div', {
      className: `feedback ${correct ? 'feedback--correct' : 'feedback--retry'}`
    });
    banner.appendChild(
      el('p', {
        className: 'feedback-text',
        text: correct ? '🎉 Brawo!' : '🙂 Spróbuj jeszcze raz'
      })
    );
    for (const badge of newBadges || []) {
      banner.appendChild(
        el('p', { className: 'feedback-badge', text: `🏅 Nowa odznaka: ${badge.title}!` })
      );
    }
    return banner;
  }

  /**
   * Speak the spec's prompt. LISTEN_CHOOSE (and any spec carrying meta.speak) uses
   * the language the engine chose; otherwise we pick pl-PL / en-US from moduleType.
   */
  function speakSpec(spec) {
    if (spec.meta && spec.meta.speak && spec.meta.speak.text) {
      if (spec.meta.speak.lang === 'en-US') speakEnglish(spec.meta.speak.text);
      else speakPolish(spec.meta.speak.text);
      return;
    }
    const p = spec.prompt || {};
    switch (spec.moduleType) {
      case LEARNING_MODULES.ENGLISH:
        // For EN prompts speak the English side; PL->EN prompts show Polish text.
        if (p.direction === 'PL_TO_EN') speakPolish(p.text || '');
        else speakEnglish(p.text || (spec.item && spec.item.prompt) || '');
        break;
      case LEARNING_MODULES.NUMBERS:
        speakPolish(spec.item ? spec.item.answer : p.text || '');
        break;
      case LEARNING_MODULES.POLISH_LETTERS:
        speakPolish((spec.item && (spec.item.exampleWord || spec.item.prompt)) || p.text || '');
        break;
      case LEARNING_MODULES.COLORS:
      default:
        speakPolish(p.text || (spec.item && spec.item.prompt) || '');
        break;
    }
  }

  function finishLesson() {
    progressService.recordLessonStars(profileId, module, correctCount, queue.length);
    const stars = starsForLesson(correctCount, queue.length);
    clear(container);
    stopSpeech();

    const reduced = prefersReducedMotion();
    const starRow = buildStarRow(stars, !reduced);
    const pointsEl = el('p', { className: 'summary-points', text: reduced ? `${points} punktów` : '0 punktów' });

    const summary = el('div', {
      className: reduced ? 'lesson-summary' : 'lesson-summary anim-fade-slide-in'
    }, [
      el('span', { className: 'summary-emoji', text: '🎉' }),
      el('h1', { className: 'screen-title', text: 'Świetna robota!' }),
      starRow,
      pointsEl
    ]);

    playBadge();

    if (!reduced) {
      animateSummaryPoints(pointsEl, points);
    }

    summary.appendChild(
      el('button', {
        className: 'big-button big-button--go touch-target',
        type: 'button',
        text: 'Jeszcze raz 🔁',
        onClick: start
      })
    );
    summary.appendChild(
      el('button', {
        className: 'big-button big-button--secondary touch-target',
        type: 'button',
        text: '⬅ Wróć do menu',
        onClick: onBack
      })
    );
    container.appendChild(summary);
  }

  start();
}

/**
 * Build the 3-star row. When `reveal` is true the earned stars pop in one after
 * another for a celebratory feel; otherwise they render statically.
 */
function buildStarRow(count, reveal = false) {
  const row = el('div', { className: 'star-row' });
  for (let i = 0; i < 3; i++) {
    const earned = i < count;
    const star = el('span', {
      className: `star${earned ? ' star--earned' : ' star--empty'}`,
      text: earned ? '⭐' : '☆'
    });
    if (reveal && earned) {
      star.classList.add('star--reveal');
      star.style.animationDelay = `${0.15 + i * 0.28}s`;
    }
    row.appendChild(star);
  }
  return row;
}

/** Count the summary points up from 0 with an easeOut curve, then a tiny bounce. */
function animateSummaryPoints(target, points) {
  const setLabel = (n) => {
    target.textContent = `${n} punktów`;
  };
  if (points <= 0 || typeof requestAnimationFrame !== 'function') {
    setLabel(points);
    return;
  }
  const duration = 800;
  const startAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  function step(now) {
    const t = Math.min(1, (now - startAt) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
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

/**
 * Add a few small, brief sparkle glyphs over the feedback banner for a restrained
 * celebration. They fade themselves out and remove their nodes. No-op is fine if the
 * host is missing; nothing here is essential to behavior.
 */
function addSparkles(host) {
  if (!host || prefersReducedMotion()) return;
  const layer = el('div', { className: 'sparkle-layer', 'aria-hidden': 'true' });
  const glyphs = ['✨', '⭐', '✨'];
  glyphs.forEach((g, i) => {
    const s = el('span', { className: 'sparkle', text: g });
    s.style.left = `${20 + i * 30}%`;
    s.style.animationDelay = `${i * 0.08}s`;
    layer.appendChild(s);
  });
  host.appendChild(layer);
  if (typeof setTimeout === 'function') {
    setTimeout(() => {
      if (layer.parentNode) layer.parentNode.removeChild(layer);
    }, 900);
  }
}
