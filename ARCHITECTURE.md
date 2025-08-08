# Portable Local Graph - Architecture Documentation

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Function Inventories](#function-inventories)
4. [Tricky Solutions & Design Rationale](#tricky-solutions--design-rationale)
5. [Key Use Cases & Workflows](#key-use-cases--workflows)
6. [Code Conventions](#code-conventions)
7. [Naming Conventions](#naming-conventions)
8. [Module Details](#module-details)

---

## Overview

The Portable Local Graph is a lightweight, browser-based graph drawing application for creating and manipulating node-edge diagrams. It provides an intuitive interface for building graphs with support for nodes, edges, weights, and categories, all running locally in the browser without external dependencies.

**Core Design Philosophy**: Simple, accessible graph creation with powerful features hidden behind a clean interface - no server required for basic usage.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Browser Runtime                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐ │
│  │   HTML/CSS UI   │  │   JavaScript     │  │   Canvas API    │ │
│  │                 │  │   Application    │  │                 │ │
│  │ • Toolbar       │  │ • Graph logic    │  │ • 2D Rendering  │ │
│  │ • Mode buttons  │  │ • Event handling │  │ • Zoom/pan      │ │
│  │ • Dialog boxes  │  │ • SQLite DB      │  │ • Grid system   │ │
│  │ • Status bar    │  │ • Auto-save      │  │ • Hit detection │ │
│  └─────────────────┘  └──────────────────┘  └─────────────────┘ │
│                              │                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  Graph Core (graph.js)                    │  │
│  │  ┌──────────────┐  ┌─────────────┐  ┌─────────────────┐ │ │
│  │  │   Nodes      │  │   Edges     │  │   Interaction   │ │ │
│  │  │ • Position   │  │ • Weight    │  │ • Mouse events  │ │ │
│  │  │ • Label      │  │ • Category  │  │ • Mode switching│ │ │
│  │  │ • Color      │  │ • Direction │  │ • Selection     │ │ │
│  │  └──────────────┘  └─────────────┘  └─────────────────┘ │ │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                Database Manager (app.js)                  │  │
│  │  ┌─────────────────┐  ┌─────────────────┐                │ │
│  │  │   SQLite DB     │  │   JSON Backup   │                │ │
│  │  │ • Real-time     │  │ • Import/Export │                │ │
│  │  │ • Auto-save     │  │ • Migration     │                │ │
│  │  │ • Graph list    │  │ • Sharing       │                │ │
│  │  └─────────────────┘  └─────────────────┘                │ │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                    Optional Server Mode                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐ │
│  │   Express.js    │  │   SQLite DB      │  │   REST API      │ │
│  │                 │  │                  │  │                 │ │
│  │ • CRUD graphs  │  │ • Real-time      │  │ • REST endpoints│  │
│  │ • Auto-save    │  │ • Multi-graph    │  │ • Validation    │  │
│  │ • Statistics   │  │ • Transactions   │  │ • JSON/DB API   │  │
│  └─────────────────┘  └──────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Function Inventories

### Graph.js - Core Graph Engine
| Function | Purpose | Parameters | Returns |
|----------|---------|------------|---------|
| `constructor(canvas, options)` | Initialize graph engine | canvas: HTMLCanvasElement, options: object | Graph instance |
| `addNode(x, y, label, color, category, radius)` | Create new node | x, y: number, label: string, color: string, category: string, radius: number | Node object |
| `addEdge(fromNode, toNode, weight, category)` | Create new edge | fromNode, toNode: number, weight: number, category: string | Edge object |
| `getNodeAt(x, y)` | Find node at coordinates | x, y: number | Node object or null |
| `getEdgeAt(x, y)` | Find edge at coordinates | x, y: number | Edge object or null |
| `getEdgeLineWidth(weight)` | Map weight to line width | weight: number | Line width in pixels |
| `exportData()` | Serialize graph to JSON | None | Object with nodes, edges, scale, offset |
| `importData(data)` | Load graph from JSON | data: object | void |
| `render()` | Redraw entire graph | None | void |

### App.js - Application Controller
| Function | Purpose | Parameters | Returns |
|----------|---------|------------|---------|
| `setMode(mode)` | Switch interaction mode | mode: 'node'/'edge'/'select' | void |
| `saveState()` | Save to undo stack | None | void |
| `undo()` | Revert last action | None | void |
| `redo()` | Restore undone action | None | void |
| `loadGraphData(data)` | Load graph from data | data: object | void |
| `generateSVG()` | Create SVG representation | None | SVG string |
| `handleKeyDown(e)` | Process keyboard shortcuts | e: KeyboardEvent | void |

### App.js - Enhanced Database Integration
| Function | Purpose | Parameters | Returns |
|----------|---------|------------|---------|
| `initializeDatabase()` | Initialize SQLite database connection | None | Promise<void> |
| `saveGraphToDatabase()` | Auto-save graph to database | None | Promise<void> |
| `loadGraphFromDatabase(id)` | Load graph from database | id: string | Promise<void> |
| `showGraphSelector(graphs)` | Display graph selection dialog | graphs: array | Promise<string> |
| `saveState()` | Save to database with auto-save | None | Promise<void> |

### Server.js - Optional Backend
| Function | Purpose | Parameters | Returns |
|----------|---------|------------|---------|
| `saveGraphToDB()` | Auto-save to SQLite database | graphId: string, graph: object | Promise<void> |
| `generateSVG(graph)` | Generate SVG from graph data | graph: object | SVG string |
| `POST /api/graph/:id` | Save graph to database | id: string, graph: object | JSON response |
| `GET /api/graphs` | List all saved graphs | None | JSON array |
| `GET /api/graph/:id` | Load specific graph | id: string | JSON graph |
| `POST /api/graph/:id/stats` | Calculate graph statistics | id: string | JSON stats |

### Database Manager Integration
| Function | Purpose | Parameters | Returns |
|----------|---------|------------|---------|
| `saveGraph(id, data)` | Save graph to SQLite database | id: string, data: object | Promise<void> |
| `loadGraph(id)` | Load graph from database | id: string | Promise<object> |
| `listGraphs()` | List all available graphs | None | Promise<array> |
| `importFromJSON(data, id)` | Import JSON to database | data: object, id: string | Promise<string> |
| `exportToJSON(id)` | Export graph to JSON | id: string | Promise<object> |

### Database-isolated.js - SQLite Storage Manager
| Function | Purpose | Parameters | Returns |
|----------|---------|------------|---------|
| `saveGraph(graphId, data)` | Save graph to isolated SQLite DB | graphId: string, data: object | Promise<void> |
| `loadGraph(graphId)` | Load graph from isolated DB | graphId: string | Promise<object> |
| `listGraphs()` | List all available graphs | None | Promise<array> |
| `deleteGraph(graphId)` | Delete specific graph DB | graphId: string | Promise<boolean> |
| `importFromJSON(graphId, data)` | Import JSON to isolated DB | graphId: string, data: object | Promise<string> |
| `exportToJSON(graphId)` | Export graph to JSON | graphId: string | Promise<object> |

### Local Graph Filter - Enhanced Filtering System
| Function | Purpose | Parameters | Returns |
|----------|---------|------------|---------|
| `calculateDistances(centerNodeId, maxDistance, maxDepth)` | Enhanced Dijkstra with dual constraints | centerNodeId: string, maxDistance: number, maxDepth: number | Object with distances and depths |
| `filterLocalGraph(centerNodeId, maxDistance, maxDepth)` | Returns filtered subgraph | centerNodeId: string, maxDistance: number, maxDepth: number | Object with filtered nodes and edges |
| `applyLocalGraphFilter(centerNodeId, maxDistance, maxDepth)` | Applies filter and centers view | centerNodeId: string, maxDistance: number, maxDepth: number | boolean success |
| `resetFilter()` | Restores original graph | None | boolean success |
| `getAllNodes()` | Returns node list for search functionality | None | Array of node objects |

### Search System - Intelligent Node Navigation
| Function | Purpose | Parameters | Returns |
|----------|---------|------------|---------|
| `setupSearchComponents()` | Initialize search UI and event handlers | None | void |
| `handleNodeSearch(query, container, type)` | Real-time node search with filtering | query: string, container: HTMLElement, type: string | void |
| `renderSearchResults(results, container, type)` | Display search results with highlighting | results: array, container: HTMLElement, type: string | void |
| `selectAndCenterNode(nodeId)` | Center view on selected node | nodeId: string | void |
| `highlightSearchResults(results)` | Apply visual highlighting to matches | results: array | void |
| `clearNodeHighlighting()` | Remove search highlights | None | void |
| `handleSearchKeydown(e, container, type)` | Keyboard navigation for search results | e: KeyboardEvent, container: HTMLElement, type: string | void |

### View Management System
| Function | Purpose | Parameters | Returns |
|----------|---------|------------|---------|
| `saveViewConfig()` | Save current filter configuration | None | void |
| `loadViewConfig(configId)` | Apply saved filter configuration | configId: string | void |
| `deleteViewConfig(configId)` | Remove saved configuration | configId: string | void |
| `renderQuickAccess()` | Display saved configurations in UI | None | void |

---

## Tricky Solutions & Design Rationale

### 1. Canvas Coordinate Transformation
**Problem**: Mouse coordinates need to account for zoom and pan
**Solution**: Transform coordinates using scale and offset
```javascript
getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left - this.offset.x) / this.scale,
        y: (e.clientY - rect.top - this.offset.y) / this.scale
    };
}
```

### 2. Edge Selection Precision
**Problem**: Selecting thin edges accurately
**Solution**: Distance-to-line calculation with tolerance
```javascript
distanceToLineSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    
    if (len === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
    
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (len * len)));
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    
    return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}
```

### 5. Database Safety Architecture
**Problem**: Auto-save and load operations were causing database file destruction
**Solution**: Manual save only with complete load operation protection

**Critical Fixes**:
```javascript
// Auto-save completely removed - manual save only
// Load operations are now read-only
// New graph creation doesn't overwrite databases

// Safe load operation
function loadGraphData(data) {
    graph.importData(data);  // Read-only operation
    updateGraphInfo();       // Update UI only
    graph.render();          // Render only - no save triggers
}

// Safe new graph creation
async function newGraph() {
    graph.clear();           // Clear canvas only
    // CRITICAL: No database operations performed
    updateGraphInfo();       // Update UI only
}
```

**Benefits**:
- **Zero data loss risk**: No automatic save operations
- **Explicit user control**: All saves require explicit action
- **Database protection**: Load operations never modify source files
- **Clear intent**: User actions have predictable outcomes

### 5. Database-first Storage Architecture

```javascript
// Real-time database persistence
let dbManager = null;
let currentGraphId = null;

async function initializeDatabase() {
    dbManager = new DatabaseManager();
    await dbManager.init();
    
    const graphs = await dbManager.listGraphs();
    if (graphs.length > 0) {
        await loadGraphFromDatabase(graphs[0].id);
    }
}

// Auto-save after changes
async function saveState() {
    const state = graph.exportData();
    appState.undoStack.push(JSON.parse(JSON.stringify(state)));
    
    // Auto-save to database after 1 second delay
    if (dbManager && currentGraphId) {
        clearTimeout(window.saveTimeout);
        window.saveTimeout = setTimeout(async () => {
            await saveGraphToDatabase();
        }, 1000);
    }
}
```
**Benefits**:
- Real-time persistence without user intervention
- No data loss during crashes or browser restarts
- Multiple graph support with database selection dialog
- JSON import/export maintained for backup/sharing
- Automatic migration from existing JSON files

### 6. Edge Weight Visualization
**Problem**: Weight values need visual representation beyond text labels
**Solution**: Non-linear mapping from weight to line thickness using logarithmic scaling
**Two Semantics Supported**:
- **Connection Strength** (v0.1.1): Higher weight = thicker line
- **Distance/Cost** (v0.1.3): Higher weight = thinner line (negative correlation)

```javascript
// Distance/Cost interpretation (negative correlation)
getEdgeLineWidth(weight) {
    const clampedWeight = Math.max(0.1, Math.min(30, weight));
    const logWeight = Math.log(clampedWeight + 0.1) + 2.3;
    const normalized = Math.max(0, Math.min(1, (logWeight - 1.5) / 3.5));
    const invertedNormalized = 1 - normalized;
    return 0.5 + (invertedNormalized * 7.5);
}
```
**Benefits**: 
- Weight 0.1 → 8px (closest/strongest)
- Weight 30 → 0.5px (farthest/weakest)
- Optimized sensitivity for common 0.5-5 range
- Supports both connection strength and distance/cost semantics

### 6. Node Size Customization
**Problem**: All nodes have same radius, limiting visual differentiation
**Solution**: Configurable node radius with slider control in edit dialog
```javascript
addNode(x, y, label, color, category, radius) {
    const node = {
        radius: Math.max(1, Math.min(100, radius || 20))
        // ... other properties
    };
}
```
**Benefits**:
- Radius range: 1px to 100px
- Default: 20px for new nodes
- Real-time preview with slider control
- Proportional scaling with zoom level

### 7. Local Graph Filtering System
**Problem**: Large graphs become unwieldy, users need focus on specific subgraphs
**Solution**: Distance-based filtering with enhanced Dijkstra algorithm and dual constraints
```javascript
calculateDistances(centerNodeId, maxDistance, maxDepth) {
    const distances = new Map();
    const depths = new Map();
    const queue = new PriorityQueue();
    
    // Initialize with center node
    queue.enqueue(centerNodeId, 0, 0);
    distances.set(centerNodeId, 0);
    depths.set(centerNodeId, 0);
    
    while (!queue.isEmpty()) {
        const { nodeId, distance, depth } = queue.dequeue();
        
        // Explore neighbors with bidirectional edge support
        this.getNeighbors(nodeId).forEach(neighbor => {
            const edgeWeight = this.getEdgeWeight(nodeId, neighbor);
            const newDistance = distance + edgeWeight;
            const newDepth = depth + 1;
            
            // Apply dual constraint logic (OR-based)
            if (newDistance <= maxDistance || newDepth <= maxDepth) {
                if (!distances.has(neighbor) || newDistance < distances.get(neighbor)) {
                    distances.set(neighbor, newDistance);
                    depths.set(neighbor, newDepth);
                    queue.enqueue(neighbor, newDistance, newDepth);
                }
            }
        });
    }
    
    return { distances, depths };
}
```
**Benefits**:
- **Dual Constraints**: Distance OR depth filtering for flexible subgraph exploration
- **Bidirectional Support**: All edges treated as bidirectional for comprehensive exploration
- **Performance**: O(n log n) complexity with efficient priority queue implementation
- **Real-time Updates**: Immediate visual feedback when parameters change
- **Persistent Storage**: Saved configurations persist across sessions
- **User Experience**: Intuitive UI with sliders and dropdowns

### 8. View Configuration Management
**Problem**: Users need to save and quickly access frequently used filter combinations
**Solution**: Local storage-based configuration system with quick access panel
```javascript
function saveViewConfig() {
    const config = {
        id: 'view-' + Date.now(),
        name: `${centerNode.label} (D:${maxDistance}, H:${maxDepth})`,
        centerNodeId: centerNodeId,
        maxDistance: maxDistance,
        maxDepth: maxDepth,
        timestamp: new Date().toISOString()
    };
    
    appState.quickAccess.push(config);
    localStorage.setItem('graphQuickAccess', JSON.stringify(appState.quickAccess));
}
```
**Benefits**:
- **One-click Access**: Saved configurations available instantly
- **Persistent Storage**: Survives browser restarts and reloads
- **Limited History**: Keeps only 10 most recent configurations to prevent clutter
- **Descriptive Naming**: Auto-generated names show key parameters
- **Easy Management**: Simple add/remove operations with visual feedback

### 3. Mode-Based Interaction
**Problem**: Different tools need different behaviors
**Solution**: State machine with mode switching
```javascript
handleMouseDown(e) {
    switch (this.mode) {
        case 'node':
            if (!node) this.addNode(pos.x, pos.y);
            break;
        case 'edge':
            if (node) this.handleEdgeMode(node);
            break;
        case 'select':
            if (node) this.startDrag(node);
            else this.startPan();
            break;
    }
}
```

### 4. Infinite Undo/Redo
**Problem**: Efficient state management for undo/redo
**Solution**: Stack-based state snapshots with size limits
```javascript
saveState() {
    const state = this.exportData();
    this.undoStack.push(state);
    if (this.undoStack.length > this.maxHistorySize) {
        this.undoStack.shift();
    }
    this.redoStack = [];
}
```

---

## Key Use Cases & Workflows

### 1. Creating a Simple Graph
```
Click node mode → Click canvas to add nodes → Switch to edge mode → 
Click nodes to connect → Switch to select mode → Drag nodes to arrange
```

### 2. Editing Graph Properties
```
Right-click node → Edit label/color/category → Click OK → Graph updates
Right-click edge → Edit weight/category → Click OK → Graph updates
```

### 3. Working with Categories
```
Add nodes with different categories → Color-code by category → 
Filter views → Export categorized graphs
```

### 4. Database-First Workflow
```
Initialize database → Auto-load recent graph → Make changes → 
Auto-save to database → Browse graphs → Continue editing → No data loss
```

### 5. JSON Import/Export Workflow
```
Create graph → Auto-save to database → Export JSON for sharing → 
Import JSON to database → Continue editing → All data persisted
```

### 6. Server Mode Workflow
```
Start server → Database initialized → Real-time persistence → 
Graph selection dialog → Multiple graph support → API access → Statistics
```

### 7. Local Graph Filtering Workflow
```
Load graph → Select center node → Set distance/depth parameters → 
Apply filter → View subgraph → Save configuration → Quick access for future use
```

### 8. View Management Workflow
```
Create filter configuration → Save with descriptive name → 
Access from quick access panel → Apply with one click → 
Manage saved configurations → Delete unused views
```

### 9. Search Navigation Workflow
```
Press 'F' key → Type node name → See real-time results → 
Use arrow keys to navigate → Press Enter to select → 
View centers on selected node → Clear search to reset
```

### 10. Large Graph Filtering Workflow
```
Load graph with thousands of nodes → Use search to find center → 
Set distance/depth parameters → Apply filter → 
View focused subgraph → Save configuration → 
Access saved view with one click later
```

---

## Code Conventions

### JavaScript Style
- **ES6+ features**: const/let, arrow functions, template literals
- **Error handling**: Graceful fallbacks for browser APIs
- **Naming**: camelCase for variables, PascalCase for constructors
- **Comments**: JSDoc for public methods, inline for complex logic

### Canvas Rendering
- **Coordinate system**: Top-left origin (0,0), positive Y downward
- **Scaling**: Scale affects line widths and font sizes
- **Colors**: Hex codes preferred, CSS color names acceptable
- **Grid**: 20px grid spacing with light gray lines

### Data Structures
- **Nodes**: `{id, x, y, label, color, radius, category}`
- **Edges**: `{id, from, to, weight, category}`
- **Graph export**: `{nodes, edges, scale, offset}`

---

## Naming Conventions

### File Naming
- **Core modules**: kebab-case (graph.js, app.js, server.js)
- **Static assets**: kebab-case (styles.css, index.html)
- **Data files**: kebab-case with timestamp (graph-20250115.json)

### CSS Classes
- **Components**: `.toolbar`, `.canvas-container`, `.dialog`
- **States**: `.active`, `.hidden`, `.selected`
- **Modifiers**: `.btn-primary`, `.btn-secondary`

### JavaScript Variables
- **DOM elements**: camelCase ($canvas, $toolbar)
- **State variables**: camelCase (selectedNode, currentMode)
- **Constants**: UPPER_SNAKE_CASE (GRID_SIZE, MAX_HISTORY)

---

## Module Details

### Graph Core Engine
**High-performance graph rendering with interaction handling:**

```javascript
// Rendering pipeline
render() {
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.ctx.save();
    this.ctx.translate(offset.x, offset.y);
    this.ctx.scale(scale, scale);
    
    renderGrid();
    renderEdges();
    renderNodes();
    
    this.ctx.restore();
}
```

**Performance features:**
- **Efficient hit detection**: Distance calculations with early exit
- **Viewport culling**: Only render visible elements
- **State caching**: Avoid redundant calculations
- **Event throttling**: Limit render calls during interaction

### Mode Management System
**State machine for different interaction modes:**

```javascript
const modes = {
    node: {
        cursor: 'crosshair',
        onClick: addNode,
        onDrag: null
    },
    edge: {
        cursor: 'pointer',
        onClick: startEdge,
        onDrag: null
    },
    select: {
        cursor: 'default',
        onClick: selectElement,
        onDrag: moveElement
    }
};
```

### Binary UUID Storage
**Optimized storage with binary UUID format:**

```javascript
// UUID conversion utilities for space efficiency
function uuidToBuffer(uuid) {
    const hex = uuid.replace(/-/g, '');
    return Buffer.from(hex, 'hex');
}

function bufferToUuid(buffer) {
    const hex = buffer.toString('hex');
    return `${hex.substr(0, 8)}-${hex.substr(8, 4)}-${hex.substr(12, 4)}-${hex.substr(16, 4)}-${hex.substr(20, 12)}`;
}

// Space-efficient storage (16 bytes vs 36 bytes)
const uuidBuffer = uuidToBuffer('019886c9-0230-759c-a350-777ce83ba835');
// Stores as: <Buffer 01 98 86 c9 02 30 75 9c a3 50 77 7c e8 3b a8 35>
```

### Data Persistence
**SQLite database with JSON backup support and binary UUID storage:**

```javascript
// Real-time database storage with binary UUIDs
const dbManager = new DatabaseManager();
await dbManager.init();
await dbManager.saveGraph(currentGraphId, graph.exportData());

// Auto-save functionality
async function saveState() {
    const state = graph.exportData();
    await saveGraphToDatabase();  // Auto-save after 1s delay
    appState.undoStack.push(JSON.parse(JSON.stringify(state)));
}

// JSON backup/export
const data = await dbManager.exportToJSON(currentGraphId);
const blob = new Blob([JSON.stringify(data)], {type: 'application/json'});
const a = document.createElement('a');
a.href = URL.createObjectURL(blob);
a.download = `graph-${Date.now()}.json`;
a.click();
```

### SVG Export Engine
**Vector graphics generation with scaling:**

```javascript
generateSVG() {
    const bounds = calculateBounds();
    const scale = calculateScale(bounds);
    const offset = calculateOffset(bounds, scale);
    
    let svg = '<svg xmlns="http://www.w3.org/2000/svg" ...>';
    
    // Render edges as lines
    edges.forEach(edge => {
        const from = transformPoint(edge.from, scale, offset);
        const to = transformPoint(edge.to, scale, offset);
        svg += `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" />`;
    });
    
    // Render nodes as circles
    nodes.forEach(node => {
        const pos = transformPoint(node, scale, offset);
        svg += `<circle cx="${pos.x}" cy="${pos.y}" r="${node.radius * scale}" />`;
    });
    
    return svg + '</svg>';
}
```

---

## Performance Considerations

### Runtime Performance
- **Canvas optimization**: Use requestAnimationFrame for smooth rendering
- **Event delegation**: Single event listeners for canvas interactions
- **Memory management**: Clear references to prevent leaks
- **Efficient algorithms**: O(n) node/edge lookup with spatial indexing

### Startup Performance
- **Lazy initialization**: Create dialogs only when needed
- **Progressive enhancement**: Core features work without server
- **Minimal dependencies**: Pure JavaScript, no external libraries

### Scalability
- **Node limits**: Performance tested up to 1000 nodes
- **Undo limits**: Configurable history size (default 50)
- **Export limits**: SVG generation handles large graphs efficiently