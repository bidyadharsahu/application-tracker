
import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";
import { Briefcase, CheckCircle2, Bell, Settings } from "lucide-react";
import Landing from "./pages/Landing";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import { isAuthed } from "./lib/api";
import { supabase } from "./lib/supabase";
import { I18nProvider, useI18n } from "./lib/i18n";
import "./App.css";

const RequireAuth = ({ children }) =>
  isAuthed() ? children : <Navigate to="/admin/login" replace />;



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
          new Notification("Job Ledger — Exam Alert", {
            body: d === 0 ? `Exam TODAY: ${j.job_name}`
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
          new Notification("Job Ledger — Apply Deadline", {
            body: d === 0 ? `Last day to apply: ${j.job_name}`
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
    /* .App is position:fixed per CSS — no height chain needed */
    <div className="App">
      <Routes>
        <Route path="/"            element={<Landing setUrgentCount={setUrgentCount} />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin"       element={<RequireAuth><AdminDashboard /></RequireAuth>} />
        <Route path="*"            element={<Navigate to="/" replace />} />
      </Routes>
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
              background: "rgba(255,255,255,0.95)",
              backdropFilter: "blur(24px)",
              color: "#000",
              border: "0.5px solid rgba(255,255,255,0.7)",
              borderRadius: 14,
              fontFamily: "inherit",
              fontSize: 15,
              fontWeight: 600,
              boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
            },
          }}
        />
      </BrowserRouter>
    </I18nProvider>
  );
}
