// Application state management
// Ensure global appState exists before anything else
if (typeof window !== 'undefined' && !window.appState) {
    window.appState = {
        mode: 'node', // 'node', 'edge', 'select'
        edgeStart: null,
        selectedNode: null,
        selectedEdge: null,
        undoStack: [],
        redoStack: [],
        maxHistorySize: 50,
        isModified: false,
        isFiltered: false,
        showEdgeArrows: false, // Toggle for displaying edge direction arrows
        filterParams: {
            centerNodeId: null,
            maxDistance: 10,
            maxDepth: 3
        },
        quickAccess: []
    };
}

// Create a global reference for module systems
const appState = (typeof window !== 'undefined') ? window.appState : {
    mode: 'node',
    edgeStart: null,
    selectedNode: null,
    selectedEdge: null,
    undoStack: [],
    redoStack: [],
    maxHistorySize: 50,
    isModified: false,
    isFiltered: false,
    showEdgeArrows: false,
    filterParams: {
        centerNodeId: null,
        maxDistance: 10,
        maxDepth: 3
    },
    quickAccess: []
};

console.log('appState initialized globally with showEdgeArrows:', appState.showEdgeArrows);

// Export app state for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { appState };
} else if (typeof window !== 'undefined') {
    window.appState = appState;
}