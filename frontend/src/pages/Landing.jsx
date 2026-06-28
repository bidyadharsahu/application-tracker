import React, { useEffect, useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { Search, X, ChevronRight, Feather } from "lucide-react";
import api from "../lib/api";
import { sortJobs, daysUntil, formatDate } from "../lib/utils-date";
import JobCard from "../components/JobCard";
import DeadlineAlert from "../components/DeadlineAlert";
import PWAInstallBanner from "../components/PWAInstallBanner";
import { toast } from "sonner";

const getStatus = (j, today) => {
  if (j.applied) return "applied";
  const isFuture = j.start_date && j.start_date > today;
  const blank = !j.start_date && !j.exam_date && !j.last_date;
  return isFuture || blank ? "notices" : "pending";
};

export default function Landing() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(null);
  const [query, setQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const today = new Date().toISOString().split("T")[0];

  const fetchJobs = async () => {
    setLoading(true);
    try { setJobs(sortJobs(await api.listJobs())); }
    catch { toast.error("Could not load the ledger"); }
    finally { setLoading(false); }
  };

  useEffect(() => { api.deleteExpiredUnappliedJobs(); fetchJobs(); }, []);

  useEffect(() => {
    if (!jobs.length) return;
    jobs.forEach(async (j) => {
      if (j.start_date && j.start_date <= today && !j.notified && !j.applied) {
        toast.success(`"${j.job_name}" applications are now open`);
        try { await api.markNotified(j.id); } catch {}
      }
    });
  }, [jobs]);

  const handleToggle = async (job) => {
    try {
      const updated = await api.toggleApplied(job.id);
      setJobs(prev => sortJobs(prev.map(j => j.id === job.id ? updated : j)));
      toast.success(updated.applied ? "Marked as Applied" : "Moved back to Pending");
    } catch { toast.error("Could not update"); }
  };

  const counts = useMemo(() => ({
    pending: jobs.filter(j => getStatus(j, today) === "pending").length,
    applied: jobs.filter(j => getStatus(j, today) === "applied").length,
    notices: jobs.filter(j => getStatus(j, today) === "notices").length,
  }), [jobs, today]);

  const filteredJobs = useMemo(() => {
    if (!activeTab) return [];
    let list = jobs.filter(j => {
      const match = getStatus(j, today) === activeTab;
      const q = !query || j.job_name?.toLowerCase().includes(query.toLowerCase()) ||
        (j.tags && j.tags.toLowerCase().includes(query.toLowerCase()));
      return match && q;
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

  const nextExam = useMemo(() =>
    jobs.filter(j => j.applied && j.exam_date && new Date(j.exam_date) >= new Date())
      .sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date))[0] || null
  , [jobs]);

  const urgent = useMemo(() => jobs.filter(j => {
    if (j.applied) return false;
    const d = daysUntil(j.last_date);
    return d !== null && d <= 3 && d >= 0;
  }), [jobs]);

  const total = counts.pending + counts.applied + counts.notices;
  const progress = total > 0 ? Math.round((counts.applied / total) * 100) : 0;

  const handleTabClick = (key) => {
    if (activeTab === key) { setActiveTab(null); setQuery(""); }
    else { setActiveTab(key); setQuery(""); setShowSearch(false); }
  };

  return (
    <div style={{ minHeight: "100dvh", position: "relative" }}>

      {/* SVG watercolour washes — rendered as inline SVG for max quality */}
      <WatercolourBackground />

      {/* SVG ink filter for wobbly borders */}
      <svg style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
        <defs>
          <filter id="ink-wobble" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04 0.08" numOctaves="2" seed="3" result="noise"/>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.2" xChannelSelector="R" yChannelSelector="G"/>
          </filter>
        </defs>
      </svg>

      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className="anim-fade-wash" style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(245,237,214,0.92)",
        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(107,79,53,0.18)",
        paddingTop: "calc(18px + var(--safe-top))",
        paddingBottom: "16px",
        boxShadow: "0 2px 20px rgba(42,31,14,0.08)",
      }}>
        <div style={{ padding: "0 22px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            {/* Decorative flourish above title */}
            <div style={{ fontFamily: "var(--font-display)", fontSize: "0.75rem", color: "var(--ink-faint)", letterSpacing: "0.18em", marginBottom: "2px", fontStyle: "italic" }}>
              ✦ Ledger of Opportunities ✦
            </div>
            <h1 className="type-display" style={{ margin: 0, fontSize: "clamp(1.75rem, 7vw, 2.5rem)" }}>
              The Job Ledger
            </h1>
            <LiveClock />
          </div>

          {/* Feather-quill add button */}
          <Link
            to="/admin/login"
            data-testid="admin-login-link"
            style={{
              display: "flex", alignItems: "center", gap: "7px",
              marginTop: "8px",
              fontFamily: "var(--font-body)",
              fontSize: "0.9375rem",
              fontWeight: 600,
              color: "var(--ink-mid)",
              textDecoration: "none",
              background: "linear-gradient(145deg, rgba(253,248,238,0.95), rgba(237,224,190,0.90))",
              border: "1.5px solid rgba(107,79,53,0.28)",
              borderRadius: "3px",
              padding: "10px 16px",
              boxShadow: "2px 2px 0 rgba(42,31,14,0.14), inset 0 1px 0 rgba(255,255,255,0.6)",
              transition: "transform 0.15s ease",
            }}
            onTouchStart={e => e.currentTarget.style.transform = "scale(0.94) translateY(1px)"}
            onTouchEnd={e => e.currentTarget.style.transform = ""}
          >
            <Feather size={16} strokeWidth={1.5} /> Add Entry
          </Link>
        </div>
      </header>

      <main style={{ padding: "0 0 100px", position: "relative", zIndex: 1 }}>
        <div style={{ padding: "0 22px" }}>

          {/* Deadline alert */}
          <DeadlineAlert jobs={jobs} />

          {/* ── Next exam ribbon ──────────────────────────────────── */}
          {nextExam && !activeTab && <NextExamRibbon job={nextExam} />}

          {/* ── Urgent whisper ────────────────────────────────────── */}
          {urgent.length > 0 && !activeTab && (
            <div className="anim-rise-up delay-1" style={{
              display: "flex", alignItems: "center", gap: "14px",
              background: "rgba(139,46,46,0.07)",
              border: "1px solid rgba(139,46,46,0.20)",
              borderRadius: "3px",
              padding: "14px 18px",
              marginBottom: "20px",
            }}>
              <div style={{
                width: "9px", height: "9px", borderRadius: "50%",
                background: "var(--pigment-red)", flexShrink: 0,
                boxShadow: "0 0 0 4px rgba(139,46,46,0.15)",
                animation: "pulse-sepia 1.8s ease-in-out infinite",
              }} />
              <div>
                <div style={{ fontFamily: "var(--font-accent)", fontSize: "1rem", fontWeight: 600, color: "var(--pigment-red)" }}>
                  {urgent.length} deadline{urgent.length > 1 ? "s" : ""} within 3 days
                </div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem", color: "rgba(139,46,46,0.65)", fontStyle: "italic" }}>
                  Tap <em>Pending</em> below to review
                </div>
              </div>
            </div>
          )}

          {/* ── Progress ──────────────────────────────────────────── */}
          {total > 0 && !activeTab && (
            <div className="anim-rise-up delay-2 card-parchment" style={{ padding: "18px 20px", marginBottom: "22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
                <div style={{ fontFamily: "var(--font-body)", fontSize: "0.8125rem", color: "var(--ink-soft)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Applications Progress
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontStyle: "italic", color: "var(--ink-dark)" }}>
                  {progress}%
                </div>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem", color: "var(--ink-faint)", marginTop: "8px", fontStyle: "italic" }}>
                {counts.applied} applied · {counts.pending} pending · {counts.notices} upcoming
              </div>
            </div>
          )}

          {/* ── Three stat cards ──────────────────────────────────── */}
          <div className={activeTab ? "" : "anim-rise-up delay-3"}
            style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "24px" }}>

            {[
              { key: "pending",  label: "Pending",  color: "var(--pigment-amber)", wash: "rgba(212,175,114,0.18)", washBorder: "rgba(139,94,10,0.28)" },
              { key: "applied",  label: "Applied",  color: "var(--pigment-green)", wash: "rgba(155,184,154,0.20)", washBorder: "rgba(45,90,61,0.28)" },
              { key: "notices",  label: "Notices",  color: "var(--pigment-blue)",  wash: "rgba(197,216,232,0.22)", washBorder: "rgba(43,74,107,0.24)" },
            ].map(({ key, label, color, wash, washBorder }) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleTabClick(key)}
                  data-testid={`filter-card-${key}`}
                  className={`stat-card ${isActive ? "active-card" : ""}`}
                  style={isActive ? {
                    background: `linear-gradient(145deg, ${wash} 0%, rgba(243,234,208,0.96) 100%)`,
                    borderColor: washBorder,
                  } : {}}
                >
                  {/* Watercolour wash dot */}
                  <div style={{
                    width: "8px", height: "8px", borderRadius: "50%",
                    background: color, margin: "0 auto 10px",
                    boxShadow: `0 0 8px ${color}55`,
                    opacity: isActive ? 1 : 0.6,
                  }} />
                  <div className="stat-number" style={{ color: isActive ? color : "var(--ink-dark)" }}>
                    {loading ? "—" : counts[key]}
                  </div>
                  <div className="stat-label" style={{ color: isActive ? color : "var(--ink-soft)" }}>
                    {label}
                  </div>
                  {isActive && (
                    <div style={{ marginTop: "8px", fontFamily: "var(--font-display)", fontSize: "0.875rem", color: color, fontStyle: "italic" }}>
                      ↓ viewing
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Expanded job list ──────────────────────────────────── */}
          {activeTab && (
            <div className="anim-expand-down">

              {/* Section header */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <div style={{ flex: 1 }}>
                  <div className="ornament-line">
                    <span style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontStyle: "italic", color: "var(--ink-dark)", whiteSpace: "nowrap" }}>
                      {activeTab === "pending" ? "Pending Applications" : activeTab === "applied" ? "Applied — by Exam Date" : "Upcoming Notices"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowSearch(s => !s); if (showSearch) setQuery(""); }}
                  style={{
                    width: "42px", height: "42px", borderRadius: "3px",
                    background: showSearch
                      ? "linear-gradient(160deg, var(--ink-dark), var(--ink-mid))"
                      : "linear-gradient(145deg, rgba(253,248,238,0.95), rgba(237,224,190,0.90))",
                    border: "1.5px solid rgba(107,79,53,0.28)",
                    color: showSearch ? "var(--parch-0)" : "var(--ink-mid)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", flexShrink: 0,
                    boxShadow: "1px 2px 0 rgba(42,31,14,0.12)",
                  }}
                >
                  {showSearch ? <X size={16} strokeWidth={1.75} /> : <Search size={16} strokeWidth={1.5} />}
                </button>

                <div style={{
                  fontFamily: "var(--font-display)", fontStyle: "italic",
                  fontSize: "1.125rem", color: "var(--ink-soft)", minWidth: "28px", textAlign: "center"
                }}>
                  {filteredJobs.length}
                </div>
              </div>

              {/* Search */}
              {showSearch && (
                <div className="anim-expand-down" style={{ marginBottom: "16px", position: "relative" }}>
                  <Search size={17} style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "var(--ink-ghost)", pointerEvents: "none" }} />
                  <input
                    autoFocus value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search the ledger…"
                    data-testid="search-input"
                    className="input-field"
                    style={{ paddingLeft: "46px", fontStyle: "italic" }}
                  />
                  {query && (
                    <button onClick={() => setQuery("")} style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--ink-soft)", cursor: "pointer" }}>
                      <X size={15} />
                    </button>
                  )}
                </div>
              )}

              {/* Cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {loading ? <SkeletonCards /> :
                  filteredJobs.length === 0 ? <EmptyState query={query} tab={activeTab} /> :
                  filteredJobs.map((job, i) => (
                    <div key={job.id} className="anim-ink-drop" style={{ animationDelay: `${i * 0.06}s` }}>
                      <JobCard job={job} onToggle={handleToggle} />
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {/* Invitation to tap */}
          {!activeTab && !loading && (
            <div className="anim-rise-up delay-5" style={{ textAlign: "center", padding: "32px 20px 0" }}>
              <div className="anim-float" style={{ fontFamily: "var(--font-display)", fontSize: "2.5rem", color: "var(--ink-faint)", marginBottom: "10px" }}>
                ✦
              </div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: "1rem", fontStyle: "italic", color: "var(--ink-faint)" }}>
                Tap a card above to open the ledger
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer ornament */}
      <footer style={{ textAlign: "center", padding: "20px", position: "relative", zIndex: 1 }}>
        <div className="ornament-line">
          <span style={{ fontFamily: "var(--font-display)", fontSize: "0.875rem", fontStyle: "italic", color: "var(--ink-faint)" }}>
            Never miss an examination
          </span>
        </div>
      </footer>

      <PWAInstallBanner />
    </div>
  );
}

/* ── Watercolour SVG background ─────────────────────────────────────────── */
function WatercolourBackground() {
  return (
    <svg
      style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" }}
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 390 844"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="wc-blur-1"><feGaussianBlur stdDeviation="28"/></filter>
        <filter id="wc-blur-2"><feGaussianBlur stdDeviation="40"/></filter>
        <filter id="wc-blur-3"><feGaussianBlur stdDeviation="20"/></filter>
        <filter id="wc-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
          <feColorMatrix type="saturate" values="0"/>
          <feBlend in="SourceGraphic" mode="multiply" result="blend"/>
          <feComposite in="blend" in2="SourceGraphic" operator="in"/>
        </filter>
      </defs>

      {/* Sky — cerulean wash bleeding from top */}
      <ellipse cx="195" cy="-30" rx="320" ry="200" fill="rgba(184,204,224,0.42)" filter="url(#wc-blur-1)"/>
      {/* Secondary sky wash */}
      <ellipse cx="280" cy="80" rx="180" ry="120" fill="rgba(197,216,232,0.28)" filter="url(#wc-blur-2)"/>

      {/* Distant hills — viridian */}
      <ellipse cx="80" cy="320" rx="220" ry="160" fill="rgba(155,184,154,0.30)" filter="url(#wc-blur-2)"/>
      <ellipse cx="340" cy="280" rx="160" ry="120" fill="rgba(135,167,135,0.22)" filter="url(#wc-blur-1)"/>

      {/* Warm sunlight — yellow ochre pool */}
      <ellipse cx="310" cy="200" rx="180" ry="130" fill="rgba(212,175,114,0.25)" filter="url(#wc-blur-2)"/>

      {/* Misty ground — raw sienna */}
      <ellipse cx="195" cy="750" rx="300" ry="160" fill="rgba(193,165,128,0.22)" filter="url(#wc-blur-1)"/>

      {/* Rose madder accent — right edge glow */}
      <ellipse cx="420" cy="500" rx="140" ry="200" fill="rgba(212,165,160,0.18)" filter="url(#wc-blur-2)"/>

      {/* Ink water ripple lines — bottom */}
      <ellipse cx="195" cy="844" rx="250" ry="80" fill="rgba(184,204,224,0.18)" filter="url(#wc-blur-3)"/>

      {/* Paper grain overlay */}
      <rect width="390" height="844" fill="rgba(245,237,214,0.08)" filter="url(#wc-noise)" opacity="0.6"/>
    </svg>
  );
}

/* ── Next exam ribbon ────────────────────────────────────────────────────── */
function NextExamRibbon({ job }) {
  const days = Math.ceil((new Date(job.exam_date) - new Date()) / 86400000);
  const urgent = days <= 7;
  return (
    <div className="anim-rise-up" style={{
      background: urgent
        ? "linear-gradient(135deg, rgba(139,46,46,0.08) 0%, rgba(212,165,160,0.15) 100%)"
        : "linear-gradient(135deg, rgba(43,74,107,0.07) 0%, rgba(197,216,232,0.18) 100%)",
      border: `1px solid ${urgent ? "rgba(139,46,46,0.22)" : "rgba(43,74,107,0.18)"}`,
      borderRadius: "4px",
      padding: "16px 18px",
      marginBottom: "20px",
      display: "flex", alignItems: "center", gap: "16px",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-body)", fontSize: "0.8rem", letterSpacing: "0.10em", textTransform: "uppercase", color: urgent ? "var(--pigment-red)" : "var(--pigment-blue)", marginBottom: "3px" }}>
          Next Examination
        </div>
        <div style={{ fontFamily: "var(--font-accent)", fontSize: "1.125rem", fontWeight: 600, color: "var(--ink-dark)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {job.job_name}
        </div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: "0.9375rem", fontStyle: "italic", color: urgent ? "var(--pigment-red)" : "var(--pigment-blue)", marginTop: "3px" }}>
          {days === 0 ? "Today — do not miss it!" : days === 1 ? "Tomorrow!" : `In ${days} days`}
          {" · "}{new Date(job.exam_date).toLocaleDateString("en-IN", { day: "2-digit", month: "long" })}
        </div>
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontStyle: "italic", color: urgent ? "var(--pigment-red)" : "var(--pigment-blue)", flexShrink: 0, opacity: 0.85 }}>
        {days}d
      </div>
    </div>
  );
}

/* ── Live clock ──────────────────────────────────────────────────────────── */
function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return (
    <div style={{ marginTop: "4px", fontFamily: "var(--font-body)", fontSize: "0.875rem", fontStyle: "italic", color: "var(--ink-soft)" }}>
      {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
      {" · "}
      <span style={{ fontVariantNumeric: "tabular-nums" }}>
        {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </span>
    </div>
  );
}

/* ── Skeleton ────────────────────────────────────────────────────────────── */
function SkeletonCards() {
  return (
    <>
      {[1,2,3].map(i => (
        <div key={i} className="card-parchment" style={{ padding: "24px" }}>
          <div className="skeleton" style={{ height: "22px", width: "65%", marginBottom: "14px" }}/>
          <div className="skeleton" style={{ height: "14px", width: "42%", marginBottom: "10px" }}/>
          <div className="skeleton" style={{ height: "14px", width: "28%" }}/>
        </div>
      ))}
    </>
  );
}

/* ── Empty state ─────────────────────────────────────────────────────────── */
function EmptyState({ query, tab }) {
  return (
    <div data-testid="empty-state" className="card-parchment anim-quill" style={{ padding: "52px 24px", textAlign: "center" }}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: "3rem", color: "var(--ink-faint)", marginBottom: "14px" }}>
        {query ? "⌕" : "✦"}
      </div>
      <div style={{ fontFamily: "var(--font-accent)", fontSize: "1.25rem", fontWeight: 600, color: "var(--ink-mid)", marginBottom: "8px" }}>
        {query ? "Nothing matches" : `No ${tab} entries`}
      </div>
      <div style={{ fontFamily: "var(--font-body)", fontSize: "1rem", fontStyle: "italic", color: "var(--ink-faint)" }}>
        {query ? "Try a different search" : tab === "applied" ? "Mark a job as applied to see it here" : "Add entries from the admin panel"}
      </div>
    </div>
  );
}
