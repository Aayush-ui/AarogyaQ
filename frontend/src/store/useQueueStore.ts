/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from "zustand";
import { TriageQueueItem, Department } from "../types";
import { getEmergencyQueue, getGeneralQueue, getStaleQueue } from "../api/queue";
import { updateVisitStatus, reassessVisit } from "../api/visits";
import { getDepartments, updateDepartmentStatus, getHealthCheck } from "../api/analytics";
import { useUIStore } from "./useUIStore";

interface QueueState {
  emergencyQueue: TriageQueueItem[];
  generalQueue: TriageQueueItem[];
  staleQueue: TriageQueueItem[];
  departments: Department[];
  lastUpdated: string | null;
  isLoading: boolean;
  isPolling: boolean;

  // Actions
  fetchQueues: (silent?: boolean) => Promise<void>;
  fetchDepartments: () => Promise<void>;
  updatePatientStatus: (visitId: string, status: string) => Promise<void>;
  reassessPatient: (visitId: string, painLevel: number) => Promise<void>;
  updateDeptStatus: (deptName: string, status: string) => Promise<void>;
}

export const useQueueStore = create<QueueState>((set, get) => ({
  emergencyQueue: [],
  generalQueue: [],
  staleQueue: [],
  departments: [],
  lastUpdated: null,
  isLoading: false,
  isPolling: false,

  fetchQueues: async (silent = false) => {
    if (!silent) set({ isLoading: true });
    
    try {
      // Parallel fetch
      const [emergency, general, stale, health] = await Promise.all([
        getEmergencyQueue(),
        getGeneralQueue(),
        getStaleQueue(),
        getHealthCheck()
      ]);

      const offlineStatus = health.status === "offline";
      const uiStore = useUIStore.getState();
      if (uiStore.isOffline !== offlineStatus) {
        uiStore.setIsOffline(offlineStatus);
      }

      // Check for new critical patients to announce via toast/visual cue
      const oldEmergency = get().emergencyQueue;
      const oldCriticalIds = new Set(
        oldEmergency
          .filter(p => p.assessment.priority_level === "Critical")
          .map(p => p.patient.patient_id)
      );

      const currentCriticals = emergency.filter(p => p.assessment.priority_level === "Critical");
      currentCriticals.forEach(patient => {
        if (oldEmergency.length > 0 && !oldCriticalIds.has(patient.patient.patient_id)) {
          // New critical patient! Only alert clinical roles (Doctor and Nurse)
          if (uiStore.activeRole === "Doctor" || uiStore.activeRole === "Nurse") {
            uiStore.addToast(
              `CRITICAL PATIENT ESCALATED: ${patient.patient.name} (${patient.patient.age}y/o) - Risk Score: ${patient.assessment.risk_score}%`,
              "error",
              8000
            );
          }
        }
      });

      set({
        emergencyQueue: emergency,
        generalQueue: general,
        staleQueue: stale,
        lastUpdated: new Date().toLocaleTimeString(),
        isLoading: false,
      });
    } catch (err) {
      console.error("Error fetching queues:", err);
      set({ isLoading: false });
    }
  },

  fetchDepartments: async () => {
    try {
      const depts = await getDepartments();
      set({ departments: depts });
    } catch (err) {
      console.error("Error fetching departments:", err);
    }
  },

  updatePatientStatus: async (visitId, status) => {
    const uiStore = useUIStore.getState();
    try {
      await updateVisitStatus(visitId, status);
      uiStore.addToast(`Patient status updated to ${status}`, "success");
      await get().fetchQueues(true);
      await get().fetchDepartments();
    } catch (err) {
      uiStore.addToast("Failed to update patient status", "error");
      console.error(err);
    }
  },

  reassessPatient: async (visitId, painLevel) => {
    const uiStore = useUIStore.getState();
    try {
      const updatedItem = await reassessVisit(visitId, painLevel);
      uiStore.addToast(
        `Patient pain reassessed to ${painLevel}. New Risk: ${updatedItem.assessment.risk_score}% (${updatedItem.assessment.priority_level})`,
        "info"
      );
      await get().fetchQueues(true);
      await get().fetchDepartments();
    } catch (err) {
      uiStore.addToast("Failed to reassess patient", "error");
      console.error(err);
    }
  },

  updateDeptStatus: async (deptName, status) => {
    const uiStore = useUIStore.getState();
    try {
      await updateDepartmentStatus(deptName, status);
      uiStore.addToast(`${deptName} department set to ${status}`, "success");
      await get().fetchDepartments();
    } catch (err) {
      uiStore.addToast("Failed to update department status", "error");
      console.error(err);
    }
  },
}));
