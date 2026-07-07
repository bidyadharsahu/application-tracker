
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search, X, CheckCircle2, ChevronRight,
  AlertTriangle, Calendar, Languages,
} from "lucide-react";
import api from "../lib/api";
import { sortJobs, daysUntil, formatDate } from "../lib/utils-date";
import JobCard from "../components/JobCard";
import DeadlineAlert from "../components/DeadlineAlert";
import TabBar from "../components/TabBar";
import { useI18n } from "../lib/i18n";
import { toast } from "sonner";

const getStatus = (j, today) => {
  if (j.applied) return "applied";
  const future = j.start_date && j.start_date > today;
  const blank  = !j.start_date && !j.exam_date && !j.last_date;
  return (future || blank) ? "notices" : "pending";
};

export default function Landing() {
  const { t, lang, toggleLang } = useI18n();
  const [jobs,       setJobs]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [query,      setQuery]      = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [langAnim,   setLangAnim]   = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const tab   = searchParams.get("tab");
  const today = new Date().toISOString().split("T")[0];

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try { setJobs(sortJobs(await api.listJobs())); }
    catch { toast.error(t("loading_failed")); }
    finally { setLoading(false); }
  }, [t]);

  useEffect(() => { api.deleteExpiredUnappliedJobs?.(); loadJobs(); }, [loadJobs]);

  useEffect(() => {
    jobs.forEach(async j => {
      if (j.start_date && j.start_date <= today && !j.notified && !j.applied) {
        toast.success(`${j.job_name} ${lang === "or" ? "ଏବେ ଖୋଲାଯାଇଛି!" : "is now open!"}`);
        try { await api.markNotified?.(j.id); } catch {}
      }
    });
    const urg = jobs.filter(j => {
      if (j.applied) return false;
      const d = daysUntil(j.last_date);
      return d !== null && d <= 3 && d >= 0;
    }).length;
  }, [jobs, today]);

  const handleToggle = async (job) => {
    // Optimistic update — flip locally first for instant feedback
    const flipped = { ...job, applied: !job.applied, applied_at: !job.applied ? new Date().toISOString() : null };
    setJobs(prev => sortJobs(prev.map(j => j.id === job.id ? flipped : j)));
    try {
      // Pass current applied value so api layer needs no SELECT round-trip
      await api.toggleApplied(job.id, job.applied);
    } catch (e) {
      // Revert optimistic update on failure
      setJobs(prev => sortJobs(prev.map(j => j.id === job.id ? job : j)));
      console.error("Update failed:", e);
      toast.error(e?.message || t("update_failed"));
    }
  };

  const handleLangToggle = () => {
    setLangAnim(true);
    setTimeout(() => setLangAnim(false), 340);
    toggleLang();
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
      const q = !query
        || j.job_name?.toLowerCase().includes(query.toLowerCase())
        || (j.tags || "").toLowerCase().includes(query.toLowerCase());
      return s && q;
    });
    if (tab === "applied") {
      l = [...l].sort((a, b) =>
        !a.exam_date ? 1 : !b.exam_date ? -1
          : new Date(a.exam_date) - new Date(b.exam_date)
      );
    }
    return l;
  }, [jobs, tab, query, today]);

  const nextExam = useMemo(() =>
    jobs.filter(j => j.applied && j.exam_date && new Date(j.exam_date) >= new Date())
        .sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date))[0] || null,
  [jobs]);

  const urgent = useMemo(() =>
    jobs.filter(j => {
      if (j.applied) return false;
      const d = daysUntil(j.last_date);
      return d !== null && d <= 3 && d >= 0;
    }),
  [jobs]);

  const recentlyApplied = useMemo(() =>
    jobs.filter(j => j.applied && j.applied_at)
        .sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at))[0] || null,
  [jobs]);

  const hour     = new Date().getHours();
  const greetKey = hour < 12 ? "greet_morning" : hour < 17 ? "greet_afternoon" : "greet_evening";
  const goTab    = k => { setQuery(""); setShowSearch(false); setSearchParams(k ? { tab: k } : {}); };
  const langLabel = lang === "en" ? "ଓଡ଼ିଆ" : "English";

  const LangBtn = () => (
    <button
      type="button"
      onClick={handleLangToggle}
      className={"lang-switch" + (langAnim ? " lang-switching" : "")}
      aria-label={lang === "en" ? "Switch to Odia" : "Switch to English"}
    >
      <Languages size={12} strokeWidth={2.4} />
      {langLabel}
    </button>
  );

  const examIn = date => {
    const d = Math.ceil((new Date(date) - new Date()) / 86400000);
    return d === 0 ? t("today") : d === 1 ? t("tomorrow") : t("in_n_days", { n: d });
  };

  /* ════════ HOME ════════ */
  if (!tab) return (
    <main className="app-screen a-tab" data-lang={lang}>
      {/* Large title — iPhone 17 style with gradient tint */}
      <header className="nav-large-title" style={{
        background: "linear-gradient(180deg, rgba(180,196,220,0.96) 0%, rgba(218,224,234,0.90) 100%)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p className="eyebrow">{t(greetKey)}</p>
            <h1>{t("app_title")}</h1>
          </div>
          <LangBtn />
        </div>
        <LiveClock lang={lang} />
      </header>

      <TabBar urgentCount={urgent.length} />

      {/* Scroll region */}
      <div className="app-scroll">
        <div style={{ paddingTop: 10, paddingLeft: 14, paddingRight: 14 }}>
          <DeadlineAlert jobs={jobs} />

          {/* Urgent banner */}
          {urgent.length > 0 && (
            <button type="button" onClick={() => goTab("pending")}
              className="ios-card ios-card-press a-up"
              style={{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"13px 14px", marginBottom:10, textAlign:"left" }}>
              <div style={{ width:36, height:36, borderRadius:10, background:"var(--tint-red-bg)",
                display:"flex", alignItems:"center", justifyContent:"center",
                flexShrink:0, animation:"pulseRing 1.8s ease infinite" }}>
                <AlertTriangle size={17} color="var(--ios-red)" />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:18, fontWeight:700, color:"var(--label-1)" }}>
                  {t("deadlines_closing", { n: urgent.length })}
                </div>
                <div style={{ fontSize:15, color:"var(--label-3)", marginTop:1 }}>
                  {t("tap_review_pending")}
                </div>
              </div>
              <ChevronRight size={16} color="var(--label-4)" />
            </button>
          )}

          {/* Next exam */}
          {nextExam && (
            <button type="button" onClick={() => goTab("applied")}
              className="ios-card ios-card-press a-up d1"
              style={{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"13px 14px", marginBottom:10, textAlign:"left" }}>
              <div style={{ width:36, height:36, borderRadius:10, background:"var(--tint-blue-bg)",
                display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Calendar size={17} color="var(--ios-blue)" />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:700, color:"var(--ios-blue)", textTransform:"uppercase", letterSpacing:".06em" }}>
                  {t("next_exam")}
                </div>
                <div style={{ fontSize:18, fontWeight:700, color:"var(--label-1)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {nextExam.job_name}
                </div>
                <div style={{ fontSize:15, color:"var(--label-3)", marginTop:1 }}>
                  {examIn(nextExam.exam_date)} · {formatDate(nextExam.exam_date)}
                </div>
              </div>
              <ChevronRight size={16} color="var(--label-4)" />
            </button>
          )}

          {/* Last applied */}
          {recentlyApplied && (
            <button type="button" onClick={() => goTab("applied")}
              className="ios-card ios-card-press a-up d2"
              style={{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"13px 14px", marginBottom:14, textAlign:"left" }}>
              <div style={{ width:36, height:36, borderRadius:10, background:"var(--tint-green-bg)",
                display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <CheckCircle2 size={17} color="var(--ios-green)" />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:700, color:"var(--ios-green)", textTransform:"uppercase", letterSpacing:".06em" }}>
                  {t("last_applied")}
                </div>
                <div style={{ fontSize:18, fontWeight:700, color:"var(--label-1)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {recentlyApplied.job_name}
                </div>
              </div>
              <ChevronRight size={16} color="var(--label-4)" />
            </button>
          )}

          {/* Category tiles */}
          <p className="section-eyebrow">{t("categories")}</p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:9, marginBottom:10 }}>
            {[
              { k:"pending", labelKey:"status_pending", emoji:"📋", fg:"#B25900" },
              { k:"applied", labelKey:"status_applied", emoji:"✅", fg:"#1A8A3D" },
              { k:"notices", labelKey:"status_notices", emoji:"🔔", fg:"#8A38B5" },
            ].map(({ k, labelKey, emoji, fg }, i) => (
              <button key={k} type="button" onClick={() => goTab(k)}
                className={"stat-tile tg-press a-up d" + (i+3)}>
                <div style={{ fontSize:32, marginBottom:6 }}>{emoji}</div>
                <div style={{ fontSize:32, fontWeight:800, color:"var(--label-1)", lineHeight:1, marginBottom:3 }}>
                  {loading ? "—" : counts[k]}
                </div>
                <div style={{ fontSize:14, fontWeight:700, color:fg }}>
                  {t(labelKey)}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );

  /* ════════ TAB SCREENS ════════ */
  const cfgMap = {
    pending: { labelKey:"pending_jobs",   subKey:null },
    applied: { labelKey:"applied_jobs",   subKey:"sorted_by_exam" },
    notices: { labelKey:"status_notices", subKey:null },
  };
  const cfg = cfgMap[tab] || cfgMap.pending;

  return (
    <main className="app-screen" data-lang={lang}>
      <header className="nav-inline-title a-tab">
        <div style={{ flex:1, minWidth:0 }}>
          <h2 style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {t(cfg.labelKey)}
          </h2>
          {cfg.subKey && <p style={{ fontSize:14, color:"var(--label-3)", marginTop:1 }}>{t(cfg.subKey)}</p>}
        </div>
        <LangBtn />
        <button type="button"
          onClick={() => { setShowSearch(s => !s); if (showSearch) setQuery(""); }}
          className="btn btn-gray btn-icon tg-press"
          aria-label={showSearch ? "Close search" : "Search"}>
          {showSearch ? <X size={17} /> : <Search size={17} />}
        </button>
        <div style={{ fontSize:15, fontWeight:700, color:"var(--label-2)",
          background:"var(--fill-3)", padding:"4px 10px", borderRadius:99, flexShrink:0 }}>
          {list.length}
        </div>
      </header>

      {showSearch && (
        <div className="a-in" style={{ padding:"8px 14px 4px", position:"relative", flexShrink:0 }}>
          <Search size={15} style={{ position:"absolute", left:28, top:"50%", transform:"translateY(-50%)", color:"var(--label-4)", pointerEvents:"none" }} />
          <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
            placeholder={t("search_placeholder", { label: t(cfg.labelKey).toLowerCase() })}
            className="ios-input" style={{ paddingLeft:38, fontSize:18 }} />
          {query && (
            <button onClick={() => setQuery("")}
              style={{ position:"absolute", right:24, top:"50%", transform:"translateY(-50%)",
                background:"none", border:"none", color:"var(--label-3)", cursor:"pointer", padding:4 }}>
              <X size={15} />
            </button>
          )}
        </div>
      )}

      <TabBar urgentCount={urgent.length} />

      {/* ── THE ONLY SCROLL CONTAINER ── */}
      <div className="app-scroll" style={{ paddingTop: 10, paddingLeft: 14, paddingRight: 14 }}>
        {loading
          ? <SkeletonCards />
          : list.length === 0
            ? <EmptyState query={query} tab={tab} t={t} />
            : list.map((job, i) => (
              <div key={job.id} className="a-up"
                style={{ animationDelay: Math.min(i * 0.03, 0.18) + "s", marginBottom:10 }}>
                <JobCard job={job} onToggle={handleToggle} />
              </div>
            ))
        }
      </div>
    </main>
  );
}

function LiveClock({ lang }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const loc = lang === "or" ? "or-IN" : "en-IN";
  return (
    <p style={{ fontSize:16, color:"var(--label-3)", marginTop:5, fontWeight:500 }}>
      {now.toLocaleDateString(loc, { weekday:"short", day:"numeric", month:"short" })}
      {" · "}
      <span style={{ fontVariantNumeric:"tabular-nums" }}>
        {now.toLocaleTimeString(loc, { hour:"2-digit", minute:"2-digit" })}
      </span>
    </p>
  );
}

function SkeletonCards() {
  return (
    <>
      {[0,1,2].map(i => (
        <div key={i} className="ios-card" style={{ padding:16, marginBottom:10 }}>
          <div className="ios-skel" style={{ height:16, width:"62%", marginBottom:12 }} />
          <div className="ios-skel" style={{ height:12, width:"40%", marginBottom:8 }} />
          <div className="ios-skel" style={{ height:12, width:"28%" }} />
        </div>
      ))}
    </>
  );
}

function EmptyState({ query, tab, t }) {
  const emoji = query ? "🔍" : tab === "applied" ? "📭" : tab === "pending" ? "🎉" : "📬";
  return (
    <div className="ios-card a-pop" style={{ padding:"46px 18px", textAlign:"center" }}>
      <div style={{ fontSize:52, marginBottom:12 }}>{emoji}</div>
      <h3 style={{ fontSize:20, fontWeight:700, color:"var(--label-1)", marginBottom:5 }}>
        {query ? t("no_results") : t("no_jobs_in_tab", { tab: t("status_"+tab).toLowerCase() })}
      </h3>
      <p style={{ fontSize:16, color:"var(--label-3)", lineHeight:1.55 }}>
        {query ? t("try_different_keywords")
          : tab === "applied" ? t("mark_applied_to_see")
          : t("add_from_admin")}
      </p>
    </div>
  );
}
