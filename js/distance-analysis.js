// Distance analysis functionality

// Update distance display
function updateDistanceDisplay() {
    const distanceSlider = document.getElementById('max-distance');
    const distanceValue = document.getElementById('distance-value');
    if (distanceSlider && distanceValue) {
        distanceValue.textContent = distanceSlider.value;
    }
}

// Update depth display
function updateDepthDisplay() {
    const depthSlider = document.getElementById('max-depth');
    const depthValue = document.getElementById('depth-value');
    if (depthSlider && depthValue) {
        depthValue.textContent = depthSlider.value;
    }
}

// Show distance analysis
function showDistanceAnalysis() {
    if (!appState.filterParams.centerNodeId) {
        showNotification('Please select a center node first', 'error');
        return;
    }

    const centerNode = graph.nodes.find(n => n.id === appState.filterParams.centerNodeId);
    if (!centerNode) {
        showNotification('Selected center node not found', 'error');
        return;
    }

    try {
        const analysis = graph.analyzeDistancesTable(
            appState.filterParams.centerNodeId,
            appState.filterParams.maxDistance,
            appState.filterParams.maxDepth
        );

        if (analysis.nodes.length === 0) {
            showNotification('No nodes found within the specified constraints', 'info');
            return;
        }

        displayDistanceAnalysisTable(analysis);
    } catch (error) {
        showNotification('Error analyzing distances: ' + error.message, 'error');
    }
}

// Display distance analysis table
function displayDistanceAnalysisTable(analysis) {
    const dialog = createDistanceAnalysisDialog(analysis);
    document.body.appendChild(dialog);
}

// Create distance analysis dialog
function createDistanceAnalysisDialog(analysis) {
    const dialog = document.createElement('div');
    dialog.id = 'distance-analysis-dialog';
    dialog.className = 'dialog-overlay';
    dialog.innerHTML = `
        <div class="dialog-content" style="max-width: 800px; max-height: 80vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3>Distance Analysis - ${analysis.centerNode.label}</h3>
                <button onclick="closeDistanceAnalysis()" style="background: none; border: none; font-size: 24px; cursor: pointer;">×</button>
            </div>
            
            <div style="margin-bottom: 15px; font-size: 14px; color: #666;">
                Center: <strong>${analysis.centerNode.label}</strong> | 
                Max Distance: ${appState.filterParams.maxDistance} | 
                Max Depth: ${appState.filterParams.maxDepth} | 
                Total Nodes: ${analysis.totalCount}
            </div>
            
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <thead>
                        <tr style="background: #f8f9fa;">
                            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #dee2e6;">Node</th>
                            <th style="padding: 8px; text-align: center; border-bottom: 2px solid #dee2e6;">Distance</th>
                            <th style="padding: 8px; text-align: center; border-bottom: 2px solid #dee2e6;">Depth</th>
                            <th style="padding: 8px; text-align: center; border-bottom: 2px solid #dee2e6;">Position</th>
                            <th style="padding: 8px; text-align: center; border-bottom: 2px solid #dee2e6;">Color</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${analysis.nodes.map(node => `
                            <tr style="border-bottom: 1px solid #dee2e6;">
                                <td style="padding: 8px;">
                                    <div style="font-weight: 500;">${node.label}</div>
                                    ${node.chineseLabel ? `<div style="font-size: 12px; color: #666;">${node.chineseLabel}</div>` : ''}
                                </td>
                                <td style="padding: 8px; text-align: center; font-weight: 500;">${node.distance.toFixed(2)}</td>
                                <td style="padding: 8px; text-align: center;">${node.depth}</td>
                                <td style="padding: 8px; text-align: center; font-family: monospace; font-size: 12px;">(${Math.round(node.x)}, ${Math.round(node.y)})</td>
                                <td style="padding: 8px; text-align: center;">
                                    <span style="display: inline-block; width: 20px; height: 20px; background-color: ${node.color}; border-radius: 3px; border: 1px solid #ccc;"></span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div style="margin-top: 20px; text-align: right;">
                <button onclick="closeDistanceAnalysis()" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Close
                </button>
            </div>
        </div>
    `;

    // Close on overlay click
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            closeDistanceAnalysis();
        }
    });

    return dialog;
}

// Close distance analysis
function closeDistanceAnalysis() {
    const dialog = document.getElementById('distance-analysis-dialog');
    if (dialog) {
        dialog.remove();
    }
}

// Apply local graph filter
function applyFilter() {
    if (!appState.filterParams.centerNodeId) {
        showNotification('Please select a center node first', 'error');
        return;
    }
    
    const centerNode = graph.nodes.find(n => n.id === appState.filterParams.centerNodeId);
    if (!centerNode) {
        showNotification('Selected center node not found', 'error');
        return;
    }
    
    graph.applyLocalGraphFilter(
        appState.filterParams.centerNodeId,
        appState.filterParams.maxDistance,
        appState.filterParams.maxDepth
    );
    
    updateGraphInfo();
    appState.isModified = true;
}

// Reset local graph filter
function resetFilter() {
    graph.resetFilter();
    updateGraphInfo();
    appState.isModified = true;
}

// Load default graph (empty)
function loadDefaultGraph() {
    graph.clear();
    updateGraphInfo();
    appState.isModified = false;
    showNotification('New empty graph loaded');
}

// Calculate centralities for all nodes
function calculateCentralities() {
    if (!graph || graph.nodes.length === 0) {
        showNotification('No nodes to analyze', 'error');
        return;
    }
    
    const centralities = graph.calculateCentralities();
    
    // Display results
    const centralityInfo = document.getElementById('centrality-info');
    if (centralityInfo) {
        centralityInfo.style.display = 'block';
        centralityInfo.innerHTML = `
            <p style="font-size: 11px; color: #666; margin-top: 8px;">
                Centralities calculated for ${Object.keys(centralities).length} nodes
            </p>
        `;
    }
    
    showNotification('Centralities calculated successfully');
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showDistanceAnalysis,
        displayDistanceAnalysisTable,
        createDistanceAnalysisDialog,
        closeDistanceAnalysis,
        updateDistanceDisplay,
        updateDepthDisplay,
        applyFilter,
        resetFilter,
        loadDefaultGraph,
        calculateCentralities
    };
} else {
    Object.assign(window, {
        showDistanceAnalysis,
        displayDistanceAnalysisTable,
        createDistanceAnalysisDialog,
        closeDistanceAnalysis,
        updateDistanceDisplay,
        updateDepthDisplay,
        applyFilter,
        resetFilter,
        loadDefaultGraph,
        calculateCentralities
    });
}