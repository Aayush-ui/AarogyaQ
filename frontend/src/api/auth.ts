/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import apiClient from "./client";
import { UserRole } from "../config/rbac";

// Secure in-memory token store (not in localStorage to protect against XSS)
let inMemoryToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  inMemoryToken = token;
};

export const getAuthToken = (): string | null => {
  return inMemoryToken;
};

export interface LoginPayload {
  username: string;
  password: string;
  role?: UserRole;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  username: string;
  role: UserRole;
  name: string;
  email: string;
}

export async function loginUser(payload: LoginPayload): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>("/auth/login", payload);
  setAuthToken(response.data.access_token);
  return response.data;
}

export async function logoutUser(): Promise<void> {
  try {
    await apiClient.post("/auth/logout");
  } finally {
    setAuthToken(null);
  }
}

export async function getCurrentUser(): Promise<any> {
  const response = await apiClient.get("/auth/me");
  return response.data;
}
