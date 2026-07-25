/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from "zustand";
import { UserRole } from "../config/rbac";

export interface ToastMessage {
  id: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
  duration?: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  role: string;
  action: string;
  user: string;
}

export interface ERAlert {
  id: string;
  timestamp: string;
  type: string;
  location: string;
  status: "Active" | "Resolved";
}

interface UIState {
  theme: "light" | "dark";
  sidebarCollapsed: boolean;
  toasts: ToastMessage[];
  reducedMotion: boolean;
  isOffline: boolean;
  activeRole: UserRole;
  auditLogs: AuditLog[];
  erAlerts: ERAlert[];
  isAuthenticated: boolean;
  currentUser: { username: string; email: string; name: string; role: UserRole } | null;
  
  // Actions
  toggleTheme: () => void;
  setTheme: (theme: "light" | "dark") => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  addToast: (message: string, type?: ToastMessage["type"], duration?: number) => void;
  removeToast: (id: string) => void;
  setReducedMotion: (override: boolean) => void;
  setIsOffline: (status: boolean) => void;
  setActiveRole: (role: UserRole) => void;
  addAuditLog: (action: string) => void;
  triggerERAlert: (type: string, location: string) => void;
  resolveERAlert: (id: string) => void;
  login: (username: string, role: UserRole) => void;
  logout: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  theme: "dark", // Default to premium dark hospital SaaS theme
  sidebarCollapsed: false,
  toasts: [],
  reducedMotion: false,
  isOffline: false,
  activeRole: "Doctor", // Default to physician to enable all order/note entry right away
  isAuthenticated: false,
  currentUser: null,
  auditLogs: [
    {
      id: "log_1",
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      role: "Administrator",
      action: "Initialized AarogyaQ ER Triage System Version 1.0",
      user: "SysAdmin",
    },
    {
      id: "log_2",
      timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      role: "Nurse",
      action: "Registered patient Rohan Deshmukh (P-781) at front desk",
      user: "Staff_Ananya",
    },
    {
      id: "log_3",
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      role: "Nurse",
      action: "Triaged patient Rohan Deshmukh - Priority: Critical (Risk Score: 94%)",
      user: "Nurse_Rahul",
    }
  ],
  erAlerts: [],

  toggleTheme: () => {
    const nextTheme = get().theme === "light" ? "dark" : "light";
    set({ theme: nextTheme });
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", nextTheme === "dark");
    }
  },

  setTheme: (theme) => {
    set({ theme });
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
  },

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

  addToast: (message, type = "info", duration = 4000) => {
    const id = "toast_" + Math.random().toString(36).substr(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }],
    }));
  },

  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id),
  })),

  setReducedMotion: (reducedMotion) => set({ reducedMotion }),

  setIsOffline: (isOffline) => set({ isOffline }),

  setActiveRole: (activeRole) => {
    set({ activeRole });
    get().addAuditLog(`User session switched role to ${activeRole}`);
  },

  addAuditLog: (action) => {
    const log: AuditLog = {
      id: "log_" + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      role: get().activeRole,
      action,
      user: get().activeRole === "Nurse" ? "Nurse_Rahul" :
            get().activeRole === "Doctor" ? "Dr. Swamy" : "SysAdmin"
    };
    set((state) => ({ auditLogs: [log, ...state.auditLogs] }));
  },

  triggerERAlert: (type, location) => {
    const alert: ERAlert = {
      id: "alert_" + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      type,
      location,
      status: "Active",
    };
    set((state) => ({ erAlerts: [alert, ...state.erAlerts] }));
    get().addToast(`CRITICAL SYSTEM ALERT TRIGGERED: ${type} at ${location}!`, "error", 10000);
    get().addAuditLog(`Triggered critical clinical alert: ${type} in ${location}`);
  },

  resolveERAlert: (id) => {
    set((state) => ({
      erAlerts: state.erAlerts.map((a) =>
        a.id === id ? { ...a, status: "Resolved" as const } : a
      ),
    }));
    get().addToast("Clinical alert successfully resolved.", "success");
    get().addAuditLog(`Resolved clinical alert (ID: ${id})`);
  },

  login: (username, role) => {
    const email = `${username.toLowerCase()}@aarogyaq.gov.in`;
    const nameMap: Record<string, string> = {
      "Nurse": "Nurse Rahul",
      "Doctor": "Dr. Arvind Swamy",
      "Administrator": "SysAdmin"
    };
    const name = nameMap[role] || "Clinical Staff";
    set({
      isAuthenticated: true,
      activeRole: role,
      currentUser: { username, email, name, role }
    });
    get().addToast(`Authenticated as ${name} (${role})`, "success");
    get().addAuditLog(`User ${name} signed in successfully`);
  },

  logout: () => {
    const user = get().currentUser;
    set({
      isAuthenticated: false,
      currentUser: null
    });
    get().addToast("Session terminated securely.", "info");
    get().addAuditLog(`User ${user?.name || "Unknown"} signed out`);
  },
}));
