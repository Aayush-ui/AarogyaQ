/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import apiClient from "./client";
import { RLState, RLThresholds, RLHistoryResponse } from "../types";

export async function getRLState(): Promise<RLState> {
  const response = await apiClient.get<RLState>("/rl/state");
  return response.data;
}

export async function getRLThresholds(): Promise<RLThresholds> {
  const response = await apiClient.get<RLThresholds>("/rl/thresholds");
  return response.data;
}

export async function getRLHistory(): Promise<RLHistoryResponse> {
  const response = await apiClient.get<RLHistoryResponse>("/rl/history");
  return response.data;
}
