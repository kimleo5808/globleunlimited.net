// Client controller for the Map Quiz: Click mode (find the named country),
// Type mode (name the highlighted one) and Learn mode (tap for facts), over an
// SVG map built from /assets/data/map-quiz/{region}.json (see
// scripts/build-map-quiz.mjs). Wheel, drag, pinch and button zoom.
import { flagImg } from '../../lib/game/flag-img';
import { getMapQuizBests, recordMapQuiz } from '../../lib/game/stats';
import type { Guessable } from '../../lib/game/types';
import { bindAutocomplete, bindModal, bindShare } from './shared';

interface Item {
  id: string;
  name: string;
  aliases: string[];
  sub: string;
  d?: string;
  ring?: [number, number];
  cx: number;
  cy: number;
  bw: number;
  bh: number;
  facts: Array<[string, string]>;
}
interface RegionData {
  region: string;
  label: string;
  width: number;
  height: number;
  items: Item[];
  context: string[];
}
type Mode = 'click' | 'type' | 'learn';
type Status = 'found' | 'late' | 'missed';

/** Wrong answers allowed before the quiz shows where the country is. */
const MAX_TRIES = 3;
/** On-screen size below which an outline also gets a tap ring, and the ring's radius. */
const MIN_SCREEN_PX = 12;
const RING_SCREEN_PX = 10;
const MAX_ZOOM = 10;
const STATE_CLASSES = ['found', 'late', 'missed', 'wrong', 'target', 'reveal', 'picked'];

// Same rules as src/lib/game/countries.ts, kept local so this island does not
// pull the whole country table into its bundle.
const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const shuffle = <T,>(a: T[]) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export function initMapQuiz(root: HTMLElement) {
  const $ = <T extends Element = HTMLElement>(sel: string) => root.querySelector(sel) as T;
  const region = root.dataset.region!;
  const noun = root.dataset.noun ?? 'country';
  const els = {
    modeBtns: [...root.querySelectorAll<HTMLButtonElement>('[data-mode]')],
    askLabel: $('[data-ask-label]'),
    askName: $('[data-ask-name]'),
    askNote: $('[data-ask-note]'),
    typeForm: $<HTMLFormElement>('[data-type-form]'),
    typeInput: $<HTMLInputElement>('[data-type-input]'),
    suggestBox: $('[data-suggest]'),
    found: $('[data-found]'),
    accuracy: $('[data-accuracy]'),
    time: $('[data-time]'),
    skip: $<HTMLButtonElement>('[data-skip]'),
    wrap: $('[data-map-wrap]'),
    svg: $<SVGSVGElement>('[data-map]'),
    hint: $('[data-map-hint]'),
    zoomBtns: [...root.querySelectorAll<HTMLButtonElement>('[data-zoom]')],
    info: $('[data-info]'),
    infoName: $('[data-info-name]'),
    infoFacts: $('[data-info-facts]'),
    infoClose: $<HTMLButtonElement>('[data-info-close]'),
    live: $('[data-live]'),
    modal: $('[data-modal]'),
    modalEmoji: $('[data-modal-emoji]'),
    modalTitle: $('[data-modal-title]'),
    modalScore: $('[data-modal-score]'),
    modalBest: $('[data-modal-best]'),
    modalMissed: $('[data-modal-missed]'),
    retry: $<HTMLButtonElement>('[data-retry]'),
    playAgain: $<HTMLButtonElement>('[data-play-again]'),
    shareBtn: $<HTMLButtonElement>('[data-share]'),
    reopen: root.querySelector<HTMLElement>('[data-reopen]'),
  };
  const modal = bindModal(els.modal, els.reopen);
  const icon = (id: string) => (region === 'us-states' ? `<span class="g-abbr">${id}</span>` : flagImg(id));

  let data!: RegionData;
  let byId = new Map<string, Item>();
  const pathEl = new Map<string, SVGPathElement>();
  const ringEl = new Map<string, SVGCircleElement>();

  // ---- Quiz state ----
  let mode: Mode = 'click';
  let queue: Item[] = [];
  let current: Item | null = null;
  let tries = 0;
  let status = new Map<string, Status>();
  let firstTry = 0;
  let answered = 0;
  let total = 0;
  let started = 0;
  let elapsed = 0;
  let timer = 0;
  let locked = false;
  let done = false;

  // ---- View (viewBox) ----
  // The viewBox always takes the element's own shape, so a map unit is as many
  // pixels across as down and a wide screen shows more geography to the sides
  // (the build draws some past each edge) instead of a letterbox.
  let vx = 0, vy = 0, vw = 1, vh = 1;
  let aspect = 1; // element height / width
  const pxPerUnit = () => els.svg.getBoundingClientRect().width / vw || 1;

  /** The zoomed-out view: the whole map, widened to the element's shape. */
  function homeView() {
    const w = Math.max(data.width, data.height / aspect);
    const h = w * aspect;
    return { x: (data.width - w) / 2, y: (data.height - h) / 2, w, h };
  }

  function setView(x: number, y: number, w: number) {
    const home = homeView();
    w = Math.min(home.w, Math.max(data.width / MAX_ZOOM, w));
    const h = w * aspect;
    vx = Math.min(Math.max(home.x, x), home.x + home.w - w);
    vy = Math.min(Math.max(home.y, y), home.y + home.h - h);
    vw = w;
    vh = h;
    els.svg.setAttribute('viewBox', `${vx} ${vy} ${vw} ${vh}`);
    drawRings();
  }
  function resetView() {
    const home = homeView();
    setView(home.x, home.y, home.w);
  }
  /** Re-read the element's shape, keeping the zoom level and centre. */
  function measure() {
    const r = els.svg.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const zoom = homeView().w / vw;
    const cx = vx + vw / 2, cy = vy + vh / 2;
    aspect = r.height / r.width;
    const w = homeView().w / zoom;
    setView(cx - w / 2, cy - (w * aspect) / 2, w);
  }

  /** Zoom by `factor` keeping the map point under (sx, sy) screen px fixed. */
  function zoomAt(factor: number, sx?: number, sy?: number) {
    const r = els.svg.getBoundingClientRect();
    const fx = sx === undefined ? 0.5 : (sx - r.left) / r.width;
    const fy = sy === undefined ? 0.5 : (sy - r.top) / r.height;
    const mx = vx + fx * vw, my = vy + fy * vh;
    const w = vw / factor;
    setView(mx - fx * w, my - fy * w * aspect, w);
  }

  /** Make sure a small target is big enough to see (Type mode). */
  function focusOn(it: Item) {
    const size = Math.max(it.bw, it.bh) * pxPerUnit();
    if (size >= 28) return;
    const w = Math.max(Math.max(it.bw, it.bh, 2) * 18, data.width / MAX_ZOOM);
    setView(it.cx - w / 2, it.cy - (w * aspect) / 2, w);
  }

  // ---- Drawing ----
  function drawMap() {
    const ns = 'http://www.w3.org/2000/svg';
    els.svg.innerHTML = '';
    const ctx = document.createElementNS(ns, 'g');
    ctx.innerHTML = data.context.map((d) => `<path class="ctx" d="${d}"/>`).join('');
    const items = document.createElementNS(ns, 'g');
    const rings = document.createElementNS(ns, 'g');
    rings.setAttribute('data-rings', '');
    els.svg.append(ctx, items, rings);
    for (const it of data.items) {
      if (it.d) {
        const p = document.createElementNS(ns, 'path');
        p.setAttribute('d', it.d);
        p.setAttribute('class', 'it');
        p.dataset.id = it.id;
        items.append(p);
        pathEl.set(it.id, p);
      }
      const c = document.createElementNS(ns, 'circle');
      c.setAttribute('class', 'ring');
      c.dataset.id = it.id;
      c.setAttribute('cx', String(it.ring?.[0] ?? it.cx));
      c.setAttribute('cy', String(it.ring?.[1] ?? it.cy));
      rings.append(c);
      ringEl.set(it.id, c);
    }
  }

  /** Rings for whatever is too small to tap at the current zoom; constant on-screen size. */
  function drawRings() {
    const k = pxPerUnit();
    for (const it of data?.items ?? []) {
      const c = ringEl.get(it.id)!;
      const needed = !it.d || Math.max(it.bw, it.bh) * k < MIN_SCREEN_PX;
      c.style.display = needed ? '' : 'none';
      c.setAttribute('r', String(RING_SCREEN_PX / k));
    }
  }

  function setState(id: string, ...classes: string[]) {
    for (const el of [pathEl.get(id), ringEl.get(id)]) {
      if (!el) continue;
      el.classList.remove(...STATE_CLASSES);
      el.classList.add(...classes);
    }
  }
  const restoreState = (id: string) => setState(id, ...(status.has(id) ? [status.get(id)!] : []));

  // ---- Prompt / tally ----
  function renderTally() {
    els.found.textContent = `${answered} / ${total}`;
    els.accuracy.textContent = answered ? `${Math.round((firstTry / answered) * 100)}%` : '—';
    els.time.textContent = clock(elapsed);
  }
  const note = (msg: string, ok = false) => {
    els.askNote.textContent = msg;
    els.askNote.classList.toggle('ok', ok);
  };
  const announce = (msg: string) => { els.live.textContent = msg; };

  function startClock() {
    if (started) return;
    started = Date.now() - elapsed * 1000;
    timer = window.setInterval(() => {
      elapsed = Math.floor((Date.now() - started) / 1000);
      els.time.textContent = clock(elapsed);
    }, 1000);
  }
  function stopClock() {
    clearInterval(timer);
    timer = 0;
  }

  function renderPrompt() {
    els.modeBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    els.typeForm.hidden = mode !== 'type';
    els.skip.hidden = mode === 'learn';
    if (mode === 'learn') {
      els.askLabel.textContent = 'Learn mode';
      els.askName.textContent = `Tap any ${noun} for its facts`;
      return;
    }
    els.askLabel.textContent = mode === 'click' ? 'Click on' : `Name the highlighted ${noun}`;
    els.askName.textContent = current ? (mode === 'click' ? current.name : '') : '—';
    els.askName.hidden = mode === 'type';
  }

  // ---- Rounds ----
  function startQuiz(items: Item[]) {
    stopClock();
    queue = shuffle([...items]);
    for (const it of items) { status.delete(it.id); restoreState(it.id); }
    total = answered + queue.length;
    done = false;
    locked = false;
    modal.reset();
    next();
  }

  function fullReset() {
    status = new Map();
    firstTry = answered = 0;
    elapsed = 0;
    started = 0;
    for (const it of data.items) restoreState(it.id);
    els.info.hidden = true;
    note('');
  }

  function next() {
    if (current) restoreState(current.id);
    current = queue.shift() ?? null;
    tries = 0;
    locked = false;
    renderTally();
    if (!current) { finish(); return; }
    if (mode === 'type') {
      setState(current.id, 'target');
      focusOn(current);
      els.typeInput.value = '';
      els.typeInput.focus({ preventScroll: true });
      announce(`Highlighted ${noun} ${answered + 1} of ${total}. Type its name.`);
    } else {
      announce(`Find ${current.name}. ${answered + 1} of ${total}.`);
    }
    renderPrompt();
  }

  function score(it: Item, s: Status) {
    status.set(it.id, s);
    setState(it.id, s);
    answered++;
    if (s === 'found') firstTry++;
  }

  /** Too many misses or a skip: show where it was, then move on. */
  function reveal(it: Item, msg: string) {
    locked = true;
    status.set(it.id, 'missed');
    answered++;
    setState(it.id, 'reveal');
    note(msg);
    renderTally();
    announce(msg);
    setTimeout(() => { restoreState(it.id); next(); }, 1300);
  }

  function pick(id: string) {
    const it = byId.get(id);
    if (!it) return;
    if (mode === 'learn') { showInfo(it); return; }
    if (mode !== 'click' || !current || locked || done) return;
    startClock();
    if (id === current.id) {
      score(current, tries === 0 ? 'found' : 'late');
      note(tries === 0 ? '✓ First try' : '✓ Found', true);
      next();
      return;
    }
    tries++;
    setState(id, 'wrong');
    setTimeout(() => restoreState(id), 600);
    if (tries >= MAX_TRIES) reveal(current, `It was here — that one was ${it.name}.`);
    else note(`That’s ${it.name}. ${MAX_TRIES - tries} ${MAX_TRIES - tries === 1 ? 'try' : 'tries'} left.`);
  }

  // ---- Type mode ----
  const lookup = () => {
    const m = new Map<string, Item>();
    for (const it of data.items) {
      m.set(normalize(it.name), it);
      for (const a of it.aliases) if (!m.has(a)) m.set(a, it);
    }
    return m;
  };
  let names = new Map<string, Item>();
  const asGuessable = (it: Item): Guessable => ({ name: it.name, cca2: it.id, lat: 0, lng: 0, aliases: it.aliases });
  const ac = bindAutocomplete({
    input: els.typeInput,
    box: els.suggestBox,
    suggest: (q) => {
      const n = normalize(q);
      if (!n) return [];
      const starts = data.items.filter((it) => normalize(it.name).startsWith(n));
      const contains = data.items.filter((it) => !normalize(it.name).startsWith(n) && normalize(it.name).includes(n));
      return [...starts, ...contains].slice(0, 6).map(asGuessable);
    },
    icon: (g) => icon(g.cca2),
    onPick: (name) => submitName(name),
  });
  els.typeForm.addEventListener('submit', (e) => { e.preventDefault(); submitName(els.typeInput.value); });

  function submitName(raw: string) {
    if (mode !== 'type' || !current || locked || done) return;
    const it = names.get(normalize(raw));
    ac.close();
    if (!raw.trim()) return;
    if (!it) { ac.error(`Not a ${noun} in this quiz`); return; }
    ac.clearError();
    startClock();
    els.typeInput.value = '';
    if (it.id === current.id) {
      score(current, tries === 0 ? 'found' : 'late');
      note(`✓ ${current.name}`, true);
      next();
      return;
    }
    tries++;
    if (tries >= MAX_TRIES) reveal(current, `It was ${current.name}.`);
    else note(`Not ${it.name}. ${MAX_TRIES - tries} ${MAX_TRIES - tries === 1 ? 'try' : 'tries'} left.`);
  }

  // ---- Learn mode ----
  let picked: string | null = null;
  function showInfo(it: Item) {
    if (picked) restoreState(picked);
    picked = it.id;
    setState(it.id, 'picked');
    els.infoName.innerHTML = `${icon(it.id)} ${it.name}`;
    els.infoFacts.innerHTML = it.facts.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
    els.info.hidden = false;
    announce(`${it.name}. ${it.facts.map(([k, v]) => `${k}: ${v}`).join('. ')}`);
  }
  els.infoClose.addEventListener('click', () => {
    els.info.hidden = true;
    if (picked) restoreState(picked);
    picked = null;
  });

  // ---- End ----
  function finish() {
    done = true;
    stopClock();
    renderPrompt();
    const accuracy = total ? Math.round((firstTry / total) * 100) : 0;
    const best = recordMapQuiz(region, accuracy, elapsed);
    const misses = data.items.filter((it) => status.get(it.id) === 'missed' || status.get(it.id) === 'late');
    els.modalEmoji.textContent = accuracy === 100 ? '🏆' : '🗺️';
    els.modalTitle.textContent = accuracy === 100 ? 'Perfect map!' : `${data.label} complete!`;
    els.modalScore.textContent = `${firstTry} of ${total} on the first try · ${accuracy}% · ${clock(elapsed)}`;
    els.modalBest.textContent = `Best: ${best.accuracy}% in ${clock(best.seconds)} · ${best.plays} ${best.plays === 1 ? 'play' : 'plays'}`;
    els.modalMissed.textContent = misses.length ? `To practise: ${misses.map((m) => m.name).join(', ')}` : 'No misses at all.';
    els.retry.hidden = !misses.length;
    note('');
    modal.open();
  }

  bindShare(els.shareBtn, () => {
    const accuracy = total ? Math.round((firstTry / total) * 100) : 0;
    const path = region === 'world' ? '/map-quiz/' : `/map-quiz/${region}/`;
    return `${data.label} Map Quiz: ${firstTry}/${total} on the first try (${accuracy}%) in ${clock(elapsed)} https://globleunlimited.net${path}`;
  });

  els.retry.addEventListener('click', () => {
    const missed = data.items.filter((it) => status.get(it.id) === 'missed' || status.get(it.id) === 'late');
    firstTry = answered = 0;
    elapsed = 0;
    started = 0;
    status = new Map();
    for (const it of data.items) restoreState(it.id);
    startQuiz(missed);
  });
  els.playAgain.addEventListener('click', () => { fullReset(); startQuiz(data.items); });
  els.skip.addEventListener('click', () => {
    if (!current || locked || done || mode === 'learn') return;
    startClock();
    reveal(current, `Skipped — that was ${current.name}.`);
  });

  els.modeBtns.forEach((b) => b.addEventListener('click', () => {
    const m = b.dataset.mode as Mode;
    if (m === mode) return;
    if (current) restoreState(current.id);
    mode = m;
    fullReset();
    stopClock();
    if (mode === 'learn') {
      current = null;
      queue = [];
      done = true;
      modal.reset();
      renderPrompt();
      renderTally();
    } else {
      startQuiz(data.items);
    }
  }));

  // ---- Pointer: tap to pick, drag to pan, pinch / wheel to zoom ----
  const pointers = new Map<number, { x: number; y: number }>();
  let downAt: { x: number; y: number; id?: string } | null = null;
  let moved = false;
  let pinchDist = 0;

  els.svg.addEventListener('pointerdown', (e) => {
    // Capture keeps a drag alive when the pointer leaves the map; it can throw
    // for pointers the browser no longer tracks, which must not cost the tap.
    try { els.svg.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      downAt = { x: e.clientX, y: e.clientY, id: (e.target as Element).getAttribute('data-id') ?? undefined };
      moved = false;
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      moved = true;
    }
  });
  els.svg.addEventListener('pointermove', (e) => {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDist) zoomAt(dist / pinchDist, (a.x + b.x) / 2, (a.y + b.y) / 2);
      pinchDist = dist;
      return;
    }
    if (downAt && !moved && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 5) {
      moved = true;
      els.svg.classList.add('dragging');
    }
    if (moved) {
      const k = pxPerUnit();
      setView(vx - (e.clientX - prev.x) / k, vy - (e.clientY - prev.y) / k, vw);
    }
  });
  const endPointer = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    if (pointers.size === 0) {
      if (downAt && !moved && downAt.id) pick(downAt.id);
      downAt = null;
      moved = false;
      pinchDist = 0;
      els.svg.classList.remove('dragging');
    }
  };
  els.svg.addEventListener('pointerup', endPointer);
  els.svg.addEventListener('pointercancel', endPointer);
  els.svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoomAt(e.deltaY < 0 ? 1.25 : 1 / 1.25, e.clientX, e.clientY);
  }, { passive: false });
  els.zoomBtns.forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.zoom === 'in') zoomAt(1.5);
    else if (b.dataset.zoom === 'out') zoomAt(1 / 1.5);
    else resetView();
  }));
  new ResizeObserver(() => data && measure()).observe(els.svg);

  // ---- Boot ----
  fetch(`/assets/data/map-quiz/${region}.json`)
    .then((r) => r.json())
    .then((d: RegionData) => {
      data = d;
      byId = new Map(d.items.map((it) => [it.id, it]));
      names = lookup();
      drawMap();
      const r = els.svg.getBoundingClientRect();
      aspect = r.width && r.height ? r.height / r.width : d.height / d.width;
      resetView();
      els.hint.textContent = '';
      const best = getMapQuizBests()[region];
      if (best) note(`Your best: ${best.accuracy}% in ${clock(best.seconds)}`, true);
      startQuiz(d.items);
    })
    .catch(() => { els.hint.textContent = 'Could not load the map.'; });
}
