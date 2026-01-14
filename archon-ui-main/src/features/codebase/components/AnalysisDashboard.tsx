/**
 * Analysis Dashboard Component
 * Main dashboard displaying codebase analysis results
 * Assembles all sub-components in a cohesive layout
 */

import { Clock, FolderCode } from "lucide-react";
import { Card } from "@/features/ui/primitives/card";
import { cn } from "@/features/ui/primitives/styles";
import { OverviewCards } from "./OverviewCards";
import { TechStackBadges } from "./TechStackBadges";
import { EntryPointsList } from "./EntryPointsList";
import { DirectoryStructureView } from "./DirectoryStructureView";
import type { CodebaseAnalysis } from "../types";

interface AnalysisDashboardProps {
  analysis: CodebaseAnalysis;
  onEntryPointClick?: (path: string) => void;
}

export function AnalysisDashboard({ analysis, onEntryPointClick }: AnalysisDashboardProps) {
  const analysisDate = new Date(analysis.analysis_timestamp);
  const formattedDate = analysisDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-6">
      {/* Header with path and timestamp */}
      <Card blur="lg" transparency="light" className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FolderCode className="w-5 h-5 flex-shrink-0 text-cyan-500 dark:text-cyan-400" />
            <span className="font-mono text-sm text-gray-700 dark:text-gray-300 truncate">
              {analysis.codebase_path}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>{formattedDate}</span>
          </div>
        </div>
      </Card>

      {/* Overview metrics cards */}
      <OverviewCards analysis={analysis} />

      {/* Architecture summary */}
      {analysis.architecture_summary && (
        <Card blur="lg" transparency="light" className="p-4">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Architecture Summary
          </h3>
          <p className="text-gray-900 dark:text-white">
            {analysis.architecture_summary}
          </p>
        </Card>
      )}

      {/* Tech stack badges */}
      <Card blur="lg" transparency="light" className="p-4">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
          Tech Stack
        </h3>
        <TechStackBadges techStack={analysis.tech_stack} />
      </Card>

      {/* Two-column layout for entry points and directory structure */}
      <div className={cn("grid gap-6", "grid-cols-1 lg:grid-cols-2")}>
        <EntryPointsList
          entryPoints={analysis.entry_points}
          onEntryPointClick={onEntryPointClick}
        />
        <DirectoryStructureView structure={analysis.directory_structure} />
      </div>
    </div>
  );
}
