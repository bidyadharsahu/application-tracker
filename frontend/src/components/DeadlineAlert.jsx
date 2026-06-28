import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { daysUntil } from "../lib/utils-date";

export default function DeadlineAlert({ jobs }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { if (!sessionStorage.getItem("popup_dismissed")) setVisible(true); }, []);
  const dismiss = () => { sessionStorage.setItem("popup_dismissed", "1"); setVisible(false); };

  const urgent = jobs.filter(j => {
    if (j.applied) return false;
    const d = daysUntil(j.last_date);
    return d !== null && d <= 3 && d >= 0;
  });

  if (!visible || urgent.length === 0) return null;

  let startX = 0;
  return (
    <div className="anim-rise-up card-parchment" data-testid="deadline-alert" role="alert"
      onTouchStart={e => { startX = e.touches[0].clientX; }}
      onTouchEnd={e => { if (Math.abs(e.changedTouches[0].clientX - startX) > 60) dismiss(); }}
      style={{
        marginBottom: "20px", padding: "16px 18px", position: "relative",
        border: "1px solid rgba(139,46,46,0.28)",
        background: "linear-gradient(135deg, rgba(253,248,238,0.97) 0%, rgba(239,220,210,0.93) 100%)",
      }}
    >
      <button onClick={dismiss} type="button" aria-label="Dismiss"
        style={{ position: "absolute", top: "12px", right: "12px", background: "none", border: "none", color: "var(--ink-soft)", cursor: "pointer", padding: "4px" }}>
        <X size={15} strokeWidth={1.5}/>
      </button>

      <div style={{ paddingRight: "28px" }}>
        <div style={{ fontFamily: "var(--font-accent)", fontSize: "1.0625rem", fontWeight: 600, color: "var(--pigment-red)", marginBottom: "10px" }}>
          ⚑ {urgent.length} deadline{urgent.length > 1 ? "s" : ""} approaching
        </div>
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {urgent.slice(0, 3).map(j => {
            const d = daysUntil(j.last_date);
            return (
              <li key={j.id} data-testid={`urgent-job-${j.id}`} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                <span style={{
                  fontFamily: "var(--font-body)", fontSize: "0.8rem", fontWeight: 600,
                  padding: "2px 10px", background: d === 0 ? "var(--pigment-red)" : "rgba(139,46,46,0.12)",
                  color: d === 0 ? "white" : "var(--pigment-red)",
                  borderRadius: "2px", flexShrink: 0
                }}>
                  {d === 0 ? "Today" : d === 1 ? "Tomorrow" : `${d} days`}
                </span>
                <span style={{ fontFamily: "var(--font-body)", fontSize: "1rem", color: "var(--ink-dark)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {j.job_name}
                </span>
              </li>
            );
          })}
          {urgent.length > 3 && (
            <li style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem", fontStyle: "italic", color: "var(--ink-soft)" }}>
              and {urgent.length - 3} more...
            </li>
          )}
        </ul>
        <div style={{ fontFamily: "var(--font-body)", fontSize: "0.8125rem", fontStyle: "italic", color: "rgba(139,46,46,0.55)", marginTop: "8px" }}>
          Swipe to dismiss
        </div>
      </div>
    </div>
  );
}
