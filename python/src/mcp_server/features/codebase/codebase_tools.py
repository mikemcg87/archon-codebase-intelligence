"""
MCP tools for codebase intelligence and analysis.

Provides AI assistants with architectural insights about brownfield codebases
to enable better understanding before making changes.
"""

import json
import logging
from urllib.parse import urljoin

import httpx
from mcp.server.fastmcp import Context, FastMCP

from src.mcp_server.utils.error_handling import MCPErrorFormatter
from src.mcp_server.utils.timeout_config import get_default_timeout
from src.server.config.service_discovery import get_api_url

logger = logging.getLogger(__name__)


def register_codebase_tools(mcp: FastMCP):
    """Register codebase intelligence tools with the MCP server."""

    @mcp.tool()
    async def codebase_analyze(
        ctx: Context,
        codebase_path: str,
        project_id: str | None = None,
    ) -> str:
        """
        Analyze a codebase to understand its architecture and structure.

        This tool scans a local codebase and provides:
        - Entry points (main files with if __name__ == '__main__')
        - Tech stack detection (frameworks, databases, tools)
        - Directory structure overview
        - File and line counts
        - Human-readable architecture summary

        Perfect for understanding brownfield projects before making changes.

        Args:
            codebase_path: Absolute filesystem path to codebase root
                          Example: /Users/you/Development/my-project
                          Must be a valid local directory
            project_id: Optional Archon project UUID to associate analysis with
                       Get from find_projects() tool

        Returns:
            JSON with analysis results:
            - success: bool - Operation status
            - analysis: dict - Detailed findings
              - total_files: int - Number of Python files
              - total_lines: int - Total lines of code
              - languages: dict - Language breakdown
              - entry_points: list - Main entry files
              - directory_structure: dict - Top-level organization
              - tech_stack: dict - Detected frameworks/libraries/tools
              - architecture_summary: str - Human-readable overview
            - message: str - Summary message

        Example usage:
            # Analyze a codebase before making changes
            codebase_analyze(codebase_path="/Users/mike/Development/medical-bundle-rag")

            # Associate with existing project
            codebase_analyze(
                codebase_path="/Users/mike/Development/my-app",
                project_id="550e8400-e29b-41d4-a716-446655440000"
            )

        Common use cases:
            - Before refactoring: understand current architecture
            - New team member: get project overview quickly
            - AI context: provide architectural understanding for code generation
            - Documentation: generate architecture docs automatically

        Note: If Archon is running in Docker, it cannot access host filesystem paths.
        Run the backend locally (`uv run python -m src.server.main`) or mount your
        development folder as a Docker volume to use this tool.
        """
        try:
            api_url = get_api_url()
            timeout = get_default_timeout()

            # Extended timeout for codebase analysis (can take time for large projects)
            timeout = httpx.Timeout(120.0, connect=10.0)

            logger.info(f"MCP: Analyzing codebase at {codebase_path}")

            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(
                    urljoin(api_url, "/api/codebase/analyze"),
                    json={"codebase_path": codebase_path, "project_id": project_id},
                )

                if response.status_code == 200:
                    result = response.json()
                    logger.info(
                        f"MCP: Analysis complete - {result.get('message', 'success')}"
                    )
                    return json.dumps(result, indent=2)

                elif response.status_code == 400:
                    # Client error - likely invalid path
                    error_detail = response.json().get("detail", response.text)
                    logger.warning(f"MCP: Invalid request - {error_detail}")
                    return json.dumps(
                        {
                            "success": False,
                            "error": error_detail,
                            "hint": "Ensure codebase_path is an absolute path to an existing directory",
                        },
                        indent=2,
                    )

                else:
                    error_detail = response.text
                    logger.error(
                        f"MCP: Analysis failed with status {response.status_code}"
                    )
                    return json.dumps(
                        {
                            "success": False,
                            "error": f"HTTP {response.status_code}: {error_detail}",
                        },
                        indent=2,
                    )

        except httpx.TimeoutException:
            logger.error("MCP: Analysis timeout - codebase may be too large")
            return json.dumps(
                {
                    "success": False,
                    "error": "Analysis timeout - codebase may be too large or complex",
                    "hint": "Try analyzing a subdirectory instead of the entire project",
                },
                indent=2,
            )

        except Exception as e:
            logger.error(f"MCP: Error analyzing codebase: {e}")
            return MCPErrorFormatter.format_error(
                operation="codebase_analyze",
                error=e,
                context={"codebase_path": codebase_path, "project_id": project_id},
            )

    @mcp.tool()
    async def codebase_get_project_analyses(
        ctx: Context,
        project_id: str,
    ) -> str:
        """
        Get all previous codebase analyses for a project.

        Useful for:
        - Tracking how a codebase has evolved over time
        - Comparing current vs previous architecture
        - Finding when specific changes occurred

        Args:
            project_id: Archon project UUID

        Returns:
            JSON with list of analyses:
            - success: bool - Operation status
            - analyses: list[dict] - All analyses, newest first
            - count: int - Number of analyses found

        Example usage:
            # Get analysis history for a project
            codebase_get_project_analyses(project_id="550e8400-e29b-41d4-a716-446655440000")
        """
        try:
            api_url = get_api_url()
            timeout = get_default_timeout()

            logger.debug(f"MCP: Fetching analyses for project {project_id}")

            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.get(
                    urljoin(api_url, f"/api/codebase/analyses/project/{project_id}")
                )

                if response.status_code == 200:
                    return json.dumps(response.json(), indent=2)

                else:
                    error_detail = response.text
                    logger.error(
                        f"MCP: Failed to fetch analyses - HTTP {response.status_code}"
                    )
                    return json.dumps(
                        {
                            "success": False,
                            "error": f"HTTP {response.status_code}: {error_detail}",
                        },
                        indent=2,
                    )

        except Exception as e:
            logger.error(f"MCP: Error fetching project analyses: {e}")
            return MCPErrorFormatter.format_error(
                operation="codebase_get_project_analyses",
                error=e,
                context={"project_id": project_id},
            )

    @mcp.tool()
    async def codebase_get_latest(
        ctx: Context,
        codebase_path: str,
    ) -> str:
        """
        Get the most recent analysis for a specific codebase path.

        Use this to check if a codebase has been analyzed recently
        without triggering a new (potentially slow) analysis.

        Args:
            codebase_path: Absolute filesystem path to codebase root

        Returns:
            JSON with latest analysis or error if not found:
            - success: bool - Operation status
            - analysis: dict - Latest analysis (if found)
            - message: str - Status message

        Example usage:
            # Check if we have recent analysis before analyzing again
            result = codebase_get_latest(codebase_path="/Users/mike/Development/my-app")

            # If no analysis found, then run:
            # codebase_analyze(codebase_path="/Users/mike/Development/my-app")
        """
        try:
            api_url = get_api_url()
            timeout = get_default_timeout()

            logger.debug(f"MCP: Fetching latest analysis for {codebase_path}")

            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.get(
                    urljoin(api_url, "/api/codebase/analyses/latest"),
                    params={"codebase_path": codebase_path},
                )

                if response.status_code == 200:
                    return json.dumps(response.json(), indent=2)

                elif response.status_code == 404:
                    logger.info(f"MCP: No analysis found for {codebase_path}")
                    return json.dumps(
                        {
                            "success": False,
                            "error": "No analysis found for this codebase path",
                            "hint": "Use codebase_analyze() to create a new analysis",
                        },
                        indent=2,
                    )

                else:
                    error_detail = response.text
                    logger.error(
                        f"MCP: Failed to fetch latest analysis - HTTP {response.status_code}"
                    )
                    return json.dumps(
                        {
                            "success": False,
                            "error": f"HTTP {response.status_code}: {error_detail}",
                        },
                        indent=2,
                    )

        except Exception as e:
            logger.error(f"MCP: Error fetching latest analysis: {e}")
            return MCPErrorFormatter.format_error(
                operation="codebase_get_latest",
                error=e,
                context={"codebase_path": codebase_path},
            )
