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
  Nurse: "#/intake",
  Doctor: "#/doctor",
  Administrator: "#/dashboard",
};

// Map roles to their allowed routes
export const ROLE_ALLOWED_ROUTES: Record<UserRole, string[]> = {
  Nurse: [
    "#/dashboard",
    "#/intake",
    "#/queue",
  ],
  Doctor: [
    "#/dashboard",
    "#/queue",
    "#/doctor",
  ],
  Administrator: [
    "#/dashboard",
    "#/intake",
    "#/queue",
    "#/doctor",
    "#/shift",
    "#/admin",
  ],
};

export const ROLE_PERMISSIONS: Record<UserRole, PermissionSet> = {
  Nurse: {
    canRegisterPatient: true,
    canPerformAITriage: true,
    canReassessPatient: true,
    canViewEmergencyQueue: true,
    canViewGeneralQueue: true,
    canViewPatientHistory: false,
    canUpdatePatientStatus: false,
    canManageDepartments: false,
    canAccessAuditLogs: false,
    canAccessShiftAnalytics: false,
    canAccessSystemSettings: false,
  },
  Doctor: {
    canRegisterPatient: true,
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
    { id: "#/dashboard", label: "Overview", icon: "LayoutDashboard" },
    { id: "#/intake", label: "Nurse Intake", icon: "ClipboardList" },
    { id: "#/queue", label: "Live Queue", icon: "Clock" },
  ],
  Doctor: [
    { id: "#/dashboard", label: "Overview", icon: "LayoutDashboard" },
    { id: "#/queue", label: "Live Queue", icon: "Clock" },
    { id: "#/doctor", label: "Doctor Console", icon: "Stethoscope" },
  ],
  Administrator: [
    { id: "#/dashboard", label: "Overview", icon: "LayoutDashboard" },
    { id: "#/intake", label: "Nurse Intake", icon: "ClipboardList" },
    { id: "#/queue", label: "Live Queue", icon: "Clock" },
    { id: "#/doctor", label: "Doctor Console", icon: "Stethoscope" },
    { id: "#/shift", label: "Shift Report", icon: "FileText" },
    { id: "#/admin", label: "Admin Console", icon: "Sliders" },
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
