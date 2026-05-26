import React, { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("pwa_install_dismissed");
    if (dismissed) return;
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!show || !deferredPrompt) return null;

  const handleInstall = async () => {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted" || outcome === "dismissed") {
      setShow(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("pwa_install_dismissed", "1");
    setShow(false);
  };

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-40 bg-[#EBE5D9] border-t-4 border-[#2C2A26] p-3 sm:p-4 flex items-center gap-3 justify-between shadow-2xl animate-notice"
      data-testid="pwa-install-banner"
    >
      <div className="flex items-center gap-3 min-w-0">
        <Download size={22} strokeWidth={1.5} className="text-[#2C2A26] shrink-0" />
        <div className="min-w-0">
          <div className="font-serif font-bold text-base sm:text-lg text-[#2C2A26] truncate">
            Install The Job Ledger
          </div>
          <div className="font-sans text-xs sm:text-sm text-[#59554D] truncate">
            Add to home screen for quick access.
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleInstall}
          className="bg-[#2C2A26] text-[#FCFAF5] font-serif font-bold text-sm px-3 py-2 border-2 border-[#2C2A26] hover:bg-transparent hover:text-[#2C2A26] transition-colors"
          data-testid="pwa-install-btn"
          type="button"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="text-[#59554D] hover:text-[#2C2A26] p-2"
          aria-label="Dismiss"
          data-testid="pwa-dismiss-btn"
          type="button"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
