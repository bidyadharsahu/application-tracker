
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Search, X, Clock, CheckCircle2, Bell, ChevronRight,
  AlertTriangle, Calendar, Languages,
} from "lucide-react";
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
  const [jobs,       setJobs]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [query,      setQuery]      = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [langAnim,   setLangAnim]   = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const tab   = searchParams.get("tab");
  const today = new Date().toISOString().split("T")[0];

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try { setJobs(sortJobs(await api.listJobs())); }
    catch { toast.error(t("loading_failed")); }
    finally { setLoading(false); }
  }, [t]);

  useEffect(() => {
    api.deleteExpiredUnappliedJobs?.();
    loadJobs();
  }, [loadJobs]);

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
    setUrgentCount?.(urg);
  }, [jobs, today, lang]);

  const handleToggle = async (job) => {
    try {
      const u = await api.toggleApplied(job.id);
      setJobs(prev => sortJobs(prev.map(j => j.id === job.id ? u : j)));
    } catch { toast.error(t("update_failed")); }
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
      const matchStatus = getStatus(j, today) === tab;
      const matchQuery  = !query
        || j.job_name?.toLowerCase().includes(query.toLowerCase())
        || (j.tags || "").toLowerCase().includes(query.toLowerCase());
      return matchStatus && matchQuery;
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
    jobs
      .filter(j => j.applied && j.exam_date && new Date(j.exam_date) >= new Date())
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
    jobs
      .filter(j => j.applied && j.applied_at)
      .sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at))[0] || null,
  [jobs]);

  const hour     = new Date().getHours();
  const greetKey = hour < 12 ? "greet_morning" : hour < 17 ? "greet_afternoon" : "greet_evening";
  const goTab    = k => { setQuery(""); setShowSearch(false); setSearchParams(k ? { tab: k } : {}); };

  const examCountdownLabel = examDate => {
    const d = Math.ceil((new Date(examDate) - new Date()) / 86400000);
    if (d === 0) return t("today");
    if (d === 1) return t("tomorrow");
    return t("in_n_days", { n: d });
  };

  const langLabel = lang === "en" ? "ଓଡ଼ିଆ" : "English";

  const LangBtn = () => (
    <button
      type="button"
      onClick={handleLangToggle}
      className={"lang-switch tg-press" + (langAnim ? " lang-switching" : "")}
      aria-label={lang === "en" ? "Switch to Odia" : "Switch to English"}
    >
      <Languages size={12} strokeWidth={2.4} />
      {langLabel}
    </button>
  );

  /* ════════ HOME SCREEN ════════ */
  if (!tab) return (
    <main className="app-screen" data-lang={lang}>
      <header className="nav-large-title a-tab">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p className="eyebrow">{t(greetKey)}</p>
            <h1>{t("app_title")}</h1>
          </div>
          <LangBtn />
        </div>
        <LiveClock lang={lang} />
      </header>

      <div className="app-scroll">
        <div style={{ padding: "10px 14px 0" }}>
          <DeadlineAlert jobs={jobs} />

          {/* Urgent deadline banner */}
          {urgent.length > 0 && (
            <button
              type="button"
              onClick={() => goTab("pending")}
              className="ios-card ios-card-press a-up"
              style={{
                width: "100%", display: "flex", alignItems: "center",
                gap: 12, padding: "13px 14px", marginBottom: 10, textAlign: "left",
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "var(--tint-red-bg)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, animation: "pulseRing 1.8s ease infinite",
              }}>
                <AlertTriangle size={17} color="var(--ios-red)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--label-1)" }}>
                  {t("deadlines_closing", { n: urgent.length })}
                </div>
                <div style={{ fontSize: 12, color: "var(--label-3)", marginTop: 1 }}>
                  {t("tap_review_pending")}
                </div>
              </div>
              <ChevronRight size={16} color="var(--label-4)" />
            </button>
          )}

          {/* Next exam card */}
          {nextExam && (
            <button
              type="button"
              onClick={() => goTab("applied")}
              className="ios-card ios-card-press a-up d1"
              style={{
                width: "100%", display: "flex", alignItems: "center",
                gap: 12, padding: "13px 14px", marginBottom: 10, textAlign: "left",
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "var(--tint-blue-bg)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <Calendar size={17} color="var(--ios-blue)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ios-blue)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                  {t("next_exam")}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--label-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {nextExam.job_name}
                </div>
                <div style={{ fontSize: 12, color: "var(--label-3)", marginTop: 1 }}>
                  {examCountdownLabel(nextExam.exam_date)} · {formatDate(nextExam.exam_date)}
                </div>
              </div>
              <ChevronRight size={16} color="var(--label-4)" />
            </button>
          )}

          {/* Last applied card */}
          {recentlyApplied && (
            <button
              type="button"
              onClick={() => goTab("applied")}
              className="ios-card ios-card-press a-up d2"
              style={{
                width: "100%", display: "flex", alignItems: "center",
                gap: 12, padding: "13px 14px", marginBottom: 14, textAlign: "left",
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "var(--tint-green-bg)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <CheckCircle2 size={17} color="var(--ios-green)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ios-green)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                  {t("last_applied")}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--label-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {recentlyApplied.job_name}
                </div>
              </div>
              <ChevronRight size={16} color="var(--label-4)" />
            </button>
          )}

          {/* Category tiles */}
          <p className="section-eyebrow">{t("categories")}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 9, marginBottom: 10 }}>
            {[
              { k: "pending", labelKey: "status_pending", emoji: "📋", bg: "var(--tint-orange-bg)", fg: "#B25900" },
              { k: "applied", labelKey: "status_applied", emoji: "✅", bg: "var(--tint-green-bg)",  fg: "#1A8A3D" },
              { k: "notices", labelKey: "status_notices", emoji: "🔔", bg: "var(--tint-purple-bg)", fg: "#8A38B5" },
            ].map(({ k, labelKey, emoji, bg, fg }, i) => (
              <button
                key={k}
                type="button"
                onClick={() => goTab(k)}
                className={"stat-tile tg-press a-up d" + (i + 3)}
              >
                <div style={{
                  width: 42, height: 42, borderRadius: 12, background: bg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 8px", fontSize: 20,
                }}>
                  {emoji}
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--label-1)", lineHeight: 1, marginBottom: 2 }}>
                  {loading ? "—" : counts[k]}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: fg }}>
                  {t(labelKey)}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );

  /* ════════ TAB SCREENS (Pending / Applied / Notices) ════════ */
  const cfgMap = {
    pending: { labelKey: "pending_jobs",  subKey: null },
    applied: { labelKey: "applied_jobs",  subKey: "sorted_by_exam" },
    notices: { labelKey: "status_notices", subKey: null },
  };
  const cfg = cfgMap[tab] || cfgMap.pending;

  return (
    <main className="app-screen" data-lang={lang}>
      {/* Sticky inline header */}
      <header className="nav-inline-title">
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {t(cfg.labelKey)}
          </h2>
          {cfg.subKey && (
            <p style={{ fontSize: 11, color: "var(--label-3)", marginTop: 1 }}>{t(cfg.subKey)}</p>
          )}
        </div>
        <LangBtn />
        <button
          type="button"
          onClick={() => { setShowSearch(s => !s); if (showSearch) setQuery(""); }}
          className="btn btn-gray btn-icon tg-press"
          aria-label={showSearch ? "Close search" : "Search"}
        >
          {showSearch ? <X size={17} /> : <Search size={17} />}
        </button>
        <div style={{
          fontSize: 12, fontWeight: 700, color: "var(--label-2)",
          background: "var(--fill-3)", padding: "4px 10px", borderRadius: 99,
          flexShrink: 0,
        }}>
          {list.length}
        </div>
      </header>

      {/* Search bar — animated in, does NOT cause layout shift */}
      {showSearch && (
        <div className="a-in" style={{ padding: "8px 14px 0", position: "relative", flexShrink: 0 }}>
          <Search size={15} style={{
            position: "absolute", left: 28, top: "50%", marginTop: -1,
            transform: "translateY(-50%)", color: "var(--label-4)", pointerEvents: "none",
          }} />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t("search_placeholder", { label: t(cfg.labelKey).toLowerCase() })}
            className="ios-input"
            style={{ paddingLeft: 38 }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{
                position: "absolute", right: 24, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", color: "var(--label-3)", cursor: "pointer", padding: 4,
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>
      )}

      {/* Job list — padding-bottom from .app-scroll clears tab bar */}
      <div className="app-scroll" style={{ padding: "10px 14px 0" }}>
        {loading
          ? <SkeletonCards />
          : list.length === 0
            ? <EmptyState query={query} tab={tab} t={t} />
            : list.map((job, i) => (
              <div
                key={job.id}
                className="a-up"
                style={{
                  animationDelay: Math.min(i * 0.03, 0.18) + "s",
                  marginBottom: 10,
                }}
              >
                <JobCard job={job} onToggle={handleToggle} />
              </div>
            ))
        }
      </div>
    </main>
  );
}

/* ── Live clock in header ──────────────────────────────── */
function LiveClock({ lang }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const locale = lang === "or" ? "or-IN" : "en-IN";
  return (
    <p style={{ fontSize: 13, color: "var(--label-3)", marginTop: 5, fontWeight: 500 }}>
      {now.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" })}
      {" · "}
      <span style={{ fontVariantNumeric: "tabular-nums" }}>
        {now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
      </span>
    </p>
  );
}

/* ── Skeleton loading cards ────────────────────────────── */
function SkeletonCards() {
  return (
    <>
      {[0, 1, 2].map(i => (
        <div key={i} className="ios-card" style={{ padding: 16, marginBottom: 10, animationDelay: i * 0.06 + "s" }}>
          <div className="ios-skel" style={{ height: 16, width: "60%", marginBottom: 12 }} />
          <div className="ios-skel" style={{ height: 12, width: "40%", marginBottom: 8 }} />
          <div className="ios-skel" style={{ height: 12, width: "28%" }} />
        </div>
      ))}
    </>
  );
}

/* ── Empty state ────────────────────────────────────────── */
function EmptyState({ query, tab, t }) {
  const emoji = query ? "🔍" : tab === "applied" ? "📭" : tab === "pending" ? "🎉" : "📬";
  return (
    <div className="ios-card a-pop" style={{ padding: "46px 18px", textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{emoji}</div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--label-1)", marginBottom: 5 }}>
        {query ? t("no_results") : t("no_jobs_in_tab", { tab: t("status_" + tab).toLowerCase() })}
      </h3>
      <p style={{ fontSize: 13, color: "var(--label-3)", lineHeight: 1.55 }}>
        {query
          ? t("try_different_keywords")
          : tab === "applied" ? t("mark_applied_to_see")
          : t("add_from_admin")}
      </p>
    </div>
  );
}
