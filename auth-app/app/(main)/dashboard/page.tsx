"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Header } from "@/components/ui/header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge, ConfidenceBadge } from "@/components/ui/status-badge";
import { LoadingCard, LoadingTable } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  DocumentPlusIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { format } from "date-fns";

export default function DashboardPage() {
  const stats = useQuery(api.analyses.getStats);
  const recentAnalyses = useQuery(api.analyses.list, { limit: 5 });

  const isLoading = stats === undefined || recentAnalyses === undefined;

  return (
    <div className="min-h-screen">
      <Header
        title="Dashboard"
        subtitle="Overview of echocardiogram qualification analyses"
      />

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
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
                value={stats?.total || 0}
                icon={<ClipboardDocumentListIcon className="h-6 w-6" />}
                color="blue"
              />
              <StatCard
                title="Qualified"
                value={stats?.qualified || 0}
                icon={<CheckCircleIcon className="h-6 w-6" />}
                color="green"
              />
              <StatCard
                title="Not Qualified"
                value={stats?.notQualified || 0}
                icon={<XCircleIcon className="h-6 w-6" />}
                color="red"
              />
              <StatCard
                title="Review Needed"
                value={stats?.reviewNeeded || 0}
                icon={<ExclamationTriangleIcon className="h-6 w-6" />}
                color="yellow"
              />
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/analyze">
              <Button icon={<DocumentPlusIcon className="h-4 w-4" />}>
                New Analysis
              </Button>
            </Link>
            <Link href="/dashboard/history?status=Review Needed">
              <Button variant="outline">View Pending Reviews</Button>
            </Link>
            <Link href="/dashboard/reports">
              <Button variant="outline">Export Reports</Button>
            </Link>
          </div>
        </div>

        {/* Recent Analyses */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Recent Analyses
            </h2>
            <Link
              href="/dashboard/history"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View all
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>

          {isLoading ? (
            <div className="p-6">
              <LoadingTable rows={5} />
            </div>
          ) : recentAnalyses && recentAnalyses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Patient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      MRN
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Confidence
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentAnalyses.map((analysis) => (
                    <tr
                      key={analysis._id}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/analysis/${analysis._id}`}
                          className="font-medium text-slate-900 hover:text-blue-600"
                        >
                          {analysis.patientName}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {analysis.mrn || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge
                          status={analysis.qualificationStatus as "Qualified" | "Not Qualified" | "Review Needed"}
                          size="sm"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <ConfidenceBadge level={analysis.confidenceLevel} />
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {format(new Date(analysis.createdAt), "MMM d, yyyy")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <ClipboardDocumentListIcon className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 mb-4">No analyses yet</p>
              <Link href="/dashboard/analyze">
                <Button>Create Your First Analysis</Button>
              </Link>
            </div>
          )}
        </div>

        {/* HIPAA Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-blue-600"
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
              <h3 className="text-sm font-medium text-blue-800">
                HIPAA Compliance Notice
              </h3>
              <p className="mt-1 text-sm text-blue-700">
                This application processes protected health information (PHI).
                Ensure you have proper authorization before entering patient data.
                All data is processed locally and stored securely.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
