
import React, { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { useI18n } from "../lib/i18n";

export default function PWAInstallBanner() {
  const { t } = useI18n();
  const [prompt, setPrompt] = useState(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (localStorage.getItem("pwa_dismissed")) return;
    const h = e => { e.preventDefault(); setPrompt(e); setShow(true); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);
  if (!show || !prompt) return null;
  const install = async () => { prompt.prompt(); const { outcome } = await prompt.userChoice; if (outcome) { setShow(false); setPrompt(null); } };
  const dismiss = () => { localStorage.setItem("pwa_dismissed", "1"); setShow(false); };
  return (
    <div data-testid="pwa-install-banner" style={{
      /* was bottom: calc(var(--tabbar-h) + 8px) — same safe-area undercount bug as the
         scroll-padding fix, so the banner could sit partly behind the tab bar on
         devices with a home indicator. Now correctly adds --sab too. */
      position: "fixed", bottom: "calc(var(--tabbar-h) + var(--sab) + 8px)", left: 16, right: 16, zIndex: 90,
      background: "rgba(255,255,255,0.96)", backdropFilter: "blur(20px)",
      borderRadius: 18, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12,
      boxShadow: "0 8px 28px rgba(0,0,0,.16)", animation: "slideUp .3s var(--ease-out-soft) both",
    }}>
      <div style={{ width: 42, height: 42, borderRadius: 12, background: "var(--ios-blue)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Download size={20} color="#fff" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--label-1)" }}>{t("install_app_title")}</div>
        <div style={{ fontSize: 12, color: "var(--label-3)" }}>{t("install_app_sub")}</div>
      </div>
      <button type="button" onClick={install} className="btn btn-filled btn-sm tg-press">{t("install_btn")}</button>
      <button type="button" onClick={dismiss} className="tg-press" style={{ background: "none", border: "none", color: "var(--label-4)", cursor: "pointer", padding: 4, flexShrink: 0 }}><X size={18} /></button>
    </div>
  );
}
