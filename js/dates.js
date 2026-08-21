/**
 * dates.js — Date utilities for Be Better
 * Global window: next Monday → 24 December (current year or next if past Dec 24)
 */

/** Format: YYYY-MM-DD */
export function toISO(date) {
  return date.toISOString().slice(0, 10);
}

/** Parse YYYY-MM-DD → local Date (midnight) */
export function fromISO(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Next Monday from today (if today is Monday, returns today) */
export function nextMonday(from = new Date()) {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun, 1=Mon…
  const diff = day === 1 ? 0 : (8 - day) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d;
}

/** Global window end: 24 December of the relevant year */
export function windowEnd() {
  const now   = new Date();
  const year  = now.getMonth() > 11 || (now.getMonth() === 11 && now.getDate() > 24)
                ? now.getFullYear() + 1
                : now.getFullYear();
  return new Date(year, 11, 24, 0, 0, 0, 0); // Dec 24
}

/** Global window start: next Monday from today */
export function windowStart() {
  return nextMonday();
}

/**
 * Return ISO week string "YYYY-Www" for a given date.
 * Week 1 = the week containing the first Thursday of the year (ISO 8601).
 */
export function isoWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/** First day (Monday) of the ISO week containing `date` */
export function weekStart(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay() || 7; // 1=Mon…7=Sun
  d.setDate(d.getDate() - day + 1);
  return d;
}

/** Last day (Sunday) of the ISO week containing `date` */
export function weekEnd(date) {
  const d = weekStart(date);
  d.setDate(d.getDate() + 6);
  return d;
}

/** "YYYY-MM" month key */
export function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** Human-readable short date "lun. 21 août" */
export function formatShort(date) {
  return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Short month+year "août 2025" */
export function formatMonth(date) {
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

/** Short week range "18–24 août" */
export function formatWeekRange(date) {
  const start = weekStart(date);
  const end   = weekEnd(date);
  const startStr = start.toLocaleDateString('fr-FR', { day: 'numeric', month: start.getMonth() !== end.getMonth() ? 'short' : undefined });
  const endStr   = end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  return `${startStr} – ${endStr}`;
}

/** Day names short FR */
export const DAY_SHORT = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'];
export const DAY_FULL  = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

/** Add N days to a date */
export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/** Is date A the same calendar day as date B */
export function sameDay(a, b) {
  return toISO(a) === toISO(b);
}

/** Is date strictly before today (midnight) */
export function isPast(date) {
  const today = new Date(); today.setHours(0,0,0,0);
  return date < today;
}

/** Is date today */
export function isToday(date) {
  return sameDay(date, new Date());
}
