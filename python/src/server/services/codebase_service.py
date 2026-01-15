"""
Codebase intelligence service for analyzing project structures.

Provides architectural insights to help AI assistants understand
brownfield codebases before making modifications.
"""

import os
from datetime import datetime
from pathlib import Path
from typing import Any

import logfire
from supabase import Client


class CodebaseService:
    """Service for analyzing codebases and providing architectural insights."""

    def _is_running_in_docker(self) -> bool:
        """
        Detect if running inside a Docker container.

        Uses standard Docker detection methods:
        - /.dockerenv file exists (Docker standard marker)
        - DOCKER_CONTAINER environment variable set
        """
        return os.path.exists("/.dockerenv") or os.getenv("DOCKER_CONTAINER") is not None

    def __init__(self, supabase_client: Client):
        """
        Initialize the codebase service.

        Args:
            supabase_client: Authenticated Supabase client
        """
        self.supabase = supabase_client

    async def analyze_codebase(
        self, codebase_path: str, project_id: str | None = None
    ) -> dict[str, Any]:
        """
        Analyze a codebase and return structured insights.

        Args:
            codebase_path: Absolute path to codebase root
            project_id: Optional Archon project UUID to associate with

        Returns:
            Dict with analysis results including entry points, tech stack, structure

        Raises:
            ValueError: If path does not exist or is not a directory
        """
        logfire.info(f"Starting codebase analysis for: {codebase_path}")

        path = Path(codebase_path).resolve()

        if not path.exists():
            if self._is_running_in_docker():
                raise ValueError(
                    f"Path not accessible from Docker container: {codebase_path}. "
                    "The Archon backend is running in Docker and cannot access host filesystem paths directly. "
                    "Solutions: (1) Use the mounted path instead: /host-filesystem/... "
                    f"(e.g., /host-filesystem{codebase_path.replace('/Users', '')}), or "
                    "(2) Run backend locally with `uv run python -m src.server.main`."
                )
            raise ValueError(f"Path does not exist: {codebase_path}")

        if not path.is_dir():
            raise ValueError(f"Path is not a directory: {codebase_path}")

        try:
            # Initialize analysis result
            analysis = {
                "codebase_path": str(path),
                "project_id": project_id,
                "analysis_timestamp": datetime.now().isoformat(),
                "total_files": 0,
                "total_lines": 0,
                "languages": {},
                "entry_points": [],
                "directory_structure": {},
                "tech_stack": {},
                "architecture_summary": "",
            }

            # Analyze file structure
            python_files = self._find_python_files(path)
            analysis["total_files"] = len(python_files)
            analysis["languages"]["Python"] = len(python_files)

            logfire.debug(f"Found {len(python_files)} Python files")

            # Count total lines
            analysis["total_lines"] = self._count_lines(python_files)

            # Find entry points
            analysis["entry_points"] = self._find_entry_points(python_files, path)
            logfire.debug(f"Found {len(analysis['entry_points'])} entry points")

            # Analyze directory structure
            analysis["directory_structure"] = self._analyze_structure(path)

            # Detect tech stack
            analysis["tech_stack"] = self._detect_tech_stack(path)

            # Generate human-readable summary
            analysis["architecture_summary"] = self._generate_summary(analysis)

            # Store in Supabase
            result = self.supabase.table("codebase_analyses").insert(analysis).execute()

            if result.data:
                logfire.info(
                    f"Codebase analysis complete and stored with ID: {result.data[0]['id']}"
                )
                return result.data[0]
            else:
                logfire.warning("Analysis completed but not stored in database")
                return analysis

        except Exception as e:
            logfire.error(f"Error analyzing codebase: {e}")
            raise

    async def get_project_analyses(self, project_id: str) -> list[dict[str, Any]]:
        """
        Get all analyses for a specific project.

        Args:
            project_id: Archon project UUID

        Returns:
            List of analysis dictionaries, ordered by most recent first
        """
        try:
            result = (
                self.supabase.table("codebase_analyses")
                .select("*")
                .eq("project_id", project_id)
                .order("analysis_timestamp", desc=True)
                .execute()
            )

            return result.data if result.data else []

        except Exception as e:
            logfire.error(f"Error fetching project analyses: {e}")
            raise

    async def get_latest_analysis(
        self, codebase_path: str
    ) -> dict[str, Any] | None:
        """
        Get the most recent analysis for a codebase path.

        Args:
            codebase_path: Absolute filesystem path

        Returns:
            Latest analysis dict or None if not found
        """
        try:
            result = (
                self.supabase.table("codebase_analyses")
                .select("*")
                .eq("codebase_path", codebase_path)
                .order("analysis_timestamp", desc=True)
                .limit(1)
                .execute()
            )

            if result.data:
                return result.data[0]
            return None

        except Exception as e:
            logfire.error(f"Error fetching latest analysis: {e}")
            return None

    def _find_python_files(self, path: Path) -> list[Path]:
        """
        Find all Python files in the codebase, excluding common ignore patterns.

        Args:
            path: Root directory to search

        Returns:
            List of Python file paths
        """
        ignore_patterns = {
            ".venv",
            "venv",
            "env",
            "__pycache__",
            ".git",
            "node_modules",
            ".pytest_cache",
            ".mypy_cache",
            "dist",
            "build",
            ".tox",
        }

        python_files = []

        for py_file in path.rglob("*.py"):
            # Check if any parent directory should be ignored
            if any(pattern in py_file.parts for pattern in ignore_patterns):
                continue
            python_files.append(py_file)

        return python_files

    def _count_lines(self, python_files: list[Path]) -> int:
        """
        Count total lines of code across all Python files.

        Args:
            python_files: List of Python file paths

        Returns:
            Total line count
        """
        total_lines = 0

        for py_file in python_files:
            try:
                total_lines += len(py_file.read_text(encoding="utf-8").splitlines())
            except Exception as e:
                logfire.debug(f"Could not read {py_file}: {e}")
                continue

        return total_lines

    def _find_entry_points(
        self, python_files: list[Path], root_path: Path
    ) -> list[dict[str, str]]:
        """
        Find main entry points (files with if __name__ == '__main__').

        Args:
            python_files: List of Python file paths
            root_path: Root directory for relative path calculation

        Returns:
            List of entry point dictionaries with path and type
        """
        entry_points = []

        for py_file in python_files:
            try:
                content = py_file.read_text(encoding="utf-8")

                # Check for main guard
                if (
                    'if __name__ == "__main__"' in content
                    or "if __name__ == '__main__'" in content
                ):
                    relative_path = py_file.relative_to(root_path)

                    entry_points.append(
                        {
                            "path": str(relative_path),
                            "type": "cli_entry",
                            "description": f"Entry point in {relative_path.name}",
                        }
                    )

            except Exception as e:
                logfire.debug(f"Could not analyze {py_file} for entry points: {e}")
                continue

        return entry_points

    def _analyze_structure(self, path: Path) -> dict[str, Any]:
        """
        Analyze top-level directory structure.

        Args:
            path: Root directory

        Returns:
            Dictionary mapping directory names to metadata
        """
        structure = {}

        try:
            for item in path.iterdir():
                if item.is_dir() and not item.name.startswith("."):
                    # Count Python files in this directory
                    py_files = list(item.rglob("*.py"))

                    structure[item.name] = {
                        "type": "directory",
                        "python_file_count": len(py_files),
                    }

        except Exception as e:
            logfire.error(f"Error analyzing directory structure: {e}")

        return structure

    def _detect_tech_stack(self, path: Path) -> dict[str, list[str]]:
        """
        Detect frameworks, libraries, and tools from common config files.

        Args:
            path: Root directory

        Returns:
            Dictionary with categorized tech stack items
        """
        tech_stack = {"frameworks": [], "databases": [], "tools": []}

        # Check requirements.txt
        req_file = path / "requirements.txt"
        if req_file.exists():
            try:
                content = req_file.read_text(encoding="utf-8").lower()

                # Frameworks
                if "fastapi" in content:
                    tech_stack["frameworks"].append("FastAPI")
                if "flask" in content:
                    tech_stack["frameworks"].append("Flask")
                if "django" in content:
                    tech_stack["frameworks"].append("Django")

                # Databases
                if "postgresql" in content or "psycopg" in content:
                    tech_stack["databases"].append("PostgreSQL")
                if "chromadb" in content:
                    tech_stack["databases"].append("ChromaDB")
                if "sqlite" in content:
                    tech_stack["databases"].append("SQLite")

                # Tools
                if "pytest" in content:
                    tech_stack["tools"].append("pytest")

            except Exception as e:
                logfire.debug(f"Could not read requirements.txt: {e}")

        # Check pyproject.toml
        pyproject = path / "pyproject.toml"
        if pyproject.exists():
            try:
                content = pyproject.read_text(encoding="utf-8").lower()

                if "poetry" in content:
                    tech_stack["tools"].append("Poetry")
                if "uv" in content:
                    tech_stack["tools"].append("uv")

            except Exception as e:
                logfire.debug(f"Could not read pyproject.toml: {e}")

        # Check for Docker
        if (path / "Dockerfile").exists() or (path / "docker-compose.yml").exists():
            tech_stack["tools"].append("Docker")

        return tech_stack

    def _generate_summary(self, analysis: dict[str, Any]) -> str:
        """
        Generate human-readable architecture summary.

        Args:
            analysis: Analysis dictionary with all findings

        Returns:
            Human-readable summary string
        """
        summary_parts = []

        # Basic stats
        summary_parts.append(
            f"Python project with {analysis['total_files']} files "
            f"({analysis['total_lines']:,} lines of code)"
        )

        # Tech stack
        tech = analysis["tech_stack"]
        if tech.get("frameworks"):
            frameworks = ", ".join(tech["frameworks"])
            summary_parts.append(f"Uses {frameworks} framework")

        if tech.get("databases"):
            databases = ", ".join(tech["databases"])
            summary_parts.append(f"Databases: {databases}")

        # Entry points
        if analysis["entry_points"]:
            count = len(analysis["entry_points"])
            summary_parts.append(f"Found {count} entry point(s)")

        # Directory structure
        if analysis["directory_structure"]:
            dir_count = len(analysis["directory_structure"])
            summary_parts.append(f"{dir_count} top-level directories")

        return ". ".join(summary_parts) + "."


# Export singleton instance factory
def get_codebase_service(supabase_client: Client) -> CodebaseService:
    """
    Factory function to create CodebaseService instance.

    Args:
        supabase_client: Authenticated Supabase client

    Returns:
        CodebaseService instance
    """
    return CodebaseService(supabase_client)
