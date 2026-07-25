/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import { Check } from "lucide-react";

interface Step {
  label: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number; // 0-indexed
  id?: string;
}

export const Stepper: React.FC<StepperProps> = ({
  steps,
  currentStep,
  id,
}) => {
  return (
    <div id={id} className="w-full select-none mb-8">
      <div className="relative flex justify-between items-center w-full">
        {/* Connection Background Line */}
        <div className="absolute top-5 left-6 right-6 h-0.5 bg-zinc-800 -z-10" />

        {/* Animated Connection Progress Fill */}
        <motion.div
          className="absolute top-5 left-6 h-0.5 bg-gradient-to-r from-emerald-600 to-emerald-400 -z-10 origin-left"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: currentStep / (steps.length - 1) }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          style={{ width: "calc(100% - 48px)" }}
        />

        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isActive = idx === currentStep;

          return (
            <div key={step.label} className="flex flex-col items-center flex-1">
              {/* Step Circle */}
              <motion.div
                initial={false}
                animate={{
                  backgroundColor: isCompleted
                    ? "#059669"
                    : isActive
                    ? "#18181b"
                    : "#09090b",
                  borderColor: isCompleted || isActive ? "#10b981" : "#27272a",
                }}
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-semibold text-sm z-10`}
              >
                {isCompleted ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <Check className="h-5 w-5 text-zinc-100" />
                  </motion.div>
                ) : (
                  <motion.span
                    animate={{
                      color: isActive ? "#34d399" : "#52525b",
                    }}
                  >
                    {idx + 1}
                  </motion.span>
                )}
              </motion.div>

              {/* Labels */}
              <div className="text-center mt-3 max-w-[120px]">
                <p
                  className={`text-xs font-bold uppercase tracking-wider transition-colors duration-200 ${
                    isActive ? "text-emerald-400" : isCompleted ? "text-zinc-300" : "text-zinc-600"
                  }`}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-[10px] text-zinc-500 mt-0.5 truncate">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
