
import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Plus, Search, X, Clock, CheckCircle2, Bell, ChevronRight, AlertTriangle, Calendar, Languages } from "lucide-react";
import api from "../lib/api";
import { sortJobs, daysUntil, formatDate } from "../lib/utils-date";
import JobCard from "../components/JobCard";
import DeadlineAlert from "../components/DeadlineAlert";
import { useI18n } from "../lib/i18n";
import { toast } from "sonner";

const getStatus = (j, today) => {
  if (j.applied) return "applied";
  const future = j.start_date && j.start_date > today;
  const blank  = !j.start_date && !j.exam_date && !j.last_date;
  return future || blank ? "notices" : "pending";
};

export default function Landing({ setUrgentCount }) {
  const { t, lang, toggleLang } = useI18n();
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
    catch { toast.error(t("loading_failed")); }
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
    } catch { toast.error(t("update_failed")); }
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

  const recentlyApplied = useMemo(() =>
    jobs.filter(j => j.applied && j.applied_at)
        .sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at))[0] || null, [jobs]);

  const hour  = new Date().getHours();
  const greetKey = hour < 12 ? "greet_morning" : hour < 17 ? "greet_afternoon" : "greet_evening";

  const goTab = k => { setQuery(""); setShowSearch(false); setSearchParams(k ? { tab: k } : {}); };

  const examCountdownLabel = (examDate) => {
    const d = Math.ceil((new Date(examDate) - new Date()) / 86400000);
    if (d === 0) return t("today");
    if (d === 1) return t("tomorrow");
    return t("in_n_days", { n: d });
  };

  const langLabel = lang === "en" ? "ଓଡ଼ିଆ" : "English";

  /* ════════ HOME ════════ */
  if (!tab) return (
    <div className="app-screen" data-lang={lang}>
      <div className="app-scroll">
        <div className="nav-large-title a-tab">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div className="eyebrow">{t(greetKey)}</div>
              <h1>{t("home_title")}</h1>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button type="button" onClick={toggleLang} className="lang-switch tg-press" data-testid="lang-toggle" aria-label="Switch language" title="ଭାଷା ବଦଳାନ୍ତୁ / Switch language">
                <Languages size={14} strokeWidth={2.2} /> {langLabel}
              </button>
              <Link to="/admin/login" data-testid="admin-login-link" className="btn btn-tinted btn-sm tg-press" style={{ textDecoration: "none" }}>
                <Plus size={16} strokeWidth={2.5} />
              </Link>
            </div>
          </div>
          <LiveClock lang={lang} />
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
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--label-1)" }}>
                  {t("deadlines_closing", { n: urgent.length })}
                </div>
                <div style={{ fontSize: 13, color: "var(--label-3)", marginTop: 1 }}>{t("tap_review_pending")}</div>
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
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ios-blue)", textTransform: "uppercase", letterSpacing: ".04em" }}>{t("next_exam")}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--label-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nextExam.job_name}</div>
                <div style={{ fontSize: 13, color: "var(--label-3)", marginTop: 1 }}>
                  {examCountdownLabel(nextExam.exam_date)}{" · "}{formatDate(nextExam.exam_date)}
                </div>
              </div>
              <ChevronRight size={17} color="var(--label-4)" />
            </button>
          )}

          {recentlyApplied && (
            <button type="button" onClick={() => goTab("applied")} className="ios-card ios-card-press a-up d2"
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", marginBottom: 16, textAlign: "left" }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: "var(--tint-green-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <CheckCircle2 size={18} color="var(--ios-green)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ios-green)", textTransform: "uppercase", letterSpacing: ".04em" }}>{t("last_applied")}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--label-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{recentlyApplied.job_name}</div>
              </div>
              <ChevronRight size={17} color="var(--label-4)" />
            </button>
          )}

          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--label-3)", textTransform: "uppercase", letterSpacing: ".03em", marginBottom: 8, paddingLeft: 4 }}>
            {t("categories")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 8 }}>
            {[
              { k: "pending", labelKey: "status_pending", icon: <Clock size={24} strokeWidth={1.8} />, bg: "var(--tint-orange-bg)", fg: "#B25900" },
              { k: "applied", labelKey: "status_applied", icon: <CheckCircle2 size={24} strokeWidth={1.8} />, bg: "var(--tint-green-bg)", fg: "#1A8A3D" },
              { k: "notices", labelKey: "status_notices", icon: <Bell size={24} strokeWidth={1.8} />, bg: "var(--tint-purple-bg)", fg: "#8A38B5" },
            ].map(({ k, labelKey, icon, bg, fg }, i) => (
              <button key={k} type="button" data-testid={"filter-card-" + k} onClick={() => goTab(k)} className={"stat-tile tg-press a-up d" + (i + 3)}>
                <div style={{ width: 46, height: 46, borderRadius: 14, background: bg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", color: fg }}>
                  {icon}
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: "var(--label-1)", lineHeight: 1, marginBottom: 3 }}>{loading ? "—" : counts[k]}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--label-2)" }}>{t(labelKey)}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  /* ════════ TAB SCREENS ════════ */
  const cfg = {
    pending: { labelKey: "pending_jobs", subKey: null },
    applied: { labelKey: "applied_jobs", subKey: "sorted_by_exam" },
    notices: { labelKey: "status_notices", subKey: null },
  }[tab] || { labelKey: "status_pending" };

  return (
    <div className="app-screen" data-lang={lang}>
      <div className="nav-inline-title a-tab">
        <div style={{ flex: 1 }}>
          <h2>{t(cfg.labelKey)}</h2>
          {cfg.subKey && <div style={{ fontSize: 12, color: "var(--label-3)", marginTop: 1 }}>{t(cfg.subKey)}</div>}
        </div>
        <button type="button" onClick={() => { setShowSearch(s => !s); if (showSearch) setQuery(""); }} className="btn btn-gray btn-icon tg-press">
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
            placeholder={t("search_placeholder", { label: t(cfg.labelKey).toLowerCase() })} data-testid="search-input"
            className="ios-input" style={{ paddingLeft: 40 }} />
          {query && <button onClick={() => setQuery("")} style={{ position: "absolute", right: 30, top: 23, background: "none", border: "none", color: "var(--label-3)", cursor: "pointer" }}><X size={16} /></button>}
        </div>
      )}

      <div className="app-scroll" style={{ padding: "12px 16px" }}>
        {loading ? <SkeletonCards /> :
          list.length === 0 ? <EmptyState query={query} tab={tab} t={t} /> :
          list.map((job, i) => (
            <div key={job.id} className="a-up" style={{ animationDelay: Math.min(i * 0.025, 0.2) + "s", marginBottom: 12 }}>
              <JobCard job={job} onToggle={handleToggle} />
            </div>
          ))
        }
      </div>
    </div>
  );
}

function LiveClock({ lang }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const locale = lang === "or" ? "or-IN" : "en-IN";
  return (
    <div style={{ fontSize: 14, color: "var(--label-3)", marginTop: 6, fontWeight: 500 }}>
      {now.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" })}
      {" · "}<span style={{ fontVariantNumeric: "tabular-nums" }}>{now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}</span>
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

function EmptyState({ query, tab, t }) {
  return (
    <div data-testid="empty-state" className="ios-card a-pop" style={{ padding: "48px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 42, marginBottom: 12 }}>{query ? "🔍" : tab === "applied" ? "📭" : tab === "pending" ? "🎉" : "📬"}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: "var(--label-1)", marginBottom: 6 }}>
        {query ? t("no_results") : t("no_jobs_in_tab", { tab: t("status_" + tab).toLowerCase() })}
      </div>
      <div style={{ fontSize: 14, color: "var(--label-3)" }}>
        {query ? t("try_different_keywords") : tab === "applied" ? t("mark_applied_to_see") : t("add_from_admin")}
      </div>
    </div>
  );
}
