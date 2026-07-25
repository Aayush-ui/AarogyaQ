/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";

interface ProgressRingProps {
  value: number; // 0 - 100
  size?: number; // diameter in px
  strokeWidth?: number;
  priority?: "Low" | "Medium" | "High" | "Critical" | string;
  id?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  size = 64,
  strokeWidth = 6,
  priority = "Low",
  id,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  
  // Set color according to priority
  const getColors = (p: string) => {
    switch (p) {
      case "Critical":
        return { stroke: "stroke-red-500", text: "text-red-500", fill: "bg-red-500/10" };
      case "High":
        return { stroke: "stroke-orange-500", text: "text-orange-500", fill: "bg-orange-500/10" };
      case "Medium":
        return { stroke: "stroke-yellow-500", text: "text-yellow-500", fill: "bg-yellow-500/10" };
      default:
        return { stroke: "stroke-emerald-500", text: "text-emerald-500", fill: "bg-emerald-500/10" };
    }
  };

  const { stroke, text, fill } = getColors(priority);

  return (
    <div id={id} className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Background circle */}
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-white/10"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Animated indicator ring */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={`${stroke}`}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - (value / 100) * circumference }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          strokeLinecap="round"
        />
      </svg>
      {/* Centered Percentage */}
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className={`text-sm font-bold font-mono tracking-tight text-slate-100`}>
          {value}
        </span>
        <span className="text-[8px] font-mono font-semibold text-slate-400 uppercase">
          Risk
        </span>
      </div>
    </div>
  );
};
