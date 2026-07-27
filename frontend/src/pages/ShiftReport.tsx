/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Download, Timer, ShieldAlert, Users, FileText, RefreshCw } from "lucide-react";
import { getShiftReport } from "../api/analytics";
import { ShiftReportData } from "../types";
import { PageTransition } from "../components/layout/PageTransition";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { useUIStore } from "../store/useUIStore";

export const ShiftReport: React.FC = () => {
  const { addToast } = useUIStore();
  const [data, setData] = useState<ShiftReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const report = await getShiftReport();
      setData(report);
    } catch (err: any) {
      console.error(err);
      setError("Failed to retrieve shift analytics from FastAPI.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const handleExport = () => {
    if (!data) return;
    addToast("Exporting clinical ledger in CSV format...", "info");

    const csvRows = [
      ["Metric", "Value"],
      ["Total Patients", data.total_patients],
      ["Critical Count", data.critical_count],
      ["Avg Wait Time (mins)", data.avg_wait_time],
      ["Longest Wait Time (mins)", data.longest_wait_time],
      [],
      ["Priority Level", "Patient Count"],
      ...data.priority_distribution.map((p) => [p.name, p.value]),
      [],
      ["Department", "Routing Workload"],
      ...data.department_workload.map((d) => [d.name, d.count]),
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "AarogyaQ_Shift_Ledger.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast("Shift report exported successfully.", "success");
  };

  const PRIORITY_COLORS = {
    Critical: "#ef4444",
    High: "#f97316",
    Medium: "#f59e0b",
    Low: "#22c55e",
  };

  const PIE_COLORS = ["#ef4444", "hsl(220, 85%, 58%)", "#f59e0b", "#22c55e"];

  if (isLoading && !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-3">
        <RefreshCw className="h-8 w-8 text-[hsl(220,85%,58%)] animate-spin" />
        <span className="text-xs text-[#8492a6] font-medium uppercase tracking-widest animate-pulse">
          Generating Shift Ledger Analytics...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/20">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-[#e8ecf4]">Analytics Load Error</h3>
          <p className="text-xs text-[#8492a6] mt-1.5 max-w-sm mx-auto leading-relaxed">{error}</p>
        </div>
        <Button onClick={loadReport} variant="primary" size="sm">
          Retry Sync
        </Button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <PageTransition id="shift-report-page">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#e8ecf4] tracking-tight">
              Shift Summary & Ledger
            </h1>
            <p className="text-xs text-[#8492a6] font-medium uppercase tracking-wider mt-1">
              Historical statistics and triage breakdown for auditing.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={loadReport} variant="ghost" size="sm">
              Refresh
            </Button>
            <Button onClick={handleExport} variant="primary" size="sm" className="flex items-center gap-2">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          <Card className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#8492a6] uppercase tracking-wide">
                  Total Registries
                </span>
                <div className="text-2xl font-bold text-[#e8ecf4]">{data.total_patients}</div>
              </div>
              <Users className="h-5 w-5 text-blue-400" />
            </div>
          </Card>

          <Card className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-wide">
                  Critical Cases
                </span>
                <div className="text-2xl font-bold text-red-500">{data.critical_count}</div>
              </div>
              <ShieldAlert className="h-5 w-5 text-red-500" />
            </div>
          </Card>

          <Card className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#8492a6] uppercase tracking-wide">
                  Avg Wait Time
                </span>
                <div className="text-2xl font-bold text-[#e8ecf4]">{data.avg_wait_time.toFixed(1)}m</div>
              </div>
              <Timer className="h-5 w-5 text-yellow-400" />
            </div>
          </Card>

          <Card className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#8492a6] uppercase tracking-wide">
                  Longest Wait Time
                </span>
                <div className="text-2xl font-bold text-[#e8ecf4]">{data.longest_wait_time}m</div>
              </div>
              <FileText className="h-5 w-5 text-emerald-400" />
            </div>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Priority distribution */}
          <Card className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[#e8ecf4]">Triage Level Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.priority_distribution}>
                  <XAxis dataKey="name" stroke="#8492a6" fontSize={11} />
                  <YAxis stroke="#8492a6" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: "#1a1f2e", borderColor: "#2a3040", color: "#e8ecf4" }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {data.priority_distribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PRIORITY_COLORS[entry.name as keyof typeof PRIORITY_COLORS] || "#22c55e"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Department distribution */}
          <Card className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[#e8ecf4]">Department Workloads</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.department_workload} layout="vertical">
                  <XAxis type="number" stroke="#8492a6" fontSize={11} />
                  <YAxis type="category" dataKey="name" stroke="#8492a6" fontSize={11} width={80} />
                  <Tooltip contentStyle={{ backgroundColor: "#1a1f2e", borderColor: "#2a3040", color: "#e8ecf4" }} />
                  <Bar dataKey="count" fill="hsl(220, 85%, 58%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Queue split */}
          <Card className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-5 space-y-4 md:col-span-2">
            <h3 className="text-sm font-semibold text-[#e8ecf4] text-center">Emergency vs General Care Stream Split</h3>
            <div className="h-64 flex justify-center">
              <ResponsiveContainer width="50%" height="100%">
                <PieChart>
                  <Pie
                    data={data.queue_distribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#3b82f6"
                    label
                  >
                    {data.queue_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip contentStyle={{ backgroundColor: "#1a1f2e", borderColor: "#2a3040", color: "#e8ecf4" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
};
