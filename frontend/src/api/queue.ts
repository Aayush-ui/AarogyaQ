/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import apiClient from "./client";
import { TriageQueueItem } from "../types";

export async function getEmergencyQueue(): Promise<TriageQueueItem[]> {
  const response = await apiClient.get<TriageQueueItem[]>("/queue/emergency");
  return response.data;
}

export async function getGeneralQueue(): Promise<TriageQueueItem[]> {
  const response = await apiClient.get<TriageQueueItem[]>("/queue/general");
  return response.data;
}

export async function getStaleQueue(): Promise<TriageQueueItem[]> {
  const response = await apiClient.get<TriageQueueItem[]>("/queue/stale");
  return response.data;
}
