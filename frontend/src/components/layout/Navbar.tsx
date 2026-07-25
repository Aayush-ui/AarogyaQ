/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion } from "motion/react";
import { RefreshCw, Activity, Sparkles, AlertCircle, Wifi, LogOut } from "lucide-react";
import { useQueueStore } from "../../store/useQueueStore";
import { useUIStore } from "../../store/useUIStore";
import { ThemeToggle } from "./ThemeToggle";

export const Navbar: React.FC = () => {
  const { lastUpdated, fetchQueues, fetchDepartments, isLoading } = useQueueStore();
  const { isOffline, addToast, activeRole, setActiveRole, logout } = useUIStore();
  
  const [spinDeg, setSpinDeg] = useState(0);

  const handleManualRefresh = async () => {
    setSpinDeg((prev) => prev + 360);
    addToast("Synchronizing triage registry...", "info");
    await Promise.all([fetchQueues(), fetchDepartments()]);
    addToast("Triage registry up to date.", "success");
  };

  return (
    <header className="h-16 border-b border-white/10 bg-[#0D1017] px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Brand Logo & Tagline */}
      <div className="flex items-center gap-3">
        <div className="relative h-11 w-11 flex items-center justify-center">
          {/* Subtle spinning outer gradient glow */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 opacity-20 blur-[5px]" />
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-xl border border-blue-500/20 bg-gradient-to-tr from-cyan-400/10 via-transparent to-indigo-500/20"
          />
          {/* Inner glass logo tray */}
          <div className="relative h-9.5 w-9.5 bg-[#0e1320]/80 backdrop-blur-md rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/15 border border-white/10 overflow-hidden">
            <svg className="h-6 w-6 drop-shadow-[0_0_4px_rgba(56,189,248,0.4)]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="logo-grad" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#38bdf8" /> {/* cyan-400 */}
                  <stop offset="50%" stopColor="#60a5fa" /> {/* blue-400 */}
                  <stop offset="100%" stopColor="#818cf8" /> {/* indigo-400 */}
                </linearGradient>
              </defs>
              
              {/* Outer Stylized Q / Wellness Circle */}
              <motion.path 
                d="M12 20C7.58172 20 4 16.4183 4 12C4 7.58172 7.58172 4 12 4C16.4183 4 20 7.58172 20 12C20 13.913 19.3277 15.669 18.2111 17.0396L20.5 20" 
                stroke="url(#logo-grad)" 
                strokeWidth="2.2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
              
              {/* Stylized Pulse Line running across */}
              <motion.path 
                d="M7.5 12H9.5L11 8.5L13 15.5L14.5 11L15.5 12H16.5" 
                stroke="#ffffff" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.0, delay: 0.6, ease: "easeInOut" }}
              />
            </svg>
            

          </div>
        </div>
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-base tracking-tight text-slate-100">
              AarogyaQ
            </span>
            <span className="text-[9px] font-bold font-mono tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded uppercase">
              v1.0
            </span>
          </div>
          <span className="text-[10px] font-semibold text-slate-500 mt-1 uppercase tracking-wider">
            AI Triage & Emergency Flow
          </span>
        </div>
      </div>

      {/* Sync Status / Real-Time Metrics */}
      <div className="flex items-center gap-4">
        {/* Active Clinician Role Badge (Read-Only) */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-extrabold text-xs">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">Access:</span>
          <span>{activeRole === "Nurse" ? "🩺 Nurse" : activeRole === "Doctor" ? "👨‍⚕️ Physician" : "🛡 Admin"}</span>
        </div>

        {/* Connection Mode Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
          <Wifi className={`h-3.5 w-3.5 ${isOffline ? "text-yellow-400" : "text-blue-400"}`} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
            {isOffline ? "Standalone Demo" : "FastAPI Link"}
          </span>
          <span className="relative flex h-2 w-2 ml-1">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOffline ? "bg-yellow-400" : "bg-blue-400"}`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isOffline ? "bg-yellow-500" : "bg-blue-500"}`} />
          </span>
        </div>

        {/* Last Updated Timestamp */}
        {lastUpdated && (
          <div className="hidden md:flex flex-col text-right leading-none">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
              Live updates active
            </span>
            <span className="text-xs font-semibold text-slate-300 font-mono mt-0.5">
              Synced: {lastUpdated}
            </span>
          </div>
        )}

        {/* Sync trigger button */}
        <motion.button
          onClick={handleManualRefresh}
          disabled={isLoading}
          className="h-10 w-10 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-100 transition-colors cursor-pointer disabled:opacity-40"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <motion.div
            animate={{ rotate: spinDeg }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            <RefreshCw className={`h-4.5 w-4.5 ${isLoading ? "animate-spin text-blue-400" : ""}`} />
          </motion.div>
        </motion.button>

        {/* Theme Toggle widget */}
        <ThemeToggle />

        {/* Secure Log Out button */}
        <motion.button
          onClick={logout}
          className="h-10 px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 text-red-400 hover:text-red-200 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden md:inline">Sign Out</span>
        </motion.button>
      </div>
    </header>
  );
};
