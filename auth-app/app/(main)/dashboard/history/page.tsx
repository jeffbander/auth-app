"use client";

import { useState, Suspense } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/ui/header";
import { Button } from "@/components/ui/button";
import { StatusBadge, ConfidenceBadge } from "@/components/ui/status-badge";
import { LoadingTable } from "@/components/ui/loading";
import { downloadCSV, downloadExcel, ExportAnalysis } from "@/lib/export-utils";
import { format } from "date-fns";
import Link from "next/link";
import {
  FunnelIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  EyeIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { Id } from "@/convex/_generated/dataModel";

type StatusFilter = "all" | "Qualified" | "Not Qualified" | "Review Needed";

function HistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") as StatusFilter || "all";

  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const analyses = useQuery(api.analyses.list, {
    status: statusFilter === "all" ? undefined : statusFilter,
  });
  const removeAnalysis = useMutation(api.analyses.remove);

  const isLoading = analyses === undefined;

  const handleSelectAll = () => {
    if (!analyses) return;
    if (selectedIds.size === analyses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(analyses.map((a) => a._id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleDelete = async () => {
    for (const id of Array.from(selectedIds)) {
      await removeAnalysis({ id: id as Id<"analyses"> });
    }
    setSelectedIds(new Set());
    setShowDeleteConfirm(false);
  };

  const handleExportCSV = () => {
    if (!analyses) return;
    const toExport = selectedIds.size > 0
      ? analyses.filter((a) => selectedIds.has(a._id))
      : analyses;
    downloadCSV(toExport as unknown as ExportAnalysis[]);
  };

  const handleExportExcel = () => {
    if (!analyses) return;
    const toExport = selectedIds.size > 0
      ? analyses.filter((a) => selectedIds.has(a._id))
      : analyses;
    downloadExcel(toExport as unknown as ExportAnalysis[]);
  };

  const filteredCount = analyses?.length || 0;

  return (
    <div className="min-h-screen">
      <Header
        title="Analysis History"
        subtitle="View and manage past qualification analyses"
      />

      <div className="p-6 space-y-6">
        {/* Filters and Actions */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <FunnelIcon className="h-5 w-5 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">Filter:</span>
              <div className="flex gap-1">
                {(["all", "Qualified", "Not Qualified", "Review Needed"] as const).map(
                  (status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        statusFilter === status
                          ? "bg-blue-100 text-blue-800"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {status === "all" ? "All" : status}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Export Actions */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">
                {selectedIds.size > 0
                  ? `${selectedIds.size} selected`
                  : `${filteredCount} total`}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                icon={<ArrowDownTrayIcon className="h-4 w-4" />}
              >
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                icon={<ArrowDownTrayIcon className="h-4 w-4" />}
              >
                Excel
              </Button>
              {selectedIds.size > 0 && selectedIds.size < (analyses?.length || 0) && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  icon={<TrashIcon className="h-4 w-4" />}
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="p-6">
              <LoadingTable rows={10} />
            </div>
          ) : analyses && analyses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === analyses.length && analyses.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-slate-300"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Patient
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      MRN
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Insurance
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Primary Indication
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Confidence
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analyses.map((analysis) => (
                    <tr
                      key={analysis._id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(analysis._id)}
                          onChange={() => handleSelectOne(analysis._id)}
                          className="rounded border-slate-300"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/analysis/${analysis._id}`}
                          className="font-medium text-slate-900 hover:text-blue-600"
                        >
                          {analysis.patientName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {analysis.mrn || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {analysis.insurance || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          status={analysis.qualificationStatus as "Qualified" | "Not Qualified" | "Review Needed"}
                          size="sm"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
                        {analysis.primaryIndication || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <ConfidenceBadge level={analysis.confidenceLevel} />
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {format(new Date(analysis.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link href={`/dashboard/analysis/${analysis._id}`}>
                            <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                              <EyeIcon className="h-4 w-4" />
                            </button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <DocumentTextIcon className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 mb-2">No analyses found</p>
              <p className="text-sm text-slate-400 mb-4">
                {statusFilter !== "all"
                  ? `No analyses with status "${statusFilter}"`
                  : "Start by creating a new analysis"}
              </p>
              <Link href="/dashboard/analyze">
                <Button>New Analysis</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Confirm Deletion
              </h3>
              <p className="text-slate-600 mb-4">
                Are you sure you want to delete {selectedIds.size} analysis
                {selectedIds.size !== 1 ? "es" : ""}? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
                <Button variant="danger" onClick={handleDelete}>
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default function HistoryPage() {
  return (
    <Suspense fallback={<LoadingTable />}>
      <HistoryContent />
    </Suspense>
  );
}
