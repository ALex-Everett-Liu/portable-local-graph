// Event handlers module
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Check if buttons exist
    const saveBtn = document.getElementById('save-btn');
    const loadBtn = document.getElementById('load-btn');
    const newBtn = document.getElementById('new-graph-btn');
    
    console.log('Save button exists:', !!saveBtn);
    console.log('Load button exists:', !!loadBtn);
    console.log('New button exists:', !!newBtn);
    
    // Toolbar buttons
    document.getElementById('node-mode').addEventListener('click', () => setMode('node'));
    document.getElementById('edge-mode').addEventListener('click', () => setMode('edge'));
    document.getElementById('select-mode').addEventListener('click', () => setMode('select'));
    
    document.getElementById('undo-btn').addEventListener('click', undo);
    document.getElementById('redo-btn').addEventListener('click', redo);
    document.getElementById('clear-btn').addEventListener('click', clearGraph);
    
    document.getElementById('new-graph-btn').addEventListener('click', newGraph);
    document.getElementById('save-btn').addEventListener('click', handleSaveClick);
    document.getElementById('load-btn').addEventListener('click', handleLoadClick);
    
    document.getElementById('import-json-btn').addEventListener('click', importJSON);
    document.getElementById('export-svg-btn').addEventListener('click', exportSVG);
    document.getElementById('export-json-btn').addEventListener('click', exportJSON);
    
    // Dialog buttons
    document.getElementById('weight-ok').addEventListener('click', handleWeightOK);
    document.getElementById('weight-cancel').addEventListener('click', handleWeightCancel);
    document.getElementById('weight-delete').addEventListener('click', handleWeightDelete);
    document.getElementById('reverse-edge-btn').addEventListener('click', handleReverseEdgeDirection);
    
    document.getElementById('node-ok').addEventListener('click', handleNodeOK);
    document.getElementById('node-cancel').addEventListener('click', handleNodeCancel);
    document.getElementById('node-delete').addEventListener('click', handleNodeDelete);
    document.getElementById('node-connections-btn').addEventListener('click', () => {
        const node = window.currentEditingNode;
        if (node) {
            document.getElementById('node-dialog').classList.add('hidden');
            showNodeConnections(node.id);
        }
    });
    
    document.getElementById('edge-search-ok').addEventListener('click', handleEdgeSearchOK);
    document.getElementById('edge-search-cancel').addEventListener('click', closeEdgeSearchDialog);
    
    // Filter controls
    document.getElementById('max-distance').addEventListener('input', updateDistanceDisplay);
    document.getElementById('max-depth').addEventListener('input', updateDepthDisplay);
    document.getElementById('apply-filter-btn').addEventListener('click', applyFilter);
    document.getElementById('reset-filter-btn').addEventListener('click', resetFilter);
    document.getElementById('save-view-btn').addEventListener('click', saveViewConfig);
    document.getElementById('analyze-distances-btn').addEventListener('click', showDistanceAnalysis);
    
    // Display options
    const arrowCheckbox = document.getElementById('show-edge-arrows');
    if (arrowCheckbox) {
        // Ensure appState.showEdgeArrows is initialized
        if (typeof appState.showEdgeArrows === 'undefined') {
            appState.showEdgeArrows = false;
        }
        
        arrowCheckbox.addEventListener('change', (e) => {
            console.log("Edge arrows checkbox changed:", e.target.checked);
            appState.showEdgeArrows = e.target.checked;
            console.log("appState.showEdgeArrows set to:", appState.showEdgeArrows);
            graph.render();
            console.log("Graph re-rendered");
        });
        
        // Set initial state
        arrowCheckbox.checked = appState.showEdgeArrows;
        console.log("Initial arrow checkbox state:", arrowCheckbox.checked, "appState.showEdgeArrows:", appState.showEdgeArrows);
    } else {
        console.warn("Edge arrows checkbox not found");
    }
    
    // Edge creation via search
    document.getElementById('create-edge-search-btn').addEventListener('click', showEdgeSearchDialog);
    document.getElementById('calculate-centrality-btn').addEventListener('click', calculateCentralities);
    
    // Layer filtering controls - with null checks
    const applyLayerFilterBtn = document.getElementById('apply-layer-filter-btn');
    const resetLayerFilterBtn = document.getElementById('reset-layer-filter-btn');
    const manageLayersBtn = document.getElementById('manage-layers-btn');
    const layerFilterInput = document.getElementById('layer-filter-input');
    
    if (applyLayerFilterBtn) applyLayerFilterBtn.addEventListener('click', applyLayerFilter);
    if (resetLayerFilterBtn) resetLayerFilterBtn.addEventListener('click', resetLayerFilter);
    if (manageLayersBtn) manageLayersBtn.addEventListener('click', openLayerDialog);
    if (layerFilterInput) layerFilterInput.addEventListener('input', updateLayerFilter);
    
    // Initialize layer filtering - use summary instead of full list
    if (typeof updateLayerSummary === 'function') {
        updateLayerSummary();
    }
    
    // Search functionality
    setupSearchComponents();
    
    // Load saved quick access
    loadQuickAccess();
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyDown);
    
    // Window events
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Sidebar resize functionality
    setupSidebarResize();
}

// Handle save button click
async function handleSaveClick() {
    console.log('Save button clicked');
    
    if (typeof require !== 'undefined') {
        // Electron mode - use proper IPC
        try {
            const { ipcRenderer } = require('electron');
            console.log('Requesting save via IPC...');
            
            // Save to current database using the existing database manager
            await saveGraphToDatabase();
            showNotification('Graph saved to current file');
        } catch (error) {
            console.error('Error saving file:', error);
            showNotification('Error saving file: ' + error.message, 'error');
        }
    } else {
        // Web mode
        console.log('Web mode save triggered');
        if (dbManager && currentGraphId) {
            console.log('Saving to database...');
            saveGraphToDatabase();
        } else {
            console.log('No database available, using Save As');
            saveGraphToFile();
        }
    }
}

// Handle load button click
async function handleLoadClick() {
    console.log('Load button clicked');
    
    if (typeof require !== 'undefined') {
        // Electron mode - use SAME mechanism as menu (Ctrl+O)
        const { ipcRenderer } = require('electron');
        console.log('Requesting file open via IPC (same as menu)...');
        
        // Use the same invoke as the menu uses
        const result = await ipcRenderer.invoke('open-graph-file');
        
        if (result.success) {
            console.log('File opened successfully:', result.filePath);
            
            // CRITICAL: Switch database to the new file and load from it
            if (result.filePath && dbManager) {
                console.log('Switching database to:', result.filePath);
                await dbManager.openFile(result.filePath);
                console.log('Database now pointing to:', dbManager.dbPath);
                
                // Load the graph data from the new database
                await loadGraphFromDatabase();
            } else {
                // Fallback to using the returned data
                loadGraphData(result.graphData);
            }
            appState.isModified = false;
            showNotification(`Graph opened from ${result.fileName}`);
        } else if (!result.cancelled) {
            showNotification('Error opening graph: ' + result.error, 'error');
        }
    } else {
        // Web mode
        await openGraphFile();
    }
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { setupEventListeners };
} else {
    window.setupEventListeners = setupEventListeners;
}