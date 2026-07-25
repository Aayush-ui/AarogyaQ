/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = "Nurse" | "Doctor" | "Administrator";

export interface MenuItem {
  id: string;      // Hash route, e.g. "#/dashboard/nurse"
  label: string;   // Label in the sidebar
  icon: string;    // Lucide icon name to dynamically load or render
}

export interface PermissionSet {
  canRegisterPatient: boolean;
  canPerformAITriage: boolean;
  canReassessPatient: boolean;
  canViewEmergencyQueue: boolean;
  canViewGeneralQueue: boolean;
  canViewPatientHistory: boolean;
  canUpdatePatientStatus: boolean;
  canManageDepartments: boolean;
  canAccessAuditLogs: boolean;
  canAccessShiftAnalytics: boolean;
  canAccessSystemSettings: boolean;
}

// Map roles to their landing page hash
export const ROLE_LANDING_PAGES: Record<UserRole, string> = {
  Nurse: "#/dashboard/nurse",
  Doctor: "#/dashboard/doctor",
  Administrator: "#/dashboard/admin",
};

// Map roles to their allowed routes
export const ROLE_ALLOWED_ROUTES: Record<UserRole, string[]> = {
  Nurse: [
    "#/dashboard/nurse",
    "#/register",
    "#/nurse",
    "#/reassess",
    "#/patient-history",
  ],
  Doctor: [
    "#/dashboard/doctor",
    "#/live", // Doctor has access to Live Queues
    "#/patient-history",
    "#/clinical-summary",
    "#/register", // can remain enabled for doctor too as optional
  ],
  Administrator: [
    "#/dashboard/admin",
    "#/register",
    "#/nurse",
    "#/live",
    "#/patient-history",
    "#/shift",
    "#/departments",
    "#/command",
  ],
};

export const ROLE_PERMISSIONS: Record<UserRole, PermissionSet> = {
  Nurse: {
    canRegisterPatient: true,
    canPerformAITriage: true,
    canReassessPatient: true,
    canViewEmergencyQueue: true,
    canViewGeneralQueue: true,
    canViewPatientHistory: true,
    canUpdatePatientStatus: false,
    canManageDepartments: false,
    canAccessAuditLogs: false,
    canAccessShiftAnalytics: false,
    canAccessSystemSettings: false,
  },
  Doctor: {
    canRegisterPatient: true, // remains optional/enabled for doctor in MVP
    canPerformAITriage: false,
    canReassessPatient: true,
    canViewEmergencyQueue: true,
    canViewGeneralQueue: true,
    canViewPatientHistory: true,
    canUpdatePatientStatus: true,
    canManageDepartments: false,
    canAccessAuditLogs: false,
    canAccessShiftAnalytics: false,
    canAccessSystemSettings: false,
  },
  Administrator: {
    canRegisterPatient: true,
    canPerformAITriage: true,
    canReassessPatient: true,
    canViewEmergencyQueue: true,
    canViewGeneralQueue: true,
    canViewPatientHistory: true,
    canUpdatePatientStatus: true,
    canManageDepartments: true,
    canAccessAuditLogs: true,
    canAccessShiftAnalytics: true,
    canAccessSystemSettings: true,
  },
};

export const ROLE_SIDEBAR_ITEMS: Record<UserRole, { id: string; label: string; icon: string }[]> = {
  Nurse: [
    { id: "#/dashboard/nurse", label: "Dashboard", icon: "LayoutDashboard" },
    { id: "#/register", label: "Register Patient", icon: "UsersRound" },
    { id: "#/nurse", label: "AI Triage", icon: "Brain" },
    { id: "#/reassess", label: "Reassessment", icon: "RefreshCw" },
    { id: "#/patient-history", label: "Patient History", icon: "FileSpreadsheet" },
  ],
  Doctor: [
    { id: "#/dashboard/doctor", label: "Dashboard", icon: "LayoutDashboard" },
    { id: "#/live", label: "Emergency Queue", icon: "Flame" },
    { id: "#/patient-history", label: "Patient History", icon: "UsersRound" },
    { id: "#/clinical-summary", label: "Clinical Summary", icon: "Heart" },
  ],
  Administrator: [
    { id: "#/dashboard/admin", label: "Operations Dashboard", icon: "LayoutDashboard" },
    { id: "#/register", label: "Register Patient", icon: "UsersRound" },
    { id: "#/nurse", label: "AI Triage", icon: "Brain" },
    { id: "#/live", label: "Emergency Queue", icon: "Flame" },
    { id: "#/patient-history", label: "Patient History", icon: "FileSpreadsheet" },
    { id: "#/shift", label: "Shift Summary", icon: "FileSpreadsheet" },
    { id: "#/departments", label: "Department Management", icon: "Hospital" },
    { id: "#/command", label: "Audit Logs & Alerts", icon: "Compass" },
  ],
};

export const isRouteAllowed = (route: string, role: UserRole): boolean => {
  const allowed = ROLE_ALLOWED_ROUTES[role];
  if (!allowed) return false;

  // Normalize route and remove queries
  const cleanRoute = route.split("?")[0] || "#/dashboard";

  // If visiting main entry point or dashboard base, it is always allowed (handled via redirection)
  if (cleanRoute === "" || cleanRoute === "#" || cleanRoute === "#/dashboard") {
    return true;
  }

  // Handle dynamic patient profile route
  if (cleanRoute.startsWith("#/patient/")) {
    return role === "Nurse" || role === "Doctor" || role === "Administrator";
  }

  // Exact matching against configured role allowed routes
  return allowed.includes(cleanRoute);
};
