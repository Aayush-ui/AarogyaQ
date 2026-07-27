/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import apiClient from "./client";
import { TriageQueueItem } from "../types";

export async function updateVisitStatus(visitId: string, status: string): Promise<void> {
  await apiClient.patch(`/visits/${visitId}/status`, { status });
}

export async function reassessVisit(visitId: string, painLevel: number): Promise<TriageQueueItem> {
  const response = await apiClient.post<TriageQueueItem>(`/visits/${visitId}/reassess`, {
    pain_level: painLevel,
  });
  return response.data;
}

export async function addClinicalNote(visitId: string, author: string, note: string): Promise<void> {
  await apiClient.post(`/visits/${visitId}/notes`, { author, note });
}

export async function addMedicationOrder(
  visitId: string,
  doctor: string,
  name: string,
  dosage: string,
  frequency: string
): Promise<void> {
  await apiClient.post(`/visits/${visitId}/medications`, { doctor, name, dosage, frequency });
}

export async function addLabOrder(visitId: string, doctor: string, testName: string): Promise<void> {
  await apiClient.post(`/visits/${visitId}/labs`, { doctor, test_name: testName });
}

export async function addRadiologyOrder(visitId: string, doctor: string, scanType: string): Promise<void> {
  await apiClient.post(`/visits/${visitId}/radiology`, { doctor, scan_type: scanType });
}

export async function assignBed(visitId: string, bed: string): Promise<void> {
  await apiClient.patch(`/visits/${visitId}/bed`, { bed });
}

export async function transferDepartment(visitId: string, department: string): Promise<void> {
  await apiClient.patch(`/visits/${visitId}/transfer`, { department });
}
