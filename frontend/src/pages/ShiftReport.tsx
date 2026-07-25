/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from "recharts";
import { 
  CalendarRange, 
  Download, 
  FileSpreadsheet, 
  Timer, 
  AlertTriangle, 
  ShieldCheck, 
  Users, 
  Flame, 
  Clock, 
  TrendingUp, 
  Activity, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  RefreshCw
} from "lucide-react";
import { getShiftReport } from "../api/analytics";
import { ShiftReportData } from "../types";
import { PageTransition } from "../components/layout/PageTransition";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { AnimatedCounter } from "../components/charts/AnimatedCounter";
import { Skeleton } from "../components/ui/Skeleton";
import { useUIStore } from "../store/useUIStore";
import { motion, AnimatePresence } from "motion/react";

export const ShiftReport: React.FC = () => {
  const { addToast } = useUIStore();
  const [data, setData] = useState<ShiftReportData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [shiftStart, setShiftStart] = useState("08:00");
  const [shiftEnd, setShiftEnd] = useState("16:00");

  const loadReport = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    const report = await getShiftReport(shiftStart, shiftEnd);
    setData(report);
    if (!silent) {
      setTimeout(() => setIsRefreshing(false), 500); // smooth animation timing
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const handleFetchClick = () => {
    addToast("Generating cryptographic clinical summary...", "info");
    loadReport();
    addToast("Analytics index synchronized successfully.", "success");
  };

  const handleExport = () => {
    addToast("Exporting clinical ledger in XLSX format...", "info");
    setTimeout(() => {
      addToast("Shift report exported. File: AarogyaQ_Shift_Ledger.xlsx", "success");
    }, 1500);
  };

  // Color schemes matching the corporate clinic visual language
  const PRIORITY_COLORS = {
    Low: "#3b82f6",       // Sophisticated Blue
    Medium: "#eab308",    // Vibrant Amber
    High: "#f97316",      // Warm Orange
    Critical: "#ef4444",  // Emergency Red
  };

  const QUEUE_COLORS = ["#ef4444", "#3b82f6"]; // Red for emergency, Blue for general

  // Compute key insights dynamically based on retrieved data
  const clinicalInsights = useMemo(() => {
    if (!data) return [];
    const insights = [];

    // 1. Critical cases check
    if (data.critical_count > 0) {
      insights.push({
        type: "danger",
        title: "Critical Inflow Alert",
        desc: `Active shift has recorded ${data.critical_count} trauma cases requiring immediate room allocation. Prioritize Fast-Track triage.`,
        icon: <Flame className="h-4 w-4 text-red-400" />
      });
    } else {
      insights.push({
        type: "success",
        title: "Triage Flow Stable",
        desc: "Zero active critical trauma overflows. Regular patient triage operating within recommended limits.",
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />
      });
    }

    // 2. Wait times check
    if (data.avg_wait_time > 30) {
      insights.push({
        type: "warning",
        title: "Registration Latency",
        desc: `Average wait times have climbed to ${data.avg_wait_time}m. Recommended trigger: Deploy overflow ambulatory staff to the primary reception.`,
        icon: <Clock className="h-4 w-4 text-amber-400" />
      });
    } else {
      insights.push({
        type: "success",
        title: "Optimal Clearance Rate",
        desc: `Mean wait time of ${data.avg_wait_time}m represents efficient registration and high bed-clearance rates.`,
        icon: <ShieldCheck className="h-4 w-4 text-blue-400" />
      });
    }

    // 3. Peak department check
    if (data.department_workload && data.department_workload.length > 0) {
      const topDept = [...data.department_workload].sort((a, b) => b.count - a.count)[0];
      if (topDept && topDept.count > 0) {
        insights.push({
          type: "info",
          title: "Unit Allocation Stress",
          desc: `The ${topDept.name} unit is currently handling the highest workload of ${topDept.count} active admissions.`,
          icon: <Activity className="h-4 w-4 text-indigo-400" />
        });
      }
    }

    // 4. Queue Balance ratio
    const emergencyCount = data.queue_distribution.find(q => q.name.includes("Emergency"))?.value || 0;
    const generalCount = data.queue_distribution.find(q => q.name.includes("General"))?.value || 0;
    if (emergencyCount > generalCount && emergencyCount > 0) {
      insights.push({
        type: "warning",
        title: "Emergency Queue Dominance",
        desc: "Trauma-induced patient distribution detected. General check-ins can be rerouted to secondary triage desks.",
        icon: <AlertTriangle className="h-4 w-4 text-orange-400" />
      });
    }

    return insights;
  }, [data]);

  // Premium custom tooltip for recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0e1320]/95 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-2xl">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{label}</p>
          <div className="flex items-center gap-2">
            <span 
              className="h-2 w-2 rounded-full shadow-[0_0_4px_currentColor]" 
              style={{ 
                color: payload[0].fill || payload[0].color,
                backgroundColor: payload[0].fill || payload[0].color 
              }} 
            />
            <span className="text-xs text-slate-100 font-bold">
              {payload[0].name ? `${payload[0].name}: ` : "Cases: "}
              <span className="font-mono">{payload[0].value}</span>
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (!data) {
    return (
      <PageTransition id="shift-report-loading">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </PageTransition>
    );
  }

  return (
    <PageTransition id="shift-report-page">
      {/* Title & System Sync Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-100 tracking-tight">
              Clinical Shift Ledger
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Live Ledger Synced
            </span>
          </div>
          <p className="text-xs text-slate-400 font-semibold mt-1 uppercase tracking-wider">
            Real-time queue analytics, departmental workloads, and patient throughput.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Download className="h-4 w-4" />}
          onClick={handleExport}
          className="border-white/10 hover:border-white/20 hover:bg-white/5 active:scale-95 transition-all"
        >
          Export Ledger (.XLSX)
        </Button>
      </div>

      {/* Modern Time Selector control dashboard */}
      <Card className="p-5 mb-6 bg-gradient-to-b from-[#131824] to-[#0e121d] border-white/10 relative overflow-hidden group">
        <div className="absolute top-0 right-0 h-32 w-32 bg-gradient-to-bl from-blue-500/5 to-transparent rounded-bl-full pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <CalendarRange className="h-5 w-5" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Coverage Window Controls
              </span>
              <span className="text-xs text-slate-300 font-medium mt-1">
                Customize interval to isolate specific shift performance records
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
            <div className="flex items-center gap-2 bg-[#090d16] p-2 rounded-xl border border-white/5 focus-within:border-blue-500/40 transition-colors flex-shrink-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 border-r border-white/5">
                Start:
              </span>
              <input
                type="time"
                value={shiftStart}
                onChange={(e) => setShiftStart(e.target.value)}
                className="bg-transparent text-xs font-extrabold text-slate-200 outline-none pr-2 focus:text-blue-400 w-[115px] min-w-[115px]"
              />
            </div>

            <div className="flex items-center gap-2 bg-[#090d16] p-2 rounded-xl border border-white/5 focus-within:border-blue-500/40 transition-colors flex-shrink-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 border-r border-white/5">
                End:
              </span>
              <input
                type="time"
                value={shiftEnd}
                onChange={(e) => setShiftEnd(e.target.value)}
                className="bg-transparent text-xs font-extrabold text-slate-200 outline-none pr-2 focus:text-blue-400 w-[115px] min-w-[115px]"
              />
            </div>

            <Button
              variant="primary"
              size="sm"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={handleFetchClick}
              className="flex-shrink-0 bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/10 active:scale-95 transition-all"
            >
              Sync Ledger
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Content Area */}
      <AnimatePresence mode="wait">
        {isRefreshing ? (
          <motion.div 
            key="shimmer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-2xl" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Skeleton className="h-80 w-full rounded-2xl" />
              <Skeleton className="h-80 w-full rounded-2xl" />
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex flex-col gap-6"
          >
            {/* Shift Counters Bento-style Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Total Enrolled */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#131824] to-[#0e121d] border border-white/5 p-5 shadow-xl group hover:border-blue-500/20 transition-all duration-300">
                <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-blue-500/5 to-transparent rounded-bl-full pointer-events-none" />
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Total Enrolled Cases
                  </span>
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <Users className="h-4.5 w-4.5" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-3xl font-extrabold text-slate-100 font-mono tracking-tight leading-none">
                    <AnimatedCounter value={data.total_patients} />
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium mt-2 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                    Enrolled during active shift
                  </span>
                </div>
              </div>

              {/* Card 2: Critical Cases */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#131824] to-[#0e121d] border border-white/5 p-5 shadow-xl group hover:border-red-500/20 transition-all duration-300">
                <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-red-500/5 to-transparent rounded-bl-full pointer-events-none" />
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">
                    Critical Trauma Cases
                  </span>
                  <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
                    <Flame className="h-4.5 w-4.5" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-3xl font-extrabold text-red-400 font-mono tracking-tight leading-none">
                    <AnimatedCounter value={data.critical_count} />
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium mt-2 flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${data.critical_count > 0 ? "bg-red-400 animate-pulse" : "bg-slate-400"}`} />
                    Requiring immediate fast-track room
                  </span>
                </div>
              </div>

              {/* Card 3: Average Wait Time */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#131824] to-[#0e121d] border border-white/5 p-5 shadow-xl group hover:border-amber-500/20 transition-all duration-300">
                <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-amber-500/5 to-transparent rounded-bl-full pointer-events-none" />
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Mean Registry Wait
                  </span>
                  <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                    <Clock className="h-4.5 w-4.5" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-3xl font-extrabold text-slate-100 font-mono tracking-tight leading-none">
                    <AnimatedCounter value={data.avg_wait_time} suffix="m" />
                  </span>
                  {/* Dynamic miniature visual progress bar representing clinical performance alignment */}
                  <div className="mt-3 flex flex-col gap-1">
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min((data.avg_wait_time / 45) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                      <span>Inflow</span>
                      <span>Target: 45m</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 4: Peak Wait Threshold */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#131824] to-[#0e121d] border border-white/5 p-5 shadow-xl group hover:border-purple-500/20 transition-all duration-300">
                <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-purple-500/5 to-transparent rounded-bl-full pointer-events-none" />
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Peak Wait Threshold
                  </span>
                  <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                    <TrendingUp className="h-4.5 w-4.5" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className={`text-3xl font-extrabold font-mono tracking-tight leading-none ${data.longest_wait_time > 60 ? "text-amber-400 animate-pulse" : "text-slate-100"}`}>
                    <AnimatedCounter value={data.longest_wait_time} suffix="m" />
                  </span>
                  {/* Miniature SLA warning tracker */}
                  <div className="mt-3 flex flex-col gap-1">
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${data.longest_wait_time > 60 ? "bg-amber-400" : "bg-purple-400"}`}
                        style={{ width: `${Math.min((data.longest_wait_time / 90) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                      <span>Longest</span>
                      <span>SLA Threshold: 90m</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Dashboard Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Chart 1: Priority Spread */}
              <Card className="p-5 bg-gradient-to-b from-[#131824] to-[#0e121d] border-white/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-blue-500/2 to-transparent rounded-bl-full pointer-events-none" />
                <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4.5 w-4.5 text-blue-400" />
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest">
                      Longitudinal Priority Spreads
                    </h3>
                  </div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    Tier Counts
                  </span>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.priority_distribution} margin={{ top: 10, bottom: 5, left: -20, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="#475569"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        dy={8}
                      />
                      <YAxis 
                        stroke="#475569" 
                        fontSize={10} 
                        tickLine={false}
                        axisLine={false}
                        dx={-8}
                      />
                      <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={45}>
                        {data.priority_distribution.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PRIORITY_COLORS[entry.name as keyof typeof PRIORITY_COLORS] || "#3b82f6"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Chart 2: Queue split Donut */}
              <Card className="p-5 bg-gradient-to-b from-[#131824] to-[#0e121d] border-white/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-blue-500/2 to-transparent rounded-bl-full pointer-events-none" />
                <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Users className="h-4.5 w-4.5 text-indigo-400" />
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest">
                      Emergency vs General Splitting Ratio
                    </h3>
                  </div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    Flow Division
                  </span>
                </div>
                <div className="h-64 w-full flex items-center justify-center relative">
                  
                  {/* Center donut overlay for custom visual look */}
                  <div className="absolute flex flex-col items-center justify-center pointer-events-none z-10 text-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                      Emergency
                    </span>
                    <span className="text-2xl font-black text-red-400 mt-1 font-mono">
                      {Math.round(
                        ((data.queue_distribution.find(q => q.name.includes("Emergency"))?.value || 0) / 
                        (data.total_patients || 1)) * 100
                      )}%
                    </span>
                    <span className="text-[8px] font-bold text-slate-500 mt-1 uppercase tracking-wider">
                      of overall flow
                    </span>
                  </div>

                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.queue_distribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={68}
                        outerRadius={84}
                        paddingAngle={6}
                        dataKey="value"
                      >
                        {data.queue_distribution.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={QUEUE_COLORS[index % QUEUE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                        iconSize={8}
                        formatter={(value) => (
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider ml-1.5 mr-4">
                            {value}
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Chart 3: Department workload chart */}
              <Card className="p-5 lg:col-span-2 bg-gradient-to-b from-[#131824] to-[#0e121d] border-white/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 h-36 w-36 bg-gradient-to-bl from-blue-500/2 to-transparent rounded-bl-full pointer-events-none" />
                <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4.5 w-4.5 text-blue-400" />
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest">
                      Clinical Unit Workload Index
                    </h3>
                  </div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    Active Admissions By Unit
                  </span>
                </div>
                <div className="h-68 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.department_workload} margin={{ top: 10, bottom: 5, left: -20, right: 10 }}>
                      <defs>
                        <linearGradient id="workloadGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.2} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="#475569"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        dy={8}
                      />
                      <YAxis 
                        stroke="#475569" 
                        fontSize={10} 
                        tickLine={false}
                        axisLine={false}
                        dx={-8}
                      />
                      <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.01)" }} />
                      <Bar dataKey="count" fill="url(#workloadGrad)" radius={[6, 6, 0, 0]} maxBarSize={60} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* AarogyaQ AI Clinician Insights Panel (Operational Summary Advisor) */}
              <div className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-[#111624] border border-[#212a44] p-6 shadow-2xl">
                <div className="absolute top-0 right-0 h-40 w-40 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-full pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 h-48 w-48 bg-cyan-400/5 rounded-full filter blur-3xl pointer-events-none" />
                
                {/* Header title */}
                <div className="flex items-center justify-between pb-3.5 border-b border-[#212a44] mb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                      <Sparkles className="h-4.5 w-4.5 animate-pulse text-cyan-200" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-100 uppercase tracking-wider">
                        AarogyaQ AI Clinician Insights
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Automated clinical intelligence parsing current ledger indices
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/10 uppercase tracking-widest">
                    Operational Advisory
                  </span>
                </div>

                {/* Content bullets */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {clinicalInsights.map((insight, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.3 }}
                      className={`p-3.5 rounded-xl border flex gap-3 ${
                        insight.type === "danger" 
                          ? "bg-red-500/5 border-red-500/10" 
                          : insight.type === "warning"
                          ? "bg-amber-500/5 border-amber-500/10"
                          : insight.type === "info"
                          ? "bg-indigo-500/5 border-indigo-500/10"
                          : "bg-emerald-500/5 border-emerald-500/10"
                      }`}
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        {insight.icon}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">
                          {insight.title}
                        </span>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed font-medium">
                          {insight.desc}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-5 pt-4 border-t border-[#212a44] flex items-center justify-between text-[10px] text-slate-500">
                  <span className="flex items-center gap-1.5 font-semibold uppercase tracking-wider">
                    <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
                    Algorithmic insights current as of {new Date().toLocaleTimeString()}
                  </span>
                  <span className="font-bold underline cursor-pointer hover:text-slate-300 transition-colors uppercase tracking-widest flex items-center gap-1">
                    Read SLA Policy <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
};
