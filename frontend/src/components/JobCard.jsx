import React, { useState, useEffect } from "react";
import {
  ExternalLink, CalendarDays, FileText, CheckCircle2, Circle,
  Pencil, Trash2, Copy, Clock, AlertTriangle, ChevronDown, ChevronUp, Paperclip
} from "lucide-react";
import { formatDate, daysUntil } from "../lib/utils-date";
import Countdown from "./Countdown";
import supabase from "../lib/supabase";
import { toast } from "sonner";

export default function JobCard({ job, admin = false, onToggle, onEdit, onDelete }) {
  const isApplied = !!job.applied;
  const today = new Date().toISOString().split("T")[0];
  const isFuture = job.start_date && job.start_date > today;
  const allDatesBlank = !job.start_date && !job.exam_date && !job.last_date;
  const isNotStarted = isFuture || allDatesBlank;
  const [docsExpanded, setDocsExpanded] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState([]);

  // Load existing docs for this job
  useEffect(() => {
    if (!docsExpanded) return;
    supabase
      .from("job_documents")
      .select("*")
      .eq("job_id", job.id)
      .then(({ data }) => setUploadedDocs(data || []));
  }, [docsExpanded, job.id]);

  // Upload document to Supabase Storage
  const uploadDocument = async (jobId, file, docType) => {
    const filePath = `${jobId}/${docType}-${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("job-documents")
      .upload(filePath, file);
    if (uploadError) {
      toast.error("Upload failed: " + uploadError.message);
      return;
    }
    const { error: dbErr } = await supabase.from("job_documents").insert({
      job_id: jobId,
      file_name: file.name,
      file_path: filePath,
      document_type: docType,
    });
    if (!dbErr) {
      toast.success(`${docType.replace("_", " ")} uploaded!`);
      setUploadedDocs((prev) => [...prev, { file_name: file.name, file_path: filePath, document_type: docType }]);
    }
  };

  // Open stored document
  const openDoc = async (filePath) => {
    const { data } = await supabase.storage.from("job-documents").createSignedUrl(filePath, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  // Exam countdown
  const getExamCountdown = (examDate) => {
    if (!examDate) return null;
    const days = Math.ceil((new Date(examDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (days < 0) return { text: `Exam was ${Math.abs(days)}d ago`, color: "text-[#59554D]", urgent: false };
    if (days === 0) return { text: "🚨 EXAM TODAY!", color: "text-[#8C3A3A] font-bold animate-pulse", urgent: true };
    if (days === 1) return { text: "⚠️ Exam TOMORROW!", color: "text-[#8C3A3A] font-bold", urgent: true };
    if (days <= 7) return { text: `⚠️ Exam in ${days} days`, color: "text-[#8C3A3A] font-bold", urgent: true };
    if (days <= 30) return { text: `📅 Exam in ${days} days`, color: "text-[#B5651D]", urgent: false };
    return { text: `📅 Exam in ${days} days`, color: "text-[#3A5A40]", urgent: false };
  };

  // Status stamp
  const stampBase = "inline-block border-2 font-mono font-bold px-3 py-1 uppercase tracking-wider text-base sm:text-lg bg-transparent select-none";
  let stampText = "Pending";
  let stampColorClass = "border-[#8C3A3A] text-[#8C3A3A] rotate-2";
  if (isApplied) {
    stampText = "Applied";
    stampColorClass = "border-[#3A5A40] text-[#3A5A40] -rotate-2";
  } else if (isNotStarted) {
    stampText = "Not Started";
    stampColorClass = "border-[#D97706] text-[#D97706] rotate-2";
  }

  const examCountdown = job.exam_date ? getExamCountdown(job.exam_date) : null;

  return (
    <article
      className={`relative bg-[#FCFAF5] border-2 border-[#2C2A26] shadow-stamp hover:shadow-stamp-lg hover:-translate-y-1 transition-all duration-200 p-5 sm:p-6 animate-notice ${
        examCountdown?.urgent ? "ring-2 ring-[#8C3A3A] ring-offset-1" : ""
      }`}
      data-testid={`job-card-${job.id}`}
    >
      {/* Stamp */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
        <span className={`${stampBase} ${stampColorClass}`} data-testid={`status-stamp-${job.id}`}>
          {stampText}
        </span>
      </div>

      {/* Title */}
      <h3
        className="font-sans font-bold text-2xl sm:text-3xl text-[#2C2A26] pr-28 leading-tight tracking-tight"
        data-testid={`job-title-${job.id}`}
      >
        {job.job_name}
      </h3>

      {/* Tags */}
      {job.tags && (
        <div className="flex flex-wrap gap-1.5 mt-2 pr-28">
          {job.tags.split(",").map((tag, i) =>
            tag.trim() ? (
              <span
                key={i}
                className="bg-[#EBE5D9] px-2 py-0.5 font-mono text-xs uppercase tracking-wider text-[#59554D] border border-[#2C2A26]"
              >
                {tag.trim()}
              </span>
            ) : null
          )}
        </div>
      )}

      {/* Auto-discovered badge */}
      {job.source && job.source !== "manual" && (
        <div className="mt-2">
          <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-[#3A5A40] px-2 py-0.5 rounded-full border border-[#3A5A40]">
            🤖 Auto-found · {job.match_score}% match
          </span>
          {job.match_reason && (
            <p className="text-xs text-[#59554D] mt-0.5">{job.match_reason}</p>
          )}
        </div>
      )}

      <div className="divider-vintage my-3" aria-hidden="true" />

      {/* Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        {!isApplied && (
          <div className="flex items-start gap-2">
            <CalendarDays size={16} strokeWidth={1.5} className="mt-0.5 text-[#59554D] shrink-0" />
            <div>
              <div className="font-mono text-xs uppercase tracking-wider text-[#59554D]">Last date</div>
              <div className="font-mono font-bold text-base text-[#2C2A26]" data-testid={`job-last-date-${job.id}`}>
                {job.last_date ? formatDate(job.last_date) : "— TBA —"}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-start gap-2">
          <FileText size={16} strokeWidth={1.5} className="mt-0.5 text-[#59554D] shrink-0" />
          <div>
            <div className="font-mono text-xs uppercase tracking-wider text-[#59554D]">Exam date</div>
            <div className="font-mono font-bold text-base text-[#2C2A26]" data-testid={`job-exam-date-${job.id}`}>
              {job.exam_date ? formatDate(job.exam_date) : "— TBA —"}
            </div>
            {examCountdown && (
              <div className={`text-xs sm:text-sm mt-0.5 font-mono uppercase ${examCountdown.color}`}>
                {examCountdown.text}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Countdown to last date (only for unapplied) */}
      {!isApplied && (
        <div className="mb-3">
          <Countdown targetDate={job.last_date} />
        </div>
      )}

      {/* Notes */}
      {job.notes && (
        <p className="font-sans text-sm text-[#59554D] italic mb-3 line-clamp-2" data-testid={`job-notes-${job.id}`}>
          "{job.notes}"
        </p>
      )}

      {/* Credentials */}
      {(job.app_username || job.app_password) && (
        <div className="bg-[#EBE5D9]/50 border-2 border-dashed border-[#2C2A26] p-2.5 mb-3 flex flex-col gap-2">
          <div className="font-mono text-xs uppercase tracking-wider text-[#59554D] font-bold">Login</div>
          <div className="flex flex-wrap gap-2">
            {job.app_username && (
              <div className="flex items-center gap-1.5 bg-[#FCFAF5] border border-[#2C2A26] px-2 py-1">
                <span className="font-mono text-xs text-[#59554D] uppercase">ID:</span>
                <span className="font-mono text-sm font-bold">{job.app_username}</span>
                <button
                  type="button"
                  onClick={() => { navigator.clipboard.writeText(job.app_username); toast.success("Username copied!"); }}
                  className="text-[#59554D] hover:text-[#2C2A26]"
                  title="Copy Username"
                >
                  <Copy size={12} />
                </button>
              </div>
            )}
            {job.app_password && (
              <div className="flex items-center gap-1.5 bg-[#FCFAF5] border border-[#2C2A26] px-2 py-1">
                <span className="font-mono text-xs text-[#59554D] uppercase">PW:</span>
                <span className="font-mono text-sm font-bold">{job.app_password}</span>
                <button
                  type="button"
                  onClick={() => { navigator.clipboard.writeText(job.app_password); toast.success("Password copied!"); }}
                  className="text-[#59554D] hover:text-[#2C2A26]"
                  title="Copy Password"
                >
                  <Copy size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Documents vault (collapsible) */}
      <div className="mb-3">
        <button
          type="button"
          onClick={() => setDocsExpanded((p) => !p)}
          className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-[#59554D] hover:text-[#2C2A26] transition-colors"
        >
          <Paperclip size={13} />
          Documents
          {docsExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {uploadedDocs.length > 0 && (
            <span className="bg-[#3A5A40] text-[#FCFAF5] px-1.5 py-0.5 rounded-full text-[10px] ml-1">
              {uploadedDocs.length}
            </span>
          )}
        </button>

        {docsExpanded && (
          <div className="mt-2 p-3 bg-[#EBE5D9]/40 border border-dashed border-[#59554D] rounded space-y-2">
            {/* Upload buttons */}
            <div className="flex flex-wrap gap-2">
              {["admit_card", "hall_ticket", "result", "other"].map((type) => (
                <label
                  key={type}
                  className="text-xs cursor-pointer font-mono uppercase bg-[#FCFAF5] border border-[#2C2A26] px-2 py-1 hover:bg-[#EBE5D9] transition-colors"
                >
                  📎 {type.replace("_", " ")}
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) =>
                      e.target.files[0] && uploadDocument(job.id, e.target.files[0], type)
                    }
                  />
                </label>
              ))}
            </div>
            {/* List uploaded */}
            {uploadedDocs.length > 0 && (
              <ul className="space-y-1">
                {uploadedDocs.map((doc, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openDoc(doc.file_path)}
                      className="text-xs font-mono text-[#3A5A40] underline hover:no-underline truncate max-w-[200px]"
                    >
                      {doc.document_type?.replace("_", " ")} — {doc.file_name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 sm:gap-3 pt-2 border-t border-dashed border-[#59554D]">
        {isFuture ? (
          <div className="inline-flex items-center gap-2 bg-[#EBE5D9] text-[#59554D] font-serif font-bold text-sm px-4 py-2 border-2 border-[#59554D] cursor-not-allowed">
            Starts {formatDate(job.start_date)}
          </div>
        ) : (
          <a
            href={job.apply_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#2C2A26] text-[#FCFAF5] font-serif font-bold text-sm px-4 py-2 border-2 border-[#2C2A26] hover:bg-transparent hover:text-[#2C2A26] transition-colors"
            data-testid={`apply-link-${job.id}`}
          >
            Apply Now <ExternalLink size={14} strokeWidth={2} />
          </a>
        )}

        {(!isApplied || admin) && (
          <button
            onClick={() => onToggle && onToggle(job)}
            className="inline-flex items-center gap-2 bg-transparent text-[#2C2A26] font-serif font-bold text-sm px-4 py-2 border-2 border-[#2C2A26] hover:bg-[#EBE5D9] transition-colors"
            data-testid={`toggle-applied-${job.id}`}
            type="button"
          >
            {isApplied ? <CheckCircle2 size={14} /> : <Circle size={14} />}
            {isApplied ? "Mark unapplied" : "Mark applied"}
          </button>
        )}

        {admin && (
          <>
            <button
              onClick={() => onEdit && onEdit(job)}
              className="inline-flex items-center gap-2 bg-transparent text-[#2C2A26] font-serif font-bold text-sm px-4 py-2 border-2 border-[#2C2A26] hover:bg-[#EBE5D9] transition-colors"
              data-testid={`edit-job-${job.id}`}
              type="button"
            >
              <Pencil size={14} /> Edit
            </button>
            <button
              onClick={() => onDelete && onDelete(job)}
              className="inline-flex items-center gap-2 bg-transparent text-[#8C3A3A] font-serif font-bold text-sm px-4 py-2 border-2 border-[#8C3A3A] hover:bg-[#8C3A3A] hover:text-[#FCFAF5] transition-colors"
              data-testid={`delete-job-${job.id}`}
              type="button"
            >
              <Trash2 size={14} /> Delete
            </button>
          </>
        )}
      </div>
    </article>
  );
}
