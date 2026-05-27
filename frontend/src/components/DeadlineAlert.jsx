import React from "react";
import { AlertTriangle } from "lucide-react";
import { daysUntil } from "../lib/utils-date";

export default function DeadlineAlert({ jobs }) {
  // Find unapplied jobs with deadline ≤ 3 days and >= 0 (not yet overdue) OR overdue
  const urgent = jobs.filter((j) => {
    if (j.applied) return false;
    const d = daysUntil(j.last_date);
    return d !== null && d <= 3;
  });

  if (urgent.length === 0) return null;

  return (
    <div
      className="bg-[#FCFAF5] border-2 border-[#8C3A3A] shadow-stamp p-4 sm:p-5 animate-notice"
      data-testid="deadline-alert"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle size={22} strokeWidth={1.75} className="text-[#8C3A3A] shrink-0 mt-0.5" />
        <div className="min-w-0">
          <div className="font-serif font-black text-lg sm:text-xl text-[#8C3A3A]">
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
