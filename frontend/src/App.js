import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import Landing from "./pages/Landing";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import { isAuthed } from "./lib/api";
import { supabase } from "./lib/supabase";
import "./App.css";

const RequireAuth = ({ children }) => {
  return isAuthed() ? children : <Navigate to="/admin/login" replace />;
};

export default function App() {
  useEffect(() => {
    // Request browser notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Check exam dates and send native browser notifications
    const checkExamReminders = async () => {
      if (Notification.permission !== "granted") return;
      const { data: jobs } = await supabase
        .from("jobs")
        .select("job_name, exam_date, last_date, applied")
        .not("exam_date", "is", null)
        .eq("applied", true);

      if (!jobs) return;
      const today = new Date();

      jobs.forEach((j) => {
        const examDate = new Date(j.exam_date);
        const daysLeft = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));

        // Notify 7 days, 1 day, and on the day itself
        if (daysLeft === 7 || daysLeft === 1 || daysLeft === 0) {
          const msg =
            daysLeft === 0
              ? `🚨 YOUR EXAM IS TODAY: ${j.job_name}`
              : daysLeft === 1
              ? `⚠️ Exam TOMORROW: ${j.job_name}`
              : `📅 Exam in 7 days: ${j.job_name} (${j.exam_date})`;

          new Notification("Job Ledger Reminder", {
            body: msg,
            icon: "/logo192.png",
            tag: `exam-${j.job_name}-${daysLeft}`,
          });
        }
      });

      // Also check upcoming last_dates for unapplied jobs
      const { data: pendingJobs } = await supabase
        .from("jobs")
        .select("job_name, last_date")
        .not("last_date", "is", null)
        .eq("applied", false);

      if (!pendingJobs) return;
      pendingJobs.forEach((j) => {
        const lastDate = new Date(j.last_date);
        const daysLeft = Math.ceil((lastDate - today) / (1000 * 60 * 60 * 24));
        if (daysLeft === 3 || daysLeft === 1 || daysLeft === 0) {
          new Notification("⚠️ Apply Deadline!", {
            body:
              daysLeft === 0
                ? `🚨 LAST DAY TO APPLY: ${j.job_name}`
                : `Apply by ${daysLeft === 1 ? "TOMORROW" : daysLeft + " days"}: ${j.job_name}`,
            icon: "/logo192.png",
            tag: `deadline-${j.job_name}-${daysLeft}`,
          });
        }
      });
    };

    checkExamReminders();
  }, []);

  return (
    <div className="App" data-testid="app-root">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <AdminDashboard />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-center"
        richColors
        toastOptions={{
          style: {
            background: "#FCFAF5",
            color: "#2C2A26",
            border: "2px solid #2C2A26",
            borderRadius: "2px",
            fontFamily: "'Courier Prime', monospace",
            boxShadow: "4px 4px 0 0 #2C2A26",
          },
        }}
      />
    </div>
  );
}
