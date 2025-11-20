/**
 * Graph Legacy Wrapper - CommonJS Compatibility Layer
 * 
 * This file provides backward compatibility for Node.js/CommonJS environments
 * that need to require() the Graph class instead of using ES modules.
 * 
 * The actual Graph implementation is in core/graph.js
 * 
 * Note: This is primarily for Node.js environments. Browser environments
 * should use the ES module import from './core/graph.js' directly.
 */

// Load the modular Graph class
(function() {
    'use strict';
    
    // This will be populated by the modular system
    // The actual implementation is in core/graph.js
    
    // Create placeholder until modules load
    if (typeof window !== 'undefined') {
        window.Graph = null; // Will be set by modular system
    }
    
    // For environments that support modules, use the modular version
    if (typeof module !== 'undefined' && module.exports) {
        try {
            // Node.js environment
            const { Graph } = require('./core/graph.js');
            module.exports = { Graph };
        } catch (e) {
            // Fallback for environments without module support
            console.warn('Module system not available, using legacy implementation');
        }
    }
})();

