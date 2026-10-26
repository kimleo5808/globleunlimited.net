// DOM wiring shared by every game controller: autocomplete with keyboard
// navigation, the inline error, progress pips, the share button and the
// end-of-round modal. Each controller used to carry its own copy of all five.
import type { Guess, Guessable } from '../../lib/game/types';

interface AutocompleteOptions {
  input: HTMLInputElement;
  box: HTMLElement;
  suggest: (query: string) => Guessable[];
  /** Leading icon markup for a suggestion (flag image, state code pill). */
  icon: (item: Guessable) => string;
  /** Called with the chosen name when a suggestion is clicked or picked by keyboard. */
  onPick: (name: string) => void;
}

export interface Autocomplete {
  close(): void;
  /** Show a message in the suggestion box and mark the input invalid. */
  error(message: string): void;
  clearError(): void;
}

export function bindAutocomplete({ input, box, suggest, icon, onPick }: AutocompleteOptions): Autocomplete {
  let activeIdx = -1;

  function close() {
    box.hidden = true;
    box.innerHTML = '';
  }

  function render(list: Guessable[]) {
    if (!list.length) return close();
    box.innerHTML = list
      .map((c) => `<button type="button" class="suggest-item" data-name="${c.name}">${icon(c)} ${c.name}</button>`)
      .join('');
    box.hidden = false;
    box.querySelectorAll<HTMLButtonElement>('.suggest-item').forEach((b) => {
      b.addEventListener('click', () => {
        input.value = b.dataset.name || '';
        onPick(input.value);
      });
    });
  }

  input.addEventListener('input', () => {
    activeIdx = -1;
    render(suggest(input.value));
  });
  input.addEventListener('keydown', (e) => {
    const items = [...box.querySelectorAll('.suggest-item')] as HTMLElement[];
    if (!items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx = (activeIdx + 1) % items.length; }
    else if (e.key === 'ArrowUp') { e.preventDefault(); activeIdx = (activeIdx - 1 + items.length) % items.length; }
    else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); items[activeIdx].click(); return; }
    else return;
    items.forEach((it, i) => it.classList.toggle('active', i === activeIdx));
  });
  input.addEventListener('blur', () => setTimeout(close, 120));

  return {
    close,
    error(message: string) {
      input.setAttribute('aria-invalid', 'true');
      box.innerHTML = `<div class="suggest-error">${message}</div>`;
      box.hidden = false;
    },
    clearError() {
      input.removeAttribute('aria-invalid');
    },
  };
}

/** One pip per allowed guess, filled with each guess's heat colour. */
export function renderPips(row: HTMLElement, count: HTMLElement, guesses: Guess[], max: number) {
  row.innerHTML = '';
  for (let i = 0; i < max; i++) {
    const pip = document.createElement('span');
    pip.className = 'pip';
    const g = guesses[i];
    if (g) {
      pip.style.background = g.color;
      pip.style.borderColor = g.color;
    }
    row.appendChild(pip);
  }
  count.textContent = `GUESSES ${guesses.length} / ${max}`;
}

/** Native share sheet where there is one, clipboard otherwise. */
export function bindShare(btn: HTMLButtonElement, text: () => string) {
  btn.addEventListener('click', async () => {
    const t = text();
    try {
      if (navigator.share) await navigator.share({ text: t });
      else {
        await navigator.clipboard.writeText(t);
        btn.textContent = 'Copied!';
        setTimeout(() => (btn.textContent = 'Share'), 1500);
      }
    } catch { /* user cancelled */ }
  });
}

export interface RoundModal {
  /** Show the result. */
  open(): void;
  /** Hide it and offer the in-page button to bring it back. */
  close(): void;
  /** Hide both, for a fresh round. */
  reset(): void;
}

/** End-of-round modal. It closes on its ✕, on Escape and on a backdrop click,
 *  so the finished board stays inspectable; `reopen` is the in-page button
 *  that brings it back, visible only while a finished round's modal is closed. */
export function bindModal(modal: HTMLElement, reopen: HTMLElement | null): RoundModal {
  const firstAction = () =>
    [...modal.querySelectorAll<HTMLElement>('.modal-actions .btn')].find((b) => !b.hidden);

  function open() {
    modal.hidden = false;
    reopen?.setAttribute('hidden', '');
    firstAction()?.focus();
  }
  function close() {
    if (modal.hidden) return;
    modal.hidden = true;
    reopen?.removeAttribute('hidden');
    reopen?.focus();
  }
  function reset() {
    modal.hidden = true;
    reopen?.setAttribute('hidden', '');
  }

  modal.querySelector('[data-modal-close]')?.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  reopen?.addEventListener('click', open);

  return { open, close, reset };
}
