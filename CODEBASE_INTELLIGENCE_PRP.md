# Codebase Intelligence UI - Product Requirements & Plan

**Status**: Draft  
**Owner**: Michael McGlade  
**Created**: 2026-01-14  
**Target**: Portfolio enhancement for Belfast contract dev market  

---

## Executive Summary

Add frontend visualization and enhanced analysis capabilities to the existing Codebase Intelligence backend (MCP tools + REST API). Enable users to visually explore codebase architecture, track evolution over time, and generate reports—making Archon a complete solution for understanding brownfield projects.

**Current State**:
- ✅ MCP tools working (`codebase_analyze`, `codebase_get_latest`, `codebase_get_project_analyses`)
- ✅ REST API implemented (`/api/codebase/*`)
- ✅ Database schema with Supabase
- ❌ **NO frontend visualization**
- ❌ Limited to Python-only analysis
- ❌ No dependency graph or complexity metrics

**Goal**: Transform backend-only feature into a polished, visual experience that demonstrates full-stack capabilities for portfolio.

---

## Mission

### Goals
1. **Visual Dashboard** - Interactive UI for exploring codebase analyses with glassmorphism design
2. **Project Integration** - Link analyses to Archon projects for tracking evolution
3. **Enhanced Analysis** - Add dependency graphs, complexity metrics, multi-language support
4. **Portfolio Impact** - Showcase React + TypeScript + TanStack Query + D3.js skills
5. **User Value** - Help developers understand brownfield codebases before making changes

### Non-Goals (Deferred to Post-MVP)
- Real-time analysis (on file save)
- Git integration (show changes per commit)
- AI-powered refactoring suggestions
- Team collaboration features (shared annotations)
- IDE plugin (beyond MCP)

---

## Stakeholder Alignment

**Primary User**: Contract developers working on brownfield codebases  
**Portfolio Audience**: Belfast recruiting firms (Vanrath), technical interviewers  
**Timeline**: 2-3 days for MVP (visual dashboard + project integration)  
**Success Metric**: Impressive demo-able feature for CV/interviews  

---

## User Journeys

### Journey 1: Analyze Project Codebase
**Actor**: Developer starting work on new contract project

**Flow**:
1. Navigate to Projects → Select "Causeway Contract" project
2. Click "Analyze Codebase" tab (new)
3. Enter codebase path: `/Users/mike/Development/causeway`
4. Click "Analyze" button
5. Progress indicator shows "Analyzing 250 files..."
6. Dashboard loads with:
   - **Overview Cards**: 250 files, 45,000 lines, Python 95%
   - **Tech Stack Badges**: FastAPI, PostgreSQL, Docker, Redis
   - **Entry Points List**: `main.py`, `cli.py`, `worker.py`
   - **Directory Tree**: Interactive expandable tree
7. Click entry point → Opens file in editor (future)
8. Analysis saved to project history

**Value**: Instant architectural overview before making changes

---

### Journey 2: Compare Architecture Evolution
**Actor**: Developer tracking refactoring progress over time

**Flow**:
1. Navigate to Codebase Intelligence tab in project
2. View "Analysis Timeline" chart (shows 5 analyses over 2 months)
3. Select two analyses: "v1 (2025-12-01)" vs "v2 (2026-01-14)"
4. Dashboard shows diff:
   - Files: 180 → 250 (+70)
   - Lines: 30K → 45K (+15K)
   - New tech: Added Redis
   - New entry points: Added `worker.py`
5. Click "View Details" → See file-by-file diff

**Value**: Track architectural changes and refactoring impact

---

### Journey 3: Generate Architecture Report
**Actor**: Developer creating documentation for client handoff

**Flow**:
1. Navigate to Codebase Intelligence dashboard
2. Click "Export Report" button
3. Select format: PDF / Markdown / JSON
4. Report includes:
   - Architecture summary
   - Tech stack inventory
   - Entry points with descriptions
   - Directory structure
   - Complexity metrics (if available)
5. Download report for client documentation

**Value**: Automated architecture documentation generation

---

## Technical Architecture

### Frontend (React + TypeScript)

**Vertical Slice Structure** (follows Archon patterns):
```
archon-ui-main/src/features/codebase/
├── components/
│   ├── AnalysisDashboard.tsx      # Main dashboard component
│   ├── OverviewCards.tsx          # Metric cards (files, lines, languages)
│   ├── TechStackBadges.tsx        # Visual tech stack display
│   ├── EntryPointsList.tsx        # Clickable entry points
│   ├── DirectoryTreeView.tsx      # D3.js tree visualization
│   ├── AnalysisTimeline.tsx       # Chart.js timeline graph
│   ├── ComparisonView.tsx         # Compare two analyses
│   └── AnalyzeButton.tsx          # Trigger new analysis
├── hooks/
│   ├── useCodebaseAnalysis.ts     # TanStack Query hook
│   ├── useAnalysisHistory.ts      # Fetch project analyses
│   └── useAnalysisComparison.ts   # Compare logic
├── services/
│   └── codebaseService.ts         # API client
├── types/
│   └── codebase.types.ts          # TypeScript interfaces
├── views/
│   └── CodebaseView.tsx           # Main page
└── index.ts                        # Exports
```

**Data Fetching** (TanStack Query v5):
```typescript
// archon-ui-main/src/features/codebase/hooks/useCodebaseAnalysis.ts
export const useCodebaseAnalysis = (analysisId: string) => {
  return useQuery({
    queryKey: ['codebase', 'analysis', analysisId],
    queryFn: () => codebaseService.getAnalysis(analysisId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30,    // 30 minutes
  });
};

export const useProjectAnalyses = (projectId: string) => {
  return useQuery({
    queryKey: ['codebase', 'project', projectId],
    queryFn: () => codebaseService.getProjectAnalyses(projectId),
    staleTime: 1000 * 60 * 2,
  });
};

export const useAnalyzeMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: AnalyzeParams) => 
      codebaseService.analyze(params),
    onSuccess: (data, variables) => {
      // Invalidate project analyses
      queryClient.invalidateQueries({
        queryKey: ['codebase', 'project', variables.projectId]
      });
      
      // Optimistic update
      queryClient.setQueryData(
        ['codebase', 'latest', variables.codebasePath],
        data.analysis
      );
    },
  });
};
```

**API Service** (HTTP client):
```typescript
// archon-ui-main/src/features/codebase/services/codebaseService.ts
import { apiClient } from '@/features/shared/api/apiClient';
import type { CodebaseAnalysis, AnalyzeRequest } from '../types';

export const codebaseService = {
  analyze: async (params: AnalyzeRequest): Promise<{ analysis: CodebaseAnalysis }> => {
    const response = await apiClient.post('/api/codebase/analyze', params);
    return response.data;
  },

  getAnalysis: async (id: string): Promise<CodebaseAnalysis> => {
    const response = await apiClient.get(`/api/codebase/analyses/${id}`);
    return response.data.analysis;
  },

  getProjectAnalyses: async (projectId: string): Promise<CodebaseAnalysis[]> => {
    const response = await apiClient.get(`/api/codebase/analyses/project/${projectId}`);
    return response.data.analyses;
  },

  getLatest: async (codebasePath: string): Promise<CodebaseAnalysis | null> => {
    const response = await apiClient.get('/api/codebase/analyses/latest', {
      params: { codebase_path: codebasePath },
    });
    return response.data.analysis;
  },
};
```

---

### Backend (Existing - Enhancements)

**Current API** (already implemented):
```
POST /api/codebase/analyze
GET /api/codebase/analyses/project/{project_id}
GET /api/codebase/analyses/latest?codebase_path=...
```

**New API Endpoints** (Phase 2):
```python
# Dependency graph
GET /api/codebase/analyses/{id}/dependencies
Response: {
  "nodes": [{"id": "module_a", "label": "services/auth"}],
  "edges": [{"from": "module_a", "to": "module_b"}],
  "circular": [["module_c", "module_d", "module_c"]]
}

# Complexity metrics
GET /api/codebase/analyses/{id}/complexity
Response: {
  "average_complexity": 5.2,
  "high_complexity_files": [
    {"path": "services/legacy.py", "complexity": 25}
  ],
  "total_functions": 450,
  "complex_functions": 12
}

# Export report
GET /api/codebase/analyses/{id}/export?format=pdf|markdown|json
Response: File download
```

**Service Enhancements**:
```python
# python/src/server/services/codebase_service.py

class CodebaseService:
    # NEW METHODS
    
    async def get_dependency_graph(self, analysis_id: str) -> dict:
        """Generate dependency graph using NetworkX."""
        # Parse Python imports
        # Build graph
        # Detect circular dependencies
        return {"nodes": [...], "edges": [...]}
    
    async def calculate_complexity(self, analysis_id: str) -> dict:
        """Calculate cyclomatic complexity per file/function."""
        # Use radon or mccabe
        # Analyze all Python files
        return {"average_complexity": ..., "high_complexity_files": [...]}
    
    async def export_report(self, analysis_id: str, format: str) -> bytes:
        """Generate architecture report."""
        if format == "markdown":
            return self._generate_markdown_report(analysis_id)
        elif format == "pdf":
            return self._generate_pdf_report(analysis_id)
        return self._generate_json_report(analysis_id)
```

---

### UI Components (Glassmorphism Design)

**Following Archon UI Standards**:

**1. Overview Cards** (Metric Display):
```typescript
// Uses DataCard primitive from Archon
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <DataCard
    blur="lg"
    transparency="light"
    edgePosition="top"
    edgeColor="cyan"
  >
    <DataCard.Header>
      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
        Total Files
      </h3>
    </DataCard.Header>
    <DataCard.Content>
      <p className="text-3xl font-bold text-gray-900 dark:text-white">
        {analysis.total_files}
      </p>
    </DataCard.Content>
  </DataCard>
  
  {/* Repeat for: Lines of Code, Languages, Entry Points */}
</div>
```

**2. Tech Stack Badges** (Visual Tech Display):
```typescript
// Custom glassmorphism badges
const techStackColors = {
  FastAPI: "cyan",
  Flask: "green",
  Django: "purple",
  PostgreSQL: "blue",
  Docker: "orange",
  Redis: "red",
} satisfies Record<string, Color>;

<div className="flex flex-wrap gap-2">
  {Object.entries(analysis.tech_stack).flatMap(([category, items]) =>
    items.map(item => {
      const color = techStackColors[item] || "purple";
      const variant = glassCard.variants[color];
      
      return (
        <div
          key={item}
          className={cn(
            "px-3 py-1 rounded-full backdrop-blur-md",
            variant.border,
            variant.glow,
            "text-sm font-medium"
          )}
        >
          {item}
        </div>
      );
    })
  )}
</div>
```

**3. Directory Tree Visualization** (D3.js):
```typescript
import { Tree } from 'react-d3-tree';

export const DirectoryTreeView: React.FC<Props> = ({ structure }) => {
  const treeData = useMemo(() => 
    convertToD3Tree(structure), 
    [structure]
  );
  
  return (
    <Card blur="lg" transparency="light" className="h-[600px]">
      <Tree
        data={treeData}
        orientation="vertical"
        pathFunc="step"
        nodeSize={{ x: 200, y: 100 }}
        renderCustomNodeElement={(rd3tProps) => (
          <TreeNode {...rd3tProps} />
        )}
      />
    </Card>
  );
};

const TreeNode: React.FC<CustomNodeProps> = ({ nodeDatum }) => (
  <g>
    <circle r={15} fill="var(--accent)" />
    <text dy=".35em" x={20} className="text-sm">
      {nodeDatum.name}
    </text>
    <text dy="1.5em" x={20} className="text-xs text-gray-500">
      {nodeDatum.attributes?.file_count} files
    </text>
  </g>
);
```

**4. Analysis Timeline** (Chart.js):
```typescript
import { Line } from 'react-chartjs-2';

export const AnalysisTimeline: React.FC<Props> = ({ analyses }) => {
  const data = {
    labels: analyses.map(a => new Date(a.analysis_timestamp).toLocaleDateString()),
    datasets: [
      {
        label: 'Files',
        data: analyses.map(a => a.total_files),
        borderColor: 'rgb(34, 211, 238)',
        tension: 0.4,
      },
      {
        label: 'Lines of Code',
        data: analyses.map(a => a.total_lines),
        borderColor: 'rgb(168, 85, 247)',
        tension: 0.4,
        yAxisID: 'y1',
      },
    ],
  };
  
  return (
    <Card blur="lg" transparency="light" className="p-6">
      <h3 className="text-lg font-semibold mb-4">Architecture Evolution</h3>
      <Line data={data} options={chartOptions} />
    </Card>
  );
};
```

**5. Entry Points List** (Interactive):
```typescript
export const EntryPointsList: React.FC<Props> = ({ entryPoints }) => {
  return (
    <Card blur="lg" transparency="light">
      <Card.Header>
        <h3>Entry Points ({entryPoints.length})</h3>
      </Card.Header>
      <Card.Content>
        <div className="space-y-2">
          {entryPoints.map(ep => (
            <div
              key={ep.path}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg",
                "backdrop-blur-sm bg-white/5 dark:bg-black/5",
                "border border-white/10 dark:border-white/5",
                "hover:bg-white/10 dark:hover:bg-black/10",
                "transition-colors cursor-pointer"
              )}
              role="button"
              tabIndex={0}
              onClick={() => handleEntryPointClick(ep.path)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleEntryPointClick(ep.path);
                }
              }}
              aria-label={`Open ${ep.path}`}
            >
              <div>
                <p className="font-mono text-sm">{ep.path}</p>
                <p className="text-xs text-gray-500">{ep.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden="true" />
            </div>
          ))}
        </div>
      </Card.Content>
    </Card>
  );
};
```

---

### Project Integration

**Add Codebase Tab to Projects**:

```typescript
// Modify: archon-ui-main/src/features/projects/views/ProjectsView.tsx

const projectTabs = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "docs", label: "Documents", icon: FileText },
  { id: "codebase", label: "Codebase", icon: Code2 },  // NEW
];

<PillNavigation
  items={projectTabs}
  activeItem={activeTab}
  onItemClick={setActiveTab}
  colorVariant="cyan"
/>

{activeTab === "codebase" && (
  <CodebaseTab projectId={project.id} />
)}
```

**CodebaseTab Component**:
```typescript
// archon-ui-main/src/features/codebase/components/CodebaseTab.tsx

export const CodebaseTab: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { data: analyses, isLoading } = useProjectAnalyses(projectId);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);
  
  const latestAnalysis = analyses?.[0];
  const displayAnalysis = selectedAnalysisId 
    ? analyses?.find(a => a.id === selectedAnalysisId)
    : latestAnalysis;
  
  if (isLoading) return <LoadingSpinner />;
  
  if (!analyses || analyses.length === 0) {
    return (
      <EmptyState
        title="No codebase analyses yet"
        description="Analyze your project's codebase to understand its architecture"
        action={<AnalyzeButton projectId={projectId} />}
      />
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Analysis Selector */}
      <div className="flex items-center justify-between">
        <AnalysisSelector
          analyses={analyses}
          selectedId={selectedAnalysisId}
          onChange={setSelectedAnalysisId}
        />
        <AnalyzeButton projectId={projectId} />
      </div>
      
      {/* Dashboard */}
      {displayAnalysis && (
        <AnalysisDashboard analysis={displayAnalysis} />
      )}
    </div>
  );
};
```

---

## Implementation Blueprint

### Phase 1: Frontend Foundation (8-10 hours)

**Goal**: Basic dashboard displaying existing analysis data

**Tasks**:
1. **Project Structure** (1 hour)
   - Create `features/codebase/` directory structure
   - Set up TypeScript types matching backend API
   - Create service layer (API client)
   - Export from index.ts

2. **TanStack Query Hooks** (2 hours)
   - `useCodebaseAnalysis(id)` - Fetch single analysis
   - `useProjectAnalyses(projectId)` - Fetch project history
   - `useAnalyzeMutation()` - Trigger new analysis
   - Query key patterns following Archon standards

3. **Overview Cards Component** (2 hours)
   - Use DataCard primitive
   - Display: Files, Lines, Languages, Entry Points
   - Responsive grid (1/2/4 columns)
   - Glassmorphism styling with edge-lit effects

4. **Tech Stack Badges** (1 hour)
   - Color mapping for common frameworks
   - Glassmorphism pill design
   - Grouped by category (frameworks, databases, tools)

5. **Entry Points List** (2 hours)
   - Clickable list with hover effects
   - Keyboard navigation (Enter/Space)
   - Path display with truncation
   - Future: Click to open file (Phase 3)

6. **Main Dashboard Component** (2 hours)
   - Assemble all sub-components
   - Layout with proper spacing
   - Loading states
   - Error boundaries

**Deliverables**:
- ✅ Working dashboard page at `/projects/:id?tab=codebase`
- ✅ Displays analysis data from existing API
- ✅ Responsive design (mobile → desktop)
- ✅ Follows Archon UI standards (glassmorphism, accessibility)

---

### Phase 2: Advanced Visualizations (6-8 hours)

**Goal**: Add interactive tree and timeline charts

**Tasks**:
1. **Directory Tree Component** (4 hours)
   - Install react-d3-tree
   - Convert directory_structure JSON to D3 tree format
   - Custom node rendering (glassmorphism)
   - Expandable/collapsible nodes
   - Zoom and pan controls

2. **Analysis Timeline Chart** (3 hours)
   - Install chart.js + react-chartjs-2
   - Line chart for files/lines over time
   - Hover tooltips showing details
   - Click to select analysis
   - Responsive sizing

3. **Comparison View** (1 hour)
   - Select two analyses from dropdown
   - Side-by-side diff display
   - Highlight changes (added/removed)
   - Color-coded metrics

**Deliverables**:
- ✅ Interactive directory tree visualization
- ✅ Timeline chart showing evolution
- ✅ Basic comparison functionality

---

### Phase 3: Backend Enhancements (8-10 hours)

**Goal**: Add dependency graph and complexity analysis

**Tasks**:
1. **Dependency Graph Analysis** (4 hours)
   - Parse Python imports using AST
   - Build graph with NetworkX
   - Detect circular dependencies
   - API endpoint: GET `/api/codebase/analyses/{id}/dependencies`
   - Store results in JSONB field

2. **Complexity Metrics** (3 hours)
   - Install radon or mccabe
   - Calculate cyclomatic complexity per file
   - Identify high-complexity functions (>10)
   - API endpoint: GET `/api/codebase/analyses/{id}/complexity`

3. **Multi-Language Support** (3 hours)
   - Install tree-sitter-python, tree-sitter-javascript
   - Add JavaScript/TypeScript analyzer
   - Detect entry points in JS (exports, main functions)
   - Update tech stack detection

**Deliverables**:
- ✅ Dependency graph API endpoint
- ✅ Complexity metrics API endpoint
- ✅ JavaScript/TypeScript analysis support

---

### Phase 4: Enhanced UI Features (6-8 hours)

**Goal**: Dependency graph visualization and export

**Tasks**:
1. **Dependency Graph Visualization** (4 hours)
   - Install react-force-graph-2d or vis-network
   - Fetch dependency data from new API
   - Interactive node graph
   - Highlight circular dependencies in red
   - Node click → Show module details

2. **Complexity Heatmap** (2 hours)
   - Treemap visualization (files sized by complexity)
   - Color gradient (green → yellow → red)
   - Hover to see complexity score
   - Click to see file details

3. **Export Report** (2 hours)
   - Export button with format dropdown
   - API call to generate report
   - Download file
   - Loading state during generation

**Deliverables**:
- ✅ Dependency graph visualization
- ✅ Complexity heatmap
- ✅ Report export functionality

---

### Phase 5: Polish & Testing (4-6 hours)

**Goal**: Production-ready feature

**Tasks**:
1. **Error Handling** (2 hours)
   - Error boundaries for each major component
   - User-friendly error messages
   - Retry mechanisms for failed analyses
   - Toast notifications

2. **Loading States** (1 hour)
   - Skeleton loaders for cards
   - Spinner for tree loading
   - Progress indicator for analysis

3. **Documentation** (2 hours)
   - Update CODEBASE_INTELLIGENCE.md with UI sections
   - Add screenshots to README
   - Document component APIs
   - Create usage examples

4. **Testing** (1 hour)
   - Test with large codebases (500+ files)
   - Test with empty analyses
   - Test responsive breakpoints
   - Accessibility audit (keyboard nav, screen readers)

**Deliverables**:
- ✅ Robust error handling
- ✅ Polished loading states
- ✅ Comprehensive documentation
- ✅ Tested across scenarios

---

## Dependencies & Libraries

### New Frontend Dependencies
```json
{
  "dependencies": {
    "react-d3-tree": "^3.6.2",           // Directory tree visualization
    "chart.js": "^4.4.1",                // Timeline charts
    "react-chartjs-2": "^5.2.0",         // React wrapper for Chart.js
    "react-force-graph-2d": "^1.25.0",   // Dependency graph (Phase 3)
    "d3": "^7.9.0"                       // D3 utilities
  },
  "devDependencies": {
    "@types/d3": "^7.4.3"                // TypeScript types
  }
}
```

### New Backend Dependencies (Phase 3)
```toml
[project.dependencies]
networkx = "^3.2"       # Dependency graph analysis
radon = "^6.0.1"        # Cyclomatic complexity
tree-sitter = "^0.21.0" # Multi-language parsing
tree-sitter-python = "^0.21.0"
tree-sitter-javascript = "^0.21.0"
```

---

## Success Criteria

### MVP (Phase 1-2) - Ready for Portfolio
- [ ] Dashboard displays all analysis metrics
- [ ] Tech stack badges with proper colors
- [ ] Entry points list with keyboard navigation
- [ ] Directory tree with expand/collapse
- [ ] Timeline chart showing evolution
- [ ] Integrated into Projects tab
- [ ] Responsive design (works on mobile)
- [ ] Follows Archon UI standards (glassmorphism, a11y)
- [ ] TanStack Query for all data fetching
- [ ] No TypeScript errors (`tsc --noEmit`)

### Full Feature (All Phases)
- [ ] Dependency graph visualization
- [ ] Complexity heatmap
- [ ] Multi-language support (JS/TS)
- [ ] Report export (PDF/Markdown/JSON)
- [ ] Comparison view (two analyses side-by-side)
- [ ] Error boundaries and retry logic
- [ ] Loading skeletons
- [ ] Documentation with screenshots

### Portfolio Impact
- [ ] Live demo in Archon instance
- [ ] Screenshots for CV
- [ ] GitHub README updated with visuals
- [ ] Can walk through feature in interview

---

## Risks & Mitigations

### Risk 1: D3.js Learning Curve
**Impact**: Medium  
**Probability**: High  
**Mitigation**: Use react-d3-tree library (pre-built), not raw D3. Follow library examples closely.

### Risk 2: Large Codebase Performance
**Impact**: High  
**Probability**: Medium  
**Mitigation**: 
- Paginate or virtualize large lists (500+ files)
- Lazy load tree nodes (expand on demand)
- Add database indexes on analysis queries
- Cache API responses (TanStack Query handles this)

### Risk 3: Time Constraint (Portfolio Deadline)
**Impact**: High  
**Probability**: Medium  
**Mitigation**:
- Focus on Phase 1-2 for MVP (8-10 + 6-8 = 14-18 hours)
- Phase 3-4 can be "future enhancements" for CV
- Deliver working visual dashboard in 2-3 days

### Risk 4: UI Consistency with Archon
**Impact**: Medium  
**Probability**: Low  
**Mitigation**:
- Follow UI_STANDARDS.md religiously
- Use existing primitives (Card, DataCard, PillNavigation)
- Copy patterns from projects/tasks features
- Run automated scans from UI standards doc

---

## Immediate Actions

### Before Starting Implementation
- [x] Get approval on this PRP
- [ ] Set up development branch: `feature/codebase-intelligence-ui`
- [ ] Install frontend dependencies (react-d3-tree, chart.js)
- [ ] Create feature directory structure
- [ ] Review existing projects feature code for patterns

### Phase 1 Kickoff (Day 1)
- [ ] Create TypeScript types matching API
- [ ] Set up TanStack Query hooks
- [ ] Build Overview Cards component
- [ ] Build Tech Stack Badges component
- [ ] Test with existing analysis data

### Phase 2 (Day 2)
- [ ] Implement Directory Tree with react-d3-tree
- [ ] Implement Timeline Chart with Chart.js
- [ ] Add to Projects tab navigation
- [ ] Test responsive design

### Polish (Day 3)
- [ ] Error handling and loading states
- [ ] Accessibility audit
- [ ] Take screenshots for CV/README
- [ ] Update documentation

---

## Open Questions

1. **Should analyses auto-refresh?**
   - Option A: Manual re-analyze only (simpler, MVP)
   - Option B: Check for latest on project open (1 API call)
   - **Decision**: Manual for MVP, auto-check in Phase 5

2. **File path clickability?**
   - Can we open files from Archon UI?
   - Requires file system access or VS Code integration
   - **Decision**: Show path only for MVP, Phase 5 feature

3. **Comparison mode: How many analyses?**
   - Compare 2 (simple diff)
   - Compare all (complex timeline slider)
   - **Decision**: Compare 2 for MVP

4. **Export formats priority?**
   - Markdown (easy, developer-friendly)
   - PDF (harder, requires reportlab or weasyprint)
   - JSON (trivial, already have data)
   - **Decision**: Markdown first, PDF Phase 4

---

## Timeline Estimate

### MVP (Phases 1-2): 2-3 days
- Day 1 (8 hours): Phase 1 - Dashboard components
- Day 2 (6 hours): Phase 2 - Tree + Timeline
- Day 3 (4 hours): Polish, screenshots, docs

### Full Feature (All Phases): 5-6 days
- Day 1-3: MVP (above)
- Day 4 (8 hours): Phase 3 - Backend enhancements
- Day 5 (6 hours): Phase 4 - Advanced UI
- Day 6 (4 hours): Phase 5 - Testing & polish

**Recommendation for Portfolio**: Ship MVP (Phases 1-2) in 2-3 days, add "Future Enhancements" section to README listing Phases 3-5.

---

## Appendix: Example API Responses

### Existing Analysis Response
```json
{
  "id": "a9fb86bd-4fe0-4012-8fd4-5917c6bd572d",
  "project_id": "ba70a2fe-7422-43cd-a4c1-a682aad5ee93",
  "codebase_path": "/app/src/server",
  "analysis_timestamp": "2026-01-14T01:44:24.644092+00:00",
  "total_files": 95,
  "total_lines": 30807,
  "languages": {"Python": 95},
  "entry_points": [
    {"path": "main.py", "type": "cli_entry", "description": "Entry point in main.py"}
  ],
  "directory_structure": {
    "api_routes": {"type": "directory", "python_file_count": 17},
    "services": {"type": "directory", "python_file_count": 63}
  },
  "tech_stack": {
    "frameworks": ["FastAPI"],
    "databases": ["PostgreSQL", "ChromaDB"],
    "tools": ["Docker", "pytest"]
  },
  "architecture_summary": "Python project with 95 files (30,807 lines of code). Uses FastAPI framework. Found 2 entry point(s)."
}
```

### New Dependency Graph Response (Phase 3)
```json
{
  "nodes": [
    {"id": "api_routes.codebase_api", "label": "codebase_api", "group": "api_routes"},
    {"id": "services.codebase_service", "label": "codebase_service", "group": "services"}
  ],
  "edges": [
    {"from": "api_routes.codebase_api", "to": "services.codebase_service"}
  ],
  "circular_dependencies": [
    ["services.auth", "services.user", "services.auth"]
  ],
  "stats": {
    "total_modules": 95,
    "total_imports": 234,
    "circular_count": 1
  }
}
```

### New Complexity Response (Phase 3)
```json
{
  "average_complexity": 5.2,
  "median_complexity": 4.0,
  "total_functions": 450,
  "complex_functions": 12,
  "high_complexity_files": [
    {
      "path": "services/legacy_converter.py",
      "complexity": 25,
      "functions": [
        {"name": "convert_format", "complexity": 25, "line": 45}
      ]
    }
  ],
  "complexity_distribution": {
    "simple": 380,    // complexity 1-5
    "moderate": 58,   // complexity 6-10
    "complex": 12     // complexity 11+
  }
}
```

---

## Checklist: UI Standards Compliance

### Tailwind V4
- [ ] No dynamic class construction (`` `bg-${color}` ``)
- [ ] CSS variables in `style` prop, static utilities in `className`
- [ ] All color lookups use `satisfies Record<Color, string>`

### Layout & Responsive
- [ ] All grids have responsive breakpoints (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4`)
- [ ] Scroll containers have `w-full` parent
- [ ] Add `scrollbar-hide` to horizontal scrolls
- [ ] Flex parents with scroll children have `min-w-0`

### Theming
- [ ] Every color has `dark:` variant
- [ ] Use glassmorphism tokens from `styles.ts`

### Radix UI
- [ ] Use primitives for all form elements (no native `<select>`)
- [ ] Compose with `asChild`
- [ ] Style via data attributes

### Centralized Styling
- [ ] Import from `@/features/ui/primitives/styles`
- [ ] Use `glassCard.variants`, `glassCard.edgeColors`
- [ ] No duplicate style objects

### Accessibility
- [ ] Keyboard support on all interactive elements
- [ ] Icon-only buttons have `aria-label`
- [ ] Toggle buttons have `aria-pressed`
- [ ] Expandable controls have `aria-expanded`
- [ ] Decorative icons have `aria-hidden="true"`

### TypeScript
- [ ] Async functions return `Promise<void>`, not `void`
- [ ] All props used in component
- [ ] Consistent color types (use "green", never "emerald")
- [ ] Line limit 120 characters
- [ ] Run `tsc --noEmit` with no errors

---

**Status**: Ready for implementation  
**Next Step**: Get approval, create feature branch, start Phase 1  
**Portfolio Value**: High - demonstrates full-stack React + TypeScript + visualization skills
