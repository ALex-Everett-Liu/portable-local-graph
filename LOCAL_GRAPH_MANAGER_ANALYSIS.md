# Local Graph Manager Analysis: Distance-Based Graph Filtering

## Overview

The system implements a sophisticated distance-based graph visualization that combines frontend interactive controls (`localGraphManager.js`) with backend filtering logic (`localGraphController.js`) to explore subgraphs centered around specific nodes. It filters nodes using both **distance** (total link weight) and **depth** (hop count) with an OR-based constraint system.

## Complete System Architecture

### Frontend-Backend Integration

#### 1. Parameter Definition
- **maxDistance**: Maximum total link weight distance from center (default: 5)
- **maxDepth**: Maximum hop count from center (default: 3)
- **Constraint Logic**: OR-based (node included if distance ≤ maxDistance OR depth ≤ maxDepth)

#### 2. API Integration
The frontend makes REST API calls to the backend controller:

```javascript
// Frontend call (localGraphManager.js:645)
const response = await fetch(`/api/local-graph/center/${centerNodeId}?maxDistance=${maxDistance}&maxDepth=${maxDepth}`);

// Backend endpoint (localGraphController.js:124)
exports.getLocalGraph = async (req, res) => { ... }
```

#### 3. Response Data Structure
```javascript
{
  centerNode: { id, content, content_zh, ... },
  nodes: [ { id, content, content_zh, ... } ],
  links: [ { id, from_node_id, to_node_id, weight, description } ],
  distances: { nodeId: distanceValue },
  depths: { nodeId: depthLevel },
  stats: { nodeCount, linkCount, maxDistance, maxDepth }
}
```

## Backend Filtering Implementation

### Core Algorithm: Enhanced Dijkstra with Dual Constraints

#### 1. Distance Calculation (`localGraphController.js:16-84`)

```javascript
function calculateDistances(centerNodeId, links, maxDistance = 10, maxDepth = 5) {
  // Uses modified Dijkstra's algorithm with OR constraint logic
  // Key innovation: includes nodes that satisfy EITHER distance OR depth constraint
}
```

**Algorithm Details:**
- **Data Structures**: Uses priority queue sorted by distance
- **Bidirectional Links**: Treats all links as bidirectional for traversal
- **Dual Tracking**: Simultaneously tracks both distance and depth from center
- **OR Constraint Logic**: 
  - Includes node if `distance ≤ maxDistance OR depth ≤ maxDepth`
  - More inclusive than AND-based filtering

#### 2. Caching System (`localGraphController.js:89-119`)

```javascript
// Cache key includes all parameters for accurate caching
const cacheKey = `${centerNodeId}-${maxDistance}-${maxDepth}`;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
```

**Cache Benefits:**
- Reduces computational overhead for repeated queries
- Invalidates cache when links are modified
- Improves responsiveness for common parameter combinations

#### 3. Distance Calculation Process

1. **Graph Construction**: Builds bidirectional adjacency list from all links
2. **Dijkstra Execution**: Modified to track both distance and depth
3. **Constraint Application**: Applies OR-based filtering during traversal
4. **Result Compilation**: Returns both distances and depths for all reachable nodes

### Backend Filtering Steps

#### Step 1: Graph Traversal
```javascript
// Initialize with center node
const queue = [{ nodeId: centerNodeId, distance: 0, depth: 0 }];

// Modified inclusion criteria
if ((newDistance <= maxDistance || newDepth <= maxDepth) && 
    (!distances.has(neighbor.nodeId) || newDistance < distances.get(neighbor.nodeId))) {
  // Include this neighbor
}
```

#### Step 2: Node Selection
- **Primary Filter**: Uses calculated distances/depths to determine inclusion
- **Secondary Filter**: Ensures both endpoints of links are included
- **Edge Cases**: Handles isolated center nodes gracefully

#### Step 3: Data Assembly
- **Node Retrieval**: Fetches complete node data for all included IDs
- **Link Filtering**: Returns only links between included nodes
- **Metadata**: Provides comprehensive statistics about the filtered subgraph

## Frontend Visualization Integration

### 1. Hybrid Layout System
The frontend implements a sophisticated visualization that combines the backend's distance/depth data with an adaptive layout:

#### Layout Strategy
- **Depth 1-2**: Fixed concentric circles (1:2 radius ratio)
- **Depth > 2**: Distance-based positioning with boundary constraints
- **Progressive Enhancement**: Builds readable structure from topological constraints

#### Visualization Algorithm (`localGraphManager.js:2935-3248`)

```javascript
calculateHybridLayout(nodes, links, distances, depths, centerX, centerY, maxRadius)
```

**Key Components:**
1. **Depth Assignment**: Uses backend-provided depths for topological accuracy
2. **Weight Scaling**: Adapts positioning based on global average link weights
3. **Constraint Enforcement**: Ensures depth separation while maintaining readability
4. **Refinement**: Uses force-directed techniques to optimize final positions

### 2. Interactive Features

#### Real-time Parameter Adjustment
- **Dynamic Reload**: Parameter changes trigger immediate backend recalculation
- **Smooth Transitions**: Visual updates maintain user context
- **Caching Integration**: Leverages backend caching for responsive updates

#### Search and Navigation
- **In-Graph Search**: Filters nodes within current subgraph
- **Node Highlighting**: Locates and emphasizes specific nodes
- **Zoom/Pan Controls**: Enables detailed exploration of complex subgraphs

## Constraint System Deep Dive

### OR-Based vs AND-Based Filtering

#### Traditional AND Approach (NOT used)
```javascript
// Would exclude nodes that exceed either constraint
if (distance > maxDistance || depth > maxDepth) continue;
```

#### Implemented OR Approach (USED)
```javascript
// Includes nodes that satisfy either constraint
if (distance <= maxDistance || depth <= maxDepth) {
  // Include this node
}
```

**Benefits of OR Logic:**
- **More Inclusive**: Captures important nearby nodes even if distant by weight
- **Better Coverage**: Ensures minimum hop visibility regardless of path weights
- **User-Friendly**: Provides more comprehensive subgraph views

### Distance vs Depth Interpretation

#### Distance (Weighted Path Length)
- **Calculation**: Sum of link weights along shortest path
- **Interpretation**: Represents "cost" or "effort" to reach node
- **Usage**: Filters by relationship strength/cost
- **Example**: Weight 0.1 = close (8px line), Weight 30 = distant (0.5px line)

#### Depth (Hop Count)
- **Calculation**: Minimum number of edges from center
- **Interpretation**: Represents topological distance
- **Usage**: Filters by structural proximity
- **Example**: Depth 1 = direct neighbors, Depth 3 = 3 hops away

## Performance Optimizations

### 1. Backend Optimizations
- **Caching**: 30-minute cache for distance calculations
- **Efficient Queries**: Batch node retrieval using IN clauses
- **Memory Management**: Clears cache on link modifications

### 2. Frontend Optimizations
- **Progressive Rendering**: Depth-based positioning prevents overcrowding
- **Visual Constraints**: Boundary enforcement maintains clarity
- **Caching Integration**: Respects backend caching for responsive updates

### 3. Network Efficiency
- **Minimal Data Transfer**: Only sends relevant subgraph data
- **Efficient JSON**: Uses object maps for O(1) distance/depth lookups
- **Batch Operations**: Combines multiple queries in single requests

## Usage Flow

### 1. Initial Setup
```javascript
// Backend prepares distance/depth data
const { distances, depths } = calculateDistances(centerNodeId, links, maxDistance, maxDepth);

// Frontend receives and visualizes
const graphData = await getLocalGraph(centerNodeId, maxDistance, maxDepth);
```

### 2. Parameter Adjustment
```javascript
// User changes parameters
LocalGraphManager.maxDistance = 8.5;
LocalGraphManager.maxDepth = 5;

// Backend recalculates with caching
const newData = await getLocalGraph(centerNodeId, 8.5, 5);
```

### 3. Interactive Exploration
```javascript
// Frontend uses backend data for layout
calculateHybridLayout(nodes, links, distances, depths, ...);
```

## Integration Points

### Backend Endpoints
- **`GET /api/local-graph/center/:nodeId`** - Main filtering endpoint
- **`POST /api/local-graph/nodes`** - Create nodes with links
- **`GET /api/local-graph/quick-access`** - User preference caching
- **`POST /api/local-graph/quick-access`** - Save parameter combinations

### Frontend Integration
- **Seamless API Calls**: Automatic parameter passing and response handling
- **Caching Awareness**: Respects backend cache invalidation
- **Error Handling**: Graceful handling of edge cases (empty graphs, isolated nodes)

## Advanced Features

### 1. Quick Access System
- **User Preferences**: Stores frequently used center nodes with parameters
- **Usage Tracking**: Monitors which combinations users prefer
- **Smart Suggestions**: Provides contextual recommendations based on usage patterns

### 2. Pool Integration
- **Local Graph Context**: Maintains connection to broader knowledge graph
- **Add/Remove Operations**: Seamless integration with main outliner
- **Visual Indicators**: Shows pool status within local graph views

### 3. Transaction Safety
- **Atomic Operations**: Node creation and linking in single transactions
- **Cache Invalidation**: Automatic cache clearing on data modifications
- **Rollback Support**: Maintains data consistency across operations

This system provides a powerful, performant way to explore knowledge graphs by intelligently filtering subgraphs while maintaining both weighted relationship semantics (distance) and topological structure (depth).

## Visualization Architecture

### 1. Hybrid Layout System
The system uses a sophisticated "hybrid concentric" layout:

#### Inner Structure (Depths 1-2)
- **Depth 1**: Nodes exactly 1 hop away, placed on inner circle
- **Depth 2**: Nodes exactly 2 hops away, placed on outer circle
- **Fixed 1:2 ratio**: Depth 1 radius is exactly half of Depth 2 radius

#### Outer Structure (Depth > 2)
- **Distance-based positioning**: Nodes positioned based on actual weighted distances
- **Constrained placement**: Ensures nodes are placed outside the depth 2 circle
- **Crossing minimization**: Reduces link crossings for better readability

### 2. Layout Algorithm

```javascript
calculateHybridLayout(nodes, links, distances, centerX, centerY, maxRadius)
```

#### Step 1: Depth Assignment
- Uses BFS starting from center node
- Assigns each node its minimum hop count from center
- Stores depths in `graphData.depths` object

#### Step 2: Weight Calculation
- Computes global average link weight for scaling
- Determines appropriate radius scaling factors

#### Step 3: Positioning Strategy

**For Depths 1-2 (Concentric Circles):**
- **Depth 1**: Fixed radius = 80 pixels (with scaling)
- **Depth 2**: Fixed radius = 160 pixels (exactly 2x depth 1)
- Uses crossing minimization to optimize angular placement

**For Depth > 2 (Distance-based):**
- **Scale factor**: 40 pixels per weight unit
- **Constraint enforcement**: All nodes must be outside depth 2 circle
- **Progressive positioning**: Nodes positioned incrementally by depth level

#### Step 4: Refinement
- **Force-directed refinement**: Adjusts positions to optimize edge lengths
- **Boundary enforcement**: Ensures depth separation is maintained
- **Collision avoidance**: Prevents node overlaps

### 3. Visual Guides
The system adds subtle visual guides:
- **Concentric circles**: Light dotted circles showing depth boundaries
- **Depth labels**: Text indicators for each depth level
- **Color coding**: Nodes colored by their distance from center

## User Interface Flow

### 1. Center Node Selection
- Search interface for selecting center node from pool
- Quick access to frequently used center nodes
- Real-time parameter adjustment (maxDistance, maxDepth)

### 2. Graph Exploration
- Interactive SVG visualization with zoom/pan
- Node dragging capabilities
- Right-click context menus for node operations
- Search within current graph

### 3. Real-time Updates
- Parameter changes trigger immediate graph reload
- Automatic recalculation of distances and depths
- Smooth transitions between different center nodes

## Advanced Features

### 1. Pool Status Integration
- Tracks which nodes are in the local graph pool
- Visual indicators (silver rings) for pool nodes
- Quick add/remove operations

### 2. Centrality Metrics
- Fetches global centrality data for selected nodes
- Displays both local (distance/depth) and global metrics
- Provides comprehensive node analysis

### 3. SVG Export
- Exports current filtered view as SVG
- Maintains all visual styling and layout
- Preserves node positions and link relationships

## Performance Optimizations

### 1. Efficient Filtering
- Backend performs all distance/depth calculations
- Only transfers relevant subgraph data
- Minimizes client-side processing

### 2. Progressive Rendering
- Depth-based positioning prevents overcrowding
- Boundary constraints maintain visual clarity
- Crossing minimization improves readability

### 3. Caching System
- Quick access storage for frequently used center nodes
- Parameter combinations cached for faster access
- Usage tracking for optimization

## Integration Points

### 1. Backend API Requirements
- `/api/local-graph/center/:nodeId` - Main filtering endpoint
- `/api/local-graph/pool/search` - Pool node search
- `/api/local-graph/quick-access` - Quick access management
- `/api/global-graph/nodes/:nodeId/centrality` - Centrality data

### 2. Frontend Integration
- Seamless integration with outliner interface
- Bidirectional communication with main application
- Consistent styling and user experience

## Usage Examples

### Basic Exploration
```javascript
// Select center node and explore with default parameters
LocalGraphManager.selectCenterNode('node123', 'My Topic');
LocalGraphManager.exploreGraph();
```

### Advanced Filtering
```javascript
// Explore with custom parameters
LocalGraphManager.maxDistance = 8.5;
LocalGraphManager.maxDepth = 5;
LocalGraphManager.exploreGraph();
```

### Search Integration
```javascript
// Search for nodes within current graph
LocalGraphManager.handleGraphNodeSearch({ target: { value: 'search term' } });
```

## Key Design Decisions

1. **Dual Constraint System**: Combines distance and depth for precise filtering
2. **Hybrid Layout**: Balances readability (concentric) with accuracy (distance-based)
3. **Backend Processing**: Moves heavy calculations to server for performance
4. **Progressive Enhancement**: Builds from simple to complex positioning
5. **User Control**: Provides intuitive parameter adjustment interfaces

This system provides a powerful way to explore knowledge graphs by focusing on relevant subgraphs while maintaining both topological structure (depth) and weighted relationship semantics (distance).