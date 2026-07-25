/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Clock, Eye, EyeOff, Activity, ShieldAlert, CheckCircle, Flame, Plus, HeartCrack } from "lucide-react";
import { TriageQueueItem } from "../../types";
import { useQueueStore } from "../../store/useQueueStore";
import { usePatientStore } from "../../store/usePatientStore";
import { Card } from "../ui/Card";
import { PriorityBadge } from "./PriorityBadge";
import { ProgressRing } from "../ui/ProgressRing";
import { ExplainabilityPanel } from "./ExplainabilityPanel";
import { Button } from "../ui/Button";
import { TwinBadge } from "../patient/TwinBadge";

interface QueueCardProps {
  item: TriageQueueItem;
  id?: string;
}

export const QueueCard: React.FC<QueueCardProps> = ({ item, id }) => {
  const { updatePatientStatus, reassessPatient } = useQueueStore();
  const { selectPatient } = usePatientStore();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [isReassessing, setIsReassessing] = useState(false);
  const [tempPain, setTempPain] = useState(item.visit.pain_level);
  const [minutesWaiting, setMinutesWaiting] = useState(0);

  // Parse patient and visit fields
  const { name, age, gender, patient_id } = item.patient;
  const { visit_id, status, queue_type, department_assigned, pain_level, registered_at } = item.visit;
  const { risk_score, priority_level, mapped_symptoms, contributing_factors, score_breakdown } = item.assessment;

  // Track minutes waiting from registered_at
  useEffect(() => {
    if (!registered_at) return;
    const calcWait = () => {
      const diffMs = Date.now() - new Date(registered_at).getTime();
      setMinutesWaiting(Math.max(0, Math.floor(diffMs / 60000)));
    };
    calcWait();
    const interval = setInterval(calcWait, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [registered_at]);

  const isCritical = priority_level === "Critical";
  const isHigh = priority_level === "High";
  const extraClass = isCritical ? "critical-pulse" : isHigh ? "high-glow" : "";

  const leftBorderColor = {
    Critical: "border-l-red-500",
    High: "border-l-orange-500",
    Medium: "border-l-yellow-500",
    Low: "border-l-emerald-500",
  }[priority_level as "Critical" | "High" | "Medium" | "Low"] || "border-l-slate-700";

  const handleStatusChange = (newStatus: string) => {
    updatePatientStatus(visit_id, newStatus);
  };

  const handleReassessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    reassessPatient(visit_id, tempPain);
    setIsReassessing(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="w-full"
    >
      <Card
        id={id}
        className={`border-l-4 ${leftBorderColor} hover:shadow-xl hover:shadow-black/20 ${extraClass}`}
      >
        <div className="p-4 flex flex-col gap-3">
          {/* Top Line: Name, Priority Badge, Progress Ring */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-slate-100 tracking-tight leading-none">
                  {name}
                </span>
                <span className="text-xs font-medium text-slate-400 font-mono">
                  {gender.charAt(0)}, {age}y
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <PriorityBadge priority={priority_level} />
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase bg-white/5 px-2 py-0.5 rounded border border-white/10 tabular">
                  {department_assigned}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <ProgressRing value={risk_score} priority={priority_level} size={50} strokeWidth={4} />
            </div>
          </div>

          {/* Center Details: Pain Level, Symptoms */}
          <div className="flex flex-wrap items-center gap-3 text-xs border-t border-b border-white/10 py-2">
            <div className="flex items-center gap-1 text-slate-400">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              <span className="font-medium text-[11px] tabular">
                Wait: {minutesWaiting}m
              </span>
            </div>
            
            <div className="flex items-center gap-1 text-slate-400">
              <Flame className="h-3.5 w-3.5 text-red-500" />
              <span className="font-semibold text-[11px] text-slate-300 tabular">
                Pain: {pain_level}/10
              </span>
            </div>

            <div className="flex items-center gap-1 text-slate-500 ml-auto text-[10px] tabular">
              ID: {patient_id}
            </div>
          </div>

          {/* Vitals Summary Strip */}
          {item.visit.vitals && (
            <div className="grid grid-cols-4 gap-1 px-3 py-2 bg-white/5 border border-white/5 rounded-xl text-slate-400 font-mono">
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none">SpO2</span>
                <span className={`font-extrabold text-[10px] mt-1 leading-none ${item.visit.vitals.spo2 && item.visit.vitals.spo2 < 95 ? "text-red-400" : "text-emerald-400"}`}>
                  {item.visit.vitals.spo2 ? `${item.visit.vitals.spo2}%` : "--"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none">Pulse</span>
                <span className={`font-extrabold text-[10px] mt-1 leading-none ${item.visit.vitals.heart_rate && (item.visit.vitals.heart_rate > 100 || item.visit.vitals.heart_rate < 60) ? "text-yellow-400" : "text-slate-300"}`}>
                  {item.visit.vitals.heart_rate ? `${item.visit.vitals.heart_rate} bpm` : "--"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none">Blood Press</span>
                <span className={`font-extrabold text-[10px] mt-1 leading-none ${item.visit.vitals.systolic_bp && (item.visit.vitals.systolic_bp > 140 || item.visit.vitals.systolic_bp < 90) ? "text-yellow-400" : "text-slate-300"}`}>
                  {item.visit.vitals.systolic_bp && item.visit.vitals.diastolic_bp ? `${item.visit.vitals.systolic_bp}/${item.visit.vitals.diastolic_bp}` : "--"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none">Temp</span>
                <span className="font-extrabold text-[10px] text-slate-300 mt-1 leading-none">
                  {item.visit.vitals.temperature ? `${item.visit.vitals.temperature}°F` : "--"}
                </span>
              </div>
            </div>
          )}

          {/* Symptoms List (Truncated chips) */}
          <div className="flex flex-wrap gap-1">
            {mapped_symptoms.slice(0, 3).map((symptom) => (
              <span
                key={symptom}
                className="text-[9px] font-bold tracking-wide uppercase bg-white/5 text-slate-400 border border-white/10 px-2 py-0.5 rounded-md"
              >
                {symptom}
              </span>
            ))}
            {mapped_symptoms.length > 3 && (
              <span className="text-[9px] font-bold bg-white/10 text-slate-400 px-1.5 py-0.5 rounded-md">
                +{mapped_symptoms.length - 3} more
              </span>
            )}
          </div>

          {/* Digital Twin compact badge — shown when twin data is available */}
          {item.twin && (
            <TwinBadge twin={item.twin} compact />
          )}

          {/* Action Row */}
          <div className="flex justify-between items-center mt-1 gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={isExpanded ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? "Hide Details" : "Clinical Audit"}
            </Button>

            <div className="flex gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-white/5 text-slate-400 border border-white/10"
                onClick={() => {
                  selectPatient(item);
                  window.location.hash = `#/patient/${patient_id}`;
                }}
              >
                History
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setIsExpanded(true);
                  setIsReassessing(!isReassessing);
                }}
              >
                Intake Action
              </Button>
            </div>
          </div>

          {/* Smooth Expanding Compartment */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="pt-2 flex flex-col gap-3">
                  {/* Digital Twin full state card — inside clinical audit */}
                  {item.twin && (
                    <TwinBadge twin={item.twin} compact={false} />
                  )}

                  {/* Reassessment inline card */}
                  {isReassessing && (
                    <motion.form
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      onSubmit={handleReassessSubmit}
                      className="p-3 bg-[#131823] border border-white/10 rounded-xl flex flex-col gap-3"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          Reassess Patient Vitals
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsReassessing(false)}
                          className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-xs text-slate-400 font-medium">
                          <span>Reassess Pain Level:</span>
                          <span className="text-slate-200 font-bold tabular">{tempPain}/10</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          value={tempPain}
                          onChange={(e) => setTempPain(Number(e.target.value))}
                          className="w-full accent-blue-500 bg-white/10 h-1 rounded-lg"
                        />
                      </div>

                      <Button variant="success" size="sm" type="submit" className="w-full">
                        Submit Reassessment
                      </Button>
                    </motion.form>
                  )}

                  {/* Clinician Quick Commands */}
                  <div className="p-3 bg-[#131823] border border-white/10 rounded-xl flex flex-col gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Discharge & Queue Transfers
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                        leftIcon={<CheckCircle className="h-3.5 w-3.5" />}
                        onClick={() => handleStatusChange("ADMITTED")}
                      >
                        Admit
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="border-white/10 bg-white/5 hover:bg-white/10 text-slate-300"
                        leftIcon={<HeartCrack className="h-3.5 w-3.5" />}
                        onClick={() => handleStatusChange("TRANSFERRED")}
                      >
                        Transfer
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400"
                        leftIcon={<ShieldAlert className="h-3.5 w-3.5" />}
                        onClick={() => handleStatusChange("DISCHARGED")}
                      >
                        Discharge
                      </Button>
                    </div>
                  </div>

                  {/* Clinical Assessment AI summary */}
                  <div className="p-3 bg-[#131823]/50 border border-white/10 rounded-xl text-xs text-slate-400 italic leading-relaxed">
                    <p className="font-semibold text-[10px] font-sans text-slate-500 uppercase tracking-widest not-italic mb-1">
                      Clinical Intake Summary
                    </p>
                    "{item.summary.summary_text}"
                  </div>

                  {/* Explainability Panel */}
                  <ExplainabilityPanel
                    priority={priority_level}
                    contributingFactors={contributing_factors}
                    scoreBreakdown={score_breakdown}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  );
};
