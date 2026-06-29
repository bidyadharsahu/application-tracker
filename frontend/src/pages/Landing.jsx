
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
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
  const [jobs, setJobs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [query, setQuery]       = useState("");
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
    const urg = jobs.filter(j => {
      if (j.applied) return false;
      const d = daysUntil(j.last_date);
      return d !== null && d <= 3 && d >= 0;
    }).length;
    setUrgentCount && setUrgentCount(urg);
  }, [jobs]);

  const handleToggle = async (job) => {
    try {
      const u = await api.toggleApplied(job.id);
      setJobs(prev => sortJobs(prev.map(j => j.id === job.id ? u : j)));
      toast.success(u.applied ? "Marked as Applied!" : "Moved to Pending");
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
      const q = !query || j.job_name?.toLowerCase().includes(query.toLowerCase()) ||
                j.tags?.toLowerCase().includes(query.toLowerCase());
      return s && q;
    });
    if (tab === "applied")
      l = [...l].sort((a, b) => !a.exam_date ? 1 : !b.exam_date ? -1 : new Date(a.exam_date) - new Date(b.exam_date));
    return l;
  }, [jobs, tab, query, today]);

  const nextExam = useMemo(() =>
    jobs.filter(j => j.applied && j.exam_date && new Date(j.exam_date) >= new Date())
        .sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date))[0] || null, [jobs]);

  const urgent = useMemo(() =>
    jobs.filter(j => { if (j.applied) return false; const d = daysUntil(j.last_date); return d !== null && d <= 3 && d >= 0; }), [jobs]);

  const total = counts.pending + counts.applied + counts.notices;
  const pct   = total > 0 ? Math.round((counts.applied / total) * 100) : 0;
  const hour  = new Date().getHours();
  const greet = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  const goTab = k => { setQuery(""); setShowSearch(false); setSearchParams(k ? { tab: k } : {}); };

  /* HOME */
  if (!tab) return (
    <div className="app-screen">
      <div className="app-scroll">
        <div className="hero-header">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.6)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 4 }}>
                {greet} 👋
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", lineHeight: 1.15, letterSpacing: "-.02em" }}>
                My Applications
              </div>
              <LiveClock />
            </div>
            <Link to="/admin/login" data-testid="admin-login-link" className="btn btn-white btn-sm" style={{ textDecoration: "none", marginTop: 4 }}>
              <Plus size={16} strokeWidth={2.5} /> Add
            </Link>
          </div>

          {total > 0 && (
            <div style={{ marginTop: 20, background: "rgba(255,255,255,.12)", borderRadius: 16, padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.75)" }}>Progress</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{pct}%</span>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,.2)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: pct + "%", background: "#fff", borderRadius: 99, transition: "width .9s ease" }} />
              </div>
              <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
                {[["Pending", counts.pending], ["Applied", counts.applied], ["Notices", counts.notices]].map(([l, v]) => (
                  <div key={l}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{v}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)", fontWeight: 600 }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: "16px 16px 0" }}>
          <DeadlineAlert jobs={jobs} />

          {urgent.length > 0 && (
            <button type="button" onClick={() => goTab("pending")} className="card card-press a-up"
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", marginBottom: 12, background: "var(--c-red-bg)", textAlign: "left" }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: "var(--c-red)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <AlertTriangle size={18} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--c-red)" }}>{urgent.length} deadline{urgent.length > 1 ? "s" : ""} closing soon!</div>
                <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 1 }}>Tap to review</div>
              </div>
              <ChevronRight size={16} color="var(--c-red)" />
            </button>
          )}

          {nextExam && (
            <button type="button" onClick={() => goTab("applied")} className="card card-press a-up d1"
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", marginBottom: 12, textAlign: "left" }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: "linear-gradient(135deg,var(--brand-from),var(--brand-to))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Calendar size={18} color="#fff" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brand)", textTransform: "uppercase", letterSpacing: ".06em" }}>Next Exam</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nextExam.job_name}</div>
                <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 1 }}>
                  {(() => { const d = Math.ceil((new Date(nextExam.exam_date) - new Date()) / 86400000); return d === 0 ? "Today!" : d === 1 ? "Tomorrow!" : `In ${d} days`; })()}
                  {" · "}{formatDate(nextExam.exam_date)}
                </div>
              </div>
              <ChevronRight size={16} color="var(--t4)" />
            </button>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
            {[
              { k: "pending", label: "Pending", gFrom: "#F59E0B", gTo: "#FCD34D", shadow: "#F59E0B44" },
              { k: "applied", label: "Applied", gFrom: "#00C27A", gTo: "#34D399", shadow: "#00C27A44" },
              { k: "notices", label: "Notices", gFrom: "#8B5CF6", gTo: "#A78BFA", shadow: "#8B5CF644" },
            ].map(({ k, label, gFrom, gTo, shadow }, i) => (
              <button key={k} type="button" data-testid={"filter-card-" + k} onClick={() => goTab(k)}
                className={"stat-pill a-up d" + (i + 2)}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(135deg,${gFrom},${gTo})`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", boxShadow: `0 4px 12px ${shadow}` }}>
                  {k === "pending" ? <Clock size={22} color="#fff" /> : k === "applied" ? <CheckCircle2 size={22} color="#fff" /> : <Bell size={22} color="#fff" />}
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--t1)", lineHeight: 1, marginBottom: 3 }}>{loading ? "—" : counts[k]}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  /* TAB SCREENS */
  const tabCfg = {
    pending: { label: "Pending",  color: "var(--c-amber)",  sub: null },
    applied: { label: "Applied",  color: "var(--c-green)",  sub: "by exam date" },
    notices: { label: "Notices",  color: "var(--c-purple)", sub: null },
  };
  const cfg = tabCfg[tab] || tabCfg.pending;

  return (
    <div className="app-screen">
      <div style={{ background: "rgba(255,255,255,.96)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--border)", padding: `calc(14px + var(--sat)) 16px 12px`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--t1)" }}>{cfg.label}</div>
            {cfg.sub && <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 1 }}>Sorted {cfg.sub}</div>}
          </div>
          <button type="button" onClick={() => { setShowSearch(s => !s); if (showSearch) setQuery(""); }}
            className="btn btn-ghost btn-sq" style={{ width: 40, height: 40, borderRadius: 11 }}>
            {showSearch ? <X size={17} /> : <Search size={17} />}
          </button>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--t3)", background: "var(--surface-3)", padding: "5px 12px", borderRadius: 99 }}>
            {list.length}
          </div>
        </div>
        {showSearch && (
          <div className="a-in" style={{ marginTop: 10, position: "relative" }}>
            <Search size={15} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--t4)", pointerEvents: "none" }} />
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
              placeholder={`Search ${cfg.label.toLowerCase()}…`} data-testid="search-input"
              className="input" style={{ paddingLeft: 40, borderRadius: 12, minHeight: 44 }} />
            {query && <button onClick={() => setQuery("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--t3)", cursor: "pointer" }}><X size={15} /></button>}
          </div>
        )}
      </div>
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
    <div style={{ fontSize: 13, color: "rgba(255,255,255,.65)", marginTop: 3, fontWeight: 500 }}>
      {now.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}{" · "}
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
    </div>
  );
}

function SkeletonCards() {
  return <>{[1, 2, 3].map(i => (
    <div key={i} className="card" style={{ padding: 20, marginBottom: 12 }}>
      <div className="skel" style={{ height: 18, width: "65%", marginBottom: 12 }} />
      <div className="skel" style={{ height: 13, width: "42%", marginBottom: 8 }} />
      <div className="skel" style={{ height: 13, width: "30%" }} />
    </div>
  ))}</>;
}

function EmptyState({ query, tab }) {
  return (
    <div data-testid="empty-state" className="card a-pop" style={{ padding: "48px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 42, marginBottom: 12 }}>{query ? "🔍" : tab === "applied" ? "📭" : tab === "pending" ? "🎉" : "📬"}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: "var(--t1)", marginBottom: 6 }}>{query ? "Nothing found" : `No ${tab} jobs`}</div>
      <div style={{ fontSize: 14, color: "var(--t3)" }}>{query ? "Try different keywords" : tab === "applied" ? "Mark jobs as applied to see them here" : "Add jobs from Admin tab"}</div>
    </div>
  );
}
