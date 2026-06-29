
import React, { useEffect, useState, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";
import { Home, CheckCircle2, Bell, Settings } from "lucide-react";
import Landing from "./pages/Landing";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import { isAuthed } from "./lib/api";
import { supabase } from "./lib/supabase";
import "./App.css";

const RequireAuth = ({ children }) =>
  isAuthed() ? children : <Navigate to="/admin/login" replace />;

/* Bottom nav only on public-facing pages */
function BottomNav({ urgentCount }) {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  if (path.startsWith("/admin")) return null;

  const tabs = [
    { to: "/",        icon: Home,         label: "Home",     match: "/" },
    { to: "/?tab=applied", icon: CheckCircle2, label: "Applied",  match: "applied" },
    { to: "/?tab=notices", icon: Bell,         label: "Notices",  match: "notices" },
    { to: "/admin/login",  icon: Settings,     label: "Admin",    match: "/admin" },
  ];

  return (
    <nav className="bottom-nav" role="navigation">
      {tabs.map(({ to, icon: Icon, label, match }) => {
        const isActive =
          match === "/" ? path === "/" && !location.search :
          match === "/admin" ? false :
          location.search.includes("tab=" + match);
        return (
          <button
            key={label}
            type="button"
            className={"nav-item" + (isActive ? " active" : "")}
            onClick={() => navigate(to)}
          >
            <div className="nav-icon">
              <Icon
                size={20}
                strokeWidth={isActive ? 2.5 : 1.75}
                color={isActive ? "#fff" : "var(--t3)"}
              />
              {label === "Home" && urgentCount > 0 && !isActive && (
                <span className="nav-badge">{urgentCount}</span>
              )}
            </div>
            <span className="nav-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function AppShell() {
  const [urgentCount, setUrgentCount] = useState(0);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    const check = async () => {
      if (Notification.permission !== "granted") return;
      const today = new Date();
      const { data: applied } = await supabase.from("jobs")
        .select("job_name,exam_date").not("exam_date", "is", null).eq("applied", true);
      (applied || []).forEach(j => {
        const d = Math.ceil((new Date(j.exam_date) - today) / 86400000);
        if ([0, 1, 7].includes(d))
          new Notification("Job Ledger", {
            body: d === 0 ? `Exam TODAY: ${j.job_name}` : d === 1 ? `Exam TOMORROW: ${j.job_name}` : `Exam in 7d: ${j.job_name}`,
            icon: "/icon-192.png", tag: `exam-${j.job_name}-${d}`,
          });
      });
      const { data: pending } = await supabase.from("jobs")
        .select("job_name,last_date").not("last_date", "is", null).eq("applied", false);
      let urg = 0;
      (pending || []).forEach(j => {
        const d = Math.ceil((new Date(j.last_date) - today) / 86400000);
        if (d <= 3 && d >= 0) urg++;
        if ([0, 1, 3].includes(d))
          new Notification("⚠️ Deadline", {
            body: `Apply in ${d === 0 ? "today" : d + "d"}: ${j.job_name}`,
            icon: "/icon-192.png", tag: `dl-${j.job_name}-${d}`,
          });
      });
      setUrgentCount(urg);
    };
    check();
  }, []);

  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Landing setUrgentCount={setUrgentCount} />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<RequireAuth><AdminDashboard /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav urgentCount={urgentCount} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
      <Toaster
        position="top-center"
        richColors
        toastOptions={{
          style: {
            background: "#fff",
            color: "#0D0D1A",
            border: "1px solid #E4E4EF",
            borderRadius: 14,
            fontFamily: "inherit",
            fontSize: 14,
            fontWeight: 600,
            boxShadow: "0 8px 30px rgba(0,0,0,.14)",
          },
        }}
      />
    </BrowserRouter>
  );
}
