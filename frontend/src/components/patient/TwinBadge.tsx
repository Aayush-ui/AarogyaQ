/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { TwinState, TwinAlertLevel } from "../../types";
import { Activity, AlertTriangle, Clock, ChevronDown, ChevronUp, Cpu } from "lucide-react";

// ── Alert level config ────────────────────────────────────────────────────────

const ALERT_CONFIG: Record<
  TwinAlertLevel,
  { label: string; color: string; bg: string; border: string; dot: string; icon: React.ReactNode }
> = {
  STABLE: {
    label: "Stable",
    color: "text-emerald-400",
    bg: "bg-emerald-950/40",
    border: "border-emerald-700/50",
    dot: "bg-emerald-400",
    icon: <Activity className="w-3 h-3" />,
  },
  MONITOR: {
    label: "Monitor",
    color: "text-amber-400",
    bg: "bg-amber-950/40",
    border: "border-amber-600/50",
    dot: "bg-amber-400 animate-pulse",
    icon: <Clock className="w-3 h-3" />,
  },
  DETERIORATING: {
    label: "Deteriorating",
    color: "text-orange-400",
    bg: "bg-orange-950/50",
    border: "border-orange-500/60",
    dot: "bg-orange-400 animate-pulse",
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  CRITICAL_ALERT: {
    label: "Critical Alert",
    color: "text-red-400",
    bg: "bg-red-950/60",
    border: "border-red-500/70",
    dot: "bg-red-400 animate-ping",
    icon: <AlertTriangle className="w-3 h-3" />,
  },
};

const PRIORITY_COLOR: Record<string, string> = {
  Critical: "text-red-400",
  High:     "text-orange-400",
  Medium:   "text-amber-400",
  Low:      "text-emerald-400",
};

// ── Component ─────────────────────────────────────────────────────────────────

interface TwinBadgeProps {
  twin: TwinState;
  compact?: boolean;  // minimal single-line mode for list views
}

export const TwinBadge: React.FC<TwinBadgeProps> = ({ twin, compact = false }) => {
  const [expanded, setExpanded] = useState(false);
  const cfg = ALERT_CONFIG[twin.alert_level] ?? ALERT_CONFIG.STABLE;

  const scoreBar = (score: number, color: string) => (
    <div className="flex items-center gap-1.5 min-w-0">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
      <span className="text-xs font-mono text-white/70 w-7 text-right">{score.toFixed(0)}</span>
    </div>
  );

  if (compact) {
    return (
      <div
        className={`
          inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium
          ${cfg.bg} ${cfg.border} ${cfg.color} border cursor-default
        `}
        title={twin.alert_reasons.join(" • ")}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        <Cpu className="w-3 h-3 opacity-70" />
        <span>Twin: {cfg.label}</span>
        <span className="opacity-60">·</span>
        <span>{twin.projected_risk_score.toFixed(0)}/100</span>
        <span className="opacity-60">·</span>
        <span>{twin.minutes_waiting}m wait</span>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} overflow-hidden transition-all duration-300`}>
      {/* Header row */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors"
      >
        {/* Pulse indicator */}
        <span className="relative flex h-2 w-2 shrink-0">
          <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${cfg.dot}`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${cfg.dot.replace("animate-ping", "").replace("animate-pulse", "")}`} />
        </span>

        {/* Label */}
        <span className="flex items-center gap-1 text-xs font-semibold text-white/50 uppercase tracking-widest">
          <Cpu className="w-3 h-3" />
          Digital Twin
        </span>

        <span className={`ml-1 text-xs font-bold ${cfg.color}`}>{cfg.label}</span>

        {/* Wait time pill */}
        <span className="ml-auto text-xs text-white/40 font-mono">{twin.minutes_waiting}m</span>

        {/* Expand toggle */}
        <span className="text-white/30">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>

      {/* Score bars — always visible */}
      <div className="px-3 pb-2 space-y-1">
        <div className="flex items-center gap-2 text-xs text-white/40">
          <span className="w-20 shrink-0">At arrival</span>
          {scoreBar(twin.initial_risk_score, "bg-blue-500")}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-20 shrink-0 text-white/40">Projected now</span>
          {scoreBar(twin.projected_risk_score, twin.alert_level === "CRITICAL_ALERT" ? "bg-red-500" : twin.alert_level === "DETERIORATING" ? "bg-orange-500" : "bg-amber-400")}
        </div>
        <div className="flex items-center gap-2 text-xs text-white/40 pt-0.5">
          <span className="w-20 shrink-0">Twin priority</span>
          <span className={`font-semibold ${PRIORITY_COLOR[twin.twin_priority] ?? "text-white/70"}`}>
            {twin.twin_priority}
          </span>
          <span className="ml-auto font-mono text-white/30">+{twin.deterioration_rate.toFixed(2)} pts/min</span>
        </div>
      </div>

      {/* Expanded: alert reasons (XAI) */}
      {expanded && twin.alert_reasons.length > 0 && (
        <div className="border-t border-white/10 px-3 py-2 space-y-1">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-1.5">Why this alert</p>
          {twin.alert_reasons.map((reason, i) => (
            <div key={i} className="flex gap-2 text-xs text-white/60">
              <span className={`mt-0.5 shrink-0 ${cfg.color}`}>›</span>
              <span>{reason}</span>
            </div>
          ))}
          <p className="text-xs text-white/25 font-mono mt-1.5">
            Computed {new Date(twin.computed_at).toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  );
};
