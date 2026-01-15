# Codebase Intelligence

Analyze local codebases to understand architecture before making changes.

## Purpose

The Codebase Intelligence feature helps AI assistants and developers understand brownfield projects by providing:

- Entry points (main files with `if __name__ == '__main__'`)
- Tech stack detection (frameworks, databases, tools)
- Directory structure overview
- File and line counts
- Human-readable architecture summary

## Usage

### Via UI (Projects Page)

1. Navigate to Projects → Select a Project → Codebase tab
2. Click "Analyze Codebase"
3. Enter the absolute path to your codebase (e.g., `/Users/you/Development/my-app`)
4. View the analysis dashboard

### Via MCP Tools

```python
# Analyze a codebase
codebase_analyze(codebase_path="/Users/you/Development/my-app")

# Associate with a project
codebase_analyze(
    codebase_path="/Users/you/Development/my-app",
    project_id="550e8400-e29b-41d4-a716-446655440000"
)

# Get previous analyses for a project
codebase_get_project_analyses(project_id="...")

# Check if analysis exists without triggering new one
codebase_get_latest(codebase_path="/Users/you/Development/my-app")
```

## Docker vs Local Deployment

### Important: Filesystem Access

The codebase intelligence feature requires access to local filesystem paths. This has implications depending on how you run Archon:

| Deployment Mode | Filesystem Access | Recommendation |
|-----------------|-------------------|----------------|
| **Backend Local** | Full access to host filesystem | Works out of the box |
| **Backend Docker** | No access to host paths | Run backend locally or mount volumes |

### Running Backend Locally (Recommended for this feature)

```bash
# Stop Docker backend
docker compose down

# Run backend locally
cd python
uv run python -m src.server.main

# In another terminal, run frontend
cd archon-ui-main
npm run dev
```

### Docker with Volume Mount (Default)

The `docker-compose.yml` now includes a volume mount for host filesystem access:

```yaml
volumes:
  - ${CODEBASE_HOST_PATH:-/Users}:/host-filesystem:ro
```

**To use codebase intelligence in Docker:**

1. Restart Docker to pick up the volume mount:
   ```bash
   docker compose down && docker compose up -d
   ```

2. Use paths prefixed with `/host-filesystem/`:
   ```
   /host-filesystem/michaelmcglade/Development/my-project
   ```

**Customizing the mount path:**

Add to your `.env` file:
```bash
CODEBASE_HOST_PATH=/home/youruser  # Linux
CODEBASE_HOST_PATH=/Users          # macOS (default)
```

### Error Messages

When running in Docker without proper volume mounts, you'll see:

```
Path not accessible from Docker container: /Users/you/Development/my-app.
The Archon backend is running in Docker and cannot access host filesystem paths.
Solutions: (1) Run backend locally with `uv run python -m src.server.main`, or
(2) Mount your development folder as a Docker volume in docker-compose.yml.
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/codebase/analyze` | POST | Trigger new analysis |
| `/api/codebase/analyses/project/{project_id}` | GET | Get all analyses for a project |
| `/api/codebase/analyses/latest` | GET | Get latest analysis for a path |

### Request/Response Examples

**Analyze Codebase:**
```bash
curl -X POST http://localhost:8181/api/codebase/analyze \
  -H "Content-Type: application/json" \
  -d '{"codebase_path": "/Users/you/Development/my-app"}'
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "total_files": 127,
    "total_lines": 45320,
    "languages": {"Python": 127},
    "entry_points": [
      {"path": "src/main.py", "type": "cli_entry", "description": "Entry point in main.py"}
    ],
    "directory_structure": {
      "src": {"type": "directory", "python_file_count": 85},
      "tests": {"type": "directory", "python_file_count": 42}
    },
    "tech_stack": {
      "frameworks": ["FastAPI"],
      "databases": ["PostgreSQL"],
      "tools": ["pytest", "Docker"]
    },
    "architecture_summary": "Python project with 127 files (45,320 lines of code). Uses FastAPI framework. Databases: PostgreSQL. Found 1 entry point(s). 2 top-level directories."
  },
  "message": "Analysis complete: 127 files, 45,320 lines"
}
```

## Current Limitations

- **Python-only**: Currently only analyzes `.py` files
- **Pattern-based detection**: Tech stack detection uses keyword matching, not semantic analysis
- **No dependency graph**: Does not trace imports or call relationships
- **Excluded directories**: `.venv`, `venv`, `node_modules`, `__pycache__`, `.git`, `dist`, `build`

## Files

### Backend
- **Service**: `python/src/server/services/codebase_service.py`
- **API Routes**: `python/src/server/api_routes/codebase_api.py`
- **MCP Tools**: `python/src/mcp_server/features/codebase/codebase_tools.py`
- **Migration**: `migration/0.1.0/011_add_codebase_intelligence.sql`

### Frontend
- **Types**: `archon-ui-main/src/features/codebase/types/codebase.types.ts`
- **Service**: `archon-ui-main/src/features/codebase/services/codebaseService.ts`
- **Hooks**: `archon-ui-main/src/features/codebase/hooks/useCodebaseQueries.ts`
- **Components**: `archon-ui-main/src/features/codebase/components/`

## Future Enhancements

- Multi-language support (JavaScript/TypeScript, Go, Rust)
- Import/dependency graph analysis
- AI-powered architecture summarization
- Integration with code review workflows
