/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import apiClient from "./client";
import { Department, ShiftReportData } from "../types";
import { getSimulatedShiftReport, simulatedDepartments, updateSimulatedDepartmentStatus } from "./simulatedDb";

export async function getShiftReport(shiftStart?: string, shiftEnd?: string): Promise<ShiftReportData> {
  try {
    const params = new URLSearchParams();
    if (shiftStart) params.append("shift_start", shiftStart);
    if (shiftEnd) params.append("shift_end", shiftEnd);
    const response = await apiClient.get<ShiftReportData>(`/shift/report?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.warn("FastAPI offline, returning simulated shift report.", error);
    return getSimulatedShiftReport();
  }
}

export async function getDepartments(): Promise<Department[]> {
  try {
    const response = await apiClient.get<Department[]>("/departments");
    return response.data;
  } catch (error) {
    console.warn("FastAPI offline, returning simulated departments list.", error);
    return [...simulatedDepartments];
  }
}

export async function updateDepartmentStatus(deptName: string, status: string): Promise<Department> {
  try {
    const response = await apiClient.patch<Department>(`/departments/${encodeURIComponent(deptName)}/status`, {
      status,
    });
    return response.data;
  } catch (error) {
    console.warn("FastAPI offline, updating simulated department status.", error);
    updateSimulatedDepartmentStatus(deptName, status);
    const updated = simulatedDepartments.find(d => d.name === deptName);
    if (!updated) throw new Error("Department not found");
    return updated;
  }
}

export async function getHealthCheck(): Promise<{ status: string }> {
  try {
    const response = await apiClient.get<{ status: string }>("/health");
    return response.data;
  } catch (error) {
    return { status: "offline" };
  }
}
