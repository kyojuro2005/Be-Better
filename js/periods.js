/**
 * periods.js — Period generation & scoring logic
 * Computes all check-in periods for a given objective
 * and calculates discipline scores.
 */

import {
  toISO, fromISO, isoWeek, weekStart, weekEnd, monthKey,
  addDays, isPast, isToday, formatWeekRange, formatMonth, formatShort
} from './dates.js';

/**
 * Generate all expected periods for an objective.
 * Returns an array of { id, label, dateKey, startDate, endDate, type }
 *
 * @param {Object} obj - objective record
 * @param {Date}   obj.startDate  - ISO string
 * @param {Date}   obj.endDate    - ISO string
 * @param {string} obj.periodType - 'weekly' | 'monthly' | 'fixed_days'
 * @param {number[]} obj.fixedDays - [1,3,5] (Mon=1…Sun=0) for fixed_days
 */
export function generatePeriods(obj) {
  const start = fromISO(obj.startDate);
  const end   = fromISO(obj.endDate);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const periods = [];

  if (obj.periodType === 'weekly') {
    // One period per ISO week that intersects [start, end]
    let cursor = new Date(weekStart(start));
    while (cursor <= end) {
      const ws = new Date(cursor);
      const we = weekEnd(cursor);
      const key = isoWeek(ws);
      periods.push({
        id:        `${obj.id}__${key}`,
        objectiveId: obj.id,
        dateKey:   key,
        label:     formatWeekRange(ws),
        startDate: toISO(ws),
        endDate:   toISO(we),
        type:      'weekly',
        isCurrent: ws <= today && today <= we,
        isPast:    we < today,
        isFuture:  ws > today,
      });
      cursor.setDate(cursor.getDate() + 7);
    }

  } else if (obj.periodType === 'monthly') {
    // One period per calendar month
    let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= end) {
      const ms  = new Date(cursor);
      const me  = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
      const key = monthKey(ms);
      const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      periods.push({
        id:        `${obj.id}__${key}`,
        objectiveId: obj.id,
        dateKey:   key,
        label:     formatMonth(ms),
        startDate: toISO(ms),
        endDate:   toISO(me),
        type:      'monthly',
        isCurrent: ms <= today && today <= me,
        isPast:    me < today,
        isFuture:  ms > today,
      });
      cursor = firstOfMonth;
    }

  } else if (obj.periodType === 'fixed_days') {
    // One period per occurrence of each selected weekday
    const days = obj.fixedDays || []; // [1..7] Mon=1, Sun=7 (JS getDay: Sun=0…Sat=6)
    // Convert our storage (0=Sun…6=Sat JS convention stored as JS getDay values)
    let cursor = new Date(start);
    while (cursor <= end) {
      const dayJS = cursor.getDay(); // 0=Sun…6=Sat
      if (days.includes(dayJS)) {
        const dateStr = toISO(cursor);
        const cDate   = new Date(cursor);
        periods.push({
          id:        `${obj.id}__${dateStr}`,
          objectiveId: obj.id,
          dateKey:   dateStr,
          label:     formatShort(cDate),
          startDate: dateStr,
          endDate:   dateStr,
          type:      'fixed_day',
          isCurrent: isToday(cDate),
          isPast:    isPast(cDate) && !isToday(cDate),
          isFuture:  cDate > today && !isToday(cDate),
        });
      }
      cursor = addDays(cursor, 1);
    }
  }

  return periods;
}

/**
 * Compute the discipline score for one objective.
 * Score = checked / (past + current) periods (only elapsed periods count).
 * Returns { score: 0–100, checked, total, elapsed }
 *
 * @param {Object}   obj      - objective record
 * @param {Object[]} checkins - all checkin records for this objective
 */
export function scoreObjective(obj, checkins) {
  const periods = generatePeriods(obj);
  const checkedIds = new Set(checkins.filter(c => c.checked).map(c => c.periodId));

  const elapsed = periods.filter(p => !p.isFuture);
  const checked = elapsed.filter(p => checkedIds.has(p.id)).length;

  return {
    score:   elapsed.length ? Math.round((checked / elapsed.length) * 100) : 0,
    checked,
    elapsed: elapsed.length,
    total:   periods.length,
    periods,
  };
}

/**
 * Compute the global discipline score across all objectives.
 * Simple average of individual scores.
 */
export function scoreGlobal(objectives, allCheckins) {
  if (!objectives.length) return 0;

  const scores = objectives.map(obj => {
    const cks = allCheckins.filter(c => c.objectiveId === obj.id);
    return scoreObjective(obj, cks).score;
  });

  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

/** Color class based on score */
export function scoreColor(score) {
  if (score >= 75) return 'success';
  if (score >= 40) return 'warning';
  return 'danger';
}
