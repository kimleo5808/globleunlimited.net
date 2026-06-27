// Client-side controller wiring globe.gl to the GameEngine + DOM.
import Globe from 'globe.gl';
import * as THREE from 'three';
import { GameEngine, dateSeed } from '../../lib/game/engine';
import { flag, countriesDataset } from '../../lib/game/countries';
import { capitalsDataset } from '../../lib/game/capitals';
import { haversine } from '../../lib/game/distance';
import {
  recordWin,
  getStats,
  isDailyDone,
  setDailyDone,
  getDaily,
  todayISO,
  isYesterday,
} from '../../lib/game/stats';
import { formatDistance, getUnit, SETTINGS_EVENT } from '../../lib/settings';
import type { Guessable, Dataset, Guess, GameMode } from '../../lib/game/types';

const LAND_BASE = 'rgba(232, 217, 181, 0.18)'; // unguessed land tint
const TEXTURE = '/assets/textures/earth-day-4k.jpg'; // vivid daytime satellite map
const GEO_URL = '/assets/data/world.geo.json';

type GeoFeature = { properties: { name: string; cca2: string } };

interface Els {
  root: HTMLElement;
  form: HTMLFormElement;
  input: HTMLInputElement;
  suggestBox: HTMLElement;
  globeMount: HTMLElement;
  hint: HTMLElement | null;
  closestVal: HTMLElement;
  borderVal: HTMLElement;
  guessVal: HTMLElement;
  list: HTMLElement;
  modal: HTMLElement;
  modalGuesses: HTMLElement;
  modalCountry: HTMLElement;
  modalExtra: HTMLElement;
  playAgain: HTMLButtonElement;
  dailyCta: HTMLElement;
  shareBtn: HTMLButtonElement;
  streakCell: HTMLElement;
  streakVal: HTMLElement;
  live: HTMLElement;
}

export function initGlobeGame(root: HTMLElement) {
  const $ = <T extends HTMLElement = HTMLElement>(sel: string) =>
    root.querySelector(sel) as T;

  const mode = (root.dataset.mode as GameMode) || 'unlimited';
  const today = todayISO();

  const els: Els = {
    root,
    form: $('[data-guess-form]'),
    input: $('[data-guess-input]'),
    suggestBox: $('[data-suggest]'),
    globeMount: $('[data-globe]'),
    hint: root.querySelector('[data-globe-hint]'),
    closestVal: $('[data-closest]'),
    borderVal: $('[data-border]'),
    guessVal: $('[data-guesscount]'),
    list: $('[data-list]'),
    modal: $('[data-modal]'),
    modalGuesses: $('[data-modal-guesses]'),
    modalCountry: $('[data-modal-country]'),
    modalExtra: $('[data-modal-extra]'),
    playAgain: $('[data-play-again]'),
    dailyCta: $('[data-daily-cta]'),
    shareBtn: $('[data-share]'),
    streakCell: $('[data-streak-cell]'),
    streakVal: $('[data-streak]'),
    live: $('[data-live]'),
  };

  const isCapitals = mode === 'capitals';
  const dataset: Dataset = isCapitals ? capitalsDataset : countriesDataset;

  if (isCapitals) {
    els.input.placeholder = 'Enter capital city…';
    els.input.setAttribute('aria-label', 'Enter capital city name');
    els.globeMount.setAttribute('aria-label', 'Interactive globe showing your guessed capitals');
    const borderLabel = root.querySelector('[data-border-label]');
    if (borderLabel) borderLabel.textContent = 'Distance'; // capitals are points, not borders
  }

  // Daily mode: seed the engine so the whole world shares today's country.
  // Countries use real border-to-border distance; capitals use point distance.
  const engine =
    mode === 'daily'
      ? new GameEngine('daily', dateSeed(today), countriesDataset, borderDistanceKm)
      : new GameEngine(mode, undefined, dataset, isCapitals ? undefined : borderDistanceKm);

  // Daily shows the streak; "Play Again" becomes "Play Unlimited".
  if (mode === 'daily') {
    els.streakCell.hidden = false;
    els.streakVal.textContent = String(getStats('daily').currentStreak);
    els.playAgain.hidden = true;
    els.dailyCta.hidden = false;
  }
  const colorByName = new Map<string, string>(); // guessed country -> heat colour (countries mode)
  // Guessed capital markers (capitals mode)
  const points: Array<{ lat: number; lng: number; color: string; label: string }> = [];
  let features: GeoFeature[] = [];
  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Country boundary points (flattened [lat,lng,...]) for real border-to-border distance.
  const polyByName = new Map<string, Float64Array>();
  const FAR_KM = 3500; // beyond this, centroid distance is close enough for colouring

  /** Border-to-border distance (km) between two countries; falls back to centroid. */
  function borderDistanceKm(a: Guessable, b: Guessable): number {
    const c = haversine(a.lat, a.lng, b.lat, b.lng);
    if (c > FAR_KM) return c;
    const pa = polyByName.get(a.name);
    const pb = polyByName.get(b.name);
    if (!pa || !pb) return c;
    let min = c;
    for (let i = 0; i < pa.length; i += 2) {
      const la = pa[i], lo = pa[i + 1];
      for (let j = 0; j < pb.length; j += 2) {
        const d = haversine(la, lo, pb[j], pb[j + 1]);
        if (d < min) {
          min = d;
          if (min < 10) return min;
        }
      }
    }
    return min;
  }

  /** Flatten a GeoJSON geometry to [lat,lng,...], downsampled to ~400 points. */
  function flattenGeometry(geom: any): Float64Array {
    const pts: number[] = [];
    const polys = geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates];
    for (const poly of polys) {
      for (const ring of poly) {
        for (const [lng, lat] of ring) pts.push(lat, lng);
      }
    }
    const maxPts = 400;
    const total = pts.length / 2;
    if (total <= maxPts) return Float64Array.from(pts);
    const stride = Math.ceil(total / maxPts);
    const out: number[] = [];
    for (let i = 0; i < total; i += stride) out.push(pts[i * 2], pts[i * 2 + 1]);
    return Float64Array.from(out);
  }

  // ---- Globe ----
  const globe = new Globe(els.globeMount)
    .backgroundColor('rgba(0,0,0,0)')
    .showAtmosphere(true)
    .atmosphereColor('#cfe6ff')
    .atmosphereAltitude(0.22)
    .globeImageUrl(TEXTURE)
    .polygonAltitude(0.008)
    .polygonCapColor((f) => capColor(f as GeoFeature))
    .polygonSideColor(() => 'rgba(0,0,0,0.10)')
    .polygonStrokeColor(() => (isCapitals ? 'rgba(244,201,93,0.35)' : 'rgba(11,22,34,0.55)'))
    .pointsData([])
    .pointLat('lat')
    .pointLng('lng')
    .pointColor('color')
    .pointAltitude(0.013)
    .pointRadius(0.6)
    .pointLabel('label');

  function capColor(f: GeoFeature): string {
    if (isCapitals) return 'rgba(232, 217, 181, 0.10)'; // faint land; markers carry the colour
    const name = f.properties.name;
    if (engine.won && name === engine.target.name) return '#2E9E4F';
    return colorByName.get(name) ?? LAND_BASE;
  }

  function refreshPoints() {
    globe.pointsData([...points]);
  }

  // controls: auto-rotate when idle, zoom on
  const controls = globe.controls() as any;
  controls.enableZoom = true;
  controls.autoRotate = !prefersReduced;
  controls.autoRotateSpeed = 0.55;
  controls.minDistance = 180;
  controls.maxDistance = 520;
  controls.addEventListener('start', () => (controls.autoRotate = false));

  // Bright, even lighting so the whole globe stays vivid (no dark night side).
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.3);
  keyLight.position.set(1, 0.6, 1);
  globe.lights([new THREE.AmbientLight(0xffffff, 2.7), keyLight]);

  // Slightly richer texture rendering.
  const mat = globe.globeMaterial() as THREE.MeshPhongMaterial;
  mat.shininess = 6;
  mat.specular = new THREE.Color(0x111418);

  function fitSize() {
    const w = els.globeMount.clientWidth;
    globe.width(w).height(w);
  }
  fitSize();
  new ResizeObserver(fitSize).observe(els.globeMount);
  const HOME_ALTITUDE = 1.85; // lower = globe fills more of the frame
  globe.pointOfView({ lat: 20, lng: 0, altitude: HOME_ALTITUDE }, 0);

  // load polygons
  fetch(GEO_URL)
    .then((r) => r.json())
    .then((fc) => {
      features = fc.features;
      globe.polygonsData(features);
      // Index boundary points for border-distance (countries modes only).
      if (!isCapitals) {
        for (const f of features) {
          polyByName.set((f as any).properties.name, flattenGeometry((f as any).geometry));
        }
      }
      els.hint?.remove();
      els.input.disabled = false;
      (els.form.querySelector('button') as HTMLButtonElement).disabled = false;
      // Daily already solved today → show the locked, revealed state.
      if (mode === 'daily' && isDailyDone(today)) {
        engine.won = true;
        colorByName.set(engine.target.name, '#2E9E4F');
        refreshGlobe();
        focusCountry(engine.target);
        showDailyDone();
      }
    })
    .catch(() => {
      if (els.hint) els.hint.textContent = 'Could not load map data.';
    });

  // ---- Rendering helpers ----
  const km = (n: number) => formatDistance(n);

  function refreshGlobe() {
    globe.polygonCapColor((f) => capColor(f as GeoFeature));
  }

  function focusCountry(c: Guessable) {
    globe.pointOfView({ lat: c.lat, lng: c.lng, altitude: 1.9 }, prefersReduced ? 0 : 700);
  }

  function renderInfo() {
    const closest = engine.closest;
    els.closestVal.innerHTML = closest
      ? `${flag(closest.country.cca2)} ${closest.country.name}`
      : '—';
    els.borderVal.textContent = closest ? km(closest.distanceKm) : `— ${getUnit()}`;
    els.guessVal.textContent = String(engine.guessCount);
  }

  /** Rebuild the whole guess list (used after a unit change). */
  function renderList() {
    els.list.innerHTML = '';
    engine.guesses.forEach((g) => addRow(g)); // prepend each → newest on top
  }

  // Re-render distances when the user switches km/mi.
  window.addEventListener(SETTINGS_EVENT, () => {
    renderList();
    renderInfo();
  });

  function addRow(g: Guess, prepend = true) {
    const row = document.createElement('li');
    row.className = 'guess-row';
    row.innerHTML =
      `<span class="swatch" style="background:${g.color}"></span>` +
      `<span class="g-flag">${flag(g.country.cca2)}</span>` +
      `<span class="g-name">${g.country.name}</span>` +
      `<span class="g-dist mono">${g.correct ? 'Correct!' : km(g.distanceKm)}</span>`;
    if (g.correct) row.classList.add('is-correct');
    if (prepend) els.list.prepend(row);
    else els.list.append(row);
  }

  function announce(msg: string) {
    els.live.textContent = msg;
  }

  // ---- Guess submit ----
  els.form.addEventListener('submit', (e) => {
    e.preventDefault();
    submitGuess(els.input.value);
  });

  function submitGuess(raw: string) {
    const value = raw.trim();
    if (!value) return;
    const out = engine.guess(value);

    if (out.status === 'invalid') {
      const known = dataset.find(value);
      flashError(known ? 'Game over — press Play Again.' : isCapitals ? 'Not a recognized capital' : 'Not a recognized country');
      return;
    }
    if (out.status === 'duplicate') {
      flashError('Already guessed');
      return;
    }

    if (isCapitals) {
      points.push({
        lat: out.guess.country.lat,
        lng: out.guess.country.lng,
        color: out.guess.color,
        label: out.guess.country.name,
      });
      refreshPoints();
    } else {
      colorByName.set(out.guess.country.name, out.guess.color);
      refreshGlobe();
    }
    clearError();
    els.input.value = '';
    closeSuggest();
    addRow(out.guess);
    renderInfo();
    focusCountry(out.guess.country);
    announce(`${out.guess.country.name}, ${out.guess.correct ? 'correct' : km(out.guess.distanceKm) + ' away'}`);

    if (out.won) onWin();
  }

  function onWin() {
    refreshGlobe();
    // Record stats (streak only meaningful for daily).
    if (mode === 'daily') {
      const prev = getDaily();
      const resetStreak = !prev || !isYesterday(prev.date, today);
      const s = recordWin('daily', engine.guessCount, resetStreak);
      setDailyDone({ date: today, guesses: engine.guessCount, country: engine.target.name });
      els.streakVal.textContent = String(s.currentStreak);
      els.modalExtra.textContent = `🔥 Daily streak: ${s.currentStreak} (best ${s.maxStreak})`;
      els.modalExtra.hidden = false;
    } else if (mode !== 'practice') {
      const s = recordWin(mode, engine.guessCount);
      els.modalExtra.textContent =
        s.bestGuesses != null ? `Best: ${s.bestGuesses} guesses · Played: ${s.played}` : '';
      els.modalExtra.hidden = !els.modalExtra.textContent;
    }
    els.modalGuesses.textContent = String(engine.guessCount);
    els.modalCountry.innerHTML = `${flag(engine.target.cca2)} ${engine.target.name}`;
    els.modal.hidden = false;
    if (!prefersReduced) controls.autoRotate = false;
  }

  /** Daily already solved today → reveal answer + lock input. */
  function showDailyDone() {
    const rec = getDaily();
    if (!rec) return;
    els.input.disabled = true;
    (els.form.querySelector('button') as HTMLButtonElement).disabled = true;
    els.modalGuesses.textContent = String(rec.guesses);
    els.modalCountry.innerHTML = `${flag(engine.target.cca2)} ${engine.target.name}`;
    const s = getStats('daily');
    els.modalExtra.textContent = `🔥 Daily streak: ${s.currentStreak} (best ${s.maxStreak}) · Come back tomorrow!`;
    els.modalExtra.hidden = false;
    els.modal.hidden = false;
  }

  // ---- Play again (Unlimited core) ----
  els.playAgain.addEventListener('click', () => {
    engine.reset();
    colorByName.clear();
    points.length = 0;
    refreshPoints();
    els.list.innerHTML = '';
    els.modal.hidden = true;
    clearError();
    renderInfo();
    refreshGlobe();
    globe.pointOfView({ lat: 20, lng: 0, altitude: HOME_ALTITUDE }, prefersReduced ? 0 : 700);
    if (!prefersReduced) controls.autoRotate = true;
    els.input.focus();
  });

  els.shareBtn.addEventListener('click', async () => {
    const noun = isCapitals ? 'mystery capital' : 'mystery country';
    const text = `I found the ${noun} in ${engine.guessCount} guesses on Globle Unlimited! https://globleunlimited.net`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        els.shareBtn.textContent = 'Copied!';
        setTimeout(() => (els.shareBtn.textContent = 'Share'), 1500);
      }
    } catch { /* user cancelled */ }
  });

  // ---- Errors ----
  function flashError(msg: string) {
    els.input.setAttribute('aria-invalid', 'true');
    els.suggestBox.innerHTML = `<div class="suggest-error">${msg}</div>`;
    els.suggestBox.hidden = false;
  }
  function clearError() {
    els.input.removeAttribute('aria-invalid');
  }

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

  renderInfo();
}
