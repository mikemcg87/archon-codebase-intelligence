/**
 * TypeScript types for Codebase Intelligence feature
 * Matches backend API responses from /api/codebase/*
 */

export interface CodebaseAnalysis {
  id: string;
  project_id: string | null;
  codebase_path: string;
  analysis_timestamp: string;
  total_files: number;
  total_lines: number;
  languages: Record<string, number>;
  entry_points: EntryPoint[];
  directory_structure: DirectoryStructure;
  tech_stack: TechStack;
  architecture_summary: string;
  created_at: string;
  updated_at: string;
}

export interface EntryPoint {
  path: string;
  type: string;
  description: string;
}

export interface DirectoryStructure {
  [key: string]: DirectoryNode;
}

export interface DirectoryNode {
  type: "directory";
  python_file_count: number;
}

export interface TechStack {
  frameworks: string[];
  databases: string[];
  tools: string[];
}

export interface AnalyzeRequest {
  codebase_path: string;
  project_id?: string | null;
}

export interface AnalyzeResponse {
  success: boolean;
  analysis: CodebaseAnalysis;
  message: string;
}

export interface ProjectAnalysesResponse {
  success: boolean;
  analyses: CodebaseAnalysis[];
  count: number;
}

export interface LatestAnalysisResponse {
  success: boolean;
  analysis: CodebaseAnalysis | null;
  message: string;
}

// UI-specific types

export interface AnalysisMetric {
  label: string;
  value: string | number;
  icon?: React.ComponentType;
  color?: "cyan" | "purple" | "blue" | "green" | "orange" | "pink";
}

export interface TreeData {
  name: string;
  attributes?: {
    file_count: number;
    type: string;
  };
  children?: TreeData[];
}

export interface TimelineDataPoint {
  date: string;
  files: number;
  lines: number;
  label: string;
}
