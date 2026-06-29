
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import api, { setToken } from "../lib/api";

export default function AdminLogin() {
  const [passcode, setPasscode] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const nav = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (passcode.trim().toLowerCase() !== "bidyadhar") { toast.error("Wrong passcode"); return; }
    setLoading(true);
    try {
      const data = await api.login("bidyadhar", "Bidyadhar1!");
      setToken(data.token);
      toast.success("Welcome back!");
      nav("/admin");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login failed");
    } finally { setLoading(false); }
  };

  return (
    <div data-testid="admin-login-page" style={{
      minHeight: "100dvh", display: "flex", flexDirection: "column",
      background: "var(--bg)", overflow: "auto",
    }}>
      {/* Top gradient band */}
      <div style={{ background: "linear-gradient(145deg,var(--brand-from),var(--brand-to))", height: 220, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 0, paddingTop: "calc(40px + var(--sat))" }}>
        <div style={{ width: 72, height: 72, borderRadius: 22, background: "rgba(255,255,255,.2)", border: "2px solid rgba(255,255,255,.35)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: -36, boxShadow: "0 8px 30px rgba(0,0,0,.2)" }}>
          <ShieldCheck size={32} color="#fff" strokeWidth={2} />
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "56px 24px 40px" }}>
        <div className="card a-pop" style={{ width: "100%", maxWidth: 380, padding: "28px 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--t1)", marginBottom: 4 }}>Admin Login</div>
            <div style={{ fontSize: 14, color: "var(--t3)" }}>Sign in to manage your jobs</div>
          </div>
          <form onSubmit={handleSubmit} data-testid="login-form" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--t2)", display: "block", marginBottom: 6 }}>Passcode</label>
              <div style={{ position: "relative" }}>
                <input type={showPw ? "text" : "password"} value={passcode} onChange={e => setPasscode(e.target.value)}
                  required autoFocus placeholder="Enter passcode"
                  data-testid="login-passcode" className="input" style={{ paddingRight: 52 }} />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--t4)", cursor: "pointer", padding: 4 }}>
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn btn-brand" data-testid="login-submit" style={{ width: "100%", marginTop: 4 }}>
              {loading && <Loader2 size={17} style={{ animation: "spin .8s linear infinite" }} />}
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
