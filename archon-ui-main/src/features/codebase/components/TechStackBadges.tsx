/**
 * Tech Stack Badges Component
 * Displays detected frameworks, databases, and tools as glassmorphic badges
 */

import { cn, glassCard } from "@/features/ui/primitives/styles";
import type { TechStack } from "../types";

interface TechStackBadgesProps {
  techStack: TechStack;
}

type BadgeColor = "cyan" | "purple" | "blue" | "green" | "orange" | "pink";

const techStackColors: Record<string, BadgeColor> = {
  // Frameworks
  FastAPI: "cyan",
  Flask: "green",
  Django: "purple",
  React: "cyan",
  Vue: "green",
  Angular: "pink",
  Express: "green",
  Spring: "green",
  // Databases
  PostgreSQL: "blue",
  MySQL: "blue",
  MongoDB: "green",
  Redis: "orange",
  ChromaDB: "purple",
  SQLite: "blue",
  // Tools
  Docker: "blue",
  pytest: "orange",
  Poetry: "purple",
  uv: "cyan",
  Kubernetes: "blue",
  Git: "orange",
} satisfies Record<string, BadgeColor>;

const categoryColors: Record<keyof TechStack, BadgeColor> = {
  frameworks: "cyan",
  databases: "blue",
  tools: "purple",
};

function getBadgeColor(item: string, category: keyof TechStack): BadgeColor {
  return techStackColors[item] || categoryColors[category];
}

export function TechStackBadges({ techStack }: TechStackBadgesProps) {
  const allItems: Array<{ item: string; category: keyof TechStack }> = [];

  // Flatten all tech stack items with their categories
  (Object.keys(techStack) as Array<keyof TechStack>).forEach((category) => {
    techStack[category].forEach((item) => {
      allItems.push({ item, category });
    });
  });

  if (allItems.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 italic">
        No tech stack detected
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {allItems.map(({ item, category }) => {
        const color = getBadgeColor(item, category);
        const variant = glassCard.variants[color];

        return (
          <div
            key={`${category}-${item}`}
            className={cn(
              "px-3 py-1.5 rounded-full backdrop-blur-md",
              "text-sm font-medium transition-all duration-200",
              "border",
              variant.border,
              variant.glow,
              "hover:scale-105",
              // Text colors based on badge color
              color === "cyan" && "text-cyan-700 dark:text-cyan-300",
              color === "purple" && "text-purple-700 dark:text-purple-300",
              color === "blue" && "text-blue-700 dark:text-blue-300",
              color === "green" && "text-green-700 dark:text-green-300",
              color === "orange" && "text-orange-700 dark:text-orange-300",
              color === "pink" && "text-pink-700 dark:text-pink-300"
            )}
          >
            {item}
          </div>
        );
      })}
    </div>
  );
}
