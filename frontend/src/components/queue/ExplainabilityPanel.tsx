/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import { ShieldQuestion, BrainCircuit, ListCollapse } from "lucide-react";

interface ExplainabilityPanelProps {
  priority: "Low" | "Medium" | "High" | "Critical" | string;
  contributingFactors?: string[];
  scoreBreakdown?: Record<string, number> | any[];
  id?: string;
}

export const ExplainabilityPanel: React.FC<ExplainabilityPanelProps> = ({
  priority,
  contributingFactors = [],
  scoreBreakdown = {},
  id,
}) => {
  const getThemeColors = (p: string) => {
    switch (p) {
      case "Critical":
        return { text: "text-red-400", bar: "bg-red-500", labelBg: "bg-red-500/10" };
      case "High":
        return { text: "text-orange-400", bar: "bg-orange-500", labelBg: "bg-orange-500/10" };
      case "Medium":
        return { text: "text-yellow-400", bar: "bg-yellow-500", labelBg: "bg-yellow-500/10" };
      default:
        return { text: "text-blue-400", bar: "bg-blue-500", labelBg: "bg-blue-500/10" };
    }
  };

  const { text, bar, labelBg } = getThemeColors(priority);

  const normalizedScores: [string, number][] = React.useMemo(() => {
    if (!scoreBreakdown) return [];
    if (Array.isArray(scoreBreakdown)) {
      return scoreBreakdown.map((item, idx) => {
        if (typeof item === "object" && item !== null) {
          const key = item.rule_name || item.label || item.rule_id || `Factor ${idx + 1}`;
          const val = Number(item.score_modifier ?? item.points ?? 10);
          return [key, isNaN(val) ? 10 : val];
        }
        return [`Factor ${idx + 1}`, 10];
      });
    }
    if (typeof scoreBreakdown === "object") {
      return Object.entries(scoreBreakdown).map(([k, v]) => [k, Number(v) || 0]);
    }
    return [];
  }, [scoreBreakdown]);

  const factors = Array.isArray(contributingFactors) ? contributingFactors : [];

  return (
    <div id={id} className="mt-4 p-4 rounded-xl bg-[#131823] border border-white/10 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-white/10">
        <BrainCircuit className={`h-4.5 w-4.5 ${text}`} />
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Clinical Explainability Model
        </h4>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ml-auto tabular ${labelBg} ${text}`}>
          {priority} Tier
        </span>
      </div>

      {/* Contributing Factors */}
      <div>
        <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
          <ShieldQuestion className="h-3.5 w-3.5" />
          Key Contributing Factors
        </h5>
        {factors.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {factors.map((factor, index) => (
              <motion.li
                key={`${factor}-${index}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.2 }}
                className="text-xs text-slate-300 flex items-start gap-2"
              >
                <span className={`mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0 ${bar}`} />
                <span>{factor}</span>
              </motion.li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-500 italic">No specific contributing factors recorded.</p>
        )}
      </div>

      {/* Score Breakdown Bars */}
      <div>
        <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <ListCollapse className="h-3.5 w-3.5" />
          Risk Score Breakdown (%)
        </h5>
        {normalizedScores.length > 0 ? (
          <div className="flex flex-col gap-3">
            {normalizedScores.map(([factor, score], index) => (
              <div key={`${factor}-${index}`} className="flex flex-col gap-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-medium">{factor}</span>
                  <span className="text-slate-200 font-bold tabular">{score}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                    transition={{ delay: index * 0.06, duration: 0.8, ease: "easeOut" }}
                    className={`h-full rounded-full ${bar}`}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">No scoring factors active.</p>
        )}
      </div>
    </div>
  );
};
