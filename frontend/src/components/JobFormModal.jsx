import React, { useState, useEffect } from "react";
import { X, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

const inputClass =
  "bg-[#FCFAF5] border-2 border-[#2C2A26] font-mono text-base py-2.5 px-3 outline-none w-full placeholder:text-[#59554D]/50 focus:shadow-stamp transition-shadow";

const labelClass =
  "block font-mono text-xs uppercase tracking-widest text-[#59554D] mb-1.5 font-bold";

export default function JobFormModal({ open, onClose, onSave, initial, prefill }) {
  const [form, setForm] = useState({
    job_name: "",
    last_date: "",
    exam_date: "",
    apply_link: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const base = initial || {};
      const pre = prefill || {};
      setForm({
        job_name: pre.job_name || base.job_name || "",
        last_date: pre.last_date || base.last_date || "",
        exam_date: pre.exam_date || base.exam_date || "",
        apply_link: pre.apply_link || base.apply_link || "",
        notes: pre.notes || base.notes || "",
      });
    }
  }, [open, initial, prefill]);

  if (!open) return null;

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.job_name.trim()) {
      toast.error("Job name is required");
      return;
    }
    if (!form.last_date) {
      toast.error("Last date is required");
      return;
    }
    if (!form.apply_link.trim()) {
      toast.error("Apply link is required");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        job_name: form.job_name.trim(),
        last_date: form.last_date,
        exam_date: form.exam_date || null,
        apply_link: form.apply_link.trim(),
        notes: form.notes.trim() || null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#2C2A26]/40 backdrop-blur-sm animate-notice"
      data-testid="job-form-modal"
      onClick={onClose}
    >
      <div
        className="bg-[#F4F1EA] border-4 border-[#2C2A26] shadow-stamp-xl p-6 sm:p-8 w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-[#2C2A26] hover:text-[#8C3A3A] transition-colors"
          aria-label="Close"
          data-testid="job-form-close"
          type="button"
        >
          <X size={24} />
        </button>

        <h2 className="font-serif font-black text-2xl sm:text-3xl text-[#2C2A26] mb-1">
          {initial ? "Edit Job" : "New Job Notice"}
        </h2>
        <p className="font-sans text-sm text-[#59554D] mb-5">
          Fill in details — these go live on the public ledger.
        </p>

        <div className="space-y-4">
          <div>
            <label className={labelClass}>Job name *</label>
            <input
              className={inputClass}
              value={form.job_name}
              onChange={(e) => update("job_name", e.target.value)}
              placeholder="e.g. SBI PO Recruitment 2026"
              data-testid="job-form-name"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Last date to apply *</label>
              <input
                type="date"
                className={inputClass}
                value={form.last_date}
                onChange={(e) => update("last_date", e.target.value)}
                data-testid="job-form-last-date"
              />
            </div>
            <div>
              <label className={labelClass}>Exam date</label>
              <input
                type="date"
                className={inputClass}
                value={form.exam_date}
                onChange={(e) => update("exam_date", e.target.value)}
                data-testid="job-form-exam-date"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Apply link *</label>
            <input
              className={inputClass}
              value={form.apply_link}
              onChange={(e) => update("apply_link", e.target.value)}
              placeholder="https://..."
              data-testid="job-form-apply-link"
            />
          </div>

          <div>
            <label className={labelClass}>Notes (optional)</label>
            <textarea
              className={inputClass + " min-h-[80px]"}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Short note about the job"
              rows={3}
              data-testid="job-form-notes"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 bg-[#2C2A26] text-[#FCFAF5] font-serif font-bold text-base sm:text-lg px-5 py-3 border-2 border-[#2C2A26] hover:bg-transparent hover:text-[#2C2A26] transition-colors disabled:opacity-60"
            data-testid="job-form-save"
            type="button"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? "Saving..." : initial ? "Save changes" : "Publish job"}
          </button>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center bg-transparent text-[#2C2A26] font-serif font-bold text-base sm:text-lg px-5 py-3 border-2 border-[#2C2A26] hover:bg-[#EBE5D9] transition-colors"
            type="button"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
