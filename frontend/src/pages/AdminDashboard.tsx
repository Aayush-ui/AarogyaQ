/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from "react";
import { 
  Users, 
  ShieldAlert, 
  Hospital, 
  Activity, 
  Timer, 
  Compass, 
  FileSpreadsheet,
  Brain,
  Terminal,
  ChevronRight
} from "lucide-react";
import { useQueueStore } from "../store/useQueueStore";
import { useUIStore } from "../store/useUIStore";
import { PageTransition } from "../components/layout/PageTransition";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { AnimatedCounter } from "../components/charts/AnimatedCounter";

export const AdminDashboard: React.FC = () => {
  const { emergencyQueue, generalQueue, fetchQueues, fetchDepartments, departments, isLoading } = useQueueStore();
  const { isOffline, auditLogs, addToast } = useUIStore();

  useEffect(() => {
    fetchQueues();
    fetchDepartments();
    const interval = setInterval(() => {
      fetchQueues(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchQueues, fetchDepartments]);

  const activeCount = emergencyQueue.length + generalQueue.length;
  const criticalCount = emergencyQueue.filter(p => p.assessment?.priority_level === "Critical").length;

  const adminShortcuts = [
    { title: "Department Management", desc: "Manage hospital beds allocation & departments", icon: <Hospital className="h-5 w-5 text-indigo-500" />, hash: "#/departments" },
    { title: "Shift Analytics Summary", desc: "Clinician efficiency reports, shift metrics", icon: <FileSpreadsheet className="h-5 w-5 text-blue-500" />, hash: "#/shift" },
    { title: "Operations Security Console", desc: "Live audits trail, logs registry, code triggers", icon: <Compass className="h-5 w-5 text-emerald-500" />, hash: "#/command" },
  ];

  return (
    <PageTransition id="admin-dashboard">
      <div className="p-6 max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-xs font-bold text-indigo-400 tracking-widest uppercase block mb-1">
              SYSTEM OVERVIEW
            </span>
            <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
              Hospital Operations Command Center
            </h1>
          </div>
          <div className="text-xs font-mono font-bold text-slate-300 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full uppercase">
            Active Shift Clearance: ADMINISTRATOR
          </div>
        </div>

        {/* Global KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 flex items-center justify-between hover:border-white/20" hoverable>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Active Queue Size
              </span>
              <div className="text-3xl font-extrabold text-slate-100">
                <AnimatedCounter value={activeCount} />
              </div>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                Occupancy: 84%
              </span>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20">
              <Users className="h-5 w-5" />
            </div>
          </Card>

          <Card className="p-5 flex items-center justify-between hover:border-white/20" hoverable>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Overloaded Areas
              </span>
              <div className="text-3xl font-extrabold text-slate-100">
                <AnimatedCounter value={departments.filter(d => d.status === "Overloaded").length} />
              </div>
              <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider block">
                Requires intervention
              </span>
            </div>
            <div className="p-3 bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20">
              <ShieldAlert className="h-5 w-5 animate-pulse" />
            </div>
          </Card>

          <Card className="p-5 flex items-center justify-between hover:border-white/20" hoverable>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Active Clinicians
              </span>
              <div className="text-3xl font-extrabold text-slate-100">
                <span>3</span>
                <span className="text-sm font-medium ml-1 text-slate-400">Live</span>
              </div>
              <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">
                Fully Synchronized
              </span>
            </div>
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20">
              <Hospital className="h-5 w-5" />
            </div>
          </Card>

          <Card className="p-5 flex items-center justify-between hover:border-white/20" hoverable>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Avg AI Model Handshake
              </span>
              <div className="text-3xl font-extrabold text-slate-100">
                <span>1.4</span>
                <span className="text-sm font-medium ml-1 text-slate-400">sec</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                SLA Performance normal
              </span>
            </div>
            <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-2xl border border-cyan-500/20">
              <Brain className="h-5 w-5" />
            </div>
          </Card>
        </div>

        {/* Administration Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Department status card */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
              <Hospital className="h-4 w-4 text-slate-400" />
              Live Clinical Department Workloads
            </h2>
            <Card className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {departments.map((dep) => (
                  <div key={dep.name} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-extrabold text-slate-200">{dep.name}</span>
                      <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded-full ${
                        dep.status === "Overloaded" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                        "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      }`}>{dep.status}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="text-[11px] text-slate-400 font-medium">Active Patients:</div>
                      <div className="text-base font-extrabold text-slate-100">{dep.active_patients}</div>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="text-[11px] text-slate-400 font-medium">Wait Time:</div>
                      <div className="text-xs font-bold text-slate-300">{dep.wait_time_mins} mins</div>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          dep.status === "Overloaded" ? "bg-red-500 animate-pulse" : "bg-blue-500"
                        }`}
                        style={{ width: `${Math.min((dep.active_patients / 15) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-right pt-2">
                <Button size="sm" variant="outline" onClick={() => window.location.hash = "#/departments"}>
                  <span>Manage Bed Registry</span>
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </Card>
          </div>

          {/* Quick Access Sidebar */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest">
              Operator Panels
            </h2>
            <div className="space-y-3">
              {adminShortcuts.map((sc) => (
                <Card 
                  key={sc.title}
                  onClick={() => {
                    window.location.hash = sc.hash;
                    addToast(`Launching administrative terminal: ${sc.title}`, "info");
                  }}
                  className="p-4 bg-white/[0.03] hover:bg-white/[0.08] border-white/10 transition-all cursor-pointer flex gap-4 items-center group shadow-sm"
                  hoverable
                >
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 group-hover:bg-white/10 transition-all">
                    {sc.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-bold text-slate-100 group-hover:text-indigo-400 leading-tight">
                      {sc.title}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1 truncate">
                      {sc.desc}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                </Card>
              ))}
            </div>
          </div>

        </div>

        {/* Live System Log Stream */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
            <Terminal className="h-4 w-4 text-slate-400" />
            Live Hospital cryptographic Audits Trail
          </h2>
          <Card className="p-5 border-white/10 bg-slate-950 text-slate-300 font-mono text-xs rounded-2xl shadow-inner space-y-2">
            {auditLogs.slice(0, 4).map((log) => (
              <div key={log.id} className="flex flex-col sm:flex-row gap-1 sm:gap-4 hover:bg-white/5 p-1 rounded transition-colors">
                <span className="text-slate-500 text-[10px] font-bold shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                <span className="text-blue-400 font-bold shrink-0 uppercase tracking-wider text-[10px] bg-blue-500/10 px-1 rounded border border-blue-500/10">[{log.role}]</span>
                <span className="text-slate-300 leading-normal flex-1">{log.action}</span>
                <span className="text-slate-500 text-[10px] shrink-0 text-right font-semibold uppercase">{log.user}</span>
              </div>
            ))}
          </Card>
        </div>

      </div>
    </PageTransition>
  );
};
