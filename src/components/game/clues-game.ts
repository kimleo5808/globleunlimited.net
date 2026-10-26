// Client controller for the Countryle-style clue game.
// Deduce the mystery country from six attribute clues. No map, pure DOM table.
import { GameEngine } from '../../lib/game/engine';
import { flagImg } from '../../lib/game/flag-img';
import { cluesDataset, computeClues, CLUE_COLUMNS } from '../../lib/game/clues';
import type { Clue } from '../../lib/game/clues';
import { recordLoss, recordWin } from '../../lib/game/stats';
import { bindAutocomplete, bindModal, bindShare, renderPips } from './shared';
import type { Country } from '../../lib/game/types';

const MAX_GUESSES = 7;
const ARROW = { up: '↑', down: '↓' } as const;

export function initCluesGame(root: HTMLElement) {
  const $ = <T extends HTMLElement = HTMLElement>(sel: string) => root.querySelector(sel) as T;

  const els = {
    form: $<HTMLFormElement>('[data-guess-form]'),
    input: $<HTMLInputElement>('[data-guess-input]'),
    submit: $<HTMLButtonElement>('[data-guess-form] button'),
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
    reopen: root.querySelector<HTMLElement>('[data-reopen]'),
  };

  const dataset = cluesDataset;
  const engine = new GameEngine('clues', undefined, dataset);
  const modal = bindModal(els.modal, els.reopen);
  let over = false;

  function setInputEnabled(on: boolean) {
    els.input.disabled = !on;
    els.submit.disabled = !on;
  }

  const pips = () => renderPips(els.pips, els.pipCount, engine.guesses, MAX_GUESSES);

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

  // ---- Autocomplete + errors ----
  const ac = bindAutocomplete({
    input: els.input,
    box: els.suggestBox,
    suggest: (q) => dataset.suggest(q),
    icon: (c) => flagImg(c.cca2),
    onPick: (name) => submitGuess(name),
  });

  // ---- Submit ----
  els.form.addEventListener('submit', (e) => { e.preventDefault(); submitGuess(els.input.value); });

  function submitGuess(raw: string) {
    if (over) return;
    const value = raw.trim();
    if (!value) return;
    const out = engine.guess(value);
    if (out.status === 'invalid') { ac.error('Not a recognized country'); return; }
    if (out.status === 'duplicate') { ac.error('Already guessed'); return; }

    ac.clearError();
    els.input.value = '';
    ac.close();
    const country = out.guess.country as Country;
    const clues = addRow(country, out.guess.correct);
    pips();
    announce(
      out.guess.correct
        ? `${country.name}, correct!`
        : `${country.name}: continent ${clues.continent.state}, area ${clues.area.state}, ${clues.borders.display} borders`,
    );

    if (out.won) finish(true);
    else if (engine.guessCount >= MAX_GUESSES) finish(false);
  }

  function announce(msg: string) { els.live.textContent = msg; }

  // ---- Round end ----
  function finish(won: boolean) {
    over = true;
    setInputEnabled(false);

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
      recordLoss('clues');
      els.modalExtra.hidden = true;
    }
    modal.open();
  }

  // ---- Play again ----
  els.playAgain.addEventListener('click', () => {
    engine.reset();
    over = false;
    els.rows.innerHTML = '';
    els.empty.hidden = false;
    modal.reset();
    ac.clearError();
    setInputEnabled(true);
    pips();
    els.input.focus();
  });

  // ---- Share ----
  bindShare(els.shareBtn, () => {
    const line = engine.won
      ? `I deduced the mystery country in ${engine.guessCount}/${MAX_GUESSES} on Globle Clues!`
      : `Globle Clues stumped me!`;
    return `${line} https://globleunlimited.net/clues/`;
  });

  // ---- Boot ----
  pips();
  setInputEnabled(true);
  els.input.focus();
}
