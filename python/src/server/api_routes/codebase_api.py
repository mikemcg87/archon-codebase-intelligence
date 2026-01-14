"""
API routes for codebase intelligence and analysis.
"""

import logfire
from fastapi import APIRouter, Depends, HTTPException, Response, Header
from pydantic import BaseModel, Field

from ..utils import get_supabase_client
from ..services.codebase_service import get_codebase_service
from ..utils.etag_utils import generate_etag, check_etag


# Request models
class AnalyzeCodebaseRequest(BaseModel):
    """Request to analyze a codebase."""

    codebase_path: str = Field(
        ...,
        description="Absolute filesystem path to codebase root directory",
        example="/Users/yourname/projects/my-app",
    )
    project_id: str | None = Field(
        None,
        description="Optional Archon project UUID to associate with this analysis",
    )


# Response models
class CodebaseAnalysisResponse(BaseModel):
    """Response containing codebase analysis results."""

    success: bool
    analysis: dict
    message: str | None = None


class ProjectAnalysesResponse(BaseModel):
    """Response containing all analyses for a project."""

    success: bool
    analyses: list[dict]
    count: int


# Create router
router = APIRouter(prefix="/api/codebase", tags=["codebase"])


@router.post("/analyze", response_model=CodebaseAnalysisResponse)
async def analyze_codebase(
    request: AnalyzeCodebaseRequest,
    supabase=Depends(get_supabase_client),
):
    """
    Analyze a codebase and return structured architectural insights.

    This endpoint:
    - Scans the specified directory for Python files
    - Identifies entry points, tech stack, and directory structure
    - Stores results in Supabase for later retrieval
    - Returns comprehensive analysis for AI assistant context

    Args:
        request: Analysis request with codebase path and optional project ID

    Returns:
        Analysis results including entry points, tech stack, file counts, etc.

    Raises:
        HTTPException: If path doesn't exist or analysis fails
    """
    try:
        service = get_codebase_service(supabase)

        logfire.info(
            f"API: Analyzing codebase at {request.codebase_path}",
            project_id=request.project_id,
        )

        result = await service.analyze_codebase(
            request.codebase_path, request.project_id
        )

        return {
            "success": True,
            "analysis": result,
            "message": f"Analyzed {result.get('total_files', 0)} files",
        }

    except ValueError as e:
        # Client error - invalid path
        logfire.warning(f"Invalid codebase path: {e}")
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        # Server error
        logfire.error(f"Error analyzing codebase: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to analyze codebase: {str(e)}"
        )


@router.get("/analyses/project/{project_id}", response_model=ProjectAnalysesResponse)
async def get_project_analyses(
    project_id: str,
    response: Response,
    if_none_match: str | None = Header(None),
    supabase=Depends(get_supabase_client),
):
    """
    Get all codebase analyses for a specific project.

    Results are ordered by most recent first. Supports ETag caching
    to reduce unnecessary data transfer.

    Args:
        project_id: Archon project UUID
        if_none_match: ETag from previous request (optional)

    Returns:
        List of analyses with metadata

    Raises:
        HTTPException: If project not found or query fails
    """
    try:
        service = get_codebase_service(supabase)

        logfire.debug(f"API: Fetching analyses for project {project_id}")

        analyses = await service.get_project_analyses(project_id)

        # Generate ETag for caching
        response_data = {"success": True, "analyses": analyses, "count": len(analyses)}

        etag = generate_etag(response_data)

        # Check if client has current data
        if check_etag(if_none_match, etag):
            logfire.debug("ETag match - returning 304")
            response.status_code = 304
            return Response(status_code=304)

        # Set ETag header
        response.headers["ETag"] = etag

        return response_data

    except Exception as e:
        logfire.error(f"Error fetching project analyses: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch analyses: {str(e)}"
        )


@router.get("/analyses/latest", response_model=CodebaseAnalysisResponse)
async def get_latest_analysis(
    codebase_path: str,
    response: Response,
    if_none_match: str | None = Header(None),
    supabase=Depends(get_supabase_client),
):
    """
    Get the most recent analysis for a specific codebase path.

    Useful for checking if a path has been analyzed recently
    without triggering a new analysis.

    Args:
        codebase_path: Absolute filesystem path
        if_none_match: ETag from previous request (optional)

    Returns:
        Latest analysis or 404 if not found

    Raises:
        HTTPException: If path invalid or query fails
    """
    try:
        service = get_codebase_service(supabase)

        logfire.debug(f"API: Fetching latest analysis for {codebase_path}")

        analysis = await service.get_latest_analysis(codebase_path)

        if not analysis:
            raise HTTPException(
                status_code=404,
                detail=f"No analysis found for path: {codebase_path}",
            )

        response_data = {
            "success": True,
            "analysis": analysis,
            "message": "Latest analysis retrieved",
        }

        # Generate ETag
        etag = generate_etag(response_data)

        if check_etag(if_none_match, etag):
            response.status_code = 304
            return Response(status_code=304)

        response.headers["ETag"] = etag

        return response_data

    except HTTPException:
        raise
    except Exception as e:
        logfire.error(f"Error fetching latest analysis: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch analysis: {str(e)}"
        )
