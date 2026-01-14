/**
 * Overview Cards Component
 * Displays codebase analysis metrics in glassmorphic cards
 */

import { FileCode2, Code2, Languages, GitFork } from "lucide-react";
import { DataCard, DataCardHeader, DataCardContent } from "@/features/ui/primitives/data-card";
import { cn } from "@/features/ui/primitives/styles";
import type { CodebaseAnalysis } from "../types";

interface OverviewCardsProps {
  analysis: CodebaseAnalysis;
}

interface MetricCardData {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  edgeColor: "cyan" | "purple" | "blue" | "green";
}

export function OverviewCards({ analysis }: OverviewCardsProps) {
  const languageCount = Object.keys(analysis.languages).length;
  const primaryLanguage = Object.entries(analysis.languages)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || "Unknown";

  const metrics: MetricCardData[] = [
    {
      label: "Total Files",
      value: analysis.total_files.toLocaleString(),
      icon: <FileCode2 className="w-5 h-5" />,
      edgeColor: "cyan",
    },
    {
      label: "Lines of Code",
      value: analysis.total_lines.toLocaleString(),
      icon: <Code2 className="w-5 h-5" />,
      edgeColor: "purple",
    },
    {
      label: languageCount > 1 ? "Languages" : "Language",
      value: languageCount > 1 ? languageCount : primaryLanguage,
      icon: <Languages className="w-5 h-5" />,
      edgeColor: "blue",
    },
    {
      label: "Entry Points",
      value: analysis.entry_points.length,
      icon: <GitFork className="w-5 h-5" />,
      edgeColor: "green",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <DataCard
          key={metric.label}
          blur="lg"
          transparency="light"
          edgePosition="top"
          edgeColor={metric.edgeColor}
        >
          <DataCardHeader>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-gray-500 dark:text-gray-400",
                  metric.edgeColor === "cyan" && "text-cyan-500 dark:text-cyan-400",
                  metric.edgeColor === "purple" && "text-purple-500 dark:text-purple-400",
                  metric.edgeColor === "blue" && "text-blue-500 dark:text-blue-400",
                  metric.edgeColor === "green" && "text-green-500 dark:text-green-400"
                )}
              >
                {metric.icon}
              </span>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {metric.label}
              </h3>
            </div>
          </DataCardHeader>
          <DataCardContent>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {metric.value}
            </p>
          </DataCardContent>
        </DataCard>
      ))}
    </div>
  );
}
