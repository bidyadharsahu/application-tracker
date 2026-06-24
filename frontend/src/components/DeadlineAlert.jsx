import React, { useState, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import { daysUntil } from "../lib/utils-date";

export default function DeadlineAlert({ jobs }) {
  const [showPopup, setShowPopup] = useState(true);

  useEffect(() => {
    const dismissed = sessionStorage.getItem('popup_dismissed');
    if (dismissed) setShowPopup(false);
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem('popup_dismissed', '1');
    setShowPopup(false);
  };

  // Find unapplied jobs with deadline ≤ 3 days and >= 0 (not yet overdue) OR overdue
  const urgent = jobs.filter((j) => {
    if (j.applied) return false;
    const d = daysUntil(j.last_date);
    return d !== null && d <= 3;
  });

  if (urgent.length === 0 || !showPopup) return null;

  let startX = 0;

  const handleTouchStart = (e) => {
    startX = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (Math.abs(e.changedTouches[0].clientX - startX) > 60) {
      handleDismiss();
    }
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
        className="absolute top-2 right-2 text-[#8C3A3A] hover:bg-[#EBE5D9] p-1 transition-colors"
        aria-label="Dismiss"
      >
        <X size={20} />
      </button>
      <div className="flex items-start gap-3">
        <AlertTriangle size={22} strokeWidth={1.75} className="text-[#8C3A3A] shrink-0 mt-0.5" />
        <div className="min-w-0 pr-6">
          <div className="font-serif font-bold text-lg sm:text-xl text-[#8C3A3A]">
            Hey — you haven't applied yet!
          </div>
          <div className="font-sans text-lg sm:text-xl text-[#2C2A26] mt-1">
            <strong>{urgent.length}</strong> {urgent.length === 1 ? "job is" : "jobs are"}{" "}
            closing within 3 days. Don't miss the deadline.
          </div>
          <ul className="mt-2 font-mono text-base sm:text-lg text-[#59554D] list-disc list-inside">
            {urgent.slice(0, 3).map((j) => (
              <li key={j.id} className="truncate" data-testid={`urgent-job-${j.id}`}>
                {j.job_name}
              </li>
            ))}
            {urgent.length > 3 && <li>and {urgent.length - 3} more...</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
