/**
 * Entry Points List Component
 * Displays detected entry points (files with main guards) as interactive items
 */

import { ChevronRight, FileCode, Terminal, Webhook } from "lucide-react";
import { Card } from "@/features/ui/primitives/card";
import { cn } from "@/features/ui/primitives/styles";
import type { EntryPoint } from "../types";

interface EntryPointsListProps {
  entryPoints: EntryPoint[];
  onEntryPointClick?: (path: string) => void;
}

function getEntryPointIcon(type: string) {
  switch (type) {
    case "cli_entry":
      return <Terminal className="w-4 h-4" />;
    case "web_entry":
      return <Webhook className="w-4 h-4" />;
    default:
      return <FileCode className="w-4 h-4" />;
  }
}

export function EntryPointsList({ entryPoints, onEntryPointClick }: EntryPointsListProps) {
  if (entryPoints.length === 0) {
    return (
      <Card blur="lg" transparency="light" className="p-6">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <FileCode className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No entry points detected</p>
        </div>
      </Card>
    );
  }

  const handleClick = (path: string) => {
    if (onEntryPointClick) {
      onEntryPointClick(path);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, path: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick(path);
    }
  };

  return (
    <Card blur="lg" transparency="light" className="overflow-hidden">
      <div className="p-4 border-b border-white/10 dark:border-white/5">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Entry Points ({entryPoints.length})
        </h3>
      </div>
      <div className="divide-y divide-white/5 dark:divide-white/5">
        {entryPoints.map((ep) => (
          <div
            key={ep.path}
            className={cn(
              "flex items-center justify-between p-4",
              "backdrop-blur-sm",
              "hover:bg-white/10 dark:hover:bg-white/5",
              "transition-colors duration-200",
              onEntryPointClick && "cursor-pointer"
            )}
            role={onEntryPointClick ? "button" : undefined}
            tabIndex={onEntryPointClick ? 0 : undefined}
            onClick={() => handleClick(ep.path)}
            onKeyDown={(e) => handleKeyDown(e, ep.path)}
            aria-label={onEntryPointClick ? `Open ${ep.path}` : undefined}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex-shrink-0 text-cyan-500 dark:text-cyan-400">
                {getEntryPointIcon(ep.type)}
              </span>
              <div className="min-w-0">
                <p className="font-mono text-sm text-gray-900 dark:text-white truncate">
                  {ep.path}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {ep.description}
                </p>
              </div>
            </div>
            {onEntryPointClick && (
              <ChevronRight
                className="flex-shrink-0 w-4 h-4 text-gray-400 dark:text-gray-500"
                aria-hidden="true"
              />
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
