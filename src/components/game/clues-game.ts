// Client controller for the Countryle-style clue game.
// Deduce the mystery country from six attribute clues. No map, pure DOM table.
import { GameEngine } from '../../lib/game/engine';
import { flagImg } from '../../lib/game/flag-img';
import { cluesDataset, computeClues, CLUE_COLUMNS } from '../../lib/game/clues';
import type { Clue } from '../../lib/game/clues';
import { recordWin } from '../../lib/game/stats';
import type { Guessable, Country } from '../../lib/game/types';

const MAX_GUESSES = 7;
const ARROW = { up: '↑', down: '↓' } as const;

export function initCluesGame(root: HTMLElement) {
  const $ = <T extends HTMLElement = HTMLElement>(sel: string) => root.querySelector(sel) as T;

  const els = {
    form: $<HTMLFormElement>('[data-guess-form]'),
    input: $<HTMLInputElement>('[data-guess-input]'),
    suggestBox: $('[data-suggest]'),
    pips: $('[data-pips]'),
    pipCount: $('[data-pipcount]'),
    rows: $('[data-rows]'),
    empty: $('[data-empty]'),
    live: $('[data-live]'),
    modal: $('[data-modal]'),
    modalEmoji: $('[data-modal-emoji]'),
    modalTitle: $('[data-modal-title]'),
    modalCountry: $('[data-modal-country]'),
    modalGuessesLine: $('[data-modal-guesses-line]'),
    modalGuesses: $('[data-modal-guesses]'),
    modalExtra: $('[data-modal-extra]'),
    playAgain: $<HTMLButtonElement>('[data-play-again]'),
    shareBtn: $<HTMLButtonElement>('[data-share]'),
  };

  const dataset = cluesDataset;
  const engine = new GameEngine('clues', undefined, dataset);
  let over = false;

  // ---- Progress pips ----
  function renderPips() {
    const n = engine.guessCount;
    els.pips.innerHTML = '';
    for (let i = 0; i < MAX_GUESSES; i++) {
      const pip = document.createElement('span');
      pip.className = 'pip';
      const g = engine.guesses[i];
      if (g) { pip.style.background = g.color; pip.style.borderColor = g.color; }
      els.pips.appendChild(pip);
    }
    els.pipCount.textContent = `GUESSES ${n} / ${MAX_GUESSES}`;
  }

  // ---- Clue rows ----
  function cell(c: Clue): string {
    const hint = c.hint ? `<span class="c-hint">${ARROW[c.hint]}</span>` : '';
    return `<td class="cell-${c.state}">${c.display}${hint}</td>`;
  }

  function addRow(country: Country, correct: boolean) {
    const clues = computeClues(country, engine.target as Country);
    const tr = document.createElement('tr');
    tr.className = 'clue-row' + (correct ? ' is-correct' : '');
    tr.innerHTML =
      `<td class="c-country">${flagImg(country.cca2)} ${country.name}</td>` +
      CLUE_COLUMNS.map((col) => cell(clues[col.key])).join('');
    els.rows.prepend(tr);
    els.empty.hidden = true;
    return clues;
  }

  // ---- Submit ----
  els.form.addEventListener('submit', (e) => { e.preventDefault(); submitGuess(els.input.value); });

  function submitGuess(raw: string) {
    if (over) return;
    const value = raw.trim();
    if (!value) return;
    const out = engine.guess(value);
    if (out.status === 'invalid') { flashError('Not a recognized country'); return; }
    if (out.status === 'duplicate') { flashError('Already guessed'); return; }

    clearError();
    els.input.value = '';
    closeSuggest();
    const country = out.guess.country as Country;
    const clues = addRow(country, out.guess.correct);
    renderPips();
    announce(
      out.guess.correct
        ? `${country.name}, correct!`
        : `${country.name}: continent ${clues.continent.state}, area ${clues.area.state}, ${clues.borders.display} borders`,
    );

    if (out.won) finish(true);
    else if (engine.guessCount >= MAX_GUESSES) finish(false);
  }

  // ---- Round end ----
  function finish(won: boolean) {
    over = true;
    els.input.disabled = true;
    (els.form.querySelector('button') as HTMLButtonElement).disabled = true;

    els.modalEmoji.textContent = won ? '🎉' : '😔';
    els.modalTitle.textContent = won ? 'You found it!' : 'Out of guesses';
    els.modalCountry.innerHTML = `${flagImg(engine.target.cca2)} ${engine.target.name}`;
    els.modalGuessesLine.hidden = !won;

    if (won) {
      els.modalGuesses.textContent = String(engine.guessCount);
      const s = recordWin('clues', engine.guessCount);
      els.modalExtra.textContent =
        s.bestGuesses != null ? `Best: ${s.bestGuesses} guesses · Played: ${s.played}` : '';
      els.modalExtra.hidden = !els.modalExtra.textContent;
    } else {
      els.modalExtra.hidden = true;
    }
    els.modal.hidden = false;
  }

  // ---- Play again ----
  els.playAgain.addEventListener('click', () => {
    engine.reset();
    over = false;
    els.rows.innerHTML = '';
    els.empty.hidden = false;
    els.modal.hidden = true;
    clearError();
    els.input.disabled = false;
    (els.form.querySelector('button') as HTMLButtonElement).disabled = false;
    renderPips();
    els.input.focus();
  });

  // ---- Share ----
  els.shareBtn.addEventListener('click', async () => {
    const line = engine.won
      ? `I deduced the mystery country in ${engine.guessCount}/${MAX_GUESSES} on Countryle Unlimited!`
      : `Countryle Unlimited stumped me!`;
    const text = `${line} https://globleunlimited.net/clues`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        els.shareBtn.textContent = 'Copied!';
        setTimeout(() => (els.shareBtn.textContent = 'Share'), 1500);
      }
    } catch { /* cancelled */ }
  });

  // ---- Errors + a11y ----
  function flashError(msg: string) {
    els.input.setAttribute('aria-invalid', 'true');
    els.suggestBox.innerHTML = `<div class="suggest-error">${msg}</div>`;
    els.suggestBox.hidden = false;
  }
  function clearError() { els.input.removeAttribute('aria-invalid'); }
  function announce(msg: string) { els.live.textContent = msg; }

  // ---- Autocomplete ----
  let activeIdx = -1;
  els.input.addEventListener('input', () => { activeIdx = -1; renderSuggest(dataset.suggest(els.input.value)); });
  els.input.addEventListener('keydown', (e) => {
    const items = [...els.suggestBox.querySelectorAll('.suggest-item')] as HTMLElement[];
    if (!items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx = (activeIdx + 1) % items.length; }
    else if (e.key === 'ArrowUp') { e.preventDefault(); activeIdx = (activeIdx - 1 + items.length) % items.length; }
    else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); items[activeIdx].click(); return; }
    else return;
    items.forEach((it, i) => it.classList.toggle('active', i === activeIdx));
  });
  els.input.addEventListener('blur', () => setTimeout(closeSuggest, 120));

  function renderSuggest(list: Guessable[]) {
    if (!list.length) return closeSuggest();
    els.suggestBox.innerHTML = list
      .map((c) => `<button type="button" class="suggest-item" data-name="${c.name}">${flagImg(c.cca2)} ${c.name}</button>`)
      .join('');
    els.suggestBox.hidden = false;
    els.suggestBox.querySelectorAll<HTMLButtonElement>('.suggest-item').forEach((b) => {
      b.addEventListener('click', () => { els.input.value = b.dataset.name || ''; submitGuess(els.input.value); });
    });
  }
  function closeSuggest() { els.suggestBox.hidden = true; els.suggestBox.innerHTML = ''; }

  // ---- Boot ----
  renderPips();
  els.input.disabled = false;
  (els.form.querySelector('button') as HTMLButtonElement).disabled = false;
  els.input.focus();
}
