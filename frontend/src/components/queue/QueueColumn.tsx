/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldAlert, Activity, AlertOctagon } from "lucide-react";
import { TriageQueueItem } from "../../types";
import { QueueCard } from "./QueueCard";
import { Skeleton } from "../ui/Skeleton";
import { EmptyState } from "../ui/EmptyState";

interface QueueColumnProps {
  title: string;
  items: TriageQueueItem[];
  theme: "emergency" | "general";
  isLoading?: boolean;
  id?: string;
}

export const QueueColumn: React.FC<QueueColumnProps> = ({
  title,
  items,
  theme,
  isLoading = false,
  id,
}) => {
  const isEmergency = theme === "emergency";
  
  const titleColor = isEmergency ? "text-red-400" : "text-blue-400";
  const icon = isEmergency ? (
    <ShieldAlert className="h-4.5 w-4.5 text-red-500 animate-pulse" />
  ) : (
    <Activity className="h-4.5 w-4.5 text-blue-400" />
  );

  const containerStyles = isEmergency
    ? "bg-red-950/5 border-red-500/10"
    : "bg-blue-950/5 border-blue-500/10";

  return (
    <div
      id={id}
      className={`flex-1 flex flex-col gap-4 p-4 border rounded-2xl ${containerStyles}`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-bold text-slate-100 tracking-tight">
            {title}
          </h3>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full tabular ${
          isEmergency ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
        }`}>
          {items.length} Active
        </span>
      </div>

      {/* Column List */}
      <div className="flex-1 flex flex-col gap-3 overflow-y-auto max-h-[70vh] pr-1 scrollbar-thin">
        {isLoading ? (
          // Skeleton loading state
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))
        ) : items.length === 0 ? (
          // Empty state
          <div className="py-8">
            <EmptyState
              icon={<AlertOctagon className="h-8 w-8 text-zinc-600" />}
              title="Stream Quiet"
              description={`No patients are currently registered in the ${title.toLowerCase()}.`}
            />
          </div>
        ) : (
          // AnimatePresence for smooth inserts/reordering/deletes
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <QueueCard key={item.visit.visit_id} item={item} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
