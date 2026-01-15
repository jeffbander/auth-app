"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Header } from "@/components/ui/header";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { LoadingCard } from "@/components/ui/loading";
import { downloadCSV, downloadExcel, ExportAnalysis } from "@/lib/export-utils";
import { format, subDays, subMonths, startOfDay, endOfDay } from "date-fns";
import {
  ArrowDownTrayIcon,
  DocumentChartBarIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

type DateRange = "7days" | "30days" | "90days" | "all";

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>("30days");
  const [anonymize, setAnonymize] = useState(false);

  const stats = useQuery(api.analyses.getStats);
  const allAnalyses = useQuery(api.analyses.list, {});

  const isLoading = stats === undefined || allAnalyses === undefined;

  // Filter analyses by date range
  const filteredAnalyses = allAnalyses?.filter((a) => {
    if (dateRange === "all") return true;
    const now = new Date();
    const daysMap: Record<DateRange, number> = {
      "7days": 7,
      "30days": 30,
      "90days": 90,
      all: 0,
    };
    const cutoff = subDays(now, daysMap[dateRange]);
    return new Date(a.createdAt) >= cutoff;
  }) || [];

  // Calculate filtered stats
  const filteredStats = {
    total: filteredAnalyses.length,
    qualified: filteredAnalyses.filter((a) => a.qualificationStatus === "Qualified").length,
    notQualified: filteredAnalyses.filter((a) => a.qualificationStatus === "Not Qualified").length,
    reviewNeeded: filteredAnalyses.filter((a) => a.qualificationStatus === "Review Needed").length,
    highConfidence: filteredAnalyses.filter((a) => a.confidenceLevel === "High").length,
    mediumConfidence: filteredAnalyses.filter((a) => a.confidenceLevel === "Medium").length,
    lowConfidence: filteredAnalyses.filter((a) => a.confidenceLevel === "Low").length,
  };

  const handleExportCSV = () => {
    downloadCSV(
      filteredAnalyses as unknown as ExportAnalysis[],
      `echo-qualifications-${dateRange}.csv`,
      anonymize
    );
  };

  const handleExportExcel = () => {
    downloadExcel(
      filteredAnalyses as unknown as ExportAnalysis[],
      `echo-qualifications-${dateRange}.xlsx`,
      anonymize
    );
  };

  const qualificationRate = filteredStats.total > 0
    ? Math.round((filteredStats.qualified / filteredStats.total) * 100)
    : 0;

  return (
    <div className="min-h-screen">
      <Header
        title="Reports"
        subtitle="Export and analyze qualification data"
      />

      <div className="p-6 space-y-6">
        {/* Date Range Selection */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <CalendarDaysIcon className="h-5 w-5 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">
                Date Range:
              </span>
              <div className="flex gap-1">
                {(
                  [
                    { value: "7days", label: "Last 7 Days" },
                    { value: "30days", label: "Last 30 Days" },
                    { value: "90days", label: "Last 90 Days" },
                    { value: "all", label: "All Time" },
                  ] as const
                ).map((range) => (
                  <button
                    key={range.value}
                    onClick={() => setDateRange(range.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      dateRange === range.value
                        ? "bg-blue-100 text-blue-800"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={anonymize}
                  onChange={(e) => setAnonymize(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Anonymize patient data
              </label>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            <>
              <LoadingCard />
              <LoadingCard />
              <LoadingCard />
              <LoadingCard />
            </>
          ) : (
            <>
              <StatCard
                title="Total Analyses"
                value={filteredStats.total}
                icon={<DocumentChartBarIcon className="h-6 w-6" />}
                color="blue"
              />
              <StatCard
                title="Qualified"
                value={filteredStats.qualified}
                change={`${qualificationRate}% qualification rate`}
                changeType="neutral"
                icon={<CheckCircleIcon className="h-6 w-6" />}
                color="green"
              />
              <StatCard
                title="Not Qualified"
                value={filteredStats.notQualified}
                icon={<XCircleIcon className="h-6 w-6" />}
                color="red"
              />
              <StatCard
                title="Review Needed"
                value={filteredStats.reviewNeeded}
                icon={<ExclamationTriangleIcon className="h-6 w-6" />}
                color="yellow"
              />
            </>
          )}
        </div>

        {/* Confidence Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Confidence Level Distribution
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-3xl font-bold text-blue-600">
                {filteredStats.highConfidence}
              </p>
              <p className="text-sm text-slate-600 mt-1">High Confidence</p>
              <p className="text-xs text-slate-500">
                {filteredStats.total > 0
                  ? Math.round(
                      (filteredStats.highConfidence / filteredStats.total) * 100
                    )
                  : 0}
                %
              </p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <p className="text-3xl font-bold text-slate-600">
                {filteredStats.mediumConfidence}
              </p>
              <p className="text-sm text-slate-600 mt-1">Medium Confidence</p>
              <p className="text-xs text-slate-500">
                {filteredStats.total > 0
                  ? Math.round(
                      (filteredStats.mediumConfidence / filteredStats.total) * 100
                    )
                  : 0}
                %
              </p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-3xl font-bold text-orange-600">
                {filteredStats.lowConfidence}
              </p>
              <p className="text-sm text-slate-600 mt-1">Low Confidence</p>
              <p className="text-xs text-slate-500">
                {filteredStats.total > 0
                  ? Math.round(
                      (filteredStats.lowConfidence / filteredStats.total) * 100
                    )
                  : 0}
                %
              </p>
            </div>
          </div>
        </div>

        {/* Export Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Export Data
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            Export {filteredStats.total} analyses from the selected date range.
            {anonymize && " Patient names and MRNs will be anonymized."}
          </p>
          <div className="flex gap-3">
            <Button
              onClick={handleExportCSV}
              icon={<ArrowDownTrayIcon className="h-4 w-4" />}
              disabled={filteredStats.total === 0}
            >
              Export as CSV
            </Button>
            <Button
              variant="outline"
              onClick={handleExportExcel}
              icon={<ArrowDownTrayIcon className="h-4 w-4" />}
              disabled={filteredStats.total === 0}
            >
              Export as Excel
            </Button>
          </div>
        </div>

        {/* Data Retention Notice */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-700">
                Data Retention Policy
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Analysis data is retained according to your settings. Configure
                retention periods in Settings. Exported files should be stored
                securely in compliance with HIPAA regulations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
