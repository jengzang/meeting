import { records } from "./data/records.js";
import { START_DATE, END_DATE } from "./config.js";

// ── unique types ───────────────────────────────────────────────

let _typesCache = null;

export function getUniqueTypes() {
  if (!_typesCache) {
    _typesCache = [...new Set(records.map(r => r.activity))].sort();
  }
  return _typesCache;
}

// ── filters ────────────────────────────────────────────────────

/**
 * Filter records that fall within [startDate, endDate] (inclusive).
 * `startDate`/`endDate` are "YYYY-MM-DD" strings.
 */
export function filterByDateRange(recordsList, startDate, endDate) {
  return recordsList.filter(r => r.date && r.date >= startDate && r.date <= endDate);
}

/**
 * Filter by activity types.
 */
export function filterByTypes(recordsList, types) {
  if (!types || types.length === 0) return recordsList;
  const set = new Set(types);
  return recordsList.filter(r => set.has(r.activity));
}

/**
 * Convenience: records within the configured SHAPE_INPUT date range.
 */
export function getDefaultRecords() {
  return filterByDateRange(records, START_DATE, END_DATE);
}

/**
 * Get the date extent across all records as [min, max].
 */
export function getDateExtent(recordsList) {
  const dates = recordsList.map(r => r.date).filter(Boolean).sort();
  return dates.length ? [dates[0], dates[dates.length - 1]] : [START_DATE, END_DATE];
}

// ── stats ──────────────────────────────────────────────────────

/**
 * Activity type → count mapping (sorted desc).
 */
export function getTypeStats(recordsList) {
  const counts = {};
  for (const r of recordsList) {
    counts[r.activity] = (counts[r.activity] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}
