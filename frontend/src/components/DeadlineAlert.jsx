import React, { useState, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import { daysUntil } from "../lib/utils-date";

export default function DeadlineAlert({ jobs }) {
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    // Only show once per session — never show again after dismissed
    const dismissed = sessionStorage.getItem("popup_dismissed");
    if (dismissed) return;
    setShowPopup(true);
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem("popup_dismissed", "1");
    setShowPopup(false);
  };

  // Jobs with deadline ≤ 3 days away (unapplied)
  const urgent = jobs.filter((j) => {
    if (j.applied) return false;
    const d = daysUntil(j.last_date);
    return d !== null && d <= 3 && d >= 0;
  });

  // Also show overdue (not applied, last_date passed)
  const overdue = jobs.filter((j) => {
    if (j.applied) return false;
    const d = daysUntil(j.last_date);
    return d !== null && d < 0;
  });

  const allUrgent = [...urgent, ...overdue];

  if (allUrgent.length === 0 || !showPopup) return null;

  let startX = 0;
  const handleTouchStart = (e) => { startX = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (Math.abs(e.changedTouches[0].clientX - startX) > 60) handleDismiss();
  };

  return (
    <div
      className="bg-[#FCFAF5] border-2 border-[#8C3A3A] shadow-stamp p-4 sm:p-5 animate-notice relative"
      data-testid="deadline-alert"
      role="alert"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-[#8C3A3A] hover:bg-[#EBE5D9] p-1 rounded transition-colors"
        aria-label="Dismiss alert"
        type="button"
      >
        <X size={20} />
      </button>

      <div className="flex items-start gap-3">
        <AlertTriangle size={22} strokeWidth={1.75} className="text-[#8C3A3A] shrink-0 mt-0.5" />
        <div className="min-w-0 pr-6">
          <div className="font-serif font-bold text-lg sm:text-xl text-[#8C3A3A]">
            ⚠️ Deadline Alert!
          </div>
          <div className="font-sans text-base sm:text-lg text-[#2C2A26] mt-1">
            <strong>{urgent.length}</strong> job{urgent.length !== 1 ? "s" : ""} closing within 3 days.
            {overdue.length > 0 && (
              <span className="ml-1 text-[#8C3A3A]">
                + <strong>{overdue.length}</strong> already overdue!
              </span>
            )}
          </div>
          <ul className="mt-2 font-mono text-sm sm:text-base text-[#59554D] space-y-1">
            {allUrgent.slice(0, 4).map((j) => {
              const d = daysUntil(j.last_date);
              return (
                <li key={j.id} className="flex items-center gap-2 truncate" data-testid={`urgent-job-${j.id}`}>
                  <span className={d < 0 ? "text-[#8C3A3A]" : d === 0 ? "text-[#8C3A3A] font-bold" : "text-[#B5651D]"}>
                    {d < 0 ? "OVERDUE" : d === 0 ? "TODAY" : `${d}d left`}
                  </span>
                  <span className="truncate">— {j.job_name}</span>
                </li>
              );
            })}
            {allUrgent.length > 4 && (
              <li className="text-[#59554D]">and {allUrgent.length - 4} more...</li>
            )}
          </ul>
          <p className="mt-2 font-mono text-xs text-[#59554D] italic">Swipe or click ✕ to dismiss</p>
        </div>
      </div>
    </div>
  );
}
