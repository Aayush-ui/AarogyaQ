/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RLDashboard — shows the RL agent's live learning state.
 * Displayed in the CommandCenter "AI Learning" tab.
 */

import React, { useState, useEffect, useCallback } from "react";
import { Brain, Zap, TrendingUp, BarChart2, RefreshCw, Cpu, Target, Info } from "lucide-react";
import apiClient from "../../api/client";
import { Card } from "./Card";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RLState {
  version:           number;
  epsilon:           number;
  episodes:          number;
  threshold_offsets: Record<string, number>;
  qtable_size:       number;
  actions:           number[];
  qtable_preview:    Record<string, number[]>;
}

interface RLThresholds {
  Emergency: Record<string, [number, number]>;
  General:   Record<string, [number, number]>;
  offsets:   Record<string, number>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  Critical: "text-red-400",
  High:     "text-orange-400",
  Medium:   "text-amber-400",
  Low:      "text-emerald-400",
};

const PRIORITY_BG: Record<string, string> = {
  Critical: "bg-red-500/10 border-red-500/20",
  High:     "bg-orange-500/10 border-orange-500/20",
  Medium:   "bg-amber-500/10 border-amber-500/20",
  Low:      "bg-emerald-500/10 border-emerald-500/20",
};

function offsetArrow(n: number): string {
  if (n > 0) return `▲ +${n}`;
  if (n < 0) return `▼ ${n}`;
  return "— 0";
}
function offsetColor(n: number): string {
  if (n > 0)  return "text-blue-400";
  if (n < 0)  return "text-orange-400";
  return "text-slate-500";
}

// ── Component ─────────────────────────────────────────────────────────────────

export const RLDashboard: React.FC = () => {
  const [rlState,     setRlState]     = useState<RLState | null>(null);
  const [thresholds,  setThresholds]  = useState<RLThresholds | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [error,       setError]       = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [stateRes, threshRes] = await Promise.all([
        apiClient.get<RLState>("/rl/state"),
        apiClient.get<RLThresholds>("/rl/thresholds"),
      ]);
      setRlState(stateRes.data);
      setThresholds(threshRes.data);
      setLastRefresh(new Date());
    } catch (e) {
      setError("RL backend unreachable — start the FastAPI server to see live data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 30_000);
    return () => clearInterval(id);
  }, [fetchData]);

  // ── Loading / error states ──────────────────────────────────────────────────
  if (loading && !rlState) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm">Loading RL agent state…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 py-8 px-4 text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl">
        <Info className="w-5 h-5 shrink-0" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  if (!rlState) return null;

  const explorationPct = Math.round(rlState.epsilon * 100);
  const exploitationPct = 100 - explorationPct;

  return (
    <div className="flex flex-col gap-5">

      {/* Header strip */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-violet-400" />
          <h3 className="text-sm font-bold text-slate-200 tracking-tight">
            RL Agent — Contextual Bandit
          </h3>
          <span className="text-[10px] font-mono text-slate-500 border border-white/10 bg-white/5 px-2 py-0.5 rounded">
            ε-greedy · v{rlState.version}
          </span>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          {lastRefresh ? lastRefresh.toLocaleTimeString() : "Refresh"}
        </button>
      </div>

      {/* Key metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Episodes */}
        <Card className="p-3 flex flex-col gap-1">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest flex items-center gap-1">
            <Zap className="w-3 h-3" /> Training Episodes
          </span>
          <span className="text-2xl font-black text-slate-100 tabular-nums">{rlState.episodes}</span>
          <span className="text-[10px] text-slate-600">completed visits processed</span>
        </Card>

        {/* Q-table size */}
        <Card className="p-3 flex flex-col gap-1">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest flex items-center gap-1">
            <BarChart2 className="w-3 h-3" /> States Explored
          </span>
          <span className="text-2xl font-black text-slate-100 tabular-nums">{rlState.qtable_size}</span>
          <span className="text-[10px] text-slate-600">unique (queue, time, depth)</span>
        </Card>

        {/* Exploration rate */}
        <Card className="p-3 flex flex-col gap-1.5 col-span-2">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Exploration vs Exploitation
          </span>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden flex">
              <div
                className="h-full bg-violet-500 transition-all duration-700"
                style={{ width: `${explorationPct}%` }}
              />
              <div
                className="h-full bg-blue-500 transition-all duration-700"
                style={{ width: `${exploitationPct}%` }}
              />
            </div>
          </div>
          <div className="flex justify-between text-[10px] font-mono">
            <span className="text-violet-400">Explore {explorationPct}% (ε={rlState.epsilon})</span>
            <span className="text-blue-400">Exploit {exploitationPct}%</span>
          </div>
          <p className="text-[9px] text-slate-600">
            Epsilon decays 0.1% per episode → agent becomes more confident over time
          </p>
        </Card>
      </div>

      {/* Threshold offsets */}
      {thresholds && (
        <div className="flex flex-col gap-2">
          <h4 className="text-[10px] text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <Target className="w-3 h-3" /> RL-Adjusted Priority Thresholds
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(["Emergency", "General"] as const).map(qtype => {
              const offset = thresholds.offsets?.[qtype] ?? 0;
              const bands = thresholds[qtype];
              return (
                <Card key={qtype} className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-300">{qtype} Queue</span>
                    <span className={`text-xs font-mono font-bold ${offsetColor(offset)}`}>
                      Offset: {offsetArrow(offset)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {(Object.entries(bands) as [string, [number, number]][]).map(([priority, range]) => {
                      const lo = range[0];
                      const hi = range[1];
                      return (
                        <div
                          key={priority}
                          className={`flex items-center justify-between px-2 py-1 rounded-lg border text-xs ${PRIORITY_BG[priority]}`}
                        >
                          <span className={`font-bold ${PRIORITY_COLORS[priority]}`}>{priority}</span>
                          <span className="font-mono text-slate-400">
                            {lo.toFixed(0)} – {hi.toFixed(0)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
          <p className="text-[9px] text-slate-600 ml-1">
            Thresholds shift as the agent learns from patient wait-time outcomes. Base cutoffs: Critical ≥76, High 51–75, Medium 26–50, Low 0–25.
          </p>
        </div>
      )}

      {/* Q-table preview */}
      {rlState.qtable_size > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-[10px] text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <Cpu className="w-3 h-3" /> Q-Table Preview (last 10 states)
          </h4>
          <div className="rounded-xl border border-white/5 bg-[#090d16] overflow-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-white/5 text-slate-600">
                  <th className="px-3 py-2 text-left font-medium">State</th>
                  {rlState.actions.map(a => (
                    <th key={a} className="px-2 py-2 text-center font-medium whitespace-nowrap">
                      {a > 0 ? `+${a}` : a}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(Object.entries(rlState.qtable_preview) as [string, number[]][]).map(([key, vals]) => {
                  const maxVal  = Math.max(...vals);
                  return (
                    <tr key={key} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-3 py-1.5 text-slate-400 truncate max-w-[160px]" title={key}>
                        {key}
                      </td>
                      {vals.map((v: number, i: number) => (
                        <td
                          key={i}
                          className={`px-2 py-1.5 text-center tabular-nums ${
                            v === maxVal && v !== 0 ? "text-blue-400 font-bold" : "text-slate-600"
                          }`}
                        >
                          {v.toFixed(3)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[9px] text-slate-600 ml-1">
            Bold blue = best action for that state. Actions represent threshold adjustments: {rlState.actions.join(", ")} points.
          </p>
        </div>
      )}

      {rlState.qtable_size === 0 && (
        <div className="flex items-center gap-3 py-6 px-4 text-slate-500 bg-white/5 border border-white/10 rounded-xl text-sm">
          <Brain className="w-4 h-4 shrink-0" />
          <span>
            No training episodes yet. Complete patient visits to train the RL agent.
            Q-table will populate after the first visit is marked <strong className="text-slate-300">Completed</strong>.
          </span>
        </div>
      )}

    </div>
  );
};
