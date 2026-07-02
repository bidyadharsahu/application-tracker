
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import api, { setToken } from "../lib/api";
import { useI18n } from "../lib/i18n";

export default function AdminLogin() {
  const { t, lang, toggleLang } = useI18n();
  const [passcode, setPasscode] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const nav = useNavigate();

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!passcode.trim()) return;
    if (passcode.trim().toLowerCase() !== "bidyadhar") {
      toast.error(t("wrong_passcode"));
      return;
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
    <div
      data-testid="admin-login-page"
      data-lang={lang}
      style={{
        height: "100dvh",
        display: "flex", flexDirection: "column",
        background: "transparent",
        overflow: "auto",
      }}
    >
      {/* Language toggle top-right */}
      <div style={{
        position: "absolute", top: "calc(14px + var(--sat))", right: 16, zIndex: 10,
      }}>
        <button type="button" onClick={toggleLang} className="lang-switch tg-press">
          {lang === "en" ? "ଓଡ଼ିଆ" : "English"}
        </button>
      </div>

      {/* Hero gradient bar */}
      <div style={{
        background: "linear-gradient(145deg, #0060DF 0%, #007AFF 50%, #5E5CE6 100%)",
        height: 220,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "flex-end",
        paddingTop: "calc(40px + var(--sat))",
        paddingBottom: 0,
        position: "relative",
        flexShrink: 0,
      }}>
        {/* App icon */}
        <div style={{
          width: 72, height: 72, borderRadius: 22,
          background: "rgba(255,255,255,0.22)",
          border: "2px solid rgba(255,255,255,0.38)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: -36,
          boxShadow: "0 10px 34px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.15)",
          backdropFilter: "blur(8px)",
        }}>
          <ShieldCheck size={32} color="#fff" strokeWidth={1.8} />
        </div>
      </div>

      {/* Card */}
      <div style={{
        flex: 1,
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "52px 20px 40px",
      }}>
        <div
          className="ios-card a-pop"
          style={{ width: "100%", maxWidth: 400, padding: "26px 20px 22px" }}
        >
          <div style={{ textAlign: "center", marginBottom: 22 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--label-1)", marginBottom: 4 }}>
              {t("admin_login_title")}
            </div>
            <div style={{ fontSize: 13, color: "var(--label-3)", lineHeight: 1.5 }}>
              {t("admin_login_sub")}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label className="ios-label">{t("passcode_label")}</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPw ? "text" : "password"}
                  value={passcode}
                  onChange={e => setPasscode(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                  required
                  autoFocus
                  autoComplete="current-password"
                  placeholder={t("passcode_placeholder")}
                  data-testid="login-passcode"
                  className="ios-input"
                  style={{ paddingRight: 50, fontSize: 16 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="tg-press"
                  style={{
                    position: "absolute", right: 12, top: "50%",
                    transform: "translateY(-50%)",
                    background: "none", border: "none",
                    color: "var(--label-4)", cursor: "pointer", padding: 6,
                    display: "flex",
                  }}
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !passcode.trim()}
              className="btn btn-filled tg-press"
              data-testid="login-submit"
              style={{ width: "100%", marginTop: 2 }}
            >
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
