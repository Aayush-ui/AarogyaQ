/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Navbar } from "./components/layout/Navbar";
import { Sidebar } from "./components/layout/Sidebar";
import { AppRouter, useHashRoute } from "./routes/AppRouter";
import { ToastContainer } from "./components/ui/Toast";
import { useUIStore } from "./store/useUIStore";
import { AlertTriangle } from "lucide-react";
import { Login } from "./pages/Login";

export default function App() {
  const currentRoute = useHashRoute();
  const { erAlerts, resolveERAlert, addToast, isAuthenticated, theme, activeRole } = useUIStore();
  const activeAlerts = erAlerts.filter((a) => a.status === "Active");

  // Synchronize document theme class
  React.useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
  }, [theme]);

  // Keyboard hotkeys for fast ER navigation
  React.useEffect(() => {
    if (!isAuthenticated) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        const key = e.key.toLowerCase();
        if (key === "d") {
          e.preventDefault();
          window.location.hash = "#/dashboard";
          addToast("Navigation Hotkey: Switched to Main Desk", "info", 2000);
        } else if (key === "s") {
          e.preventDefault();
          window.location.hash = "#/live";
          addToast("Navigation Hotkey: Switched to Live Stream", "info", 2000);
        } else if (key === "n") {
          e.preventDefault();
          window.location.hash = "#/nurse";
          addToast("Navigation Hotkey: Switched to Nurse Intake", "info", 2000);
        } else if (key === "o") {
          e.preventDefault();
          window.location.hash = "#/command";
          addToast("Navigation Hotkey: Switched to Operations Desk", "info", 2000);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [addToast, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="h-screen w-screen bg-[#F8FAFC]">
        <Login />
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0A0C12] text-slate-200 font-sans select-none antialiased">
      {/* Top Clinical Header */}
      <Navbar />

      {/* Active High-Priority ER Alerts Banner */}
      {activeAlerts.length > 0 && (
        <div className="bg-red-600 text-white font-black text-xs tracking-wider flex items-center justify-between px-6 py-2.5 animate-pulse border-b border-red-700 shadow-lg shadow-red-600/10 z-40 select-none">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 text-white animate-bounce" />
            <span>
              [ALERT CODE ACTIVE]: {activeAlerts.map(a => `${a.type.toUpperCase()} in ${a.location}`).join(" | ")}
            </span>
          </div>
          {activeRole === "Nurse" ? (
            <span className="text-[10px] font-extrabold uppercase bg-black/25 border border-white/10 px-2.5 py-1.5 rounded tracking-widest text-slate-100 opacity-90">
              🩺 Awaiting Physician Action
            </span>
          ) : (
            <button
              onClick={() => activeAlerts.forEach(a => resolveERAlert(a.id))}
              className="text-[10px] font-extrabold uppercase bg-black/30 hover:bg-black/50 border border-white/20 px-2.5 py-1.5 rounded transition-colors tracking-widest cursor-pointer"
            >
              Resolve Alerts
            </button>
          )}
        </div>
      )}

      {/* Main Workspace Frame */}
      <div className="flex flex-1 h-[calc(100vh-64px)] overflow-hidden relative">
        {/* Sidebar Nav rail */}
        <Sidebar currentRoute={currentRoute} />

        {/* Dynamic Workspace stage */}
        <main className="flex-1 h-full overflow-hidden relative bg-[#0A0C12]">
          <AppRouter currentRoute={currentRoute} />
        </main>
      </div>

      {/* Pop layouts & floating notifications */}
      <ToastContainer />
    </div>
  );
}
