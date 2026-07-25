/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import { springSoft } from "../../motion/transitions";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  glass?: boolean;
  id?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverable = false,
  glass = true,
  className = "",
  id,
  ...props
}) => {
  const baseStyle = "rounded-2xl border transition-shadow duration-300 overflow-hidden";
  
  const glassStyle = glass
    ? "bg-white/[0.03] backdrop-blur-xl border-white/[0.08] shadow-lg shadow-black/15 text-slate-100"
    : "bg-[#0D1017] border-white/10 shadow-md text-slate-100";

  return (
    <motion.div
      id={id}
      whileHover={hoverable ? { y: -3, scale: 1.005, borderColor: "rgba(16,185,129,0.3)" } : undefined}
      transition={springSoft}
      className={`${baseStyle} ${glassStyle} ${hoverable ? "cursor-pointer" : ""} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
};
