/**
 * Portable Local Graph - Modular Architecture
 * Main module exports
 */

// Core components
export { GraphData } from './core/graph-data.js';
export { Graph } from './core/graph.js';

// Utility modules
export * from './utils/constants.js';
export * from './utils/geometry.js';
export * from './utils/algorithms.js';

// Rendering modules
export { GraphRenderer } from './rendering/graph-renderer.js';
export * from './rendering/styles.js';

// Analysis modules
export { PathfindingEngine } from './analysis/pathfinding-engine.js';

// Legacy compatibility
export { Graph as LegacyGraph } from '../graph.js';