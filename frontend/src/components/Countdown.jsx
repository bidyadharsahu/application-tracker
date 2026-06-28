import React, { useEffect, useState } from "react";
import { daysUntil, colorForDays } from "../lib/utils-date";

export default function Countdown({ targetDate }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);
  if (!targetDate) return <div data-testid="countdown-empty" style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem", fontStyle: "italic", color: "var(--ink-ghost)" }}>No deadline set</div>;

  const days = daysUntil(targetDate);
  const color = colorForDays(days);
  const barColor = { red: "var(--pigment-red)", amber: "var(--wash-gold)", green: "var(--wash-green)", neutral: "rgba(107,79,53,0.25)" }[color];
  const textColor = { red: "var(--pigment-red)", amber: "var(--pigment-amber)", green: "var(--pigment-green)", neutral: "var(--ink-soft)" }[color];

  const target = new Date(targetDate + "T23:59:59");
  const hours = Math.floor(Math.max(0, target - now) / 3600000);
  let label, pct;
  if (days === null) return null;
  if (days < 0) { label = `Deadline passed ${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} ago`; pct = 0; }
  else if (days === 0) { label = `Last day — ${hours}h remaining`; pct = Math.max(5, (hours / 24) * 100); }
  else if (days === 1) { label = "1 day remaining"; pct = 15; }
  else if (days <= 7) { label = `${days} days remaining`; pct = (days / 7) * 100; }
  else { label = `${days} days remaining`; pct = Math.min(100, (days / 30) * 100); }

  return (
    <div data-testid="countdown-timer">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
        <span style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem", fontStyle: "italic", color: textColor }}>{label}</span>
        {days >= 0 && <span style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--ink-ghost)", textTransform: "uppercase", letterSpacing: "0.06em" }}>deadline</span>}
      </div>
      {days >= 0 && (
        <div className="progress-track" style={{ height: "4px" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: "99px", transition: "width 0.7s ease" }}/>
        </div>
      )}
    </div>
  );
}
