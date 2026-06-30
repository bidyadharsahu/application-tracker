
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import api, { setToken } from "../lib/api";

export default function AdminLogin() {
  const [passcode, setPasscode] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (passcode.trim().toLowerCase() !== "bidyadhar") { toast.error("Wrong passcode"); return; }
    setLoading(true);
    try {
      const data = await api.login("bidyadhar", "Bidyadhar1!");
      setToken(data.token);
      toast.success("Welcome back");
      nav("/admin");
    } catch (err) { toast.error(err?.response?.data?.detail || "Login failed"); }
    finally { setLoading(false); }
  };

  return (
    <div data-testid="admin-login-page" style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "var(--bg-primary)", overflow: "auto" }}>
      <div style={{ background: "linear-gradient(135deg,#0A84FF,#5E5CE6)", height: 210, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingTop: "calc(36px + var(--sat))" }}>
        <div style={{ width: 68, height: 68, borderRadius: 20, background: "rgba(255,255,255,.2)", border: "2px solid rgba(255,255,255,.35)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: -34, boxShadow: "0 8px 28px rgba(0,0,0,.2)" }}>
          <ShieldCheck size={30} color="#fff" />
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "54px 20px 40px" }}>
        <div className="ios-card a-pop" style={{ width: "100%", maxWidth: 380, padding: "26px 22px" }}>
          <div style={{ textAlign: "center", marginBottom: 22 }}>
            <div style={{ fontSize: 21, fontWeight: 800, color: "var(--label-1)", marginBottom: 4 }}>Admin Login</div>
            <div style={{ fontSize: 14, color: "var(--label-3)" }}>Sign in to manage your jobs</div>
          </div>
          <form onSubmit={handleSubmit} data-testid="login-form" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label className="ios-label">Passcode</label>
              <div style={{ position: "relative" }}>
                <input type={showPw ? "text" : "password"} value={passcode} onChange={e => setPasscode(e.target.value)}
                  required autoFocus placeholder="Enter passcode" data-testid="login-passcode" className="ios-input" style={{ paddingRight: 50 }} />
                <button type="button" onClick={() => setShowPw(p => !p)} style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--label-4)", cursor: "pointer", padding: 4 }}>
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn btn-filled" data-testid="login-submit" style={{ width: "100%", marginTop: 4 }}>
              {loading && <Loader2 size={17} style={{ animation: "spin .8s linear infinite" }} />}
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
