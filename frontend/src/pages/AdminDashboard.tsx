/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import {
  Cpu,
  Terminal,
  RefreshCw,
  AlertCircle,
  BarChart3,
  Database,
  TrendingUp,
  Shield,
  BookOpen,
  Activity,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { getRLState, getRLThresholds, getRLHistory } from "../api/rl";
import { RLState, RLThresholds, RLHistoryEntry } from "../types";
import { PageTransition } from "../components/layout/PageTransition";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { useUIStore } from "../store/useUIStore";

export const AdminDashboard: React.FC = () => {
  const { addToast } = useUIStore();
  const [rlState, setRlState] = useState<RLState | null>(null);
  const [rlThresholds, setRlThresholds] = useState<RLThresholds | null>(null);
  const [rlHistory, setRlHistory] = useState<RLHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [state, thresholds, historyRes] = await Promise.all([
        getRLState(),
        getRLThresholds(),
        getRLHistory().catch(() => ({ history: [], rewards: [], count: 0 })),
      ]);
      setRlState(state);
      setRlThresholds(thresholds);
      setRlHistory(historyRes.history || []);
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

  // Default synthetic curve when system is newly deployed with zero episodes
  const displayHistory = rlHistory.length > 0
    ? rlHistory
    : [
      { episode: 1, reward: 0.1, epsilon: 0.20 },
      { episode: 5, reward: 0.35, epsilon: 0.19 },
      { episode: 10, reward: 0.25, epsilon: 0.18 },
      { episode: 20, reward: 0.60, epsilon: 0.16 },
      { episode: 35, reward: 0.75, epsilon: 0.14 },
      { episode: 50, reward: 0.85, epsilon: 0.12 },
      { episode: 75, reward: 0.90, epsilon: 0.09 },
      { episode: 100, reward: 0.95, epsilon: 0.07 },
    ];

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
            <div className="flex items-center gap-2">
              <Cpu className="h-6 w-6 text-[hsl(220,85%,58%)]" />
              <h1 className="text-2xl font-black text-[#e8ecf4] tracking-tight">
                RL Bandit Control Center
              </h1>
            </div>
            <p className="text-xs text-[#8492a6] font-medium uppercase tracking-wider mt-1">
              Contextual bandit threshold adjustments, reward convergence, and epsilon decay analytics.
            </p>
          </div>
          <Button
            onClick={loadData}
            variant="ghost"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" /> Sync Engine State
          </Button>
        </div>

        {/* Global RL Metrics Cards */}
        {rlState && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <Card className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-4">
              <span className="text-[10px] font-bold text-[#8492a6] uppercase tracking-wide">
                Agent Version
              </span>
              <div className="text-2xl font-bold text-[#e8ecf4] mt-1">v{rlState.version}.0</div>
            </Card>

            <Card className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-4">
              <span className="text-[10px] font-bold text-[#8492a6] uppercase tracking-wide">
                Epsilon (Exploration Rate)
              </span>
              <div className="text-2xl font-bold text-amber-400 mt-1">
                {(rlState.epsilon * 100).toFixed(2)}%
              </div>
            </Card>

            <Card className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-4">
              <span className="text-[10px] font-bold text-[#8492a6] uppercase tracking-wide">
                Experience Episodes
              </span>
              <div className="text-2xl font-bold text-cyan-400 mt-1">{rlState.episodes}</div>
            </Card>

            <Card className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-4">
              <span className="text-[10px] font-bold text-[#8492a6] uppercase tracking-wide">
                Q-Table Discrete States
              </span>
              <div className="text-2xl font-bold text-emerald-400 mt-1">{rlState.qtable_size}</div>
            </Card>
          </div>
        )}

        {/* R-RL-02 & R-RL-04: Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* R-RL-02: Reward Convergence Line Chart */}
          <Card className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#2a3040] pb-2">
              <h3 className="text-xs font-bold text-[#e8ecf4] uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                Reward Convergence Over Episodes (R-RL-02)
              </h3>
              <span className="text-[10px] text-[#8492a6] font-mono">
                {rlHistory.length > 0 ? `${rlHistory.length} recorded visits` : "Baseline demo trajectory"}
              </span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={displayHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3040" vertical={false} />
                  <XAxis
                    dataKey="episode"
                    stroke="#8492a6"
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(v) => `Ep ${v}`}
                  />
                  <YAxis
                    domain={[-1.0, 1.0]}
                    stroke="#8492a6"
                    fontSize={10}
                    tickLine={false}
                    ticks={[-1.0, -0.5, 0.0, 0.5, 1.0]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f1117",
                      borderColor: "#2a3040",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#e8ecf4",
                    }}
                    formatter={(value: any) => [Number(value).toFixed(4), "Reward Signal"]}
                    labelFormatter={(label) => `Episode ${label}`}
                  />
                  <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
                  <ReferenceLine y={0.75} stroke="#10b981" strokeDasharray="2 2" label={{ value: "SLA Target", fill: "#10b981", fontSize: 10 }} />
                  <Line
                    type="monotone"
                    dataKey="reward"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: "#10b981", r: 3 }}
                    activeDot={{ r: 5, fill: "#34d399" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-[#8492a6] leading-relaxed">
              Reward signals $R \in [-1.0, +1.0]$ evaluate wait times against priority SLAs. The curve converges towards positive rewards as thresholds adapt to queue pressure.
            </p>
          </Card>

          {/* R-RL-04: Epsilon Decay Area Chart */}
          <Card className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#2a3040] pb-2">
              <h3 className="text-xs font-bold text-[#e8ecf4] uppercase tracking-wider flex items-center gap-2">
                <Activity className="h-4 w-4 text-amber-400" />
                Exploration Policy Decay (Epsilon Decay) (R-RL-04)
              </h3>
              <span className="text-[10px] text-[#8492a6] font-mono">
                Min floor: 5.0%
              </span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={displayHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="epsilonGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3040" vertical={false} />
                  <XAxis
                    dataKey="episode"
                    stroke="#8492a6"
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(v) => `Ep ${v}`}
                  />
                  <YAxis
                    domain={[0, 0.25]}
                    stroke="#8492a6"
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f1117",
                      borderColor: "#2a3040",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#e8ecf4",
                    }}
                    formatter={(value: any) => [`${(Number(value) * 100).toFixed(2)}%`, "Epsilon ($\u03b5$)"]}
                    labelFormatter={(label) => `Episode ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="epsilon"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#epsilonGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-[#8492a6] leading-relaxed">
              &epsilon;-decay (&epsilon;<sub>t+1</sub> = max(0.05, 0.999 &times; &epsilon;<sub>t</sub>)) balances exploration of threshold offsets in novel states against exploitation of proven configurations.
            </p>
          </Card>
        </div>

        {/* Dynamic Adjusted Thresholds & Q-Table State */}
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
                        {rlState?.threshold_offsets.Emergency.toFixed(2) ?? "0.00"} pts
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
                        {rlState?.threshold_offsets.General.toFixed(2) ?? "0.00"} pts
                      </span>
                    </div>
                  </div>
                </Card>
              </>
            )}
          </div>

          {/* Right Column: Learned Q-Table Values & Formulation Documentation */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-[#8492a6] uppercase tracking-widest flex items-center gap-2 border-b border-[#2a3040] pb-2">
                <Database className="h-4 w-4 text-emerald-400" />
                Learned Q-Table State-Action Values (Top 10 States)
              </h3>
              {rlState && Object.keys(rlState.qtable_preview).length > 0 ? (
                <div className="overflow-x-auto max-h-72 scrollbar-thin">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#2a3040] text-[#8492a6]">
                        <th className="py-2 px-3">State Key (Stream | Time | Depth)</th>
                        <th className="py-2 px-3 text-right">Action -5</th>
                        <th className="py-2 px-3 text-right">Action -2</th>
                        <th className="py-2 px-3 text-right">Action 0 (Neutral)</th>
                        <th className="py-2 px-3 text-right">Action +2</th>
                        <th className="py-2 px-3 text-right">Action +5</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2a3040]/30 text-[#e8ecf4]">
                      {Object.entries(rlState.qtable_preview).map(([state, actions]) => (
                        <tr key={state} className="hover:bg-white/5">
                          <td className="py-2.5 px-3 font-mono font-bold text-cyan-300">{state}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-400">
                            {actions[0]?.toFixed(4) ?? "0.0000"}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-teal-400">
                            {actions[1]?.toFixed(4) ?? "0.0000"}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-yellow-400">
                            {actions[2]?.toFixed(4) ?? "0.0000"}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-orange-400">
                            {actions[3]?.toFixed(4) ?? "0.0000"}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-red-400">
                            {actions[4]?.toFixed(4) ?? "0.0000"}
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

            {/* R-RL-03: Bandit Constraint Formulation Card */}
            <Card className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-[#e8ecf4] uppercase tracking-widest flex items-center gap-2 border-b border-[#2a3040] pb-2">
                <BookOpen className="h-4 w-4 text-purple-400" />
                Academic Specification: Contextual Bandit Formulation (R-RL-03)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#8492a6]">
                <div className="p-3 bg-[#0f1117] border border-[#2a3040] rounded-lg space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-[#e8ecf4]">
                    <Layers className="h-3.5 w-3.5 text-cyan-400" />
                    State Formulation ($S$)
                  </div>
                  <p className="leading-relaxed">
                    Compact 3-tuple state space: <code className="text-cyan-300 font-mono">Stream | TimeBucket | DepthBucket</code>.
                    Time is bucketed into morning, afternoon, evening, and night; queue depth into low (&le;5), medium (&le;15), and high (&gt;15).
                  </p>
                </div>

                <div className="p-3 bg-[#0f1117] border border-[#2a3040] rounded-lg space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-[#e8ecf4]">
                    <Shield className="h-3.5 w-3.5 text-emerald-400" />
                    Clinical Safety Bounds
                  </div>
                  <p className="leading-relaxed">
                    Action space &Delta; &isin; {"{-5, -2, 0, +2, +5}"} points. Total cumulative threshold offset is hard-clamped to [-15, +15] points, preventing runaway threshold drift and ensuring physician rule stability.
                  </p>
                </div>

                <div className="p-3 bg-[#0f1117] border border-[#2a3040] rounded-lg space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-[#e8ecf4]">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    SLA-Based Reward Function
                  </div>
                  <p className="leading-relaxed">
                    Attending within tolerance yields $+1.0 \to +0.25$. Exceeding $2\times$ tolerance incurs $-0.5$ penalty. Safety violation (Critical patient waiting &gt;30 min) triggers severe penalty $-1.0$.
                  </p>
                </div>

                <div className="p-3 bg-[#0f1117] border border-[#2a3040] rounded-lg space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-[#e8ecf4]">
                    <Terminal className="h-3.5 w-3.5 text-yellow-400" />
                    Deterministic Reproducibility
                  </div>
                  <p className="leading-relaxed">
                    Persistence is fully maintained in <code className="text-yellow-300 font-mono">rl_qtable.json</code>. When $\epsilon=0$, the policy is 100% deterministic with zero stochasticity or ungrounded drift.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};
