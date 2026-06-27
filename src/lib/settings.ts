// User preferences (distance unit + theme), persisted in localStorage.
export type Unit = 'km' | 'mi';
export type Theme = 'dark' | 'light';

const UNIT_KEY = 'globle:unit';
const THEME_KEY = 'globle:theme';

/** Fired on window whenever a setting changes, so live views can re-render. */
export const SETTINGS_EVENT = 'globle:settingschange';

const safeGet = (k: string): string | null => {
  try { return localStorage.getItem(k); } catch { return null; }
};
const safeSet = (k: string, v: string) => {
  try { localStorage.setItem(k, v); } catch { /* private mode */ }
};

export function getUnit(): Unit {
  return safeGet(UNIT_KEY) === 'mi' ? 'mi' : 'km';
}
export function setUnit(u: Unit) {
  safeSet(UNIT_KEY, u);
  emitChange();
}

export function getTheme(): Theme {
  return safeGet(THEME_KEY) === 'light' ? 'light' : 'dark';
}
export function applyTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
}
export function setTheme(t: Theme) {
  safeSet(THEME_KEY, t);
  applyTheme(t);
  emitChange();
}

const KM_TO_MI = 0.621371;

/** Format a distance in km into the user's preferred unit. */
export function formatDistance(km: number, unit: Unit = getUnit()): string {
  if (unit === 'mi') {
    return `${Math.round(km * KM_TO_MI).toLocaleString('en-US')} mi`;
  }
  return `${Math.round(km).toLocaleString('en-US')} km`;
}

export function emitChange() {
  window.dispatchEvent(new CustomEvent(SETTINGS_EVENT));
}
