/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import apiClient from "./client";
import { Department, ShiftReportData, RawShiftReport } from "../types";

export async function getShiftReport(shiftStart?: string, shiftEnd?: string): Promise<RawShiftReport> {
  const params = new URLSearchParams();
  if (shiftStart) params.append("shift_start", shiftStart);
  if (shiftEnd) params.append("shift_end", shiftEnd);
  const qs = params.toString();
  const url = qs ? `/shift/report?${qs}` : "/shift/report";
  const response = await apiClient.get<RawShiftReport>(url);
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
