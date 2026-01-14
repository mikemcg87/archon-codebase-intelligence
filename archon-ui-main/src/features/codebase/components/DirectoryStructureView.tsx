/**
 * Directory Structure Component
 * Displays the codebase directory structure as an interactive tree
 */

import { useState } from "react";
import { Folder, FolderOpen, ChevronRight, ChevronDown, FileCode2 } from "lucide-react";
import { Card } from "@/features/ui/primitives/card";
import { cn } from "@/features/ui/primitives/styles";
import type { DirectoryStructure as DirectoryStructureType } from "../types";

interface DirectoryStructureProps {
  structure: DirectoryStructureType;
}

interface DirectoryItemProps {
  name: string;
  fileCount: number;
  depth: number;
}

function DirectoryItem({ name, fileCount, depth }: DirectoryItemProps) {
  const [isExpanded, setIsExpanded] = useState(depth === 0);

  const toggleExpanded = () => setIsExpanded(!isExpanded);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleExpanded();
    }
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 py-2 px-3 rounded-lg",
          "hover:bg-white/10 dark:hover:bg-white/5",
          "transition-colors duration-200 cursor-pointer",
          "group"
        )}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
        role="button"
        tabIndex={0}
        onClick={toggleExpanded}
        onKeyDown={handleKeyDown}
        aria-expanded={isExpanded}
      >
        <span className="text-gray-400 dark:text-gray-500 transition-transform duration-200">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </span>
        <span className="text-cyan-500 dark:text-cyan-400">
          {isExpanded ? (
            <FolderOpen className="w-4 h-4" />
          ) : (
            <Folder className="w-4 h-4" />
          )}
        </span>
        <span className="font-mono text-sm text-gray-900 dark:text-white">
          {name}
        </span>
        <span className="ml-auto flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <FileCode2 className="w-3 h-3" />
          {fileCount}
        </span>
      </div>
    </div>
  );
}

export function DirectoryStructureView({ structure }: DirectoryStructureProps) {
  const directories = Object.entries(structure).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  if (directories.length === 0) {
    return (
      <Card blur="lg" transparency="light" className="p-6">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <Folder className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No directory structure available</p>
        </div>
      </Card>
    );
  }

  return (
    <Card blur="lg" transparency="light" className="overflow-hidden">
      <div className="p-4 border-b border-white/10 dark:border-white/5">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Directory Structure
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {directories.length} top-level directories
        </p>
      </div>
      <div className="py-2 max-h-80 overflow-y-auto">
        {directories.map(([name, info]) => (
          <DirectoryItem
            key={name}
            name={name}
            fileCount={info.python_file_count}
            depth={0}
          />
        ))}
      </div>
    </Card>
  );
}
