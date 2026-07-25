/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, Flame, Eye, EyeOff, ClipboardList } from "lucide-react";
import { TriageQueueItem } from "../../types";
import { Card } from "../ui/Card";
import { PriorityBadge } from "../queue/PriorityBadge";
import { ExplainabilityPanel } from "../queue/ExplainabilityPanel";
import { Button } from "../ui/Button";

interface TimelineEntryProps {
  item: TriageQueueItem;
  isLast?: boolean;
  id?: string;
}

export const TimelineEntry: React.FC<TimelineEntryProps> = ({ item, isLast = false, id }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { visit_id, status, queue_type, department_assigned, pain_level, registered_at } = item.visit;
  const { risk_score, priority_level, mapped_symptoms, contributing_factors, score_breakdown } = item.assessment;

  // Format date elegantly
  const formatDateTime = (isoString?: string) => {
    if (!isoString) return "N/A";
    const d = new Date(isoString);
    return `${d.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })} at ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
  };

  return (
    <div id={id} className="relative flex gap-6 pb-8">
      {/* Timeline connector line & indicator */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-9 h-9 rounded-full bg-zinc-950 border-2 border-zinc-800 flex items-center justify-center text-emerald-500 z-10 shadow-lg shadow-black/40">
          <ClipboardList className="h-4.5 w-4.5" />
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 bg-gradient-to-b from-zinc-800 via-zinc-800/40 to-transparent mt-1" />
        )}
      </div>

      {/* Main Content Card */}
      <div className="flex-1">
        <Card className="hover:border-zinc-700/80 transition-colors">
          <div className="p-4 flex flex-col gap-3">
            {/* Top row */}
            <div className="flex justify-between items-start flex-wrap gap-2">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-zinc-100">
                    Visit {visit_id}
                  </span>
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-zinc-950 text-zinc-400 border border-zinc-800 uppercase">
                    {status}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{formatDateTime(registered_at)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <PriorityBadge priority={priority_level} />
                <div className="flex flex-col items-end leading-none">
                  <span className="text-sm font-extrabold font-mono text-zinc-100">
                    {risk_score}%
                  </span>
                  <span className="text-[8px] font-mono font-bold text-zinc-500 uppercase mt-0.5">
                    Risk
                  </span>
                </div>
              </div>
            </div>

            {/* Middle row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-zinc-950/40 border border-zinc-800/40 p-3 rounded-xl">
              <div>
                <p className="text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-widest mb-1">
                  Queue & routing
                </p>
                <p className="text-zinc-300 font-medium">
                  {queue_type} Stream / {department_assigned}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <Flame className="h-3 w-3 text-orange-400" /> Pain intensity
                </p>
                <p className="text-zinc-300 font-semibold">{pain_level}/10</p>
              </div>
            </div>

            {/* Vitals Summary block if present */}
            {item.visit.vitals && (
              <div className="bg-zinc-950/30 border border-zinc-800/50 p-3 rounded-xl flex flex-col gap-2">
                <p className="text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-widest leading-none">
                  Logged Vital Signs
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 text-xs font-mono">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">SpO2</span>
                    <span className={`font-extrabold mt-0.5 ${item.visit.vitals.spo2 && item.visit.vitals.spo2 < 95 ? "text-red-400" : "text-emerald-400"}`}>
                      {item.visit.vitals.spo2}%
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Pulse</span>
                    <span className="font-extrabold text-zinc-200 mt-0.5">
                      {item.visit.vitals.heart_rate} bpm
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">BP</span>
                    <span className="font-extrabold text-zinc-200 mt-0.5">
                      {item.visit.vitals.systolic_bp}/{item.visit.vitals.diastolic_bp}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Temp</span>
                    <span className="font-extrabold text-zinc-200 mt-0.5">
                      {item.visit.vitals.temperature}°F
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">RR</span>
                    <span className="font-extrabold text-zinc-200 mt-0.5">
                      {item.visit.vitals.respiratory_rate} breaths
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Symptoms */}
            <div className="flex flex-wrap gap-1">
              {mapped_symptoms.map((symptom) => (
                <span
                  key={symptom}
                  className="text-[9px] font-bold tracking-wide uppercase bg-zinc-950 text-zinc-400 border border-zinc-800 px-2 py-0.5 rounded-md"
                >
                  {symptom}
                </span>
              ))}
            </div>

            {/* AI Summary and Audit Button */}
            <div className="pt-2 border-t border-zinc-800/40 flex justify-between items-center gap-4">
              <p className="text-xs text-zinc-400 italic max-w-[70%] line-clamp-1">
                "{item.summary.summary_text}"
              </p>
              
              <Button
                variant="secondary"
                size="sm"
                leftIcon={isExpanded ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? "Hide Audit" : "Full Audit"}
              </Button>
            </div>

            {/* Expandable audit log with explainability breakdown */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="pt-2 flex flex-col gap-3">
                    <div className="p-3 bg-zinc-950 text-xs text-zinc-400 leading-relaxed border border-zinc-800 rounded-xl">
                      <p className="font-bold text-[10px] text-zinc-500 uppercase tracking-widest mb-1">
                        Full clinical report
                      </p>
                      {item.summary.summary_text}
                    </div>

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
      </div>
    </div>
  );
};
