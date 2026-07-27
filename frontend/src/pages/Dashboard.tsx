/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from "react";
import { ShieldAlert, Users, Timer, Activity, ClipboardList, ArrowRight } from "lucide-react";
import { useQueueStore } from "../store/useQueueStore";
import { useUIStore } from "../store/useUIStore";
import { PageTransition } from "../components/layout/PageTransition";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

export const Dashboard: React.FC = () => {
  const {
    emergencyQueue,
    generalQueue,
    staleQueue,
    fetchQueues,
    isLoading,
  } = useQueueStore();

  const { isOffline, addToast } = useUIStore();

  // Background polling every 5 seconds
  useEffect(() => {
    fetchQueues();

    const interval = setInterval(() => {
      fetchQueues(true); // silent fetch in background
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchQueues]);

  const waitingCount = emergencyQueue.filter(item => item.visit.status === "Waiting").length + 
                       generalQueue.filter(item => item.visit.status === "Waiting").length;
  const criticalCount = emergencyQueue.filter(
    (item) => item.assessment.priority_level === "Critical"
  ).length;

  return (
    <PageTransition id="dashboard-page">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Top Banner Alert if any Stale Patients exist */}
        {staleQueue.length > 0 && (
          <div className="p-4 bg-red-950/20 border border-red-500/30 rounded-xl flex items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-red-500 shrink-0" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-red-400">
                  Critical Queue Overload Alert
                </h4>
                <p className="text-xs text-red-200 mt-1">
                  There are currently <strong className="font-mono text-sm">{staleQueue.length}</strong> patients waiting for more than 45 minutes without disposition.
                </p>
              </div>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                window.location.hash = "#/queue";
                addToast("Navigated to Live Queue to resolve stale cases.", "info");
              }}
            >
              Resolve Alerts
            </Button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#e8ecf4] tracking-tight">
              Emergency Department Overview
            </h1>
            <p className="text-xs text-[#8492a6] font-medium uppercase tracking-wider mt-1">
              Smart patient prioritization, digital twin tracking, and operational analytics.
            </p>
          </div>
          {isOffline && (
            <span className="text-[10px] font-bold font-mono text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 rounded-full uppercase tracking-wider">
              Offline Mode
            </span>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-medium text-[#8492a6] uppercase tracking-wide">
                  Patients Waiting
                </span>
                <div className="text-3xl font-bold text-[#e8ecf4]">
                  {isLoading && waitingCount === 0 ? "..." : waitingCount}
                </div>
                <p className="text-xs text-[#8492a6]">In registry queues</p>
              </div>
              <div className="p-3 bg-blue-500/10 text-[hsl(220,85%,58%)] rounded-xl border border-blue-500/20">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </Card>

          <Card className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-medium text-red-400 uppercase tracking-wide">
                  Critical Cases
                </span>
                <div className="text-3xl font-bold text-red-500">
                  {isLoading && criticalCount === 0 ? "..." : criticalCount}
                </div>
                <p className="text-xs text-[#8492a6]">High-priority triage</p>
              </div>
              <div className="p-3 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20">
                <ShieldAlert className="h-6 w-6" />
              </div>
            </div>
          </Card>

          <Card className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-medium text-yellow-400 uppercase tracking-wide">
                  Overdue Waits
                </span>
                <div className="text-3xl font-bold text-yellow-500">
                  {isLoading && staleQueue.length === 0 ? "..." : staleQueue.length}
                </div>
                <p className="text-xs text-[#8492a6]">Waiting &gt; 45 mins</p>
              </div>
              <div className="p-3 bg-yellow-500/10 text-yellow-500 rounded-xl border border-yellow-500/20">
                <Timer className="h-6 w-6" />
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions Panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-6 flex flex-col justify-between space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-[#e8ecf4] mb-2 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-[hsl(220,85%,58%)]" />
                Register New Patient
              </h3>
              <p className="text-sm text-[#8492a6]">
                Intake new emergency and general admissions. Log patient details, chief complaints, symptoms, and physiological vitals to trigger the AI-driven triage pipeline.
              </p>
            </div>
            <div>
              <Button
                variant="primary"
                onClick={() => {
                  window.location.hash = "#/intake";
                }}
                className="flex items-center gap-2"
              >
                Go to Intake Form <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>

          <Card className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-6 flex flex-col justify-between space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-[#e8ecf4] mb-2 flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-500" />
                Live Patient Queue
              </h3>
              <p className="text-sm text-[#8492a6]">
                View and manage the clinical triage streams. Supports dynamic re-sorting via Digital Twin physiological predictions and priority offsets set by the RL agent.
              </p>
            </div>
            <div>
              <Button
                variant="success"
                onClick={() => {
                  window.location.hash = "#/queue";
                }}
                className="flex items-center gap-2"
              >
                Open Live Queue <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
};
