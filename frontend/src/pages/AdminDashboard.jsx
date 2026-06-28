import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Plus, Sparkles, LogOut, ArrowLeft, RefreshCw, Clock, CheckCircle2, Bell, BookOpen, Newspaper } from "lucide-react";
import { toast } from "sonner";
import api, { clearToken } from "../lib/api";
import { sortJobs } from "../lib/utils-date";
import JobCard from "../components/JobCard";
import JobFormModal from "../components/JobFormModal";
import SmartPasteModal from "../components/SmartPasteModal";

const TABS = [
  { key: "all",     label: "All",     icon: <BookOpen size={16} /> },
  { key: "pending", label: "Pending", icon: <Clock size={16} /> },
  { key: "applied", label: "Applied", icon: <CheckCircle2 size={16} /> },
  { key: "notices", label: "Notices", icon: <Bell size={16} /> },
];

export default function AdminDashboard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [prefill, setPrefill] = useState(null);
  const [tab, setTab] = useState("all");
  const navigate = useNavigate();

  const today = new Date().toISOString().split("T")[0];
  const getStatus = (j) => {
    if (j.applied) return "applied";
    const f = j.start_date && j.start_date > today;
    const b = !j.start_date && !j.exam_date && !j.last_date;
    return (f || b) ? "notices" : "pending";
  };

  const fetchJobs = async () => {
    setLoading(true);
    try { setJobs(sortJobs(await api.listJobs())); }
    catch (e) { if (e?.response?.status === 401) { clearToken(); navigate("/admin/login"); } else toast.error("Load failed"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchJobs(); }, []);

  const counts = useMemo(() => ({
    all: jobs.length,
    pending: jobs.filter(j => getStatus(j) === "pending").length,
    applied: jobs.filter(j => getStatus(j) === "applied").length,
    notices: jobs.filter(j => getStatus(j) === "notices").length,
  }), [jobs]);

  const visible = useMemo(() => {
    let list = tab === "all" ? jobs : jobs.filter(j => getStatus(j) === tab);
    if (tab === "applied") list = [...list].sort((a, b) => {
      if (!a.exam_date) return 1; if (!b.exam_date) return -1;
      return new Date(a.exam_date) - new Date(b.exam_date);
    });
    return list;
  }, [jobs, tab]);

  const handleSave = async (payload) => {
    try {
      if (editingJob) { await api.updateJob(editingJob.id, payload); toast.success("Updated ✅"); }
      else { await api.createJob(payload); toast.success("Published ✅"); }
      setFormOpen(false); setEditingJob(null); setPrefill(null); fetchJobs();
    } catch (e) { toast.error(e?.response?.data?.detail || "Save failed"); }
  };
  const handleDelete = async (job) => {
    if (!window.confirm(`Delete "${job.job_name}"?`)) return;
    try { await api.deleteJob(job.id); toast.success("Deleted"); fetchJobs(); }
    catch { toast.error("Delete failed"); }
  };
  const handleToggle = async (job) => {
    try { await api.toggleApplied(job.id); toast.success("Updated!"); fetchJobs(); }
    catch { toast.error("Update failed"); }
  };

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", overflowX: "hidden" }}>

      {/* Header */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(15,15,26,0.9)", backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border)",
        paddingTop: "calc(16px + var(--safe-top))",
        paddingBottom: "14px", paddingLeft: "20px", paddingRight: "20px"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Editor's Desk</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--ink)", letterSpacing: "-0.02em" }}>Admin Panel</div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <Link to="/" style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "44px", height: "44px", borderRadius: "50%",
              background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)",
              color: "var(--ink)", textDecoration: "none"
            }}>
              <ArrowLeft size={18} />
            </Link>
            <button type="button" onClick={fetchJobs} style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "44px", height: "44px", borderRadius: "50%",
              background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)",
              color: "var(--ink)", cursor: "pointer"
            }}>
              <RefreshCw size={16} />
            </button>
            <button type="button" onClick={() => { clearToken(); toast.success("Signed out"); navigate("/"); }} style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "44px", height: "44px", borderRadius: "50%",
              background: "rgba(255,101,132,0.1)", border: "1px solid rgba(255,101,132,0.25)",
              color: "var(--accent-2)", cursor: "pointer"
            }}>
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
          <button type="button" onClick={() => { setEditingJob(null); setPrefill(null); setFormOpen(true); }} className="btn-primary" style={{ flex: 1, minHeight: "48px", fontSize: "0.9375rem" }} data-testid="new-job-btn">
            <Plus size={18} /> New Job
          </button>
          <button type="button" onClick={() => setPasteOpen(true)} className="btn-secondary" style={{ flex: 1, minHeight: "48px", fontSize: "0.9375rem" }} data-testid="smart-paste-btn">
            <Sparkles size={18} /> Smart Paste
          </button>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "var(--radius-md)", padding: "4px" }}>
          {TABS.map(({ key, label, icon }) => (
            <button key={key} type="button" onClick={() => setTab(key)} style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
              padding: "9px 4px",
              background: tab === key ? "var(--accent)" : "transparent",
              borderRadius: "calc(var(--radius-md) - 2px)",
              border: "none", color: tab === key ? "white" : "var(--ink-muted)",
              fontSize: "0.8125rem", fontWeight: 700, cursor: "pointer",
              transition: "all 0.2s ease"
            }}>
              {icon}
              <span style={{ display: counts[key] > 9 ? "none" : undefined }}>{counts[key]}</span>
            </button>
          ))}
        </div>
      </header>

      <main style={{ padding: "20px 20px 100px" }}>
        <div style={{ fontSize: "0.8rem", color: "var(--ink-muted)", fontWeight: 600, marginBottom: "14px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {counts[tab]} job{counts[tab] !== 1 ? "s" : ""} {tab === "all" ? "total" : `in ${tab}`}
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ background: "var(--bg-card)", borderRadius: "var(--radius-lg)", padding: "24px", border: "1px solid var(--border)" }}>
                <div className="skeleton" style={{ height: "20px", width: "65%", marginBottom: "12px" }} />
                <div className="skeleton" style={{ height: "14px", width: "40%" }} />
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", background: "var(--bg-card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: "3rem", marginBottom: "12px" }}>📋</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--ink)", marginBottom: "6px" }}>No jobs here</div>
            <div style={{ fontSize: "0.9375rem", color: "var(--ink-muted)" }}>Tap "New Job" or "Smart Paste" to add one</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }} data-testid="admin-jobs-grid">
            {visible.map((job, i) => (
              <div key={job.id} className="anim-fade-up" style={{ animationDelay: `${i * 0.04}s` }}>
                <JobCard job={job} admin onEdit={j => { setEditingJob(j); setPrefill(null); setFormOpen(true); }} onDelete={handleDelete} onToggle={handleToggle} />
              </div>
            ))}
          </div>
        )}
      </main>

      <JobFormModal open={formOpen} onClose={() => { setFormOpen(false); setEditingJob(null); setPrefill(null); }} onSave={handleSave} initial={editingJob} prefill={prefill} />
      <SmartPasteModal open={pasteOpen} onClose={() => setPasteOpen(false)} onParsed={data => { setPasteOpen(false); setEditingJob(null); setPrefill(data); setFormOpen(true); }} />
    </div>
  );
}
