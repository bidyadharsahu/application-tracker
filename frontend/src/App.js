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

    const checkUpcomingDeadlines = async () => {
      if (Notification.permission !== 'granted') return;
      const { data: jobs } = await supabase.from('jobs').select('*');
      if (!jobs) return;
      
      const today = new Date();
      const soon = jobs.filter(j => {
        if (!j.last_date || j.applied) return false;
        const d = new Date(j.last_date);
        const diff = Math.ceil((d - today) / (1000*60*60*24));
        return diff >= 0 && diff <= 3;
      });

      if (soon.length > 0) {
        new Notification('⚠️ Upcoming Deadlines!', {
          body: soon.map(j => `${j.job_name} — Last date: ${j.last_date}`).join('\n'),
          icon: '/logo192.png'
        });
      }
    };

    checkUpcomingDeadlines();
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
