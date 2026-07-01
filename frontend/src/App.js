import React, { useEffect, useState, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";
import { Briefcase, CheckCircle2, Bell, Settings, Languages } from "lucide-react";
import Landing from "./pages/Landing";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import { isAuthed } from "./lib/api";
import { supabase } from "./lib/supabase";
import { I18nProvider, useI18n } from "./lib/i18n";
import "./App.css";

const RequireAuth = ({ children }) => isAuthed() ? children : <Navigate to="/admin/login" replace />;

function TabBar({ urgentCount }) {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { t }     = useI18n();
  const path      = location.pathname;
  if (path.startsWith("/admin")) return null;

  const tab = new URLSearchParams(location.search).get("tab");

  const tabs = [
    { to: "/",             icon: Briefcase,    labelKey: "nav_home",    key: "home",    on: !tab },
    { to: "/?tab=applied", icon: CheckCircle2, labelKey: "nav_applied", key: "applied", on: tab === "applied" },
    { to: "/?tab=notices", icon: Bell,         labelKey: "nav_notices", key: "notices", on: tab === "notices" },
    { to: "/admin/login",  icon: Settings,     labelKey: "nav_admin",   key: "admin",   on: false },
  ];

  return (
    <nav className="tab-bar" role="navigation" aria-label="Main navigation">
      {tabs.map(({ to, icon: Icon, labelKey, key, on }) => (
        <button
          key={key}
          type="button"
          className={"tab-item tg-press" + (on ? " active" : "")}
          onClick={() => navigate(to)}
          aria-current={on ? "page" : undefined}
          aria-label={t(labelKey)}
        >
          <div className="tab-icon-wrap">
            <Icon
              size={24}
              strokeWidth={on ? 2.2 : 1.7}
              color={on ? "var(--ios-blue)" : "var(--label-3)"}
            />
          </div>
          <span className="tab-label">{t(labelKey)}</span>
          {key === "home" && urgentCount > 0 && !on && (
            <span className="tab-badge">{urgentCount}</span>
          )}
        </button>
      ))}
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

      const { data: applied } = await supabase
        .from("jobs").select("job_name,exam_date")
        .not("exam_date", "is", null).eq("applied", true);

      (applied || []).forEach(j => {
        const d = Math.ceil((new Date(j.exam_date) - today) / 86400000);
        if ([0, 1, 7].includes(d)) {
          new Notification("Job Ledger", {
            body: d === 0
              ? `Exam TODAY: ${j.job_name}`
              : d === 1 ? `Exam TOMORROW: ${j.job_name}`
              : `Exam in 7 days: ${j.job_name}`,
            icon: "/icon-192.png",
            tag: `exam-${j.job_name}-${d}`,
          });
        }
      });

      const { data: pending } = await supabase
        .from("jobs").select("job_name,last_date")
        .not("last_date", "is", null).eq("applied", false);

      let urg = 0;
      (pending || []).forEach(j => {
        const d = Math.ceil((new Date(j.last_date) - today) / 86400000);
        if (d <= 3 && d >= 0) urg++;
        if ([0, 1, 3].includes(d)) {
          new Notification("Apply Deadline", {
            body: d === 0
              ? `Last day to apply: ${j.job_name}`
              : `Apply in ${d} day${d !== 1 ? "s" : ""}: ${j.job_name}`,
            icon: "/icon-192.png",
            tag: `dl-${j.job_name}-${d}`,
          });
        }
      });
      setUrgentCount(urg);
    };
    check();
  }, []);

  return (
    <div className="App">
      <Routes>
        <Route path="/"             element={<Landing setUrgentCount={setUrgentCount} />} />
        <Route path="/admin/login"  element={<AdminLogin />} />
        <Route path="/admin"        element={<RequireAuth><AdminDashboard /></RequireAuth>} />
        <Route path="*"             element={<Navigate to="/" replace />} />
      </Routes>
      <TabBar urgentCount={urgentCount} />
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <AppShell />
        <Toaster
          position="top-center"
          richColors
          toastOptions={{
            style: {
              background: "rgba(255,255,255,0.96)",
              backdropFilter: "blur(20px)",
              color: "#000",
              border: "0.5px solid var(--separator)",
              borderRadius: 14,
              fontFamily: "inherit",
              fontSize: 15,
              fontWeight: 600,
              boxShadow: "0 8px 30px rgba(0,0,0,.16)",
            },
          }}
        />
      </BrowserRouter>
    </I18nProvider>
  );
}
