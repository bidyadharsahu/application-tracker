
import React, { useState, useEffect } from "react";
import { X, AlertTriangle } from "lucide-react";
import { daysUntil } from "../lib/utils-date";

export default function DeadlineAlert({ jobs }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { if (!sessionStorage.getItem("popup_dismissed")) setVisible(true); }, []);
  const dismiss = () => { sessionStorage.setItem("popup_dismissed", "1"); setVisible(false); };

  const urgent = jobs.filter(j => { if (j.applied) return false; const d = daysUntil(j.last_date); return d !== null && d <= 3 && d >= 0; });
  if (!visible || urgent.length === 0) return null;

  let sX = 0;
  return (
    <div data-testid="deadline-alert" role="alert"
      onTouchStart={e => { sX = e.touches[0].clientX; }}
      onTouchEnd={e => { if (Math.abs(e.changedTouches[0].clientX - sX) > 60) dismiss(); }}
      style={{ background: "var(--tint-red-bg)", borderRadius: 14, padding: "14px 16px", marginBottom: 12, position: "relative" }}>
      <button onClick={dismiss} type="button" aria-label="Dismiss" style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", color: "var(--ios-red)", cursor: "pointer", padding: 4, display: "flex" }}><X size={16} /></button>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, paddingRight: 28 }}>
        <AlertTriangle size={18} color="var(--ios-red)" style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#D6291E", marginBottom: 8 }}>
            {urgent.length} deadline{urgent.length > 1 ? "s" : ""} closing soon
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
            {urgent.slice(0, 3).map(j => {
              const d = daysUntil(j.last_date);
              return (
                <li key={j.id} data-testid={`urgent-job-${j.id}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", background: d === 0 ? "var(--ios-red)" : "rgba(255,59,48,.14)", color: d === 0 ? "#fff" : "#D6291E", borderRadius: 99, flexShrink: 0 }}>
                    {d === 0 ? "Today" : d === 1 ? "Tomorrow" : `${d} days`}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--label-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.job_name}</span>
                </li>
              );
            })}
            {urgent.length > 3 && <li style={{ fontSize: 12, color: "var(--label-3)" }}>+{urgent.length - 3} more</li>}
          </ul>
          <div style={{ fontSize: 12, color: "#D6291E", opacity: .65, marginTop: 8 }}>Swipe to dismiss</div>
        </div>
      </div>
    </div>
  );
}
