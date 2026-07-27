/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { AlertOctagon, Brain, Clipboard, ShieldAlert, Cpu, HeartPulse, RefreshCw } from "lucide-react";
import { ExplanationData } from "../../types";
import { Spinner } from "../ui/Spinner";

interface XAIPanelProps {
  explanation: ExplanationData | null;
  isLoading: boolean;
  error: string | null;
}

export const XAIPanel: React.FC<XAIPanelProps> = ({ explanation, isLoading, error }) => {
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-3">
        <Spinner size="lg" />
        <span className="text-xs text-[#8492a6] font-medium uppercase tracking-widest animate-pulse">
          Retrieving Explainable AI (XAI) Justifications...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/20">
          <AlertOctagon className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-[#e8ecf4]">Failed to Load Clinical Explanation</h3>
          <p className="text-xs text-[#8492a6] mt-1.5 max-w-sm mx-auto leading-relaxed">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!explanation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#8492a6] italic">
        <Clipboard className="h-10 w-10 text-[#2a3040] mb-3" />
        Select a patient to view full triage explainability details.
      </div>
    );
  }

  const {
    risk_score,
    priority_level,
    rule_breakdown,
    contributing_factors,
    business_overrides,
    twin_alert_reasons,
    rl_threshold_at_assessment,
  } = explanation;

  const priorityColorClass = 
    priority_level === "Critical" ? "text-red-500" :
    priority_level === "High" ? "text-orange-500" :
    priority_level === "Medium" ? "text-yellow-500" :
    "text-emerald-500";

  return (
    <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-180px)] pr-2 scrollbar-thin">
      {/* Overview Stat Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#0f1117] border border-[#2a3040] p-4 rounded-xl">
          <span className="text-[10px] font-bold text-[#8492a6] uppercase tracking-wider block mb-1">
            Dynamic Risk Score
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-[#e8ecf4]">{risk_score.toFixed(1)}</span>
            <span className="text-xs text-[#8492a6]">/ 100</span>
          </div>
        </div>
        <div className="bg-[#0f1117] border border-[#2a3040] p-4 rounded-xl">
          <span className="text-[10px] font-bold text-[#8492a6] uppercase tracking-wider block mb-1">
            Assigned Priority Level
          </span>
          <span className={`text-2xl font-extrabold uppercase ${priorityColorClass}`}>
            {priority_level}
          </span>
        </div>
      </div>

      {/* 1. Fired Clinical Rules */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-[#e8ecf4] uppercase tracking-widest flex items-center gap-2 border-b border-[#2a3040] pb-2">
          <Brain className="h-4 w-4 text-blue-400" />
          Fired Clinical Rules (Layer 2)
        </h4>
        <div className="bg-[#0f1117] border border-[#2a3040] rounded-xl overflow-hidden">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#2a3040] text-[#8492a6] bg-[#1a1f2e]/30">
                <th className="py-2.5 px-4 text-left font-medium">Rule Code</th>
                <th className="py-2.5 px-4 text-left font-medium">Descriptor</th>
                <th className="py-2.5 px-4 text-right font-medium">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a3040]/30 text-[#e8ecf4]">
              {Object.entries(rule_breakdown).map(([ruleId, pts]) => {
                // Find descriptive label matches if any
                const label = contributing_factors.find((f) => f.includes(ruleId)) || "Clinical Indicator Fired";
                return (
                  <tr key={ruleId}>
                    <td className="py-3 px-4 font-mono font-bold">{ruleId}</td>
                    <td className="py-3 px-4">{label.replace(ruleId + ":", "").trim()}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-blue-400">+{pts}</td>
                  </tr>
                );
              })}
              {Object.keys(rule_breakdown).length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-[#8492a6] italic">
                    No clinical rules fired. Defaulting to baseline.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Business Overrides */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-[#e8ecf4] uppercase tracking-widest flex items-center gap-2 border-b border-[#2a3040] pb-2">
          <ShieldAlert className="h-4 w-4 text-orange-400" />
          Safety Override Flags (Layer 3)
        </h4>
        {Object.keys(business_overrides).length > 0 ? (
          <div className="space-y-2">
            {Object.entries(business_overrides).map(([flag, desc]) => (
              <div key={flag} className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl space-y-1">
                <div className="text-[10px] font-bold text-orange-400 uppercase tracking-wider font-mono">
                  ⚠ {flag}
                </div>
                <div className="text-xs text-[#e8ecf4] leading-relaxed">{desc}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-[#0f1117] border border-[#2a3040] rounded-xl text-center text-xs text-[#8492a6]">
            No safety overrides triggered. Priority determined strictly by risk score.
          </div>
        )}
      </div>

      {/* 3. Digital Twin Deterioration */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-[#e8ecf4] uppercase tracking-widest flex items-center gap-2 border-b border-[#2a3040] pb-2">
          <HeartPulse className="h-4 w-4 text-red-500" />
          Digital Twin Deterioration Alerts
        </h4>
        {twin_alert_reasons.length > 0 ? (
          <div className="bg-[#0f1117] border border-[#2a3040] rounded-xl p-4 space-y-2">
            <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
              🚨 Active Physiological Warning Flags
            </div>
            <ul className="list-disc list-inside text-xs text-[#8492a6] space-y-1">
              {twin_alert_reasons.map((reason, idx) => (
                <li key={idx} className="text-[#e8ecf4] font-medium">{reason}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="p-4 bg-[#0f1117] border border-[#2a3040] rounded-xl text-center text-xs text-[#8492a6]">
            Physiological indicators stable. Digital Twin forecasting no short-term risk increase.
          </div>
        )}
      </div>

      {/* 4. RL Thresholds at Assessment */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-[#e8ecf4] uppercase tracking-widest flex items-center gap-2 border-b border-[#2a3040] pb-2">
          <Cpu className="h-4 w-4 text-emerald-400" />
          RL Bandit Threshold Ranges
        </h4>
        <div className="bg-[#0f1117] border border-[#2a3040] rounded-xl overflow-hidden">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#2a3040] text-[#8492a6] bg-[#1a1f2e]/30">
                <th className="py-2.5 px-4 text-left font-medium">Triage Priority</th>
                <th className="py-2.5 px-4 text-right font-medium">Risk Score Cutoff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a3040]/30 text-[#e8ecf4]">
              {Object.entries(rl_threshold_at_assessment).map(([lvl, range]) => {
                const isCurrent = lvl === priority_level;
                return (
                  <tr key={lvl} className={isCurrent ? "bg-emerald-500/5 font-bold" : ""}>
                    <td className="py-2.5 px-4 flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${
                        lvl === "Critical" ? "bg-red-500" :
                        lvl === "High" ? "bg-orange-500" :
                        lvl === "Medium" ? "bg-yellow-500" :
                        "bg-emerald-500"
                      }`} />
                      {lvl}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono">
                      {range[0]} - {range[1]}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
