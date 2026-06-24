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
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const checkUpcomingExams = async () => {
      const { data: jobs } = await supabase
        .from('jobs')
        .select('job_name, exam_date')
        .eq('applied', true)
        .not('exam_date', 'is', null);

      if (!jobs) return;
      const today = new Date();
      jobs.forEach(job => {
        const examDate = new Date(job.exam_date);
        const daysLeft = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
        if (daysLeft === 7 || daysLeft === 1 || daysLeft === 0) {
          if (Notification.permission === 'granted') {
            new Notification(`📅 Exam Reminder: ${job.job_name}`, {
              body: daysLeft === 0
                ? '🚨 Your exam is TODAY!'
                : daysLeft === 1
                ? '⚠️ Your exam is TOMORROW!'
                : `📅 Exam in ${daysLeft} days`,
              icon: '/icon-192.png'
            });
          }
        }
      });
    };

    checkUpcomingExams();
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
