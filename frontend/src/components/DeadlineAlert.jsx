import React, { useState, useEffect } from "react";
import { X, AlertTriangle } from "lucide-react";
import { daysUntil } from "../lib/utils-date";

export default function DeadlineAlert({ jobs }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("popup_dismissed")) return;
    setVisible(true);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem("popup_dismissed", "1");
    setVisible(false);
  };

  const urgent = jobs.filter(j => {
    if (j.applied) return false;
    const d = daysUntil(j.last_date);
    return d !== null && d <= 3 && d >= 0;
  });

  if (!visible || urgent.length === 0) return null;

  let startX = 0;

  return (
    <div
      className="anim-slide-down"
      data-testid="deadline-alert"
      role="alert"
      onTouchStart={e => { startX = e.touches[0].clientX; }}
      onTouchEnd={e => { if (Math.abs(e.changedTouches[0].clientX - startX) > 60) dismiss(); }}
      style={{
        margin: "16px 20px 0",
        background: "rgba(255,101,132,0.12)",
        border: "1px solid rgba(255,101,132,0.35)",
        borderRadius: "var(--radius-lg)",
        padding: "16px 18px",
        position: "relative",
      }}
    >
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        type="button"
        style={{
          position: "absolute", top: "12px", right: "12px",
          background: "rgba(255,255,255,0.08)", border: "none",
          borderRadius: "50%", width: "32px", height: "32px",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--ink-soft)", cursor: "pointer",
        }}
      >
        <X size={15} />
      </button>

      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", paddingRight: "36px" }}>
        <AlertTriangle size={20} color="var(--accent-2)" style={{ flexShrink: 0, marginTop: "2px" }} />
        <div>
          <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--accent-2)", marginBottom: "4px" }}>
            {urgent.length} deadline{urgent.length > 1 ? "s" : ""} closing soon!
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {urgent.slice(0, 3).map(j => {
              const d = daysUntil(j.last_date);
              return (
                <li key={j.id} data-testid={`urgent-job-${j.id}`} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span style={{
                    fontSize: "0.75rem", fontWeight: 700, padding: "2px 8px",
                    background: d === 0 ? "var(--accent-2)" : "rgba(255,101,132,0.2)",
                    color: d === 0 ? "white" : "var(--accent-2)",
                    borderRadius: "99px", flexShrink: 0
                  }}>
                    {d === 0 ? "TODAY" : d === 1 ? "Tomorrow" : `${d} days`}
                  </span>
                  <span style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {j.job_name}
                  </span>
                </li>
              );
            })}
            {urgent.length > 3 && (
              <li style={{ fontSize: "0.8125rem", color: "var(--ink-muted)" }}>+{urgent.length - 3} more</li>
            )}
          </ul>
          <div style={{ fontSize: "0.75rem", color: "rgba(255,101,132,0.6)", marginTop: "8px" }}>
            Swipe left/right or tap ✕ to dismiss
          </div>
        </div>
      </div>
    </div>
  );
}
