// Client controller for Higher or Lower: Countries. Deals a challenger against
// the current country, reveals its number, and keeps the streak going until a
// wrong answer. Outlines share one scale so the bigger country looks bigger.
import { flagImg } from '../../lib/game/flag-img';
import {
  compareLine,
  firstCountry,
  formatValue,
  judge,
  nextChallenger,
  POPULATION_YEAR,
  trapNote,
  valueOf,
} from '../../lib/game/higher-or-lower';
import type { Answer, HolMode, Stat } from '../../lib/game/higher-or-lower';
import { getStats, recordStreakRun } from '../../lib/game/stats';
import type { Country } from '../../lib/game/types';
import { bindModal, bindShare } from './shared';

type Outline = { d: string; w: number; h: number };
const OUTLINES_URL = '/assets/data/scaled-silhouettes.json';
const PREFS_KEY = 'globle:higher-or-lower';
/** Pixel box each outline is drawn into; the larger country fills it. */
const BOX = 200;
/** Outlines smaller than this are enlarged and labelled as such. */
const MIN_PX = 12;

interface CardEls {
  root: HTMLElement;
  svg: SVGSVGElement;
  path: SVGPathElement;
  enlarged: HTMLElement;
  flag: HTMLElement;
  name: HTMLElement;
  other: HTMLElement;
  value: HTMLElement;
  unit: HTMLElement;
}

export function initHigherOrLower(root: HTMLElement) {
  const $ = <T extends Element = HTMLElement>(sel: string, scope: ParentNode = root) => scope.querySelector(sel) as T;
  const cardEls = (role: string): CardEls => {
    const c = $<HTMLElement>(`[data-card="${role}"]`);
    return {
      root: c,
      svg: $<SVGSVGElement>('[data-shape]', c),
      path: $<SVGPathElement>('[data-shape] path', c),
      enlarged: $<HTMLElement>('[data-enlarged]', c),
      flag: $<HTMLElement>('[data-flag]', c),
      name: $<HTMLElement>('[data-name]', c),
      other: $<HTMLElement>('[data-other]', c),
      value: $<HTMLElement>('[data-value]', c),
      unit: $<HTMLElement>('[data-unit]', c),
    };
  };
  const els = {
    tabs: [...root.querySelectorAll<HTMLButtonElement>('[data-mode]')],
    streak: $('[data-streak]'),
    best: $('[data-best]'),
    current: cardEls('current'),
    challenger: cardEls('challenger'),
    answers: [...root.querySelectorAll<HTMLButtonElement>('[data-answer]')],
    compare: $('[data-compare]'),
    barA: $('[data-bar-a]'),
    barB: $('[data-bar-b]'),
    barALabel: $('[data-bar-a-label]'),
    barBLabel: $('[data-bar-b-label]'),
    compareLine: $('[data-compare-line]'),
    source: $('[data-source]'),
    live: $('[data-live]'),
    modal: $('[data-modal]'),
    modalEmoji: $('[data-modal-emoji]'),
    modalTitle: $('[data-modal-title]'),
    modalScore: $('[data-modal-score]'),
    modalWhy: $('[data-modal-why]'),
    modalTrap: $('[data-modal-trap]'),
    playAgain: $<HTMLButtonElement>('[data-play-again]'),
    shareBtn: $<HTMLButtonElement>('[data-share]'),
    reopen: root.querySelector<HTMLElement>('[data-reopen]'),
  };

  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const modal = bindModal(els.modal, els.reopen);
  let outlines: Record<string, Outline> = {};

  let mode: HolMode = 'population';
  try {
    const saved = localStorage.getItem(PREFS_KEY);
    if (saved === 'population' || saved === 'area' || saved === 'mixed') mode = saved;
  } catch { /* private mode */ }

  // ---- Run state ----
  let current!: Country;
  let challenger!: Country;
  let stat: Stat = 'population';
  let streak = 0;
  let used = new Set<string>();
  let busy = false;
  let over = false;
  let lastPair: { current: Country; challenger: Country; stat: Stat } | null = null;

  const hasPopulation = (c: Country) => valueOf(c, 'population') > 0;
  const statFor = (c: Country): Stat =>
    mode === 'mixed' ? (hasPopulation(c) && Math.random() < 0.5 ? 'population' : 'area') : mode === 'population' && !hasPopulation(c) ? 'area' : mode;

  // ---- Outlines: both cards share one km-per-pixel scale ----
  function drawOutlines() {
    const a = outlines[current.name], b = outlines[challenger.name];
    const biggest = Math.max(a?.w ?? 0, a?.h ?? 0, b?.w ?? 0, b?.h ?? 0);
    if (!biggest) return;
    for (const [card, o] of [[els.current, a], [els.challenger, b]] as const) {
      if (!o) { card.path.setAttribute('d', ''); continue; }
      // km shown across the box: the larger country fills it, unless this one
      // would be smaller than MIN_PX, in which case it is enlarged and labelled.
      const own = Math.max(o.w, o.h);
      let span = biggest * 1.05;
      const enlarged = (own / span) * BOX < MIN_PX;
      if (enlarged) span = (own * BOX) / MIN_PX;
      card.svg.setAttribute('viewBox', `${-span / 2} ${-span / 2} ${span} ${span}`);
      card.path.setAttribute('d', o.d);
      card.enlarged.hidden = !enlarged;
    }
  }

  fetch(OUTLINES_URL)
    .then((r) => r.json())
    .then((data) => {
      outlines = data;
      if (current) drawOutlines();
    })
    .catch(() => { /* cards still work without outlines */ });

  // ---- Rendering ----
  function fillCard(card: CardEls, c: Country, reveal: boolean) {
    const other: Stat = stat === 'population' ? 'area' : 'population';
    card.flag.innerHTML = flagImg(c.cca2);
    card.name.textContent = c.name;
    card.other.textContent = valueOf(c, other) ? `${formatValue(valueOf(c, other), other)}${other === 'population' ? ' people' : ''}` : '';
    card.value.textContent = reveal ? formatValue(valueOf(c, stat), stat) : '???';
    card.unit.textContent = stat === 'population' ? 'People' : 'Land area';
  }

  function render() {
    els.tabs.forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.mode === mode)));
    els.streak.textContent = String(streak);
    els.best.textContent = String(Math.max(getStats('higher-or-lower').maxStreak, streak));
    els.source.textContent = stat === 'population' ? `population: World Bank ${POPULATION_YEAR}` : 'area: world-countries';
    fillCard(els.current, current, true);
    fillCard(els.challenger, challenger, false);
    els.challenger.root.classList.remove('is-revealed', 'is-wrong');
    els.compare.classList.remove('is-shown');
    els.barA.style.width = '0';
    els.barB.style.width = '0';
    els.answers.forEach((b) => (b.disabled = false));
    drawOutlines();
    announce(`${current.name}: ${formatValue(valueOf(current, stat), stat)}. Does ${challenger.name} have more or less ${stat === 'population' ? 'people' : 'land'}?`);
  }

  function announce(msg: string) { els.live.textContent = msg; }

  /** Roll the hidden number up to its value, odometer-style. */
  function countUp(el: HTMLElement, target: number, done: () => void) {
    if (prefersReduced) { el.textContent = formatValue(target, stat); done(); return; }
    const start = performance.now(), ms = 650;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      const eased = 1 - (1 - k) ** 3;
      el.textContent = formatValue(Math.max(1, target * eased), stat);
      if (k < 1) requestAnimationFrame(step);
      else done();
    };
    requestAnimationFrame(step);
  }

  function showComparison() {
    const a = valueOf(current, stat), b = valueOf(challenger, stat);
    const max = Math.max(a, b);
    els.barALabel.textContent = current.name;
    els.barBLabel.textContent = challenger.name;
    els.barA.style.width = `${Math.max(1, (a / max) * 100)}%`;
    els.barB.style.width = `${Math.max(1, (b / max) * 100)}%`;
    els.compareLine.textContent = compareLine(current, challenger, stat);
    els.compare.classList.add('is-shown');
  }

  // ---- Rounds ----
  function newRun() {
    streak = 0;
    used = new Set();
    over = false;
    busy = false;
    modal.reset();
    current = firstCountry(Math.random, mode === 'area' ? 'area' : 'population');
    used.add(current.name);
    stat = statFor(current);
    challenger = nextChallenger(Math.random, current, stat, streak, used);
    render();
  }

  function answer(choice: Answer) {
    if (busy || over) return;
    busy = true;
    els.answers.forEach((b) => (b.disabled = true));
    const verdict = judge(current, challenger, stat);
    const right = verdict === 'tie' || verdict === choice;
    els.challenger.root.classList.add('is-revealed');
    countUp(els.challenger.value, valueOf(challenger, stat), () => {
      showComparison();
      announce(`${right ? 'Correct' : 'Wrong'}. ${compareLine(current, challenger, stat)}`);
      if (right) {
        streak++;
        els.streak.textContent = String(streak);
        els.best.textContent = String(Math.max(getStats('higher-or-lower').maxStreak, streak));
        setTimeout(advance, prefersReduced ? 900 : 1500);
      } else {
        els.challenger.root.classList.add('is-wrong');
        setTimeout(() => finish(), prefersReduced ? 600 : 1100);
      }
    });
  }

  /** The challenger becomes the current card; a new challenger arrives. */
  function advance() {
    current = challenger;
    used.add(current.name);
    stat = statFor(current);
    challenger = nextChallenger(Math.random, current, stat, streak, used);
    els.current.root.classList.remove('is-arriving');
    els.challenger.root.classList.remove('is-arriving');
    void els.challenger.root.offsetWidth; // restart the arrival animation
    els.current.root.classList.add('is-arriving');
    els.challenger.root.classList.add('is-arriving');
    busy = false;
    render();
  }

  function finish() {
    over = true;
    busy = false;
    lastPair = { current, challenger, stat };
    const s = recordStreakRun('higher-or-lower', streak);
    els.modalEmoji.textContent = streak >= s.maxStreak && streak > 0 ? '🏆' : '🔥';
    els.modalTitle.textContent = streak >= s.maxStreak && streak > 0 ? 'New best streak!' : 'Run over';
    els.modalScore.textContent = `Streak: ${streak} · Best: ${s.maxStreak}`;
    els.modalWhy.textContent = compareLine(current, challenger, stat);
    const trap = trapNote(current, challenger, stat);
    els.modalTrap.textContent = trap ?? '';
    els.modalTrap.hidden = !trap;
    modal.open();
  }

  bindShare(els.shareBtn, () =>
    `Higher or Lower: Countries — streak ${streak}${lastPair ? ` (${lastPair.stat})` : ''} 🔥 https://globleunlimited.net/higher-or-lower/`);

  // ---- Controls ----
  els.answers.forEach((b) => b.addEventListener('click', () => answer(b.dataset.answer as Answer)));
  document.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || !els.modal.hidden) return;
    const target = e.target as HTMLElement;
    if (target.closest('input, textarea, select, [contenteditable]')) return;
    const k = e.key.toLowerCase();
    if (k === 'arrowup' || k === 'h') { e.preventDefault(); answer('higher'); }
    else if (k === 'arrowdown' || k === 'l') { e.preventDefault(); answer('lower'); }
  });
  els.tabs.forEach((t) => t.addEventListener('click', () => {
    mode = t.dataset.mode as HolMode;
    try { localStorage.setItem(PREFS_KEY, mode); } catch { /* private mode */ }
    newRun();
  }));
  els.playAgain.addEventListener('click', newRun);

  newRun();
}
