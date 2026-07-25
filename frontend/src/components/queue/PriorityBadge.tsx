/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";

interface PriorityBadgeProps {
  priority: "Low" | "Medium" | "High" | "Critical" | string;
  id?: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, id }) => {
  const getStyles = (p: string) => {
    switch (p) {
      case "Critical":
        return {
          bg: "bg-red-500/10 text-red-400 border-red-500/30",
          dot: "bg-red-500",
          shadowColor: "rgba(239,68,68,0.4)",
        };
      case "High":
        return {
          bg: "bg-orange-500/10 text-orange-400 border-orange-500/30",
          dot: "bg-orange-500",
          shadowColor: "rgba(249,115,22,0.2)",
        };
      case "Medium":
        return {
          bg: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
          dot: "bg-yellow-500",
          shadowColor: "transparent",
        };
      default:
        return {
          bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
          dot: "bg-emerald-500",
          shadowColor: "transparent",
        };
    }
  };

  const { bg, dot, shadowColor } = getStyles(priority);

  // Animation variants depending on priority level
  const pulseScale = {
    animate: {
      scale: [1, 1.05, 1],
      boxShadow: [
        `0 0 0 0px ${shadowColor}`,
        `0 0 10px 4px ${shadowColor}`,
        `0 0 0 0px ${shadowColor}`,
      ],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  const pulseOpacity = {
    animate: {
      opacity: [0.5, 1, 0.5],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  return (
    <div id={id} className="relative inline-flex items-center">
      {priority === "Critical" ? (
        <motion.div
          variants={pulseScale}
          animate="animate"
          className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${bg}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
          <span>{priority}</span>
        </motion.div>
      ) : priority === "High" ? (
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${bg}`}
        >
          <motion.span
            variants={pulseOpacity}
            animate="animate"
            className={`h-1.5 w-1.5 rounded-full ${dot}`}
          />
          <span>{priority}</span>
        </div>
      ) : (
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${bg}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
          <span>{priority}</span>
        </div>
      )}
    </div>
  );
};
