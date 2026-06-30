
import React, { useState } from "react";
import { X, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";

export default function SmartPasteModal({ open, onClose, onParsed }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  if (!open) return null;

  const parse = async () => {
    if (text.trim().length < 5) { toast.error("Paste some content first"); return; }
    setLoading(true);
    try {
      const data = await api.smartParse(text);
      if (!data.job_name && !data.last_date && !data.apply_link) toast.error("Could not extract data");
      else { toast.success("Details extracted"); onParsed && onParsed(data); }
    } catch (e) { toast.error(e?.response?.data?.detail || "AI parse failed"); }
    finally { setLoading(false); }
  };

  return (
    <div onClick={onClose} data-testid="smart-paste-modal" className="ios-sheet">
      <div className="ios-sheet-backdrop" />
      <div className="ios-sheet-panel" onClick={e => e.stopPropagation()}>
        <div className="ios-sheet-handle" />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,#0A84FF,#5E5CE6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Sparkles size={19} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "var(--label-1)" }}>Smart Paste</div>
            <div style={{ fontSize: 13, color: "var(--label-3)" }}>AI reads and extracts job details</div>
          </div>
          <button type="button" onClick={onClose} data-testid="smart-paste-close" className="btn btn-gray btn-icon" style={{ marginLeft: "auto", width: 36, height: 36 }}><X size={16} /></button>
        </div>
        <div style={{ marginBottom: 14 }}>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Paste job notification text here…" data-testid="smart-paste-textarea" className="ios-input" rows={7} style={{ resize: "vertical", minHeight: 150 }} />
        </div>
        <div style={{ display: "flex", gap: 10, paddingBottom: 8 }}>
          <button type="button" onClick={parse} disabled={loading} className="btn btn-filled" data-testid="smart-paste-extract-btn" style={{ flex: 1 }}>
            {loading ? <Loader2 size={17} style={{ animation: "spin .8s linear infinite" }} /> : <Sparkles size={17} />}
            {loading ? "Reading…" : "Extract with AI"}
          </button>
          <button type="button" onClick={onClose} className="btn btn-gray" style={{ minWidth: 90 }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
