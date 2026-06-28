import React, { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

export default function PWAInstallBanner() {
  const [prompt, setPrompt] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("pwa_dismissed")) return;
    const handler = (e) => { e.preventDefault(); setPrompt(e); setShow(true); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!show || !prompt) return null;

  const install = async () => {
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted" || outcome === "dismissed") { setShow(false); setPrompt(null); }
  };
  const dismiss = () => { localStorage.setItem("pwa_dismissed", "1"); setShow(false); };

  return (
    <div data-testid="pwa-install-banner" style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 60,
      background: "var(--bg-card)",
      backdropFilter: "blur(20px)",
      borderTop: "1px solid var(--border)",
      padding: "16px 20px calc(16px + var(--safe-bottom))",
      display: "flex", alignItems: "center", gap: "14px",
      animation: "slideUpSheet 0.4s cubic-bezier(0.34,1.1,0.64,1) both",
    }}>
      <div style={{
        width: "48px", height: "48px", flexShrink: 0,
        background: "linear-gradient(135deg, var(--accent), #9C63FF)",
        borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <Download size={22} color="white" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--ink)" }}>Install Job Ledger</div>
        <div style={{ fontSize: "0.8125rem", color: "var(--ink-muted)" }}>Add to home screen for instant access</div>
      </div>
      <button type="button" onClick={install} className="btn-primary" style={{ padding: "12px 20px", minHeight: "44px", flexShrink: 0, fontSize: "0.9375rem" }}>
        Install
      </button>
      <button type="button" onClick={dismiss} style={{
        background: "none", border: "none", color: "var(--ink-muted)",
        cursor: "pointer", padding: "8px", flexShrink: 0
      }}>
        <X size={20} />
      </button>
    </div>
  );
}
