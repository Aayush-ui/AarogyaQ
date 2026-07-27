/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import apiClient from "./client";
import { Department, ShiftReportData } from "../types";

export async function getShiftReport(shiftStart?: string, shiftEnd?: string): Promise<ShiftReportData> {
  const params = new URLSearchParams();
  if (shiftStart) params.append("shift_start", shiftStart);
  if (shiftEnd) params.append("shift_end", shiftEnd);
  const response = await apiClient.get<ShiftReportData>(`/shift/report?${params.toString()}`);
  return response.data;
}

export async function getDepartments(): Promise<Department[]> {
  const response = await apiClient.get<Department[]>("/departments");
  return response.data;
}

export async function updateDepartmentStatus(deptName: string, status: string): Promise<Department> {
  const response = await apiClient.patch<Department>(`/departments/${encodeURIComponent(deptName)}/status`, {
    status,
  });
  return response.data;
}

export async function getHealthCheck(): Promise<{ status: string }> {
  try {
    const response = await apiClient.get<{ status: string }>("/health");
    return response.data;
  } catch (error) {
    return { status: "offline" };
  }
}
