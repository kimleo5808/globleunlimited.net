// Client controller for the Flagle-style flag game.
// A national flag revealed one tile per wrong guess + distance / direction clues.
import { GameEngine } from '../../lib/game/engine';
import { flag } from '../../lib/game/countries';
import { flagsDataset, flagUrl } from '../../lib/game/flags';
import { bearing, compassArrow, compassName } from '../../lib/game/direction';
import { recordWin } from '../../lib/game/stats';
import { formatDistance, SETTINGS_EVENT } from '../../lib/settings';
import type { Guessable, Guess } from '../../lib/game/types';

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
  };

  const dataset = flagsDataset;
  const engine = new GameEngine('silhouette', undefined, dataset); // shares the capped 6-guess flow
  let over = false;
  let tileEls: HTMLElement[] = [];
  const km = (n: number) => formatDistance(n);

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

  // ---- Progress pips ----
  function renderPips() {
    const n = engine.guessCount;
    els.pips.innerHTML = '';
    for (let i = 0; i < MAX_GUESSES; i++) {
      const pip = document.createElement('span');
      pip.className = 'pip';
      const g = engine.guesses[i];
      if (g) {
        pip.style.background = g.color;
        pip.style.borderColor = g.color;
      }
      els.pips.appendChild(pip);
    }
    els.pipCount.textContent = `GUESSES ${n} / ${MAX_GUESSES}`;
  }

  // ---- Guess rows ----
  function addRow(g: Guess) {
    const row = document.createElement('li');
    row.className = 'guess-row';
    const arrow = g.correct ? '🎯' : compassArrow(g.bearing ?? 0);
    row.innerHTML =
      `<span class="g-flag">${flag(g.country.cca2)}</span>` +
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

    if (out.status === 'invalid') { flashError('Not a recognized country'); return; }
    if (out.status === 'duplicate') { flashError('Already guessed'); return; }

    const g = out.guess;
    g.bearing = bearing(g.country.lat, g.country.lng, engine.target.lat, engine.target.lng);

    clearError();
    els.input.value = '';
    closeSuggest();
    els.clueTip?.setAttribute('hidden', '');
    addRow(g);
    renderPips();
    if (!out.won) revealNext(engine.guessCount); // one tile per wrong guess
    announce(
      g.correct
        ? `${g.country.name}, correct!`
        : `${g.country.name}, ${km(g.distanceKm)}, ${compassName(g.bearing)}`,
    );

    if (out.won) finish(true);
    else if (engine.guessCount >= MAX_GUESSES) finish(false);
  }

  // ---- Round end ----
  function finish(won: boolean) {
    over = true;
    revealAll();
    els.input.disabled = true;
    (els.form.querySelector('button') as HTMLButtonElement).disabled = true;

    els.modalEmoji.textContent = won ? '🎉' : '😔';
    els.modalTitle.textContent = won ? 'You found it!' : 'Out of guesses';
    els.modalCountry.innerHTML = `${flag(engine.target.cca2)} ${engine.target.name}`;
    els.modalGuessesLine.hidden = !won;

    if (won) {
      els.modalGuesses.textContent = String(engine.guessCount);
      const s = recordWin('flags', engine.guessCount);
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
    els.clueTip?.removeAttribute('hidden');
    loadFlag(engine.target.cca2);
    renderPips();
    els.input.focus();
  });

  // ---- Share ----
  els.shareBtn.addEventListener('click', async () => {
    const line = engine.won
      ? `I guessed the flag in ${engine.guessCount}/${MAX_GUESSES} on Flagle Unlimited!`
      : `This flag stumped me on Flagle Unlimited!`;
    const text = `${line} https://globleunlimited.net/flags`;
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
  els.input.addEventListener('input', () => {
    activeIdx = -1;
    renderSuggest(dataset.suggest(els.input.value));
  });
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
      .map((c) => `<button type="button" class="suggest-item" data-name="${c.name}">${flag(c.cca2)} ${c.name}</button>`)
      .join('');
    els.suggestBox.hidden = false;
    els.suggestBox.querySelectorAll<HTMLButtonElement>('.suggest-item').forEach((b) => {
      b.addEventListener('click', () => { els.input.value = b.dataset.name || ''; submitGuess(els.input.value); });
    });
  }
  function closeSuggest() { els.suggestBox.hidden = true; els.suggestBox.innerHTML = ''; }

  // ---- Boot ----
  buildTiles();
  renderPips();
  els.hint?.remove();
  els.input.disabled = false;
  (els.form.querySelector('button') as HTMLButtonElement).disabled = false;
  loadFlag(engine.target.cca2);
  els.input.focus();
}
