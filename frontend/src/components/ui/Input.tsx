/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion } from "motion/react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
  id?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  id,
  className = "",
  onFocus,
  onBlur,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  const shakeVariants = {
    error: {
      x: [0, -4, 4, -4, 4, 0],
      transition: { duration: 0.4 },
    },
  };

  return (
    <motion.div
      animate={error ? "error" : "default"}
      variants={shakeVariants}
      className="flex flex-col gap-1.5 w-full"
    >
      <label
        htmlFor={id}
        className={`text-xs font-semibold uppercase tracking-wider transition-colors duration-200 ${
          error ? "text-red-400" : isFocused ? "text-emerald-400" : "text-zinc-500"
        }`}
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={`w-full bg-zinc-950/80 border text-sm rounded-xl px-4 py-2.5 text-zinc-100 placeholder-zinc-600 transition-all focus:outline-none focus:ring-1 ${
            error
              ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/30"
              : "border-zinc-800 focus:border-emerald-500 focus:ring-emerald-500/30"
          } ${className}`}
          {...props}
        />
      </div>
      {error && <span className="text-xs text-red-400 font-medium">{error}</span>}
      {!error && helperText && <span className="text-xs text-zinc-500">{helperText}</span>}
    </motion.div>
  );
};
