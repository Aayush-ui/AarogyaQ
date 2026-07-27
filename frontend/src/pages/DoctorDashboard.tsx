/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { User, Activity, AlertTriangle, ShieldCheck, HeartPulse, RefreshCw, Clock } from "lucide-react";
import { useQueueStore } from "../store/useQueueStore";
import { useUIStore } from "../store/useUIStore";
import { PageTransition } from "../components/layout/PageTransition";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { TriageQueueItem, ExplanationData } from "../types";
import { getExplanation } from "../api/explanation";
import { updateVisitStatus, reassessVisit } from "../api/visits";
import { XAIPanel } from "../components/queue/XAIPanel";
import { PriorityBadge } from "../components/queue/PriorityBadge";
import { TwinAlertBadge } from "../components/queue/TwinAlertBadge";

export const DoctorDashboard: React.FC = () => {
  const { emergencyQueue, generalQueue, fetchQueues, isLoading: queueLoading } = useQueueStore();
  const { addToast } = useUIStore();

  const [selectedItem, setSelectedItem] = useState<TriageQueueItem | null>(null);
  const [explanation, setExplanation] = useState<ExplanationData | null>(null);
  const [expLoading, setExpLoading] = useState(false);
  const [expError, setExpError] = useState<string | null>(null);

  const [reassessOpen, setReassessOpen] = useState(false);
  const [tempPain, setTempPain] = useState(5);
  const [actionLoading, setActionLoading] = useState(false);

  // Poll queues every 5 seconds
  useEffect(() => {
    fetchQueues();
    const interval = setInterval(() => {
      fetchQueues(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchQueues]);

  // Combined and sorted lists
  const allPatients = [...emergencyQueue, ...generalQueue].sort((a, b) => {
    // Critical first, then High, then Medium, then Low
    const order = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    const aOrder = order[a.assessment.priority_level as keyof typeof order] ?? 4;
    const bOrder = order[b.assessment.priority_level as keyof typeof order] ?? 4;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return b.assessment.risk_score - a.assessment.risk_score;
  });

  // Keep selection synced when queues refresh
  useEffect(() => {
    if (selectedItem) {
      const match = allPatients.find(p => p.visit.visit_id === selectedItem.visit.visit_id);
      if (match) {
        setSelectedItem(match);
      }
    }
  }, [emergencyQueue, generalQueue]);

  // Load explanation when item changes
  useEffect(() => {
    if (!selectedItem) {
      setExplanation(null);
      setExpError(null);
      return;
    }

    const loadExp = async () => {
      setExpLoading(true);
      setExpError(null);
      try {
        const data = await getExplanation(selectedItem.visit.visit_id);
        setExplanation(data);
      } catch (err: any) {
        console.error("XAI Load Error:", err);
        setExpError(err.message || "Failed to retrieve explainability report from FastAPI.");
      } finally {
        setExpLoading(false);
      }
    };

    loadExp();
    setReassessOpen(false);
    setTempPain(selectedItem.visit.pain_level);
  }, [selectedItem?.visit.visit_id]);

  const handleStatusChange = async (newStatus: "Attending" | "Completed") => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      await updateVisitStatus(selectedItem.visit.visit_id, newStatus);
      addToast(`Patient status successfully changed to ${newStatus}.`, "success");
      await fetchQueues();
    } catch (err: any) {
      addToast(`Action failed: ${err.message || err}`, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReassessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      const updated = await reassessVisit(selectedItem.visit.visit_id, tempPain);
      addToast("Patient reassessed successfully.", "success");
      setSelectedItem(updated);
      setReassessOpen(false);
      await fetchQueues();
    } catch (err: any) {
      addToast(`Reassessment failed: ${err.message || err}`, "error");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <PageTransition id="doctor-dashboard-page">
      <div className="flex h-full w-full overflow-hidden">
        {/* Left Column: Scrollable Patient list */}
        <div className="w-[35%] min-w-[300px] border-r border-[#2a3040] bg-[#0c0e15] flex flex-col h-full shrink-0">
          <div className="p-4 border-b border-[#2a3040] bg-[#10131d] space-y-1">
            <h2 className="text-xs font-bold text-[#e8ecf4] uppercase tracking-widest flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              Active Review Queue
            </h2>
            <p className="text-[10px] text-[#8492a6] font-medium uppercase">
              Emergency & General cases combined
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
            {allPatients.map((item) => {
              const isSelected = selectedItem?.visit.visit_id === item.visit.visit_id;
              const hasTwinAlert = item.twin && ["DETERIORATING", "CRITICAL_ALERT"].includes(item.twin.alert_level);
              return (
                <Card
                  key={item.visit.visit_id}
                  onClick={() => setSelectedItem(item)}
                  className={`p-3 cursor-pointer border transition-all ${
                    isSelected
                      ? "bg-[#1a1f2e] border-[hsl(220,85%,58%)] shadow-md shadow-blue-500/5"
                      : "bg-[#10131d]/60 border-[#2a3040] hover:border-[#4a5060]"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-sm text-[#e8ecf4] truncate">
                        {item.patient.name}
                      </span>
                      <span className="text-xs text-[#8492a6] font-mono tabular shrink-0">
                        {item.patient.age}y
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <PriorityBadge priority={item.assessment.priority_level} />
                        <span className="text-[9px] font-mono text-[#8492a6] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
                          {item.visit.department_assigned}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-[#e8ecf4] font-mono">
                        {item.assessment.risk_score.toFixed(0)}%
                      </span>
                    </div>

                    {hasTwinAlert && (
                      <div className="pt-1">
                        <TwinAlertBadge alertLevel={item.twin?.alert_level} />
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}

            {allPatients.length === 0 && !queueLoading && (
              <div className="py-8 text-center text-xs text-[#8492a6] italic">
                No active patients in triage queue.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Case Details & XAI Panel */}
        <div className="flex-1 bg-[#0f1117] flex flex-col h-full overflow-hidden">
          {selectedItem ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Patient Profile Header */}
              <div className="p-6 border-b border-[#2a3040] bg-[#1a1f2e]/20 flex justify-between items-start gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-[#e8ecf4]">
                      {selectedItem.patient.name}
                    </h2>
                    <span className="text-xs font-mono text-[#8492a6]">
                      ID: {selectedItem.patient.patient_id}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#8492a6]">
                    <span>Gender: {selectedItem.patient.gender}</span>
                    <span>•</span>
                    <span>Age: {selectedItem.patient.age} years</span>
                    <span>•</span>
                    <span className="font-semibold text-[#e8ecf4]">
                      Complaint: {selectedItem.visit.chief_complaint}
                    </span>
                  </div>
                </div>

                {/* Status Command Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={actionLoading}
                    onClick={() => setReassessOpen(!reassessOpen)}
                  >
                    Reassess Pain
                  </Button>

                  {selectedItem.visit.status === "Waiting" && (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={actionLoading}
                      onClick={() => handleStatusChange("Attending")}
                    >
                      Mark Attending
                    </Button>
                  )}

                  {selectedItem.visit.status === "Attending" && (
                    <Button
                      variant="success"
                      size="sm"
                      disabled={actionLoading}
                      onClick={() => handleStatusChange("Completed")}
                    >
                      Complete Treatment
                    </Button>
                  )}
                </div>
              </div>

              {/* Reassessment Panel Drawer */}
              {reassessOpen && (
                <div className="p-4 bg-[#1a1f2e] border-b border-[#2a3040] flex items-center justify-between gap-6">
                  <form onSubmit={handleReassessSubmit} className="flex items-center gap-4 flex-1">
                    <span className="text-xs font-medium text-[#8492a6] uppercase shrink-0">
                      Reassess Pain Level:
                    </span>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={tempPain}
                      onChange={(e) => setTempPain(Number(e.target.value))}
                      className="flex-1 accent-[hsl(220,85%,58%)] bg-[#0f1117] h-1.5 rounded-lg border border-[#2a3040] cursor-pointer"
                    />
                    <span className="text-sm font-bold text-[#e8ecf4] font-mono shrink-0">
                      {tempPain}/10
                    </span>
                    <Button type="submit" size="sm" variant="success" disabled={actionLoading}>
                      Submit
                    </Button>
                  </form>
                  <Button size="sm" variant="ghost" onClick={() => setReassessOpen(false)}>
                    Cancel
                  </Button>
                </div>
              )}

              {/* Explainable AI workspace */}
              <div className="flex-1 p-6 overflow-hidden">
                <XAIPanel
                  explanation={explanation}
                  isLoading={expLoading}
                  error={expError}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#8492a6] italic">
              <User className="h-12 w-12 text-[#2a3040] mb-3" />
              Select a patient from the review queue to inspect medical justifications.
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};
