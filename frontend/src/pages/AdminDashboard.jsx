
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Plus, Sparkles, LogOut, ArrowLeft, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import api, { clearToken } from "../lib/api";
import { sortJobs } from "../lib/utils-date";
import JobCard from "../components/JobCard";
import JobFormModal from "../components/JobFormModal";
import SmartPasteModal from "../components/SmartPasteModal";

const TABS = [{ k: "all", l: "All" }, { k: "pending", l: "Pending" }, { k: "applied", l: "Applied" }, { k: "notices", l: "Notices" }];

export default function AdminDashboard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [prefill, setPrefill] = useState(null);
  const [tab, setTab] = useState("all");
  const nav = useNavigate();
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
    catch (e) { if (e?.response?.status === 401) { clearToken(); nav("/admin/login"); } else toast.error("Load failed"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const counts = useMemo(() => ({ all: jobs.length, pending: jobs.filter(j => getStatus(j) === "pending").length, applied: jobs.filter(j => getStatus(j) === "applied").length, notices: jobs.filter(j => getStatus(j) === "notices").length }), [jobs]);

  const visible = useMemo(() => {
    let l = tab === "all" ? jobs : jobs.filter(j => getStatus(j) === tab);
    if (tab === "applied") l = [...l].sort((a, b) => !a.exam_date ? 1 : !b.exam_date ? -1 : new Date(a.exam_date) - new Date(b.exam_date));
    return l;
  }, [jobs, tab]);

  const save = async (payload) => {
    try {
      if (editingJob) { await api.updateJob(editingJob.id, payload); toast.success("Updated"); }
      else { await api.createJob(payload); toast.success("Job added"); }
      setFormOpen(false); setEditingJob(null); setPrefill(null); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Save failed"); }
  };
  const del = async (job) => {
    if (!window.confirm(`Delete "${job.job_name}"?`)) return;
    try { await api.deleteJob(job.id); toast.success("Deleted"); load(); } catch { toast.error("Delete failed"); }
  };
  const toggle = async (job) => {
    try { await api.toggleApplied(job.id); toast.success("Updated"); load(); } catch { toast.error("Failed"); }
  };

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg-primary)", display: "flex", flexDirection: "column", height: "100dvh", overflow: "hidden" }}>
      <div className="nav-inline-title" style={{ flexDirection: "column", alignItems: "stretch", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--label-3)", textTransform: "uppercase", letterSpacing: ".05em" }}>Admin</div>
            <div style={{ fontSize: 19, fontWeight: 800, color: "var(--label-1)" }}>Job Manager</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link to="/" className="btn btn-gray btn-icon"><ArrowLeft size={18} /></Link>
            <button type="button" onClick={load} className="btn btn-gray btn-icon"><RefreshCw size={16} /></button>
            <button type="button" onClick={() => { clearToken(); toast.success("Signed out"); nav("/"); }} className="btn btn-danger-tinted btn-icon"><LogOut size={16} /></button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => { setEditingJob(null); setPrefill(null); setFormOpen(true); }} className="btn btn-filled" data-testid="new-job-btn" style={{ flex: 1 }}><Plus size={17} /> New Job</button>
          <button type="button" onClick={() => setPasteOpen(true)} className="btn btn-tinted" data-testid="smart-paste-btn" style={{ flex: 1 }}><Sparkles size={17} /> Smart Paste</button>
        </div>
        <div style={{ display: "flex", background: "var(--fill-3)", borderRadius: 12, padding: 3, gap: 3 }}>
          {TABS.map(({ k, l }) => (
            <button key={k} type="button" onClick={() => setTab(k)} style={{
              flex: 1, padding: "8px 4px", borderRadius: 9, border: "none", cursor: "pointer",
              background: tab === k ? "#fff" : "transparent",
              color: tab === k ? "var(--label-1)" : "var(--label-3)",
              fontWeight: tab === k ? 700 : 500, fontSize: 13,
              boxShadow: tab === k ? "0 1px 3px rgba(0,0,0,.1)" : "none",
              transition: "all .18s ease",
            }}>{l} <span style={{ fontSize: 11, color: tab === k ? "var(--ios-blue)" : "var(--label-4)", fontWeight: 700 }}>({counts[k]})</span></button>
          ))}
        </div>
      </div>

      <div className="app-scroll" style={{ padding: "14px 16px" }}>
        {loading ? (
          <>{[1, 2, 3].map(i => <div key={i} className="ios-card" style={{ padding: 18, marginBottom: 12 }}><div className="ios-skel" style={{ height: 17, width: "60%", marginBottom: 12 }} /><div className="ios-skel" style={{ height: 13, width: "38%" }} /></div>)}</>
        ) : visible.length === 0 ? (
          <div className="ios-card a-pop" style={{ padding: "52px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "var(--label-1)", marginBottom: 6 }}>No jobs here</div>
            <div style={{ fontSize: 14, color: "var(--label-3)" }}>Tap New Job or Smart Paste to add one</div>
          </div>
        ) : (
          <div data-testid="admin-jobs-grid">
            {visible.map((job, i) => (
              <div key={job.id} className="a-up" style={{ animationDelay: i * .04 + "s", marginBottom: 12 }}>
                <JobCard job={job} admin onEdit={j => { setEditingJob(j); setPrefill(null); setFormOpen(true); }} onDelete={del} onToggle={toggle} />
              </div>
            ))}
          </div>
        )}
      </div>

      <JobFormModal open={formOpen} onClose={() => { setFormOpen(false); setEditingJob(null); setPrefill(null); }} onSave={save} initial={editingJob} prefill={prefill} />
      <SmartPasteModal open={pasteOpen} onClose={() => setPasteOpen(false)} onParsed={data => { setPasteOpen(false); setEditingJob(null); setPrefill(data); setFormOpen(true); }} />
    </div>
  );
}
