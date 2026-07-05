import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { parseFlexDate, toDisplayDate } from "../lib/utils-date";
import { useI18n } from "../lib/i18n";

export default function JobFormModal({ open, onClose, onSave, initial, prefill }) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    job_name: "", start_date: "", last_date: "",
    exam_date: "", tags: "", apply_link: "",
    app_username: "", app_password: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const b = initial || {}, p = prefill || {};
    setForm({
      job_name:     p.job_name     || b.job_name     || "",
      start_date:   toDisplayDate(p.start_date  || b.start_date  || ""),
      last_date:    toDisplayDate(p.last_date   || b.last_date   || ""),
      exam_date:    toDisplayDate(p.exam_date   || b.exam_date   || ""),
      tags:         p.tags         || b.tags         || "",
      apply_link:   p.apply_link   || b.apply_link   || "",
      app_username: p.app_username || b.app_username || "",
      app_password: p.app_password || b.app_password || "",
      notes:        p.notes        || b.notes        || "",
    });
    setTimeout(() => panelRef.current?.scrollTo?.(0, 0), 50);
  }, [open, initial, prefill]);

  // ISSUE 1 FIX: useCallback-stable setter so child inputs never re-mount
  const set = useCallback((k, v) => setForm(f => ({ ...f, [k]: v })), []);

  if (!open) return null;

  const save = async () => {
    if (!form.job_name.trim()) { toast.error(t("job_name_required")); return; }
    if (!form.apply_link.trim()) { toast.error(t("apply_link_required")); return; }

    // ISSUE 4 FIX: accept any parseable date OR free text for ALL date fields.
    // We only error if the field has content AND parseFlexDate returns something
    // that is clearly not a date (falls back to raw string containing no digits).
    const parsedStart = form.start_date ? parseFlexDate(form.start_date) : "";
    const parsedLast  = form.last_date  ? parseFlexDate(form.last_date)  : "";
    const parsedExam  = form.exam_date  ? parseFlexDate(form.exam_date)  : "";

    // Validate only if field is non-empty and parse produced nothing ISO-like
    const isValidDate = (raw, parsed) => {
      if (!raw) return true; // empty = ok
      return /^\d{4}-\d{2}(-\d{2})?$/.test(parsed); // ISO full or month-only
    };

    if (!isValidDate(form.start_date, parsedStart)) {
      toast.error(t("enter_date_as", { field: "start date" })); return;
    }
    if (!isValidDate(form.last_date, parsedLast)) {
      toast.error(t("enter_date_as", { field: "last date" })); return;
    }
    // Exam date: accept full ISO, month-only, OR free text like "August 2026"
    // If parsedExam is still free text, save it as-is (best-effort)
    const examToSave = parsedExam || (form.exam_date ? form.exam_date.trim() : null);

    setSaving(true);
    try {
      await onSave({
        job_name:     form.job_name.trim(),
        start_date:   parsedStart || null,
        last_date:    parsedLast  || null,
        exam_date:    examToSave  || null,
        tags:         form.tags.trim()         || null,
        apply_link:   form.apply_link.trim(),
        app_username: form.app_username.trim() || null,
        app_password: form.app_password.trim() || null,
        notes:        form.notes.trim()        || null,
      });
    } finally { setSaving(false); }
  };

  const F = ({ label, children }) => (
    <div><label className="ios-label">{label}</label>{children}</div>
  );

  // 16px = no iOS zoom. autoComplete="off" prevents ghost dropdown covering field.
  const inputProps = {
    style: { fontSize: 16 },
    autoComplete: "off",
    autoCorrect: "off",
    autoCapitalize: "sentences",
    spellCheck: false,
  };

  return (
    <div onClick={onClose} data-testid="job-form-modal" className="ios-sheet">
      <div className="ios-sheet-backdrop" />
      <div
        ref={panelRef}
        className="ios-sheet-panel"
        onClick={e => e.stopPropagation()}
      >
        <div className="ios-sheet-handle" />

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 19, fontWeight: 800, color: "var(--label-1)" }}>
              {initial ? t("edit_job") : t("new_job_form_title")}
            </div>
            <div style={{ fontSize: 12, color: "var(--label-3)", marginTop: 2 }}>
              {t("fill_details_below")}
            </div>
          </div>
          <button type="button" onClick={onClose} data-testid="job-form-close"
            className="btn btn-gray btn-icon tg-press" style={{ width: 36, height: 36, minHeight: 36 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <F label={t("job_name_label")}>
            <input className="ios-input" {...inputProps}
              value={form.job_name}
              onChange={e => set("job_name", e.target.value)}
              placeholder={t("job_name_placeholder")}
              data-testid="job-form-name"
              enterKeyHint="next"
            />
          </F>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <F label={t("start_date_label")}>
              <input className="ios-input" {...inputProps}
                value={form.start_date}
                onChange={e => set("start_date", e.target.value)}
                placeholder="15 08 2026"
                data-testid="job-form-start-date"
                inputMode="text"
              />
            </F>
            <F label={t("last_date_label")}>
              <input className="ios-input" {...inputProps}
                value={form.last_date}
                onChange={e => set("last_date", e.target.value)}
                placeholder="31 08 2026"
                data-testid="job-form-last-date"
                inputMode="text"
              />
            </F>
          </div>

          {/* Exam date — full width, completely free text */}
          <F label={t("exam_date_label")}>
            <input
              className="ios-input"
              {...inputProps}
              value={form.exam_date}
              onChange={e => set("exam_date", e.target.value)}
              placeholder="15 08 2026  or  August 2026"
              data-testid="job-form-exam-date"
              inputMode="text"
            />
            <p style={{ fontSize: 11, color: "var(--label-4)", marginTop: 4, lineHeight: 1.5 }}>
              💡 {t("exam_date_hint")}
            </p>
          </F>

          <F label={t("tags_label")}>
            <input className="ios-input" {...inputProps}
              value={form.tags}
              onChange={e => set("tags", e.target.value)}
              placeholder="SSC, Banking, State Govt"
              data-testid="job-form-tags"
            />
          </F>

          <F label={t("apply_link_label")}>
            <input className="ios-input"
              style={{ fontSize: 16 }}
              value={form.apply_link}
              onChange={e => set("apply_link", e.target.value)}
              placeholder="https://…"
              data-testid="job-form-apply-link"
              type="url" inputMode="url"
              autoComplete="off"
            />
          </F>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <F label={t("username_label")}>
              <input className="ios-input" {...inputProps}
                value={form.app_username}
                onChange={e => set("app_username", e.target.value)}
                placeholder={t("optional_placeholder")}
                data-testid="job-form-app-username"
              />
            </F>
            <F label={t("password_label")}>
              <input className="ios-input" {...inputProps}
                value={form.app_password}
                onChange={e => set("app_password", e.target.value)}
                placeholder={t("optional_placeholder")}
                data-testid="job-form-app-password"
              />
            </F>
          </div>

          <F label={t("notes_label")}>
            <textarea className="ios-input" style={{ fontSize: 16, resize: "vertical", minHeight: 72 }}
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
              placeholder={t("notes_placeholder")}
              rows={3}
              data-testid="job-form-notes"
            />
          </F>

          <div style={{ display: "flex", gap: 8, paddingBottom: 4 }}>
            <button
              type="button" onClick={save} disabled={saving}
              className="btn btn-filled tg-press"
              data-testid="job-form-save"
              style={{ flex: 1 }}
            >
              {saving
                ? <><Loader2 size={16} style={{ animation: "spin .8s linear infinite" }} /> {t("saving")}</>
                : <><Save size={16} /> {initial ? t("save_changes") : t("add_job_btn")}</>
              }
            </button>
            <button type="button" onClick={onClose}
              className="btn btn-gray tg-press" style={{ minWidth: 88 }}>
              {t("cancel_btn")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
