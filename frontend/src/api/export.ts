/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import apiClient from "./client";

/**
 * Fetch complete XAI triage dossier for a visit and initiate a browser file download.
 */
export async function exportVisitXAI(visitId: number | string): Promise<void> {
  const response = await apiClient.get(`/visits/${visitId}/export`, {
    responseType: "blob",
  });

  const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `aarogyaq_xai_visit_${visitId}.json`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
