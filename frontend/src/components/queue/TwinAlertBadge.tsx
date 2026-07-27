/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { AlertTriangle, ShieldAlert, Eye } from "lucide-react";
import { TwinAlertLevel } from "../../types";

interface TwinAlertBadgeProps {
  alertLevel?: TwinAlertLevel;
}

export const TwinAlertBadge: React.FC<TwinAlertBadgeProps> = ({ alertLevel }) => {
  if (!alertLevel) return null;

  switch (alertLevel) {
    case "CRITICAL_ALERT":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
          Critical Alert
        </span>
      );
    case "DETERIORATING":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-500/10 text-orange-500 border border-orange-500/20 animate-pulse">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Deteriorating
        </span>
      );
    case "MONITOR":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
          <Eye className="h-3.5 w-3.5 shrink-0" />
          Monitor
        </span>
      );
    case "STABLE":
    default:
      return null;
  }
};
