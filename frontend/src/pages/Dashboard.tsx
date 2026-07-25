/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from "react";
import { AlertCircle, ShieldAlert, Heart, Users, Timer, Activity } from "lucide-react";
import { useQueueStore } from "../store/useQueueStore";
import { useUIStore } from "../store/useUIStore";
import { PageTransition } from "../components/layout/PageTransition";
import { Card } from "../components/ui/Card";
import { AnimatedCounter } from "../components/charts/AnimatedCounter";
import { QueueColumn } from "../components/queue/QueueColumn";
import { Button } from "../components/ui/Button";

export const Dashboard: React.FC = () => {
  const {
    emergencyQueue,
    generalQueue,
    staleQueue,
    fetchQueues,
    fetchDepartments,
    isLoading,
  } = useQueueStore();

  const { isOffline, addToast } = useUIStore();

  // Background polling every 5 seconds
  useEffect(() => {
    fetchQueues();
    fetchDepartments();

    const interval = setInterval(() => {
      fetchQueues(true); // silent fetch in background
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchQueues, fetchDepartments]);

  const activeCount = emergencyQueue.length + generalQueue.length;
  const criticalCount = emergencyQueue.filter(
    (item) => item.assessment.priority_level === "Critical"
  ).length;
  const highCount = emergencyQueue.filter(
    (item) => item.assessment.priority_level === "High"
  ).length;

  return (
    <PageTransition id="dashboard-page">
      {/* Top Banner Alert if any Stale Patients exist */}
      {staleQueue.length > 0 && (
        <Card className="mb-6 border-red-500/30 bg-red-950/15 backdrop-blur-xl shadow-red-500/5 animate-pulse">
          <div className="p-4 flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-400">
                Critical Queue Overload Alert
              </h4>
              <p className="text-xs text-red-200 mt-1 leading-relaxed">
                There are currently <strong className="font-mono text-sm">{staleQueue.length}</strong> patients in the intake stream waiting for more than 45 minutes without disposition. Action required.
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                window.location.hash = "#/live";
                addToast("Navigated to Live streams to manage stale triage logs.", "info");
              }}
            >
              Resolve Stream
            </Button>
          </div>
        </Card>
      )}

      {/* Hero Welcome / Section title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
            Clinical Triage Dashboard
          </h1>
          <p className="text-xs text-slate-400 font-semibold mt-1 uppercase tracking-wider">
            Real-time emergency monitoring, priority streams, and diagnostics flow.
          </p>
        </div>

        {isOffline && (
          <span className="text-[10px] font-bold font-mono text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 rounded-full uppercase tracking-wider">
            Viewing Offline Simulation Database
          </span>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Active Queue */}
        <Card className="hover:border-white/20" hoverable>
          <div className="p-4 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Active Registry
              </span>
              <span className="text-3xl font-extrabold text-slate-100">
                <AnimatedCounter value={activeCount} />
              </span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-1">
                Patients awaiting care
              </span>
            </div>
            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-blue-400">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </Card>

        {/* Critical Cases */}
        <Card className={`hover:border-red-500/40 ${criticalCount > 0 ? "border-red-500/20 bg-red-950/5" : ""}`} hoverable>
          <div className="p-4 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
                Critical Tier
              </span>
              <span className={`text-3xl font-extrabold ${criticalCount > 0 ? "text-red-400" : "text-slate-100"}`}>
                <AnimatedCounter value={criticalCount} />
              </span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-1">
                High-priority trauma
              </span>
            </div>
            <div className={`p-3 bg-white/5 border rounded-2xl ${criticalCount > 0 ? "border-red-500/20 text-red-500 animate-pulse" : "border-white/10 text-slate-400"}`}>
              <ShieldAlert className="h-5 w-5" />
            </div>
          </div>
        </Card>

        {/* High Urgency Cases */}
        <Card className="hover:border-orange-500/40" hoverable>
          <div className="p-4 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">
                High Priority
              </span>
              <span className="text-3xl font-extrabold text-slate-100">
                <AnimatedCounter value={highCount} />
              </span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-1">
                Escalated vital records
              </span>
            </div>
            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-orange-400">
              <Heart className="h-5 w-5" />
            </div>
          </div>
        </Card>

        {/* Overdue waiting times */}
        <Card className="hover:border-white/20" hoverable>
          <div className="p-4 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Overdue Waits (&gt;45m)
              </span>
              <span className={`text-3xl font-extrabold ${staleQueue.length > 0 ? "text-yellow-400" : "text-slate-100"}`}>
                <AnimatedCounter value={staleQueue.length} />
              </span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-1">
                Awaiting disposition
              </span>
            </div>
            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-yellow-400">
              <Timer className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Queue Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Emergency Column */}
        <QueueColumn
          title="Emergency Care Stream"
          items={emergencyQueue}
          theme="emergency"
          isLoading={isLoading}
        />

        {/* General Column */}
        <QueueColumn
          title="General Medical Stream"
          items={generalQueue}
          theme="general"
          isLoading={isLoading}
        />
      </div>
    </PageTransition>
  );
};
