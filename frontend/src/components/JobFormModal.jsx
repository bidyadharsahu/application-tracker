import React, { useState, useEffect } from "react";
import { X, Save, Loader2, ChevronDown } from "lucide-react";
import { toast } from "sonner";

const fmtDisplay = (s) => {
  if (!s) return "";
  if (s.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [y,m,d] = s.split("-"); return `${d} ${m} ${y}`;
  }
  return s;
};
const parseDate = (s) => {
  if (!s) return "";
  const m = s.trim().match(/^(\d{2})[- /.](\d{2})[- /.](\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return s.trim();
};

const Label = ({ children }) => (
  <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
    {children}
  </div>
);

export default function JobFormModal({ open, onClose, onSave, initial, prefill }) {
  const [form, setForm] = useState({ job_name:"", start_date:"", last_date:"", exam_date:"", tags:"", apply_link:"", app_username:"", app_password:"", notes:"" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const b = initial || {}, p = prefill || {};
    setForm({
      job_name: p.job_name || b.job_name || "",
      start_date: fmtDisplay(p.start_date || b.start_date || ""),
      last_date: fmtDisplay(p.last_date || b.last_date || ""),
      exam_date: fmtDisplay(p.exam_date || b.exam_date || ""),
      tags: p.tags || b.tags || "",
      apply_link: p.apply_link || b.apply_link || "",
      app_username: p.app_username || b.app_username || "",
      app_password: p.app_password || b.app_password || "",
      notes: p.notes || b.notes || "",
    });
  }, [open, initial, prefill]);

  if (!open) return null;
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.job_name.trim()) { toast.error("Job name required"); return; }
    if (!form.apply_link.trim()) { toast.error("Apply link required"); return; }
    for (const k of ["start_date","last_date","exam_date"]) {
      const parsed = parseDate(form[k]);
      if (form[k] && !parsed.match(/^\d{4}-\d{2}-\d{2}$/)) {
        toast.error(`Enter ${k.replace("_"," ")} as DD MM YYYY`); return;
      }
    }
    setSaving(true);
    try {
      await onSave({
        job_name: form.job_name.trim(),
        start_date: parseDate(form.start_date) || null,
        last_date: parseDate(form.last_date) || null,
        exam_date: parseDate(form.exam_date) || null,
        tags: form.tags.trim() || null,
        apply_link: form.apply_link.trim(),
        app_username: form.app_username.trim() || null,
        app_password: form.app_password.trim() || null,
        notes: form.notes.trim() || null,
      });
    } finally { setSaving(false); }
  };

  return (
    <div
      onClick={onClose}
      data-testid="job-form-modal"
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(8px)",
        display: "flex", alignItems: "flex-end"
      }}
    >
      <div
        className="bottom-sheet"
        onClick={e => e.stopPropagation()}
        style={{ width: "100%", padding: "0 20px" }}
      >
        <div className="sheet-handle" />

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--ink)" }}>
              {initial ? "Edit Job" : "New Job"}
            </div>
            <div style={{ fontSize: "0.875rem", color: "var(--ink-muted)", marginTop: "2px" }}>
              Fill in the details below
            </div>
          </div>
          <button type="button" onClick={onClose} data-testid="job-form-close" style={{
            width: "40px", height: "40px", borderRadius: "50%",
            background: "rgba(255,255,255,0.08)", border: "none",
            color: "var(--ink)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div>
            <Label>Job Name *</Label>
            <input className="input-field" value={form.job_name} onChange={e => set("job_name", e.target.value)}
              placeholder="e.g. SBI PO 2026" data-testid="job-form-name" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <Label>Start Date</Label>
              <input className="input-field" value={form.start_date} onChange={e => set("start_date", e.target.value)}
                placeholder="DD MM YYYY" data-testid="job-form-start-date" />
            </div>
            <div>
              <Label>Last Date *</Label>
              <input className="input-field" value={form.last_date} onChange={e => set("last_date", e.target.value)}
                placeholder="DD MM YYYY" data-testid="job-form-last-date" />
            </div>
            <div>
              <Label>Exam Date</Label>
              <input className="input-field" value={form.exam_date} onChange={e => set("exam_date", e.target.value)}
                placeholder="DD MM YYYY" data-testid="job-form-exam-date" />
            </div>
            <div>
              <Label>Tags</Label>
              <input className="input-field" value={form.tags} onChange={e => set("tags", e.target.value)}
                placeholder="SSC, Banking" data-testid="job-form-tags" />
            </div>
          </div>

          <div>
            <Label>Apply Link *</Label>
            <input className="input-field" value={form.apply_link} onChange={e => set("apply_link", e.target.value)}
              placeholder="https://..." data-testid="job-form-apply-link" type="url" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <Label>Username</Label>
              <input className="input-field" value={form.app_username} onChange={e => set("app_username", e.target.value)}
                placeholder="Optional" data-testid="job-form-app-username" />
            </div>
            <div>
              <Label>Password</Label>
              <input className="input-field" value={form.app_password} onChange={e => set("app_password", e.target.value)}
                placeholder="Optional" data-testid="job-form-app-password" />
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <textarea className="input-field" value={form.notes} onChange={e => set("notes", e.target.value)}
              placeholder="Any notes about this job..." rows={3}
              data-testid="job-form-notes"
              style={{ resize: "vertical", minHeight: "80px" }}
            />
          </div>

          <div style={{ display: "flex", gap: "12px", paddingBottom: "8px" }}>
            <button type="button" onClick={handleSave} disabled={saving} className="btn-primary"
              data-testid="job-form-save" style={{ flex: 1 }}>
              {saving ? <Loader2 size={18} style={{ animation: "spin-slow 0.8s linear infinite" }} /> : <Save size={18} />}
              {saving ? "Saving..." : initial ? "Save Changes" : "Publish Job"}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ minWidth: "80px" }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
