/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from "lucide-react";
import { useUIStore, ToastMessage } from "../../store/useUIStore";

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useUIStore();

  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
};

interface ToastItemProps {
  toast: ToastMessage;
  onClose: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, toast.duration || 4000);

    return () => clearTimeout(timer);
  }, [toast, onClose]);

  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />,
    error: <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0" />,
    info: <Info className="h-5 w-5 text-sky-400 flex-shrink-0" />,
  };

  const borderColors = {
    success: "border-emerald-500/20 bg-zinc-900/90 text-emerald-100 shadow-emerald-500/5",
    error: "border-red-500/30 bg-red-950/20 backdrop-blur-xl text-red-100 shadow-red-500/5",
    warning: "border-yellow-500/20 bg-zinc-900/90 text-yellow-100 shadow-yellow-500/5",
    info: "border-sky-500/20 bg-zinc-900/90 text-sky-100 shadow-sky-500/5",
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.9, x: 50 }}
      animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.85, x: 80, transition: { duration: 0.2 } }}
      className={`pointer-events-auto relative flex gap-3.5 p-4 rounded-xl border backdrop-blur-lg shadow-xl overflow-hidden ${borderColors[toast.type]}`}
    >
      {icons[toast.type]}
      <div className="flex-1 text-xs font-medium leading-relaxed pr-2">
        {toast.message}
      </div>
      <button
        onClick={onClose}
        className="text-zinc-500 hover:text-zinc-200 transition-colors self-start cursor-pointer"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Shrinking progress bar along the bottom */}
      <motion.div
        initial={{ width: "100%" }}
        animate={{ width: "0%" }}
        transition={{ duration: (toast.duration || 4000) / 1000, ease: "linear" }}
        className={`absolute bottom-0 left-0 h-0.5 ${
          toast.type === "success"
            ? "bg-emerald-500"
            : toast.type === "error"
            ? "bg-red-500"
            : toast.type === "warning"
            ? "bg-yellow-500"
            : "bg-sky-500"
        }`}
      />
    </motion.div>
  );
};
