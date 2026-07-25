/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import apiClient from "./client";
import { TriageQueueItem } from "../types";
import { simulatedQueue } from "./simulatedDb";

export async function getEmergencyQueue(): Promise<TriageQueueItem[]> {
  try {
    const response = await apiClient.get<TriageQueueItem[]>("/queue/emergency");
    return response.data;
  } catch (error) {
    console.warn("FastAPI offline, falling back to simulated Emergency queue.", error);
    // Filter active items (e.g., status is TRIAGED or AWAITING_TRIAGE)
    return simulatedQueue.filter(
      item =>
        item.visit.queue_type === "Emergency" &&
        ["TRIAGED", "AWAITING_TRIAGE", "STALE"].includes(item.visit.status)
    );
  }
}

export async function getGeneralQueue(): Promise<TriageQueueItem[]> {
  try {
    const response = await apiClient.get<TriageQueueItem[]>("/queue/general");
    return response.data;
  } catch (error) {
    console.warn("FastAPI offline, falling back to simulated General queue.", error);
    return simulatedQueue.filter(
      item =>
        item.visit.queue_type === "General" &&
        ["TRIAGED", "AWAITING_TRIAGE", "STALE"].includes(item.visit.status)
    );
  }
}

export async function getStaleQueue(): Promise<TriageQueueItem[]> {
  try {
    const response = await apiClient.get<TriageQueueItem[]>("/queue/stale");
    return response.data;
  } catch (error) {
    console.warn("FastAPI offline, falling back to simulated Stale queue.", error);
    // Return patients registered more than 45 minutes ago that are still not admitted/discharged
    const fortyFiveMinsAgo = Date.now() - 45 * 60 * 1000;
    return simulatedQueue.filter(item => {
      const regTime = item.visit.registered_at ? new Date(item.visit.registered_at).getTime() : 0;
      return (
        ["TRIAGED", "AWAITING_TRIAGE"].includes(item.visit.status) &&
        regTime < fortyFiveMinsAgo
      );
    });
  }
}
