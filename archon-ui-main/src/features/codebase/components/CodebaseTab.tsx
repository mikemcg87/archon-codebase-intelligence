/**
 * Codebase Tab Component
 * Tab content for codebase intelligence within the Projects view
 * Handles analysis selection and empty states
 */

import { useState } from "react";
import { Code2, FolderSearch, Loader2, RefreshCw } from "lucide-react";
import { Card } from "@/features/ui/primitives/card";
import { Button } from "@/features/ui/primitives/button";
import { cn } from "@/features/ui/primitives/styles";
import { useProjectAnalyses } from "../hooks";
import { AnalysisDashboard } from "./AnalysisDashboard";
import { AnalyzeButton } from "./AnalyzeButton";
import type { CodebaseAnalysis } from "../types";

interface CodebaseTabProps {
  projectId: string;
}

interface AnalysisSelectorProps {
  analyses: CodebaseAnalysis[];
  selectedId: string | null;
  onChange: (id: string | null) => void;
}

function AnalysisSelector({ analyses, selectedId, onChange }: AnalysisSelectorProps) {
  if (analyses.length <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="analysis-select" className="text-sm text-gray-600 dark:text-gray-400">
        Analysis:
      </label>
      <select
        id="analysis-select"
        value={selectedId || analyses[0]?.id || ""}
        onChange={(e) => onChange(e.target.value || null)}
        className={cn(
          "px-3 py-1.5 rounded-lg text-sm font-mono",
          "bg-white/10 dark:bg-white/5",
          "border border-white/20 dark:border-white/10",
          "text-gray-900 dark:text-white",
          "focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
        )}
      >
        {analyses.map((analysis) => {
          const date = new Date(analysis.analysis_timestamp);
          const label = date.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          });
          return (
            <option key={analysis.id} value={analysis.id}>
              {label} ({analysis.total_files} files)
            </option>
          );
        })}
      </select>
    </div>
  );
}

function EmptyState({ projectId }: { projectId: string }) {
  return (
    <Card blur="lg" transparency="light" className="p-12">
      <div className="text-center max-w-md mx-auto">
        <Code2 className="w-16 h-16 mx-auto mb-4 text-cyan-500/50 dark:text-cyan-400/50" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No codebase analyses yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Analyze your project's codebase to understand its architecture, detect frameworks, and identify entry points.
        </p>
        <AnalyzeButton projectId={projectId} />
      </div>
    </Card>
  );
}

function LoadingState() {
  return (
    <Card blur="lg" transparency="light" className="p-12">
      <div className="text-center">
        <Loader2 className="w-8 h-8 mx-auto mb-4 text-cyan-500 animate-spin" />
        <p className="text-gray-600 dark:text-gray-400">Loading analyses...</p>
      </div>
    </Card>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card blur="lg" transparency="light" className="p-12">
      <div className="text-center max-w-md mx-auto">
        <FolderSearch className="w-16 h-16 mx-auto mb-4 text-orange-500/50" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Failed to load analyses
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          There was an error loading the codebase analyses. Please try again.
        </p>
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    </Card>
  );
}

export function CodebaseTab({ projectId }: CodebaseTabProps) {
  const { data: analyses, isLoading, isError, refetch } = useProjectAnalyses(projectId);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  if (!analyses || analyses.length === 0) {
    return <EmptyState projectId={projectId} />;
  }

  const latestAnalysis = analyses[0];
  const displayAnalysis = selectedAnalysisId
    ? analyses.find((a) => a.id === selectedAnalysisId)
    : latestAnalysis;

  if (!displayAnalysis) {
    return <EmptyState projectId={projectId} />;
  }

  return (
    <div className="space-y-6">
      {/* Header with selector and analyze button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <AnalysisSelector
          analyses={analyses}
          selectedId={selectedAnalysisId}
          onChange={setSelectedAnalysisId}
        />
        <AnalyzeButton
          projectId={projectId}
          defaultPath={displayAnalysis.codebase_path}
          onAnalysisComplete={() => setSelectedAnalysisId(null)}
        />
      </div>

      {/* Main dashboard */}
      <AnalysisDashboard analysis={displayAnalysis} />
    </div>
  );
}
