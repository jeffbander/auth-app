"use client";

import { clsx } from "clsx";

interface StatusBadgeProps {
  status: "Qualified" | "Not Qualified" | "Review Needed" | "Insufficient Information" | string;
  size?: "sm" | "md" | "lg";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const statusStyles = {
    Qualified: "bg-green-100 text-green-800 border-green-200",
    "Not Qualified": "bg-red-100 text-red-800 border-red-200",
    "Review Needed": "bg-yellow-100 text-yellow-800 border-yellow-200",
    "Insufficient Information": "bg-slate-100 text-slate-800 border-slate-300",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
    lg: "px-3 py-1.5 text-base",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border font-medium",
        statusStyles[status as keyof typeof statusStyles] ||
          "bg-slate-100 text-slate-800 border-slate-200",
        sizeStyles[size]
      )}
    >
      <span
        className={clsx(
          "mr-1.5 h-1.5 w-1.5 rounded-full",
          status === "Qualified" && "bg-green-500",
          status === "Not Qualified" && "bg-red-500",
          status === "Review Needed" && "bg-yellow-500",
          status === "Insufficient Information" && "bg-slate-500"
        )}
      />
      {status}
    </span>
  );
}

interface ConfidenceBadgeProps {
  level: "High" | "Medium" | "Low" | string;
}

export function ConfidenceBadge({ level }: ConfidenceBadgeProps) {
  const levelStyles = {
    High: "bg-blue-100 text-blue-800",
    Medium: "bg-slate-100 text-slate-800",
    Low: "bg-orange-100 text-orange-800",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium",
        levelStyles[level as keyof typeof levelStyles] || "bg-slate-100 text-slate-800"
      )}
    >
      {level} Confidence
    </span>
  );
}
