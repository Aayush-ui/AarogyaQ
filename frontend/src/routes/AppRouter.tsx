/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Dashboard } from "../pages/Dashboard";
import { NurseIntake } from "../pages/NurseIntake";
import { LiveQueue } from "../pages/LiveQueue";
import { ShiftReport } from "../pages/ShiftReport";
import { useUIStore } from "../store/useUIStore";
import { DoctorDashboard } from "../pages/DoctorDashboard";
import { AdminDashboard } from "../pages/AdminDashboard";
import { isRouteAllowed, ROLE_LANDING_PAGES } from "../config/rbac";

interface AppRouterProps {
  currentRoute: string;
}

export const AppRouter: React.FC<AppRouterProps> = ({ currentRoute }) => {
  const { activeRole, addToast } = useUIStore();

  // Enforce Route Protection and Role-Based Access Control
  useEffect(() => {
    const cleanRoute = currentRoute.split("?")[0] || "#/dashboard";

    // Standard redirect from root hash to role-specific landing dashboard
    if (cleanRoute === "" || cleanRoute === "#") {
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

    if (cleanRoute === "#/dashboard") {
      return <Dashboard />;
    }
    if (cleanRoute === "#/intake") {
      return <NurseIntake />;
    }
    if (cleanRoute === "#/queue") {
      return <LiveQueue />;
    }
    if (cleanRoute === "#/doctor") {
      return <DoctorDashboard />;
    }
    if (cleanRoute === "#/shift") {
      return <ShiftReport />;
    }
    if (cleanRoute === "#/admin") {
      return <AdminDashboard />;
    }

    // Default Fallback based on role landing
    const landing = ROLE_LANDING_PAGES[activeRole] || "#/dashboard";
    if (landing === "#/intake") return <NurseIntake />;
    if (landing === "#/doctor") return <DoctorDashboard />;
    return <Dashboard />;
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
