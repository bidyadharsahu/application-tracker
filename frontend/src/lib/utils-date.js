/* ════════════════════════════════════════════════════════
   utils-date.js
   Supports both:
     • Full ISO date  → "2026-08-15"
     • Month-only     → "2026-08"  (exam scheduled in a month, exact date TBA)
════════════════════════════════════════════════════════ */

/** Returns days remaining until a date string (or null if no date). */
export function daysUntil(dateStr) {
  if (!dateStr) return null;
  // Month-only strings like "2026-08" are not a concrete deadline
  if (/^\d{4}-\d{2}$/.test(dateStr)) return null;
  const target = new Date(dateStr + "T23:59:59");
  if (isNaN(target.getTime())) return null;
  return Math.ceil((target - new Date()) / 86400000);
}

/** Formats a date string for display. Month-only returns e.g. "Aug 2026 (Month)". */
export function formatDate(dateStr) {
  if (!dateStr) return "—";
  // Month-only: "2026-08"
  if (/^\d{4}-\d{2}$/.test(dateStr)) {
    const d = new Date(dateStr + "-01");
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/** Returns the month name for a month-only date string like "2026-08". */
export function getMonthName(dateStr) {
  if (!dateStr) return null;
  if (/^\d{4}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  }
  return null;
}

/** True if the date string is month-only (no specific day). */
export function isMonthOnly(dateStr) {
  return dateStr ? /^\d{4}-\d{2}$/.test(dateStr) : false;
}

/**
 * Parses display input to ISO storage format.
 *   "15 08 2026"  → "2026-08-15"
 *   "August 2026" → "2026-08"
 *   "Aug 2026"    → "2026-08"
 *   "08 2026"     → "2026-08"
 *   ""            → ""
 */
export function parseFlexDate(raw) {
  if (!raw || !raw.trim()) return "";
  const s = raw.trim();

  // Full date DD MM YYYY or DD-MM-YYYY or DD/MM/YYYY
  const fullMatch = s.match(/^(\d{1,2})[- /.](\d{1,2})[- /.](\d{4})$/);
  if (fullMatch) {
    const [, dd, mm, yyyy] = fullMatch;
    return `${yyyy}-${mm.padStart(2,"0")}-${dd.padStart(2,"0")}`;
  }

  // Month name + year: "August 2026" or "Aug 2026"
  const monthNames = ["january","february","march","april","may","june","july","august","september","october","november","december"];
  
  // DD Month YYYY: "22 August 2026" or "11 Sep 2026"
  const ddMonthYyyy = s.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/);
  if (ddMonthYyyy) {
    const idx = monthNames.findIndex(m => m.startsWith(ddMonthYyyy[2].toLowerCase()));
    if (idx !== -1) return `${ddMonthYyyy[3]}-${String(idx+1).padStart(2,"0")}-${ddMonthYyyy[1].padStart(2,"0")}`;
  }

  // Month DD, YYYY: "August 22, 2026" or "Aug 22 2026"
  const monthDdYyyy = s.match(/^([a-zA-Z]+)\s+(\d{1,2})[, ]+\s*(\d{4})$/);
  if (monthDdYyyy) {
    const idx = monthNames.findIndex(m => m.startsWith(monthDdYyyy[1].toLowerCase()));
    if (idx !== -1) return `${monthDdYyyy[3]}-${String(idx+1).padStart(2,"0")}-${monthDdYyyy[2].padStart(2,"0")}`;
  }

  const monthMatch = s.match(/^([a-zA-Z]+)\s+(\d{4})$/);
  if (monthMatch) {
    const idx = monthNames.findIndex(m => m.startsWith(monthMatch[1].toLowerCase()));
    if (idx !== -1) return `${monthMatch[2]}-${String(idx+1).padStart(2,"0")}`;
  }

  // MM YYYY → month-only
  const mmyyyy = s.match(/^(\d{1,2})\s+(\d{4})$/);
  if (mmyyyy) return `${mmyyyy[2]}-${mmyyyy[1].padStart(2,"0")}`;

  // Already ISO full or month-only
  if (/^\d{4}-\d{2}-\d{2}$/.test(s) || /^\d{4}-\d{2}$/.test(s)) return s;

  return s;
}

/**
 * Converts stored ISO value to display string for form inputs.
 *   "2026-08-15" → "15 08 2026"
 *   "2026-08"    → "August 2026"
 */
export function toDisplayDate(stored) {
  if (!stored) return "";
  if (/^\d{4}-\d{2}$/.test(stored)) {
    const d = new Date(stored + "-01");
    return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(stored)) {
    const [y,m,d] = stored.split("-");
    return `${d} ${m} ${y}`;
  }
  return stored;
}

export function colorForDays(days) {
  if (days === null || days === undefined) return "neutral";
  if (days < 0) return "red";
  if (days <= 3) return "red";
  if (days <= 15) return "amber";
  return "green";
}

/** Sort: unapplied first (closest deadline first), then applied (closest exam first). */
export function sortJobs(jobs) {
  const today = new Date().toISOString().split("T")[0];
  return [...jobs].sort((a, b) => {
    if (a.applied !== b.applied) return a.applied ? 1 : -1;
    const ad = a.last_date || "9999-12-31";
    const bd = b.last_date || "9999-12-31";
    if (!a.applied) {
      const aOver = ad < today, bOver = bd < today;
      if (aOver !== bOver) return aOver ? 1 : -1;
    }
    return ad.localeCompare(bd);
  });
}
