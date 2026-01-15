"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Header } from "@/components/ui/header";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading";
import {
  ShieldCheckIcon,
  ClockIcon,
  DocumentTextIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

export default function SettingsPage() {
  const settings = useQuery(api.settings.get);
  const upsertSettings = useMutation(api.settings.upsert);

  const [anonymizeExports, setAnonymizeExports] = useState(false);
  const [defaultInsurance, setDefaultInsurance] = useState("");
  const [autoSaveHistory, setAutoSaveHistory] = useState(true);
  const [dataRetentionDays, setDataRetentionDays] = useState(365);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setAnonymizeExports(settings.anonymizeExports);
      setDefaultInsurance(settings.defaultInsurance || "");
      setAutoSaveHistory(settings.autoSaveHistory);
      setDataRetentionDays(settings.dataRetentionDays);
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaved(false);
    try {
      await upsertSettings({
        anonymizeExports,
        defaultInsurance: defaultInsurance || undefined,
        autoSaveHistory,
        dataRetentionDays,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  if (settings === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header
        title="Settings"
        subtitle="Configure application preferences"
      />

      <div className="p-6 max-w-3xl">
        <div className="space-y-6">
          {/* Privacy Settings */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <ShieldCheckIcon className="h-6 w-6 text-blue-600" />
              <h2 className="text-lg font-semibold text-slate-900">
                Privacy & Security
              </h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <label className="font-medium text-slate-900">
                    Anonymize Exports by Default
                  </label>
                  <p className="text-sm text-slate-500">
                    Remove patient names and MRNs from exported files
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={anonymizeExports}
                    onChange={(e) => setAnonymizeExports(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Data Retention */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <ClockIcon className="h-6 w-6 text-blue-600" />
              <h2 className="text-lg font-semibold text-slate-900">
                Data Retention
              </h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <label className="font-medium text-slate-900">
                    Auto-Save Analysis History
                  </label>
                  <p className="text-sm text-slate-500">
                    Automatically save all analyses for future reference
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSaveHistory}
                    onChange={(e) => setAutoSaveHistory(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <div>
                <label className="block font-medium text-slate-900 mb-1">
                  Data Retention Period
                </label>
                <p className="text-sm text-slate-500 mb-2">
                  How long to keep analysis records
                </p>
                <select
                  value={dataRetentionDays}
                  onChange={(e) => setDataRetentionDays(Number(e.target.value))}
                  className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                  <option value={180}>6 months</option>
                  <option value={365}>1 year</option>
                  <option value={730}>2 years</option>
                  <option value={1825}>5 years</option>
                  <option value={3650}>10 years</option>
                </select>
              </div>
            </div>
          </div>

          {/* Defaults */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <DocumentTextIcon className="h-6 w-6 text-blue-600" />
              <h2 className="text-lg font-semibold text-slate-900">
                Default Values
              </h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block font-medium text-slate-900 mb-1">
                  Default Insurance Provider
                </label>
                <p className="text-sm text-slate-500 mb-2">
                  Pre-fill this insurance for new analyses
                </p>
                <input
                  type="text"
                  value={defaultInsurance}
                  onChange={(e) => setDefaultInsurance(e.target.value)}
                  placeholder="Enter default insurance"
                  className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* HIPAA Compliance Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="font-semibold text-blue-900 mb-2">
              HIPAA Compliance Notice
            </h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                All data is processed locally in your browser
              </li>
              <li className="flex items-start gap-2">
                <CheckCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                Database storage is encrypted and access-controlled
              </li>
              <li className="flex items-start gap-2">
                <CheckCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                Exports can be anonymized to remove PHI
              </li>
              <li className="flex items-start gap-2">
                <CheckCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                Data retention policies help meet compliance requirements
              </li>
            </ul>
            <p className="text-sm text-blue-700 mt-4">
              This application is designed to assist with HIPAA-compliant
              workflows. Ensure your organization has appropriate BAAs and
              security measures in place.
            </p>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-4">
            <Button onClick={handleSave} loading={isSaving}>
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
            {saved && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircleIcon className="h-5 w-5" />
                Settings saved
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
