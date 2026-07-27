/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import apiClient from "./client";
import { TriageQueueItem } from "../types";

export async function submitPatientIntake(payload: {
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
}): Promise<TriageQueueItem> {
  const response = await apiClient.post<TriageQueueItem>("/patients/register", payload);
  return response.data;
}

export async function getPatientHistory(patientId: string): Promise<TriageQueueItem[]> {
  const response = await apiClient.get<TriageQueueItem[]>(`/patients/${patientId}/history`);
  return response.data;
}
