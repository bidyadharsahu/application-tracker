import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Newspaper, Search, KeyRound, ChevronDown, ChevronUp, Bell } from "lucide-react";
import api from "../lib/api";
import { sortJobs } from "../lib/utils-date";
import JobCard from "../components/JobCard";
import DeadlineAlert from "../components/DeadlineAlert";
import PWAInstallBanner from "../components/PWAInstallBanner";
import { toast } from "sonner";

export default function Landing() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(null); // null = nothing expanded

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const data = await api.listJobs();
      setJobs(sortJobs(data));
    } catch (e) {
      console.error(e);
      toast.error("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleApplied = async (job) => {
    try {
      const updatedJob = await api.toggleApplied(job.id);
      setJobs((prev) => sortJobs(prev.map((j) => (j.id === job.id ? updatedJob : j))));
      toast.success(`Marked as ${updatedJob.applied ? "Applied ✅" : "Pending 🔄"}!`);
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  useEffect(() => {
    api.deleteExpiredUnappliedJobs();
    fetchJobs();
  }, []);

  const today = new Date().toISOString().split("T")[0];

  // Notify user about newly started jobs
  useEffect(() => {
    if (jobs.length === 0) return;
    jobs.forEach(async (j) => {
      if (j.start_date && j.start_date <= today && !j.notified && !j.applied) {
        toast.success(`🚀 "${j.job_name}" applications are now OPEN!`, { duration: 8000 });
        try {
          await api.markNotified(j.id);
          setJobs((prev) => prev.map((job) => (job.id === j.id ? { ...job, notified: true } : job)));
        } catch (e) {
          console.error("Failed to mark notified", e);
        }
      }
    });
  }, [jobs]);

  // Categorise jobs
  const getJobStatus = (j) => {
    if (j.applied) return "applied";
    const isFuture = j.start_date && j.start_date > today;
    const allDatesBlank = !j.start_date && !j.exam_date && !j.last_date;
    if (isFuture || allDatesBlank) return "notices";
    return "pending";
  };

  const counts = useMemo(() => ({
    pending: jobs.filter((j) => getJobStatus(j) === "pending").length,
    applied: jobs.filter((j) => getJobStatus(j) === "applied").length,
    notices: jobs.filter((j) => getJobStatus(j) === "notices").length,
  }), [jobs]);

  // Filtered list for the expanded section
  const filteredJobs = useMemo(() => {
    if (!filter) return [];
    let list = jobs.filter((j) => {
      const statusMatch = getJobStatus(j) === filter;
      const queryMatch =
        !query ||
        j.job_name?.toLowerCase().includes(query.toLowerCase()) ||
        (j.notes && j.notes.toLowerCase().includes(query.toLowerCase())) ||
        (j.tags && j.tags.toLowerCase().includes(query.toLowerCase()));
      return statusMatch && queryMatch;
    });

    // Sort applied by exam date (soonest first, no date goes to bottom)
    if (filter === "applied") {
      list = [...list].sort((a, b) => {
        if (!a.exam_date) return 1;
        if (!b.exam_date) return -1;
        return new Date(a.exam_date) - new Date(b.exam_date);
      });
    }
    return list;
  }, [jobs, filter, query]);

  const handleCardClick = (key) => {
    setFilter((prev) => (prev === key ? null : key));
    setQuery("");
  };

  // Next upcoming exam (applied jobs only)
  const nextExam = useMemo(() => {
    return jobs
      .filter((j) => j.applied && j.exam_date && new Date(j.exam_date) >= new Date())
      .sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date))[0] || null;
  }, [jobs]);

  return (
    <div className="min-h-screen pb-24" data-testid="landing-page">
      {/* Header */}
      <header className="border-b-4 border-[#2C2A26] bg-[#FCFAF5]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex justify-between items-start sm:items-center">
            <div>
              <h1
                className="font-sans font-bold text-3xl sm:text-5xl text-[#2C2A26] leading-none tracking-tight"
                data-testid="site-title"
              >
                JOB APPLICATION
              </h1>
              <LiveClock />
            </div>
            <Link
              to="/admin/login"
              className="inline-flex items-center gap-2 bg-transparent text-[#2C2A26] font-serif font-bold text-sm sm:text-base px-4 py-2 border-2 border-[#2C2A26] hover:bg-[#2C2A26] hover:text-[#FCFAF5] transition-colors"
              data-testid="admin-login-link"
            >
              <KeyRound size={16} /> Add
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
        {/* Deadline popup alert */}
        <DeadlineAlert jobs={jobs} />

        {/* Next exam banner */}
        {nextExam && <NextExamBanner job={nextExam} />}

        {/* ── 3 Status cards — click to expand ── */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {[
            { key: "pending", label: "Pending", emoji: "🟡", hint: "Tap to see unapplied jobs" },
            { key: "applied", label: "Applied", emoji: "🟢", hint: "Tap to see applied jobs sorted by exam" },
            { key: "notices", label: "Notices", emoji: "🔵", hint: "Future / upcoming" },
          ].map(({ key, label, emoji, hint }) => {
            const isActive = filter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleCardClick(key)}
                title={hint}
                className={`cursor-pointer p-4 sm:p-5 rounded-xl border-2 shadow-stamp transition-all duration-200 text-center focus-visible:outline-dashed focus-visible:outline-2 focus-visible:outline-[#2C2A26] ${
                  isActive
                    ? "border-[#B5651D] bg-amber-50 shadow-stamp-lg -translate-y-0.5"
                    : "border-[#2C2A26] bg-[#FCFAF5] hover:bg-[#EBE5D9]"
                }`}
                aria-expanded={isActive}
                aria-controls={`section-${key}`}
                data-testid={`filter-card-${key}`}
              >
                <div className="text-3xl sm:text-5xl font-bold font-serif text-[#2C2A26]">
                  {loading ? "—" : counts[key]}
                </div>
                <div className="text-sm sm:text-base font-mono uppercase tracking-wider text-[#59554D] mt-2">
                  {emoji} {label}
                </div>
                <div className="mt-1 flex justify-center">
                  {isActive ? (
                    <ChevronUp size={14} className="text-[#B5651D]" />
                  ) : (
                    <ChevronDown size={14} className="text-[#59554D]" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Expanded section ── */}
        {filter && (
          <div id={`section-${filter}`} className="space-y-5 animate-notice">
            {/* Section header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="font-serif font-bold text-xl sm:text-2xl text-[#2C2A26] capitalize">
                {filter === "pending" && "📋 Pending — not yet applied"}
                {filter === "applied" && "✅ Applied — sorted by exam date"}
                {filter === "notices" && "🔵 Notices — upcoming / future"}
              </h2>
              <div className="font-mono text-xs uppercase tracking-wider text-[#59554D]">
                {filteredJobs.length} job{filteredJobs.length !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Search within section */}
            <div className="relative">
              <Search size={18} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#59554D]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${filter} jobs...`}
                className="font-mono text-base bg-[#FCFAF5] border-2 border-[#2C2A26] w-full pl-10 pr-3 py-2.5 outline-none focus:shadow-stamp transition-shadow"
                data-testid="search-input"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#59554D] hover:text-[#2C2A26]"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Jobs grid */}
            <section
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-7"
              data-testid="jobs-grid"
            >
              {loading ? (
                <SkeletonCards />
              ) : filteredJobs.length === 0 ? (
                <EmptyState query={query} filter={filter} />
              ) : (
                filteredJobs.map((job) => (
                  <JobCard key={job.id} job={job} onToggle={handleToggleApplied} />
                ))
              )}
            </section>
          </div>
        )}

        {/* ── Show prompt if nothing selected ── */}
        {!filter && !loading && (
          <div className="text-center py-8">
            <Bell size={32} strokeWidth={1.25} className="mx-auto text-[#59554D] mb-3" />
            <p className="font-mono text-base text-[#59554D] uppercase tracking-wider">
              Tap a card above to view jobs
            </p>
          </div>
        )}
      </main>

      <footer className="border-t-2 border-dashed border-[#59554D] mt-12 py-6 px-4 text-center">
        <p className="font-mono text-xs uppercase tracking-wider text-[#59554D]">
          DESIGNED IN GOOD FAITH · NEVER MISS AN EXAM 📅
        </p>
      </footer>

      <PWAInstallBanner />
    </div>
  );
}

// ── Next exam banner ──────────────────────────────────────────────────────────
function NextExamBanner({ job }) {
  const days = Math.ceil((new Date(job.exam_date) - new Date()) / (1000 * 60 * 60 * 24));
  const urgent = days <= 7;
  return (
    <div
      className={`border-2 rounded-lg p-3 text-center ${
        urgent
          ? "bg-red-50 border-[#8C3A3A] text-[#8C3A3A]"
          : "bg-amber-50 border-[#B5651D] text-[#B5651D]"
      }`}
    >
      <p className="font-serif font-bold text-sm sm:text-base">
        {urgent ? "🚨" : "📝"} Next Exam:{" "}
        <strong>{job.job_name}</strong> — in{" "}
        <strong>{days} day{days !== 1 ? "s" : ""}</strong>
        {" "}({new Date(job.exam_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })})
      </p>
    </div>
  );
}

// ── Live clock ────────────────────────────────────────────────────────────────
function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="font-mono text-xs sm:text-sm text-[#59554D] mt-1 sm:mt-2">
      {now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      {" · "}
      {now.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
    </div>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────
function SkeletonCards() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-[#FCFAF5] border-2 border-[#2C2A26] shadow-stamp p-5 animate-pulse h-56">
          <div className="h-6 bg-[#EBE5D9] w-3/4 mb-3 rounded" />
          <div className="h-4 bg-[#EBE5D9] w-1/2 mb-2 rounded" />
          <div className="h-4 bg-[#EBE5D9] w-1/3 rounded" />
        </div>
      ))}
    </>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ query, filter }) {
  return (
    <div className="col-span-full bg-[#FCFAF5] border-2 border-dashed border-[#59554D] p-10 text-center" data-testid="empty-state">
      <Newspaper size={42} strokeWidth={1.25} className="mx-auto text-[#59554D] mb-3" />
      <h3 className="font-serif font-bold text-xl text-[#2C2A26]">
        {query ? "No matching jobs" : `No ${filter} jobs yet`}
      </h3>
      <p className="font-sans text-base text-[#59554D] mt-1">
        {query ? "Try a different keyword." : "Add jobs from the admin panel."}
      </p>
    </div>
  );
}
