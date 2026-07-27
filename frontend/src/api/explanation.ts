/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import apiClient from "./client";
import { ExplanationData } from "../types";

export async function getExplanation(visitId: string): Promise<ExplanationData> {
  const response = await apiClient.get<ExplanationData>(`/visits/${visitId}/explanation`);
  return response.data;
}

export async function triggerTwinAlert(visitId: string): Promise<void> {
  await apiClient.post(`/visits/${visitId}/twin/alert`);
}
