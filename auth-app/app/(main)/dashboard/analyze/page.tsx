"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Header } from "@/components/ui/header";
import { Button } from "@/components/ui/button";
import { StatusBadge, ConfidenceBadge } from "@/components/ui/status-badge";
import { LoadingSpinner } from "@/components/ui/loading";
import { analyzeNotes, extractPatientInfo, AnalysisResult } from "@/lib/nlp-processor";
import { downloadSingleCSV, downloadSingleExcel } from "@/lib/export-utils";
import {
  DocumentMagnifyingGlassIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowDownTrayIcon,
  SparklesIcon,
  XCircleIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";

// Claude API response type
interface ClaudeAnalysisResult {
  confirmedFindings: {
    finding: string;
    category: "symptom" | "history" | "cardiacFinding" | "riskFactor";
    evidence: string;
    confidence: "high" | "medium";
  }[];
  negatedFindings: {
    finding: string;
    evidence: string;
  }[];
  uncertainFindings: {
    finding: string;
    evidence: string;
    reason: string;
  }[];
  primaryIndication: string | null;
  qualificationStatus: "Qualified" | "Not Qualified" | "Review Needed" | "Insufficient Information";
  qualificationReason: string;
  confidence: "high" | "medium" | "low";
  warnings: string[];
}

export default function AnalyzePage() {
  const router = useRouter();
  const createAnalysis = useMutation(api.analyses.create);

  const [patientName, setPatientName] = useState("");
  const [insurance, setInsurance] = useState("");
  const [notes, setNotes] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [claudeResult, setClaudeResult] = useState<ClaudeAnalysisResult | null>(null);
  const [savedAnalysisId, setSavedAnalysisId] = useState<Id<"analyses"> | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useAI, setUseAI] = useState(true); // Toggle for Claude AI analysis

  const handleAnalyze = async () => {
    if (!patientName.trim()) {
      setError("Patient name is required before analysis");
      return;
    }

    if (!notes.trim()) {
      setError("Please enter clinical notes to analyze");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setSaveError(null);
    setResult(null);
    setClaudeResult(null);
    setSavedAnalysisId(null);

    try {
      // Extract patient info using rule-based system
      const extractedInfo = extractPatientInfo(notes);

      let finalStatus: AnalysisResult["qualificationStatus"];
      let finalIndication: string | null = null;
      let finalFindings: string[] = [];
      let finalConfidence: AnalysisResult["confidenceLevel"] = "Medium";
      let claudeAnalysis: ClaudeAnalysisResult | null = null;

      if (useAI) {
        // Use Claude AI for analysis
        try {
          const response = await fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clinicalNotes: notes }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Analysis failed");
          }

          claudeAnalysis = await response.json() as ClaudeAnalysisResult;
          setClaudeResult(claudeAnalysis);

          // Map Claude results to our format
          finalStatus = claudeAnalysis.qualificationStatus;
          finalIndication = claudeAnalysis.primaryIndication;
          finalFindings = claudeAnalysis.confirmedFindings?.map((f) => f.finding) || [];
          finalConfidence = claudeAnalysis.confidence === "high" ? "High" :
                          claudeAnalysis.confidence === "medium" ? "Medium" : "Low";
        } catch (aiErr) {
          console.error("Claude AI analysis failed, falling back to rule-based:", aiErr);
          // Fallback to rule-based analysis
          const ruleResult = analyzeNotes(notes);
          setResult(ruleResult);
          finalStatus = ruleResult.qualificationStatus;
          finalIndication = ruleResult.primaryIndication;
          finalFindings = ruleResult.supportingFindings;
          finalConfidence = ruleResult.confidenceLevel;
          setError("AI analysis unavailable. Using rule-based analysis as fallback.");
        }
      } else {
        // Use rule-based analysis only
        const ruleResult = analyzeNotes(notes);
        setResult(ruleResult);
        finalStatus = ruleResult.qualificationStatus;
        finalIndication = ruleResult.primaryIndication;
        finalFindings = ruleResult.supportingFindings;
        finalConfidence = ruleResult.confidenceLevel;
      }

      // Build analysis result for saving
      const analysisResult: AnalysisResult = {
        qualificationStatus: finalStatus,
        primaryIndication: finalIndication,
        supportingFindings: finalFindings,
        clinicalCitations: claudeAnalysis ? claudeAnalysis.confirmedFindings.map((f, i) => ({
          finding: f.finding,
          specialty: f.category,
          provider: null,
          date: null,
          priority: f.confidence === "high" ? 1 : 2,
        })) : [],
        conflictingInfo: [],
        confidenceLevel: finalConfidence,
        allFindings: [],
        extractedInfo,
        insufficientReason: claudeAnalysis?.qualificationReason,
      };

      setResult(analysisResult);

      // Auto-save to history
      try {
        const analysisId = await createAnalysis({
          patientName: patientName.trim(),
          mrn: extractedInfo.mrn || undefined,
          insurance: insurance.trim() || undefined,
          provider: extractedInfo.orderingProvider || undefined,
          rawNotes: notes,
          qualificationStatus: finalStatus,
          primaryIndication: finalIndication || undefined,
          supportingFindings: finalFindings,
          clinicalCitations: analysisResult.clinicalCitations.map((c) => ({
            finding: c.finding,
            specialty: c.specialty,
            provider: c.provider || undefined,
            date: c.date || undefined,
            priority: c.priority,
          })),
          conflictingInfo: [],
          confidenceLevel: finalConfidence,
        });
        setSavedAnalysisId(analysisId);
      } catch (saveErr: unknown) {
        console.error("Failed to auto-save analysis:", saveErr);
        const errorMessage = saveErr instanceof Error ? saveErr.message : "Unknown error";
        if (errorMessage.includes("Unauthorized")) {
          setSaveError("Authentication error. Please try signing out and back in.");
        } else {
          setSaveError(`Failed to save: ${errorMessage}`);
        }
      }
    } catch (err) {
      setError("An error occurred during analysis. Please try again.");
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClear = () => {
    setPatientName("");
    setInsurance("");
    setNotes("");
    setResult(null);
    setClaudeResult(null);
    setSavedAnalysisId(null);
    setSaveError(null);
    setError(null);
  };

  const handleManualSave = async () => {
    if (!result) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const analysisId = await createAnalysis({
        patientName: patientName.trim(),
        mrn: result.extractedInfo.mrn || undefined,
        insurance: insurance.trim() || undefined,
        provider: result.extractedInfo.orderingProvider || undefined,
        rawNotes: notes,
        qualificationStatus: result.qualificationStatus,
        primaryIndication: result.primaryIndication || undefined,
        supportingFindings: result.supportingFindings,
        clinicalCitations: result.clinicalCitations.map((c) => ({
          finding: c.finding,
          specialty: c.specialty,
          provider: c.provider || undefined,
          date: c.date || undefined,
          priority: c.priority,
        })),
        conflictingInfo: result.conflictingInfo.map((c) => ({
          finding: c.finding,
          sources: c.sources.map((s) => ({
            specialty: s.specialty,
            assessment: s.assessment,
            date: s.date || undefined,
          })),
        })),
        confidenceLevel: result.confidenceLevel,
      });
      setSavedAnalysisId(analysisId);
    } catch (err: unknown) {
      console.error("Failed to save analysis:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      if (errorMessage.includes("Unauthorized")) {
        setSaveError("Authentication error. Please try signing out and back in.");
      } else {
        setSaveError(`Failed to save: ${errorMessage}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!result) return;
    downloadSingleCSV(result, patientName.trim(), insurance.trim() || undefined);
  };

  const handleDownloadExcel = () => {
    if (!result) return;
    downloadSingleExcel(result, patientName.trim(), insurance.trim() || undefined);
  };

  return (
    <div className="min-h-screen">
      <Header
        title="New Analysis"
        subtitle="Analyze clinical notes for echocardiogram qualification"
      />

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Form */}
          <div className="space-y-6">
            {/* Patient Information */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Patient Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Patient Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Enter patient name"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Insurance
                  </label>
                  <input
                    type="text"
                    value={insurance}
                    onChange={(e) => setInsurance(e.target.value)}
                    placeholder="Insurance provider"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                MRN and Ordering Provider will be automatically extracted from clinical notes
              </p>
            </div>

            {/* Clinical Notes */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Clinical Notes
              </h2>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Paste patient clinical notes below
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Paste clinical notes here. You can include multiple notes from different visits separated by dashes or date headers..."
                  rows={15}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Include notes from cardiology, ED, primary care, and other
                  specialists for best results. The system will automatically
                  extract dates, provider names, and clinical findings.
                </p>
              </div>
            </div>

            {/* AI Toggle */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <SparklesIcon className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="font-medium text-slate-900">Claude AI Analysis</p>
                    <p className="text-sm text-slate-500">
                      Better negation handling & hallucination prevention
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUseAI(!useAI)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 ${
                    useAI ? "bg-purple-600" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      useAI ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={handleAnalyze}
                loading={isAnalyzing}
                icon={useAI ? <SparklesIcon className="h-4 w-4" /> : <DocumentMagnifyingGlassIcon className="h-4 w-4" />}
                className="flex-1"
              >
                {isAnalyzing ? "Analyzing..." : useAI ? "Analyze with AI" : "Analyze Notes"}
              </Button>
              <Button variant="outline" onClick={handleClear}>
                Clear
              </Button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-800">
                  <ExclamationTriangleIcon className="h-5 w-5" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Results Panel */}
          <div className="space-y-6">
            {isAnalyzing ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <LoadingSpinner size="lg" className="mx-auto mb-4" />
                <p className="text-slate-600 font-medium">
                  Analyzing clinical notes...
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  Detecting symptoms, history, and specialist information
                </p>
              </div>
            ) : result ? (
              <>
                {/* Qualification Status */}
                <div
                  className={`rounded-xl border p-6 ${
                    result.qualificationStatus === "Qualified"
                      ? "bg-green-50 border-green-200"
                      : result.qualificationStatus === "Review Needed"
                      ? "bg-yellow-50 border-yellow-200"
                      : result.qualificationStatus === "Insufficient Information"
                      ? "bg-slate-50 border-slate-300"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <StatusBadge status={result.qualificationStatus} size="lg" />
                    <div className="flex items-center gap-2">
                      {useAI && claudeResult && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800">
                          <SparklesIcon className="h-3 w-3" />
                          AI Analysis
                        </span>
                      )}
                      <ConfidenceBadge level={result.confidenceLevel} />
                    </div>
                  </div>
                  {result.primaryIndication && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-slate-700">
                        Primary Indication
                      </p>
                      <p className="text-lg font-semibold text-slate-900">
                        {result.primaryIndication}
                      </p>
                    </div>
                  )}
                  {claudeResult?.qualificationReason && (
                    <div className="mt-4 p-3 bg-white/50 rounded-lg">
                      <p className="text-sm text-slate-700">
                        {claudeResult.qualificationReason}
                      </p>
                    </div>
                  )}
                </div>

                {/* Warnings from Claude */}
                {claudeResult?.warnings && claudeResult.warnings.length > 0 && (
                  <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
                    <h3 className="text-lg font-semibold text-amber-800 mb-3 flex items-center gap-2">
                      <ExclamationTriangleIcon className="h-5 w-5" />
                      Analysis Warnings
                    </h3>
                    <ul className="space-y-2">
                      {claudeResult.warnings.map((warning, i) => (
                        <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Extracted Information */}
                {(result.extractedInfo.mrn || result.extractedInfo.orderingProvider) && (
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">
                      Extracted Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {result.extractedInfo.mrn && (
                        <div>
                          <p className="text-sm font-medium text-slate-500">MRN</p>
                          <p className="text-base font-semibold text-slate-900">
                            {result.extractedInfo.mrn}
                          </p>
                        </div>
                      )}
                      {result.extractedInfo.orderingProvider && (
                        <div>
                          <p className="text-sm font-medium text-slate-500">
                            Ordering Provider
                          </p>
                          <p className="text-base font-semibold text-slate-900">
                            Dr. {result.extractedInfo.orderingProvider}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Confirmed Findings (with evidence from Claude) */}
                {claudeResult?.confirmedFindings && claudeResult.confirmedFindings.length > 0 ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">
                      Confirmed Findings ({claudeResult.confirmedFindings.length})
                    </h3>
                    <div className="space-y-3">
                      {claudeResult.confirmedFindings.map((finding, i) => (
                        <div key={i} className="p-3 bg-green-50 rounded-lg border border-green-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="inline-flex items-center gap-1 font-medium text-green-800">
                              <CheckCircleIcon className="h-4 w-4" />
                              {finding.finding}
                            </span>
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                              {finding.category}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 italic">
                            "{finding.evidence}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : result.supportingFindings.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">
                      Supporting Findings ({result.supportingFindings.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {result.supportingFindings.map((finding, i) => (
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

                {/* Negated Findings (patient denies, no history of, etc.) */}
                {claudeResult?.negatedFindings && claudeResult.negatedFindings.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <XCircleIcon className="h-5 w-5 text-slate-500" />
                      Negated / Denied ({claudeResult.negatedFindings.length})
                    </h3>
                    <p className="text-sm text-slate-500 mb-3">
                      These conditions were explicitly ruled out or denied in the chart:
                    </p>
                    <div className="space-y-2">
                      {claudeResult.negatedFindings.map((finding, i) => (
                        <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <span className="font-medium text-slate-700 line-through decoration-red-400">
                            {finding.finding}
                          </span>
                          <p className="text-sm text-slate-500 mt-1 italic">
                            "{finding.evidence}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Uncertain Findings (possible, rule out, etc.) */}
                {claudeResult?.uncertainFindings && claudeResult.uncertainFindings.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <QuestionMarkCircleIcon className="h-5 w-5 text-amber-500" />
                      Uncertain / Needs Clarification ({claudeResult.uncertainFindings.length})
                    </h3>
                    <p className="text-sm text-slate-500 mb-3">
                      These conditions are mentioned but not confirmed - cannot be used for qualification:
                    </p>
                    <div className="space-y-2">
                      {claudeResult.uncertainFindings.map((finding, i) => (
                        <div key={i} className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-amber-800">
                              {finding.finding}
                            </span>
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                              {finding.reason}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 italic">
                            "{finding.evidence}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clinical Citations */}
                {result.clinicalCitations.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">
                      Clinical Source Citations
                    </h3>
                    <div className="space-y-3">
                      {result.clinicalCitations.map((citation, i) => (
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
                  </div>
                )}

                {/* Conflicting Information */}
                {result.conflictingInfo.length > 0 && (
                  <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-6">
                    <h3 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center gap-2">
                      <ExclamationTriangleIcon className="h-5 w-5" />
                      Conflicting Information
                    </h3>
                    <div className="space-y-3">
                      {result.conflictingInfo.map((conflict, i) => (
                        <div
                          key={i}
                          className="p-3 bg-white rounded-lg border border-yellow-200"
                        >
                          <p className="font-medium text-slate-900">
                            {conflict.finding}
                          </p>
                          <div className="mt-2 space-y-1">
                            {conflict.sources.map((source, j) => (
                              <p key={j} className="text-sm text-slate-600">
                                <span className="font-medium">
                                  {source.specialty}:
                                </span>{" "}
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

                {/* Saved to History */}
                {savedAnalysisId ? (
                  <div className="bg-green-50 rounded-xl border border-green-200 p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircleIcon className="h-6 w-6 text-green-600" />
                        <div>
                          <p className="font-medium text-green-900">Saved to History</p>
                          <p className="text-sm text-green-700">
                            This analysis has been automatically saved
                          </p>
                        </div>
                      </div>
                      <Link href={`/dashboard/analysis/${savedAnalysisId}`}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className={`rounded-xl border p-6 ${saveError ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {saveError ? (
                          <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
                        ) : null}
                        <div>
                          <p className={`font-medium ${saveError ? 'text-yellow-900' : 'text-slate-900'}`}>
                            {saveError ? 'Save Failed' : 'Save to History'}
                          </p>
                          <p className={`text-sm ${saveError ? 'text-yellow-700' : 'text-slate-500'}`}>
                            {saveError || 'Save this analysis to view it later'}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={handleManualSave}
                        loading={isSaving}
                        variant={saveError ? 'primary' : 'outline'}
                        size="sm"
                      >
                        {isSaving ? 'Saving...' : 'Save to History'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Download Options */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">Export Analysis</p>
                      <p className="text-sm text-slate-500">
                        Download this analysis as a file
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadCSV}
                        icon={<ArrowDownTrayIcon className="h-4 w-4" />}
                      >
                        CSV
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadExcel}
                        icon={<ArrowDownTrayIcon className="h-4 w-4" />}
                      >
                        Excel
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <DocumentMagnifyingGlassIcon className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-600 font-medium">
                  Ready to Analyze
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  Enter clinical notes and click "Analyze Notes" to detect
                  echocardiogram qualification criteria
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
