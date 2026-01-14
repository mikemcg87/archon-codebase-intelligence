/**
 * TanStack Query hooks for Codebase Intelligence feature
 * Follows Archon patterns: query key factory, smart polling, optimistic updates
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { STALE_TIMES, DISABLED_QUERY_KEY } from "@/features/shared/config/queryPatterns";
import { useToast } from "@/features/shared/hooks/useToast";
import { codebaseService } from "../services/codebaseService";
import type { AnalyzeRequest, CodebaseAnalysis } from "../types";

// Query keys factory for better organization and cache management
export const codebaseKeys = {
  all: ["codebase"] as const,
  analyses: () => [...codebaseKeys.all, "analyses"] as const,
  analysis: (id: string) => [...codebaseKeys.all, "analysis", id] as const,
  projectAnalyses: (projectId: string) => [...codebaseKeys.all, "project", projectId] as const,
  latest: (codebasePath: string) => [...codebaseKeys.all, "latest", codebasePath] as const,
};

/**
 * Fetch all analyses for a project
 * Returns list sorted by most recent first
 */
export function useProjectAnalyses(projectId: string | undefined) {
  return useQuery<CodebaseAnalysis[]>({
    queryKey: projectId ? codebaseKeys.projectAnalyses(projectId) : DISABLED_QUERY_KEY,
    queryFn: () =>
      projectId ? codebaseService.getProjectAnalyses(projectId) : Promise.reject("No project ID"),
    enabled: !!projectId,
    staleTime: STALE_TIMES.normal, // 2 minutes (from Archon config)
    gcTime: STALE_TIMES.long, // 30 minutes
  });
}

/**
 * Fetch latest analysis for a codebase path
 * Returns null if no analysis exists yet
 */
export function useLatestAnalysis(codebasePath: string | undefined) {
  return useQuery<CodebaseAnalysis | null>({
    queryKey: codebasePath ? codebaseKeys.latest(codebasePath) : DISABLED_QUERY_KEY,
    queryFn: () =>
      codebasePath ? codebaseService.getLatest(codebasePath) : Promise.reject("No codebase path"),
    enabled: !!codebasePath,
    staleTime: STALE_TIMES.normal,
    gcTime: STALE_TIMES.long,
  });
}

/**
 * Trigger new codebase analysis mutation
 * Invalidates project analyses cache on success
 */
export function useAnalyzeMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation<CodebaseAnalysis, Error, AnalyzeRequest>({
    mutationFn: (params: AnalyzeRequest) => codebaseService.analyze(params),

    onMutate: async (variables) => {
      // Cancel any outgoing refetches for this project
      if (variables.project_id) {
        await queryClient.cancelQueries({
          queryKey: codebaseKeys.projectAnalyses(variables.project_id),
        });
      }
    },

    onError: (error, variables) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Failed to analyze codebase:", error, { variables });

      showToast(`Failed to analyze codebase: ${errorMessage}`, "error");
    },

    onSuccess: (analysis, variables) => {
      // Invalidate project analyses to trigger refetch
      if (variables.project_id) {
        queryClient.invalidateQueries({
          queryKey: codebaseKeys.projectAnalyses(variables.project_id),
        });
      }

      // Update latest analysis cache
      queryClient.setQueryData(codebaseKeys.latest(variables.codebase_path), analysis);

      // Show success toast
      showToast(
        `Analysis complete: ${analysis.total_files} files, ${analysis.total_lines.toLocaleString()} lines`,
        "success"
      );
    },
  });
}
