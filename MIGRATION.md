# Migration Guide: Modular Graph Architecture

## Overview
This guide helps migrate from the monolithic `Graph` class to the new modular architecture while maintaining full backward compatibility.

## Changes Made

### 1. New Directory Structure
```
js/
├── core/
│   ├── graph-data.js          # Core data structure
│   ├── export-manager.js      # Export functionality
│   └── graph-compatibility.js # Backward-compatible Graph class
├── utils/
│   ├── constants.js           # Visual defaults
│   ├── geometry.js            # Geometry utilities
│   └── algorithms.js          # Algorithm utilities
├── rendering/
│   ├── graph-renderer.js      # Canvas rendering engine
│   └── styles.js              # Visual style calculations
├── analysis/
│   ├── graph-analysis.js      # Main analysis coordinator
│   ├── centrality-calculator.js # Centrality computations
│   └── pathfinding-engine.js  # Pathfinding algorithms
├── filtering/
│   ├── graph-filter.js        # Core filtering operations
│   └── filter-state-manager.js # State management with undo/redo
└── index.js                   # Module exports
```

### 2. Backward Compatibility
The new architecture maintains 100% API compatibility with the original `Graph` class. All existing code should continue to work without changes.

### 3. Usage

#### Original Usage (Still Works)
```javascript
import { Graph } from './graph-updated.js';
// or
const graph = new Graph(canvas, options);
```

#### New Modular Usage
```javascript
// Import specific components
import { GraphData, GraphAnalysis, GraphRenderer } from './js/index.js';

// Use individual components
const graphData = new GraphData();
const analysis = new GraphAnalysis();
const renderer = new GraphRenderer(canvas, graphData);
```

### 4. Key Improvements

#### Performance
- **Caching**: Analysis results are cached for 5 seconds
- **Efficient lookups**: Maps and Sets for O(1) operations
- **Lazy loading**: Components only initialized when needed

#### Features
- **Undo/Redo**: Full state management for filtering
- **Presets**: Save and load filter configurations
- **Export formats**: JSON, SVG, CSV, GraphML
- **Advanced analysis**: All centrality measures, pathfinding, bridges, articulation points

#### Architecture
- **Separation of concerns**: Clean boundaries between data, rendering, analysis, and filtering
- **Event-driven**: Components communicate via events
- **Extensible**: Easy to add new features without touching core code

### 5. Migration Steps

#### For Existing Projects
No changes needed! The new `graph-updated.js` provides full backward compatibility.

#### For New Projects
```javascript
// Recommended approach
import { Graph } from './js/core/graph-compatibility.js';
const graph = new Graph(canvas, options);

// Or use specific modules
import { GraphData, GraphRenderer, GraphAnalysis } from './js/index.js';
```

### 6. New Features Available

#### Filter Management
```javascript
// Save filter preset
graph.filterStateManager.savePreset('my-filter');

// Load filter preset
graph.filterStateManager.loadPreset('my-filter');

// Undo/Redo
graph.filterStateManager.undo();
graph.filterStateManager.redo();
```

#### Advanced Export
```javascript
// Export as SVG
const svg = graph.exportManager.exportSVG();

// Export as GraphML
const graphml = graph.exportManager.exportGraphML();

// Export nodes as CSV
const csv = graph.exportManager.exportNodesCSV();
```

#### Advanced Analysis
```javascript
// Get all centrality measures
const centralities = graph.graphAnalysis.calculateCentralities();

// Find shortest path
const path = graph.graphAnalysis.findShortestPath('node1', 'node2');

// Find bridges
const bridges = graph.graphAnalysis.findBridges();
```

### 7. Performance Monitoring

#### Cache Statistics
```javascript
const cacheStats = graph.graphAnalysis.getCacheStats();
console.log('Cache size:', cacheStats.size);
```

#### Graph Validation
```javascript
const validation = graph.graphData.validate();
console.log('Graph valid:', validation.valid);
```

### 8. Troubleshooting

#### Common Issues
1. **Import errors**: Ensure all new files are loaded
2. **Missing methods**: Check that you're using the updated `graph-updated.js`
3. **Performance**: Enable caching for large graphs

#### Debug Mode
```javascript
// Enable debug logging
graph.graphAnalysis.setCacheTimeout(1000); // 1 second cache
```

### 9. Future Enhancements
The modular architecture makes it easy to add:
- Layout algorithms (force-directed, circular, hierarchical)
- Real-time collaboration
- Advanced styling
- Plugin system
- WebGL rendering

## Files to Update
- Replace `graph.js` with `graph-updated.js`
- All existing functionality remains unchanged
- New features are available immediately