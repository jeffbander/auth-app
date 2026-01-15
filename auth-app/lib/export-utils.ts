// Export Utilities for CSV and Excel
import * as XLSX from "xlsx";
import { formatCitations, AnalysisResult } from "./nlp-processor";

export interface ExportAnalysis {
  patientName: string;
  mrn?: string;
  provider?: string;
  insurance?: string;
  qualificationStatus: string;
  primaryIndication?: string;
  supportingFindings: string[];
  clinicalCitations: {
    finding: string;
    specialty: string;
    provider?: string | null;
    date?: string | null;
    priority: number;
  }[];
  conflictingInfo: {
    finding: string;
    sources: {
      specialty: string;
      assessment: string;
      date?: string | null;
    }[];
  }[];
  confidenceLevel: string;
  createdAt: number;
}

interface ExportRow {
  "Patient Name": string;
  MRN: string;
  Provider: string;
  Insurance: string;
  "Qualification Status": string;
  "Primary Indication": string;
  "Supporting Findings": string;
  "Clinical Source Citations": string;
  "Conflicting Information": string;
  "Confidence Level": string;
  "Analysis Date": string;
}

function formatConflicts(
  conflicts: ExportAnalysis["conflictingInfo"]
): string {
  if (conflicts.length === 0) return "None";

  return conflicts
    .map((c) => {
      const sources = c.sources
        .map((s) => `${s.specialty}: ${s.assessment}${s.date ? ` (${s.date})` : ""}`)
        .join(" vs ");
      return `${c.finding}: ${sources}`;
    })
    .join("; ");
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function analysisToRow(
  analysis: ExportAnalysis,
  anonymize: boolean = false
): ExportRow {
  return {
    "Patient Name": anonymize ? `Patient ${analysis.mrn || "Unknown"}` : analysis.patientName,
    MRN: anonymize ? "***" : (analysis.mrn || "N/A"),
    Provider: analysis.provider || "N/A",
    Insurance: analysis.insurance || "N/A",
    "Qualification Status": analysis.qualificationStatus,
    "Primary Indication": analysis.primaryIndication || "N/A",
    "Supporting Findings": analysis.supportingFindings.join(", ") || "None",
    "Clinical Source Citations": formatCitations(analysis.clinicalCitations) || "N/A",
    "Conflicting Information": formatConflicts(analysis.conflictingInfo),
    "Confidence Level": analysis.confidenceLevel,
    "Analysis Date": formatDate(analysis.createdAt),
  };
}

/**
 * Export analyses to CSV format
 */
export function exportToCSV(
  analyses: ExportAnalysis[],
  anonymize: boolean = false
): string {
  const rows = analyses.map((a) => analysisToRow(a, anonymize));

  if (rows.length === 0) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const csvRows: string[] = [headers.join(",")];

  for (const row of rows) {
    const values = headers.map((header) => {
      const value = row[header as keyof ExportRow];
      // Escape quotes and wrap in quotes if contains comma or quote
      const escaped = String(value).replace(/"/g, '""');
      return escaped.includes(",") || escaped.includes('"') || escaped.includes("\n")
        ? `"${escaped}"`
        : escaped;
    });
    csvRows.push(values.join(","));
  }

  return csvRows.join("\n");
}

/**
 * Export analyses to Excel format
 */
export function exportToExcel(
  analyses: ExportAnalysis[],
  anonymize: boolean = false
): Uint8Array {
  const rows = analyses.map((a) => analysisToRow(a, anonymize));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  worksheet["!cols"] = [
    { wch: 20 }, // Patient Name
    { wch: 12 }, // MRN
    { wch: 15 }, // Provider
    { wch: 15 }, // Insurance
    { wch: 18 }, // Qualification Status
    { wch: 25 }, // Primary Indication
    { wch: 40 }, // Supporting Findings
    { wch: 60 }, // Clinical Source Citations
    { wch: 40 }, // Conflicting Information
    { wch: 15 }, // Confidence Level
    { wch: 20 }, // Analysis Date
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Echo Qualifications");

  // Add summary sheet
  const summary = [
    { Metric: "Total Analyses", Value: analyses.length },
    {
      Metric: "Qualified",
      Value: analyses.filter((a) => a.qualificationStatus === "Qualified").length,
    },
    {
      Metric: "Not Qualified",
      Value: analyses.filter((a) => a.qualificationStatus === "Not Qualified").length,
    },
    {
      Metric: "Review Needed",
      Value: analyses.filter((a) => a.qualificationStatus === "Review Needed").length,
    },
    {
      Metric: "High Confidence",
      Value: analyses.filter((a) => a.confidenceLevel === "High").length,
    },
    {
      Metric: "Medium Confidence",
      Value: analyses.filter((a) => a.confidenceLevel === "Medium").length,
    },
    {
      Metric: "Low Confidence",
      Value: analyses.filter((a) => a.confidenceLevel === "Low").length,
    },
    { Metric: "Export Date", Value: new Date().toLocaleString() },
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summary);
  summarySheet["!cols"] = [{ wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as Uint8Array;
}

/**
 * Generate authorization letter template
 */
export function generateAuthorizationLetter(analysis: ExportAnalysis): string {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
ECHOCARDIOGRAM AUTHORIZATION REQUEST
=====================================

Date: ${today}

Patient Information:
- Name: ${analysis.patientName}
- MRN: ${analysis.mrn || "N/A"}
- Insurance: ${analysis.insurance || "N/A"}

Ordering Provider: ${analysis.provider || "N/A"}

CLINICAL JUSTIFICATION
----------------------

Primary Indication: ${analysis.primaryIndication || "N/A"}

Supporting Clinical Findings:
${analysis.supportingFindings.map((f) => `• ${f}`).join("\n")}

Clinical Documentation Sources:
${formatCitations(analysis.clinicalCitations)}

ASSESSMENT
----------

Qualification Status: ${analysis.qualificationStatus}
Confidence Level: ${analysis.confidenceLevel}

${analysis.conflictingInfo.length > 0 ? `
Note: The following conflicting information was identified and should be reviewed:
${formatConflicts(analysis.conflictingInfo)}
` : ""}

MEDICAL NECESSITY STATEMENT
---------------------------

Based on the clinical documentation reviewed, this patient ${
    analysis.qualificationStatus === "Qualified"
      ? "MEETS criteria for echocardiogram based on the presence of " + (analysis.primaryIndication || "cardiac symptoms/findings")
      : analysis.qualificationStatus === "Review Needed"
      ? "REQUIRES ADDITIONAL REVIEW for echocardiogram authorization"
      : "does NOT meet standard criteria for echocardiogram at this time"
  }.

${
    analysis.qualificationStatus === "Qualified"
      ? "An echocardiogram is medically necessary to evaluate cardiac structure and function given the documented clinical findings."
      : ""
  }

---
This document was generated automatically for insurance authorization purposes.
Analysis performed: ${formatDate(analysis.createdAt)}

HIPAA Notice: This document contains protected health information (PHI) and is intended only for the authorized recipient.
`.trim();
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download CSV file
 */
export function downloadCSV(
  analyses: ExportAnalysis[],
  filename: string = "echo-qualifications.csv",
  anonymize: boolean = false
): void {
  const csv = exportToCSV(analyses, anonymize);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename);
}

/**
 * Download Excel file
 */
export function downloadExcel(
  analyses: ExportAnalysis[],
  filename: string = "echo-qualifications.xlsx",
  anonymize: boolean = false
): void {
  const data = exportToExcel(analyses, anonymize);
  const blob = new Blob([data as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, filename);
}

/**
 * Download authorization letter as text file
 */
export function downloadAuthorizationLetter(
  analysis: ExportAnalysis,
  filename?: string
): void {
  const letter = generateAuthorizationLetter(analysis);
  const blob = new Blob([letter], { type: "text/plain;charset=utf-8;" });
  const defaultFilename = `auth-letter-${analysis.patientName.replace(/\s+/g, "-")}.txt`;
  downloadBlob(blob, filename || defaultFilename);
}

/**
 * Print authorization letter
 */
export function printAuthorizationLetter(analysis: ExportAnalysis): void {
  const letter = generateAuthorizationLetter(analysis);
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>Authorization Letter - ${analysis.patientName}</title>
          <style>
            body { font-family: 'Courier New', monospace; padding: 40px; line-height: 1.6; }
            pre { white-space: pre-wrap; word-wrap: break-word; }
          </style>
        </head>
        <body>
          <pre>${letter}</pre>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }
}

/**
 * Convert AnalysisResult to ExportAnalysis format for immediate export
 */
export function analysisResultToExport(
  result: AnalysisResult,
  patientName: string,
  insurance?: string
): ExportAnalysis {
  return {
    patientName,
    mrn: result.extractedInfo.mrn || undefined,
    provider: result.extractedInfo.orderingProvider || undefined,
    insurance: insurance || undefined,
    qualificationStatus: result.qualificationStatus,
    primaryIndication: result.primaryIndication || undefined,
    supportingFindings: result.supportingFindings,
    clinicalCitations: result.clinicalCitations.map((c) => ({
      finding: c.finding,
      specialty: c.specialty,
      provider: c.provider,
      date: c.date,
      priority: c.priority,
    })),
    conflictingInfo: result.conflictingInfo.map((c) => ({
      finding: c.finding,
      sources: c.sources.map((s) => ({
        specialty: s.specialty,
        assessment: s.assessment,
        date: s.date,
      })),
    })),
    confidenceLevel: result.confidenceLevel,
    createdAt: Date.now(),
  };
}

/**
 * Download single analysis as CSV
 */
export function downloadSingleCSV(
  result: AnalysisResult,
  patientName: string,
  insurance?: string
): void {
  const exportData = analysisResultToExport(result, patientName, insurance);
  const filename = `analysis-${patientName.replace(/\s+/g, "-")}.csv`;
  downloadCSV([exportData], filename);
}

/**
 * Download single analysis as Excel
 */
export function downloadSingleExcel(
  result: AnalysisResult,
  patientName: string,
  insurance?: string
): void {
  const exportData = analysisResultToExport(result, patientName, insurance);
  const filename = `analysis-${patientName.replace(/\s+/g, "-")}.xlsx`;
  downloadExcel([exportData], filename);
}
