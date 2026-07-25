/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { FolderOpen } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  id?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = <FolderOpen className="h-10 w-10 text-zinc-600" />,
  title,
  description,
  action,
  id,
}) => {
  return (
    <div
      id={id}
      className="flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-zinc-800/40 bg-zinc-900/10 backdrop-blur-sm"
    >
      <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-2xl mb-4">
        {icon}
      </div>
      <h3 className="text-sm font-bold text-zinc-200 mb-1">{title}</h3>
      <p className="text-xs text-zinc-500 max-w-xs mb-5 leading-relaxed">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
};
