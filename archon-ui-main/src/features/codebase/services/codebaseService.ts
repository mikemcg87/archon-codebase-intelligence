/**
 * API service for Codebase Intelligence feature
 * Handles all HTTP calls to /api/codebase/* endpoints
 */

import { callAPIWithETag } from "@/features/shared/api/apiClient";
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  CodebaseAnalysis,
  LatestAnalysisResponse,
  ProjectAnalysesResponse,
} from "../types";

export const codebaseService = {
  /**
   * Trigger new codebase analysis
   * POST /api/codebase/analyze
   */
  async analyze(params: AnalyzeRequest): Promise<CodebaseAnalysis> {
    const response = await callAPIWithETag<AnalyzeResponse>("/api/codebase/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!response.success) {
      throw new Error(response.message || "Failed to analyze codebase");
    }

    return response.analysis;
  },

  /**
   * Get all analyses for a project
   * GET /api/codebase/analyses/project/{project_id}
   */
  async getProjectAnalyses(projectId: string): Promise<CodebaseAnalysis[]> {
    const response = await callAPIWithETag<ProjectAnalysesResponse>(
      `/api/codebase/analyses/project/${projectId}`
    );

    if (!response.success) {
      throw new Error("Failed to fetch project analyses");
    }

    return response.analyses;
  },

  /**
   * Get latest analysis for a codebase path
   * GET /api/codebase/analyses/latest?codebase_path=...
   */
  async getLatest(codebasePath: string): Promise<CodebaseAnalysis | null> {
    const params = new URLSearchParams({ codebase_path: codebasePath });
    const response = await callAPIWithETag<LatestAnalysisResponse>(
      `/api/codebase/analyses/latest?${params}`
    );

    if (!response.success) {
      // 404 is expected when no analysis exists yet
      return null;
    }

    return response.analysis;
  },
};
