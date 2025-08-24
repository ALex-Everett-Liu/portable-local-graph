/**
 * Portable Local Graph - Modular Architecture
 * Main module exports
 */

// Core components
export { GraphData } from './core/graph-data.js';
export { ExportManager } from './core/export-manager.js';
export { Graph } from './core/graph-compatibility.js';

// Utility modules
export * from './utils/constants.js';
export * from './utils/geometry.js';
export * from './utils/algorithms.js';

// Rendering modules
export { GraphRenderer } from './rendering/graph-renderer.js';
export * from './rendering/styles.js';

// Analysis modules
export { GraphAnalysis } from './analysis/graph-analysis.js';
export { CentralityCalculator } from './analysis/centrality-calculator.js';
export { PathfindingEngine } from './analysis/pathfinding-engine.js';

// Filtering modules
export { GraphFilter } from './filtering/graph-filter.js';
export { FilterStateManager } from './filtering/filter-state-manager.js';

// Legacy compatibility
export { Graph as LegacyGraph } from '../graph.js';