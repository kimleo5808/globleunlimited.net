// Client controller for Globle Routes: deal a route between two countries,
// judge every country the player names, and draw the growing chain on the
// globe. Route logic lives in src/lib/game/routes.ts.
import { COUNTRIES, countriesDataset } from '../../lib/game/countries';
import { flagImg } from '../../lib/game/flag-img';
import {
  completion,
  dealRoute,
  lengthAvailable,
  SPARE_GUESSES,
  verdictFor,
} from '../../lib/game/routes';
import type { Route, RouteLength, RouteRegion, Verdict } from '../../lib/game/routes';
import { recordLoss, recordWin } from '../../lib/game/stats';
import { createGlobe, WORLD_GEO_URL } from './globe-setup';
import { bindAutocomplete, bindModal, bindShare } from './shared';

const COLOUR = {
  end: '#F4C95D',
  on: '#2E9E4F',
  near: 'rgba(254, 178, 76, 0.9)',
  off: 'rgba(224, 106, 90, 0.75)',
  hint: 'rgba(255, 255, 255, 0.78)',
  base: 'rgba(232, 217, 181, 0.18)',
};

const VERDICT_TEXT: Record<Verdict, string> = {
  on: 'ON ROUTE ✓',
  near: '1 AWAY',
  off: 'OFF ROUTE',
  island: 'NO LAND ROUTE',
  outside: 'OUTSIDE REGION',
};
const ROW_CLASS: Record<Verdict, string> = { on: 'row-on', near: 'row-near', off: 'row-off', island: 'row-off', outside: 'row-off' };

const PREFS_KEY = 'globle:routes';
const centre = new Map(COUNTRIES.map((c) => [c.name, c]));

interface Named {
  name: string;
  cca2: string;
  verdict: Verdict;
  via?: string;
}

type GeoFeature = { properties: { name: string } };

export function initRoutesGame(root: HTMLElement) {
  const $ = <T extends HTMLElement = HTMLElement>(sel: string) => root.querySelector(sel) as T;
  const els = {
    globeMount: $('[data-globe]'),
    globeHint: root.querySelector('[data-globe-hint]'),
    lengthBtns: [...root.querySelectorAll<HTMLButtonElement>('[data-length]')],
    regionBtns: [...root.querySelectorAll<HTMLButtonElement>('[data-region]')],
    strip: $('[data-strip]'),
    par: $('[data-par]'),
    count: $('[data-count]'),
    limit: $('[data-limit]'),
    togo: $('[data-togo]'),
    form: $<HTMLFormElement>('[data-guess-form]'),
    input: $<HTMLInputElement>('[data-guess-input]'),
    submit: $<HTMLButtonElement>('[data-guess-form] button'),
    suggestBox: $('[data-suggest]'),
    hintBtns: [...root.querySelectorAll<HTMLButtonElement>('[data-hint]')],
    hintLeft: $('[data-hint-left]'),
    hintOut: $('[data-hint-out]'),
    log: $('[data-log]'),
    newBtn: $<HTMLButtonElement>('[data-new]'),
    live: $('[data-live]'),
    modal: $('[data-modal]'),
    modalEmoji: $('[data-modal-emoji]'),
    modalTitle: $('[data-modal-title]'),
    modalRoute: $('[data-modal-route]'),
    modalScore: $('[data-modal-score]'),
    modalExtra: $('[data-modal-extra]'),
    playAgain: $<HTMLButtonElement>('[data-play-again]'),
    shareBtn: $<HTMLButtonElement>('[data-share]'),
    reopen: root.querySelector<HTMLElement>('[data-reopen]'),
  };

  // ---- Preferences (remembered per browser) ----
  let length: RouteLength = 'medium';
  let region: RouteRegion = 'World';
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}');
    if (['short', 'medium', 'long'].includes(saved.length)) length = saved.length;
    if (els.regionBtns.some((b) => b.dataset.region === saved.region)) region = saved.region;
  } catch { /* private mode */ }
  const savePrefs = () => {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify({ length, region })); } catch { /* private mode */ }
  };

  // ---- Round state ----
  let route!: Route;
  let named: Named[] = [];
  let hinted = new Set<string>();
  let hintsLeft = 3;
  let over = false;
  let won = false;

  const modal = bindModal(els.modal, els.reopen);
  const limit = () => route.par + SPARE_GUESSES;
  const namedInGraph = () => new Set(named.filter((n) => route.graph.has(n.name)).map((n) => n.name));

  // ---- Globe ----
  // On narrow screens the globe sits under the guess box, so the route, the
  // input and the map share the first screen.
  const globeBlock = $('[data-globe-block]');
  const globeSlot = $('[data-globe-slot]');
  const narrow = matchMedia('(max-width: 900px)');
  const placeGlobe = () => (narrow.matches ? globeSlot.append(globeBlock) : root.prepend(globeBlock));
  placeGlobe();
  narrow.addEventListener('change', placeGlobe);

  const { globe, controls, lookAt } = createGlobe(els.globeMount);
  // The route has to stay where it was framed; idle spin would carry it away.
  controls.autoRotate = false;
  const verdictOf = new Map<string, Verdict>();
  globe
    .polygonCapColor((f: object) => capColor((f as GeoFeature).properties.name))
    .polygonStrokeColor(() => 'rgba(11,22,34,0.55)')
    .arcsData([])
    .arcColor(() => '#F4C95D')
    .arcStroke(0.9)
    .arcAltitudeAutoScale(0.25);

  function capColor(name: string): string {
    if (name === route?.start || name === route?.end) return COLOUR.end;
    const v = verdictOf.get(name);
    if (v === 'on') return COLOUR.on;
    if (v === 'near') return COLOUR.near;
    if (v) return COLOUR.off;
    if (hinted.has(name)) return COLOUR.hint;
    return COLOUR.base;
  }

  /** Arcs along every link whose two ends are both known: the start, the
   *  finish or a named country. The chain draws itself as it forms. */
  function drawArcs() {
    const known = new Set([route.start, route.end, ...namedInGraph()]);
    const arcs: object[] = [];
    for (const a of known) {
      for (const b of route.graph.get(a) ?? []) {
        if (a < b && known.has(b)) {
          const ca = centre.get(a)!, cb = centre.get(b)!;
          arcs.push({ startLat: ca.lat, startLng: ca.lng, endLat: cb.lat, endLng: cb.lng });
        }
      }
    }
    globe.arcsData(arcs);
  }

  function refreshGlobe() {
    globe.polygonCapColor((f: object) => capColor((f as GeoFeature).properties.name));
    drawArcs();
  }

  /** Frame the start and finish: halfway between, zoomed out with distance
   *  but never past the resting view, where the globe would look small. */
  function frameRoute() {
    const a = centre.get(route.start)!, b = centre.get(route.end)!;
    const span = Math.hypot(a.lat - b.lat, a.lng - b.lng);
    lookAt((a.lat + b.lat) / 2, (a.lng + b.lng) / 2, Math.min(1.9, Math.max(1.2, 1.1 + span / 60)));
  }

  fetch(WORLD_GEO_URL)
    .then((r) => r.json())
    .then((fc) => {
      globe.polygonsData(fc.features);
      els.globeHint?.remove();
      refreshGlobe();
    })
    .catch(() => {
      if (els.globeHint) els.globeHint.textContent = 'Could not load the globe.';
    });

  // ---- Rendering ----
  function renderChips() {
    els.lengthBtns.forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.length === length));
      b.disabled = !lengthAvailable(region, b.dataset.length as RouteLength);
    });
    els.regionBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.region === region)));
  }

  function renderStrip() {
    const { toGo } = completion(route, namedInGraph());
    const found = named
      .filter((n) => n.verdict === 'on')
      .sort((x, y) => route.fromStart.get(x.name)! - route.fromStart.get(y.name)!);
    const slot = (cls: string, label: string) => `<li class="slot ${cls}">${label}</li>`;
    els.strip.innerHTML =
      slot('slot-end', route.start) +
      found.map((n) => slot('slot-on', n.name)).join('') +
      Array.from({ length: Number.isFinite(toGo) ? toGo : 0 }, () => slot('slot-empty', '?')).join('') +
      slot('slot-end', route.end);
    els.par.textContent = String(route.par);
    els.count.textContent = String(named.length);
    els.limit.textContent = String(limit());
    els.togo.textContent = over ? '' : toGo === 1 ? '1 country to go' : `${toGo} countries to go`;
  }

  function renderHints() {
    els.hintLeft.textContent = `${hintsLeft} hint${hintsLeft === 1 ? '' : 's'}`;
  }

  function addRow(n: Named) {
    const li = document.createElement('li');
    li.className = `row ${ROW_CLASS[n.verdict]}`;
    const tip = n.verdict === 'near' && n.via ? `borders ${n.via}` : n.verdict === 'island' ? 'no land border in the game' : '';
    li.innerHTML =
      `<span class="row-flag">${flagImg(n.cca2)}</span>` +
      `<span class="row-name">${n.name}${tip ? `<span class="row-tip">${tip}</span>` : ''}</span>` +
      `<span class="row-verdict">${VERDICT_TEXT[n.verdict]}</span>`;
    els.log.prepend(li);
  }

  function setInputEnabled(on: boolean) {
    els.input.disabled = !on;
    els.submit.disabled = !on;
  }

  // ---- Rounds ----
  function newRound() {
    const dealt = dealRoute(Math.random, length, region);
    if (!dealt) return;
    route = dealt;
    named = [];
    hinted = new Set();
    hintsLeft = 3;
    over = false;
    won = false;
    verdictOf.clear();
    els.log.innerHTML = '';
    els.hintOut.hidden = true;
    els.hintOut.innerHTML = '';
    els.hintBtns.forEach((b) => (b.disabled = false));
    modal.reset();
    ac.clearError();
    setInputEnabled(true);
    renderChips();
    renderStrip();
    renderHints();
    refreshGlobe();
    frameRoute();
    announce(`New route: from ${route.start} to ${route.end}. Par ${route.par}.`);
  }

  function announce(msg: string) { els.live.textContent = msg; }

  // ---- Guessing ----
  const ac = bindAutocomplete({
    input: els.input,
    box: els.suggestBox,
    suggest: (q) => countriesDataset.suggest(q),
    icon: (c) => flagImg(c.cca2),
    onPick: (name) => submitGuess(name),
  });

  els.form.addEventListener('submit', (e) => {
    e.preventDefault();
    submitGuess(els.input.value);
  });

  function submitGuess(raw: string) {
    if (over) return;
    const value = raw.trim();
    if (!value) return;
    const country = countriesDataset.find(value);
    if (!country) { ac.error('Not a recognized country'); return; }
    if (country.name === route.start || country.name === route.end) { ac.error('That one is already on the map — name a country in between'); return; }
    if (named.some((n) => n.name === country.name)) { ac.error('Already guessed'); return; }

    const { verdict, via } = verdictFor(route, country.name);
    const entry: Named = { name: country.name, cca2: country.cca2, verdict, via };
    named.push(entry);
    verdictOf.set(country.name, verdict);
    hinted.delete(country.name);

    ac.clearError();
    els.input.value = '';
    ac.close();
    addRow(entry);
    refreshGlobe();

    const { toGo } = completion(route, namedInGraph());
    renderStrip();
    announce(`${country.name}: ${VERDICT_TEXT[verdict].replace(' ✓', '').toLowerCase()}${via ? `, borders ${via}` : ''}. ${toGo === 0 ? 'Route complete.' : `${toGo} to go.`}`);

    if (toGo === 0) finish(true);
    else if (named.length >= limit()) finish(false);
  }

  // ---- Hints ----
  els.hintBtns.forEach((btn) => btn.addEventListener('click', () => {
    if (over || hintsLeft === 0 || btn.disabled) return;
    const missing = completion(route, namedInGraph()).path.filter((n) => n !== route.start && n !== route.end && !namedInGraph().has(n));
    if (!missing.length) return;
    const kind = btn.dataset.hint;
    let line: string;
    if (kind === 'next') {
      hinted.add(missing[0]);
      line = 'The next country on the route is outlined in white on the globe.';
    } else if (kind === 'initials') {
      line = `Still to find: ${missing.map((n) => n[0]).join(' · ')}`;
    } else {
      missing.forEach((n) => hinted.add(n));
      line = 'Every country still missing is outlined in white on the globe.';
    }
    // Hints add up: a later one must not erase what an earlier one told you.
    els.hintOut.innerHTML += `<span>${line}</span>`;
    els.hintOut.hidden = false;
    btn.disabled = true;
    hintsLeft--;
    renderHints();
    refreshGlobe();
  }));

  // ---- Round end ----
  function finish(didWin: boolean) {
    over = true;
    won = didWin;
    setInputEnabled(false);
    els.hintBtns.forEach((b) => (b.disabled = true));
    const solution = completion(route, namedInGraph()).path;
    if (!didWin) {
      // Reveal one shortest finish so the loss still teaches the route.
      solution.forEach((n) => { if (!verdictOf.has(n) && n !== route.start && n !== route.end) hinted.add(n); });
    }
    refreshGlobe();
    renderStrip();

    const over_ = named.length - route.par;
    els.modalEmoji.textContent = didWin ? (over_ === 0 ? '🎯' : '🎉') : '🧭';
    els.modalTitle.textContent = didWin ? (over_ === 0 ? 'Perfect route!' : 'Route complete!') : 'Out of guesses';
    els.modalRoute.textContent = didWin ? `${route.start} → ${route.end}` : `One shortest route: ${solution.join(' → ')}`;
    els.modalScore.textContent = didWin
      ? `${named.length} guesses · par ${route.par}${over_ ? ` (+${over_})` : ' — no wasted guesses'}`
      : `Par was ${route.par}. The missing countries are outlined on the globe.`;
    if (didWin) {
      const s = recordWin('routes', over_);
      els.modalExtra.textContent = `Best: par +${s.bestGuesses} · Routes finished: ${s.played}`;
      els.modalExtra.hidden = false;
    } else {
      recordLoss('routes');
      els.modalExtra.hidden = true;
    }
    modal.open();
    frameRoute();
  }

  bindShare(els.shareBtn, () => {
    const over_ = named.length - route.par;
    const line = won
      ? `Globle Routes: ${route.start} → ${route.end} in ${named.length} (par ${route.par}${over_ ? `, +${over_}` : ''})`
      : `Globle Routes: ${route.start} → ${route.end} beat me (par ${route.par})`;
    return `${line} https://globleunlimited.net/routes/`;
  });

  // ---- Controls ----
  els.lengthBtns.forEach((b) => b.addEventListener('click', () => {
    length = b.dataset.length as RouteLength;
    savePrefs();
    newRound();
  }));
  els.regionBtns.forEach((b) => b.addEventListener('click', () => {
    region = b.dataset.region as RouteRegion;
    if (!lengthAvailable(region, length)) length = 'short';
    savePrefs();
    newRound();
  }));
  els.newBtn.addEventListener('click', newRound);
  els.playAgain.addEventListener('click', () => { newRound(); els.input.focus(); });

  newRound();
}
