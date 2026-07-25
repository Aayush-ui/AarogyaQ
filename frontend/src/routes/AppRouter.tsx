/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Dashboard } from "../pages/Dashboard";
import { NurseIntake } from "../pages/NurseIntake";
import { LiveQueue } from "../pages/LiveQueue";
import { PatientHistory } from "../pages/PatientHistory";
import { ShiftReport } from "../pages/ShiftReport";
import { DepartmentControl } from "../pages/DepartmentControl";
import { CommandCenter } from "../pages/CommandCenter";
import { useUIStore } from "../store/useUIStore";
import { NurseDashboard } from "../pages/NurseDashboard";
import { DoctorDashboard } from "../pages/DoctorDashboard";
import { AdminDashboard } from "../pages/AdminDashboard";
import { isRouteAllowed, ROLE_LANDING_PAGES, UserRole } from "../config/rbac";

interface AppRouterProps {
  currentRoute: string;
}

export const AppRouter: React.FC<AppRouterProps> = ({ currentRoute }) => {
  const { activeRole, addToast } = useUIStore();

  // Enforce Route Protection and Role-Based Access Control
  useEffect(() => {
    const cleanRoute = currentRoute.split("?")[0] || "#/dashboard";

    // Standard redirect from root hash or dashboard base to role-specific landing dashboard
    if (cleanRoute === "" || cleanRoute === "#" || cleanRoute === "#/dashboard") {
      window.location.hash = ROLE_LANDING_PAGES[activeRole];
      return;
    }

    // Verify permission boundary
    const allowed = isRouteAllowed(currentRoute, activeRole);
    if (!allowed) {
      addToast(
        "Security Clearance Alert: Access denied to unauthorized clinical partition.",
        "error"
      );
      // Redirect back to allowed landing page
      window.location.hash = ROLE_LANDING_PAGES[activeRole];
    }
  }, [currentRoute, activeRole, addToast]);

  // Simple hash route switch matching with built-in permission guard fallback
  const renderRoute = () => {
    const cleanRoute = currentRoute.split("?")[0] || "#/dashboard";

    // Verify permission rule. If not allowed, render nothing while redirect is active
    if (!isRouteAllowed(currentRoute, activeRole)) {
      return (
        <div className="flex-1 flex items-center justify-center bg-[#0A0C12] text-slate-400 font-bold uppercase font-mono tracking-widest animate-pulse">
          🔒 Verifying Clinical Clearance Credentials...
        </div>
      );
    }

    // Dashboard routes
    if (cleanRoute === "#/dashboard/nurse") {
      return <NurseDashboard />;
    }
    if (cleanRoute === "#/dashboard/doctor") {
      return <DoctorDashboard />;
    }
    if (cleanRoute === "#/dashboard/admin") {
      return <AdminDashboard />;
    }

    // Standard routes
    if (cleanRoute === "#/nurse") {
      return <NurseIntake />;
    }
    if (cleanRoute === "#/register") {
      return <NurseIntake />; // The intake page has both register and triage forms
    }
    if (cleanRoute === "#/reassess") {
      return <NurseIntake />; // Handled in same intake workspace
    }
    if (cleanRoute === "#/live") {
      return <LiveQueue />;
    }
    if (cleanRoute === "#/departments") {
      return <DepartmentControl />;
    }
    if (cleanRoute === "#/shift") {
      return <ShiftReport />;
    }
    if (cleanRoute === "#/command") {
      return <CommandCenter />;
    }
    if (cleanRoute.startsWith("#/patient/")) {
      return <PatientHistory />;
    }
    if (cleanRoute === "#/patient-history") {
      return <PatientHistory />;
    }

    // Default Fallback based on role landing
    const landing = ROLE_LANDING_PAGES[activeRole] || "#/dashboard/doctor";
    if (landing === "#/dashboard/nurse") return <NurseDashboard />;
    if (landing === "#/dashboard/admin") return <AdminDashboard />;
    return <DoctorDashboard />;
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={currentRoute}
        className="w-full h-full flex flex-col overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        {renderRoute()}
      </motion.div>
    </AnimatePresence>
  );
};

// Simple hook to bind route changes
export function useHashRoute() {
  const [route, setRoute] = useState(window.location.hash || "#/dashboard");

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash || "#/dashboard");
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return route;
}
