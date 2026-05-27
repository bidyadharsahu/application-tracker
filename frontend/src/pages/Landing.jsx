import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Newspaper, Search, BookOpenCheck, Calendar, Filter, KeyRound } from "lucide-react";
import api from "../lib/api";
import { sortJobs } from "../lib/utils-date";
import JobCard from "../components/JobCard";
import DeadlineAlert from "../components/DeadlineAlert";
import PWAInstallBanner from "../components/PWAInstallBanner";
import { toast } from "sonner";

const filters = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "future", label: "Future" },
  { key: "applied", label: "Applied" },
  { key: "upcoming", label: "Closing soon" },
];

export default function Landing() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const data = await api.listJobs();
      setJobs(sortJobs(data));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleApplied = async (job) => {
    try {
      const updatedJob = await api.toggleApplied(job.id);
      setJobs((prev) => {
        const nextJobs = prev.map((j) => (j.id === job.id ? updatedJob : j));
        return sortJobs(nextJobs);
      });
      toast.success(`Marked as ${updatedJob.applied ? "Applied" : "Pending"}!`);
    } catch (e) {
      toast.error("Failed to update status");
      console.error(e);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    // Check for newly active jobs and notify
    if (jobs.length > 0) {
      jobs.forEach(async (j) => {
        if (j.start_date && j.start_date <= today && !j.notified && !j.applied) {
          toast.success(`🚀 Applications for "${j.job_name}" have officially started!`, {
            duration: 8000,
          });
          try {
            await api.markNotified(j.id);
            setJobs(prev => prev.map(job => job.id === j.id ? { ...job, notified: true } : job));
          } catch (e) {
            console.error("Failed to mark notified", e);
          }
        }
      });
    }
  }, [jobs]);

  const filtered = jobs.filter((j) => {
    const isFuture = j.start_date && j.start_date > today;
    const matchQuery =
      !query ||
      j.job_name.toLowerCase().includes(query.toLowerCase()) ||
      (j.notes && j.notes.toLowerCase().includes(query.toLowerCase())) ||
      (j.tags && j.tags.toLowerCase().includes(query.toLowerCase()));
    if (!matchQuery) return false;
    
    if (filter === "future") return !j.applied && isFuture;
    if (filter === "pending") return !j.applied && !isFuture;
    if (filter === "applied") return j.applied;
    if (filter === "upcoming") {
      if (j.applied || isFuture) return false;
      const target = new Date(j.last_date + "T23:59:59");
      const daysLeft = Math.ceil((target - new Date()) / (1000 * 60 * 60 * 24));
      return daysLeft >= 0 && daysLeft <= 15;
    }
    return true;
  });

  const stats = {
    total: jobs.length,
    pending: jobs.filter((j) => !j.applied && (!j.start_date || j.start_date <= today)).length,
    applied: jobs.filter((j) => j.applied).length,
  };

  return (
    <div className="min-h-screen pb-24" data-testid="landing-page">
      <header className="border-b-4 border-[#2C2A26] bg-[#FCFAF5]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex justify-between items-start sm:items-center">
            <div>
              <h1
                className="font-serif font-black text-3xl sm:text-5xl text-[#2C2A26] leading-none tracking-tight"
                data-testid="site-title"
              >
                JOB APPLICATION
              </h1>
              <LiveClock />
            </div>
            <div>
              <Link
                to="/admin/login"
                className="inline-flex items-center gap-2 bg-transparent text-[#2C2A26] font-serif font-bold text-sm sm:text-base px-4 py-2 border-2 border-[#2C2A26] hover:bg-[#2C2A26] hover:text-[#FCFAF5] transition-colors"
                data-testid="admin-login-link"
              >
                <KeyRound size={16} /> Add
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
        {/* Stats Bar */}
        <section className="grid grid-cols-3 gap-3 sm:gap-4" data-testid="stats-bar">
          <StatBox label="Notices" value={stats.total} icon={<BookOpenCheck size={18} />} />
          <StatBox
            label="Pending"
            value={stats.pending}
            icon={<Calendar size={18} />}
            accent="red"
          />
          <StatBox
            label="Applied"
            value={stats.applied}
            icon={<BookOpenCheck size={18} />}
            accent="green"
          />
        </section>

        {/* Deadline alert */}
        <DeadlineAlert jobs={jobs} />

        {/* Filters & Search */}
        <section className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative flex-1">
            <Search
              size={18}
              strokeWidth={1.5}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#59554D]"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notices..."
              className="font-mono text-base bg-[#FCFAF5] border-2 border-[#2C2A26] w-full pl-10 pr-3 py-2.5 outline-none focus:shadow-stamp transition-shadow"
              data-testid="search-input"
            />
          </div>
          <div
            className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 pb-1"
            data-testid="filter-tabs"
          >
            <Filter size={16} className="text-[#59554D] shrink-0" />
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`font-mono uppercase tracking-widest text-xs px-3 py-2 border-2 transition-colors shrink-0 ${
                  filter === f.key
                    ? "bg-[#2C2A26] text-[#FCFAF5] border-[#2C2A26]"
                    : "bg-transparent text-[#2C2A26] border-[#2C2A26] hover:bg-[#EBE5D9]"
                }`}
                data-testid={`filter-${f.key}`}
                type="button"
              >
                {f.label}
              </button>
            ))}
          </div>
        </section>

        {/* Jobs Grid */}
        <section
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-7"
          data-testid="jobs-grid"
        >
          {loading ? (
            <SkeletonCards />
          ) : filtered.length === 0 ? (
            <EmptyState query={query} />
          ) : (
            filtered.map((job) => <JobCard key={job.id} job={job} onToggle={handleToggleApplied} />)
          )}
        </section>
      </main>

      <footer className="border-t-2 border-dashed border-[#59554D] mt-12 py-6 px-4 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-[#59554D]">
          DESIGNED IN GOOD FAITH · ACCIDENTALLY UPDATED BY ME IN 2026 😅
        </p>
      </footer>

      <PWAInstallBanner />
    </div>
  );
}

function LiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = now.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const timeStr = now.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <div className="font-mono text-xs sm:text-sm text-[#59554D] mt-1 sm:mt-2">
      {timeStr} · {dateStr}
    </div>
  );
}

function StatBox({ label, value, icon, accent }) {
  const color =
    accent === "red"
      ? "text-[#8C3A3A]"
      : accent === "green"
      ? "text-[#3A5A40]"
      : "text-[#2C2A26]";
  return (
    <div
      className="bg-[#FCFAF5] border-2 border-[#2C2A26] shadow-stamp p-3 sm:p-5"
      data-testid={`stat-${label.toLowerCase()}`}
    >
      <div className="flex items-center gap-2 text-[#59554D]">
        {icon}
        <span className="font-mono text-[10px] sm:text-xs uppercase tracking-widest">
          {label}
        </span>
      </div>
      <div className={`font-serif font-black text-3xl sm:text-5xl mt-1 ${color}`}>
        {value}
      </div>
    </div>
  );
}

function SkeletonCards() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-[#FCFAF5] border-2 border-[#2C2A26] shadow-stamp p-5 animate-pulse h-56"
        >
          <div className="h-6 bg-[#EBE5D9] w-3/4 mb-3" />
          <div className="h-4 bg-[#EBE5D9] w-1/2 mb-2" />
          <div className="h-4 bg-[#EBE5D9] w-1/3" />
        </div>
      ))}
    </>
  );
}

function EmptyState({ query }) {
  return (
    <div
      className="col-span-full bg-[#FCFAF5] border-2 border-dashed border-[#59554D] p-10 text-center"
      data-testid="empty-state"
    >
      <Newspaper size={42} strokeWidth={1.25} className="mx-auto text-[#59554D] mb-3" />
      <h3 className="font-serif font-bold text-xl text-[#2C2A26]">
        {query ? "No matching notices" : "No notices yet"}
      </h3>
      <p className="font-sans text-sm text-[#59554D] mt-1">
        {query
          ? "Try a different search keyword."
          : "The Editor will post new jobs here soon."}
      </p>
    </div>
  );
}
