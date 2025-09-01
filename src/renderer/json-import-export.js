// JSON Import/Export functionality - Dedicated module for JSON operations

/**
 * Export graph data as JSON
 */
function exportJSON() {
    const data = graph.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `graph_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('JSON exported successfully!');
}

/**
 * Import JSON with merge options
 */
async function importJSON() {
    if (typeof require !== 'undefined') {
        // Electron mode - use file dialog
        const { ipcRenderer } = require('electron');
        const result = await ipcRenderer.invoke('import-json-file');
        if (result.success) {
            const importResult = await showImportDialog(JSON.stringify(result.graphData));
            if (!importResult) return; // User cancelled
            
            const { mode, conflictResolution } = importResult;
            
            if (mode === 'replace') {
                await loadGraphData(result.graphData);
                showNotification(`JSON imported from ${result.fileName}`);
            } else {
                const mergeResult = await importWithMerge(result.graphData, conflictResolution);
                if (mergeResult.success) {
                    const message = formatImportNotification(mergeResult.mergeResult);
                    showNotification(message);
                    updateGraphInfo();
                    graph.render();
                } else {
                    showNotification('Error importing graph: ' + mergeResult.error, 'error');
                }
            }
        } else if (!result.cancelled) {
            showNotification('Error importing JSON: ' + result.error, 'error');
        }
    } else {
        // Web mode - use file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const jsonString = e.target.result;
                        const data = JSON.parse(jsonString);
                        
                        const importResult = await showImportDialog(jsonString);
                        if (!importResult) return; // User cancelled
                        
                        const { mode, conflictResolution } = importResult;
                        
                        if (mode === 'replace') {
                            await loadGraphData(data);
                            showNotification(`JSON imported from ${file.name}`);
                        } else {
                            const mergeResult = await importWithMerge(data, conflictResolution);
                            if (mergeResult.success) {
                                const message = formatImportNotification(mergeResult.mergeResult);
                                showNotification(message);
                                updateGraphInfo();
                                graph.render();
                            } else {
                                showNotification('Error importing graph: ' + mergeResult.error, 'error');
                            }
                        }
                    } catch (error) {
                        showNotification('Error importing JSON: ' + error.message, 'error');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }
}

/**
 * Show import dialog with merge options
 */
function showImportDialog(jsonString) {
    return new Promise((resolve) => {
        const dialog = document.getElementById('import-dialog');
        const content = dialog.querySelector('.dialog-content');
        
        // Parse data for preview
        let data;
        let nodeCount = 0;
        let edgeCount = 0;
        try {
            data = JSON.parse(jsonString);
            nodeCount = data.nodes?.length || 0;
            edgeCount = data.edges?.length || 0;
        } catch (e) {
            showNotification('Invalid JSON format', 'error');
            resolve(null);
            return;
        }
        
        // Update dialog content
        document.getElementById('import-stats').textContent = `Found ${nodeCount} nodes and ${edgeCount} edges in the file.`;
        
        // Reset radio buttons
        const replaceRadio = dialog.querySelector('input[value="replace"]');
        const mergeRadio = dialog.querySelector('input[value="merge"]');
        replaceRadio.checked = true;
        mergeRadio.checked = false;
        
        // Hide merge options initially
        const mergeOptions = document.getElementById('merge-options');
        mergeOptions.style.display = 'none';
        
        // Handle radio button changes
        replaceRadio.onchange = () => {
            mergeOptions.style.display = 'none';
        };
        mergeRadio.onchange = () => {
            mergeOptions.style.display = 'block';
        };
        
        // Handle buttons
        const cancelBtn = document.getElementById('import-cancel');
        const confirmBtn = document.getElementById('import-confirm');
        
        const handleCancel = () => {
            dialog.classList.add('hidden');
            cancelBtn.removeEventListener('click', handleCancel);
            confirmBtn.removeEventListener('click', handleConfirm);
            resolve(null);
        };
        
        const handleConfirm = () => {
            const mode = dialog.querySelector('input[name="import-mode"]:checked').value;
            const conflictResolution = document.getElementById('conflict-resolution').value;
            
            dialog.classList.add('hidden');
            cancelBtn.removeEventListener('click', handleCancel);
            confirmBtn.removeEventListener('click', handleConfirm);
            resolve({ mode, conflictResolution });
        };
        
        cancelBtn.addEventListener('click', handleCancel);
        confirmBtn.addEventListener('click', handleConfirm);
        
        // Show dialog
        dialog.classList.remove('hidden');
    });
}

/**
 * Import data with merge functionality
 */
function importWithMerge(importData, conflictResolution) {
    const currentData = graph.exportData();
    const mergeResult = {
        success: false,
        mergeResult: {
            nodesAdded: 0,
            nodesSkipped: 0,
            nodesRenamed: 0,
            edgesAdded: 0,
            edgesSkipped: 0,
            conflicts: []
        }
    };
    
    try {
        // Create maps for current data
        const currentNodes = new Map(currentData.nodes.map(n => [n.id, n]));
        const currentEdges = new Map(currentData.edges.map(e => [`${e.from}-${e.to}`, e]));
        
        // Process nodes
        const newNodes = [];
        for (const node of importData.nodes || []) {
            if (currentNodes.has(node.id)) {
                if (conflictResolution === 'replace') {
                    // Replace existing node
                    const index = currentData.nodes.findIndex(n => n.id === node.id);
                    if (index !== -1) {
                        currentData.nodes[index] = node;
                    }
                    mergeResult.mergeResult.nodesAdded++;
                } else if (conflictResolution === 'skip') {
                    mergeResult.mergeResult.nodesSkipped++;
                } else if (conflictResolution === 'rename') {
                    // Rename imported node
                    let newId = node.id + '_imported';
                    let counter = 1;
                    while (currentNodes.has(newId)) {
                        newId = node.id + '_imported_' + counter;
                        counter++;
                    }
                    const newNode = { ...node, id: newId };
                    newNodes.push(newNode);
                    currentNodes.set(newId, newNode);
                    mergeResult.mergeResult.nodesRenamed++;
                }
            } else {
                newNodes.push(node);
                mergeResult.mergeResult.nodesAdded++;
            }
        }
        
        // Add new nodes
        currentData.nodes.push(...newNodes);
        
        // Process edges
        for (const edge of importData.edges || []) {
            const edgeKey = `${edge.from}-${edge.to}`;
            if (currentEdges.has(edgeKey)) {
                if (conflictResolution === 'replace') {
                    const index = currentData.edges.findIndex(e => `${e.from}-${e.to}` === edgeKey);
                    if (index !== -1) {
                        currentData.edges[index] = edge;
                    }
                    mergeResult.mergeResult.edgesAdded++;
                } else if (conflictResolution === 'skip') {
                    mergeResult.mergeResult.edgesSkipped++;
                } else if (conflictResolution === 'rename') {
                    // Create new edge with same logic as nodes
                    mergeResult.mergeResult.edgesAdded++;
                    currentData.edges.push(edge);
                }
            } else {
                // Check if both nodes exist
                const fromExists = currentData.nodes.some(n => n.id === edge.from);
                const toExists = currentData.nodes.some(n => n.id === edge.to);
                
                if (fromExists && toExists) {
                    currentData.edges.push(edge);
                    mergeResult.mergeResult.edgesAdded++;
                } else {
                    mergeResult.mergeResult.edgesSkipped++;
                }
            }
        }
        
        // Load merged data
        loadGraphData(currentData);
        mergeResult.success = true;
        
    } catch (error) {
        mergeResult.error = error.message;
    }
    
    return mergeResult;
}

/**
 * Format import result notification
 */
function formatImportNotification(result) {
    const parts = [];
    
    if (result.nodesAdded > 0) parts.push(`${result.nodesAdded} nodes added`);
    if (result.nodesSkipped > 0) parts.push(`${result.nodesSkipped} nodes skipped`);
    if (result.nodesRenamed > 0) parts.push(`${result.nodesRenamed} nodes renamed`);
    if (result.edgesAdded > 0) parts.push(`${result.edgesAdded} edges added`);
    if (result.edgesSkipped > 0) parts.push(`${result.edgesSkipped} edges skipped`);
    
    const conflictCount = result.conflicts?.length || 0;
    if (conflictCount > 0) parts.push(`${conflictCount} conflicts resolved`);
    
    return parts.length > 0 ? parts.join(', ') : 'Import completed';
}

// Export functions for global access
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        exportJSON,
        importJSON,
        showImportDialog,
        importWithMerge,
        formatImportNotification
    };
} else {
    Object.assign(window, {
        exportJSON,
        importJSON,
        showImportDialog,
        importWithMerge,
        formatImportNotification
    });
}