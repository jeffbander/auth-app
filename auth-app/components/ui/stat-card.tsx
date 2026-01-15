"use client";

import { clsx } from "clsx";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: React.ReactNode;
  color?: "blue" | "green" | "yellow" | "red" | "purple";
}

const colorClasses = {
  blue: {
    bg: "bg-blue-50",
    icon: "bg-blue-100 text-blue-600",
    value: "text-blue-600",
  },
  green: {
    bg: "bg-green-50",
    icon: "bg-green-100 text-green-600",
    value: "text-green-600",
  },
  yellow: {
    bg: "bg-yellow-50",
    icon: "bg-yellow-100 text-yellow-600",
    value: "text-yellow-600",
  },
  red: {
    bg: "bg-red-50",
    icon: "bg-red-100 text-red-600",
    value: "text-red-600",
  },
  purple: {
    bg: "bg-purple-50",
    icon: "bg-purple-100 text-purple-600",
    value: "text-purple-600",
  },
};

export function StatCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon,
  color = "blue",
}: StatCardProps) {
  const colors = colorClasses[color];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className={clsx("mt-2 text-3xl font-bold", colors.value)}>
            {value}
          </p>
          {change && (
            <p
              className={clsx(
                "mt-1 text-sm",
                changeType === "positive" && "text-green-600",
                changeType === "negative" && "text-red-600",
                changeType === "neutral" && "text-slate-500"
              )}
            >
              {change}
            </p>
          )}
        </div>
        {icon && (
          <div className={clsx("rounded-lg p-3", colors.icon)}>{icon}</div>
        )}
      </div>
    </div>
  );
}
