/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from "react";
import { 
  Flame, 
  UsersRound, 
  Heart, 
  Activity, 
  Clock, 
  ShieldAlert, 
  ArrowRight,
  ClipboardList,
  Stethoscope,
  ChevronRight
} from "lucide-react";
import { useQueueStore } from "../store/useQueueStore";
import { useUIStore } from "../store/useUIStore";
import { PageTransition } from "../components/layout/PageTransition";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { AnimatedCounter } from "../components/charts/AnimatedCounter";

export const DoctorDashboard: React.FC = () => {
  const { emergencyQueue, fetchQueues, isLoading } = useQueueStore();
  const { addToast } = useUIStore();

  useEffect(() => {
    fetchQueues();
    const interval = setInterval(() => fetchQueues(true), 5000);
    return () => clearInterval(interval);
  }, [fetchQueues]);

  const activeTraumaCount = emergencyQueue.length;
  const criticalTierCount = emergencyQueue.filter(
    (item) => item.assessment?.priority_level === "Critical"
  ).length;

  const doctorQuickActions = [
    {
      title: "Active Trauma Stream",
      desc: "Review live critical emergency queues & prioritize cases",
      icon: <Flame className="h-6 w-6 text-red-500 animate-pulse" />,
      hash: "#/live"
    },
    {
      title: "Medication Orders",
      desc: "Authorized medical prescription, dosage, & labs dispatch desk",
      icon: <Stethoscope className="h-6 w-6 text-blue-500" />,
      hash: "#/live"
    },
    {
      title: "Patient History Archive",
      desc: "Search patient clinical charts, vitals timelines & records",
      icon: <UsersRound className="h-6 w-6 text-indigo-500" />,
      hash: "#/patient-history"
    },
    {
      title: "Discharge disposition",
      desc: "Review patient outcome tracking & generate discharge notes",
      icon: <ClipboardList className="h-6 w-6 text-emerald-500" />,
      hash: "#/live"
    }
  ];

  return (
    <PageTransition id="doctor-dashboard">
      <div className="p-6 max-w-7xl mx-auto space-y-8">
        
        {/* Header banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-xs font-bold text-red-400 tracking-widest uppercase block mb-1 animate-pulse">
              🔴 LIVE CRITICAL DISPATCH
            </span>
            <h1 className="text-2xl font-black text-slate-100 tracking-tight">
              Physician Triage Portal
            </h1>
          </div>
          <div className="text-xs font-mono font-bold text-slate-300 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full uppercase">
            Active Shift Clearance: MEDICAL DOCTOR (MD)
          </div>
        </div>

        {/* Dynamic Vitals Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 flex items-center justify-between hover:border-white/20" hoverable>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Active Emergencies
              </span>
              <div className="text-3xl font-extrabold text-slate-100">
                <AnimatedCounter value={activeTraumaCount} />
              </div>
              <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider block animate-pulse">
                Trauma Stream Active
              </span>
            </div>
            <div className="p-3 bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20">
              <Flame className="h-5 w-5 animate-pulse" />
            </div>
          </Card>

          <Card className="p-5 flex items-center justify-between hover:border-white/20" hoverable>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
                Critical Tier (Red)
              </span>
              <div className="text-3xl font-extrabold text-red-400">
                <AnimatedCounter value={criticalTierCount} />
              </div>
              <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider block">
                Needs disposition
              </span>
            </div>
            <div className="p-3 bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </Card>

          <Card className="p-5 flex items-center justify-between hover:border-white/20" hoverable>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Avg Treatment Time
              </span>
              <div className="text-3xl font-extrabold text-slate-100">
                <AnimatedCounter value={34} />
              </div>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                -3m vs shift baseline
              </span>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
              <Clock className="h-5 w-5" />
            </div>
          </Card>

          <Card className="p-5 flex items-center justify-between hover:border-white/20" hoverable>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Cases Treated
              </span>
              <div className="text-3xl font-extrabold text-slate-100">
                <AnimatedCounter value={18} />
              </div>
              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block">
                Shift quota synced
              </span>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20">
              <Heart className="h-5 w-5" />
            </div>
          </Card>
        </div>

        {/* Dynamic Treatment Workspace Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              High-Risk Physician Review Queue
            </h2>
            
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10 text-slate-300 font-bold uppercase tracking-wider">
                      <th className="p-3.5">ID</th>
                      <th className="p-3.5">Clinician Patient Name</th>
                      <th className="p-3.5">Complaint / Vitals</th>
                      <th className="p-3.5">AI Risk Handshake</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {isLoading ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400 font-semibold font-mono animate-pulse">
                          Querying live hospital system logs...
                        </td>
                      </tr>
                    ) : emergencyQueue.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                          No emergency queue cases waiting.
                        </td>
                      </tr>
                    ) : (
                      emergencyQueue.map((item) => {
                        const scoreVal = item.assessment?.risk_score || 0;
                        const hr = item.visit.vitals?.heart_rate ? `${item.visit.vitals.heart_rate} bpm` : "N/A";
                        const bp = item.visit.vitals?.systolic_bp && item.visit.vitals?.diastolic_bp 
                          ? `${item.visit.vitals.systolic_bp}/${item.visit.vitals.diastolic_bp}` 
                          : "N/A";
                        
                        return (
                          <tr key={item.patient.patient_id} className="hover:bg-white/5 transition-colors">
                            <td className="p-3.5 font-mono font-bold text-slate-400">
                              {item.patient.patient_id}
                            </td>
                            <td className="p-3.5 font-bold text-slate-200">
                              {item.patient.name || "Anonymous Intake"}
                            </td>
                            <td className="p-3.5 text-slate-400 font-medium">
                              <div>{item.visit.chief_complaint || "No compliant logged"}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5 font-semibold uppercase">
                                HR: {hr} • BP: {bp}
                              </div>
                            </td>
                            <td className="p-3.5">
                              <span className={`font-mono font-bold px-2.5 py-1 rounded-md text-[10px] ${
                                scoreVal >= 80 ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                                "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                              }`}>
                                {scoreVal}% Risk
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => {
                                  window.location.hash = `#/patient/${item.patient.patient_id}`;
                                  addToast(`Loading Clinical Case Chart: ${item.patient.name}`, "success");
                                }}
                                className="group/btn"
                              >
                                <span>Manage Chart</span>
                                <ChevronRight className="h-3 w-3 ml-1 group-hover/btn:translate-x-0.5 transition-transform" />
                              </Button>
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
              Physician Shortcuts
            </h2>
            <div className="space-y-3">
              {doctorQuickActions.map((act) => (
                <Card 
                  key={act.title}
                  onClick={() => {
                    window.location.hash = act.hash;
                    addToast(`Opening Clinician Subsystem: ${act.title}`, "info");
                  }}
                  className="p-4 bg-white/[0.03] hover:bg-white/[0.08] border-white/10 transition-all cursor-pointer flex gap-4 items-center group shadow-sm"
                  hoverable
                >
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 group-hover:bg-white/10 transition-all">
                    {act.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-bold text-slate-100 group-hover:text-blue-400 leading-tight">
                      {act.title}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1 truncate">
                      {act.desc}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                </Card>
              ))}
            </div>
          </div>

        </div>

      </div>
    </PageTransition>
  );
};
