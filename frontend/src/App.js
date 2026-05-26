import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import Landing from "./pages/Landing";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import { isAuthed } from "./lib/api";
import "./App.css";

const RequireAuth = ({ children }) => {
  return isAuthed() ? children : <Navigate to="/admin/login" replace />;
};

export default function App() {
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
