import React, { useState, useEffect, useCallback } from "react";
import {
  ExternalLink, CalendarDays, FileText, CheckCircle2, Circle,
  Pencil, Trash2, Copy, ChevronDown, ChevronUp, Paperclip,
  User, Lock, Tag, RotateCcw,
} from "lucide-react";
import { formatDate, daysUntil, isMonthOnly, getMonthName } from "../lib/utils-date";
import Countdown from "./Countdown";
import { supabase } from "../lib/supabase";
import { useI18n } from "../lib/i18n";
import { toast } from "sonner";

export default function JobCard({ job, admin = false, onToggle, onEdit, onDelete }) {
  const { t, lang } = useI18n();
  const isApplied = !!job.applied;
  const today     = new Date().toISOString().split("T")[0];
  const isFuture  = job.start_date && job.start_date > today;
  const allBlank  = !job.start_date && !job.exam_date && !job.last_date;
  const isSoon    = isFuture || allBlank;

  const [docsOpen,  setDocsOpen]  = useState(false);
  const [docs,      setDocs]      = useState([]);
  const [uploading, setUploading] = useState(false);

  const examDays     = job.exam_date && !isMonthOnly(job.exam_date)
    ? Math.ceil((new Date(job.exam_date) - new Date()) / 86400000) : null;
  const deadlineDays = job.last_date ? daysUntil(job.last_date) : null;
  const isUrgent     = !isApplied && (
    (deadlineDays !== null && deadlineDays <= 3 && deadlineDays >= 0) ||
    (examDays !== null && examDays >= 0 && examDays <= 5)
  );

  const loadDocs = useCallback(async () => {
    const { data } = await supabase
      .from("job_documents").select("*").eq("job_id", job.id);
    setDocs(data || []);
  }, [job.id]);

  useEffect(() => { if (docsOpen) loadDocs(); }, [docsOpen, loadDocs]);

  const uploadDoc = async (file, type) => {
    setUploading(true);
    try {
      const path = `${job.id}/${type}-${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("job-documents").upload(path, file);
      if (error) { toast.error(t("upload_failed")); return; }
      await supabase.from("job_documents").insert({
        job_id: job.id, file_name: file.name, file_path: path, document_type: type,
      });
      toast.success(t("document_saved", { type: t("doc_" + type) }));
      loadDocs();
    } finally { setUploading(false); }
  };

  const deleteDoc = async (doc) => {
    if (!window.confirm(t("doc_delete_confirm", { name: doc.file_name }))) return;
    await supabase.storage.from("job-documents").remove([doc.file_path]);
    await supabase.from("job_documents").delete().eq("id", doc.id);
    setDocs(prev => prev.filter(d => d.id !== doc.id));
    toast.success(t("document_deleted"));
  };

  const openDoc = async (p) => {
    const { data } = await supabase.storage.from("job-documents").createSignedUrl(p, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const copy = (text, labelKey) => {
    navigator.clipboard.writeText(text);
    toast.success(t("copied", { label: t(labelKey) }));
  };

  const handleToggle = useCallback(() => {
    if (!onToggle) return;
    const was = isApplied;
    onToggle(job);
    if (!was) {
      toast.success(t("marked_applied_toast"), {
        action: { label: t("undo_btn"), onClick: () => onToggle(job) },
      });
    } else {
      toast(t("moved_to_pending_toast"), {
        icon: <RotateCcw size={15} />,
        action: { label: t("undo_btn"), onClick: () => onToggle(job) },
      });
    }
  }, [onToggle, job, isApplied, t]);

  const dotColor = isApplied ? "var(--green)" : isUrgent ? "var(--red)"
                 : isSoon    ? "var(--purple)" : "var(--orange)";

  const examVal = job.exam_date
    ? isMonthOnly(job.exam_date) ? getMonthName(job.exam_date) : formatDate(job.exam_date)
    : t("tba");

  const examSub = isMonthOnly(job.exam_date)
    ? (lang === "or" ? "ମାସ ଅନୁମାନ — ତାରିଖ ବାକି" : "Month approx — exact TBA")
    : examDays !== null
      ? examDays < 0 ? t("passed")
      : examDays === 0 ? t("today")
      : examDays === 1 ? t("tomorrow")
      : t("days_away", { n: examDays })
      : null;

  const examSubColor = isMonthOnly(job.exam_date) ? "var(--purple)"
    : examDays !== null && examDays <= 1 ? "var(--red)"
    : examDays !== null && examDays <= 7 ? "#B25900"
    : "var(--l3)";

  const DOC_TYPES = [
    { key: "admit_card",  i18n: "doc_admit_card" },
    { key: "hall_ticket", i18n: "doc_hall_ticket" },
    { key: "result",      i18n: "doc_result" },
    { key: "other",       i18n: "doc_other" },
  ];

  return (
    /* CRITICAL: NO overflow:hidden on the card — it clips the button row at the bottom.
       Border-radius still works without overflow:hidden on modern browsers. */
    <article className="ios-card" style={{ overflow: "visible" }}>
      <div style={{ padding: "15px 15px 14px", borderRadius: "inherit" }}>

        {/* ── Title row ── */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 9, marginBottom: 9 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%", background: dotColor,
            marginTop: 6, flexShrink: 0,
            boxShadow: `0 0 0 3px ${dotColor}28`,
          }} />
          <h3 style={{
            fontSize: 15, fontWeight: 700, color: "var(--l1)",
            flex: 1, lineHeight: 1.35, letterSpacing: "-.01em",
          }}>
            {job.job_name}
          </h3>
          <span className={`status-pill ${
            isApplied ? "pill-applied" : isUrgent ? "pill-urgent"
            : isSoon  ? "pill-notice"  : "pill-pending"
          }`} style={{ flexShrink: 0 }}>
            {isApplied ? `✓ ${t("status_applied")}`
             : isUrgent ? t("status_urgent")
             : isSoon   ? t("status_soon")
             : t("status_pending")}
          </span>
        </div>

        {/* ── Tags ── */}
        {job.tags && (
          <div className="scroll-x" style={{ marginBottom: 9, paddingLeft: 17 }}>
            {job.tags.split(",").map((tg, i) => tg.trim() && (
              <span key={i} style={{
                display: "inline-flex", alignItems: "center", gap: 3,
                background: "rgba(0,122,255,.09)", color: "var(--blue)",
                border: ".5px solid rgba(0,122,255,.16)",
                padding: "3px 9px", borderRadius: 99,
                fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0,
              }}>
                <Tag size={9} />{tg.trim()}
              </span>
            ))}
          </div>
        )}

        <div style={{ paddingLeft: 17 }}>

          {/* ── Date cells ── */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isApplied ? "1fr" : "1fr 1fr",
            gap: 7, marginBottom: 9,
          }}>
            {!isApplied && (
              <DateCell
                icon={<CalendarDays size={12} color="var(--l4)" />}
                label={t("last_date")}
                value={job.last_date ? formatDate(job.last_date) : t("tba")}
                sub={
                  deadlineDays !== null && deadlineDays >= 0
                    ? deadlineDays === 0 ? t("today")
                    : deadlineDays === 1 ? t("tomorrow")
                    : t("days_left", { n: deadlineDays })
                    : deadlineDays !== null && deadlineDays < 0 ? t("overdue") : null
                }
                subColor={deadlineDays !== null && deadlineDays <= 1 ? "var(--red)" : "#B25900"}
              />
            )}
            <DateCell
              icon={<FileText size={12} color="var(--l4)" />}
              label={t("exam_date")}
              value={examVal}
              sub={examSub}
              subColor={examSubColor}
            />
          </div>

          {/* ── Countdown ── */}
          {!isApplied && job.last_date && (
            <div style={{ marginBottom: 9 }}>
              <Countdown targetDate={job.last_date} />
            </div>
          )}

          {/* ── Notes ── */}
          {job.notes && (
            <div style={{
              background: "rgba(120,120,128,.07)",
              border: ".5px solid rgba(255,255,255,.50)",
              borderRadius: 10, padding: "10px 12px", marginBottom: 9,
              fontSize: 14, color: "var(--l2)", lineHeight: 1.55,
            }}>
              {job.notes}
            </div>
          )}

          {/* ── Login credentials ── */}
          {(job.app_username || job.app_password) && (
            <div style={{
              background: "rgba(0,122,255,.07)",
              border: ".5px solid rgba(0,122,255,.14)",
              borderRadius: 10, padding: "10px 12px", marginBottom: 9,
            }}>
              <div style={{
                fontSize: 10, fontWeight: 700, color: "var(--blue)",
                textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 7,
              }}>
                {t("login_label")}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {job.app_username && (
                  <button type="button" onClick={() => copy(job.app_username, "username_label")}
                    className="tg-press"
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      background: "rgba(255,255,255,.72)",
                      border: ".5px solid rgba(255,255,255,.82)",
                      borderRadius: 8, padding: "7px 11px",
                      fontSize: 13, fontWeight: 600, color: "var(--l1)", cursor: "pointer",
                    }}>
                    <User size={12} color="var(--blue)" />
                    {job.app_username}
                    <Copy size={10} color="var(--l4)" />
                  </button>
                )}
                {job.app_password && (
                  <button type="button" onClick={() => copy(job.app_password, "password_label")}
                    className="tg-press"
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      background: "rgba(255,255,255,.72)",
                      border: ".5px solid rgba(255,255,255,.82)",
                      borderRadius: 8, padding: "7px 11px",
                      fontSize: 13, fontWeight: 600, color: "var(--l1)", cursor: "pointer",
                    }}>
                    <Lock size={12} color="var(--blue)" />
                    {job.app_password}
                    <Copy size={10} color="var(--l4)" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Documents accordion ── */}
          <div style={{ marginBottom: 11 }}>
            <button type="button" onClick={() => setDocsOpen(p => !p)}
              className="tg-press"
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%",
                background: "rgba(120,120,128,.07)",
                border: ".5px solid rgba(255,255,255,.45)",
                borderRadius: docsOpen ? "10px 10px 0 0" : 10,
                padding: "10px 13px", fontSize: 14, fontWeight: 600,
                color: "var(--l2)", cursor: "pointer", transition: "border-radius .15s",
              }}>
              <Paperclip size={14} color="var(--l3)" />
              <span>{t("documents")}</span>
              {docs.length > 0 && (
                <span style={{
                  background: "var(--blue)", color: "#fff",
                  borderRadius: 99, padding: "0 7px",
                  fontSize: 10, fontWeight: 700, marginLeft: 2,
                }}>
                  {docs.length}
                </span>
              )}
              <span style={{ marginLeft: "auto" }}>
                {docsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </span>
            </button>

            {docsOpen && (
              <div className="a-in" style={{
                background: "rgba(120,120,128,.05)",
                border: ".5px solid rgba(255,255,255,.40)",
                borderTop: "none", borderRadius: "0 0 10px 10px", padding: 11,
              }}>
                <div className="scroll-x" style={{ marginBottom: docs.length > 0 ? 9 : 0 }}>
                  {DOC_TYPES.map(({ key, i18n }) => (
                    <label key={key} className="tg-press" style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      background: "rgba(255,255,255,.68)",
                      border: ".5px solid rgba(255,255,255,.72)",
                      borderRadius: 99, padding: "6px 12px",
                      fontSize: 12, fontWeight: 600, color: "var(--l2)",
                      cursor: "pointer", flexShrink: 0,
                      opacity: uploading ? .5 : 1,
                    }}>
                      {t(i18n)}
                      <input type="file" style={{ display: "none" }}
                        accept=".pdf,.jpg,.jpeg,.png" disabled={uploading}
                        onChange={e => e.target.files[0] && uploadDoc(e.target.files[0], key)} />
                    </label>
                  ))}
                </div>
                {docs.map(doc => (
                  <div key={doc.id} style={{
                    display: "flex", alignItems: "center", gap: 9,
                    padding: "8px 0", borderTop: ".5px solid var(--sep)",
                  }}>
                    <span style={{ fontSize: 17, flexShrink: 0 }}>
                      {doc.document_type === "admit_card" ? "🎫"
                       : doc.document_type === "hall_ticket" ? "🎟"
                       : doc.document_type === "result" ? "📊" : "📄"}
                    </span>
                    <button type="button" onClick={() => openDoc(doc.file_path)}
                      className="tg-press"
                      style={{
                        flex: 1, textAlign: "left", background: "none", border: "none",
                        fontSize: 13, fontWeight: 600, color: "var(--blue)",
                        cursor: "pointer", overflow: "hidden",
                        textOverflow: "ellipsis", whiteSpace: "nowrap", padding: 0,
                      }}>
                      {t("doc_" + doc.document_type)} — {doc.file_name}
                    </button>
                    <button type="button" onClick={() => deleteDoc(doc)} className="tg-press"
                      style={{ background: "none", border: "none", color: "var(--red)",
                        cursor: "pointer", padding: 4, display: "flex", flexShrink: 0 }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Separator ── */}
          <div style={{ height: .5, background: "var(--sep)", marginBottom: 11 }} />

          {/* ── Action buttons — always fully visible, no clipping ── */}
          <div style={{ display: "flex", gap: 7 }}>
            {isFuture ? (
              <div style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(120,120,128,.07)",
                borderRadius: 12, padding: "11px 8px",
                fontSize: 13, fontWeight: 600, color: "var(--l3)",
                border: ".5px solid rgba(255,255,255,.40)",
              }}>
                {t("opens_on", { date: formatDate(job.start_date) })}
              </div>
            ) : isApplied ? (
              <a href={job.apply_link} target="_blank" rel="noopener noreferrer"
                className="btn btn-success-tinted tg-press"
                style={{ flex: 1, textDecoration: "none" }}>
                <CheckCircle2 size={15} strokeWidth={2.5} />
                {t("applied_open_link")}
              </a>
            ) : (
              <a href={job.apply_link} target="_blank" rel="noopener noreferrer"
                className="btn btn-filled tg-press"
                style={{ flex: 1, textDecoration: "none" }}>
                {t("apply_now")}
                <ExternalLink size={14} strokeWidth={2.5} />
              </a>
            )}

            <button type="button" onClick={handleToggle}
              className="btn btn-gray tg-press" style={{ flexShrink: 0, minWidth: 80 }}>
              {isApplied ? <RotateCcw size={15} /> : <Circle size={15} />}
              {isApplied ? t("undo_btn") : t("mark_btn")}
            </button>

            {admin && (
              <>
                <button type="button" onClick={() => onEdit?.(job)}
                  className="btn btn-gray btn-icon tg-press">
                  <Pencil size={15} />
                </button>
                <button type="button" onClick={() => onDelete?.(job)}
                  className="btn btn-danger-tinted btn-icon tg-press">
                  <Trash2 size={15} />
                </button>
              </>
            )}
          </div>

        </div>
      </div>
    </article>
  );
}

function DateCell({ icon, label, value, sub, subColor }) {
  return (
    <div style={{
      background: "rgba(120,120,128,.07)",
      border: ".5px solid rgba(255,255,255,.45)",
      borderRadius: 10, padding: "9px 11px",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 3,
        fontSize: 10, fontWeight: 700, color: "var(--l4)",
        textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4,
      }}>
        {icon}{label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--l1)" }}>{value}</div>
      {sub && (
        <div style={{ fontSize: 11, fontWeight: 700, color: subColor, marginTop: 2 }}>
          {sub}
        </div>
      )}
    </div>
  );
}
