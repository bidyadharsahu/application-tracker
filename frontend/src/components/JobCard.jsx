import React from "react";
import { ExternalLink, CalendarDays, FileText, CheckCircle2, Circle, Pencil, Trash2, Copy } from "lucide-react";
import Countdown from "./Countdown";
import { formatDate } from "../lib/utils-date";

export default function JobCard({ job, admin = false, onToggle, onEdit, onDelete }) {
  const isApplied = !!job.applied;

  const stampBase =
    "inline-block border-2 font-mono font-bold px-3 py-1 uppercase tracking-widest text-xs sm:text-sm bg-transparent select-none";
  const stampClass = isApplied
    ? `${stampBase} border-[#3A5A40] text-[#3A5A40] -rotate-2`
    : `${stampBase} border-[#8C3A3A] text-[#8C3A3A] rotate-2`;

  return (
    <article
      className="relative bg-[#FCFAF5] border-2 border-[#2C2A26] shadow-stamp hover:shadow-stamp-lg hover:-translate-y-1 transition-all duration-200 p-5 sm:p-6 animate-notice"
      data-testid={`job-card-${job.id}`}
    >
      {/* Stamp top-right */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
        <span className={stampClass} data-testid={`status-stamp-${job.id}`}>
          {isApplied ? "Applied" : "Pending"}
        </span>
      </div>

      {/* Job Title */}
      <h3
        className="font-serif font-black text-xl sm:text-2xl text-[#2C2A26] pr-24 sm:pr-28 leading-tight tracking-tight"
        data-testid={`job-title-${job.id}`}
      >
        {job.job_name}
      </h3>

      {/* Dotted vintage divider */}
      <div className="divider-vintage my-4" aria-hidden="true" />

      {/* Meta data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div className="flex items-start gap-2">
          <CalendarDays size={18} strokeWidth={1.5} className="mt-0.5 text-[#59554D] shrink-0" />
          <div className="min-w-0">
            <div className="font-mono text-[10px] sm:text-xs uppercase tracking-widest text-[#59554D]">
              Last date
            </div>
            <div
              className="font-mono font-bold text-sm sm:text-base text-[#2C2A26]"
              data-testid={`job-last-date-${job.id}`}
            >
              {formatDate(job.last_date)}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <FileText size={18} strokeWidth={1.5} className="mt-0.5 text-[#59554D] shrink-0" />
          <div className="min-w-0">
            <div className="font-mono text-[10px] sm:text-xs uppercase tracking-widest text-[#59554D]">
              Exam date
            </div>
            <div
              className="font-mono font-bold text-sm sm:text-base text-[#2C2A26]"
              data-testid={`job-exam-date-${job.id}`}
            >
              {job.exam_date ? formatDate(job.exam_date) : "— TBA —"}
            </div>
          </div>
        </div>
      </div>

      {/* Countdown */}
      <div className="mb-4">
        <Countdown targetDate={job.last_date} />
      </div>

      {job.notes && (
        <p
          className="font-sans text-sm sm:text-base text-[#59554D] italic mb-4 line-clamp-2"
          data-testid={`job-notes-${job.id}`}
        >
          “{job.notes}”
        </p>
      )}

      {/* Credentials */}
      {(job.app_username || job.app_password) && (
        <div className="bg-[#EBE5D9]/50 border-2 border-dashed border-[#2C2A26] p-3 mb-4 flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="font-mono text-xs uppercase tracking-widest text-[#59554D] font-bold shrink-0">
            Login
          </div>
          <div className="flex flex-wrap gap-2">
            {job.app_username && (
              <div className="flex items-center gap-2 bg-[#FCFAF5] border-2 border-[#2C2A26] px-2 py-1">
                <span className="font-mono text-[10px] sm:text-xs text-[#59554D] uppercase">ID:</span>
                <span className="font-mono text-xs sm:text-sm font-bold">{job.app_username}</span>
                <button
                  type="button"
                  className="text-[#59554D] hover:text-[#2C2A26] transition-colors"
                  onClick={() => navigator.clipboard.writeText(job.app_username)}
                  title="Copy Username"
                >
                  <Copy size={14} />
                </button>
              </div>
            )}
            {job.app_password && (
              <div className="flex items-center gap-2 bg-[#FCFAF5] border-2 border-[#2C2A26] px-2 py-1">
                <span className="font-mono text-[10px] sm:text-xs text-[#59554D] uppercase">PW:</span>
                <span className="font-mono text-xs sm:text-sm font-bold">{job.app_password}</span>
                <button
                  type="button"
                  className="text-[#59554D] hover:text-[#2C2A26] transition-colors"
                  onClick={() => navigator.clipboard.writeText(job.app_password)}
                  title="Copy Password"
                >
                  <Copy size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 sm:gap-3 pt-2">
        <a
          href={job.apply_link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#2C2A26] text-[#FCFAF5] font-serif font-bold text-sm sm:text-base px-4 py-2 border-2 border-[#2C2A26] hover:bg-transparent hover:text-[#2C2A26] transition-colors"
          data-testid={`apply-link-${job.id}`}
        >
          Apply Now <ExternalLink size={16} strokeWidth={2} />
        </a>

        {admin && (
          <>
            <button
              onClick={() => onToggle && onToggle(job)}
              className="inline-flex items-center gap-2 bg-transparent text-[#2C2A26] font-serif font-bold text-sm sm:text-base px-4 py-2 border-2 border-[#2C2A26] hover:bg-[#EBE5D9] transition-colors"
              data-testid={`toggle-applied-${job.id}`}
              type="button"
            >
              {isApplied ? <CheckCircle2 size={16} /> : <Circle size={16} />}
              {isApplied ? "Mark unapplied" : "Mark applied"}
            </button>
            <button
              onClick={() => onEdit && onEdit(job)}
              className="inline-flex items-center gap-2 bg-transparent text-[#2C2A26] font-serif font-bold text-sm sm:text-base px-4 py-2 border-2 border-[#2C2A26] hover:bg-[#EBE5D9] transition-colors"
              data-testid={`edit-job-${job.id}`}
              type="button"
            >
              <Pencil size={16} /> Edit
            </button>
            <button
              onClick={() => onDelete && onDelete(job)}
              className="inline-flex items-center gap-2 bg-transparent text-[#8C3A3A] font-serif font-bold text-sm sm:text-base px-4 py-2 border-2 border-[#8C3A3A] hover:bg-[#8C3A3A] hover:text-[#FCFAF5] transition-colors"
              data-testid={`delete-job-${job.id}`}
              type="button"
            >
              <Trash2 size={16} /> Delete
            </button>
          </>
        )}
      </div>
    </article>
  );
}
