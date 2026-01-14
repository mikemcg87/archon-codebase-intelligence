/**
 * Analyze Button Component
 * Triggers new codebase analysis with path input
 */

import { useState } from "react";
import { Search, FolderSearch, Loader2 } from "lucide-react";
import { Button } from "@/features/ui/primitives/button";
import { Input } from "@/features/ui/primitives/input";
import { Card } from "@/features/ui/primitives/card";
import { cn } from "@/features/ui/primitives/styles";
import { useAnalyzeMutation } from "../hooks";

interface AnalyzeButtonProps {
  projectId?: string;
  defaultPath?: string;
  onAnalysisComplete?: () => void;
  className?: string;
}

export function AnalyzeButton({
  projectId,
  defaultPath = "",
  onAnalysisComplete,
  className,
}: AnalyzeButtonProps) {
  const [codebasePath, setCodebasePath] = useState(defaultPath);
  const [isExpanded, setIsExpanded] = useState(false);
  const analyzeMutation = useAnalyzeMutation();

  const handleAnalyze = async () => {
    if (!codebasePath.trim()) return;

    try {
      await analyzeMutation.mutateAsync({
        codebase_path: codebasePath.trim(),
        project_id: projectId,
      });
      onAnalysisComplete?.();
      setIsExpanded(false);
    } catch {
      // Error handled by mutation's onError
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && codebasePath.trim()) {
      handleAnalyze();
    }
    if (e.key === "Escape") {
      setIsExpanded(false);
    }
  };

  if (!isExpanded) {
    return (
      <Button
        variant="cyan"
        onClick={() => setIsExpanded(true)}
        className={className}
      >
        <FolderSearch className="w-4 h-4 mr-2" />
        Analyze Codebase
      </Button>
    );
  }

  return (
    <Card blur="lg" transparency="light" className={cn("p-4", className)}>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label htmlFor="codebase-path" className="sr-only">
            Codebase path
          </label>
          <Input
            id="codebase-path"
            type="text"
            placeholder="/path/to/your/codebase"
            value={codebasePath}
            onChange={(e) => setCodebasePath(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="font-mono text-sm"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="cyan"
            onClick={handleAnalyze}
            disabled={!codebasePath.trim() || analyzeMutation.isPending}
          >
            {analyzeMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Analyze
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setIsExpanded(false)}
            disabled={analyzeMutation.isPending}
          >
            Cancel
          </Button>
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Enter the absolute path to your codebase directory
      </p>
    </Card>
  );
}
