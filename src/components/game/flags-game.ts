// Client controller for the Flagle-style flag game.
// A national flag revealed one tile per wrong guess + distance / direction clues.
import { GameEngine } from '../../lib/game/engine';
import { flagImg, flagUrl } from '../../lib/game/flag-img';
import { flagsDataset } from '../../lib/game/flags';
import { bearing, compassArrow, compassName } from '../../lib/game/direction';
import { recordLoss, recordWin } from '../../lib/game/stats';
import { formatDistance, SETTINGS_EVENT } from '../../lib/settings';
import { bindAutocomplete, bindModal, bindShare, renderPips } from './shared';
import type { Guess } from '../../lib/game/types';

const MAX_GUESSES = 6;
const TILE_COUNT = 6;
// Order tiles are uncovered in (scattered, not left-to-right).
const REVEAL_ORDER = [4, 1, 5, 0, 3, 2];

export function initFlagsGame(root: HTMLElement) {
  const $ = <T extends HTMLElement = HTMLElement>(sel: string) => root.querySelector(sel) as T;

  const els = {
    card: $('[data-flag]'),
    img: $<HTMLImageElement>('[data-flag-img]'),
    tiles: $('[data-tiles]'),
    hint: root.querySelector('[data-flag-hint]'),
    form: $<HTMLFormElement>('[data-guess-form]'),
    input: $<HTMLInputElement>('[data-guess-input]'),
    submit: $<HTMLButtonElement>('[data-guess-form] button'),
    suggestBox: $('[data-suggest]'),
    pips: $('[data-pips]'),
    pipCount: $('[data-pipcount]'),
    clueTip: root.querySelector('[data-clue-tip]'),
    list: $('[data-list]'),
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

  const dataset = flagsDataset;
  const engine = new GameEngine('silhouette', undefined, dataset); // shares the capped 6-guess flow
  const modal = bindModal(els.modal, els.reopen);
  let over = false;
  let tileEls: HTMLElement[] = [];
  const km = (n: number) => formatDistance(n);

  function setInputEnabled(on: boolean) {
    els.input.disabled = !on;
    els.submit.disabled = !on;
  }

  // ---- Flag + tiles ----
  function buildTiles() {
    els.tiles.innerHTML = '';
    tileEls = [];
    for (let i = 0; i < TILE_COUNT; i++) {
      const t = document.createElement('div');
      t.className = 'flag-tile';
      els.tiles.appendChild(t);
      tileEls.push(t);
    }
  }

  function loadFlag(cca2: string) {
    els.img.src = flagUrl(cca2);
    els.img.alt = '';
    buildTiles(); // all covered…
    tileEls[REVEAL_ORDER[0]]?.classList.add('revealed'); // …then show one tile up front
  }

  /** Uncover the next tile. One tile is already shown at the start, so the Nth
   *  wrong guess uncovers REVEAL_ORDER[N]. */
  function revealNext(wrongCount: number) {
    const idx = REVEAL_ORDER[wrongCount];
    if (idx != null) tileEls[idx]?.classList.add('revealed');
  }

  function revealAll() {
    tileEls.forEach((t) => t.classList.add('revealed'));
  }

  const pips = () => renderPips(els.pips, els.pipCount, engine.guesses, MAX_GUESSES);

  // ---- Guess rows ----
  function addRow(g: Guess) {
    const row = document.createElement('li');
    row.className = 'guess-row';
    const arrow = g.correct ? '🎯' : compassArrow(g.bearing ?? 0);
    row.innerHTML =
      `<span class="g-flag">${flagImg(g.country.cca2)}</span>` +
      `<span class="g-name">${g.country.name}</span>` +
      `<span class="g-dist mono">${g.correct ? 'Correct!' : km(g.distanceKm)}</span>` +
      `<span class="g-arrow">${arrow}</span>`;
    if (g.correct) row.classList.add('is-correct');
    els.list.prepend(row);
  }

  function renderList() {
    els.list.innerHTML = '';
    engine.guesses.forEach((g) => addRow(g));
  }

  window.addEventListener(SETTINGS_EVENT, renderList);

  // ---- Autocomplete + errors ----
  const ac = bindAutocomplete({
    input: els.input,
    box: els.suggestBox,
    suggest: (q) => dataset.suggest(q),
    icon: (c) => flagImg(c.cca2),
    onPick: (name) => submitGuess(name),
  });

  // ---- Submit ----
  els.form.addEventListener('submit', (e) => {
    e.preventDefault();
    submitGuess(els.input.value);
  });

  function submitGuess(raw: string) {
    if (over) return;
    const value = raw.trim();
    if (!value) return;
    const out = engine.guess(value);

    if (out.status === 'invalid') { ac.error('Not a recognized country'); return; }
    if (out.status === 'duplicate') { ac.error('Already guessed'); return; }

    const g = out.guess;
    g.bearing = bearing(g.country.lat, g.country.lng, engine.target.lat, engine.target.lng);

    ac.clearError();
    els.input.value = '';
    ac.close();
    els.clueTip?.setAttribute('hidden', '');
    addRow(g);
    pips();
    if (!out.won) revealNext(engine.guessCount); // one tile per wrong guess
    announce(
      g.correct
        ? `${g.country.name}, correct!`
        : `${g.country.name}, ${km(g.distanceKm)}, ${compassName(g.bearing)}`,
    );

    if (out.won) finish(true);
    else if (engine.guessCount >= MAX_GUESSES) finish(false);
  }

  function announce(msg: string) { els.live.textContent = msg; }

  // ---- Round end ----
  function finish(won: boolean) {
    over = true;
    revealAll();
    setInputEnabled(false);

    els.modalEmoji.textContent = won ? '🎉' : '😔';
    els.modalTitle.textContent = won ? 'You found it!' : 'Out of guesses';
    els.modalCountry.innerHTML = `${flagImg(engine.target.cca2)} ${engine.target.name}`;
    els.modalGuessesLine.hidden = !won;

    if (won) {
      els.modalGuesses.textContent = String(engine.guessCount);
      const s = recordWin('flags', engine.guessCount);
      els.modalExtra.textContent =
        s.bestGuesses != null ? `Best: ${s.bestGuesses} guesses · Played: ${s.played}` : '';
      els.modalExtra.hidden = !els.modalExtra.textContent;
    } else {
      recordLoss('flags');
      els.modalExtra.hidden = true;
    }
    modal.open();
  }

  // ---- Play again ----
  els.playAgain.addEventListener('click', () => {
    engine.reset();
    over = false;
    els.list.innerHTML = '';
    modal.reset();
    ac.clearError();
    setInputEnabled(true);
    els.clueTip?.removeAttribute('hidden');
    loadFlag(engine.target.cca2);
    pips();
    els.input.focus();
  });

  // ---- Share ----
  bindShare(els.shareBtn, () => {
    const line = engine.won
      ? `I guessed the flag in ${engine.guessCount}/${MAX_GUESSES} on Globle Flags!`
      : `This flag stumped me on Globle Flags!`;
    return `${line} https://globleunlimited.net/flags/`;
  });

  // ---- Boot ----
  buildTiles();
  pips();
  els.hint?.remove();
  setInputEnabled(true);
  loadFlag(engine.target.cca2);
  els.input.focus();
}
