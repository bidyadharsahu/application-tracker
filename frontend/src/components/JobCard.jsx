import React from "react";
import { ExternalLink, CalendarDays, FileText, CheckCircle2, Circle, Pencil, Trash2, Copy } from "lucide-react";
import { differenceInCalendarDays } from "date-fns";
import Countdown from "./Countdown";
import { formatDate } from "../lib/utils-date";
import supabase from "../lib/supabase";

export default function JobCard({ job, admin = false, onToggle, onEdit, onDelete }) {
  const isApplied = !!job.applied;
  const today = new Date().toISOString().split("T")[0];
  const isFuture = job.start_date && job.start_date > today;
  const allDatesBlank = !job.start_date && !job.exam_date && !job.last_date;
  const isNotStarted = isFuture || allDatesBlank;

  const uploadDocument = async (jobId, file, docType) => {
    const filePath = `${jobId}/${docType}-${Date.now()}-${file.name}`;
    
    const { error: uploadError } = await supabase.storage
      .from('job-documents')
      .upload(filePath, file);

    if (!uploadError) {
      await supabase.from('job_documents').insert({
        job_id: jobId,
        file_name: file.name,
        file_path: filePath,
        document_type: docType
      });
    }
  };

  const getExamCountdown = (examDate) => {
    if (!examDate) return null;
    const days = differenceInCalendarDays(new Date(examDate), new Date());
    if (days < 0) return { text: 'Exam passed', color: 'text-[#8C3A3A]' };
    if (days === 0) return { text: '🚨 Exam TODAY!', color: 'text-[#8C3A3A] font-bold' };
    if (days === 1) return { text: '⚠️ Exam TOMORROW', color: 'text-[#D97706] font-bold' };
    if (days <= 7) return { text: `⏰ Exam in ${days} days`, color: 'text-[#D97706]' };
    return { text: `📅 Exam in ${days} days`, color: 'text-[#3A5A40]' };
  };

  const stampBase =
    "inline-block border-2 font-mono font-bold px-3 py-1 uppercase tracking-wider text-base sm:text-lg bg-transparent select-none";

  let stampText = "Pending";
  let stampColorClass = "border-[#8C3A3A] text-[#8C3A3A] rotate-2";

  if (isApplied) {
    stampText = "Applied";
    stampColorClass = "border-[#3A5A40] text-[#3A5A40] -rotate-2";
  } else if (isNotStarted) {
    stampText = "Not Started Yet";
    stampColorClass = "border-[#D97706] text-[#D97706] rotate-2"; // Orange-ish for future
  }

  const stampClass = `${stampBase} ${stampColorClass}`;

  return (
    <article
      className="relative bg-[#FCFAF5] border-2 border-[#2C2A26] shadow-stamp hover:shadow-stamp-lg hover:-translate-y-1 transition-all duration-200 p-5 sm:p-6 animate-notice"
      data-testid={`job-card-${job.id}`}
    >
      {/* Stamp top-right */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
        <span className={stampClass} data-testid={`status-stamp-${job.id}`}>
          {stampText}
        </span>
      </div>

      {/* Job Title */}
      <h3
        className="font-sans font-bold text-3xl sm:text-4xl text-[#2C2A26] pr-24 sm:pr-28 leading-tight tracking-tight"
        data-testid={`job-title-${job.id}`}
      >
        {job.job_name}
      </h3>

      {/* Tags */}
      {job.tags && (
        <div className="flex flex-wrap gap-2 mt-2 pr-24 sm:pr-28">
          {job.tags.split(',').map((tag, i) => tag.trim() && (
            <span key={i} className="bg-[#EBE5D9] px-2 py-0.5 font-mono text-lg sm:text-xl uppercase tracking-wider text-[#59554D] border border-[#2C2A26]">
              {tag.trim()}
            </span>
          ))}
        </div>
      )}

      {/* Auto-discovered badge */}
      {job.source && job.source !== 'manual' && (
        <div className="mt-2 pr-24 sm:pr-28">
          <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-[#3A5A40] px-2 py-0.5 rounded-full border border-[#3A5A40]">
            🤖 Auto-found · Match {job.match_score}%
          </span>
          {job.match_reason && (
            <p className="text-xs text-[#59554D] mt-1">{job.match_reason}</p>
          )}
        </div>
      )}

      {/* Dotted vintage divider */}
      <div className="divider-vintage my-4" aria-hidden="true" />

      {/* Meta data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {!isApplied && (
          <div className="flex items-start gap-2">
            <CalendarDays size={18} strokeWidth={1.5} className="mt-0.5 text-[#59554D] shrink-0" />
            <div className="min-w-0">
              <div className="font-mono text-lg sm:text-xl uppercase tracking-wider text-[#59554D]">
                Last date
              </div>
              <div
                className="font-mono font-bold text-lg sm:text-xl text-[#2C2A26]"
                data-testid={`job-last-date-${job.id}`}
              >
                {job.last_date ? formatDate(job.last_date) : "— TBA —"}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-start gap-2">
          <FileText size={18} strokeWidth={1.5} className="mt-0.5 text-[#59554D] shrink-0" />
          <div className="min-w-0">
            <div className="font-mono text-lg sm:text-xl uppercase tracking-wider text-[#59554D]">
              Exam date
            </div>
            <div
              className="font-mono font-bold text-lg sm:text-xl text-[#2C2A26]"
              data-testid={`job-exam-date-${job.id}`}
            >
              {job.exam_date ? formatDate(job.exam_date) : "— TBA —"}
            </div>
            {job.exam_date && (() => {
              const countdown = getExamCountdown(job.exam_date);
              return (
                <div className={`text-sm sm:text-base mt-1 font-mono uppercase ${countdown.color}`}>
                  {countdown.text}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Countdown */}
      {!isApplied && (
        <div className="mb-4">
          <Countdown targetDate={job.last_date} />
        </div>
      )}

      {job.notes && (
        <p
          className="font-sans text-lg sm:text-xl text-[#59554D] italic mb-4 line-clamp-2"
          data-testid={`job-notes-${job.id}`}
        >
          “{job.notes}”
        </p>
      )}

      {/* Credentials */}
      {(job.app_username || job.app_password) && (
        <div className="bg-[#EBE5D9]/50 border-2 border-dashed border-[#2C2A26] p-3 mb-4 flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="font-mono text-xl uppercase tracking-wider text-[#59554D] font-bold shrink-0">
            Login
          </div>
          <div className="flex flex-wrap gap-2">
            {job.app_username && (
              <div className="flex items-center gap-2 bg-[#FCFAF5] border-2 border-[#2C2A26] px-2 py-1">
                <span className="font-mono text-lg sm:text-xl text-[#59554D] uppercase">ID:</span>
                <span className="font-mono text-base sm:text-lg font-bold">{job.app_username}</span>
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
                <span className="font-mono text-lg sm:text-xl text-[#59554D] uppercase">PW:</span>
                <span className="font-mono text-base sm:text-lg font-bold">{job.app_password}</span>
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

      {/* Documents Upload */}
      <div className="mb-4">
        <div className="font-mono text-sm uppercase tracking-wider text-[#59554D] mb-2">Documents</div>
        <div className="flex flex-wrap gap-2">
          {['admit_card', 'hall_ticket', 'result'].map(type => (
            <label key={type} className="text-xs cursor-pointer font-mono uppercase bg-[#FCFAF5] border border-[#2C2A26] px-2 py-1 hover:bg-[#EBE5D9] transition-colors">
              📎 {type.replace('_', ' ')}
              <input
                type="file" className="hidden" accept=".pdf,.jpg,.png"
                onChange={e => e.target.files[0] && uploadDocument(job.id, e.target.files[0], type)}
              />
            </label>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 sm:gap-3 pt-2">
        {isFuture ? (
          <div className="inline-flex items-center gap-2 bg-[#EBE5D9] text-[#59554D] font-serif font-bold text-lg sm:text-xl px-4 py-2 border-2 border-[#59554D] cursor-not-allowed">
            Starts {formatDate(job.start_date)}
          </div>
        ) : (
          <a
            href={job.apply_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#2C2A26] text-[#FCFAF5] font-serif font-bold text-lg sm:text-xl px-4 py-2 border-2 border-[#2C2A26] hover:bg-transparent hover:text-[#2C2A26] transition-colors"
            data-testid={`apply-link-${job.id}`}
          >
            Apply Now <ExternalLink size={16} strokeWidth={2} />
          </a>
        )}

        {(!isApplied || admin) && (
          <button
            onClick={() => onToggle && onToggle(job)}
            className="inline-flex items-center gap-2 bg-transparent text-[#2C2A26] font-serif font-bold text-lg sm:text-xl px-4 py-2 border-2 border-[#2C2A26] hover:bg-[#EBE5D9] transition-colors"
            data-testid={`toggle-applied-${job.id}`}
            type="button"
          >
            {isApplied ? <CheckCircle2 size={16} /> : <Circle size={16} />}
            {isApplied ? "Mark unapplied" : "Mark applied"}
          </button>
        )}

        {admin && (
          <>
            <button
              onClick={() => onEdit && onEdit(job)}
              className="inline-flex items-center gap-2 bg-transparent text-[#2C2A26] font-serif font-bold text-lg sm:text-xl px-4 py-2 border-2 border-[#2C2A26] hover:bg-[#EBE5D9] transition-colors"
              data-testid={`edit-job-${job.id}`}
              type="button"
            >
              <Pencil size={16} /> Edit
            </button>
            <button
              onClick={() => onDelete && onDelete(job)}
              className="inline-flex items-center gap-2 bg-transparent text-[#8C3A3A] font-serif font-bold text-lg sm:text-xl px-4 py-2 border-2 border-[#8C3A3A] hover:bg-[#8C3A3A] hover:text-[#FCFAF5] transition-colors"
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
