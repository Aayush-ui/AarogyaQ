/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import { useUIStore } from "../../store/useUIStore";

interface PageTransitionProps {
  children: React.ReactNode;
  id?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children, id }) => {
  const { reducedMotion } = useUIStore();

  // If user has prefers-reduced-motion, render immediately without animations
  if (reducedMotion) {
    return (
      <div id={id} className="w-full h-full flex flex-col p-6 overflow-y-auto">
        {children}
      </div>
    );
  }

  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12, scale: 0.98 }}
      transition={{
        type: "tween",
        ease: [0.2, 0, 0, 1], // easeEmphasized standard cubic-bezier curves
        duration: 0.4,
      }}
      className="w-full h-full flex flex-col p-6 overflow-y-auto"
    >
      {children}
    </motion.div>
  );
};
