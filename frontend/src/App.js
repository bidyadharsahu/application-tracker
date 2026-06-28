import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import Landing from "./pages/Landing";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import { isAuthed } from "./lib/api";
import { supabase } from "./lib/supabase";
import "./App.css";

const RequireAuth = ({ children }) => isAuthed() ? children : <Navigate to="/admin/login" replace />;

export default function App() {
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const checkReminders = async () => {
      if (Notification.permission !== "granted") return;
      const today = new Date();

      const { data: applied } = await supabase.from("jobs").select("job_name, exam_date").not("exam_date", "is", null).eq("applied", true);
      (applied || []).forEach(j => {
        const d = Math.ceil((new Date(j.exam_date) - today) / 86400000);
        if ([0, 1, 7].includes(d)) {
          new Notification("Job Ledger", {
            body: d === 0 ? `🚨 Exam TODAY: ${j.job_name}` : d === 1 ? `⚠️ Exam TOMORROW: ${j.job_name}` : `📅 Exam in 7 days: ${j.job_name}`,
            icon: "/icon-192.png", tag: `exam-${j.job_name}-${d}`
          });
        }
      });

      const { data: pending } = await supabase.from("jobs").select("job_name, last_date").not("last_date", "is", null).eq("applied", false);
      (pending || []).forEach(j => {
        const d = Math.ceil((new Date(j.last_date) - today) / 86400000);
        if ([0, 1, 3].includes(d)) {
          new Notification("⚠️ Apply Deadline!", {
            body: d === 0 ? `🚨 LAST DAY: ${j.job_name}` : `Apply in ${d === 1 ? "1 day" : d + " days"}: ${j.job_name}`,
            icon: "/icon-192.png", tag: `deadline-${j.job_name}-${d}`
          });
        }
      });
    };

    checkReminders();
  }, []);

  return (
    <div className="App" data-testid="app-root">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<RequireAuth><AdminDashboard /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-center"
        richColors
        toastOptions={{
          style: {
            background: "#1C1C2E",
            color: "#FFFFFF",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "16px",
            fontFamily: "'Inter', sans-serif",
            fontSize: "0.9375rem",
            fontWeight: 600,
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          },
        }}
      />
    </div>
  );
}
