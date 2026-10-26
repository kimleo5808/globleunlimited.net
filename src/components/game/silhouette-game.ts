// Client controller for the Worldle-style silhouette game.
// Flat outline + distance / direction / proximity clues. No WebGL.
// Config-driven: /silhouette uses countries, /states uses US states.
import { GameEngine } from '../../lib/game/engine';
import { countriesDataset } from '../../lib/game/countries';
import { flagImg } from '../../lib/game/flag-img';
import { statesDataset } from '../../lib/game/states';
import { bearing, compassArrow, compassName, proximityPct } from '../../lib/game/direction';
import { recordLoss, recordWin } from '../../lib/game/stats';
import { formatDistance, getUnit, SETTINGS_EVENT } from '../../lib/settings';
import type { Unit } from '../../lib/settings';
import { bindAutocomplete, bindModal, bindShare, renderPips } from './shared';
import type { Guessable, Guess, GameMode, Dataset } from '../../lib/game/types';

const MAX_GUESSES = 6;

type SilhouetteMap = Record<string, { path: string }>;

export function initSilhouetteGame(root: HTMLElement) {
  const $ = <T extends HTMLElement = HTMLElement>(sel: string) => root.querySelector(sel) as T;

  // ---- Config from data attributes (set by SilhouetteGame.astro) ----
  const variant = root.dataset.variant === 'states' ? 'states' : 'countries';
  const cfg = {
    silUrl: root.dataset.silUrl || '/assets/data/silhouettes.json',
    shareName: root.dataset.shareName || 'Globle Shapes',
    sharePath: root.dataset.sharePath || '/silhouette/',
    statsMode: (root.dataset.statsMode || 'silhouette') as GameMode,
    maxKm: Number(root.dataset.maxKm) || 20000,
    unitDefault: (root.dataset.unitDefault || 'km') as Unit,
  };
  const dataset: Dataset = variant === 'states' ? statesDataset : countriesDataset;
  /** Leading icon for a guessed item: flag image for countries, code pill for states. */
  const icon = (item: Guessable) =>
    variant === 'states' ? `<span class="g-abbr">${item.cca2}</span>` : flagImg(item.cca2);

  const els = {
    card: $('[data-sil]'),
    path: $<SVGPathElement & HTMLElement>('[data-sil-path]'),
    hint: root.querySelector('[data-sil-hint]'),
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

  const engine = new GameEngine('silhouette', undefined, dataset);
  const modal = bindModal(els.modal, els.reopen);
  let silhouettes: SilhouetteMap = {};
  let over = false;
  // Respect an explicit unit choice; otherwise fall back to the page default
  // (/states defaults to miles for its US audience).
  const km = (n: number) => formatDistance(n, getUnit(cfg.unitDefault));

  function setInputEnabled(on: boolean) {
    els.input.disabled = !on;
    els.submit.disabled = !on;
  }

  // ---- Silhouette rendering ----
  function renderSilhouette(name: string) {
    const entry = silhouettes[name];
    els.path.setAttribute('d', entry?.path ?? '');
    els.card.classList.remove('drawing');
    if (entry?.path) {
      const len = Math.ceil(els.path.getTotalLength?.() ?? 2000);
      els.card.style.setProperty('--len', String(len));
      void els.card.offsetWidth; // restart animation
      els.card.classList.add('drawing');
    }
  }

  const pips = () => renderPips(els.pips, els.pipCount, engine.guesses, MAX_GUESSES);

  // ---- Guess rows ----
  function addRow(g: Guess) {
    const row = document.createElement('li');
    row.className = 'guess-row';
    const arrow = g.correct ? '🎯' : compassArrow(g.bearing ?? 0);
    const prox = g.correct ? 100 : (g.proximity ?? 0);
    row.innerHTML =
      `<span class="swatch" style="background:${g.color}"></span>` +
      `<span class="g-flag">${icon(g.country)}</span>` +
      `<span class="g-name">${g.country.name}</span>` +
      `<span class="g-dist mono">${g.correct ? 'Correct!' : km(g.distanceKm)}</span>` +
      `<span class="g-arrow">${arrow}</span>` +
      `<span class="g-prox mono">${prox}%</span>`;
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
    icon,
    onPick: (name) => submitGuess(name),
  });

  // ---- Submit ----
  els.form.addEventListener('submit', (e) => { e.preventDefault(); submitGuess(els.input.value); });

  function submitGuess(raw: string) {
    if (over) return;
    const value = raw.trim();
    if (!value) return;
    const out = engine.guess(value);
    if (out.status === 'invalid') { ac.error(`Not a recognized ${variant === 'states' ? 'state' : 'country'}`); return; }
    if (out.status === 'duplicate') { ac.error('Already guessed'); return; }

    const g = out.guess;
    g.bearing = bearing(g.country.lat, g.country.lng, engine.target.lat, engine.target.lng);
    g.proximity = proximityPct(g.distanceKm, cfg.maxKm);

    ac.clearError();
    els.input.value = '';
    ac.close();
    els.clueTip?.setAttribute('hidden', ''); // hint has served its purpose
    addRow(g);
    pips();
    announce(
      g.correct
        ? `${g.country.name}, correct!`
        : `${g.country.name}, ${km(g.distanceKm)}, ${compassName(g.bearing)}, ${g.proximity}%`,
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
    els.modalCountry.innerHTML = `${icon(engine.target)} ${engine.target.name}`;
    els.modalGuessesLine.hidden = !won;

    if (won) {
      els.modalGuesses.textContent = String(engine.guessCount);
      const s = recordWin(cfg.statsMode, engine.guessCount);
      els.modalExtra.textContent =
        s.bestGuesses != null ? `Best: ${s.bestGuesses} guesses · Played: ${s.played}` : '';
      els.modalExtra.hidden = !els.modalExtra.textContent;
    } else {
      recordLoss(cfg.statsMode);
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
    renderSilhouette(engine.target.name);
    pips();
    els.input.focus();
  });

  // ---- Share ----
  bindShare(els.shareBtn, () => {
    const noun = variant === 'states' ? 'state' : 'country';
    const line = engine.won
      ? `I found the mystery ${noun} in ${engine.guessCount}/${MAX_GUESSES} on ${cfg.shareName}!`
      : `${cfg.shareName} stumped me!`;
    return `${line} https://globleunlimited.net${cfg.sharePath}`;
  });

  // ---- Boot ----
  pips();
  fetch(cfg.silUrl)
    .then((r) => r.json())
    .then((data: SilhouetteMap) => {
      silhouettes = data;
      els.hint?.remove();
      setInputEnabled(true);
      renderSilhouette(engine.target.name);
      els.input.focus();
    })
    .catch(() => {
      if (els.hint) els.hint.textContent = 'Could not load shapes.';
    });
}
