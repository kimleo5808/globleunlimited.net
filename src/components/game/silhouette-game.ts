// Client controller for the Worldle-style silhouette game.
// Flat outline + distance / direction / proximity clues. No WebGL.
// Config-driven: /silhouette uses countries, /states uses US states.
import { GameEngine } from '../../lib/game/engine';
import { flag, countriesDataset } from '../../lib/game/countries';
import { statesDataset } from '../../lib/game/states';
import { bearing, compassArrow, compassName, proximityPct } from '../../lib/game/direction';
import { recordWin } from '../../lib/game/stats';
import { formatDistance, SETTINGS_EVENT } from '../../lib/settings';
import type { Guessable, Guess, GameMode, Dataset } from '../../lib/game/types';

const MAX_GUESSES = 6;

type SilhouetteMap = Record<string, { path: string }>;

export function initSilhouetteGame(root: HTMLElement) {
  const $ = <T extends HTMLElement = HTMLElement>(sel: string) => root.querySelector(sel) as T;

  // ---- Config from data attributes (set by SilhouetteGame.astro) ----
  const variant = root.dataset.variant === 'states' ? 'states' : 'countries';
  const cfg = {
    silUrl: root.dataset.silUrl || '/assets/data/silhouettes.json',
    shareName: root.dataset.shareName || 'Worldle Unlimited',
    sharePath: root.dataset.sharePath || '/silhouette',
    statsMode: (root.dataset.statsMode || 'silhouette') as GameMode,
    maxKm: Number(root.dataset.maxKm) || 20000,
  };
  const dataset: Dataset = variant === 'states' ? statesDataset : countriesDataset;
  /** Leading icon for a guessed item: flag emoji for countries, code pill for states. */
  const icon = (item: Guessable) =>
    variant === 'states' ? `<span class="g-abbr">${item.cca2}</span>` : flag(item.cca2);

  const els = {
    card: $('[data-sil]'),
    path: $<SVGPathElement & HTMLElement>('[data-sil-path]'),
    hint: root.querySelector('[data-sil-hint]'),
    form: $<HTMLFormElement>('[data-guess-form]'),
    input: $<HTMLInputElement>('[data-guess-input]'),
    suggestBox: $('[data-suggest]'),
    pips: $('[data-pips]'),
    pipCount: $('[data-pipcount]'),
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
  };

  const engine = new GameEngine('silhouette', undefined, dataset);
  let silhouettes: SilhouetteMap = {};
  let over = false;
  const km = (n: number) => formatDistance(n);

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

  // ---- Submit ----
  els.form.addEventListener('submit', (e) => { e.preventDefault(); submitGuess(els.input.value); });

  function submitGuess(raw: string) {
    if (over) return;
    const value = raw.trim();
    if (!value) return;
    const out = engine.guess(value);
    if (out.status === 'invalid') { flashError(`Not a recognized ${variant === 'states' ? 'state' : 'country'}`); return; }
    if (out.status === 'duplicate') { flashError('Already guessed'); return; }

    const g = out.guess;
    g.bearing = bearing(g.country.lat, g.country.lng, engine.target.lat, engine.target.lng);
    g.proximity = proximityPct(g.distanceKm, cfg.maxKm);

    clearError();
    els.input.value = '';
    closeSuggest();
    addRow(g);
    renderPips();
    announce(
      g.correct
        ? `${g.country.name}, correct!`
        : `${g.country.name}, ${km(g.distanceKm)}, ${compassName(g.bearing)}, ${g.proximity}%`,
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
    els.modalCountry.innerHTML = `${icon(engine.target)} ${engine.target.name}`;
    els.modalGuessesLine.hidden = !won;

    if (won) {
      els.modalGuesses.textContent = String(engine.guessCount);
      const s = recordWin(cfg.statsMode, engine.guessCount);
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
    els.list.innerHTML = '';
    els.modal.hidden = true;
    clearError();
    els.input.disabled = false;
    (els.form.querySelector('button') as HTMLButtonElement).disabled = false;
    renderSilhouette(engine.target.name);
    renderPips();
    els.input.focus();
  });

  // ---- Share ----
  els.shareBtn.addEventListener('click', async () => {
    const noun = variant === 'states' ? 'state' : 'country';
    const line = engine.won
      ? `I found the mystery ${noun} in ${engine.guessCount}/${MAX_GUESSES} on ${cfg.shareName}!`
      : `${cfg.shareName} stumped me!`;
    const text = `${line} https://globleunlimited.net${cfg.sharePath}`;
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
      .map((c) => `<button type="button" class="suggest-item" data-name="${c.name}">${icon(c)} ${c.name}</button>`)
      .join('');
    els.suggestBox.hidden = false;
    els.suggestBox.querySelectorAll<HTMLButtonElement>('.suggest-item').forEach((b) => {
      b.addEventListener('click', () => { els.input.value = b.dataset.name || ''; submitGuess(els.input.value); });
    });
  }
  function closeSuggest() { els.suggestBox.hidden = true; els.suggestBox.innerHTML = ''; }

  // ---- Boot ----
  renderPips();
  fetch(cfg.silUrl)
    .then((r) => r.json())
    .then((data: SilhouetteMap) => {
      silhouettes = data;
      els.hint?.remove();
      els.input.disabled = false;
      (els.form.querySelector('button') as HTMLButtonElement).disabled = false;
      renderSilhouette(engine.target.name);
      els.input.focus();
    })
    .catch(() => {
      if (els.hint) els.hint.textContent = 'Could not load shapes.';
    });
}
