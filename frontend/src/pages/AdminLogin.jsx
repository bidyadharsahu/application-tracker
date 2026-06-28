import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LogIn, ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import api, { setToken } from "../lib/api";

export default function AdminLogin() {
  const [passcode, setPasscode] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (passcode.trim().toLowerCase() !== "bidyadhar") { toast.error("Wrong passcode"); return; }
    setLoading(true);
    try {
      const data = await api.login("bidyadhar", "Bidyadhar1!");
      setToken(data.token);
      toast.success(`Welcome back! 👋`);
      navigate("/admin");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login failed");
    } finally { setLoading(false); }
  };

  return (
    <div data-testid="admin-login-page" style={{
      minHeight: "100dvh", background: "var(--bg)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "24px 24px calc(24px + var(--safe-bottom))"
    }}>
      {/* Back button */}
      <Link to="/" data-testid="back-to-home" style={{
        position: "absolute", top: "calc(24px + var(--safe-top))", left: "24px",
        display: "flex", alignItems: "center", gap: "6px",
        fontSize: "0.9375rem", fontWeight: 700, color: "var(--ink-soft)", textDecoration: "none"
      }}>
        <ArrowLeft size={18} /> Back
      </Link>

      {/* Card */}
      <div className="anim-scale-in" style={{
        width: "100%", maxWidth: "400px",
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-xl)", padding: "36px 28px",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{
            width: "72px", height: "72px", borderRadius: "22px", margin: "0 auto 16px",
            background: "linear-gradient(135deg, var(--accent), #9C63FF)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 32px rgba(108,99,255,0.4)",
          }} className="anim-float">
            <LogIn size={32} color="white" />
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 900, color: "var(--ink)", letterSpacing: "-0.02em" }}>
            Editor's Desk
          </div>
          <div style={{ fontSize: "0.9375rem", color: "var(--ink-muted)", marginTop: "4px" }}>
            Sign in to manage your jobs
          </div>
        </div>

        <form onSubmit={handleSubmit} data-testid="login-form" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>
              Passcode
            </div>
            <div style={{ position: "relative" }}>
              <input
                type={showPw ? "text" : "password"}
                value={passcode}
                onChange={e => setPasscode(e.target.value)}
                required autoFocus
                placeholder="Enter passcode"
                data-testid="login-passcode"
                className="input-field"
                style={{ paddingRight: "52px" }}
              />
              <button type="button" onClick={() => setShowPw(p => !p)} style={{
                position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", color: "var(--ink-muted)", cursor: "pointer", padding: "4px"
              }}>
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary" data-testid="login-submit" style={{ width: "100%", marginTop: "4px" }}>
            {loading ? <Loader2 size={18} style={{ animation: "spin-slow 0.8s linear infinite" }} /> : <LogIn size={18} />}
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: "0.8125rem", color: "var(--ink-muted)", marginTop: "20px" }}>
          Only authorised editors can post notices
        </p>
      </div>
    </div>
  );
}
