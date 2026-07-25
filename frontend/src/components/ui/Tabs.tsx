/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";

interface TabOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  options: TabOption[];
  activeTab: string;
  onChange: (id: string) => void;
  id?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  options,
  activeTab,
  onChange,
  id,
}) => {
  return (
    <div id={id} className="relative flex p-1 bg-zinc-950/80 border border-zinc-800 rounded-xl max-w-max select-none">
      {options.map((option) => {
        const isActive = option.id === activeTab;
        return (
          <button
            key={option.id}
            onClick={() => onChange(option.id)}
            className={`relative flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg cursor-pointer focus:outline-none transition-colors duration-200 z-10 ${
              isActive ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {option.icon && <span className="h-3.5 w-3.5">{option.icon}</span>}
            <span>{option.label}</span>

            {isActive && (
              <motion.div
                layoutId="sliding_active_pill"
                className="absolute inset-0 bg-zinc-800 border border-zinc-700/50 rounded-lg -z-10"
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
