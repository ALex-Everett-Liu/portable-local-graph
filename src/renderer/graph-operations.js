// Graph operations and state management

// Set application mode
function setMode(mode) {
    appState.mode = mode;
    appState.edgeStart = null;
    
    // Update graph mode
    if (graph) {
        graph.mode = mode;
        graph.edgeStart = null;
    }
    
    // Update UI
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`${mode}-mode`).classList.add('active');
    
    updateGraphInfo();
    
    // Update cursor
    const canvas = document.getElementById('graph-canvas');
    switch (mode) {
        case 'node':
            canvas.style.cursor = 'crosshair';
            break;
        case 'edge':
            canvas.style.cursor = 'pointer';
            break;
        case 'select':
            canvas.style.cursor = 'default';
            break;
    }
}

// Save current state for undo/redo
async function saveState() {
    const state = graph.exportData();
    appState.undoStack.push(JSON.parse(JSON.stringify(state))); // Deep copy
    
    // Limit undo stack size
    if (appState.undoStack.length > appState.maxHistorySize) {
        appState.undoStack.shift();
    }
    
    // Clear redo stack when new action is performed
    appState.redoStack = [];
    
    appState.isModified = true;
    
    // Auto-save completely removed - manual save only!
}

// Undo last action
function undo() {
    if (appState.undoStack.length > 0) {
        const currentState = graph.exportData();
        appState.redoStack.push(currentState);
        
        const previousState = appState.undoStack.pop();
        graph.importData(previousState);
        
        updateGraphInfo();
    }
}

// Redo last undone action
function redo() {
    if (appState.redoStack.length > 0) {
        const currentState = graph.exportData();
        appState.undoStack.push(currentState);
        
        const nextState = appState.redoStack.pop();
        graph.importData(nextState);
        
        updateGraphInfo();
    }
}

// Create new graph
async function newGraph() {
    if (appState.isModified) {
        if (!confirm('Current graph has unsaved changes. Continue?')) {
            return;
        }
    }
    
    graph.clear();
    appState.undoStack = [];
    appState.redoStack = [];
    appState.isModified = false;
    
    updateGraphInfo();
    // CRITICAL: Do NOT save to current database when creating new graph!
    // This prevents destroying the current database file
    console.log('[newGraph] Created new graph without saving - use Save As for new database');
}

// Clear graph
function clearGraph() {
    if (confirm('Are you sure you want to clear the graph?')) {
        newGraph();
    }
}

// Update graph information display
function updateGraphInfo() {
    document.getElementById('node-count').textContent = graph.nodes.length;
    document.getElementById('edge-count').textContent = graph.edges.length;
    document.getElementById('current-mode').textContent = 
        appState.mode.charAt(0).toUpperCase() + appState.mode.slice(1);
    
    updateSelectionInfo();
}

// Update selection information
function updateSelectionInfo() {
    const selectionInfo = document.getElementById('selection-info');
    
    if (graph.selectedNode) {
        const node = graph.selectedNode;
        const chineseLabelDisplay = node.chineseLabel ? 
            `<p><strong>中文:</strong> ${node.chineseLabel}</p>` : 
            '';
        
            
        const layersDisplay = node.layers && node.layers.length > 0 ? 
            `<p><strong>Layers:</strong> ${node.layers.join(', ')}</p>` : 
            '<p><strong>Layers:</strong> None</p>';
            
        const formatDate = (timestamp) => {
            if (!timestamp) return 'Not available';
            try {
                const date = new Date(timestamp);
                return date.toLocaleString();
            } catch (e) {
                console.error('Error formatting timestamp:', timestamp, e);
                return 'Invalid date';
            }
        };
        
        const createdAtDisplay = node.created_at ? 
            `<p><strong>Created:</strong> ${formatDate(node.created_at)}</p>` : 
            '<p><strong>Created:</strong> Not available</p>';
            
        const modifiedAtDisplay = node.modified_at ? 
            `<p><strong>Modified:</strong> ${formatDate(node.modified_at)}</p>` : 
            '<p><strong>Modified:</strong> Not available</p>';
            
        selectionInfo.innerHTML = `
            <div style="font-size: 12px; line-height: 1.4;">
                <p><strong>English:</strong> ${node.label}</p>
                ${chineseLabelDisplay}
                <p><strong>Position:</strong> (${Math.round(node.x)}, ${Math.round(node.y)})</p>
                <p><strong>Color:</strong> <span style="display: inline-block; width: 12px; height: 12px; background-color: ${node.color}; border: 1px solid #333; vertical-align: middle; margin-right: 4px;"></span>${node.color}</p>
                <p><strong>Size:</strong> ${node.radius}px</p>
                ${node.category ? `<p><strong>Category:</strong> ${node.category}</p>` : ''}
                ${layersDisplay}
                ${createdAtDisplay}
                ${modifiedAtDisplay}
            </div>
        `;
    } else if (graph.selectedEdge) {
        const edge = graph.selectedEdge;
        const fromNode = graph.nodes.find(n => n.id === edge.from);
        const toNode = graph.nodes.find(n => n.id === edge.to);
        
        const fromChinese = fromNode && fromNode.chineseLabel ? ` (${fromNode.chineseLabel})` : '';
        const toChinese = toNode && toNode.chineseLabel ? ` (${toNode.chineseLabel})` : '';
        
        const formatDate = (timestamp) => {
            if (!timestamp) return 'Not available';
            try {
                const date = new Date(timestamp);
                return date.toLocaleString();
            } catch (e) {
                console.error('Error formatting timestamp:', timestamp, e);
                return 'Invalid date';
            }
        };
        
        const createdAtDisplay = edge.created_at ? 
            `<p><strong>Created:</strong> ${formatDate(edge.created_at)}</p>` : 
            '';
            
        const modifiedAtDisplay = edge.modified_at ? 
            `<p><strong>Modified:</strong> ${formatDate(edge.modified_at)}</p>` : 
            '';
            
        selectionInfo.innerHTML = `
            <div style="font-size: 12px; line-height: 1.4;">
                <p><strong>Edge:</strong> ${fromNode ? fromNode.label : 'Unknown'}${fromChinese} → ${toNode ? toNode.label : 'Unknown'}${toChinese}</p>
                <p><strong>Weight:</strong> ${edge.weight}</p>
                ${edge.category ? `<p><strong>Category:</strong> ${edge.category}</p>` : ''}
                ${createdAtDisplay}
                ${modifiedAtDisplay}
            </div>
        `;
    } else {
        selectionInfo.innerHTML = '<p>Nothing selected</p>';
    }
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        setMode,
        saveState,
        undo,
        redo,
        newGraph,
        clearGraph,
        updateGraphInfo,
        updateSelectionInfo
    };
} else {
    Object.assign(window, {
        setMode,
        saveState,
        undo,
        redo,
        newGraph,
        clearGraph,
        updateGraphInfo,
        updateSelectionInfo
    });
};

// Export globals for compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        setMode,
        saveState,
        undo,
        redo,
        newGraph,
        clearGraph,
        updateGraphInfo,
        updateSelectionInfo
    };
} else {
    window.setMode = setMode;
    window.saveState = saveState;
    window.undo = undo;
    window.redo = redo;
    window.newGraph = newGraph;
    window.clearGraph = clearGraph;
    window.updateGraphInfo = updateGraphInfo;
    window.updateSelectionInfo = updateSelectionInfo;
}

console.log('Graph operations module loaded');