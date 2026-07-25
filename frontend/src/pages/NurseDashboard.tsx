/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from "react";
import { 
  UsersRound, 
  Brain, 
  RefreshCw, 
  FileSpreadsheet, 
  Clock, 
  Heart, 
  ShieldAlert, 
  ArrowRight,
  Plus
} from "lucide-react";
import { useQueueStore } from "../store/useQueueStore";
import { useUIStore } from "../store/useUIStore";
import { PageTransition } from "../components/layout/PageTransition";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { AnimatedCounter } from "../components/charts/AnimatedCounter";

export const NurseDashboard: React.FC = () => {
  const { emergencyQueue, generalQueue, fetchQueues, isLoading } = useQueueStore();
  const { addToast } = useUIStore();

  useEffect(() => {
    fetchQueues();
    const interval = setInterval(() => fetchQueues(true), 5000);
    return () => clearInterval(interval);
  }, [fetchQueues]);

  const totalRegisteredToday = emergencyQueue.length + generalQueue.length + 8; // Simulated historic offset
  const pendingTriage = emergencyQueue.filter(p => !p.assessment || !p.assessment.priority_level).length + 2;
  const criticalCases = emergencyQueue.filter(p => p.assessment?.priority_level === "Critical").length;

  const quickActions = [
    {
      title: "Register Patient",
      desc: "Begin front-desk intake & register basic demographic details",
      icon: <UsersRound className="h-6 w-6 text-blue-400" />,
      hash: "#/register",
      color: "hover:border-blue-500/30 hover:bg-blue-500/10"
    },
    {
      title: "AI Triage Desk",
      desc: "Perform AI-assisted symptom analysis & vital triage routing",
      icon: <Brain className="h-6 w-6 text-cyan-400" />,
      hash: "#/nurse",
      color: "hover:border-cyan-500/30 hover:bg-cyan-500/10"
    },
    {
      title: "Vitals Reassessment",
      desc: "Update dynamic vitals & track priority level drift",
      icon: <RefreshCw className="h-6 w-6 text-indigo-400" />,
      hash: "#/reassess",
      color: "hover:border-indigo-500/30 hover:bg-indigo-500/10"
    },
    {
      title: "Patient History",
      desc: "Search patient directory & past triage logs",
      icon: <FileSpreadsheet className="h-6 w-6 text-slate-400" />,
      hash: "#/patient-history",
      color: "hover:border-slate-500/30 hover:bg-white/[0.05]"
    }
  ];

  return (
    <PageTransition id="nurse-dashboard">
      <div className="p-6 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-xs font-bold text-blue-400 tracking-widest uppercase block mb-1">
              METRO EMERGENCY CLINICAL GATEWAY
            </span>
            <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
              Triage Nurse Workspace
            </h1>
          </div>
          <div className="text-xs font-mono font-bold text-slate-300 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full uppercase">
            Active Shift Clearance: NURSE
          </div>
        </div>

        {/* Vital KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 flex items-center justify-between hover:border-white/20" hoverable>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Registered Today
              </span>
              <div className="text-3xl font-extrabold text-slate-100">
                <AnimatedCounter value={totalRegisteredToday} />
              </div>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                +4 since last hour
              </span>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20">
              <UsersRound className="h-5 w-5" />
            </div>
          </Card>

          <Card className="p-5 flex items-center justify-between hover:border-white/20" hoverable>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Pending AI Triage
              </span>
              <div className="text-3xl font-extrabold text-slate-100">
                <AnimatedCounter value={pendingTriage} />
              </div>
              <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">
                Average wait: 4 min
              </span>
            </div>
            <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-2xl border border-cyan-500/20">
              <Brain className="h-5 w-5 animate-pulse" />
            </div>
          </Card>

          <Card className="p-5 flex items-center justify-between hover:border-white/20" hoverable>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
                Active Trauma Alerts
              </span>
              <div className="text-3xl font-extrabold text-red-400">
                <AnimatedCounter value={criticalCases} />
              </div>
              <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider block animate-pulse">
                Critical dispatch active
              </span>
            </div>
            <div className="p-3 bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </Card>

          <Card className="p-5 flex items-center justify-between hover:border-white/20" hoverable>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Reassessment Overdue
              </span>
              <div className="text-3xl font-extrabold text-slate-100">
                <AnimatedCounter value={2} />
              </div>
              <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">
                Needs immediate vitals
              </span>
            </div>
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20">
              <RefreshCw className="h-5 w-5 animate-spin-slow" />
            </div>
          </Card>
        </div>

        {/* Quick Actions Panel */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest">
            Primary Clinical Controls
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Card 
                key={action.title} 
                className={`p-5 transition-all duration-300 border-white/10 bg-white/[0.03] group cursor-pointer ${action.color}`}
                onClick={() => {
                  window.location.hash = action.hash;
                  addToast(`Opening Triage Console: ${action.title}`, "info");
                }}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 group-hover:bg-white/10 group-hover:scale-110 transition-transform">
                    {action.icon}
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="text-sm font-bold text-slate-100 group-hover:text-blue-400 block leading-tight">
                  {action.title}
                </h3>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  {action.desc}
                </p>
              </Card>
            ))}
          </div>
        </div>

        {/* Dynamic Queue Status Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest">
              Emergency Department Active Queue
            </h2>
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10 text-slate-300 font-bold uppercase tracking-wider">
                      <th className="p-3.5">Patient ID</th>
                      <th className="p-3.5">Name</th>
                      <th className="p-3.5">Complaint</th>
                      <th className="p-3.5">Risk Score</th>
                      <th className="p-3.5 text-right">Triage Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {isLoading ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400 font-semibold font-mono animate-pulse">
                          Synchronizing secure clinical registry...
                        </td>
                      </tr>
                    ) : emergencyQueue.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                          No active critical trauma cases in stream.
                        </td>
                      </tr>
                    ) : (
                      emergencyQueue.slice(0, 5).map((item) => {
                        const scoreVal = item.assessment?.risk_score || 0;
                        const level = item.assessment?.priority_level || "Standard";
                        
                        return (
                          <tr key={item.patient.patient_id} className="hover:bg-white/5 transition-colors">
                            <td className="p-3.5 font-mono font-bold text-slate-400">
                              {item.patient.patient_id}
                            </td>
                            <td className="p-3.5 font-bold text-slate-200">
                              {item.patient.name || "Anonymous Intake"}
                            </td>
                            <td className="p-3.5 text-slate-400 font-medium max-w-[150px] truncate">
                              {item.visit.chief_complaint || "No compliant logged"}
                            </td>
                            <td className="p-3.5">
                              <span className={`font-mono font-bold px-2 py-0.5 rounded-md text-[10px] ${
                                scoreVal >= 80 ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                                scoreVal >= 50 ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" :
                                "bg-white/5 text-slate-400 border border-white/10"
                              }`}>
                                {scoreVal}% Risk
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <span className={`inline-flex items-center gap-1 font-extrabold text-[10px] px-2 py-0.5 rounded-full ${
                                level === "Critical" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                                level === "High" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" :
                                "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              }`}>
                                {level.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest">
              Triage Protocol Checklist
            </h2>
            <Card className="p-5 space-y-4">
              <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                Hospital intake safety procedures mandate adherence to active clinical checklist workflows:
              </p>
              <div className="space-y-3">
                {[
                  "Verify national patient ID and identity clearance records",
                  "Gather comprehensive symptom summary & timeline of onset",
                  "Conduct real-time ECG telemetry and arterial pressure handshake",
                  "Invoke AI Symptom Triage assessment engine feedback",
                  "Escalate critical scores to Physician queue stream immediately"
                ].map((step, idx) => (
                  <div key={idx} className="flex gap-3 items-start">
                    <span className="flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-blue-500/10 text-[10px] font-bold text-blue-400 border border-blue-500/20">
                      {idx + 1}
                    </span>
                    <span className="text-xs text-slate-300 font-medium leading-tight pt-0.5">
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

      </div>
    </PageTransition>
  );
};
