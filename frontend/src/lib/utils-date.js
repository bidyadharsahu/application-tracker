// Utility: days difference (today -> target)
export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr + "T23:59:59");
  const now = new Date();
  const diffMs = target - now;
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return days;
}

export function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function colorForDays(days) {
  if (days === null || days === undefined) return "neutral";
  if (days < 0) return "red";
  if (days <= 3) return "red";
  if (days <= 15) return "amber";
  return "green";
}

// Sort: unapplied first by closest deadline asc, then applied by closest deadline asc
export function sortJobs(jobs) {
  const today = new Date().toISOString().split("T")[0];
  return [...jobs].sort((a, b) => {
    if (a.applied !== b.applied) return a.applied ? 1 : -1;
    const ad = a.last_date || "9999-12-31";
    const bd = b.last_date || "9999-12-31";
    // For unapplied, show overdue at bottom; for upcoming, sort asc
    const aOver = ad < today;
    const bOver = bd < today;
    if (!a.applied && aOver !== bOver) return aOver ? 1 : -1;
    return ad.localeCompare(bd);
  });
}
