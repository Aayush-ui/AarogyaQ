/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShieldCheck, 
  KeyRound, 
  User, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Activity, 
  Heart, 
  BrainCircuit, 
  ServerCrash, 
  AlertTriangle, 
  Hourglass,
  Clock,
  Sparkles,
  Lock,
  Building2
} from "lucide-react";
import { useUIStore } from "../store/useUIStore";

type AuthState = 
  | "initial" 
  | "loading" 
  | "success" 
  | "incorrect_password" 
  | "network_failure" 
  | "server_unavailable" 
  | "session_expired" 
  | "unauthorized";

export const Login: React.FC = () => {
  const { login, addToast } = useUIStore();
  
  // Form states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [hospitalName, setHospitalName] = useState("AarogyaQ Metro General");
  
  // Interactive Demonstration states
  const [currentState, setCurrentState] = useState<AuthState>("initial");
  const [showDemoAccounts, setShowDemoAccounts] = useState(true);
  const [shakeTrigger, setShakeTrigger] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  // Loading process simulation steps
  const loadingSteps = [
    "Connecting to Hospital Network",
    "Verifying Credentials",
    "Loading Clinical Permissions",
    "Initializing Session",
    "Opening Dashboard",
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentState === "loading") {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => {
          if (prev < loadingSteps.length - 1) {
            return prev + 1;
          } else {
            clearInterval(interval);
            // Complete login after loading animation is done
            handleSuccessRedirect();
            return prev;
          }
        });
      }, 700);
    }
    return () => clearInterval(interval);
  }, [currentState]);

  const handleSuccessRedirect = () => {
    // Resolve role based on username
    let finalRole: "Nurse" | "Doctor" | "Administrator" = "Doctor";
    const lowerUser = username.toLowerCase();
    
    if (lowerUser.includes("admin")) {
      finalRole = "Administrator";
    } else if (lowerUser.includes("nurse")) {
      finalRole = "Nurse";
    } else if (lowerUser.includes("doctor")) {
      finalRole = "Doctor";
    }

    login(username || "doctor", finalRole);
    
    // Redirect according to role
    if (finalRole === "Nurse") {
      window.location.hash = "#/dashboard/nurse";
    } else if (finalRole === "Doctor") {
      window.location.hash = "#/dashboard/doctor";
    } else {
      window.location.hash = "#/dashboard/admin";
    }
  };

  const handleDemoClick = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setCurrentState("initial");
    addToast(`Demo account auto-filled: ${user}`, "info", 2000);
    setShowDemoAccounts(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const lowerUser = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!lowerUser || !cleanPassword) {
      addToast("Please provide both username and password.", "warning");
      triggerShake();
      return;
    }

    // Verify credentials matching the specification:
    // Nurse: nurse / nurse123
    // Doctor: doctor / doctor123
    // Administrator: admin / admin123
    let isCredsValid = false;
    if (lowerUser === "nurse" && cleanPassword === "nurse123") {
      isCredsValid = true;
    } else if (lowerUser === "doctor" && cleanPassword === "doctor123") {
      isCredsValid = true;
    } else if (lowerUser === "admin" && cleanPassword === "admin123") {
      isCredsValid = true;
    }

    if (!isCredsValid) {
      setCurrentState("incorrect_password");
      addToast("Authentication Failed: Credentials do not match medical registry.", "error");
      triggerShake();
      return;
    }

    if (currentState === "network_failure") {
      addToast("Critical Connection Error: DNS gateway timeout.", "error");
      triggerShake();
      return;
    }

    if (currentState === "server_unavailable") {
      addToast("Clinical Server Offline: Maintenance cycle active.", "error");
      triggerShake();
      return;
    }

    if (currentState === "session_expired") {
      addToast("Hospital Protocol Alert: Pre-existing session expired.", "warning");
      triggerShake();
      return;
    }

    if (currentState === "unauthorized") {
      addToast("Access Denied: Missing clearance for clinical operations.", "error");
      triggerShake();
      return;
    }

    // Default flow: trigger genuine loading
    setCurrentState("loading");
  };

  const triggerShake = () => {
    setShakeTrigger(true);
    setTimeout(() => setShakeTrigger(false), 500);
  };

  // Demo account templates
  const demoAccounts = [
    { label: "Triage Nurse", user: "nurse", pass: "nurse123", role: "Nurse", badge: "🩺 TRIAGE NURSE", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
    { label: "Emergency Physician", user: "doctor", pass: "doctor123", role: "Doctor", badge: "👨‍⚕️ PHYSICIAN", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    { label: "System Administrator", user: "admin", pass: "admin123", role: "Administrator", badge: "🛡 SYSTEM ADMINISTRATOR", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  ];

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row bg-slate-950 text-slate-100 overflow-hidden font-sans select-none antialiased">
      
      {/* LEFT SIDE: Premium Medical Branding & Visualization */}
      <div className="hidden md:flex md:w-1/2 h-screen bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-800 text-white flex-col justify-between p-8 md:p-12 relative overflow-hidden shrink-0">
        
        {/* Abstract Particle Background */}
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            {/* Animated slow pulse waves */}
            <circle cx="30%" cy="40%" r="15%" className="animate-pulse" style={{ animationDuration: "10s" }} />
            <circle cx="70%" cy="60%" r="20%" className="animate-pulse" style={{ animationDuration: "14s" }} />
          </svg>
        </div>

        {/* Neural Network Nodes Layer (Fading and linking in CSS) */}
        <div className="absolute top-1/4 right-0 bottom-1/4 left-0 pointer-events-none opacity-40">
          <svg className="w-full h-full" viewBox="0 0 400 400" fill="none">
            {/* Pulsing connections */}
            <motion.path 
              d="M 50 150 Q 150 100 200 180 T 350 150" 
              stroke="rgba(56, 189, 248, 0.4)" 
              strokeWidth="1.5" 
              strokeDasharray="5,5"
              animate={{ strokeDashoffset: [0, -40] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            />
            <motion.path 
              d="M 80 280 Q 220 320 280 200" 
              stroke="rgba(129, 140, 248, 0.4)" 
              strokeWidth="2" 
              strokeDasharray="4,4"
              animate={{ strokeDashoffset: [0, 40] }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            />
            {/* Glowing nodes */}
            <g>
              <circle cx="50" cy="150" r="4" fill="#38bdf8" />
              <circle cx="50" cy="150" r="10" stroke="#38bdf8" strokeWidth="1" className="animate-ping" style={{ animationDuration: "2s" }} />
            </g>
            <g>
              <circle cx="200" cy="180" r="5" fill="#818cf8" />
              <circle cx="200" cy="180" r="12" stroke="#818cf8" strokeWidth="1" className="animate-ping" style={{ animationDuration: "2.5s" }} />
            </g>
            <g>
              <circle cx="350" cy="150" r="4" fill="#38bdf8" />
              <circle cx="350" cy="150" r="10" stroke="#38bdf8" strokeWidth="1" className="animate-ping" style={{ animationDuration: "3s" }} />
            </g>
            <g>
              <circle cx="280" cy="200" r="6" fill="#60a5fa" />
              <circle cx="280" cy="200" r="14" stroke="#60a5fa" strokeWidth="1" className="animate-ping" style={{ animationDuration: "4s" }} />
            </g>
          </svg>
        </div>

        {/* Top Branding Section */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-10 w-10 bg-white/10 rounded-xl backdrop-blur-md flex items-center justify-center border border-white/20">
            <svg className="h-6 w-6 text-cyan-300 drop-shadow-[0_0_6px_rgba(56,189,248,0.6)]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 20C7.58172 20 4 16.4183 4 12C4 7.58172 7.58172 4 12 4C16.4183 4 20 7.58172 20 12C20 13.913 19.3277 15.669 18.2111 17.0396L20.5 20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M7.5 12H9.5L11 8.5L13 15.5L14.5 11L15.5 12H16.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">AarogyaQ</h1>
            <p className="text-[10px] font-bold text-cyan-200 uppercase tracking-widest leading-none mt-0.5">Clinical Decision Suite</p>
          </div>
        </div>

        {/* Mid Showcase: Medical AI Brain & Heartbeat Visualization */}
        <div className="relative z-10 flex flex-col items-start gap-6 my-auto max-w-md">
          {/* Heart & Brain Interactive Grid */}
          <div className="relative p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md w-full overflow-hidden group shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            {/* Header within Visualization */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-cyan-300 animate-pulse" />
                <span className="text-[11px] font-bold tracking-wider text-cyan-100 uppercase">Emergency Flow Matrix</span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-cyan-400/20 text-cyan-200 px-2 py-0.5 rounded border border-cyan-400/30">
                ACTIVE
              </span>
            </div>

            {/* Simulated Live ECG wave */}
            <div className="h-16 flex items-center relative overflow-hidden bg-black/10 rounded-lg p-2 border border-white/5">
              <svg className="w-full h-12" viewBox="0 0 300 50">
                {/* Static Grid Line */}
                <line x1="0" y1="25" x2="300" y2="25" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                <line x1="0" y1="12" x2="300" y2="12" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                <line x1="0" y1="38" x2="300" y2="38" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                {/* Rolling clinical pulse wave */}
                <motion.path
                  d="M 0 25 L 30 25 L 45 25 L 50 15 L 55 35 L 60 25 L 85 25 L 110 25 L 115 5 L 122 45 L 130 25 L 150 25 L 195 25 L 200 15 L 205 35 L 210 25 L 235 25 L 260 25 L 265 5 L 272 45 L 280 25 L 300 25"
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  animate={{ strokeDashoffset: [0, -300] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  style={{ strokeDasharray: "150, 150" }}
                />
              </svg>
              <div className="absolute top-2 right-2 flex items-center gap-1">
                <Heart className="h-3 w-3 text-red-400 animate-ping" />
                <span className="text-[10px] font-mono font-bold text-slate-300">72 BPM</span>
              </div>
            </div>

            {/* Features list */}
            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex items-start gap-2 text-slate-200">
                <span className="text-cyan-300 font-bold mt-0.5">✦</span>
                <p><strong>Neural Triage Engine (v2)</strong> calculates real-time patient acuity and priority risk scores under 5 seconds.</p>
              </div>
              <div className="flex items-start gap-2 text-slate-200">
                <span className="text-cyan-300 font-bold mt-0.5">✦</span>
                <p><strong>Role-Based Bed Logistics</strong> connects nurses, admissions officers, and head physicians dynamically.</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
              AI-Powered Emergency Triage &amp; Patient Prioritization
            </h2>
            <p className="text-xs md:text-sm text-slate-200 mt-2 font-medium leading-relaxed">
              Welcome to the central clinical gateway. Log in with your security clearance to monitor the Emergency Room, allocate hospital units, or register new acute intakes.
            </p>
          </div>
        </div>

        {/* Footer info left */}
        <div className="relative z-10 text-xs text-slate-300 flex flex-col gap-2 border-t border-white/10 pt-4 mt-8 md:mt-0">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold tracking-wider uppercase text-[10px]">Secure Gateway Active</span>
          </div>
          <div className="flex items-center justify-between">
            <span>HIPAA &amp; HL7 v3 Compliant Secure Environment</span>
            <span>AarogyaQ v1.0.0</span>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Clinical Login Portal */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 relative bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950/20">
        
        {/* Abstract Blue Ambient Glow top right */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-blue-500/10 to-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Center Container */}
        <div className="w-full max-w-md relative z-10 flex flex-col gap-6">
          
          {/* Header */}
          <div className="flex flex-col text-center md:text-left">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center justify-center md:justify-start gap-1.5">
              <ShieldCheck className="h-4.5 w-4.5 text-indigo-400" />
              Secure Hospital Portal
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-slate-100 tracking-tight mt-1">
              Welcome Back
            </h2>
            <p className="text-sm text-slate-400 font-medium mt-1">
              Select or fill your medical credentials below to enter.
            </p>
          </div>



          {/* MAIN LOGIN CARD */}
          <motion.div
            animate={shakeTrigger ? { x: [-10, 10, -10, 10, -5, 5, 0] } : {}}
            transition={{ duration: 0.4 }}
            className={`bg-white/[0.03] border rounded-3xl shadow-xl shadow-black/40 p-6 md:p-8 transition-colors duration-300 relative overflow-hidden ${
              currentState === "incorrect_password" ? "border-red-500/30 ring-4 ring-red-500/10" :
              currentState === "network_failure" ? "border-amber-500/30 ring-4 ring-amber-500/10" :
              currentState === "server_unavailable" ? "border-rose-500/30 ring-4 ring-rose-500/10" :
              currentState === "session_expired" ? "border-yellow-500/30 ring-4 ring-yellow-500/10" :
              currentState === "unauthorized" ? "border-purple-500/30 ring-4 ring-purple-500/10" : "border-white/10"
            }`}
          >
            {/* Custom Status Banner based on simulated Auth State */}
            <AnimatePresence mode="wait">
              {currentState !== "initial" && currentState !== "loading" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mb-5 overflow-hidden"
                >
                  {currentState === "incorrect_password" && (
                    <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-xs text-red-200">
                      <AlertTriangle className="h-4.5 w-4.5 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Incorrect Medical Passcode</span>
                        <span className="text-red-400">Password does not match active security profile. Demo keys end with "123" (e.g., nurse123, doctor123, admin123).</span>
                      </div>
                    </div>
                  )}
                  {currentState === "network_failure" && (
                    <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-xs text-amber-200">
                      <ServerCrash className="h-4.5 w-4.5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Network Connection Refused</span>
                        <span className="text-amber-400">The hospital DNS gateway at 10.244.12.9 timed out. Running under off-grid mode.</span>
                      </div>
                    </div>
                  )}
                  {currentState === "server_unavailable" && (
                    <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-xs text-rose-200">
                      <AlertTriangle className="h-4.5 w-4.5 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">EMR Clinical Servers Unavailable</span>
                        <span className="text-rose-400">The healthcare registry server has scheduled maintenance. Please try again later.</span>
                      </div>
                    </div>
                  )}
                  {currentState === "session_expired" && (
                    <div className="flex items-start gap-2.5 bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-xl text-xs text-yellow-200">
                      <Clock className="h-4.5 w-4.5 text-yellow-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Clinical Session Expired</span>
                        <span className="text-yellow-400">Due to 15 minutes of hospital terminal inactivity, you were securely signed out.</span>
                      </div>
                    </div>
                  )}
                  {currentState === "unauthorized" && (
                    <div className="flex items-start gap-2.5 bg-purple-500/10 border border-purple-500/20 p-3 rounded-xl text-xs text-purple-200">
                      <Lock className="h-4.5 w-4.5 text-purple-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Missing HIPAA Clearance Level</span>
                        <span className="text-purple-400">Your card identifier lacks security clearance to access emergency triage flow logs.</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Simulated Loading/Handshake Screen */}
            <AnimatePresence mode="wait">
              {currentState === "loading" ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-12 text-center"
                >
                  <div className="relative mb-6">
                    {/* Ring Outer */}
                    <div className="absolute inset-0 rounded-full border-4 border-white/10 h-16 w-16" />
                    {/* Spinning Inner */}
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                      className="rounded-full border-4 border-indigo-500 border-t-transparent h-16 w-16"
                    />
                    <Activity className="h-6 w-6 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
                  </div>
                  
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1 block">
                    Authenticating Session
                  </span>
                  <h3 className="text-lg font-black text-slate-200 tracking-tight">
                    Connecting Clinical DB
                  </h3>
                  
                  {/* Dynamic Progress Indicator */}
                  <div className="mt-6 w-full max-w-[240px] bg-white/10 rounded-full h-1.5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${((loadingStep + 1) / loadingSteps.length) * 100}%` }}
                      className="bg-indigo-500 h-full"
                    />
                  </div>

                  {/* Step status */}
                  <motion.p
                    key={loadingStep}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-xs text-slate-400 font-medium mt-3 px-4 min-h-[32px]"
                  >
                    {loadingSteps[loadingStep]}
                  </motion.p>
                </motion.div>
              ) : (
                /* ACTUAL LOGIN FORM */
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  
                  {/* Hospital Center Header option */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl mb-1 text-xs font-semibold text-slate-300">
                    <Building2 className="h-4 w-4 text-indigo-400" />
                    <span className="text-[11px] font-bold tracking-wide uppercase text-slate-400">Unit:</span>
                    <select 
                      value={hospitalName}
                      onChange={(e) => setHospitalName(e.target.value)}
                      className="bg-transparent border-none text-xs font-bold text-slate-200 p-0 pr-1 focus:ring-0 outline-none cursor-pointer"
                    >
                      <option value="AarogyaQ Metro General">Metro General Hospital</option>
                      <option value="AarogyaQ City Trauma">City Trauma Resuscitation</option>
                      <option value="AarogyaQ Apex Cardiology">Apex Cardiology Center</option>
                    </select>
                  </div>

                  {/* Email / Username field */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="username-input" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Clinician ID / Email
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                        <User className="h-4.5 w-4.5" />
                      </div>
                      <input
                        id="username-input"
                        type="text"
                        required
                        placeholder="doctor / nurse / admin"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-white/10 bg-white/[0.04] text-slate-100 placeholder-slate-500 text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 hover:border-white/20 transition-all"
                      />
                    </div>
                  </div>

                  {/* Password field */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="password-input" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Security Passcode
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          addToast("Redesign Feature: Passcode reset protocol triggers secondary dual-factor token.", "info");
                        }}
                        className="text-xs font-bold text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer"
                      >
                        Forgot?
                      </button>
                    </div>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                        <KeyRound className="h-4.5 w-4.5" />
                      </div>
                      <input
                        id="password-input"
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-11 pr-11 py-3 rounded-xl border border-white/10 bg-white/[0.04] text-slate-100 placeholder-slate-500 text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 hover:border-white/20 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember me check */}
                  <div className="flex items-center justify-between py-1 text-slate-400">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 text-indigo-500 border-white/10 bg-white/5 rounded focus:ring-indigo-500/30 cursor-pointer"
                      />
                      <span className="text-xs font-semibold">Keep terminal signed in</span>
                    </label>
                  </div>

                  {/* Sign In Button */}
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-600/15 border border-indigo-700 hover:shadow-indigo-700/25 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
                  >
                    <span>Secure Clinician Sign In</span>
                    <ShieldCheck className="h-4.5 w-4.5" />
                  </motion.button>

                </form>
              )}
            </AnimatePresence>
          </motion.div>

          {/* hospital system info */}
          <div className="text-center text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-2">
            Clinical Operations Registry Terminal • v1.0 • Metro ER
          </div>

        </div>

        {/* Floating Demo Accounts Panel (Desktop / Tablet) */}
        <AnimatePresence>
          {showDemoAccounts ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="absolute bottom-4 right-4 z-20 max-w-[280px] w-full bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-2xl p-3 shadow-2xl hover:border-white/20 transition-all hidden sm:block"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black text-slate-200 uppercase tracking-wider">Quick Demo Logins</span>
                </div>
                <button 
                  onClick={() => setShowDemoAccounts(false)}
                  className="text-[8px] font-mono text-slate-400 hover:text-slate-200 bg-white/5 hover:bg-white/10 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                >
                  Hide
                </button>
              </div>
              <div className="flex flex-col gap-1">
                {demoAccounts.map((account) => (
                  <button
                    key={account.user}
                    type="button"
                    onClick={() => handleDemoClick(account.user, account.pass)}
                    className="w-full text-left p-1.5 px-2 rounded-xl bg-white/[0.03] hover:bg-indigo-500/10 border border-white/5 hover:border-indigo-500/20 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-slate-200 group-hover:text-indigo-300 block truncate">
                        {account.label}
                      </span>
                      <span className="text-[8px] text-slate-500 font-mono">
                        ID: {account.user}
                      </span>
                    </div>
                    <span className="text-[8px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 group-hover:bg-indigo-500/20">
                      FILL
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => setShowDemoAccounts(true)}
              className="absolute bottom-4 right-4 z-20 bg-slate-900/95 hover:bg-slate-800 border border-white/10 hover:border-white/20 px-3.5 py-2.5 rounded-xl text-[10px] font-bold text-slate-200 shadow-xl flex items-center gap-1.5 transition-all cursor-pointer hidden sm:flex"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Show Demo Accounts
            </motion.button>
          )}
        </AnimatePresence>

        {/* Mobile-only compact Floating Demo Trigger/Accounts Bar */}
        <AnimatePresence>
          {showDemoAccounts ? (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 w-[90%] max-w-[320px] bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-xl p-2 shadow-xl sm:hidden flex flex-col gap-1"
            >
              <div className="flex items-center justify-between px-1">
                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wider">Demo logins:</span>
                <button 
                  onClick={() => setShowDemoAccounts(false)}
                  className="text-[8px] font-mono text-slate-400 bg-white/5 px-1 py-0.5 rounded"
                >
                  Hide
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {demoAccounts.map((account) => (
                  <button
                    key={account.user}
                    type="button"
                    onClick={() => handleDemoClick(account.user, account.pass)}
                    className="text-center p-1 rounded-lg bg-white/[0.03] hover:bg-indigo-500/10 border border-white/5 text-[9px] font-bold text-slate-200 truncate cursor-pointer"
                  >
                    {account.label.split(" ").pop()}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onClick={() => setShowDemoAccounts(true)}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 w-[90%] max-w-[320px] bg-slate-900/95 hover:bg-slate-800 border border-white/10 text-center py-2 rounded-xl text-[10px] font-bold text-slate-200 shadow-xl flex items-center justify-center gap-1.5 cursor-pointer sm:hidden"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Tap to show Demo Logins
            </motion.button>
          )}
        </AnimatePresence>

      </div>

    </div>
  );
};
