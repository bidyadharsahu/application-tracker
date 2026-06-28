import React, { useState, useEffect } from "react";
import { ExternalLink, CalendarDays, FileText, CheckCircle2, Circle, Pencil, Trash2, Copy, ChevronDown, ChevronUp, Paperclip, User, Lock, Tag } from "lucide-react";
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

  const examDays = job.exam_date ? Math.ceil((new Date(job.exam_date) - new Date()) / 86400000) : null;
  const deadlineDays = job.last_date ? daysUntil(job.last_date) : null;
  const isUrgent = !isApplied && ((deadlineDays !== null && deadlineDays <= 3 && deadlineDays >= 0) || (examDays !== null && examDays >= 0 && examDays <= 5));

  useEffect(() => {
    if (!docsOpen) return;
    supabase.from("job_documents").select("*").eq("job_id", job.id).then(({ data }) => setDocs(data || []));
  }, [docsOpen, job.id]);

  const uploadDoc = async (file, type) => {
    setUploading(true);
    try {
      const path = `${job.id}/${type}-${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("job-documents").upload(path, file);
      if (error) { toast.error("Upload failed"); return; }
      await supabase.from("job_documents").insert({ job_id: job.id, file_name: file.name, file_path: path, document_type: type });
      toast.success(`${type.replace("_", " ")} saved`);
      const { data } = await supabase.from("job_documents").select("*").eq("job_id", job.id);
      setDocs(data || []);
    } finally { setUploading(false); }
  };

  const deleteDoc = async (doc) => {
    if (!window.confirm(`Remove "${doc.file_name}" from the vault?`)) return;
    await supabase.storage.from("job-documents").remove([doc.file_path]);
    await supabase.from("job_documents").delete().eq("id", doc.id);
    setDocs(prev => prev.filter(d => d.id !== doc.id));
    toast.success("Document removed");
  };

  const openDoc = async (p) => {
    const { data } = await supabase.storage.from("job-documents").createSignedUrl(p, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const copy = (text, label) => { navigator.clipboard.writeText(text); toast.success(`${label} copied`); };

  /* Badge */
  const badgeClass = isApplied ? "badge badge-applied"
    : isUrgent ? "badge badge-urgent"
    : isNotStarted ? "badge badge-notice"
    : "badge badge-pending";
  const badgeText = isApplied ? "✓ Applied" : isUrgent ? "⚑ Urgent" : isNotStarted ? "Upcoming" : "Pending";

  return (
    <article
      data-testid={`job-card-${job.id}`}
      className="card-parchment"
      style={{
        position: "relative",
        transition: "transform 0.20s cubic-bezier(0.34,1.3,0.64,1), box-shadow 0.20s ease",
        border: isUrgent ? "1px solid rgba(139,46,46,0.32)" : undefined,
      }}
    >
      {/* Urgency wash overlay */}
      {isUrgent && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: "4px", pointerEvents: "none",
          background: "linear-gradient(135deg, rgba(139,46,46,0.05) 0%, transparent 60%)",
        }}/>
      )}

      {/* Applied green wash overlay */}
      {isApplied && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: "4px", pointerEvents: "none",
          background: "linear-gradient(135deg, rgba(45,90,61,0.05) 0%, transparent 60%)",
        }}/>
      )}

      <div style={{ padding: "22px 20px 18px", position: "relative" }}>

        {/* ── Title row ──────────────────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "14px" }}>
          <h3
            data-testid={`job-title-${job.id}`}
            style={{
              fontFamily: "var(--font-accent)", fontSize: "1.1875rem", fontWeight: 600,
              color: "var(--ink-dark)", margin: 0, lineHeight: 1.3, flex: 1,
            }}
          >
            {job.job_name}
          </h3>
          <span className={badgeClass} data-testid={`status-stamp-${job.id}`} style={{ flexShrink: 0 }}>
            {badgeText}
          </span>
        </div>

        {/* Tags */}
        {job.tags && (
          <div className="chips-scroll" style={{ marginBottom: "14px" }}>
            {job.tags.split(",").map((t, i) => t.trim() && (
              <span key={i} className="tag-chip">
                <Tag size={9} strokeWidth={1.5}/> {t.trim()}
              </span>
            ))}
          </div>
        )}

        {/* Auto-discovered */}
        {job.source && job.source !== "manual" && (
          <div style={{
            background: "rgba(45,90,61,0.07)", border: "1px solid rgba(45,90,61,0.18)",
            borderRadius: "3px", padding: "10px 14px", marginBottom: "14px",
          }}>
            <div style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem", fontWeight: 600, color: "var(--pigment-green)" }}>
              ✦ Auto-discovered · {job.match_score}% match
            </div>
            {job.match_reason && (
              <div style={{ fontFamily: "var(--font-body)", fontSize: "0.8125rem", fontStyle: "italic", color: "var(--ink-soft)", marginTop: "3px" }}>
                {job.match_reason}
              </div>
            )}
          </div>
        )}

        {/* ── Dates ─────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: isApplied ? "1fr" : "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
          {!isApplied && (
            <DateCell
              icon={<CalendarDays size={13} strokeWidth={1.5}/>} label="Last date"
              value={job.last_date ? formatDate(job.last_date) : "—"}
              sub={deadlineDays !== null && deadlineDays >= 0
                ? (deadlineDays === 0 ? "Today!" : deadlineDays === 1 ? "Tomorrow" : `${deadlineDays} days`)
                : deadlineDays !== null && deadlineDays < 0 ? "Overdue" : null}
              subColor={deadlineDays !== null && deadlineDays <= 1 ? "var(--pigment-red)" : "var(--pigment-amber)"}
              testId={`job-last-date-${job.id}`}
            />
          )}
          <DateCell
            icon={<FileText size={13} strokeWidth={1.5}/>} label="Exam date"
            value={job.exam_date ? formatDate(job.exam_date) : "—"}
            sub={examDays !== null
              ? examDays < 0 ? "Passed"
              : examDays === 0 ? "TODAY!"
              : examDays === 1 ? "Tomorrow!"
              : examDays <= 7 ? `${examDays} days`
              : `${examDays} days away`
              : null}
            subColor={examDays !== null && examDays <= 1 ? "var(--pigment-red)" : examDays !== null && examDays <= 7 ? "var(--pigment-amber)" : "var(--ink-soft)"}
            testId={`job-exam-date-${job.id}`}
          />
        </div>

        {/* Countdown */}
        {!isApplied && job.last_date && (
          <div style={{ marginBottom: "14px" }}>
            <Countdown targetDate={job.last_date}/>
          </div>
        )}

        {/* Notes */}
        {job.notes && (
          <div data-testid={`job-notes-${job.id}`} style={{
            background: "rgba(42,31,14,0.04)", borderRadius: "3px",
            padding: "10px 14px", marginBottom: "14px",
            fontFamily: "var(--font-body)", fontSize: "0.9375rem", fontStyle: "italic",
            color: "var(--ink-soft)", lineHeight: 1.6,
            borderLeft: "2px solid rgba(107,79,53,0.20)",
          }}>
            {job.notes}
          </div>
        )}

        {/* Credentials */}
        {(job.app_username || job.app_password) && (
          <div style={{
            background: "rgba(43,74,107,0.05)", border: "1px solid rgba(43,74,107,0.14)",
            borderRadius: "3px", padding: "12px 14px", marginBottom: "14px",
          }}>
            <div style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--pigment-blue)", marginBottom: "8px", opacity: 0.7 }}>
              Login Details
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {job.app_username && (
                <button type="button" onClick={() => copy(job.app_username, "Username")} style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  background: "rgba(43,74,107,0.07)", border: "1px solid rgba(43,74,107,0.16)",
                  borderRadius: "3px", padding: "8px 12px",
                  fontFamily: "var(--font-body)", fontSize: "0.9375rem", color: "var(--ink-dark)",
                  cursor: "pointer",
                }}>
                  <User size={12} strokeWidth={1.5} color="var(--pigment-blue)"/> {job.app_username}
                  <Copy size={10} strokeWidth={1.5} color="var(--ink-soft)"/>
                </button>
              )}
              {job.app_password && (
                <button type="button" onClick={() => copy(job.app_password, "Password")} style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  background: "rgba(43,74,107,0.07)", border: "1px solid rgba(43,74,107,0.16)",
                  borderRadius: "3px", padding: "8px 12px",
                  fontFamily: "var(--font-body)", fontSize: "0.9375rem", color: "var(--ink-dark)",
                  cursor: "pointer",
                }}>
                  <Lock size={12} strokeWidth={1.5} color="var(--pigment-blue)"/> {job.app_password}
                  <Copy size={10} strokeWidth={1.5} color="var(--ink-soft)"/>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Document vault */}
        <div style={{ marginBottom: "16px" }}>
          <button type="button" onClick={() => setDocsOpen(p => !p)} style={{
            display: "flex", alignItems: "center", gap: "8px", width: "100%",
            background: "rgba(42,31,14,0.04)", border: "1px solid rgba(107,79,53,0.16)",
            borderRadius: "3px", padding: "11px 14px",
            fontFamily: "var(--font-body)", fontSize: "0.9375rem", color: "var(--ink-soft)",
            cursor: "pointer", textAlign: "left",
          }}>
            <Paperclip size={14} strokeWidth={1.5}/>
            <span>Document Vault</span>
            {docs.length > 0 && (
              <span style={{
                background: "var(--pigment-blue)", color: "white",
                borderRadius: "99px", padding: "0px 7px", fontSize: "0.75rem", fontWeight: 600, marginLeft: "2px"
              }}>{docs.length}</span>
            )}
            <span style={{ marginLeft: "auto" }}>
              {docsOpen ? <ChevronUp size={14} strokeWidth={1.5}/> : <ChevronDown size={14} strokeWidth={1.5}/>}
            </span>
          </button>

          {docsOpen && (
            <div className="anim-expand-down" style={{
              background: "rgba(42,31,14,0.02)", border: "1px solid rgba(107,79,53,0.14)",
              borderTop: "none", borderRadius: "0 0 3px 3px", padding: "14px",
            }}>
              {/* Upload types */}
              <div className="chips-scroll" style={{ marginBottom: docs.length > 0 ? "14px" : "0" }}>
                {["admit_card","hall_ticket","result","other"].map(type => (
                  <label key={type} style={{
                    display: "inline-flex", alignItems: "center", gap: "5px",
                    background: "linear-gradient(145deg, rgba(253,248,238,0.95), rgba(237,224,190,0.90))",
                    border: "1px solid rgba(107,79,53,0.22)", borderRadius: "3px",
                    padding: "7px 13px",
                    fontFamily: "var(--font-body)", fontSize: "0.875rem", color: "var(--ink-mid)",
                    cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap",
                    opacity: uploading ? 0.5 : 1,
                    boxShadow: "1px 1px 0 rgba(42,31,14,0.10)",
                  }}>
                    ✦ {type.replace("_", " ")}
                    <input type="file" style={{ display: "none" }} accept=".pdf,.jpg,.jpeg,.png"
                      onChange={e => e.target.files[0] && uploadDoc(e.target.files[0], type)}
                      disabled={uploading}/>
                  </label>
                ))}
              </div>

              {/* List docs */}
              {docs.map(doc => (
                <div key={doc.id} style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "10px 0",
                  borderTop: "1px solid rgba(107,79,53,0.12)",
                }}>
                  <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>
                    {doc.document_type === "admit_card" ? "🎫" : doc.document_type === "hall_ticket" ? "🎟" : doc.document_type === "result" ? "📜" : "📄"}
                  </span>
                  <button type="button" onClick={() => openDoc(doc.file_path)} style={{
                    flex: 1, textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer",
                    fontFamily: "var(--font-body)", fontSize: "0.9375rem", color: "var(--pigment-blue)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {doc.document_type?.replace("_", " ")} — {doc.file_name}
                  </button>
                  <button type="button" onClick={() => deleteDoc(doc)} style={{
                    background: "none", border: "none", color: "var(--pigment-red)",
                    cursor: "pointer", padding: "4px", flexShrink: 0, display: "flex",
                  }}>
                    <Trash2 size={14} strokeWidth={1.5}/>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ink divider */}
        <div className="divider-ink" style={{ marginBottom: "14px" }}/>

        {/* ── Actions ────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {isFuture ? (
            <div style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font-body)", fontSize: "0.9375rem", fontStyle: "italic",
              color: "var(--ink-soft)", padding: "13px",
              background: "rgba(42,31,14,0.04)", border: "1px solid rgba(107,79,53,0.14)", borderRadius: "3px"
            }}>
              Opens {formatDate(job.start_date)}
            </div>
          ) : (
            <a href={job.apply_link} target="_blank" rel="noopener noreferrer"
              data-testid={`apply-link-${job.id}`}
              className="btn-ink" style={{ flex: 1, textDecoration: "none", justifyContent: "center" }}>
              Apply Now <ExternalLink size={14} strokeWidth={1.5}/>
            </a>
          )}

          {(!isApplied || admin) && (
            <button type="button" onClick={() => onToggle && onToggle(job)}
              data-testid={`toggle-applied-${job.id}`}
              className="btn-parchment"
              style={{ minWidth: 0, flexShrink: 0, color: isApplied ? "var(--pigment-green)" : undefined }}>
              {isApplied ? <CheckCircle2 size={15} strokeWidth={1.5}/> : <Circle size={15} strokeWidth={1.5}/>}
              {isApplied ? "Applied" : "Mark"}
            </button>
          )}

          {admin && (
            <>
              <button type="button" onClick={() => onEdit && onEdit(job)} data-testid={`edit-job-${job.id}`}
                className="btn-parchment" style={{ minWidth: "48px", flexShrink: 0 }}>
                <Pencil size={15} strokeWidth={1.5}/>
              </button>
              <button type="button" onClick={() => onDelete && onDelete(job)} data-testid={`delete-job-${job.id}`}
                className="btn-wash-red" style={{ minWidth: "48px", flexShrink: 0 }}>
                <Trash2 size={15} strokeWidth={1.5}/>
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function DateCell({ icon, label, value, sub, subColor, testId }) {
  return (
    <div style={{ background: "rgba(42,31,14,0.04)", borderRadius: "3px", padding: "11px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>
        {icon} {label}
      </div>
      <div style={{ fontFamily: "var(--font-accent)", fontSize: "1rem", fontWeight: 600, color: "var(--ink-dark)" }} data-testid={testId}>
        {value}
      </div>
      {sub && (
        <div style={{ fontFamily: "var(--font-body)", fontSize: "0.8125rem", fontStyle: "italic", color: subColor, marginTop: "2px" }}>
          {sub}
        </div>
      )}
    </div>
  );
}
