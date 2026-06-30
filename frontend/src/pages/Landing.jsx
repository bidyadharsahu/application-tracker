
import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Plus, Search, X, Clock, CheckCircle2, Bell, ChevronRight, AlertTriangle, Calendar } from "lucide-react";
import api from "../lib/api";
import { sortJobs, daysUntil, formatDate } from "../lib/utils-date";
import JobCard from "../components/JobCard";
import DeadlineAlert from "../components/DeadlineAlert";
import { toast } from "sonner";

const getStatus = (j, today) => {
  if (j.applied) return "applied";
  const future = j.start_date && j.start_date > today;
  const blank  = !j.start_date && !j.exam_date && !j.last_date;
  return future || blank ? "notices" : "pending";
};

export default function Landing({ setUrgentCount }) {
  const [jobs, setJobs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery]     = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const tab   = searchParams.get("tab");
  const today = new Date().toISOString().split("T")[0];

  const loadJobs = async () => {
    setLoading(true);
    try { setJobs(sortJobs(await api.listJobs())); }
    catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  };

  useEffect(() => { api.deleteExpiredUnappliedJobs(); loadJobs(); }, []);

  useEffect(() => {
    jobs.forEach(async j => {
      if (j.start_date && j.start_date <= today && !j.notified && !j.applied) {
        toast.success(`${j.job_name} is now open!`);
        try { await api.markNotified(j.id); } catch {}
      }
    });
    const urg = jobs.filter(j => { if (j.applied) return false; const d = daysUntil(j.last_date); return d !== null && d <= 3 && d >= 0; }).length;
    setUrgentCount && setUrgentCount(urg);
  }, [jobs]);

  const handleToggle = async (job) => {
    try {
      const u = await api.toggleApplied(job.id);
      setJobs(prev => sortJobs(prev.map(j => j.id === job.id ? u : j)));
    } catch { toast.error("Update failed"); }
  };

  const counts = useMemo(() => ({
    pending: jobs.filter(j => getStatus(j, today) === "pending").length,
    applied: jobs.filter(j => getStatus(j, today) === "applied").length,
    notices: jobs.filter(j => getStatus(j, today) === "notices").length,
  }), [jobs, today]);

  const list = useMemo(() => {
    if (!tab) return [];
    let l = jobs.filter(j => {
      const s = getStatus(j, today) === tab;
      const q = !query || j.job_name?.toLowerCase().includes(query.toLowerCase()) || j.tags?.toLowerCase().includes(query.toLowerCase());
      return s && q;
    });
    if (tab === "applied") l = [...l].sort((a, b) => !a.exam_date ? 1 : !b.exam_date ? -1 : new Date(a.exam_date) - new Date(b.exam_date));
    return l;
  }, [jobs, tab, query, today]);

  const nextExam = useMemo(() =>
    jobs.filter(j => j.applied && j.exam_date && new Date(j.exam_date) >= new Date())
        .sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date))[0] || null, [jobs]);

  const urgent = useMemo(() => jobs.filter(j => { if (j.applied) return false; const d = daysUntil(j.last_date); return d !== null && d <= 3 && d >= 0; }), [jobs]);

  // Most recently applied job — useful quick reference, no math/percentages needed
  const recentlyApplied = useMemo(() =>
    jobs.filter(j => j.applied && j.applied_at)
        .sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at))[0] || null, [jobs]);

  const hour  = new Date().getHours();
  const greet = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  const goTab = k => { setQuery(""); setShowSearch(false); setSearchParams(k ? { tab: k } : {}); };

  /* ════════ HOME ════════ */
  if (!tab) return (
    <div className="app-screen">
      <div className="app-scroll">
        <div className="nav-large-title">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div className="eyebrow">{greet}</div>
              <h1>My Applications</h1>
            </div>
            <Link to="/admin/login" data-testid="admin-login-link" className="btn btn-tinted btn-sm" style={{ textDecoration: "none", marginTop: 10 }}>
              <Plus size={16} strokeWidth={2.5} /> Add
            </Link>
          </div>
          <LiveClock />
        </div>

        <div style={{ padding: "10px 16px 0" }}>

          <DeadlineAlert jobs={jobs} />

          {urgent.length > 0 && (
            <button type="button" onClick={() => goTab("pending")} className="ios-card ios-card-press a-up"
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", marginBottom: 12, textAlign: "left" }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: "var(--tint-red-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, animation: "pulseRing 1.6s ease infinite" }}>
                <AlertTriangle size={18} color="var(--ios-red)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--label-1)" }}>{urgent.length} deadline{urgent.length > 1 ? "s" : ""} closing soon</div>
                <div style={{ fontSize: 13, color: "var(--label-3)", marginTop: 1 }}>Tap to review pending jobs</div>
              </div>
              <ChevronRight size={17} color="var(--label-4)" />
            </button>
          )}

          {nextExam && (
            <button type="button" onClick={() => goTab("applied")} className="ios-card ios-card-press a-up d1"
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", marginBottom: 12, textAlign: "left" }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: "var(--tint-blue-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Calendar size={18} color="var(--ios-blue)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ios-blue)", textTransform: "uppercase", letterSpacing: ".04em" }}>Next Exam</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--label-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nextExam.job_name}</div>
                <div style={{ fontSize: 13, color: "var(--label-3)", marginTop: 1 }}>
                  {(() => { const d = Math.ceil((new Date(nextExam.exam_date) - new Date()) / 86400000); return d === 0 ? "Today" : d === 1 ? "Tomorrow" : `In ${d} days`; })()}
                  {" · "}{formatDate(nextExam.exam_date)}
                </div>
              </div>
              <ChevronRight size={17} color="var(--label-4)" />
            </button>
          )}

          {/* Quick reference to the last thing you applied to — replaces the old progress bar */}
          {recentlyApplied && (
            <button type="button" onClick={() => goTab("applied")} className="ios-card ios-card-press a-up d2"
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", marginBottom: 16, textAlign: "left" }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: "var(--tint-green-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <CheckCircle2 size={18} color="var(--ios-green)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ios-green)", textTransform: "uppercase", letterSpacing: ".04em" }}>Last Applied</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--label-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{recentlyApplied.job_name}</div>
              </div>
              <ChevronRight size={17} color="var(--label-4)" />
            </button>
          )}

          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--label-3)", textTransform: "uppercase", letterSpacing: ".03em", marginBottom: 8, paddingLeft: 4 }}>
            Categories
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 8 }}>
            {[
              { k: "pending", label: "Pending", icon: <Clock size={24} strokeWidth={1.8} />, bg: "var(--tint-orange-bg)", fg: "#B25900" },
              { k: "applied", label: "Applied", icon: <CheckCircle2 size={24} strokeWidth={1.8} />, bg: "var(--tint-green-bg)", fg: "#1A8A3D" },
              { k: "notices", label: "Notices", icon: <Bell size={24} strokeWidth={1.8} />, bg: "var(--tint-purple-bg)", fg: "#8A38B5" },
            ].map(({ k, label, icon, bg, fg }, i) => (
              <button key={k} type="button" data-testid={"filter-card-" + k} onClick={() => goTab(k)} className={"stat-tile a-up d" + (i + 3)}>
                <div style={{ width: 46, height: 46, borderRadius: 14, background: bg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", color: fg }}>
                  {icon}
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: "var(--label-1)", lineHeight: 1, marginBottom: 3 }}>{loading ? "—" : counts[k]}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--label-2)" }}>{label}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  /* ════════ TAB SCREENS ════════ */
  const cfg = {
    pending: { label: "Pending Jobs", sub: null },
    applied: { label: "Applied Jobs", sub: "Sorted by exam date" },
    notices: { label: "Notices",      sub: null },
  }[tab] || { label: "Jobs" };

  return (
    <div className="app-screen">
      <div className="nav-inline-title">
        <div style={{ flex: 1 }}>
          <h2>{cfg.label}</h2>
          {cfg.sub && <div style={{ fontSize: 12, color: "var(--label-3)", marginTop: 1 }}>{cfg.sub}</div>}
        </div>
        <button type="button" onClick={() => { setShowSearch(s => !s); if (showSearch) setQuery(""); }} className="btn btn-gray btn-icon">
          {showSearch ? <X size={18} /> : <Search size={18} />}
        </button>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--label-2)", background: "var(--fill-3)", padding: "5px 11px", borderRadius: 99 }}>
          {list.length}
        </div>
      </div>

      {showSearch && (
        <div className="a-in" style={{ padding: "10px 16px 0", position: "relative", flexShrink: 0 }}>
          <Search size={16} style={{ position: "absolute", left: 30, top: 23, color: "var(--label-4)", pointerEvents: "none" }} />
          <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
            placeholder={`Search ${cfg.label.toLowerCase()}…`} data-testid="search-input"
            className="ios-input" style={{ paddingLeft: 40 }} />
          {query && <button onClick={() => setQuery("")} style={{ position: "absolute", right: 30, top: 23, background: "none", border: "none", color: "var(--label-3)", cursor: "pointer" }}><X size={16} /></button>}
        </div>
      )}

      <div className="app-scroll" style={{ padding: "12px 16px" }}>
        {loading ? <SkeletonCards /> :
          list.length === 0 ? <EmptyState query={query} tab={tab} /> :
          list.map((job, i) => (
            <div key={job.id} className="a-up" style={{ animationDelay: i * .04 + "s", marginBottom: 12 }}>
              <JobCard job={job} onToggle={handleToggle} />
            </div>
          ))
        }
      </div>
    </div>
  );
}

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return (
    <div style={{ fontSize: 14, color: "var(--label-3)", marginTop: 6, fontWeight: 500 }}>
      {now.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
      {" · "}<span style={{ fontVariantNumeric: "tabular-nums" }}>{now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
    </div>
  );
}

function SkeletonCards() {
  return <>{[1, 2, 3].map(i => (
    <div key={i} className="ios-card" style={{ padding: 18, marginBottom: 12 }}>
      <div className="ios-skel" style={{ height: 17, width: "65%", marginBottom: 12 }} />
      <div className="ios-skel" style={{ height: 13, width: "42%", marginBottom: 8 }} />
      <div className="ios-skel" style={{ height: 13, width: "30%" }} />
    </div>
  ))}</>;
}

function EmptyState({ query, tab }) {
  return (
    <div data-testid="empty-state" className="ios-card a-pop" style={{ padding: "48px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 42, marginBottom: 12 }}>{query ? "🔍" : tab === "applied" ? "📭" : tab === "pending" ? "🎉" : "📬"}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: "var(--label-1)", marginBottom: 6 }}>{query ? "No results" : `No ${tab} jobs`}</div>
      <div style={{ fontSize: 14, color: "var(--label-3)" }}>{query ? "Try different keywords" : tab === "applied" ? "Mark jobs applied to see them here" : "Add jobs from the Admin tab"}</div>
    </div>
  );
}
