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

const QUESTIONS_PER_LESSON = 6;
const OPTIONS_PER_QUESTION = 4;

const MODULE_TITLES = {
  [LEARNING_MODULES.COLORS]: 'Kolory',
  [LEARNING_MODULES.POLISH_LETTERS]: 'Litery',
  [LEARNING_MODULES.NUMBERS]: 'Cyfry',
  [LEARNING_MODULES.ENGLISH]: 'Angielski'
};

/**
 * @param {HTMLElement} root
 * @param {{module:string, profileId:string, onBack:Function}} params
 */
export function renderLessonScreen(root, { module, profileId, onBack }) {
  clear(root);
  stopSpeech();
  const allItems = itemsFor(module);

  const container = el('section', { className: 'screen screen--lesson' });
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

    container.appendChild(buildPromptCard(item));

    container.appendChild(
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
    container.appendChild(feedback);

    const grid = el('div', { className: 'answer-grid' });
    options.forEach((option) => {
      grid.appendChild(buildAnswerOption(option, item, feedback, grid));
    });
    container.appendChild(grid);
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
      handleAnswer(isCorrectOption, correctItem, feedbackSlot, grid);
    });
    return optionEl;
  }

  function handleAnswer(correct, item, feedbackSlot, grid) {
    const outcome = progressService.recordAnswer(profileId, item, correct, Date.now());
    if (correct) {
      answered = true;
      correctCount += 1;
      points += outcome.pointsAwarded;
      clear(feedbackSlot);
      feedbackSlot.appendChild(
        buildFeedbackBanner(true, outcome.newlyEarnedBadges)
      );
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

    const summary = el('div', { className: 'lesson-summary' }, [
      el('span', { className: 'summary-emoji', text: '🎉' }),
      el('h1', { className: 'screen-title', text: 'Świetna robota!' }),
      buildStarRow(stars),
      el('p', { className: 'summary-points', text: `${points} punktów` })
    ]);

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

function buildStarRow(count) {
  const row = el('div', { className: 'star-row' });
  for (let i = 0; i < 3; i++) {
    row.appendChild(
      el('span', { className: 'star', text: i < count ? '⭐' : '☆' })
    );
  }
  return row;
}
