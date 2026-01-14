-- =====================================================
-- Codebase Intelligence Feature Migration
-- =====================================================
-- Adds support for analyzing codebases and storing
-- structured architecture insights for AI assistants
-- =====================================================

-- Codebase analysis results storage
CREATE TABLE IF NOT EXISTS codebase_analyses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES archon_projects(id) ON DELETE CASCADE,
    codebase_path TEXT NOT NULL,  -- Local filesystem path that was analyzed
    analysis_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Basic statistics
    total_files INTEGER NOT NULL DEFAULT 0,
    total_lines INTEGER NOT NULL DEFAULT 0,
    languages JSONB DEFAULT '{}'::jsonb,  -- {"Python": 50, "JavaScript": 30, "TypeScript": 20}
    
    -- Architecture findings
    entry_points JSONB DEFAULT '[]'::jsonb,  -- [{"path": "main.py", "type": "cli_entry", "description": "..."}]
    directory_structure JSONB DEFAULT '{}'::jsonb,  -- Hierarchical structure with descriptions
    tech_stack JSONB DEFAULT '{}'::jsonb,  -- {"frameworks": ["FastAPI"], "databases": ["PostgreSQL"], "tools": ["Docker"]}
    architecture_summary TEXT,  -- Human-readable overview
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_codebase_project ON codebase_analyses(project_id);
CREATE INDEX IF NOT EXISTS idx_codebase_path ON codebase_analyses(codebase_path);
CREATE INDEX IF NOT EXISTS idx_codebase_timestamp ON codebase_analyses(analysis_timestamp DESC);

-- Create trigger to automatically update updated_at timestamp
-- Drop existing trigger if it exists, then recreate
DROP TRIGGER IF EXISTS update_codebase_analyses_updated_at ON codebase_analyses;

CREATE TRIGGER update_codebase_analyses_updated_at
    BEFORE UPDATE ON codebase_analyses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create RLS (Row Level Security) policies
ALTER TABLE codebase_analyses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow service role full access" ON codebase_analyses;
DROP POLICY IF EXISTS "Allow authenticated users to read and write" ON codebase_analyses;

CREATE POLICY "Allow service role full access" ON codebase_analyses
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow authenticated users to read and write" ON codebase_analyses
    FOR ALL TO authenticated
    USING (true);

-- Add comment for documentation
COMMENT ON TABLE codebase_analyses IS 'Stores codebase analysis results for AI-assisted development. Helps AI assistants understand brownfield project architecture before making changes.';
COMMENT ON COLUMN codebase_analyses.codebase_path IS 'Absolute filesystem path to the analyzed codebase root directory';
COMMENT ON COLUMN codebase_analyses.entry_points IS 'Main entry files detected (e.g., main.py, app.py, index.ts)';
COMMENT ON COLUMN codebase_analyses.directory_structure IS 'Top-level directory organization with file counts';
COMMENT ON COLUMN codebase_analyses.tech_stack IS 'Detected frameworks, databases, and development tools';
