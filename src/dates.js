// Calendar dates ("YYYY-MM-DD") — the one place date-only math happens.
//
// Why this file exists: `new Date().toISOString().slice(0, 10)` is the UTC
// date, not the date on the phone. In California that's already tomorrow from
// 5 PM (4 PM in winter), so evening touches were stamped a day late, follow-ups
// landed a day late, and leads due today showed as overdue after dinner.
//
// Rules:
// - Date-only values (lastTouchDate, followUpDate, lastPlanDate, notesLog.ts)
//   are "YYYY-MM-DD" in the device's own time zone. String comparison is valid.
// - Instants (generatedAt, checkedAt, startedAt…) stay full ISO timestamps.
// - Day arithmetic happens on the strings via UTC parts, so it never drifts
//   across a daylight-saving change.
// - Never call todayISO() at module scope (TRACE.md §8).

const pad = (n) => String(n).padStart(2, "0");

// A Date → its calendar date on this device.
export function isoFromLocalDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Today on this device. Takes `now` for tests.
export function todayISO(now = new Date()) {
  return isoFromLocalDate(now);
}

// Accepts a stray full timestamp, or a non-ISO date from a CSV import
// ("10/15/2026"), by reading it as a local date first.
const utcMs = (iso) => {
  let s = String(iso);
  if (!/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const parsed = new Date(s);
    if (isNaN(parsed)) return NaN;
    s = isoFromLocalDate(parsed);
  }
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

// "2026-10-31" + 3 → "2026-11-03". Negative n goes back. "" if unreadable.
export function addDaysISO(iso, n) {
  const ms = utcMs(iso);
  if (isNaN(ms)) return "";
  return new Date(ms + n * 86400000).toISOString().slice(0, 10);
}

// Whole days from b to a: diffDaysISO("2026-11-03", "2026-10-31") === 3.
export function diffDaysISO(a, b) {
  return Math.round((utcMs(a) - utcMs(b)) / 86400000);
}
