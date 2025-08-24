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
    console.log('showDistanceAnalysis called');
    
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
        // Get current slider values instead of using appState defaults
        const maxDistance = parseInt(document.getElementById('max-distance').value);
        const maxDepth = parseInt(document.getElementById('max-depth').value);
        
        console.log('Calling analyzeDistancesTable with:', {
            centerNodeId: appState.filterParams.centerNodeId,
            maxDistance: maxDistance,
            maxDepth: maxDepth
        });
        
        const analysis = graph.analyzeDistancesTable(
            appState.filterParams.centerNodeId,
            maxDistance,
            maxDepth
        );

        console.log('Analysis result:', analysis);

        if (!analysis || !analysis.nodes || !analysis.centerNode) {
            showNotification('Center node not found or no nodes within constraints', 'info');
            return;
        }
        
        if (analysis.nodes.length === 0) {
            showNotification('No nodes found within the specified constraints', 'info');
            return;
        }

        displayDistanceAnalysisTable(analysis, maxDistance, maxDepth);
    } catch (error) {
        console.error('Error in showDistanceAnalysis:', error);
        showNotification('Error analyzing distances: ' + error.message, 'error');
    }
}

// Display distance analysis table
function displayDistanceAnalysisTable(analysis, maxDistance, maxDepth) {
    console.log('Creating distance analysis table with:', analysis);
    const dialog = createDistanceAnalysisDialog(analysis, maxDistance, maxDepth);
    console.log('Created dialog:', dialog);
    document.body.appendChild(dialog);
    console.log('Dialog appended to body');
}

// Create distance analysis dialog
function createDistanceAnalysisDialog(analysis, maxDistance, maxDepth) {
    console.log('Creating dialog with analysis:', analysis);
    
    const dialog = document.createElement('div');
    dialog.id = 'distance-analysis-dialog';
    dialog.className = 'dialog-overlay';
    
    // Ensure the dialog is visible
    dialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    try {
        const htmlContent = `
            <div class="dialog-content" style="max-width: 800px; max-height: 80vh; overflow-y: auto; background: white; border-radius: 8px; padding: 20px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3>Distance Analysis - ${analysis.centerNode.label}</h3>
                    <button onclick="closeDistanceAnalysis()" style="background: none; border: none; font-size: 24px; cursor: pointer;">×</button>
                </div>
                
                <div style="margin-bottom: 15px; font-size: 14px; color: #666;">
                    Center: <strong>${analysis.centerNode.label}</strong> | 
                    Max Distance: ${maxDistance} | 
                    Max Depth: ${maxDepth} | 
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
        
        console.log('Setting HTML content');
        dialog.innerHTML = htmlContent;
        console.log('Dialog created successfully');
        
    } catch (error) {
        console.error('Error creating dialog:', error);
        dialog.innerHTML = '<div class="dialog-content"><p>Error creating dialog: ' + error.message + '</p></div>';
    }

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
    
    const maxDistance = parseInt(document.getElementById('max-distance').value);
    const maxDepth = parseInt(document.getElementById('max-depth').value);
    
    graph.applyLocalGraphFilter(
        appState.filterParams.centerNodeId,
        maxDistance,
        maxDepth
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
    
    graph.calculateCentralities();
    
    // Display results
    const centralityInfo = document.getElementById('centrality-info');
    if (centralityInfo) {
        centralityInfo.style.display = 'block';
        centralityInfo.innerHTML = `
            <p style="font-size: 11px; color: #666; margin-top: 8px;">
                Centralities calculated for ${graph.nodes.length} nodes
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