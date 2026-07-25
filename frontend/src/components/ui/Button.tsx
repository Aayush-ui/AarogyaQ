/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import { springSnappy } from "../../motion/transitions";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  id?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  className = "",
  disabled,
  id,
  ...props
}) => {
  const baseStyle = "relative inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-xl disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98]";
  
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-900/10",
    secondary: "bg-white/5 hover:bg-white/10 text-slate-100 border border-white/10",
    ghost: "text-slate-400 hover:bg-white/5 hover:text-white",
    danger: "bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-900/10",
    success: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/10",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-6 py-3 text-base gap-2.5",
  };

  return (
    <motion.button
      id={id}
      whileHover={{ y: -1, scale: 1.01 }}
      whileTap={{ scale: 0.97 }}
      transition={springSnappy}
      disabled={disabled || isLoading}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {!isLoading && leftIcon && <span className="flex-shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5">{leftIcon}</span>}
      <span className="truncate">{children}</span>
      {!isLoading && rightIcon && <span className="flex-shrink-0 transition-transform duration-200 group-hover:translate-x-0.5">{rightIcon}</span>}
    </motion.button>
  );
};
