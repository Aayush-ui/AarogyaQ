/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import apiClient from "./client";
import { TriageQueueItem } from "../types";
import { registerSimulatedPatient, simulatedQueue } from "./simulatedDb";

export interface RegisterPatientPayload {
  name: string;
  age: number;
  gender: string;
  phone: string;
  pain_level: number;
  chief_complaint: string;
  symptoms: string[];
}

export async function registerPatient(payload: RegisterPatientPayload): Promise<TriageQueueItem> {
  try {
    const response = await apiClient.post<TriageQueueItem>("/patients/register", payload);
    return response.data;
  } catch (error) {
    console.warn("FastAPI offline, using simulated registration.", error);
    return registerSimulatedPatient(payload);
  }
}

export async function getPatientHistory(patientId: string): Promise<TriageQueueItem[]> {
  try {
    const response = await apiClient.get<TriageQueueItem[]>(`/patients/${patientId}/history`);
    return response.data;
  } catch (error) {
    console.warn("FastAPI offline, returning simulated history.", error);
    // Return all records for this patient
    return simulatedQueue.filter(item => item.patient.patient_id === patientId);
  }
}
