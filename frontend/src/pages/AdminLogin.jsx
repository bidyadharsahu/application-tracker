import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LogIn, Newspaper, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import api, { setToken } from "../lib/api";

export default function AdminLogin() {
  const [passcode, setPasscode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (passcode.trim().toLowerCase() !== "bidyadhar") {
      toast.error("Invalid passcode");
      return;
    }
    setLoading(true);
    try {
      const data = await api.login("bidyadhar", "Bidyadhar1!");
      setToken(data.token);
      toast.success(`Welcome back, ${data.username}`);
      navigate("/admin");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      data-testid="admin-login-page"
    >
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[#59554D] hover:text-[#2C2A26] mb-4"
          data-testid="back-to-home"
        >
          <ArrowLeft size={14} /> Back to The Ledger
        </Link>

        <div className="bg-[#FCFAF5] border-4 border-[#2C2A26] shadow-stamp-xl p-6 sm:p-10 animate-notice">
          <div className="flex items-center gap-3 mb-2">
            <Newspaper size={28} strokeWidth={1.25} className="text-[#2C2A26]" />
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#59554D]">
                Editor's Desk
              </div>
              <h1 className="font-serif font-bold text-2xl sm:text-3xl text-[#2C2A26]">
                Sign In
              </h1>
            </div>
          </div>
          <div className="divider-vintage my-4" aria-hidden="true" />

          <form onSubmit={handleSubmit} className="space-y-4" data-testid="login-form">
            <div>
              <label className="block font-mono text-xs uppercase tracking-wider text-[#59554D] mb-1.5 font-bold">
                Passcode
              </label>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                required
                autoFocus
                className="bg-transparent border-2 border-[#2C2A26] font-mono text-base py-2.5 px-3 outline-none w-full"
                placeholder="••••••••"
                data-testid="login-passcode"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#2C2A26] text-[#FCFAF5] font-serif font-bold text-lg px-5 py-3 border-2 border-[#2C2A26] hover:bg-transparent hover:text-[#2C2A26] transition-colors disabled:opacity-60"
              data-testid="login-submit"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="mt-5 font-mono text-[11px] text-center text-[#59554D] tracking-wide">
            Only authorised editors may post notices.
          </p>
        </div>
      </div>
    </div>
  );
}
