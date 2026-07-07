import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Plus, LogOut, ArrowLeft, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import api, { clearToken } from "../lib/api";
import { sortJobs } from "../lib/utils-date";
import JobCard from "../components/JobCard";
import JobFormModal from "../components/JobFormModal";
import { useI18n } from "../lib/i18n";

export default function AdminDashboard() {
  const { t, lang, toggleLang } = useI18n();
  const [jobs,       setJobs]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [formOpen,   setFormOpen]   = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [tab,        setTab]        = useState("all");
  const nav   = useNavigate();
  const today = new Date().toISOString().split("T")[0];

  const getStatus = j => {
    if (j.applied) return "applied";
    const f = j.start_date && j.start_date > today;
    const b = !j.start_date && !j.exam_date && !j.last_date;
    return (f || b) ? "notices" : "pending";
  };

  const load = async () => {
    setLoading(true);
    try { setJobs(sortJobs(await api.listJobs())); }
    catch (e) {
      if (e?.response?.status === 401) { clearToken(); nav("/admin/login"); }
      else toast.error(t("loading_failed"));
    }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const counts = useMemo(() => ({
    all:     jobs.length,
    pending: jobs.filter(j => getStatus(j) === "pending").length,
    applied: jobs.filter(j => getStatus(j) === "applied").length,
    notices: jobs.filter(j => getStatus(j) === "notices").length,
  }), [jobs]);

  const visible = useMemo(() => {
    let l = tab === "all" ? jobs : jobs.filter(j => getStatus(j) === tab);
    if (tab === "applied") {
      l = [...l].sort((a, b) =>
        !a.exam_date ? 1 : !b.exam_date ? -1
          : new Date(a.exam_date) - new Date(b.exam_date)
      );
    }
    return l;
  }, [jobs, tab]);

  const save = async (payload) => {
    try {
      if (editingJob) {
        await api.updateJob(editingJob.id, payload);
        toast.success(t("updated_toast"));
      } else {
        await api.createJob(payload);
        toast.success(t("job_added_toast"));
      }
      setFormOpen(false); setEditingJob(null); load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || t("save_failed"));
    }
  };

  const del = async (job) => {
    const msg = lang === "or"
      ? `"${job.job_name}" ଡିଲିଟ କରିବେ?`
      : `Delete "${job.job_name}"?`;
    if (!window.confirm(msg)) return;
    try { await api.deleteJob(job.id); toast.success(t("deleted_toast")); load(); }
    catch { toast.error(t("delete_failed")); }
  };

  // Optimistic toggle — flip UI instantly, confirm from server, revert on error.
  // Passes job.applied to api so it skips the SELECT round-trip (fixes RLS error).
  const toggle = async (job) => {
    const flipped = {
      ...job,
      applied: !job.applied,
      applied_at: !job.applied ? new Date().toISOString() : null,
    };
    setJobs(prev => sortJobs(prev.map(j => j.id === job.id ? flipped : j)));
    try {
      await api.toggleApplied(job.id, job.applied);
    } catch {
      setJobs(prev => sortJobs(prev.map(j => j.id === job.id ? job : j)));
      toast.error(t("update_failed"));
    }
  };

  const TABS = [
    { k: "all",     l: t("tab_all") },
    { k: "pending", l: t("status_pending") },
    { k: "applied", l: t("status_applied") },
    { k: "notices", l: t("status_notices") },
  ];

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      background: "transparent", overflow: "hidden",
    }}>
      {/* ── Sticky header ── */}
      <div className="nav-inline-title" style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--label-3)", textTransform: "uppercase", letterSpacing: ".06em" }}>
              {t("admin_eyebrow")}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--label-1)" }}>
              {t("admin_title")}
            </div>
          </div>
          <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
            <button type="button" onClick={toggleLang} className="lang-switch tg-press"
              aria-label={lang === "en" ? "Switch to Odia" : "Switch to English"}>
              {lang === "en" ? "ଓଡ଼ିଆ" : "English"}
            </button>
            <Link to="/" className="btn btn-gray btn-icon tg-press">
              <ArrowLeft size={17} />
            </Link>
            <button type="button" onClick={load} className="btn btn-gray btn-icon tg-press">
              <RefreshCw size={15} />
            </button>
            <button type="button"
              onClick={() => { clearToken(); nav("/"); }}
              className="btn btn-danger-tinted btn-icon tg-press">
              <LogOut size={15} />
            </button>
          </div>
        </div>

        {/* New job button — full width */}
        <button
          type="button"
          onClick={() => { setEditingJob(null); setFormOpen(true); }}
          className="btn btn-filled tg-press"
          data-testid="new-job-btn"
          style={{ width: "100%" }}>
          <Plus size={16} /> {t("new_job")}
        </button>

        {/* Segmented tab */}
        <div style={{
          display: "flex", background: "var(--fill-3)",
          borderRadius: 12, padding: 3, gap: 3,
        }}>
          {TABS.map(({ k, l }) => (
            <button key={k} type="button" onClick={() => setTab(k)} className="tg-press"
              style={{
                flex: 1, padding: "7px 2px", borderRadius: 9,
                border: "none", cursor: "pointer",
                background: tab === k ? "#fff" : "transparent",
                color: tab === k ? "var(--label-1)" : "var(--label-3)",
                fontWeight: tab === k ? 700 : 500,
                fontSize: 12,
                boxShadow: tab === k ? "0 1px 3px rgba(0,0,0,.10)" : "none",
                transition: "all .18s var(--tg-out)",
              }}>
              {l}
              <span style={{
                fontSize: 10, marginLeft: 3,
                color: tab === k ? "var(--ios-blue)" : "var(--label-4)",
                fontWeight: 700,
              }}>
                ({counts[k]})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Scroll area ── */}
      <div className="app-scroll" style={{
        padding: "12px 14px 0",
        paddingBottom: "calc(24px + var(--sab))",
      }}>
        {loading ? (
          <>
            {[0, 1, 2].map(i => (
              <div key={i} className="ios-card" style={{ padding: 16, marginBottom: 10 }}>
                <div className="ios-skel" style={{ height: 16, width: "58%", marginBottom: 10 }} />
                <div className="ios-skel" style={{ height: 12, width: "35%" }} />
              </div>
            ))}
          </>
        ) : visible.length === 0 ? (
          <div className="ios-card a-pop" style={{ padding: "46px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--label-1)", marginBottom: 5 }}>
              {t("no_jobs_here")}
            </div>
            <div style={{ fontSize: 13, color: "var(--label-3)" }}>
              {lang === "or" ? "ଉପରେ 'ନୂଆ ଆବେଦନ' ଦ୍ୱାରା ଯୋଡ଼ନ୍ତୁ" : "Tap 'New Job' above to add one"}
            </div>
          </div>
        ) : (
          <div data-testid="admin-jobs-grid">
            {visible.map((job, i) => (
              <div key={job.id} className="a-up"
                style={{ animationDelay: Math.min(i * 0.025, 0.12) + "s", marginBottom: 10 }}>
                <JobCard
                  job={job} admin
                  onEdit={j => { setEditingJob(j); setFormOpen(true); }}
                  onDelete={del}
                  onToggle={toggle}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <JobFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingJob(null); }}
        onSave={save}
        initial={editingJob}
        prefill={null}
      />
    </div>
  );
}
