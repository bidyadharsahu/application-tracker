import React, { useEffect, useState } from "react";
import { daysUntil, colorForDays } from "../lib/utils-date";

export default function Countdown({ targetDate }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  if (!targetDate) return (
    <div style={{ fontSize: "0.8125rem", color: "var(--ink-muted)" }} data-testid="countdown-empty">
      No deadline set
    </div>
  );

  const days = daysUntil(targetDate);
  const color = colorForDays(days);
  const barColor = { red: "var(--accent-2)", amber: "var(--accent-4)", green: "var(--accent-3)", neutral: "var(--ink-muted)" }[color];

  const target = new Date(targetDate + "T23:59:59");
  const diffMs = Math.max(0, target - now);
  const hours = Math.floor(diffMs / 3600000);

  let label, pct;
  if (days === null) return null;
  if (days < 0) {
    label = `Deadline passed ${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} ago`;
    pct = 0;
  } else if (days === 0) {
    label = `Last day — ${hours}h remaining`;
    pct = Math.max(5, (hours / 24) * 100);
  } else if (days === 1) {
    label = "1 day left";
    pct = 15;
  } else if (days <= 7) {
    label = `${days} days left`;
    pct = (days / 7) * 100;
  } else {
    label = `${days} days left`;
    pct = Math.min(100, (days / 30) * 100);
  }

  return (
    <div data-testid="countdown-timer">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: barColor }}>{label}</span>
        {days >= 0 && <span style={{ fontSize: "0.75rem", color: "var(--ink-muted)" }}>Apply deadline</span>}
      </div>
      {days >= 0 && (
        <div style={{ height: "5px", background: "rgba(255,255,255,0.08)", borderRadius: "99px", overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${pct}%`,
            background: barColor,
            borderRadius: "99px",
            transition: "width 0.6s ease"
          }} />
        </div>
      )}
    </div>
  );
}
