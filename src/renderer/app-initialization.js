// Application initialization module - Graph initialization
let uuidv7;

// Initialize UUID generation
try {
    const { v7 } = require('uuid');
    uuidv7 = v7;
} catch (error) {
    console.log('UUID not available in browser context, using fallback');
    uuidv7 = () => 'fallback-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// Initialize the graph object
function initializeGraph() {
    console.log('Initializing graph...');
    const canvas = document.getElementById('graph-canvas');
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }
    
    if (typeof Graph === 'undefined') {
        console.error('Graph class not loaded');
        return;
    }
    
    // Ensure appState.showEdgeArrows is initialized
    if (typeof appState.showEdgeArrows === 'undefined') {
        appState.showEdgeArrows = false;
        console.log('Initialized appState.showEdgeArrows to false');
    }
    
    window.graph = new Graph(canvas, {
        mode: appState.mode,
        onModeChange: (mode) => setMode(mode),
        onGraphUpdate: updateGraphInfo,
        onSelectionChange: updateGraphInfo
    });
    
    console.log('Graph initialized successfully');
    console.log('appState.showEdgeArrows:', appState.showEdgeArrows);
    
    // Start animation loop for highlighted nodes
    if (graph && typeof graph.startAnimationLoop === 'function') {
        graph.startAnimationLoop();
        console.log('Animation loop started');
    }
}

// Export globals for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initializeGraph, uuidv7 };
} else {
    window.initializeGraph = initializeGraph;
    window.uuidv7 = uuidv7;
}