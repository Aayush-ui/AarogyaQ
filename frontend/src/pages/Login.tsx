/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { ShieldCheck, User, Lock, Activity, RefreshCw } from "lucide-react";
import { useUIStore } from "../store/useUIStore";
import { ROLE_LANDING_PAGES, UserRole } from "../config/rbac";

export const Login: React.FC = () => {
  const { login, addToast } = useUIStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("Doctor");
  const [isLoading, setIsLoading] = useState(false);

  const fillCredentials = (u: string, p: string, r: UserRole) => {
    setUsername(u);
    setPassword(p);
    setRole(r);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      addToast("Please enter a username.", "warning");
      return;
    }

    if (!password.trim()) {
      addToast("Please enter a password.", "warning");
      return;
    }

    setIsLoading(true);

    try {
      await login(username.trim(), password, role);
      // Perform redirect based on role landing page
      const landing = ROLE_LANDING_PAGES[role] || "#/dashboard";
      window.location.hash = landing;
    } catch (err: any) {
      // Error toast is handled inside store
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#0f1117] text-[#e8ecf4]">
      <div className="w-full max-w-md bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-8 shadow-xl">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-8 w-8 text-[hsl(220,85%,58%)]" />
            <h1 className="text-2xl font-bold tracking-tight">AarogyaQ</h1>
          </div>
          <p className="text-xs text-[#8492a6] uppercase tracking-wide">
            Clinical Priority & Triage Portal
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-medium text-[#8492a6] uppercase tracking-wide mb-2">
              Clinical Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8492a6]">
                <User className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="block w-full pl-10 pr-3 py-2 bg-[#0f1117] border border-[#2a3040] rounded-lg text-sm text-[#e8ecf4] placeholder-[#8492a6] focus:outline-none focus:border-[hsl(220,85%,58%)] transition-colors"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8492a6] uppercase tracking-wide mb-2">
              Access Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8492a6]">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="block w-full pl-10 pr-3 py-2 bg-[#0f1117] border border-[#2a3040] rounded-lg text-sm text-[#e8ecf4] placeholder-[#8492a6] focus:outline-none focus:border-[hsl(220,85%,58%)] transition-colors"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8492a6] uppercase tracking-wide mb-2">
              Clinical Role Assignment
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="block w-full px-3 py-2 bg-[#0f1117] border border-[#2a3040] rounded-lg text-sm text-[#e8ecf4] focus:outline-none focus:border-[hsl(220,85%,58%)] transition-colors"
              disabled={isLoading}
            >
              <option value="Nurse">🩺 Triage Nurse</option>
              <option value="Doctor">👨‍⚕️ Emergency Physician</option>
              <option value="Administrator">🛡️ System Administrator</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-[hsl(220,85%,58%)] hover:brightness-110 text-white rounded-lg py-2.5 text-sm font-medium transition disabled:opacity-50"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            Authenticate Securely
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-[#8492a6]">
          <span className="font-semibold block mb-1 text-[#8492a6]">Demo accounts (click to autofill):</span>
          <button type="button" onClick={() => fillCredentials("nurse", "nurse123", "Nurse")} className="font-mono text-[hsl(220,85%,58%)] hover:underline mx-1">nurse / nurse123</button> | 
          <button type="button" onClick={() => fillCredentials("doctor", "doctor123", "Doctor")} className="font-mono text-[hsl(220,85%,58%)] hover:underline mx-1">doctor / doctor123</button> | 
          <button type="button" onClick={() => fillCredentials("admin", "admin123", "Administrator")} className="font-mono text-[hsl(220,85%,58%)] hover:underline mx-1">admin / admin123</button>
        </div>
      </div>
    </div>
  );
};
