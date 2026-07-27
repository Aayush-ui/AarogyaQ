/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { Cpu, Terminal, RefreshCw, AlertCircle, BarChart3, Database } from "lucide-react";
import { getRLState, getRLThresholds } from "../api/rl";
import { RLState, RLThresholds } from "../types";
import { PageTransition } from "../components/layout/PageTransition";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { useUIStore } from "../store/useUIStore";

export const AdminDashboard: React.FC = () => {
  const { addToast } = useUIStore();
  const [rlState, setRlState] = useState<RLState | null>(null);
  const [rlThresholds, setRlThresholds] = useState<RLThresholds | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [state, thresholds] = await Promise.all([
        getRLState(),
        getRLThresholds(),
      ]);
      setRlState(state);
      setRlThresholds(thresholds);
    } catch (err: any) {
      console.error(err);
      setError("Failed to fetch reinforcement learning parameters from backend.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading && !rlState) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-3">
        <RefreshCw className="h-8 w-8 text-[hsl(220,85%,58%)] animate-spin" />
        <span className="text-xs text-[#8492a6] font-medium uppercase tracking-widest animate-pulse">
          Connecting to Reinforcement Learning Engine...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/20">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-[#e8ecf4]">RL Engine Unreachable</h3>
          <p className="text-xs text-[#8492a6] mt-1.5 max-w-sm mx-auto leading-relaxed">{error}</p>
        </div>
        <Button onClick={loadData} variant="primary" size="sm">
          Retry Connect
        </Button>
      </div>
    );
  }

  return (
    <PageTransition id="admin-dashboard-page">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#e8ecf4] tracking-tight">
              RL Bandit Control Center
            </h1>
            <p className="text-xs text-[#8492a6] font-medium uppercase tracking-wider mt-1">
              Configure priority thresholds, analyze reward values, and monitor Q-table offsets.
            </p>
          </div>
          <Button
            onClick={loadData}
            variant="ghost"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" /> Sync Parameter States
          </Button>
        </div>

        {/* Global RL Metrics Cards */}
        {rlState && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <Card className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-4">
              <span className="text-[10px] font-bold text-[#8492a6] uppercase tracking-wide">
                Agent Version
              </span>
              <div className="text-2xl font-bold text-[#e8ecf4] mt-1">{rlState.version}</div>
            </Card>

            <Card className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-4">
              <span className="text-[10px] font-bold text-[#8492a6] uppercase tracking-wide">
                Epsilon (Exploration Rate)
              </span>
              <div className="text-2xl font-bold text-[#e8ecf4] mt-1">{(rlState.epsilon * 100).toFixed(1)}%</div>
            </Card>

            <Card className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-4">
              <span className="text-[10px] font-bold text-[#8492a6] uppercase tracking-wide">
                Training Episodes
              </span>
              <div className="text-2xl font-bold text-[#e8ecf4] mt-1">{rlState.episodes}</div>
            </Card>

            <Card className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-4">
              <span className="text-[10px] font-bold text-[#8492a6] uppercase tracking-wide">
                Q-Table States Count
              </span>
              <div className="text-2xl font-bold text-[#e8ecf4] mt-1">{rlState.qtable_size}</div>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Adjusted Thresholds */}
          <div className="lg:col-span-1 space-y-6">
            {rlThresholds && (
              <>
                <Card className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-5 space-y-4">
                  <h3 className="text-xs font-bold text-[#8492a6] uppercase tracking-widest flex items-center gap-2 border-b border-[#2a3040] pb-2">
                    <BarChart3 className="h-4 w-4 text-red-500" />
                    Emergency Stream Thresholds
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(rlThresholds.Emergency).map(([priority, range]) => (
                      <div key={priority} className="p-3 bg-[#0f1117] border border-[#2a3040] rounded-lg flex items-center justify-between">
                        <span className="text-xs font-bold text-[#e8ecf4]">{priority}</span>
                        <span className="text-xs font-bold font-mono text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                          {range[0]} - {range[1]}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center text-[10px] text-[#8492a6] pt-1">
                      <span>Bandit Priority Offset:</span>
                      <span className="font-mono font-bold text-[#e8ecf4]">
                        {rlState?.threshold_offsets.Emergency.toFixed(2) ?? "0.00"}
                      </span>
                    </div>
                  </div>
                </Card>

                <Card className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-5 space-y-4">
                  <h3 className="text-xs font-bold text-[#8492a6] uppercase tracking-widest flex items-center gap-2 border-b border-[#2a3040] pb-2">
                    <BarChart3 className="h-4 w-4 text-blue-400" />
                    General Stream Thresholds
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(rlThresholds.General).map(([priority, range]) => (
                      <div key={priority} className="p-3 bg-[#0f1117] border border-[#2a3040] rounded-lg flex items-center justify-between">
                        <span className="text-xs font-bold text-[#e8ecf4]">{priority}</span>
                        <span className="text-xs font-bold font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                          {range[0]} - {range[1]}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center text-[10px] text-[#8492a6] pt-1">
                      <span>Bandit Priority Offset:</span>
                      <span className="font-mono font-bold text-[#e8ecf4]">
                        {rlState?.threshold_offsets.General.toFixed(2) ?? "0.00"}
                      </span>
                    </div>
                  </div>
                </Card>
              </>
            )}
          </div>

          {/* Right Column: Q-Table Visualization preview */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-[#8492a6] uppercase tracking-widest flex items-center gap-2 border-b border-[#2a3040] pb-2">
                <Database className="h-4 w-4 text-emerald-400" />
                Learned Q-Table Offsets (First 10 States)
              </h3>
              {rlState && Object.keys(rlState.qtable_preview).length > 0 ? (
                <div className="overflow-x-auto max-h-96 scrollbar-thin">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#2a3040] text-[#8492a6]">
                        <th className="py-2 px-3">State Key</th>
                        <th className="py-2 px-3 text-right">Action Index 0</th>
                        <th className="py-2 px-3 text-right">Action Index 1</th>
                        <th className="py-2 px-3 text-right">Action Index 2</th>
                        <th className="py-2 px-3 text-right">Action Index 3</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2a3040]/30 text-[#e8ecf4]">
                      {Object.entries(rlState.qtable_preview).map(([state, actions]) => (
                        <tr key={state} className="hover:bg-white/5">
                          <td className="py-3 px-3 font-mono font-bold">{state}</td>
                          <td className="py-3 px-3 text-right font-mono text-emerald-400">
                            {actions[0]?.toFixed(4) ?? "0.0000"}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-yellow-400">
                            {actions[1]?.toFixed(4) ?? "0.0000"}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-orange-400">
                            {actions[2]?.toFixed(4) ?? "0.0000"}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-red-500">
                            {actions[3]?.toFixed(4) ?? "0.0000"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-[#8492a6] italic">
                  Q-Table offset values are currently initializing or empty.
                </div>
              )}
            </Card>

            <Card className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-[#8492a6] uppercase tracking-widest flex items-center gap-2 border-b border-[#2a3040] pb-2">
                <Terminal className="h-4 w-4 text-yellow-400" />
                RL Decision Auditing
              </h3>
              <p className="text-xs text-[#8492a6] leading-relaxed">
                Triage operations, status modifications, and delay metrics generate rewards/penalties to automatically adjust bandit weights. For complete audit trails or system actions, refer to the global dashboard and browser network logs.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};
