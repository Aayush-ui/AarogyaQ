/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import axios from "axios";

export const API_BASE_URL = "http://localhost:8000";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: {
    "Content-Type": "application/json",
  },
});

export default apiClient;
