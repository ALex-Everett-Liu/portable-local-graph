/**
 * Updated Graph.js - Uses the new modular architecture
 * This file replaces the original graph.js with backward compatibility
 */
import { Graph } from './js/core/graph-compatibility.js';

// Export the new Graph class with full backward compatibility
export { Graph };

// Global assignment for existing code that expects Graph in global scope
if (typeof window !== 'undefined') {
    window.Graph = Graph;
}

// For CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Graph };
}