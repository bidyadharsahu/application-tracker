import React, { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { daysUntil, colorForDays } from "../lib/utils-date";

export default function Countdown({ targetDate, compact = false }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  if (!targetDate) {
    return (
      <span className="font-mono text-sm text-[#59554D]" data-testid="countdown-empty">
        — no deadline —
      </span>
    );
  }

  const days = daysUntil(targetDate);
  const color = colorForDays(days);
  const colorClass = {
    red: "text-[#8C3A3A]",
    amber: "text-[#B5651D]",
    green: "text-[#3A5A40]",
    neutral: "text-[#59554D]",
  }[color];

  // Hours remaining for the day
  const target = new Date(targetDate + "T23:59:59");
  const diffMs = target - now;

  let label;
  if (diffMs < 0) {
    const overDays = Math.abs(days);
    label = `Closed ${overDays}d ago`;
  } else if (days === 0) {
    const hours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
    label = `Last day — ${hours}h left`;
  } else if (days === 1) {
    label = `1 day left`;
  } else {
    label = `${days} days left`;
  }

  return (
    <div
      className={`inline-flex items-center gap-2 font-mono font-bold ${colorClass} ${
        compact ? "text-xs" : "text-sm"
      }`}
      data-testid="countdown-timer"
    >
      <Clock size={compact ? 14 : 16} strokeWidth={1.75} />
      <span className="uppercase tracking-wider">{label}</span>
    </div>
  );
}
