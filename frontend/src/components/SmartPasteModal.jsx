import React, { useState } from "react";
import { X, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";

export default function SmartPasteModal({ open, onClose, onParsed }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleParse = async () => {
    if (text.trim().length < 5) { toast.error("Paste some content first"); return; }
    setLoading(true);
    try {
      const data = await api.smartParse(text);
      if (!data.job_name && !data.last_date && !data.apply_link) {
        toast.error("Couldn't extract data. Try cleaner text.");
      } else {
        toast.success("Extracted! Review and save ✅");
        onParsed && onParsed(data);
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || "AI parse failed");
    } finally { setLoading(false); }
  };

  return (
    <div onClick={onClose} data-testid="smart-paste-modal" style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "flex-end"
    }}>
      <div className="bottom-sheet" onClick={e => e.stopPropagation()} style={{ width: "100%", padding: "0 20px" }}>
        <div className="sheet-handle" />

        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <div style={{
            width: "44px", height: "44px", borderRadius: "12px",
            background: "linear-gradient(135deg,var(--accent),#9C63FF)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
          }}>
            <Sparkles size={20} color="white" />
          </div>
          <div>
            <div style={{ fontSize: "1.375rem", fontWeight: 900, color: "var(--ink)" }}>Smart Paste</div>
            <div style={{ fontSize: "0.8125rem", color: "var(--ink-muted)" }}>AI extracts job details automatically</div>
          </div>
          <button type="button" onClick={onClose} data-testid="smart-paste-close" style={{
            marginLeft: "auto", width: "40px", height: "40px", borderRadius: "50%",
            background: "rgba(255,255,255,0.08)", border: "none",
            color: "var(--ink)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Paste job notification, PDF text, or webpage content here..."
            data-testid="smart-paste-textarea"
            className="input-field"
            rows={7}
            style={{ resize: "vertical", minHeight: "160px" }}
          />
        </div>

        <div style={{ display: "flex", gap: "12px", paddingBottom: "8px" }}>
          <button type="button" onClick={handleParse} disabled={loading} className="btn-primary"
            data-testid="smart-paste-extract-btn" style={{ flex: 1 }}>
            {loading ? <Loader2 size={18} style={{ animation: "spin-slow 0.8s linear infinite" }} /> : <Sparkles size={18} />}
            {loading ? "Reading with AI..." : "Extract with AI"}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary" style={{ minWidth: "80px" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
