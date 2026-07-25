/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "rectangular" | "circular";
  id?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = "",
  variant = "rectangular",
  id,
}) => {
  const baseClass = "bg-zinc-800/60 relative overflow-hidden";
  
  const variantClass = {
    text: "h-3.5 w-full rounded",
    rectangular: "w-full h-24 rounded-xl",
    circular: "rounded-full h-12 w-12",
  };

  return (
    <div
      id={id}
      className={`${baseClass} ${variantClass[variant]} ${className}`}
    >
      {/* Moving gradient swipe */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-700/25 to-transparent"
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{
          repeat: Infinity,
          duration: 1.5,
          ease: "linear",
        }}
      />
    </div>
  );
};
