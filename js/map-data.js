import { records } from "./data/records.js";
import { SHAPE_INPUT, YEAR } from "./config.js";
import { mdToDateStr } from "./utils.js";

// ── unique types ───────────────────────────────────────────────

let _typesCache = null;

export function getUniqueTypes() {
  if (!_typesCache) {
    _typesCache = [...new Set(records.map(r => r.activity))].sort();
  }
  return _typesCache;
}

// ── SHAPE_INPUT date set ───────────────────────────────────────

let _shapeDateSet = null;

/**
 * All "YYYY-MM-DD" dates referenced in SHAPE_INPUT (union of all shapes).
 */
export function getShapeInputDateSet() {
  if (!_shapeDateSet) {
    const set = new Set();
    for (const mds of Object.values(SHAPE_INPUT)) {
      for (const md of mds) {
        set.add(mdToDateStr(md, YEAR));
      }
    }
    _shapeDateSet = set;
  }
  return _shapeDateSet;
}

// ── filters ────────────────────────────────────────────────────

/**
 * Filter records whose date appears in SHAPE_INPUT.
 */
export function getDefaultRecords() {
  const dateSet = getShapeInputDateSet();
  return records.filter(r => r.date && dateSet.has(r.date));
}

/**
 * Filter records that fall within [startDate, endDate] (inclusive).
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
 * Get [min, max] "YYYY-MM-DD" of SHAPE_INPUT dates.
 */
export function getShapeInputDateExtent() {
  const dates = [...getShapeInputDateSet()].sort();
  return dates.length ? [dates[0], dates[dates.length - 1]] : [];
}

/**
 * Get the date extent across all records as [min, max].
 */
export function getDateExtent(recordsList) {
  const dates = recordsList.map(r => r.date).filter(Boolean).sort();
  return dates.length ? [dates[0], dates[dates.length - 1]] : [];
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
