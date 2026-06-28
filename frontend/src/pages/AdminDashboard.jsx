import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Plus, Sparkles, LogOut, Newspaper, ArrowLeft,
  BookOpen, CheckCircle, Clock, Archive, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import api, { clearToken } from "../lib/api";
import { sortJobs } from "../lib/utils-date";
import JobCard from "../components/JobCard";
import JobFormModal from "../components/JobFormModal";
import SmartPasteModal from "../components/SmartPasteModal";

const TAB_DEFS = [
  { key: "all",     label: "All",     Icon: BookOpen },
  { key: "pending", label: "Pending", Icon: Clock },
  { key: "applied", label: "Applied", Icon: CheckCircle },
  { key: "notices", label: "Notices", Icon: Newspaper },
];

export default function AdminDashboard() {
  const [jobs, setJobs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [prefill, setPrefill]   = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const navigate = useNavigate();

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const data = await api.listJobs();
      setJobs(sortJobs(data));
    } catch (e) {
      if (e?.response?.status === 401) { clearToken(); navigate("/admin/login"); }
      else toast.error("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJobs(); }, []);

  const today = new Date().toISOString().split("T")[0];

  const getStatus = (j) => {
    if (j.applied) return "applied";
    const isFuture = j.start_date && j.start_date > today;
    const allBlank = !j.start_date && !j.exam_date && !j.last_date;
    return (isFuture || allBlank) ? "notices" : "pending";
  };

  const counts = useMemo(() => ({
    all:     jobs.length,
    pending: jobs.filter((j) => getStatus(j) === "pending").length,
    applied: jobs.filter((j) => getStatus(j) === "applied").length,
    notices: jobs.filter((j) => getStatus(j) === "notices").length,
  }), [jobs]);

  const visibleJobs = useMemo(() => {
    let list = activeTab === "all" ? jobs : jobs.filter((j) => getStatus(j) === activeTab);
    // Sort applied by exam date
    if (activeTab === "applied") {
      list = [...list].sort((a, b) => {
        if (!a.exam_date) return 1;
        if (!b.exam_date) return -1;
        return new Date(a.exam_date) - new Date(b.exam_date);
      });
    }
    return list;
  }, [jobs, activeTab]);

  const handleLogout = () => { clearToken(); toast.success("Signed out"); navigate("/"); };
  const handleNew = () => { setEditingJob(null); setPrefill(null); setFormOpen(true); };
  const handleEdit = (job) => { setEditingJob(job); setPrefill(null); setFormOpen(true); };

  const handleSave = async (payload) => {
    try {
      if (editingJob) { await api.updateJob(editingJob.id, payload); toast.success("Job updated ✅"); }
      else { await api.createJob(payload); toast.success("Job published ✅"); }
      setFormOpen(false); setEditingJob(null); setPrefill(null);
      fetchJobs();
    } catch (e) { toast.error(e?.response?.data?.detail || "Save failed"); }
  };

  const handleDelete = async (job) => {
    if (!window.confirm(`Delete "${job.job_name}"?`)) return;
    try { await api.deleteJob(job.id); toast.success("Job deleted"); fetchJobs(); }
    catch (e) { toast.error("Delete failed"); }
  };

  const handleToggle = async (job) => {
    try {
      await api.toggleApplied(job.id);
      toast.success(job.applied ? "Marked unapplied 🔄" : "Marked applied ✅");
      fetchJobs();
    } catch (e) { toast.error("Update failed"); }
  };

  const handleParsed = (data) => {
    setPasteOpen(false); setEditingJob(null);
    setPrefill(data); setFormOpen(true);
  };

  return (
    <div className="min-h-screen pb-16" data-testid="admin-dashboard">
      {/* Top bar */}
      <header className="border-b-4 border-[#2C2A26] bg-[#FCFAF5] sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Newspaper size={26} strokeWidth={1.25} className="text-[#2C2A26] shrink-0" />
            <div className="min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#59554D]">Editor's Desk</div>
              <h1 className="font-serif font-bold text-lg sm:text-2xl text-[#2C2A26] truncate">
                The Job Ledger · Admin
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/"
              className="hidden sm:inline-flex items-center gap-1.5 bg-transparent text-[#2C2A26] font-serif font-bold text-sm px-3 py-2 border-2 border-[#2C2A26] hover:bg-[#EBE5D9] transition-colors"
              data-testid="view-public-link"
            >
              <ArrowLeft size={13} /> Public View
            </Link>
            <button
              onClick={fetchJobs}
              className="p-2 text-[#59554D] hover:text-[#2C2A26] border-2 border-transparent hover:border-[#2C2A26] transition-colors"
              title="Refresh jobs"
              type="button"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 bg-transparent text-[#8C3A3A] font-serif font-bold text-sm px-3 py-2 border-2 border-[#8C3A3A] hover:bg-[#8C3A3A] hover:text-[#FCFAF5] transition-colors"
              data-testid="logout-btn"
              type="button"
            >
              <LogOut size={13} /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
        {/* Action buttons */}
        <section className="flex flex-wrap gap-3">
          <button
            onClick={handleNew}
            className="inline-flex items-center justify-center gap-2 bg-[#2C2A26] text-[#FCFAF5] font-serif font-bold text-base px-5 py-3 border-2 border-[#2C2A26] hover:bg-transparent hover:text-[#2C2A26] transition-colors"
            data-testid="new-job-btn"
            type="button"
          >
            <Plus size={18} /> New Job
          </button>
          <button
            onClick={() => setPasteOpen(true)}
            className="inline-flex items-center justify-center gap-2 bg-[#FCFAF5] text-[#2C2A26] font-serif font-bold text-base px-5 py-3 border-2 border-[#2C2A26] hover:bg-[#EBE5D9] transition-colors shadow-stamp"
            data-testid="smart-paste-btn"
            type="button"
          >
            <Sparkles size={18} /> Smart Paste (AI)
          </button>
        </section>

        {/* Tab bar */}
        <div className="flex gap-1 border-b-2 border-[#2C2A26]">
          {TAB_DEFS.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 font-mono text-xs sm:text-sm uppercase tracking-wider transition-colors border-b-2 -mb-[2px] ${
                activeTab === key
                  ? "border-[#B5651D] text-[#2C2A26] font-bold"
                  : "border-transparent text-[#59554D] hover:text-[#2C2A26]"
              }`}
            >
              <Icon size={13} />
              {label}
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                activeTab === key ? "bg-[#2C2A26] text-[#FCFAF5]" : "bg-[#EBE5D9] text-[#59554D]"
              }`}>
                {counts[key]}
              </span>
            </button>
          ))}
        </div>

        {/* Jobs grid */}
        <section
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-7"
          data-testid="admin-jobs-grid"
        >
          {loading ? (
            <p className="font-mono text-sm text-[#59554D]" data-testid="admin-loading">Loading...</p>
          ) : visibleJobs.length === 0 ? (
            <div className="col-span-full bg-[#FCFAF5] border-2 border-dashed border-[#59554D] p-10 text-center">
              <Newspaper size={40} strokeWidth={1.25} className="mx-auto text-[#59554D] mb-3" />
              <h3 className="font-serif font-bold text-xl text-[#2C2A26]">No jobs in this tab</h3>
              <p className="font-sans text-sm text-[#59554D] mt-1">
                Click <em>New Job</em> or use <em>Smart Paste</em> to add one.
              </p>
            </div>
          ) : (
            visibleJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                admin
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggle={handleToggle}
              />
            ))
          )}
        </section>
      </main>

      <JobFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingJob(null); setPrefill(null); }}
        onSave={handleSave}
        initial={editingJob}
        prefill={prefill}
      />
      <SmartPasteModal
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        onParsed={handleParsed}
      />
    </div>
  );
}
