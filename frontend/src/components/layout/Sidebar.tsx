/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import {
  LayoutDashboard,
  ClipboardList,
  Clock,
  Stethoscope,
  FileText,
  Sliders,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  Eye,
} from "lucide-react";
import { useUIStore } from "../../store/useUIStore";
import { ROLE_SIDEBAR_ITEMS, UserRole } from "../../config/rbac";

interface SidebarProps {
  currentRoute: string; // e.g. "#/dashboard"
  id?: string;
}

const getIconElement = (iconName: string) => {
  switch (iconName) {
    case "LayoutDashboard":
      return <LayoutDashboard className="h-5 w-5" />;
    case "ClipboardList":
      return <ClipboardList className="h-5 w-5" />;
    case "Clock":
      return <Clock className="h-5 w-5" />;
    case "Stethoscope":
      return <Stethoscope className="h-5 w-5" />;
    case "FileText":
      return <FileText className="h-5 w-5" />;
    case "Sliders":
      return <Sliders className="h-5 w-5" />;
    default:
      return <LayoutDashboard className="h-5 w-5" />;
  }
};

export const Sidebar: React.FC<SidebarProps> = ({ currentRoute, id }) => {
  const {
    sidebarCollapsed,
    toggleSidebar,
    reducedMotion,
    setReducedMotion,
    addToast,
    activeRole,
  } = useUIStore();

  const menuItems = ROLE_SIDEBAR_ITEMS[activeRole] || [];

  const handleRouteClick = (routeId: string) => {
    window.location.hash = routeId;
  };

  const toggleReducedMotion = () => {
    const nextVal = !reducedMotion;
    setReducedMotion(nextVal);
    addToast(
      nextVal
        ? "Reduced Motion enabled. Transition physics and pulsing glows are now bypassed."
        : "Standard Motion enabled. Liquid spring dynamics and pulses are active.",
      "info"
    );
  };

  return (
    <motion.aside
      id={id}
      animate={{ width: sidebarCollapsed ? 72 : 240 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="border-r border-white/10 bg-[#0D1017] flex flex-col h-[calc(100vh-64px)] shrink-0 sticky top-16 select-none"
    >
      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-6 flex flex-col gap-1.5 overflow-x-hidden">
        {menuItems.map((item) => {
          // Normalize matching (e.g. #/patient/:id should still match something, or highlight patient route)
          const isPatientRoute = currentRoute.startsWith("#/patient/");
          const isActive =
            item.id === currentRoute ||
            (item.id.includes("patient") && isPatientRoute);

          return (
            <button
              key={item.id}
              onClick={() => handleRouteClick(item.id)}
              className={`relative flex items-center h-11 w-full rounded-xl px-3 text-sm font-semibold transition-colors focus:outline-none cursor-pointer group ${
                isActive
                  ? "text-white"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {/* Sliding Background Pill */}
              {isActive && (
                <motion.div
                  layoutId="sidebar_active_bg"
                  className="absolute inset-0 bg-white/5 border border-white/10 rounded-xl"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}

              {/* Icon */}
              <div
                className={`relative flex items-center justify-center h-5 w-5 ${
                  isActive ? "text-blue-400" : "text-slate-400 group-hover:text-white"
                }`}
              >
                {getIconElement(item.icon)}
              </div>

              {/* Label */}
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className="ml-3 truncate relative z-10"
                >
                  {item.label}
                </motion.span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Accessibility Preferences & Collapse button */}
      <div className="p-3 border-t border-white/10 flex flex-col gap-2">
        {/* Reduced Motion Toggle */}
        <button
          onClick={toggleReducedMotion}
          className="relative flex items-center h-10 w-full rounded-xl px-3 text-xs font-semibold hover:bg-white/5 text-slate-400 hover:text-white focus:outline-none cursor-pointer group"
          title={reducedMotion ? "Enable animations" : "Disable animations"}
        >
          <div className="flex items-center justify-center h-5 w-5 text-slate-400 group-hover:text-white">
            {reducedMotion ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </div>
          {!sidebarCollapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="ml-3 truncate text-[11px] font-bold uppercase tracking-wider relative z-10"
            >
              {reducedMotion ? "Animations off" : "Motion Active"}
            </motion.span>
          )}
        </button>

        {/* Collapse rail toggle */}
        <button
          onClick={toggleSidebar}
          className="relative flex items-center h-10 w-full rounded-xl px-3 text-xs font-semibold hover:bg-white/5 text-slate-400 hover:text-white focus:outline-none cursor-pointer group"
        >
          <div className="flex items-center justify-center h-5 w-5 text-slate-400 group-hover:text-white">
            {sidebarCollapsed ? (
              <ChevronRight className="h-4.5 w-4.5" />
            ) : (
              <ChevronLeft className="h-4.5 w-4.5" />
            )}
          </div>
          {!sidebarCollapsed && (
            <span className="ml-3 truncate text-[11px] font-bold uppercase tracking-wider relative z-10">
              Collapse Rail
            </span>
          )}
        </button>
      </div>
    </motion.aside>
  );
};
