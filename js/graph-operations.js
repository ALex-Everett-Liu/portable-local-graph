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
    updateSearchCount(0, graph.nodes.length);
}

// Update selection information
function updateSelectionInfo() {
    const selectionInfo = document.getElementById('selection-info');
    
    if (graph.selectedNode) {
        const node = graph.selectedNode;
        const chineseLabelDisplay = node.chineseLabel ? 
            `<p><strong>中文:</strong> ${node.chineseLabel}</p>` : 
            '';
        
        let centralityDisplay = '';
        if (node.centrality) {
            // Get rankings for each centrality type
            const degreeRank = graph.getCentralityRank(node.id, 'degree');
            const betweennessRank = graph.getCentralityRank(node.id, 'betweenness');
            const closenessRank = graph.getCentralityRank(node.id, 'closeness');
            const eigenvectorRank = graph.getCentralityRank(node.id, 'eigenvector');
            const pagerankRank = graph.getCentralityRank(node.id, 'pagerank');

            // Helper function to get rank color and indicator
            function getRankIndicator(rank, total) {
                if (!rank || !total) return { color: '#666', indicator: '' };
                const ratio = rank / total;
                let color, indicator;
                if (ratio <= 0.1) { color = '#28a745'; indicator = '🔥'; } // Top 10%
                else if (ratio <= 0.25) { color = '#ffc107'; indicator = '⭐'; } // Top 25%
                else if (ratio <= 0.5) { color = '#17a2b8'; indicator = '👍'; } // Top 50%
                else { color = '#6c757d'; indicator = '⚪'; } // Bottom 50%
                return { color, indicator };
            }

            const degreeIndicator = getRankIndicator(degreeRank, graph.nodes.length);
            const betweennessIndicator = getRankIndicator(betweennessRank, graph.nodes.length);
            const closenessIndicator = getRankIndicator(closenessRank, graph.nodes.length);
            const eigenvectorIndicator = getRankIndicator(eigenvectorRank, graph.nodes.length);
            const pagerankIndicator = getRankIndicator(pagerankRank, graph.nodes.length);

            centralityDisplay = `
                <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #ddd;">
                    <p style="font-weight: bold; margin-bottom: 6px; font-size: 12px; color: #495057;">
                        📊 Centrality Analysis (${graph.nodes.length} nodes total)
                    </p>
                    <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
                        <tr style="border-bottom: 1px solid #f0f0f0;">
                            <td style="padding: 2px 0; font-weight: 600;">Degree</td>
                            <td style="padding: 2px 0; text-align: right; font-family: monospace; color: #007bff;">${node.centrality.degree || 'N/A'}</td>
                            <td style="padding: 2px 0; text-align: right; font-size: 10px; color: ${degreeIndicator.color};">
                                ${degreeIndicator.indicator} ${degreeRank ? `#${degreeRank}` : 'N/A'}
                            </td>
                        </tr>
                        <tr style="border-bottom: 1px solid #f0f0f0;">
                            <td style="padding: 2px 0; font-weight: 600;">Betweenness</td>
                            <td style="padding: 2px 0; text-align: right; font-family: monospace; color: #007bff;">${node.centrality.betweenness || 'N/A'}</td>
                            <td style="padding: 2px 0; text-align: right; font-size: 10px; color: ${betweennessIndicator.color};">
                                ${betweennessIndicator.indicator} ${betweennessRank ? `#${betweennessRank}` : 'N/A'}
                            </td>
                        </tr>
                        <tr style="border-bottom: 1px solid #f0f0f0;">
                            <td style="padding: 2px 0; font-weight: 600;">Closeness</td>
                            <td style="padding: 2px 0; text-align: right; font-family: monospace; color: #007bff;">${node.centrality.closeness || 'N/A'}</td>
                            <td style="padding: 2px 0; text-align: right; font-size: 10px; color: ${closenessIndicator.color};">
                                ${closenessIndicator.indicator} ${closenessRank ? `#${closenessRank}` : 'N/A'}
                            </td>
                        </tr>
                        <tr style="border-bottom: 1px solid #f0f0f0;">
                            <td style="padding: 2px 0; font-weight: 600;">Eigenvector</td>
                            <td style="padding: 2px 0; text-align: right; font-family: monospace; color: #007bff;">${node.centrality.eigenvector || 'N/A'}</td>
                            <td style="padding: 2px 0; text-align: right; font-size: 10px; color: ${eigenvectorIndicator.color};">
                                ${eigenvectorIndicator.indicator} ${eigenvectorRank ? `#${eigenvectorRank}` : 'N/A'}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 2px 0; font-weight: 600;">PageRank</td>
                            <td style="padding: 2px 0; text-align: right; font-family: monospace; color: #007bff;">${node.centrality.pagerank || 'N/A'}</td>
                            <td style="padding: 2px 0; text-align: right; font-size: 10px; color: ${pagerankIndicator.color};">
                                ${pagerankIndicator.indicator} ${pagerankRank ? `#${pagerankRank}` : 'N/A'}
                            </td>
                        </tr>
                    </table>
                    <div style="margin-top: 6px; font-size: 9px; color: #666; text-align: center;">
                        🔥 Top 10% ⭐ Top 25% 👍 Top 50% ⚪ Others
                    </div>
                </div>
            `;
        }
            
        selectionInfo.innerHTML = `
            <div style="font-size: 12px; line-height: 1.4;">
                <p><strong>English:</strong> ${node.label}</p>
                ${chineseLabelDisplay}
                <p><strong>Position:</strong> (${Math.round(node.x)}, ${Math.round(node.y)})</p>
                <p><strong>Color:</strong> <span style="display: inline-block; width: 12px; height: 12px; background-color: ${node.color}; border: 1px solid #333; vertical-align: middle; margin-right: 4px;"></span>${node.color}</p>
                <p><strong>Size:</strong> ${node.radius}px</p>
                ${node.category ? `<p><strong>Category:</strong> ${node.category}</p>` : ''}
                ${centralityDisplay}
            </div>
        `;
    } else if (graph.selectedEdge) {
        const edge = graph.selectedEdge;
        const fromNode = graph.nodes.find(n => n.id === edge.from);
        const toNode = graph.nodes.find(n => n.id === edge.to);
        
        const fromChinese = fromNode && fromNode.chineseLabel ? ` (${fromNode.chineseLabel})` : '';
        const toChinese = toNode && toNode.chineseLabel ? ` (${toNode.chineseLabel})` : '';
        
        selectionInfo.innerHTML = `
            <div style="font-size: 12px; line-height: 1.4;">
                <p><strong>Edge:</strong> ${fromNode ? fromNode.label : 'Unknown'}${fromChinese} → ${toNode ? toNode.label : 'Unknown'}${toChinese}</p>
                <p><strong>Weight:</strong> ${edge.weight}</p>
                ${edge.category ? `<p><strong>Category:</strong> ${edge.category}</p>` : ''}
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