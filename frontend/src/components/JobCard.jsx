
import React, { useState, useEffect } from "react";
import { ExternalLink, CalendarDays, FileText, CheckCircle2, Circle, Pencil, Trash2, Copy, ChevronDown, ChevronUp, Paperclip, User, Lock, Tag } from "lucide-react";
import { formatDate, daysUntil } from "../lib/utils-date";
import Countdown from "./Countdown";
import supabase from "../lib/supabase";
import { toast } from "sonner";

export default function JobCard({ job, admin = false, onToggle, onEdit, onDelete }) {
  const isApplied    = !!job.applied;
  const today        = new Date().toISOString().split("T")[0];
  const isFuture     = job.start_date && job.start_date > today;
  const allBlank     = !job.start_date && !job.exam_date && !job.last_date;
  const isNotStarted = isFuture || allBlank;

  const [docsOpen, setDocsOpen]   = useState(false);
  const [docs, setDocs]           = useState([]);
  const [uploading, setUploading] = useState(false);

  const examDays     = job.exam_date ? Math.ceil((new Date(job.exam_date) - new Date()) / 86400000) : null;
  const deadlineDays = job.last_date ? daysUntil(job.last_date) : null;
  const isUrgent     = !isApplied && (
    (deadlineDays !== null && deadlineDays <= 3 && deadlineDays >= 0) ||
    (examDays !== null && examDays >= 0 && examDays <= 5)
  );

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
    if (!window.confirm(`Delete "${doc.file_name}"?`)) return;
    await supabase.storage.from("job-documents").remove([doc.file_path]);
    await supabase.from("job_documents").delete().eq("id", doc.id);
    setDocs(prev => prev.filter(d => d.id !== doc.id));
    toast.success("Document deleted");
  };

  const openDoc = async (p) => {
    const { data } = await supabase.storage.from("job-documents").createSignedUrl(p, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const copy = (text, label) => { navigator.clipboard.writeText(text); toast.success(`${label} copied`); };

  const dotColor = isApplied ? "var(--ios-green)" : isUrgent ? "var(--ios-red)" : isNotStarted ? "var(--ios-purple)" : "var(--ios-orange)";

  return (
    <article data-testid={`job-card-${job.id}`} className="ios-card" style={{ overflow: "hidden" }}>
      <div style={{ padding: "16px 16px 14px" }}>

        {/* Title row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, marginTop: 7, flexShrink: 0 }} />
          <h3 data-testid={`job-title-${job.id}`} style={{ fontSize: 16, fontWeight: 700, color: "var(--label-1)", flex: 1, lineHeight: 1.35, letterSpacing: "-.01em" }}>
            {job.job_name}
          </h3>
          <span data-testid={`status-stamp-${job.id}`}
            className={`status-pill ${isApplied ? "pill-applied" : isUrgent ? "pill-urgent" : isNotStarted ? "pill-notice" : "pill-pending"}`}
            style={{ flexShrink: 0 }}>
            {isApplied ? "Applied" : isUrgent ? "Urgent" : isNotStarted ? "Soon" : "Pending"}
          </span>
        </div>

        {job.tags && (
          <div className="scroll-x" style={{ marginBottom: 10, paddingLeft: 18 }}>
            {job.tags.split(",").map((t, i) => t.trim() && (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "var(--tint-blue-bg)", color: "var(--ios-blue)", padding: "3px 9px", borderRadius: 99, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>
                <Tag size={9} />{t.trim()}
              </span>
            ))}
          </div>
        )}

        {job.source && job.source !== "manual" && (
          <div style={{ background: "var(--tint-green-bg)", borderRadius: 10, padding: "8px 12px", marginBottom: 10, marginLeft: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1A8A3D" }}>Auto-found · {job.match_score}% match</div>
            {job.match_reason && <div style={{ fontSize: 12, color: "var(--label-3)", marginTop: 2 }}>{job.match_reason}</div>}
          </div>
        )}

        <div style={{ paddingLeft: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: isApplied ? "1fr" : "1fr 1fr", gap: 8, marginBottom: 10 }}>
            {!isApplied && (
              <DateCell icon={<CalendarDays size={13} />} label="Last Date"
                value={job.last_date ? formatDate(job.last_date) : "TBA"}
                sub={deadlineDays !== null && deadlineDays >= 0 ? (deadlineDays === 0 ? "Today" : deadlineDays === 1 ? "Tomorrow" : `${deadlineDays}d left`) : deadlineDays !== null && deadlineDays < 0 ? "Overdue" : null}
                subColor={deadlineDays !== null && deadlineDays <= 1 ? "var(--ios-red)" : "#B25900"}
                testId={`job-last-date-${job.id}`} />
            )}
            <DateCell icon={<FileText size={13} />} label="Exam Date"
              value={job.exam_date ? formatDate(job.exam_date) : "TBA"}
              sub={examDays !== null ? (examDays < 0 ? "Passed" : examDays === 0 ? "Today" : examDays === 1 ? "Tomorrow" : `${examDays}d away`) : null}
              subColor={examDays !== null && examDays <= 1 ? "var(--ios-red)" : examDays !== null && examDays <= 7 ? "#B25900" : "var(--label-3)"}
              testId={`job-exam-date-${job.id}`} />
          </div>

          {!isApplied && job.last_date && <div style={{ marginBottom: 10 }}><Countdown targetDate={job.last_date} /></div>}

          {job.notes && (
            <div data-testid={`job-notes-${job.id}`} style={{ background: "var(--bg-tertiary)", borderRadius: 10, padding: "10px 12px", marginBottom: 10, fontSize: 14, color: "var(--label-2)", lineHeight: 1.5 }}>
              {job.notes}
            </div>
          )}

          {(job.app_username || job.app_password) && (
            <div style={{ background: "var(--tint-blue-bg)", borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ios-blue)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 7 }}>Login</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {job.app_username && (
                  <button type="button" onClick={() => copy(job.app_username, "Username")}
                    style={{ display: "flex", alignItems: "center", gap: 5, background: "#fff", border: "none", borderRadius: 8, padding: "7px 11px", fontSize: 14, fontWeight: 600, color: "var(--label-1)", cursor: "pointer" }}>
                    <User size={13} color="var(--ios-blue)" />{job.app_username}<Copy size={11} color="var(--label-4)" />
                  </button>
                )}
                {job.app_password && (
                  <button type="button" onClick={() => copy(job.app_password, "Password")}
                    style={{ display: "flex", alignItems: "center", gap: 5, background: "#fff", border: "none", borderRadius: 8, padding: "7px 11px", fontSize: 14, fontWeight: 600, color: "var(--label-1)", cursor: "pointer" }}>
                    <Lock size={13} color="var(--ios-blue)" />{job.app_password}<Copy size={11} color="var(--label-4)" />
                  </button>
                )}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <button type="button" onClick={() => setDocsOpen(p => !p)}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "var(--bg-tertiary)", border: "none", borderRadius: 10, padding: "10px 14px", fontSize: 14, fontWeight: 600, color: "var(--label-2)", cursor: "pointer" }}>
              <Paperclip size={15} color="var(--label-3)" />
              <span>Documents</span>
              {docs.length > 0 && <span style={{ background: "var(--ios-blue)", color: "#fff", borderRadius: 99, padding: "0 7px", fontSize: 11, fontWeight: 700, marginLeft: 2 }}>{docs.length}</span>}
              <span style={{ marginLeft: "auto" }}>{docsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
            </button>
            {docsOpen && (
              <div className="a-in" style={{ background: "var(--bg-tertiary)", borderRadius: "0 0 10px 10px", padding: 12 }}>
                <div className="scroll-x" style={{ marginBottom: docs.length > 0 ? 10 : 0 }}>
                  {["admit_card", "hall_ticket", "result", "other"].map(type => (
                    <label key={type} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#fff", borderRadius: 99, padding: "7px 13px", fontSize: 13, fontWeight: 600, color: "var(--label-2)", cursor: "pointer", flexShrink: 0, opacity: uploading ? .5 : 1 }}>
                      {type.replace("_", " ")}
                      <input type="file" style={{ display: "none" }} accept=".pdf,.jpg,.jpeg,.png" disabled={uploading} onChange={e => e.target.files[0] && uploadDoc(e.target.files[0], type)} />
                    </label>
                  ))}
                </div>
                {docs.map(doc => (
                  <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: "0.5px solid var(--separator)" }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{doc.document_type === "admit_card" ? "🎫" : doc.document_type === "hall_ticket" ? "🎟" : doc.document_type === "result" ? "📊" : "📄"}</span>
                    <button type="button" onClick={() => openDoc(doc.file_path)} style={{ flex: 1, textAlign: "left", background: "none", border: "none", fontSize: 14, fontWeight: 600, color: "var(--ios-blue)", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: 0 }}>
                      {doc.document_type?.replace("_", " ")} — {doc.file_name}
                    </button>
                    <button type="button" onClick={() => deleteDoc(doc)} style={{ background: "none", border: "none", color: "var(--ios-red)", cursor: "pointer", padding: 4, display: "flex", flexShrink: 0 }}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ height: 0.5, background: "var(--separator)", marginBottom: 12 }} />

          <div style={{ display: "flex", gap: 8 }}>
            {isFuture ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-tertiary)", borderRadius: 99, padding: "11px", fontSize: 14, fontWeight: 600, color: "var(--label-3)" }}>
                Opens {formatDate(job.start_date)}
              </div>
            ) : (
              <a href={job.apply_link} target="_blank" rel="noopener noreferrer" data-testid={`apply-link-${job.id}`} className="btn btn-filled" style={{ flex: 1, textDecoration: "none" }}>
                Apply Now <ExternalLink size={15} strokeWidth={2.5} />
              </a>
            )}
            {(!isApplied || admin) && (
              <button type="button" onClick={() => onToggle && onToggle(job)} data-testid={`toggle-applied-${job.id}`}
                className={isApplied ? "btn btn-success-tinted" : "btn btn-gray"} style={{ flexShrink: 0 }}>
                {isApplied ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                {isApplied ? "Applied" : "Mark"}
              </button>
            )}
            {admin && <>
              <button type="button" onClick={() => onEdit && onEdit(job)} data-testid={`edit-job-${job.id}`} className="btn btn-gray btn-icon"><Pencil size={16} /></button>
              <button type="button" onClick={() => onDelete && onDelete(job)} data-testid={`delete-job-${job.id}`} className="btn btn-danger-tinted btn-icon"><Trash2 size={16} /></button>
            </>}
          </div>
        </div>
      </div>
    </article>
  );
}

function DateCell({ icon, label, value, sub, subColor, testId }) {
  return (
    <div style={{ background: "var(--bg-tertiary)", borderRadius: 10, padding: "10px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "var(--label-4)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>{icon}{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--label-1)" }} data-testid={testId}>{value}</div>
      {sub && <div style={{ fontSize: 12, fontWeight: 700, color: subColor, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
