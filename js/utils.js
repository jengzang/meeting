/**
 * Parse "YYYY-MM-DD" → Date (local, no time component).
 */
export function parseDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Date → "YYYY-MM-DD".
 */
export function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Add `days` to a Date, returning a new Date.
 */
export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Get the Monday on or before `date`.
 */
export function getMonday(date) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  return result;
}

/**
 * "M月" label for a date.
 */
export function getMonthText(date) {
  return `${date.getMonth() + 1}月`;
}

/**
 * "M.D" → "YYYY-MM-DD".
 */
export function mdToDateStr(md, year) {
  const [month, day] = md.split(".").map(Number);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Generate "M.D" strings from startMD to endMD (inclusive).
 *   rangeMD("5.28", "6.9", 2026) → ["5.28","5.29",...,"6.9"]
 */
export function rangeMD(startMD, endMD, year) {
  const result = [];
  let current = parseDate(mdToDateStr(startMD, year));
  const end = parseDate(mdToDateStr(endMD, year));

  while (current <= end) {
    result.push(`${current.getMonth() + 1}.${current.getDate()}`);
    current = addDays(current, 1);
  }

  return result;
}

/**
 * Build an array of weeks, each week an array of 7 Dates (Mon–Sun).
 */
export function buildWeeks(startDate, endDate) {
  const firstMonday = getMonday(startDate);
  const weeks = [];
  let cursor = new Date(firstMonday);

  while (cursor <= endDate || cursor <= getMonday(endDate)) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(addDays(cursor, i));
    }
    weeks.push(week);
    cursor = addDays(cursor, 7);
  }

  return weeks;
}
