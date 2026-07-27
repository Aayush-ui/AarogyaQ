/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from "zustand";
import { TriageQueueItem } from "../types";
import { getPatientHistory, submitPatientIntake } from "../api/patient";
import { useUIStore } from "./useUIStore";

export interface RegisterPatientPayload {
  name: string;
  age: number;
  gender: string;
  phone?: string;
  chief_complaint: string;
  pain_level: number;
  symptom_duration?: number;
  existing_conditions?: string[];
  vitals?: {
    heart_rate?: number;
    systolic_bp?: number;
    diastolic_bp?: number;
    spo2?: number;
    temperature?: number;
    respiratory_rate?: number;
  };
  use_ai?: boolean;
}

interface PatientState {
  selectedPatient: TriageQueueItem | null;
  patientHistory: TriageQueueItem[];
  intakeForm: RegisterPatientPayload;
  isSubmitting: boolean;
  triageResult: TriageQueueItem | null;

  // Actions
  selectPatient: (patient: TriageQueueItem | null) => void;
  fetchPatientHistory: (patientId: string) => Promise<void>;
  submitIntake: (payload: RegisterPatientPayload) => Promise<TriageQueueItem | null>;
  resetIntake: () => void;
  clearTriageResult: () => void;
}

const initialIntakeForm: RegisterPatientPayload = {
  name: "",
  age: 0,
  gender: "Male",
  phone: "",
  pain_level: 5,
  chief_complaint: "",
  symptom_duration: 1,
  existing_conditions: [],
  use_ai: false,
};

export const usePatientStore = create<PatientState>((set, get) => ({
  selectedPatient: null,
  patientHistory: [],
  intakeForm: { ...initialIntakeForm },
  isSubmitting: false,
  triageResult: null,

  selectPatient: (patient) => {
    set({ selectedPatient: patient });
    if (patient) {
      get().fetchPatientHistory(patient.patient.patient_id);
    } else {
      set({ patientHistory: [] });
    }
  },

  fetchPatientHistory: async (patientId) => {
    try {
      const history = await getPatientHistory(patientId);
      set({ patientHistory: history });
    } catch (err) {
      console.error("Error fetching patient history:", err);
    }
  },

  submitIntake: async (payload) => {
    set({ isSubmitting: true, triageResult: null });
    const uiStore = useUIStore.getState();
    try {
      const result = await submitPatientIntake(payload);
      set({ triageResult: result, isSubmitting: false });
      uiStore.addToast(`Patient registered and triaged as ${result.assessment.priority_level}!`, "success");
      return result;
    } catch (err) {
      uiStore.addToast("Failed to register and triage patient", "error");
      set({ isSubmitting: false });
      console.error(err);
      return null;
    }
  },

  resetIntake: () => set({ intakeForm: { ...initialIntakeForm }, triageResult: null }),
  
  clearTriageResult: () => set({ triageResult: null }),
}));
