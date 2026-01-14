# Codebase Intelligence Extension for Archon

> **Note:** This is a custom extension built on top of [Archon](https://github.com/coleam00/archon) by Michael McGlade.  
> For the base Archon documentation, see [README.md](./README.md).

## Overview

**Codebase Intelligence** adds architectural analysis capabilities to Archon's MCP server, helping AI assistants understand brownfield codebases before making changes.

## The Problem

AI coding assistants often struggle with existing codebases because they lack context about:
- Project structure and entry points
- Technology stack and frameworks
- Directory organization
- Existing patterns and conventions

This leads to:
- ❌ Changes that don't fit the existing architecture
- ❌ Introducing frameworks that conflict with existing ones
- ❌ Missing important entry points or configuration files
- ❌ Breaking established coding patterns

## The Solution

This extension adds three MCP tools that AI assistants can use to analyze codebases:

### 1. `codebase_analyze`
Scans a codebase and returns structured insights:
- **Entry points**: Files with `if __name__ == "__main__"`
- **Tech stack**: Detected frameworks, databases, and tools
- **Directory structure**: Top-level organization
- **Statistics**: File counts, lines of code, language breakdown
- **Architecture summary**: Human-readable overview

### 2. `codebase_get_project_analyses`
Retrieves analysis history for a project to track evolution over time.

### 3. `codebase_get_latest`
Checks if a codebase has been analyzed recently without triggering a new analysis.

## Features

- ✅ **Python AST-based analysis** (currently Python-only, extensible to other languages)
- ✅ **Supabase storage** for analysis caching
- ✅ **RESTful API** for direct HTTP access
- ✅ **MCP tool integration** for AI assistants
- ✅ **Project association** for tracking related analyses
- ✅ **ETag caching** for efficient data transfer

## Installation

### 1. Database Migration

Run the SQL migration in your Supabase SQL Editor:

```sql
-- Located in: migration/0.1.0/011_add_codebase_intelligence.sql
```

This creates the `codebase_analyses` table with proper indexes and RLS policies.

### 2. Rebuild Archon

```bash
cd archon
docker compose build
docker compose up -d
```

### 3. Verify Installation

Check that codebase tools are registered:

```bash
docker compose logs archon-mcp | grep "Codebase"
# Should output: ✓ Codebase intelligence tools registered
```

## Usage

### Via MCP Tool (Claude, Cursor, Windsurf)

```python
# Analyze a codebase
result = codebase_analyze(
    codebase_path="/path/to/your/project",
    project_id="optional-archon-project-id"
)

# Check for recent analysis
latest = codebase_get_latest(codebase_path="/path/to/your/project")

# Get analysis history
history = codebase_get_project_analyses(project_id="your-project-id")
```

### Via REST API

```bash
# Analyze a codebase
curl -X POST http://localhost:8181/api/codebase/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "codebase_path": "/path/to/project",
    "project_id": "optional-uuid"
  }'

# Get latest analysis
curl "http://localhost:8181/api/codebase/analyses/latest?codebase_path=/path/to/project"

# Get project analyses
curl "http://localhost:8181/api/codebase/analyses/project/{project-id}"
```

## Example Output

```json
{
  "success": true,
  "analysis": {
    "id": "6fe650fb-20ee-4a00-9c17-cf8b2ef82625",
    "codebase_path": "/app/src",
    "total_files": 117,
    "total_lines": 34484,
    "languages": {
      "Python": 117
    },
    "entry_points": [
      {
        "path": "server/main.py",
        "type": "cli_entry",
        "description": "Entry point in main.py"
      }
    ],
    "directory_structure": {
      "server": {
        "type": "directory",
        "python_file_count": 91
      },
      "mcp_server": {
        "type": "directory",
        "python_file_count": 19
      }
    },
    "tech_stack": {
      "frameworks": ["FastAPI"],
      "databases": ["PostgreSQL", "ChromaDB"],
      "tools": ["Docker", "pytest"]
    },
    "architecture_summary": "Python project with 117 files (34,484 lines of code). Uses FastAPI framework. Databases: PostgreSQL, ChromaDB. Found 5 entry point(s). 4 top-level directories."
  }
}
```

## Use Cases

### 1. Before Refactoring
```
User: "I want to add authentication to this project"
AI Assistant: *uses codebase_analyze* "This FastAPI project currently has 3 entry points. 
I'll add JWT middleware to main.py to protect all routes..."
```

### 2. New Team Member Onboarding
```
AI Assistant: *analyzes codebase* "This is a Flask project with PostgreSQL and Redis. 
The main entry point is app.py. Here's the architecture..."
```

### 3. AI-Assisted Development
```
AI Assistant: *checks tech stack* "I see you're using FastAPI with Pydantic validation. 
I'll follow that pattern for the new endpoint..."
```

## Architecture

### Backend Service Layer
```
python/src/server/services/codebase_service.py
```
- **CodebaseService**: Core analysis logic
- Python AST parsing for entry point detection
- Tech stack detection from requirements.txt, pyproject.toml
- Directory structure analysis
- Statistics calculation

### API Layer
```
python/src/server/api_routes/codebase_api.py
```
- **POST /api/codebase/analyze**: Analyze codebase
- **GET /api/codebase/analyses/project/{id}**: Get project analyses
- **GET /api/codebase/analyses/latest**: Get latest analysis

### MCP Tools Layer
```
python/src/mcp_server/features/codebase/codebase_tools.py
```
- **codebase_analyze**: MCP tool wrapper
- **codebase_get_project_analyses**: MCP tool wrapper
- **codebase_get_latest**: MCP tool wrapper

### Database Schema
```sql
CREATE TABLE codebase_analyses (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES archon_projects(id),
    codebase_path TEXT NOT NULL,
    analysis_timestamp TIMESTAMP WITH TIME ZONE,
    total_files INTEGER,
    total_lines INTEGER,
    languages JSONB,
    entry_points JSONB,
    directory_structure JSONB,
    tech_stack JSONB,
    architecture_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

## Tech Stack Detection

The analyzer automatically detects:

**Frameworks:**
- FastAPI, Flask, Django (from requirements.txt)

**Databases:**
- PostgreSQL, ChromaDB, SQLite (from requirements.txt)

**Tools:**
- Docker (Dockerfile, docker-compose.yml)
- Poetry (pyproject.toml)
- pytest (requirements.txt)

## Extending to Other Languages

The architecture is designed for easy extension to additional languages:

```python
# Current: Python AST-based
def _find_python_files(self, path: Path) -> list[Path]:
    return list(path.rglob("*.py"))

# Future: Add tree-sitter for JS/TS
def _find_javascript_files(self, path: Path) -> list[Path]:
    return list(path.rglob("*.js")) + list(path.rglob("*.ts"))
```

See `python/src/server/services/codebase_service.py` for implementation details.

## Performance Considerations

- **Analysis caching**: Results stored in Supabase prevent redundant scans
- **Ignore patterns**: Automatically skips `.venv`, `node_modules`, `.git`, etc.
- **Timeout handling**: 120-second timeout for large codebases
- **ETag support**: Reduces bandwidth for repeated queries

## Limitations

- **Python-only**: Currently only analyzes Python codebases
- **Local filesystem**: Requires accessible filesystem paths
- **Entry point detection**: Only finds explicit `if __name__ == "__main__"` patterns
- **Basic tech stack detection**: Relies on common config files (requirements.txt, pyproject.toml)

## Future Enhancements

- [ ] Multi-language support (JavaScript, TypeScript, Go, Rust)
- [ ] Dependency graph generation
- [ ] Cyclomatic complexity analysis
- [ ] Dead code detection
- [ ] Code smell identification
- [ ] Import relationship visualization
- [ ] Automatic documentation generation

## Development

### Running Tests

```bash
cd python
pytest tests/server/services/test_codebase_service.py
```

### Adding New Analyzers

1. Create analyzer in `python/src/server/services/codebase/analyzers/`
2. Register in `CodebaseService._analyze_codebase()`
3. Update response model in `codebase_api.py`
4. Add MCP tool parameter if needed

### Debugging

```bash
# View MCP server logs
docker compose logs -f archon-mcp

# View API server logs
docker compose logs -f archon-server

# Test API directly
curl http://localhost:8181/api/codebase/analyze -X POST \
  -H "Content-Type: application/json" \
  -d '{"codebase_path": "/app/src"}'
```

## Contributing

This extension follows Archon's contribution guidelines. See [CONTRIBUTING.md](./CONTRIBUTING.md).

Key areas for contribution:
- Additional language support (tree-sitter integration)
- Enhanced tech stack detection
- Complexity metrics
- Dependency analysis
- Test coverage

## License

This extension is released under the same license as Archon (MIT). See [LICENSE](./LICENSE).

## Credits

- **Author**: Michael McGlade ([@mikemcg87](https://github.com/mikemcg87))
- **Base Project**: [Archon](https://github.com/coleam00/archon) by Cole Medin
- **Inspired by**: The challenges of working with brownfield codebases in AI-assisted development

## Support

For issues specific to this extension:
- GitHub Issues: [mikemcg87/archon-codebase-intelligence](https://github.com/mikemcg87/archon-codebase-intelligence/issues)

For general Archon questions:
- GitHub Issues: [coleam00/archon](https://github.com/coleam00/archon/issues)

---

**Built for the Belfast contract dev community 🇬🇧**  
Making brownfield projects easier to work with, one analysis at a time.
