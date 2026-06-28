import React, { useState, useEffect } from "react";
import {
  ExternalLink, CalendarDays, FileText, CheckCircle2, Circle,
  Pencil, Trash2, Copy, ChevronDown, ChevronUp, Paperclip,
  X, Clock, Tag, User, Lock, AlertTriangle
} from "lucide-react";
import { formatDate, daysUntil } from "../lib/utils-date";
import Countdown from "./Countdown";
import supabase from "../lib/supabase";
import { toast } from "sonner";

export default function JobCard({ job, admin = false, onToggle, onEdit, onDelete }) {
  const isApplied = !!job.applied;
  const today = new Date().toISOString().split("T")[0];
  const isFuture = job.start_date && job.start_date > today;
  const allBlank = !job.start_date && !job.exam_date && !job.last_date;
  const isNotStarted = isFuture || allBlank;

  const [docsOpen, setDocsOpen] = useState(false);
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Exam countdown
  const examDays = job.exam_date ? Math.ceil((new Date(job.exam_date) - new Date()) / 86400000) : null;
  const isExamUrgent = examDays !== null && examDays >= 0 && examDays <= 7;
  const deadlineDays = job.last_date ? daysUntil(job.last_date) : null;
  const isDeadlineUrgent = deadlineDays !== null && deadlineDays <= 3 && deadlineDays >= 0;

  // Load docs when vault opens
  useEffect(() => {
    if (!docsOpen) return;
    supabase.from("job_documents").select("*").eq("job_id", job.id)
      .then(({ data }) => setDocs(data || []));
  }, [docsOpen, job.id]);

  const uploadDoc = async (file, type) => {
    setUploading(true);
    try {
      const path = `${job.id}/${type}-${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("job-documents").upload(path, file);
      if (upErr) { toast.error("Upload failed"); return; }
      await supabase.from("job_documents").insert({ job_id: job.id, file_name: file.name, file_path: path, document_type: type });
      toast.success(`${type.replace("_", " ")} saved! 📎`);
      const { data } = await supabase.from("job_documents").select("*").eq("job_id", job.id);
      setDocs(data || []);
    } finally { setUploading(false); }
  };

  const deleteDoc = async (doc) => {
    if (!window.confirm(`Delete "${doc.file_name}"?`)) return;
    await supabase.storage.from("job-documents").remove([doc.file_path]);
    await supabase.from("job_documents").delete().eq("id", doc.id);
    setDocs(prev => prev.filter(d => d.id !== doc.id));
    toast.success("Document deleted");
  };

  const openDoc = async (filePath) => {
    const { data } = await supabase.storage.from("job-documents").createSignedUrl(filePath, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const copy = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  // Card accent color based on status
  const accentColor = isApplied ? "var(--accent-3)" : isDeadlineUrgent || isExamUrgent ? "var(--accent-2)" : isNotStarted ? "var(--accent-5)" : "var(--accent-4)";

  return (
    <article
      data-testid={`job-card-${job.id}`}
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${(isDeadlineUrgent || isExamUrgent) && !isApplied ? "rgba(255,101,132,0.4)" : "var(--border)"}`,
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        position: "relative",
        transition: "transform 0.18s ease, box-shadow 0.18s ease",
      }}
    >
      {/* Color accent bar on left */}
      <div style={{
        position: "absolute", top: 0, left: 0, bottom: 0, width: "4px",
        background: accentColor, borderRadius: "4px 0 0 4px",
      }} />

      <div style={{ padding: "20px 18px 18px 22px" }}>

        {/* Top row: title + status pill */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "12px" }}>
          <h3
            data-testid={`job-title-${job.id}`}
            style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--ink)", margin: 0, lineHeight: 1.3, flex: 1 }}
          >
            {job.job_name}
          </h3>
          <span className={`pill ${isApplied ? "pill-applied" : isNotStarted ? "pill-notices" : isDeadlineUrgent ? "pill-urgent" : "pill-pending"}`} style={{ flexShrink: 0 }}
            data-testid={`status-stamp-${job.id}`}>
            {isApplied ? "✓ Applied" : isNotStarted ? "Soon" : isDeadlineUrgent ? "🔥 Urgent" : "Pending"}
          </span>
        </div>

        {/* Tags */}
        {job.tags && (
          <div className="chips-scroll" style={{ marginBottom: "14px" }}>
            {job.tags.split(",").map((t, i) => t.trim() && (
              <span key={i} style={{
                display: "inline-flex", alignItems: "center", gap: "4px",
                background: "rgba(108,99,255,0.12)", border: "1px solid rgba(108,99,255,0.25)",
                color: "var(--accent)", padding: "4px 10px",
                borderRadius: "var(--radius-full)", fontSize: "0.75rem", fontWeight: 600,
                flexShrink: 0
              }}>
                <Tag size={10} /> {t.trim()}
              </span>
            ))}
          </div>
        )}

        {/* Auto-discovered */}
        {job.source && job.source !== "manual" && (
          <div style={{
            background: "rgba(67,233,123,0.08)", border: "1px solid rgba(67,233,123,0.2)",
            borderRadius: "var(--radius-sm)", padding: "10px 12px", marginBottom: "14px"
          }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent-3)" }}>
              🤖 Auto-discovered · {job.match_score}% match
            </div>
            {job.match_reason && (
              <div style={{ fontSize: "0.8125rem", color: "var(--ink-muted)", marginTop: "3px" }}>{job.match_reason}</div>
            )}
          </div>
        )}

        {/* Dates row */}
        <div style={{ display: "grid", gridTemplateColumns: isApplied ? "1fr" : "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
          {!isApplied && (
            <DateCell icon={<CalendarDays size={14} />} label="Last date" value={job.last_date ? formatDate(job.last_date) : "TBA"}
              sub={deadlineDays !== null && deadlineDays >= 0 ? (deadlineDays === 0 ? "TODAY!" : deadlineDays === 1 ? "Tomorrow!" : `${deadlineDays}d left`) : deadlineDays !== null && deadlineDays < 0 ? "Overdue" : null}
              subColor={deadlineDays !== null && deadlineDays <= 1 ? "var(--accent-2)" : "var(--accent-4)"}
              testId={`job-last-date-${job.id}`}
            />
          )}
          <DateCell icon={<FileText size={14} />} label="Exam date" value={job.exam_date ? formatDate(job.exam_date) : "TBA"}
            sub={examDays !== null ? (examDays < 0 ? "Passed" : examDays === 0 ? "🚨 TODAY!" : examDays === 1 ? "⚠️ Tomorrow!" : examDays <= 7 ? `⚠️ ${examDays}d` : `${examDays}d away`) : null}
            subColor={examDays !== null && examDays <= 1 ? "var(--accent-2)" : examDays !== null && examDays <= 7 ? "var(--accent-4)" : "var(--ink-muted)"}
            testId={`job-exam-date-${job.id}`}
          />
        </div>

        {/* Countdown bar (unapplied only) */}
        {!isApplied && job.last_date && (
          <div style={{ marginBottom: "14px" }}>
            <Countdown targetDate={job.last_date} />
          </div>
        )}

        {/* Notes */}
        {job.notes && (
          <div style={{
            background: "rgba(255,255,255,0.04)", borderRadius: "var(--radius-sm)",
            padding: "10px 12px", marginBottom: "14px",
            fontSize: "0.875rem", color: "var(--ink-soft)", fontStyle: "italic", lineHeight: 1.5
          }} data-testid={`job-notes-${job.id}`}>
            {job.notes}
          </div>
        )}

        {/* Credentials */}
        {(job.app_username || job.app_password) && (
          <div style={{
            background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)", padding: "12px 14px", marginBottom: "14px"
          }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Login Details</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {job.app_username && (
                <button type="button" onClick={() => copy(job.app_username, "Username")} style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  background: "rgba(108,99,255,0.1)", border: "1px solid rgba(108,99,255,0.2)",
                  borderRadius: "var(--radius-sm)", padding: "8px 12px",
                  fontSize: "0.875rem", fontWeight: 600, color: "var(--ink)",
                  cursor: "pointer", WebkitTapHighlightColor: "transparent"
                }}>
                  <User size={13} color="var(--accent)" /> {job.app_username} <Copy size={11} color="var(--ink-muted)" />
                </button>
              )}
              {job.app_password && (
                <button type="button" onClick={() => copy(job.app_password, "Password")} style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  background: "rgba(108,99,255,0.1)", border: "1px solid rgba(108,99,255,0.2)",
                  borderRadius: "var(--radius-sm)", padding: "8px 12px",
                  fontSize: "0.875rem", fontWeight: 600, color: "var(--ink)",
                  cursor: "pointer", WebkitTapHighlightColor: "transparent"
                }}>
                  <Lock size={13} color="var(--accent)" /> {job.app_password} <Copy size={11} color="var(--ink-muted)" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Document vault */}
        <div style={{ marginBottom: "16px" }}>
          <button type="button" onClick={() => setDocsOpen(p => !p)} style={{
            display: "flex", alignItems: "center", gap: "8px", width: "100%",
            background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)", padding: "12px 14px",
            fontSize: "0.875rem", fontWeight: 600, color: "var(--ink-soft)",
            cursor: "pointer", WebkitTapHighlightColor: "transparent",
            transition: "background 0.15s ease",
          }}>
            <Paperclip size={15} />
            <span>Documents</span>
            {docs.length > 0 && (
              <span style={{ background: "var(--accent)", color: "white", borderRadius: "99px", padding: "1px 8px", fontSize: "0.75rem", fontWeight: 700 }}>
                {docs.length}
              </span>
            )}
            <span style={{ marginLeft: "auto" }}>
              {docsOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </span>
          </button>

          {docsOpen && (
            <div className="anim-slide-down" style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)",
              borderTop: "none", borderRadius: "0 0 var(--radius-sm) var(--radius-sm)",
              padding: "14px"
            }}>
              {/* Upload buttons */}
              <div className="chips-scroll" style={{ gap: "8px", marginBottom: docs.length > 0 ? "12px" : "0" }}>
                {["admit_card", "hall_ticket", "result", "other"].map(type => (
                  <label key={type} style={{
                    display: "inline-flex", alignItems: "center", gap: "6px",
                    background: uploading ? "rgba(255,255,255,0.04)" : "rgba(108,99,255,0.12)",
                    border: "1px solid rgba(108,99,255,0.25)", borderRadius: "var(--radius-full)",
                    padding: "8px 14px", fontSize: "0.8125rem", fontWeight: 600, color: "var(--accent)",
                    cursor: "pointer", flexShrink: 0, WebkitTapHighlightColor: "transparent",
                    opacity: uploading ? 0.5 : 1
                  }}>
                    📎 {type.replace("_", " ")}
                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                      onChange={e => e.target.files[0] && uploadDoc(e.target.files[0], type)}
                      disabled={uploading}
                    />
                  </label>
                ))}
              </div>

              {/* Uploaded docs list */}
              {docs.map(doc => (
                <div key={doc.id} style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "10px 0", borderTop: "1px solid var(--border)"
                }}>
                  <div style={{ fontSize: "1.25rem" }}>
                    {doc.document_type === "admit_card" ? "🎫" : doc.document_type === "hall_ticket" ? "🎟️" : doc.document_type === "result" ? "📊" : "📄"}
                  </div>
                  <button type="button" onClick={() => openDoc(doc.file_path)} style={{
                    flex: 1, textAlign: "left", background: "none", border: "none",
                    fontSize: "0.875rem", fontWeight: 600, color: "var(--accent)",
                    cursor: "pointer", padding: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                  }}>
                    {doc.document_type?.replace("_", " ")} — {doc.file_name}
                  </button>
                  <button type="button" onClick={() => deleteDoc(doc)} style={{
                    background: "none", border: "none", color: "var(--accent-2)",
                    cursor: "pointer", padding: "4px", flexShrink: 0,
                    display: "flex", alignItems: "center"
                  }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {isFuture ? (
            <div style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-full)", padding: "14px 16px",
              fontSize: "0.9375rem", fontWeight: 700, color: "var(--ink-muted)"
            }}>
              ⏳ Opens {formatDate(job.start_date)}
            </div>
          ) : (
            <a
              href={job.apply_link} target="_blank" rel="noopener noreferrer"
              data-testid={`apply-link-${job.id}`}
              className="btn-primary"
              style={{ flex: 1, textDecoration: "none", minHeight: "52px" }}
            >
              Apply Now <ExternalLink size={15} />
            </a>
          )}

          {(!isApplied || admin) && (
            <button type="button"
              onClick={() => onToggle && onToggle(job)}
              data-testid={`toggle-applied-${job.id}`}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: "6px", padding: "14px 18px", minHeight: "52px",
                background: isApplied ? "rgba(67,233,123,0.1)" : "rgba(255,255,255,0.06)",
                border: `1.5px solid ${isApplied ? "rgba(67,233,123,0.3)" : "var(--border)"}`,
                borderRadius: "var(--radius-full)",
                fontSize: "0.9375rem", fontWeight: 700,
                color: isApplied ? "var(--accent-3)" : "var(--ink)",
                cursor: "pointer", WebkitTapHighlightColor: "transparent",
                transition: "all 0.2s ease", flexShrink: 0
              }}
            >
              {isApplied ? <CheckCircle2 size={16} /> : <Circle size={16} />}
              {isApplied ? "Applied" : "Mark"}
            </button>
          )}

          {admin && (
            <>
              <button type="button" onClick={() => onEdit && onEdit(job)}
                data-testid={`edit-job-${job.id}`}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: "52px", height: "52px", borderRadius: "50%",
                  background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)",
                  color: "var(--ink)", cursor: "pointer", flexShrink: 0,
                  WebkitTapHighlightColor: "transparent",
                }}>
                <Pencil size={16} />
              </button>
              <button type="button" onClick={() => onDelete && onDelete(job)}
                data-testid={`delete-job-${job.id}`}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: "52px", height: "52px", borderRadius: "50%",
                  background: "rgba(255,101,132,0.1)", border: "1px solid rgba(255,101,132,0.25)",
                  color: "var(--accent-2)", cursor: "pointer", flexShrink: 0,
                  WebkitTapHighlightColor: "transparent",
                }}>
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

// ─── Date cell helper ─────────────────────────────────────────────────────────
function DateCell({ icon, label, value, sub, subColor, testId }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "var(--radius-sm)", padding: "12px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "var(--ink-muted)", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--ink)" }} data-testid={testId}>{value}</div>
      {sub && (
        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: subColor || "var(--ink-muted)", marginTop: "3px" }}>{sub}</div>
      )}
    </div>
  );
}
