import React, { useEffect, useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import {
  BriefcaseBusiness, CheckCircle2, Bell, Plus, Search, X,
  ChevronRight, Clock, CalendarDays, Settings, Sparkles, TrendingUp, AlertCircle
} from "lucide-react";
import api from "../lib/api";
import { sortJobs, daysUntil, formatDate } from "../lib/utils-date";
import JobCard from "../components/JobCard";
import DeadlineAlert from "../components/DeadlineAlert";
import PWAInstallBanner from "../components/PWAInstallBanner";
import { toast } from "sonner";

// ─── helpers ──────────────────────────────────────────────────────────────────
const getStatus = (j, today) => {
  if (j.applied) return "applied";
  const isFuture = j.start_date && j.start_date > today;
  const blank = !j.start_date && !j.exam_date && !j.last_date;
  return isFuture || blank ? "notices" : "pending";
};

// ─── main component ──────────────────────────────────────────────────────────
export default function Landing() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(null);   // null = home, "pending" | "applied" | "notices"
  const [query, setQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef(null);
  const today = new Date().toISOString().split("T")[0];

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const data = await api.listJobs();
      setJobs(sortJobs(data));
    } catch { toast.error("Failed to load jobs"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    api.deleteExpiredUnappliedJobs();
    fetchJobs();
  }, []);

  // Notify on newly-opened jobs
  useEffect(() => {
    if (!jobs.length) return;
    jobs.forEach(async (j) => {
      if (j.start_date && j.start_date <= today && !j.notified && !j.applied) {
        toast.success(`🚀 "${j.job_name}" is now OPEN!`, { duration: 7000 });
        try { await api.markNotified(j.id); } catch {}
      }
    });
  }, [jobs]);

  const handleToggle = async (job) => {
    try {
      const updated = await api.toggleApplied(job.id);
      setJobs(prev => sortJobs(prev.map(j => j.id === job.id ? updated : j)));
      toast.success(updated.applied ? "✅ Marked Applied!" : "🔄 Moved to Pending");
    } catch { toast.error("Failed to update"); }
  };

  // Counts
  const counts = useMemo(() => ({
    pending: jobs.filter(j => getStatus(j, today) === "pending").length,
    applied: jobs.filter(j => getStatus(j, today) === "applied").length,
    notices: jobs.filter(j => getStatus(j, today) === "notices").length,
  }), [jobs, today]);

  // Filtered + sorted list
  const filteredJobs = useMemo(() => {
    if (!activeTab) return [];
    let list = jobs.filter(j => {
      const s = getStatus(j, today) === activeTab;
      const q = !query || j.job_name?.toLowerCase().includes(query.toLowerCase()) ||
        (j.tags && j.tags.toLowerCase().includes(query.toLowerCase()));
      return s && q;
    });
    if (activeTab === "applied") {
      list = [...list].sort((a, b) => {
        if (!a.exam_date) return 1;
        if (!b.exam_date) return -1;
        return new Date(a.exam_date) - new Date(b.exam_date);
      });
    }
    return list;
  }, [jobs, activeTab, query, today]);

  // Next exam
  const nextExam = useMemo(() => {
    return jobs
      .filter(j => j.applied && j.exam_date && new Date(j.exam_date) >= new Date())
      .sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date))[0] || null;
  }, [jobs]);

  // Urgent deadlines
  const urgent = useMemo(() => jobs.filter(j => {
    if (j.applied) return false;
    const d = daysUntil(j.last_date);
    return d !== null && d <= 3 && d >= 0;
  }), [jobs]);

  // Progress %
  const total = counts.pending + counts.applied + counts.notices;
  const progress = total > 0 ? Math.round((counts.applied / total) * 100) : 0;

  const handleTabClick = (key) => {
    if (activeTab === key) { setActiveTab(null); setQuery(""); }
    else { setActiveTab(key); setQuery(""); setShowSearch(false); }
  };

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", overflowX: "hidden" }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="anim-fade-in" style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(15,15,26,0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border)",
        paddingTop: "calc(16px + var(--safe-top))",
        paddingBottom: "16px", paddingLeft: "20px", paddingRight: "20px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--ink-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Job Ledger
            </div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 900, color: "var(--ink)", letterSpacing: "-0.03em", lineHeight: 1.1, margin: 0 }}>
              My Applications
            </h1>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <Link to="/admin/login" style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: "48px", height: "48px", borderRadius: "50%",
              background: "linear-gradient(135deg, var(--accent), #9C63FF)",
              color: "white", textDecoration: "none",
              boxShadow: "0 4px 16px rgba(108,99,255,0.4)",
              transition: "transform 0.2s ease",
            }}
            data-testid="admin-login-link"
            onTouchStart={e => e.currentTarget.style.transform = "scale(0.9)"}
            onTouchEnd={e => e.currentTarget.style.transform = "scale(1)"}
            >
              <Plus size={22} />
            </Link>
          </div>
        </div>
      </header>

      <main style={{ padding: "0 0 120px 0" }}>

        {/* ── Deadline alert ──────────────────────────────────────────────── */}
        <DeadlineAlert jobs={jobs} />

        {/* ── Hero stats section ──────────────────────────────────────────── */}
        {!activeTab && (
          <div className="anim-fade-up" style={{ padding: "24px 20px 0" }}>

            {/* Next exam banner */}
            {nextExam && <NextExamBanner job={nextExam} />}

            {/* Progress overview */}
            {total > 0 && (
              <div className="anim-fade-up delay-1" style={{
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)", padding: "20px", marginBottom: "20px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div>
                    <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Progress</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--ink)", marginTop: "2px" }}>
                      {counts.applied} of {total} applied
                    </div>
                  </div>
                  <div style={{ fontSize: "2rem", fontWeight: 900, background: "linear-gradient(135deg,var(--accent),var(--accent-3))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    {progress}%
                  </div>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {/* Live clock */}
            <LiveClock />

            {/* Urgent banner */}
            {urgent.length > 0 && (
              <div className="anim-fade-up delay-2" style={{
                background: "rgba(255,101,132,0.12)", border: "1px solid rgba(255,101,132,0.3)",
                borderRadius: "var(--radius-md)", padding: "16px 18px", marginBottom: "20px",
                display: "flex", alignItems: "center", gap: "12px"
              }}>
                <div className="pulse-dot" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--accent-2)" }}>
                    {urgent.length} deadline{urgent.length > 1 ? "s" : ""} within 3 days!
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: "rgba(255,101,132,0.7)", marginTop: "2px" }}>
                    Tap Pending to review
                  </div>
                </div>
                <AlertCircle size={20} color="var(--accent-2)" style={{ marginLeft: "auto", flexShrink: 0 }} />
              </div>
            )}
          </div>
        )}

        {/* ── Status cards ────────────────────────────────────────────────── */}
        <div className={activeTab ? "" : "anim-fade-up delay-3"} style={{ padding: activeTab ? "16px 20px 0" : "0 20px 0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
            {[
              {
                key: "pending", label: "Pending", icon: <Clock size={20} />,
                color: "var(--accent-4)", bg: "rgba(247,151,30,0.12)", border: "rgba(247,151,30,0.3)",
              },
              {
                key: "applied", label: "Applied", icon: <CheckCircle2 size={20} />,
                color: "var(--accent-3)", bg: "rgba(67,233,123,0.12)", border: "rgba(67,233,123,0.3)",
              },
              {
                key: "notices", label: "Notices", icon: <Bell size={20} />,
                color: "var(--accent-5)", bg: "rgba(79,195,247,0.12)", border: "rgba(79,195,247,0.3)",
              },
            ].map(({ key, label, icon, color, bg, border }) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleTabClick(key)}
                  data-testid={`filter-card-${key}`}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "flex-start",
                    padding: "18px 14px 16px",
                    background: isActive ? bg : "var(--bg-card)",
                    border: `1.5px solid ${isActive ? border : "var(--border)"}`,
                    borderRadius: "var(--radius-lg)",
                    cursor: "pointer", textAlign: "left",
                    transition: "transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s ease, background 0.2s ease",
                    transform: isActive ? "translateY(-2px)" : "none",
                    boxShadow: isActive ? `0 8px 24px ${border}` : "none",
                    WebkitTapHighlightColor: "transparent",
                  }}
                  onTouchStart={e => { e.currentTarget.style.transform = "scale(0.95)"; }}
                  onTouchEnd={e => { e.currentTarget.style.transform = isActive ? "translateY(-2px)" : ""; }}
                >
                  <div style={{ color, marginBottom: "10px" }}>{icon}</div>
                  <div style={{ fontSize: "2rem", fontWeight: 900, color: "var(--ink)", lineHeight: 1, marginBottom: "4px" }} className={isActive ? "anim-count-up" : ""}>
                    {loading ? "—" : counts[key]}
                  </div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: isActive ? color : "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Expanded job list ────────────────────────────────────────────── */}
        {activeTab && (
          <div className="anim-slide-down" style={{ padding: "20px 20px 0" }}>

            {/* Section header + search */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--ink)" }}>
                  {activeTab === "pending" && "📋 Pending"}
                  {activeTab === "applied" && "✅ Applied"}
                  {activeTab === "notices" && "🔵 Notices"}
                </div>
                {activeTab === "applied" && (
                  <div style={{ fontSize: "0.8rem", color: "var(--ink-muted)", marginTop: "2px" }}>
                    Sorted by exam date
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => { setShowSearch(s => !s); if (showSearch) setQuery(""); }}
                style={{
                  width: "44px", height: "44px", borderRadius: "50%",
                  background: showSearch ? "var(--accent)" : "rgba(255,255,255,0.08)",
                  border: "1px solid var(--border)", color: "var(--ink)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", transition: "all 0.2s ease",
                }}
              >
                {showSearch ? <X size={18} /> : <Search size={18} />}
              </button>
              <div style={{
                background: "rgba(255,255,255,0.08)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-full)", padding: "6px 14px",
                fontSize: "0.8125rem", fontWeight: 700, color: "var(--ink-soft)"
              }}>
                {filteredJobs.length}
              </div>
            </div>

            {/* Search box */}
            {showSearch && (
              <div className="anim-slide-down" style={{ marginBottom: "16px", position: "relative" }}>
                <Search size={18} style={{ position: "absolute", left: "18px", top: "50%", transform: "translateY(-50%)", color: "var(--ink-muted)", pointerEvents: "none" }} />
                <input
                  ref={searchRef}
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search jobs..."
                  data-testid="search-input"
                  className="input-field"
                  style={{ paddingLeft: "50px" }}
                />
                {query && (
                  <button onClick={() => setQuery("")} style={{ position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--ink-muted)", cursor: "pointer", padding: "4px" }}>
                    <X size={16} />
                  </button>
                )}
              </div>
            )}

            {/* Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {loading ? (
                <SkeletonCards />
              ) : filteredJobs.length === 0 ? (
                <EmptyState query={query} tab={activeTab} />
              ) : (
                filteredJobs.map((job, i) => (
                  <div key={job.id} className="anim-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
                    <JobCard job={job} onToggle={handleToggle} />
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tap-to-begin prompt */}
        {!activeTab && !loading && (
          <div className="anim-fade-up delay-5" style={{ textAlign: "center", padding: "40px 20px" }}>
            <div className="anim-float" style={{ fontSize: "2.5rem", marginBottom: "12px" }}>👆</div>
            <div style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--ink-muted)" }}>
              Tap a card above to view your jobs
            </div>
          </div>
        )}
      </main>

      <PWAInstallBanner />
    </div>
  );
}

// ─── Next exam banner ─────────────────────────────────────────────────────────
function NextExamBanner({ job }) {
  const days = Math.ceil((new Date(job.exam_date) - new Date()) / 86400000);
  const urgent = days <= 7;
  return (
    <div className="anim-scale-in" style={{
      background: urgent ? "rgba(255,101,132,0.14)" : "rgba(108,99,255,0.14)",
      border: `1px solid ${urgent ? "rgba(255,101,132,0.35)" : "rgba(108,99,255,0.35)"}`,
      borderRadius: "var(--radius-md)", padding: "16px 18px", marginBottom: "20px",
      display: "flex", alignItems: "center", gap: "14px"
    }}>
      <div style={{ fontSize: "1.75rem" }}>{urgent ? "🚨" : "📝"}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "0.8rem", fontWeight: 700, color: urgent ? "var(--accent-2)" : "var(--accent)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Next Exam
        </div>
        <div style={{ fontSize: "1.0625rem", fontWeight: 800, color: "var(--ink)", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {job.job_name}
        </div>
        <div style={{ fontSize: "0.875rem", fontWeight: 600, color: urgent ? "rgba(255,101,132,0.8)" : "rgba(108,99,255,0.8)", marginTop: "2px" }}>
          {days === 0 ? "TODAY!" : days === 1 ? "Tomorrow!" : `In ${days} days`} · {new Date(job.exam_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
        </div>
      </div>
      <ChevronRight size={20} color="var(--ink-muted)" />
    </div>
  );
}

// ─── Live clock ───────────────────────────────────────────────────────────────
function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: "var(--radius-md)", padding: "14px 18px",
      display: "flex", justifyContent: "space-between", alignItems: "center",
      marginBottom: "20px"
    }}>
      <div>
        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>
      <div style={{ fontSize: "1.5rem", fontWeight: 900, fontVariantNumeric: "tabular-nums", color: "var(--ink)", fontFamily: "Inter, monospace" }}>
        {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCards() {
  return (
    <>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ background: "var(--bg-card)", borderRadius: "var(--radius-lg)", padding: "24px", border: "1px solid var(--border)" }}>
          <div className="skeleton" style={{ height: "20px", width: "70%", marginBottom: "12px" }} />
          <div className="skeleton" style={{ height: "14px", width: "45%", marginBottom: "8px" }} />
          <div className="skeleton" style={{ height: "14px", width: "30%" }} />
        </div>
      ))}
    </>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ query, tab }) {
  return (
    <div className="anim-scale-in" style={{ textAlign: "center", padding: "48px 20px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }} data-testid="empty-state">
      <div style={{ fontSize: "3rem", marginBottom: "12px" }}>
        {query ? "🔍" : tab === "applied" ? "📭" : tab === "pending" ? "🎉" : "📬"}
      </div>
      <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--ink)", marginBottom: "6px" }}>
        {query ? "No results found" : `No ${tab} jobs`}
      </div>
      <div style={{ fontSize: "0.9375rem", color: "var(--ink-muted)" }}>
        {query ? "Try a different keyword" : tab === "applied" ? "Mark jobs as applied to see them here" : "Add jobs from the admin panel"}
      </div>
    </div>
  );
}
