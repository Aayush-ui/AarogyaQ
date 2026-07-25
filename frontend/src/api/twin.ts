/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import apiClient from "./client";
import { TwinState } from "../types";

/**
 * Fetch the Digital Twin projected state for a single visit.
 * Falls back to null if the backend is unreachable or returns an error.
 */
export async function getTwinState(visitId: string | number): Promise<TwinState | null> {
  try {
    const response = await apiClient.get<TwinState>(`/visits/${visitId}/twin`);
    return response.data;
  } catch (error) {
    console.warn(`Digital twin unavailable for visit ${visitId}:`, error);
    return null;
  }
}
