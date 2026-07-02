
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, ShieldCheck, Languages } from "lucide-react";
import { toast } from "sonner";
import api, { setToken } from "../lib/api";
import { useI18n } from "../lib/i18n";

export default function AdminLogin() {
  const { t, lang, toggleLang } = useI18n();
  const [passcode, setPasscode] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const nav = useNavigate();

  const submit = async () => {
    if (!passcode.trim()) return;
    if (passcode.trim().toLowerCase() !== "bidyadhar") {
      toast.error(t("wrong_passcode")); return;
    }
    setLoading(true);
    try {
      const data = await api.login("bidyadhar", "Bidyadhar1!");
      setToken(data.token);
      toast.success(t("welcome_back"));
      nav("/admin");
    } catch (err) {
      toast.error(err?.response?.data?.detail || t("wrong_passcode"));
    } finally { setLoading(false); }
  };

  return (
    <div data-lang={lang} style={{
      position: "fixed", inset: 0, overflow: "auto",
      background: "transparent",
      display: "flex", flexDirection: "column",
    }}>
      {/* Language toggle */}
      <div style={{ position: "absolute", top: "calc(14px + var(--sat))", right: 16, zIndex: 10 }}>
        <button type="button" onClick={toggleLang} className="lang-switch tg-press">
          <Languages size={12} strokeWidth={2.4} />
          {lang === "en" ? "ଓଡ଼ିଆ" : "English"}
        </button>
      </div>

      {/* Hero — iPhone 17 deep blue gradient */}
      <div style={{
        background: "linear-gradient(155deg,#003C8F 0%,#0060DF 45%,#4E72E5 80%,#7A5AF8 100%)",
        minHeight: 230,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "flex-end",
        paddingTop: "calc(50px + var(--sat))",
        paddingBottom: 0, position: "relative", flexShrink: 0,
      }}>
        {/* Dynamic Island decoration */}
        <div style={{
          position: "absolute", top: "calc(12px + var(--sat))", left: "50%",
          transform: "translateX(-50%)",
          width: 120, height: 34, borderRadius: 20,
          background: "rgba(0,0,0,0.80)",
          backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
        }} />
        {/* App icon */}
        <div style={{
          width: 76, height: 76, borderRadius: 24,
          background: "rgba(255,255,255,.18)",
          border: "2px solid rgba(255,255,255,.40)",
          backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: -38,
          boxShadow: "0 12px 40px rgba(0,0,0,.30), 0 2px 8px rgba(0,0,0,.20), inset 0 1px 0 rgba(255,255,255,.25)",
        }}>
          <ShieldCheck size={34} color="#fff" strokeWidth={1.8} />
        </div>
      </div>

      {/* Card */}
      <div style={{ flex: 1, display: "flex", justifyContent: "center", padding: "56px 20px 40px" }}>
        <div className="ios-card a-pop" style={{ width: "100%", maxWidth: 400, padding: "24px 18px 20px" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--l1)", marginBottom: 4 }}>
              {t("admin_login_title")}
            </div>
            <div style={{ fontSize: 13, color: "var(--l3)", lineHeight: 1.5 }}>
              {t("admin_login_sub")}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label className="ios-label">{t("passcode_label")}</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPw ? "text" : "password"}
                  value={passcode}
                  onChange={e => setPasscode(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && submit()}
                  autoFocus autoComplete="current-password"
                  placeholder={t("passcode_placeholder")}
                  className="ios-input"
                  style={{ paddingRight: 50, fontSize: 16 }}
                />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  className="tg-press"
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", color: "var(--l4)",
                    cursor: "pointer", padding: 6, display: "flex",
                  }}>
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="button" onClick={submit}
              disabled={loading || !passcode.trim()}
              className="btn btn-filled tg-press"
              style={{ width: "100%", marginTop: 4 }}>
              {loading
                ? <><Loader2 size={16} style={{ animation: "spin .8s linear infinite" }} /> {t("signing_in")}</>
                : t("sign_in_btn")
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
