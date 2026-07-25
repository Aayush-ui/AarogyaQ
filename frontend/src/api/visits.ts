/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import apiClient from "./client";
import { TriageQueueItem } from "../types";
import {
  updateSimulatedVisitStatus,
  reassessSimulatedVisit,
  addSimulatedClinicalNote,
  addSimulatedMedicationOrder,
  addSimulatedLabOrder,
  addSimulatedRadiologyOrder,
  assignSimulatedBed,
  transferSimulatedDepartment,
} from "./simulatedDb";

export async function updateVisitStatus(visitId: string, status: string): Promise<void> {
  try {
    await apiClient.patch(`/visits/${visitId}/status`, { status });
  } catch (error) {
    console.warn("FastAPI offline, updating simulated visit status.", error);
    updateSimulatedVisitStatus(visitId, status);
  }
}

export async function reassessVisit(visitId: string, painLevel: number): Promise<TriageQueueItem> {
  try {
    const response = await apiClient.post<TriageQueueItem>(`/visits/${visitId}/reassess`, {
      pain_level: painLevel,
    });
    return response.data;
  } catch (error) {
    console.warn("FastAPI offline, reassessing simulated visit.", error);
    return reassessSimulatedVisit(visitId, painLevel);
  }
}

export async function addClinicalNote(visitId: string, author: string, note: string): Promise<void> {
  try {
    await apiClient.post(`/visits/${visitId}/notes`, { author, note });
  } catch (error) {
    console.warn("FastAPI offline, saving simulated clinical note.", error);
    addSimulatedClinicalNote(visitId, author, note);
  }
}

export async function addMedicationOrder(
  visitId: string,
  doctor: string,
  name: string,
  dosage: string,
  frequency: string
): Promise<void> {
  try {
    await apiClient.post(`/visits/${visitId}/medications`, { doctor, name, dosage, frequency });
  } catch (error) {
    console.warn("FastAPI offline, saving simulated medication order.", error);
    addSimulatedMedicationOrder(visitId, doctor, name, dosage, frequency);
  }
}

export async function addLabOrder(visitId: string, doctor: string, testName: string): Promise<void> {
  try {
    await apiClient.post(`/visits/${visitId}/labs`, { doctor, test_name: testName });
  } catch (error) {
    console.warn("FastAPI offline, saving simulated laboratory order.", error);
    addSimulatedLabOrder(visitId, doctor, testName);
  }
}

export async function addRadiologyOrder(visitId: string, doctor: string, scanType: string): Promise<void> {
  try {
    await apiClient.post(`/visits/${visitId}/radiology`, { doctor, scan_type: scanType });
  } catch (error) {
    console.warn("FastAPI offline, saving simulated radiology order.", error);
    addSimulatedRadiologyOrder(visitId, doctor, scanType);
  }
}

export async function assignBed(visitId: string, bed: string): Promise<void> {
  try {
    await apiClient.patch(`/visits/${visitId}/bed`, { bed });
  } catch (error) {
    console.warn("FastAPI offline, updating simulated bed assignment.", error);
    assignSimulatedBed(visitId, bed);
  }
}

export async function transferDepartment(visitId: string, department: string): Promise<void> {
  try {
    await apiClient.patch(`/visits/${visitId}/transfer`, { department });
  } catch (error) {
    console.warn("FastAPI offline, updating simulated department transfer.", error);
    transferSimulatedDepartment(visitId, department);
  }
}
