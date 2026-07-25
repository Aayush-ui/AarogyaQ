/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Hospital, CheckCircle, AlertTriangle, Play, ToggleLeft, ToggleRight, Loader2, RefreshCw } from "lucide-react";
import { useQueueStore } from "../store/useQueueStore";
import { useUIStore } from "../store/useUIStore";
import { PageTransition } from "../components/layout/PageTransition";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

export const DepartmentControl: React.FC = () => {
  const { departments, fetchDepartments, updateDeptStatus } = useQueueStore();
  const { addToast } = useUIStore();
  const [failingDept, setFailingDept] = useState<string | null>(null);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleToggleStatus = async (deptName: string, currentStatus: string) => {
    // Determine target next status
    const nextStatus = currentStatus === "Active" ? "Inactive" : "Active";
    
    // Check if triggering Simulated Failure mode to show off shake animations & rollback!
    // We will simulate that Gastroenterology is locked (or lacks credentials) and throws an error!
    if (deptName === "Gastroenterology") {
      setFailingDept(deptName);
      addToast(`Simulating network rejection for ${deptName}...`, "info");
      
      setTimeout(() => {
        setFailingDept(null);
        addToast(`API EXCEPTION: Locked state. Gastroenterology cannot be toggled at this time.`, "error");
      }, 1500);
      return;
    }

    // Standard optimistic update
    await updateDeptStatus(deptName, nextStatus);
  };

  const getStatusMetrics = (status: string) => {
    switch (status) {
      case "Active":
        return {
          textColor: "text-emerald-400",
          borderColor: "border-emerald-500/20",
          bgColor: "bg-emerald-500/10",
          indicator: <CheckCircle className="h-4 w-4 text-emerald-400" />,
        };
      case "Overloaded":
        return {
          textColor: "text-orange-400",
          borderColor: "border-orange-500/20",
          bgColor: "bg-orange-500/10",
          indicator: <AlertTriangle className="h-4 w-4 text-orange-400 animate-bounce" />,
        };
      default:
        return {
          textColor: "text-slate-500",
          borderColor: "border-white/10",
          bgColor: "bg-white/5",
          indicator: <ToggleLeft className="h-4 w-4 text-slate-600" />,
        };
    }
  };

  const shakeVariants = {
    shake: {
      x: [0, -6, 6, -6, 6, 0],
      transition: { duration: 0.4 },
    },
    default: {},
  };

  return (
    <PageTransition id="department-control-page">
      {/* Page header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
            Clinical Unit Routing Control
          </h1>
          <p className="text-xs text-slate-400 font-semibold mt-1 uppercase tracking-wider">
            Enable or throttle routing channels based on real-time department congestion.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          leftIcon={<RefreshCw className="h-4 w-4" />}
          onClick={() => {
            fetchDepartments();
            addToast("Unit routing statuses re-indexed.", "success");
          }}
        >
          Re-Index Units
        </Button>
      </div>

      {/* Info warning */}
      <Card className="mb-6 border-white/10 bg-white/5">
        <div className="p-4 flex items-start gap-3">
          <AlertTriangle className="h-4.5 w-4.5 text-yellow-500 mt-0.5" />
          <div className="text-xs text-slate-400 leading-relaxed">
            <strong className="text-slate-300">Design Playnote:</strong> Deactivating a clinical unit immediately diverts any future registered patients from routing into that ward. Toggling <strong className="text-yellow-400">Gastroenterology</strong> will simulate an API authorization failure to demonstrate our custom <strong className="text-slate-100 font-semibold">shake-and-rollback</strong> validation logic!
          </div>
        </div>
      </Card>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {departments.map((dept) => {
            const { name, status, active_patients, wait_time_mins } = dept;
            const { textColor, borderColor, bgColor, indicator } = getStatusMetrics(status);
            const isFailing = failingDept === name;

            return (
              <motion.div
                key={name}
                layout
                animate={isFailing ? "shake" : "default"}
                variants={shakeVariants}
                className="w-full"
              >
                <Card
                  className={`border-t-4 border-t-white/10 ${borderColor} hover:shadow-lg transition-all ${
                    status === "Overloaded" ? "bg-orange-950/5" : ""
                  }`}
                >
                  <div className="p-5 flex flex-col gap-4">
                    {/* Title & Status */}
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Clinical Unit
                        </span>
                        <h3 className="text-sm font-bold text-slate-100 tracking-tight">
                          {name}
                        </h3>
                      </div>

                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1.5 ${bgColor} ${textColor}`}>
                        {indicator}
                        <span>{status}</span>
                      </span>
                    </div>

                    {/* Active Patient Counts */}
                    <div className="grid grid-cols-2 gap-3 p-3 bg-white/5 border border-white/10 rounded-xl text-xs">
                      <div className="flex flex-col leading-none">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          Active Cases
                        </span>
                        <span className="text-lg font-bold text-slate-200 mt-1.5 tabular">
                          {active_patients}
                        </span>
                      </div>

                      <div className="flex flex-col leading-none">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          Est. Transit Delay
                        </span>
                        <span className="text-lg font-bold text-slate-200 mt-1.5 tabular">
                          {wait_time_mins}m
                        </span>
                      </div>
                    </div>

                    {/* Toggle Trigger */}
                    <div className="flex items-center justify-between border-t border-white/10 pt-3 mt-1 text-xs">
                      <span className="text-slate-400 font-semibold uppercase tracking-wider">
                        Routing Channel
                      </span>
                      
                      <div className="flex items-center gap-2">
                        <span className={`font-bold uppercase ${status === "Inactive" ? "text-slate-600" : "text-blue-400"}`}>
                          {status === "Inactive" ? "Offline" : "Online"}
                        </span>
                        
                        <button
                          onClick={() => handleToggleStatus(name, status)}
                          disabled={isFailing}
                          className="focus:outline-none transition-transform active:scale-95 cursor-pointer"
                        >
                          {status === "Inactive" ? (
                            <ToggleLeft className="h-7 w-7 text-slate-700" />
                          ) : (
                            <ToggleRight className="h-7 w-7 text-blue-500" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
};
