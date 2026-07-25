/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  id?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = "md", id }) => {
  const dims = {
    sm: "w-12 h-6",
    md: "w-24 h-12",
    lg: "w-36 h-18",
  };

  // SVG EKG Wave path
  // Start flat, brief dip, sharp spike up, deep spike down, settle, flat
  const path = "M 0 25 L 15 25 L 20 20 L 25 35 L 30 5 L 35 45 L 40 22 L 45 25 L 60 25";

  return (
    <div id={id} className={`flex flex-col items-center justify-center ${dims[size]}`}>
      <svg
        viewBox="0 0 60 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full text-emerald-500 stroke-current"
      >
        {/* Ambient background grid lines (medical aesthetic) */}
        <line x1="0" y1="25" x2="60" y2="25" stroke="rgba(24,24,27,0.4)" strokeWidth="0.5" strokeDasharray="1,2" />
        <line x1="30" y1="0" x2="30" y2="50" stroke="rgba(24,24,27,0.4)" strokeWidth="0.5" strokeDasharray="1,2" />

        {/* Pulsing glow line */}
        <motion.path
          d={path}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0.2 }}
          animate={{
            pathLength: [0, 1, 1],
            pathOffset: [0, 0, 1],
            opacity: [0.1, 1, 0.1],
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Leading blip (sparkle) */}
        <motion.circle
          cx="0"
          cy="25"
          r="2"
          fill="#10b981"
          animate={{
            cx: [0, 15, 20, 25, 30, 35, 40, 45, 60],
            cy: [25, 25, 20, 35, 5, 45, 22, 25, 25],
            opacity: [0, 1, 1, 1, 1, 1, 1, 1, 0],
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </svg>
      <motion.p
        animate={{ opacity: [0.4, 0.9, 0.4] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        className="text-[10px] font-mono font-semibold tracking-widest text-emerald-500/80 uppercase mt-1"
      >
        EKG Stream Live
      </motion.p>
    </div>
  );
};
