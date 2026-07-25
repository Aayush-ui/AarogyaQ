/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  id?: string;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  value,
  onChange,
  min = 0,
  max = 10,
  step = 1,
  id,
}) => {
  // Determine pain status descriptor and color
  const getPainMetrics = (val: number) => {
    if (val <= 3) return { text: "Mild Pain", color: "text-emerald-400", bg: "bg-emerald-500" };
    if (val <= 6) return { text: "Moderate Pain", color: "text-yellow-400", bg: "bg-yellow-500" };
    if (val <= 8) return { text: "Severe Pain", color: "text-orange-400", bg: "bg-orange-500" };
    return { text: "Worst Pain Imaginable", color: "text-red-500", bg: "bg-red-500" };
  };

  const { text, color, bg } = getPainMetrics(value);

  return (
    <div className="flex flex-col gap-2.5 w-full">
      <div className="flex justify-between items-end">
        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <motion.span
            key={value}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`text-lg font-bold tabular-nums ${color}`}
          >
            {value}
          </motion.span>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-500 text-sm">10</span>
          <span className="text-zinc-600 text-sm font-medium">({text})</span>
        </div>
      </div>

      <div className="relative flex items-center h-6 select-none touch-none">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-zinc-800 outline-none accent-emerald-500 focus:accent-emerald-400"
          style={{
            background: `linear-gradient(to right, #10b981 0%, #fbbf24 40%, #f97316 75%, #ef4444 100%)`,
          }}
        />
      </div>

      {/* Numerical notches */}
      <div className="flex justify-between text-[10px] font-semibold font-mono text-zinc-600 px-1">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
          <span
            key={num}
            onClick={() => onChange(num)}
            className={`cursor-pointer transition-colors hover:text-zinc-200 ${
              value === num ? "text-emerald-400 font-bold" : ""
            }`}
          >
            {num}
          </span>
        ))}
      </div>
    </div>
  );
};
