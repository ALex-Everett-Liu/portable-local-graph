/**
 * Graph.js - Legacy compatibility wrapper
 * This file provides backward compatibility by loading the modular architecture
 */

// Load the modular Graph class
(function() {
    'use strict';
    
    // This will be populated by the modular system
    // The actual implementation is in js/core/graph-compatibility.js
    
    // Create placeholder until modules load
    if (typeof window !== 'undefined') {
        window.Graph = null; // Will be set by modular system
    }
    
    // For environments that support modules, use the modular version
    if (typeof module !== 'undefined' && module.exports) {
        try {
            // Node.js environment
            const { Graph } = require('./js/core/graph-compatibility.js');
            module.exports = { Graph };
        } catch (e) {
            // Fallback for environments without module support
            console.warn('Module system not available, using legacy implementation');
        }
    }
})();