// Application state management
const appState = {
    mode: 'node', // 'node', 'edge', 'select'
    edgeStart: null,
    selectedNode: null,
    selectedEdge: null,
    undoStack: [],
    redoStack: [],
    maxHistorySize: 50,
    isModified: false,
    isFiltered: false,
    filterParams: {
        centerNodeId: null,
        maxDistance: 10,
        maxDepth: 3
    },
    quickAccess: []
};

// Export app state for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { appState };
} else {
    window.appState = appState;
}