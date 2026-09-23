// One self-paced lesson used by every module. Ports LessonViewModel + LessonScreen:
// builds a 6-question queue seeded from due items (this module) then shuffled unseen /
// not-yet-due items, shows a module-specific prompt (spoken aloud) with 4 shuffled
// options, and gives positive-only feedback: '🎉 Brawo!' + advance on correct, a gentle
// '🙂 Spróbuj jeszcze raz' (same question, no points, no penalty) on wrong.

import { el, clear, shuffle } from './dom.js';
import { LEARNING_MODULES } from '../logic/models.js';
import { itemsFor } from '../logic/content.js';
import { starsForLesson } from '../logic/gamification.js';
import * as progressService from '../data/progressService.js';
import { speakPolish, speakEnglish, stop as stopSpeech } from '../audio/speech.js';
import { playCorrect, playBadge } from '../audio/soundEffects.js';

const QUESTIONS_PER_LESSON = 6;
const OPTIONS_PER_QUESTION = 4;

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
  const allItems = itemsFor(module);

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
    const chunk = Math.min(QUESTIONS_PER_LESSON, allItems.length);
    const now = Date.now();
    const byId = new Map(allItems.map((it) => [it.id, it]));
    // dueItems spans all modules; keep only ids that belong to this module's catalog.
    const dueIds = progressService
      .dueItems(profileId, now)
      .map((s) => s.itemId)
      .filter((id) => byId.has(id));
    const due = dueIds.map((id) => byId.get(id));
    const dueSet = new Set(dueIds);
    const rest = shuffle(allItems.filter((it) => !dueSet.has(it.id)));
    return due.concat(rest).slice(0, chunk);
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
    const item = queue[index];
    const distractors = shuffle(allItems.filter((it) => it.id !== item.id)).slice(
      0,
      OPTIONS_PER_QUESTION - 1
    );
    const options = shuffle(distractors.concat(item));
    drawQuestion(item, options);
    speakPrompt(item);
  }

  function drawQuestion(item, options) {
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
      // Start narrower, then grow so the fill visibly animates on each question.
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
    drawQuestionBody(questionBlock, item, options);
  }

  function drawQuestionBody(host, item, options) {
    host.appendChild(buildPromptCard(item));

    host.appendChild(
      el('div', { className: 'speaker-row' }, [
        el('button', {
          className: 'speaker-button touch-target',
          type: 'button',
          'aria-label': 'Powtórz',
          text: '🔊',
          onClick: () => speakPrompt(item)
        })
      ])
    );

    const feedback = el('div', { className: 'feedback-slot' });
    host.appendChild(feedback);

    const grid = el('div', { className: 'answer-grid' });
    options.forEach((option) => {
      grid.appendChild(buildAnswerOption(option, item, feedback, grid));
    });
    host.appendChild(grid);
  }

  function buildAnswerOption(option, correctItem, feedbackSlot, grid) {
    const isCorrectOption = option.id === correctItem.id;
    let optionEl;
    if (module === LEARNING_MODULES.COLORS) {
      optionEl = el('button', {
        className: 'answer answer--color touch-target',
        type: 'button',
        'aria-label': option.answer,
        style: { backgroundColor: option.colorHex }
      });
    } else {
      const label =
        module === LEARNING_MODULES.POLISH_LETTERS ? option.prompt : option.answer;
      optionEl = el('button', {
        className: 'answer touch-target',
        type: 'button',
        text: label
      });
    }
    optionEl.addEventListener('click', () => {
      if (answered) return; // ignore taps after a correct answer
      handleAnswer(isCorrectOption, correctItem, feedbackSlot, grid, optionEl);
    });
    return optionEl;
  }

  function handleAnswer(correct, item, feedbackSlot, grid, optionEl) {
    const outcome = progressService.recordAnswer(profileId, item, correct, Date.now());
    if (correct) {
      answered = true;
      correctCount += 1;
      points += outcome.pointsAwarded;
      clear(feedbackSlot);
      const banner = buildFeedbackBanner(true, outcome.newlyEarnedBadges);
      feedbackSlot.appendChild(banner);

      // Restrained celebration: a gentle pop on the banner plus a soft effect sound.
      // The AudioContext resumes on this real user gesture (the tap).
      playCorrect();
      if (!prefersReducedMotion()) banner.classList.add('anim-correct-pop');
      addSparkles(feedbackSlot);

      const newBadges = outcome.newlyEarnedBadges || [];
      if (newBadges.length > 0) {
        playBadge();
        if (!prefersReducedMotion()) {
          for (const b of banner.querySelectorAll('.feedback-badge')) {
            b.classList.add('anim-badge-pulse');
          }
        }
      }

      // Replace the answer grid with a Next control.
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
    } else {
      // Positive reinforcement: gentle retry, no penalty, same question stays.
      clear(feedbackSlot);
      feedbackSlot.appendChild(buildFeedbackBanner(false, []));
      // Soft, non-alarming nudge on the tapped tile (reduced-motion safe via CSS).
      if (optionEl && !prefersReducedMotion()) {
        optionEl.classList.remove('answer--nudge');
        // reflow so the animation can retrigger on repeated wrong taps
        void optionEl.offsetWidth;
        optionEl.classList.add('answer--nudge');
        optionEl.addEventListener(
          'animationend',
          () => optionEl.classList.remove('answer--nudge'),
          { once: true }
        );
      }
    }
  }

  function buildPromptCard(item) {
    const card = el('div', { className: 'prompt-card' });
    if (module === LEARNING_MODULES.COLORS) {
      card.classList.add('prompt-card--color');
      card.style.backgroundColor = item.colorHex;
      card.appendChild(el('span', { className: 'prompt-color-name', text: item.prompt }));
    } else if (module === LEARNING_MODULES.POLISH_LETTERS) {
      card.appendChild(el('span', { className: 'prompt-letter', text: item.prompt }));
      card.appendChild(
        el('span', {
          className: 'prompt-example',
          text: `${item.emoji || ''} ${item.exampleWord || ''}`.trim()
        })
      );
    } else if (module === LEARNING_MODULES.NUMBERS) {
      card.appendChild(el('span', { className: 'prompt-digit', text: item.prompt }));
      const count = Math.min(Math.max(parseInt(item.prompt, 10) || 0, 0), 9);
      card.appendChild(el('span', { className: 'prompt-count', text: '🍎'.repeat(count) }));
    } else {
      // ENGLISH
      card.appendChild(el('span', { className: 'prompt-emoji', text: item.emoji || '' }));
      card.appendChild(el('span', { className: 'prompt-word', text: item.prompt }));
    }
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
    for (const badge of newBadges) {
      banner.appendChild(
        el('p', { className: 'feedback-badge', text: `🏅 Nowa odznaka: ${badge.title}!` })
      );
    }
    return banner;
  }

  function speakPrompt(item) {
    switch (item.moduleType) {
      case LEARNING_MODULES.ENGLISH:
        speakEnglish(item.prompt);
        break;
      case LEARNING_MODULES.NUMBERS:
        speakPolish(item.answer); // Polish number word
        break;
      case LEARNING_MODULES.POLISH_LETTERS:
        speakPolish(item.exampleWord || item.prompt);
        break;
      case LEARNING_MODULES.COLORS:
      default:
        speakPolish(item.prompt);
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

    // One restrained celebratory cue on entry (does not loop).
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
