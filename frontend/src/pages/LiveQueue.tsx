/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldCheck, MonitorPlay, Search, Filter, ArrowUpDown, Clock, Flame, ShieldAlert, Heart, RefreshCw } from "lucide-react";
import { useQueueStore } from "../store/useQueueStore";
import { PageTransition } from "../components/layout/PageTransition";
import { QueueColumn } from "../components/queue/QueueColumn";
import { Card } from "../components/ui/Card";
import { TriageQueueItem } from "../types";
import { useUIStore } from "../store/useUIStore";

export const LiveQueue: React.FC = () => {
  const { emergencyQueue, generalQueue, fetchQueues, fetchDepartments, isLoading } = useQueueStore();
  const { addToast } = useUIStore();

  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"wait" | "risk" | "pain">("wait");

  useEffect(() => {
    fetchQueues();
    fetchDepartments();

    // Wall-mount board standard polling
    const interval = setInterval(() => {
      fetchQueues(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchQueues, fetchDepartments]);

  // Unified list processing
  const processQueue = (queue: TriageQueueItem[]) => {
    let result = [...queue];

    // 1. Live Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.patient.name.toLowerCase().includes(q) ||
          item.patient.patient_id.toLowerCase().includes(q) ||
          item.visit.department_assigned.toLowerCase().includes(q) ||
          (item.visit.chief_complaint && item.visit.chief_complaint.toLowerCase().includes(q)) ||
          item.assessment.mapped_symptoms.some(s => s.toLowerCase().includes(q))
      );
    }

    // 2. Priority Filter
    if (priorityFilter !== "All") {
      result = result.filter((item) => item.assessment.priority_level === priorityFilter);
    }

    // Helper to get active sorting values considering Digital Twin deterioration
    const getActiveSortValues = (item: TriageQueueItem) => {
      let priority = item.assessment.priority_level;
      let riskScore = item.assessment.risk_score;

      if (item.twin && (item.twin.alert_level === "DETERIORATING" || item.twin.alert_level === "CRITICAL_ALERT")) {
        if (item.twin.twin_priority) {
          priority = item.twin.twin_priority;
        }
        if (item.twin.projected_risk_score !== undefined) {
          riskScore = item.twin.projected_risk_score;
        }
      }

      return { priority, riskScore };
    };

    // 3. Clinical Sort
    result.sort((a, b) => {
      const aVals = getActiveSortValues(a);
      const bVals = getActiveSortValues(b);

      // Sticky Critical Logic: If viewing 'All' priorities, Critical tier ALWAYS sticks to the absolute top
      if (priorityFilter === "All") {
        const aCrit = aVals.priority === "Critical" ? 1 : 0;
        const bCrit = bVals.priority === "Critical" ? 1 : 0;
        if (aCrit !== bCrit) return bCrit - aCrit; // push critical patients first
      }

      if (sortBy === "risk") {
        return bVals.riskScore - aVals.riskScore;
      }
      if (sortBy === "pain") {
        return b.visit.pain_level - a.visit.pain_level;
      }
      
      // Default: Wait Time (oldest registration date = longest wait = first priority)
      const aTime = a.visit.registered_at ? new Date(a.visit.registered_at).getTime() : 0;
      const bTime = b.visit.registered_at ? new Date(b.visit.registered_at).getTime() : 0;
      return aTime - bTime;
    });

    return result;
  };

  const processedEmergency = processQueue(emergencyQueue);
  const processedGeneral = processQueue(generalQueue);

  const totalFilteredCount = processedEmergency.length + processedGeneral.length;

  return (
    <PageTransition id="live-queue-page">
      {/* Absolute Ambient Background Medical Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10 opacity-30">
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            x: [0, 40, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-blue-500/5 blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, -30, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -bottom-40 -right-40 w-128 h-128 rounded-full bg-red-500/5 blur-3xl"
        />
      </div>

      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
            <MonitorPlay className="h-5.5 w-5.5 text-blue-400 animate-pulse" /> Emergency Room Board
          </h1>
          <p className="text-xs text-slate-400 font-semibold mt-1 uppercase tracking-wider">
            Wall-mount formatted patient list. Real-time neural scoring updates every 5s.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
          <ShieldCheck className="h-4.5 w-4.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">
            Critical streams synced
          </span>
        </div>
      </div>

      {/* Triage Search, Filter & Sort Control Deck */}
      <Card className="p-4 mb-6 bg-gradient-to-b from-[#131824] to-[#0e121d] border-white/10 flex flex-col md:flex-row gap-4 justify-between items-center z-10 relative">
        {/* Live Search Input */}
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search patient, ID, complaints, symptoms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#090d16] border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Priority Filter Segmented Tabs */}
        <div className="flex items-center gap-1 bg-[#090d16] p-1 rounded-xl border border-white/5 w-full md:w-auto overflow-x-auto shrink-0 scrollbar-none">
          {["All", "Critical", "High", "Medium", "Low"].map((p) => {
            const isActive = priorityFilter === p;
            const activeColor = {
              All: "bg-white/10 text-slate-200 border-white/15",
              Critical: "bg-red-500/15 text-red-400 border-red-500/20",
              High: "bg-orange-500/15 text-orange-400 border-orange-500/20",
              Medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
              Low: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
            }[p] || "bg-white/5 text-slate-400";

            return (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg border transition-all cursor-pointer ${
                  isActive ? `${activeColor} border` : "bg-transparent border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Sort Selection Menu */}
        <div className="flex items-center gap-2 w-full md:w-auto bg-[#090d16] px-3 py-2 rounded-xl border border-white/5 flex-shrink-0">
          <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pr-1 border-r border-white/5">
            Sort:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-transparent text-[10px] font-bold text-slate-300 outline-none uppercase tracking-wider cursor-pointer focus:text-blue-400"
          >
            <option value="wait" className="bg-[#0e1320] text-slate-300">Wait Duration</option>
            <option value="risk" className="bg-[#0e1320] text-slate-300">AI Risk Score</option>
            <option value="pain" className="bg-[#0e1320] text-slate-300">Pain Scale</option>
          </select>
        </div>
      </Card>

      {/* Filter Info banner */}
      {(search || priorityFilter !== "All") && (
        <div className="mb-4 flex items-center justify-between text-xs text-slate-400 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-blue-400" />
            <span>
              Active filter matching <strong className="text-slate-200">{totalFilteredCount}</strong> patients.
            </span>
          </div>
          <button
            onClick={() => {
              setSearch("");
              setPriorityFilter("All");
              setSortBy("wait");
              addToast("Triage board filters reset.", "info");
            }}
            className="text-[10px] font-black uppercase text-blue-400 hover:text-blue-300 underline cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Main Stream Columns */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start mt-2">
        {/* Emergency Stream */}
        <QueueColumn
          title="Emergency Care Stream"
          items={processedEmergency}
          theme="emergency"
          isLoading={isLoading}
        />

        {/* General Stream */}
        <QueueColumn
          title="General Medical Stream"
          items={processedGeneral}
          theme="general"
          isLoading={isLoading}
        />
      </div>
    </PageTransition>
  );
};
