"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/ui/header";
import { Button } from "@/components/ui/button";
import { StatusBadge, ConfidenceBadge } from "@/components/ui/status-badge";
import { LoadingSpinner } from "@/components/ui/loading";
import {
  downloadAuthorizationLetter,
  printAuthorizationLetter,
  ExportAnalysis,
} from "@/lib/export-utils";
import { formatCitations } from "@/lib/nlp-processor";
import { format } from "date-fns";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";
import {
  ArrowLeftIcon,
  PrinterIcon,
  DocumentArrowDownIcon,
  PencilSquareIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

export default function AnalysisDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const analysis = useQuery(api.analyses.getById, {
    id: id as Id<"analyses">,
  });
  const updateAnalysis = useMutation(api.analyses.update);
  const removeAnalysis = useMutation(api.analyses.remove);

  const [isEditing, setIsEditing] = useState(false);
  const [editStatus, setEditStatus] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (analysis === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (analysis === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Analysis not found</p>
          <Link href="/dashboard/history">
            <Button>Back to History</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleStartEdit = () => {
    setEditStatus(analysis.qualificationStatus);
    setManualNotes(analysis.manualNotes || "");
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    await updateAnalysis({
      id: id as Id<"analyses">,
      qualificationStatus: editStatus,
      manualOverride: editStatus !== analysis.qualificationStatus,
      manualNotes,
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await removeAnalysis({ id: id as Id<"analyses"> });
    router.push("/dashboard/history");
  };

  const handlePrintLetter = () => {
    printAuthorizationLetter(analysis as unknown as ExportAnalysis);
  };

  const handleDownloadLetter = () => {
    downloadAuthorizationLetter(analysis as unknown as ExportAnalysis);
  };

  return (
    <div className="min-h-screen">
      <Header
        title="Analysis Details"
        subtitle={`Patient: ${analysis.patientName}`}
      />

      <div className="p-6 space-y-6">
        {/* Navigation and Actions */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/history"
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to History
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintLetter}
              icon={<PrinterIcon className="h-4 w-4" />}
            >
              Print Letter
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadLetter}
              icon={<DocumentArrowDownIcon className="h-4 w-4" />}
            >
              Download Letter
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartEdit}
              icon={<PencilSquareIcon className="h-4 w-4" />}
            >
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              icon={<TrashIcon className="h-4 w-4" />}
            >
              Delete
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Qualification Status Card */}
            <div
              className={`rounded-xl border p-6 ${
                analysis.qualificationStatus === "Qualified"
                  ? "bg-green-50 border-green-200"
                  : analysis.qualificationStatus === "Review Needed"
                  ? "bg-yellow-50 border-yellow-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              {isEditing ? (
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900">
                    Edit Qualification Status
                  </h3>
                  <div className="flex gap-2">
                    {["Qualified", "Not Qualified", "Review Needed"].map(
                      (status) => (
                        <button
                          key={status}
                          onClick={() => setEditStatus(status)}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            editStatus === status
                              ? status === "Qualified"
                                ? "bg-green-600 text-white"
                                : status === "Review Needed"
                                ? "bg-yellow-600 text-white"
                                : "bg-red-600 text-white"
                              : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {status}
                        </button>
                      )
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Manual Notes
                    </label>
                    <textarea
                      value={manualNotes}
                      onChange={(e) => setManualNotes(e.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Add notes about this manual override..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveEdit}>Save Changes</Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <StatusBadge status={analysis.qualificationStatus} size="lg" />
                    <ConfidenceBadge level={analysis.confidenceLevel} />
                  </div>
                  {analysis.primaryIndication && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-slate-700">
                        Primary Indication
                      </p>
                      <p className="text-xl font-semibold text-slate-900">
                        {analysis.primaryIndication}
                      </p>
                    </div>
                  )}
                  {analysis.manualOverride && (
                    <div className="mt-4 p-3 bg-white/50 rounded-lg">
                      <p className="text-sm font-medium text-slate-700">
                        Manual Override Applied
                      </p>
                      {analysis.manualNotes && (
                        <p className="text-sm text-slate-600 mt-1">
                          {analysis.manualNotes}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Supporting Findings */}
            {analysis.supportingFindings.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Supporting Findings ({analysis.supportingFindings.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.supportingFindings.map((finding, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800"
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                      {finding}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Clinical Citations */}
            {analysis.clinicalCitations.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Clinical Source Citations
                </h3>
                <div className="space-y-3">
                  {analysis.clinicalCitations.map((citation, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">
                          {citation.finding}
                        </p>
                        <p className="text-sm text-slate-600">
                          {citation.specialty}
                          {citation.provider && ` with Dr. ${citation.provider}`}
                          {citation.date && ` on ${citation.date}`}
                        </p>
                      </div>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Priority {citation.priority}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-slate-100 rounded-lg">
                  <p className="text-xs font-medium text-slate-600 mb-1">
                    Formatted Citation String:
                  </p>
                  <p className="text-sm text-slate-700 font-mono">
                    {formatCitations(analysis.clinicalCitations)}
                  </p>
                </div>
              </div>
            )}

            {/* Conflicting Information */}
            {analysis.conflictingInfo.length > 0 && (
              <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-6">
                <h3 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center gap-2">
                  <ExclamationTriangleIcon className="h-5 w-5" />
                  Conflicting Information
                </h3>
                <div className="space-y-3">
                  {analysis.conflictingInfo.map((conflict, i) => (
                    <div
                      key={i}
                      className="p-3 bg-white rounded-lg border border-yellow-200"
                    >
                      <p className="font-medium text-slate-900">{conflict.finding}</p>
                      <div className="mt-2 space-y-1">
                        {conflict.sources.map((source, j) => (
                          <p key={j} className="text-sm text-slate-600">
                            <span className="font-medium">{source.specialty}:</span>{" "}
                            {source.assessment}
                            {source.date && ` (${source.date})`}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw Notes */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Original Clinical Notes
              </h3>
              <div className="bg-slate-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono">
                  {analysis.rawNotes}
                </pre>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Patient Info */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Patient Information
              </h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-slate-500">Name</dt>
                  <dd className="text-slate-900">{analysis.patientName}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-500">MRN</dt>
                  <dd className="text-slate-900">{analysis.mrn || "-"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-500">Insurance</dt>
                  <dd className="text-slate-900">{analysis.insurance || "-"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-500">
                    Ordering Provider
                  </dt>
                  <dd className="text-slate-900">{analysis.provider || "-"}</dd>
                </div>
              </dl>
            </div>

            {/* Analysis Metadata */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Analysis Details
              </h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-slate-500">Created</dt>
                  <dd className="text-slate-900 flex items-center gap-1">
                    <ClockIcon className="h-4 w-4 text-slate-400" />
                    {format(new Date(analysis.createdAt), "MMM d, yyyy h:mm a")}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-500">
                    Last Updated
                  </dt>
                  <dd className="text-slate-900">
                    {format(new Date(analysis.updatedAt), "MMM d, yyyy h:mm a")}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-500">
                    Findings Count
                  </dt>
                  <dd className="text-slate-900">
                    {analysis.supportingFindings.length} supporting findings
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-500">
                    Citations Count
                  </dt>
                  <dd className="text-slate-900">
                    {analysis.clinicalCitations.length} source citations
                  </dd>
                </div>
              </dl>
            </div>

            {/* Quick Actions */}
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handlePrintLetter}
                  icon={<PrinterIcon className="h-4 w-4" />}
                >
                  Print Authorization Letter
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleDownloadLetter}
                  icon={<DocumentArrowDownIcon className="h-4 w-4" />}
                >
                  Download Letter
                </Button>
                <Link href="/dashboard/analyze" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    New Analysis
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Confirm Deletion
              </h3>
              <p className="text-slate-600 mb-4">
                Are you sure you want to delete this analysis for{" "}
                <strong>{analysis.patientName}</strong>? This action cannot be
                undone.
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
