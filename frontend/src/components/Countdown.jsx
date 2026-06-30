
import React, { useEffect, useState } from "react";
import { daysUntil } from "../lib/utils-date";

export default function Countdown({ targetDate }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);
  if (!targetDate) return <div data-testid="countdown-empty" style={{ fontSize: 13, color: "var(--label-4)" }}>No deadline set</div>;

  const days = daysUntil(targetDate);
  const target = new Date(targetDate + "T23:59:59");
  const hours = Math.floor(Math.max(0, target - now) / 3600000);
  let label, pct, color;
  if (days === null) return null;
  if (days < 0)      { label = `Deadline passed ${Math.abs(days)}d ago`; pct = 0; color = "var(--label-4)"; }
  else if (days===0) { label = `Last day — ${hours}h left`; pct = Math.max(5,(hours/24)*100); color = "var(--ios-red)"; }
  else if (days===1) { label = "1 day left"; pct = 15; color = "var(--ios-red)"; }
  else if (days<=7)  { label = `${days} days left`; pct = (days/7)*100; color = "#B25900"; }
  else                { label = `${days} days left`; pct = Math.min(100,(days/30)*100); color = "var(--ios-green)"; }

  return (
    <div data-testid="countdown-timer">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{label}</span>
        {days >= 0 && <span style={{ fontSize: 11, color: "var(--label-4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em" }}>Deadline</span>}
      </div>
      {days >= 0 && (
        <div style={{ height: 5, background: "var(--fill-3)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: pct + "%", background: color, borderRadius: 99, transition: "width .6s ease" }} />
        </div>
      )}
    </div>
  );
}
