import React, { useState } from "react";
import { X, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";

export default function SmartPasteModal({ open, onClose, onParsed }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleParse = async () => {
    if (text.trim().length < 5) {
      toast.error("Please paste some content to parse.");
      return;
    }
    setLoading(true);
    try {
      const data = await api.smartParse(text);
      if (!data.job_name && !data.last_date && !data.apply_link) {
        toast.error("Could not extract data. Try cleaner text.");
      } else {
        toast.success("Extracted successfully — review & save.");
        onParsed && onParsed(data);
      }
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.detail || "Smart parse failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#2C2A26]/40 backdrop-blur-sm animate-notice"
      data-testid="smart-paste-modal"
      onClick={onClose}
    >
      <div
        className="bg-[#F4F1EA] border-4 border-[#2C2A26] shadow-stamp-xl p-6 sm:p-8 w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-[#2C2A26] hover:text-[#8C3A3A] transition-colors"
          aria-label="Close"
          data-testid="smart-paste-close"
          type="button"
        >
          <X size={24} />
        </button>

        <div className="flex items-center gap-3 mb-2">
          <Sparkles size={26} strokeWidth={1.5} className="text-[#2C2A26]" />
          <h2 className="font-serif font-bold text-2xl sm:text-3xl text-[#2C2A26]">
            Smart Paste
          </h2>
        </div>
        <p className="font-sans text-sm sm:text-base text-[#59554D] mb-5">
          Paste a job notification, advertisement, or any text — we'll extract the job name,
          dates, and apply link for you.
        </p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste notification text, paragraph, or webpage content here..."
          className="font-mono text-sm sm:text-base bg-[#FCFAF5] border-2 border-dashed border-[#59554D] focus:border-[#2C2A26] w-full p-3 outline-none min-h-[180px] resize-y"
          data-testid="smart-paste-textarea"
          rows={8}
        />

        <div className="flex flex-col sm:flex-row gap-3 mt-5">
          <button
            onClick={handleParse}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 bg-[#2C2A26] text-[#FCFAF5] font-serif font-bold text-base sm:text-lg px-5 py-3 border-2 border-[#2C2A26] hover:bg-transparent hover:text-[#2C2A26] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            data-testid="smart-paste-extract-btn"
            type="button"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            {loading ? "Reading..." : "Extract with AI"}
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
