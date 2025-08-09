// Application state
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

let graph;
let dbManager = null;
let uuidv7;
try {
    const { v7 } = require('uuid');
    uuidv7 = v7;
} catch (error) {
    console.log('UUID not available in browser context, using fallback');
    uuidv7 = () => 'fallback-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// Initialize application
function initApp() {
    console.log('Initializing application...');
    const canvas = document.getElementById('graph-canvas');
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }
    
    graph = new Graph(canvas, {
        mode: appState.mode,
        onModeChange: (mode) => setMode(mode),
        onGraphUpdate: updateGraphInfo,
        onSelectionChange: updateGraphInfo
    });
    
    setupEventListeners();
    setupIPC();
    updateGraphInfo();
    renderQuickAccess();
    
    // Initialize database and load graph
    initializeDatabase();
}

// Check if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    // DOM is already loaded
    initApp();
}

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
    document.getElementById('save-btn').addEventListener('click', async () => {
        // alert('Save button clicked!');
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
    });
    document.getElementById('load-btn').addEventListener('click', async () => {
        // alert('Load button clicked!');
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
    });
    
    
    document.getElementById('import-json-btn').addEventListener('click', importJSON);
    document.getElementById('export-svg-btn').addEventListener('click', exportSVG);
    document.getElementById('export-json-btn').addEventListener('click', exportJSON);
    
    // Dialog buttons
    document.getElementById('weight-ok').addEventListener('click', handleWeightOK);
    document.getElementById('weight-cancel').addEventListener('click', handleWeightCancel);
    
    document.getElementById('node-ok').addEventListener('click', handleNodeOK);
    document.getElementById('node-cancel').addEventListener('click', handleNodeCancel);
    document.getElementById('node-delete').addEventListener('click', handleNodeDelete);
    
    // Filter controls
    document.getElementById('max-distance').addEventListener('input', updateDistanceDisplay);
    document.getElementById('max-depth').addEventListener('input', updateDepthDisplay);
    document.getElementById('apply-filter-btn').addEventListener('click', applyFilter);
    document.getElementById('reset-filter-btn').addEventListener('click', resetFilter);
    document.getElementById('save-view-btn').addEventListener('click', saveViewConfig);
    document.getElementById('analyze-distances-btn').addEventListener('click', showDistanceAnalysis);
    
    // Search functionality
    setupSearchComponents();
    
    // Load saved quick access
    loadQuickAccess();
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyDown);
    
    // Window events
    window.addEventListener('beforeunload', handleBeforeUnload);
}

// Distance Analysis Functions
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

function displayDistanceAnalysisTable(analysis) {
    const dialog = createDistanceAnalysisDialog(analysis);
    document.body.appendChild(dialog);
}

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

function closeDistanceAnalysis() {
    const dialog = document.getElementById('distance-analysis-dialog');
    if (dialog) {
        dialog.remove();
    }
}

function setupIPC() {
    if (typeof require !== 'undefined') {
        try {
            const { ipcRenderer } = require('electron');
            
            ipcRenderer.on('new-graph', () => {
                newGraph();
            });
            
            ipcRenderer.on('load-graph', (event, data) => {
                loadGraphData(data);
            });
            
            ipcRenderer.on('save-graph-request', async (event, filePath) => {
                const result = await ipcRenderer.invoke('save-graph', graph.exportData(), filePath);
                if (result.success) {
                    appState.isModified = false;
                    showNotification('Graph saved successfully!');
                } else {
                    showNotification('Error saving graph: ' + result.error);
                }
            });
            
            ipcRenderer.on('open-graph-file-result', async (event, result) => {
                if (result.success) {
                    // Switch to the new database file and load automatically
                    if (result.filePath && dbManager) {
                        console.log('Opening database via openFile:', result.filePath);
                        await dbManager.openFile(result.filePath);
                        console.log('Database switched to:', result.filePath);
                        await loadGraphFromDatabase();
                    } else if (result.graphData) {
                        // Fallback to using the returned data
                        loadGraphData(result.graphData);
                    }
                    
                    appState.isModified = false;
                    showNotification(`Graph opened from ${result.fileName}`);
                } else if (!result.cancelled) {
                    showNotification('Error opening graph: ' + result.error, 'error');
                }
            });

            ipcRenderer.on('save-current-graph', async () => {
                console.log('Save triggered for current file');
                console.log('Database path:', dbManager ? dbManager.dbPath : 'no db manager');
                
                if (dbManager) {
                    await saveGraphToDatabase();
                    showNotification('Graph saved to current file');
                } else {
                    // Fallback to Save As if no database
                    await saveGraphToFile();
                }
            });

            ipcRenderer.on('save-graph-file-request', async (event, filePath) => {
                const result = await ipcRenderer.invoke('save-graph-file-request', filePath, graph.exportData());
                if (result.success) {
                    // Switch to the new database file
                    if (dbManager && result.filePath) {
                        try {
                            await dbManager.openFile(result.filePath);
                            showNotification(`Graph saved as ${result.fileName}`);
                        } catch (error) {
                            console.error('Error switching to new database file:', error);
                            showNotification('Error switching to new database file: ' + error.message, 'error');
                        }
                    }
                } else if (!result.cancelled) {
                    showNotification('Error saving graph: ' + result.error, 'error');
                }
            });
            
            ipcRenderer.on('export-svg-request', async () => {
                const svgData = generateSVG();
                const result = await ipcRenderer.invoke('export-svg', svgData);
                if (result.success) {
                    showNotification('SVG exported successfully!');
                } else if (!result.cancelled) {
                    showNotification('Error exporting SVG: ' + result.error);
                }
            });

            ipcRenderer.on('import-json-request', async () => {
                const result = await ipcRenderer.invoke('import-json-file');
                if (result.success) {
                    loadGraphData(result.graphData);
                    currentGraphId = 'import-' + Date.now();
                    showNotification(`JSON imported from ${result.fileName}`);
                } else if (!result.cancelled) {
                    showNotification('Error importing JSON: ' + result.error);
                }
            });

            ipcRenderer.on('export-json-request', async () => {
                const data = graph.exportData();
                const result = await ipcRenderer.invoke('export-json', data);
                if (result.success) {
                    showNotification('JSON exported successfully!');
                } else if (!result.cancelled) {
                    showNotification('Error exporting JSON: ' + result.error);
                }
            });
        } catch (error) {
            console.log('Electron IPC not available, running in web mode');
        }
    }
}

async function initializeDatabase() {
    console.log('[initializeDatabase] Starting database initialization...');
    
    if (typeof require !== 'undefined') {
        try {
            console.log('[initializeDatabase] Electron mode detected');
            const DatabaseManager = require('./database-manager');
            console.log('[initializeDatabase] DatabaseManager loaded successfully');
            
            dbManager = new DatabaseManager();
            console.log('[initializeDatabase] DatabaseManager instance created');
            console.log('[initializeDatabase] Initial database path:', dbManager.dbPath);
            
            try {
                console.log('[initializeDatabase] Calling dbManager.init()...');
                await dbManager.init();
                console.log('[initializeDatabase] Database initialized successfully');
                
                // Automatically load the most recent graph
                console.log('[initializeDatabase] Loading most recent graph...');
                await loadGraphFromDatabase();
            } catch (error) {
                console.error('[initializeDatabase] Error initializing database:', error);
                console.error('[initializeDatabase] Error stack:', error.stack);
                // Fallback to default graph
                console.log('[initializeDatabase] Falling back to default graph');
                await loadDefaultGraph();
            }
        } catch (error) {
            console.error('[initializeDatabase] Error loading DatabaseManager:', error);
            console.log('[initializeDatabase] Falling back to web mode');
            await loadDefaultGraph();
        }
    } else {
        // Web mode - use default graph
        console.log('[initializeDatabase] Running in web mode (no require)');
        await loadDefaultGraph();
    }
}

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

function undo() {
    if (appState.undoStack.length > 0) {
        const currentState = graph.exportData();
        appState.redoStack.push(currentState);
        
        const previousState = appState.undoStack.pop();
        graph.importData(previousState);
        
        updateGraphInfo();
    }
}

function redo() {
    if (appState.redoStack.length > 0) {
        const currentState = graph.exportData();
        appState.undoStack.push(currentState);
        
        const nextState = appState.redoStack.pop();
        graph.importData(nextState);
        
        updateGraphInfo();
    }
}

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

async function saveGraphToFile() {
    console.log('saveGraphToFile called');
    if (typeof require !== 'undefined') {
        // Electron mode - use file dialog for Save As
        console.log('Electron mode, using save-graph-file IPC');
        try {
            const { ipcRenderer } = require('electron');
            const result = await ipcRenderer.invoke('save-graph-file', graph.exportData());
            if (result.success) {
                showNotification(`Graph saved to ${result.fileName}`);
            } else if (!result.cancelled) {
                showNotification('Error saving graph: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error in saveGraphToFile:', error);
        }
    } else {
        // Web mode - use database for Save As (create new graph)
        console.log('Web mode, creating new graph in database');
        try {
            await saveGraphToDatabase();
            showNotification('Graph saved to database!');
        } catch (error) {
            console.error('Error in saveGraphToFile web mode:', error);
        }
    }
}

async function saveGraphToDatabase() {
    if (!dbManager) return;
    
    try {
        const graphData = graph.exportData();
        const data = {
            ...graphData,
            metadata: {
                name: 'Graph ' + new Date().toLocaleString(),
                lastModified: new Date().toISOString()
            }
        };
        
        await dbManager.saveGraph(data);
        appState.isModified = false;
    } catch (error) {
        console.error('Error saving to database:', error);
        showNotification('Error saving graph: ' + error.message, 'error');
    }
}

async function openGraphFile() {
    console.log('openGraphFile called');
    if (typeof require !== 'undefined') {
        // Electron mode - handled by menu IPC
        console.log('Electron mode, triggering file open via IPC');
        try {
            const { ipcRenderer } = require('electron');
            ipcRenderer.send('open-graph-file');
        } catch (error) {
            console.error('Error opening file in Electron:', error);
        }
    } else {
        // Web mode - automatically load most recent graph
        console.log('Web mode, opening from database');
        await loadGraphFromDatabase();
    }
}

function fallbackToJSONLoad() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (dbManager) {
                        // Import JSON to database
                        await dbManager.importFromJSON(data);
                        await loadGraphFromDatabase();
                        showNotification('JSON imported to database!');
                    } else {
                        loadGraphData(data);
                    }
                } catch (error) {
                    showNotification('Error loading graph: Invalid JSON');
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
}

async function openFromDatabase() {
    if (!dbManager) return;
    
    try {
        const graphs = await dbManager.listGraphs();
        if (graphs.length === 0) {
            showNotification('No graphs found in database', 'info');
            return;
        }
        
        const selectedId = await showGraphSelector(graphs);
        if (selectedId) {
            await loadGraphFromDatabase(selectedId);
        }
    } catch (error) {
        console.error('Error loading from database:', error);
        showNotification('Error loading graph: ' + error.message, 'error');
    }
}

async function loadGraphFromDatabase() {
    if (!dbManager) {
        console.error('[loadGraphFromDatabase] No database manager available');
        return;
    }
    
    console.log('[loadGraphFromDatabase] Starting to load graph from database...');
    console.log('[loadGraphFromDatabase] Database path:', dbManager.dbPath);
    
    // Auto-save completely removed - no need to disable anything
    
    try {
        console.log('[loadGraphFromDatabase] Calling dbManager.loadGraph()...');
        const data = await dbManager.loadGraph();
        console.log('[loadGraphFromDatabase] Received data from dbManager:', data);
        
        if (data && data.nodes && data.nodes.length > 0) {
            console.log('[loadGraphFromDatabase] Loading graph with', data.nodes.length, 'nodes and', data.edges.length, 'edges');
            loadGraphData(data);
            appState.isModified = false;
            showNotification('Graph loaded from database!');
        } else if (data && data.nodes && data.nodes.length === 0) {
            console.log('[loadGraphFromDatabase] Empty graph loaded from database');
            loadGraphData({nodes: [], edges: [], scale: 1, offset: {x: 0, y: 0}});
        } else {
            console.log('[loadGraphFromDatabase] No valid data returned from database, creating default graph');
            console.log('[loadGraphFromDatabase] Data structure:', JSON.stringify(data, null, 2));
            await loadDefaultGraph();
        }
    } catch (error) {
        console.error('[loadGraphFromDatabase] Error loading graph from database:', error);
        console.error('[loadGraphFromDatabase] Error stack:', error.stack);
        showNotification('Error loading graph: ' + error.message, 'error');
    }
}

function loadGraphData(data) {
    console.log('[loadGraphData] Loading graph data:', data);
    console.log('[loadGraphData] Nodes count:', data?.nodes?.length || 0);
    console.log('[loadGraphData] Edges count:', data?.edges?.length || 0);
    
    if (!data || !data.nodes || !data.edges) {
        console.error('[loadGraphData] Invalid data structure:', data);
        return;
    }
    
    graph.importData(data);
    
    appState.undoStack = [];
    appState.redoStack = [];
    appState.isModified = false;
    appState.isFiltered = false;
    
    console.log('[loadGraphData] Graph imported successfully');
    console.log('[loadGraphData] Current nodes:', graph.nodes.length);
    console.log('[loadGraphData] Current edges:', graph.edges.length);
    
    updateGraphInfo();
    renderQuickAccess();
    // CRITICAL: Do NOT call saveState() during load - it triggers auto-save which overwrites the database!
    // Instead, just render the graph without triggering any save operations
    graph.render();
}

function exportSVG() {
    const svg = generateSVG();
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `graph_${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('SVG exported successfully!');
}

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

async function importJSON() {
    if (typeof require !== 'undefined') {
        // Electron mode - use file dialog
        const { ipcRenderer } = require('electron');
        const result = await ipcRenderer.invoke('import-json-file');
        if (result.success) {
            await loadGraphData(result.graphData);
            showNotification(`JSON imported from ${result.fileName}`);
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
                        const data = JSON.parse(e.target.result);
                        await loadGraphData(data);
                        
                        // Save to database if available
                        if (dbManager) {
                            await saveGraphToDatabase();
                        }
                        
                        showNotification(`JSON imported from ${file.name}`);
                    } catch (error) {
                        showNotification('Error importing JSON: Invalid format', 'error');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }
}

function clearGraph() {
    if (confirm('Are you sure you want to clear the graph?')) {
        newGraph();
    }
}

function updateGraphInfo() {
    document.getElementById('node-count').textContent = graph.nodes.length;
    document.getElementById('edge-count').textContent = graph.edges.length;
    document.getElementById('current-mode').textContent = 
        appState.mode.charAt(0).toUpperCase() + appState.mode.slice(1);
    
    updateSelectionInfo();
}

function updateSelectionInfo() {
    const selectionInfo = document.getElementById('selection-info');
    
    if (graph.selectedNode) {
        const node = graph.selectedNode;
        const chineseLabelDisplay = node.chineseLabel ? 
            `<p><strong>中文:</strong> ${node.chineseLabel}</p>` : 
            '';
            
        selectionInfo.innerHTML = `
            <div style="font-size: 12px; line-height: 1.4;">
                <p><strong>English:</strong> ${node.label}</p>
                ${chineseLabelDisplay}
                <p><strong>Position:</strong> (${Math.round(node.x)}, ${Math.round(node.y)})</p>
                <p><strong>Color:</strong> <span style="display: inline-block; width: 12px; height: 12px; background-color: ${node.color}; border: 1px solid #333; vertical-align: middle; margin-right: 4px;"></span>${node.color}</p>
                <p><strong>Size:</strong> ${node.radius}px</p>
                ${node.category ? `<p><strong>Category:</strong> ${node.category}</p>` : ''}
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

// Search and Filter Functions
function setupSearchComponents() {
    const nodeSearchInput = document.getElementById('node-search');
    const centerNodeSearchInput = document.getElementById('center-node-search');
    const searchResults = document.getElementById('search-results');
    const centerNodeDropdown = document.getElementById('center-node-dropdown');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    
    // Node search functionality
    nodeSearchInput.addEventListener('input', (e) => handleNodeSearch(e.target.value, searchResults, 'search'));
    nodeSearchInput.addEventListener('keydown', (e) => handleSearchKeydown(e, searchResults, 'search'));
    
    // Center node search functionality
    centerNodeSearchInput.addEventListener('input', (e) => handleNodeSearch(e.target.value, centerNodeDropdown, 'filter'));
    centerNodeSearchInput.addEventListener('keydown', (e) => handleSearchKeydown(e, centerNodeDropdown, 'filter'));
    
    // Clear search
    clearSearchBtn.addEventListener('click', clearNodeSearch);
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            searchResults.classList.add('hidden');
            centerNodeDropdown.classList.add('hidden');
        }
    });
}

function handleNodeSearch(query, container, type) {
    if (!query.trim()) {
        container.classList.add('hidden');
        if (type === 'search') clearNodeHighlighting();
        return;
    }
    
    const nodes = graph.getAllNodes();
    const searchTerm = query.toLowerCase();
    
    const results = nodes.filter(node => 
        node.label.toLowerCase().includes(searchTerm) ||
        (node.chineseLabel && node.chineseLabel.toLowerCase().includes(searchTerm))
    ).slice(0, 20); // Limit to 20 results for performance
    
    renderSearchResults(results, container, type, query);
    
    if (type === 'search') {
        updateSearchCount(results.length, nodes.length);
        highlightSearchResults(results);
    }
}

function renderSearchResults(results, container, type, query) {
    container.innerHTML = '';
    
    if (results.length === 0) {
        container.innerHTML = '<div class="search-result">No nodes found</div>';
    } else {
        results.forEach((node, index) => {
            const resultDiv = document.createElement('div');
            resultDiv.className = 'search-result';
            resultDiv.dataset.nodeId = node.id;
            resultDiv.dataset.index = index;
            
            const labelMatch = highlightMatch(node.label, query);
            const chineseMatch = node.chineseLabel ? highlightMatch(node.chineseLabel, query) : '';
            
            resultDiv.innerHTML = `
                <div class="node-label">${labelMatch}</div>
                ${chineseMatch ? `<div class="node-chinese">${chineseMatch}</div>` : ''}
            `;
            
            resultDiv.addEventListener('click', () => {
                if (type === 'search') {
                    selectAndCenterNode(node.id);
                } else {
                    selectCenterNodeForFilter(node.id, node.label);
                }
                container.classList.add('hidden');
            });
            
            container.appendChild(resultDiv);
        });
    }
    
    container.classList.remove('hidden');
}

function highlightMatch(text, query) {
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return text;
    
    const before = text.substring(0, index);
    const match = text.substring(index, index + query.length);
    const after = text.substring(index + query.length);
    
    return `${before}<strong style="background: #fff3cd;">${match}</strong>${after}`;
}

function handleSearchKeydown(e, container, type) {
    if (container.classList.contains('hidden')) return;
    
    const results = container.querySelectorAll('.search-result');
    const active = container.querySelector('.search-result.active');
    
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (active) {
            active.classList.remove('active');
            const next = active.nextElementSibling;
            if (next) next.classList.add('active');
        } else {
            results[0]?.classList.add('active');
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (active) {
            active.classList.remove('active');
            const prev = active.previousElementSibling;
            if (prev) prev.classList.add('active');
        } else {
            results[results.length - 1]?.classList.add('active');
        }
    } else if (e.key === 'Enter') {
        e.preventDefault();
        const activeResult = container.querySelector('.search-result.active') || results[0];
        if (activeResult) {
            const nodeId = activeResult.dataset.nodeId;
            const node = graph.nodes.find(n => n.id == nodeId);
            
            if (type === 'search') {
                selectAndCenterNode(nodeId);
            } else {
                selectCenterNodeForFilter(nodeId, node.label);
            }
            container.classList.add('hidden');
        }
    } else if (e.key === 'Escape') {
        container.classList.add('hidden');
    }
}

function selectAndCenterNode(nodeId) {
    const node = graph.nodes.find(n => n.id == nodeId);
    if (!node) return;
    
    // Clear previous selections
    graph.selectedNode = null;
    graph.selectedEdge = null;
    
    // Select the node
    graph.selectedNode = node;
    
    // Center the view on the node
    graph.offset.x = -node.x * graph.scale + graph.canvas.width / 2;
    graph.offset.y = -node.y * graph.scale + graph.canvas.height / 2;
    
    graph.render();
    updateGraphInfo();
    showNotification(`Selected: ${node.label}`);
}

function selectCenterNodeForFilter(nodeId, label) {
    appState.filterParams.centerNodeId = nodeId;
    document.getElementById('center-node-search').value = label;
    document.getElementById('center-node-dropdown').classList.add('hidden');
}

function highlightSearchResults(results) {
    // Clear previous highlighting
    clearNodeHighlighting();
    
    // Add highlighting class to found nodes
    results.forEach(node => {
        const nodeIndex = graph.nodes.findIndex(n => n.id === node.id);
        if (nodeIndex !== -1) {
            graph.nodes[nodeIndex].highlighted = true;
        }
    });
    
    graph.render();
}

function clearNodeHighlighting() {
    graph.nodes.forEach(node => {
        delete node.highlighted;
    });
    graph.render();
}

function clearNodeSearch() {
    document.getElementById('node-search').value = '';
    document.getElementById('search-results').classList.add('hidden');
    clearNodeHighlighting();
    updateSearchCount(0, graph.nodes.length);
}

function updateSearchCount(found, total) {
    const countElement = document.getElementById('search-count');
    if (found > 0) {
        countElement.textContent = `${found} of ${total} nodes`;
        countElement.style.color = '#28a745';
    } else if (document.getElementById('node-search').value.trim()) {
        countElement.textContent = `No nodes found (${total} total)`;
        countElement.style.color = '#dc3545';
    } else {
        countElement.textContent = `${total} nodes`;
        countElement.style.color = '#666';
    }
}

// Update graph info including search count
function updateGraphInfo() {
    document.getElementById('node-count').textContent = graph.nodes.length;
    document.getElementById('edge-count').textContent = graph.edges.length;
    document.getElementById('current-mode').textContent = 
        appState.mode.charAt(0).toUpperCase() + appState.mode.slice(1);
    
    updateSelectionInfo();
    updateSearchCount(0, graph.nodes.length);
}

// Local Graph Filter functions (updated to use search)

function updateDistanceDisplay() {
    const value = document.getElementById('max-distance').value;
    document.getElementById('distance-value').textContent = value;
    appState.filterParams.maxDistance = parseFloat(value);
}

function updateDepthDisplay() {
    const value = document.getElementById('max-depth').value;
    document.getElementById('depth-value').textContent = value;
    appState.filterParams.maxDepth = parseInt(value);
}

function updateFilterParams() {
    const select = document.getElementById('center-node-select');
    appState.filterParams.centerNodeId = select.value;
}

async function applyFilter() {
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
        const success = graph.applyLocalGraphFilter(
            appState.filterParams.centerNodeId,
            appState.filterParams.maxDistance,
            appState.filterParams.maxDepth
        );
        
        if (success) {
            appState.isFiltered = true;
            updateGraphInfo();
            showNotification(`Filtered graph with center: ${centerNode.label}`);
        } else {
            showNotification('No nodes found within the specified constraints', 'info');
        }
    } catch (error) {
        showNotification('Error applying filter: ' + error.message, 'error');
    }
}

function resetFilter() {
    if (graph.resetFilter()) {
        appState.isFiltered = false;
        updateGraphInfo();
        showNotification('Filter reset - showing full graph');
    }
}

function saveViewConfig() {
    if (!appState.filterParams.centerNodeId) {
        showNotification('Please apply a filter first before saving', 'error');
        return;
    }
    
    const centerNode = graph.nodes.find(n => n.id === appState.filterParams.centerNodeId);
    if (!centerNode) {
        showNotification('Center node not found', 'error');
        return;
    }
    
    const config = {
        id: 'view-' + Date.now(),
        name: `${centerNode.label} (D:${appState.filterParams.maxDistance}, H:${appState.filterParams.maxDepth})`,
        centerNodeId: appState.filterParams.centerNodeId,
        maxDistance: appState.filterParams.maxDistance,
        maxDepth: appState.filterParams.maxDepth,
        centerNodeLabel: centerNode.label,
        timestamp: new Date().toISOString()
    };
    
    appState.quickAccess.push(config);
    
    // Keep only the 10 most recent configurations
    if (appState.quickAccess.length > 10) {
        appState.quickAccess = appState.quickAccess.slice(-10);
    }
    
    saveQuickAccess();
    renderQuickAccess();
    showNotification('View configuration saved');
}

function loadQuickAccess() {
    try {
        const saved = localStorage.getItem('graphQuickAccess');
        if (saved) {
            appState.quickAccess = JSON.parse(saved);
        }
    } catch (error) {
        console.error('Error loading quick access:', error);
        appState.quickAccess = [];
    }
}

function saveQuickAccess() {
    try {
        localStorage.setItem('graphQuickAccess', JSON.stringify(appState.quickAccess));
    } catch (error) {
        console.error('Error saving quick access:', error);
    }
}

function renderQuickAccess() {
    const container = document.getElementById('quick-access-list');
    container.innerHTML = '';
    
    if (appState.quickAccess.length === 0) {
        container.innerHTML = '<p style="font-size: 11px; color: #666;">No saved views</p>';
        return;
    }
    
    appState.quickAccess.forEach(config => {
        const item = document.createElement('div');
        item.className = 'quick-access-item';
        item.innerHTML = `
            <div style="flex: 1; cursor: pointer;" onclick="loadViewConfig('${config.id}')">
                ${config.name}
            </div>
            <button onclick="deleteViewConfig('${config.id}')" style="background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;">×</button>
        `;
        container.appendChild(item);
    });
}

function loadViewConfig(configId) {
    const config = appState.quickAccess.find(c => c.id === configId);
    if (!config) {
        showNotification('View configuration not found', 'error');
        return;
    }
    
    // Update UI controls
    document.getElementById('center-node-select').value = config.centerNodeId;
    document.getElementById('max-distance').value = config.maxDistance;
    document.getElementById('max-depth').value = config.maxDepth;
    
    // Update app state
    appState.filterParams.centerNodeId = config.centerNodeId;
    appState.filterParams.maxDistance = config.maxDistance;
    appState.filterParams.maxDepth = config.maxDepth;
    
    // Update displays
    updateDistanceDisplay();
    updateDepthDisplay();
    
    // Apply the filter
    applyFilter();
}

function deleteViewConfig(configId) {
    appState.quickAccess = appState.quickAccess.filter(c => c.id !== configId);
    saveQuickAccess();
    renderQuickAccess();
    showNotification('View configuration deleted');
}

function showNodeDialog(node) {
    const dialog = document.getElementById('node-dialog');
    const labelInput = document.getElementById('node-label');
    const chineseInput = document.getElementById('node-chinese');
    const colorInput = document.getElementById('node-color');
    const categoryInput = document.getElementById('node-category');
    const sizeInput = document.getElementById('node-size');
    const sizeDisplay = document.getElementById('size-display');
    
    labelInput.value = node.label;
    chineseInput.value = node.chineseLabel || '';
    colorInput.value = node.color;
    categoryInput.value = node.category || '';
    sizeInput.value = node.radius;
    sizeDisplay.textContent = node.radius;
    
    // Update size display when slider changes
    sizeInput.oninput = () => {
        sizeDisplay.textContent = sizeInput.value;
    };
    
    dialog.dataset.nodeId = node.id;
    dialog.classList.remove('hidden');
}

function showEdgeDialog(edge) {
    const dialog = document.getElementById('weight-dialog');
    const weightInput = document.getElementById('weight-input');
    const categoryInput = document.getElementById('edge-category');
    
    weightInput.value = edge.weight;
    categoryInput.value = edge.category || '';
    dialog.dataset.edgeId = edge.id;
    dialog.classList.remove('hidden');
}

function handleNodeOK() {
    const dialog = document.getElementById('node-dialog');
    const nodeId = dialog.dataset.nodeId;
    const label = document.getElementById('node-label').value;
    const chineseLabel = document.getElementById('node-chinese').value;
    const color = document.getElementById('node-color').value;
    const category = document.getElementById('node-category').value;
    const radius = parseInt(document.getElementById('node-size').value);
    
    const node = graph.nodes.find(n => n.id == nodeId);
    if (node) {
        saveState();
        node.label = label;
        node.chineseLabel = chineseLabel || '';
        node.color = color;
        node.category = category || null;
        node.radius = Math.max(1, Math.min(100, radius));
        graph.render();
        appState.isModified = true;
    }
    
    dialog.classList.add('hidden');
}

function handleNodeCancel() {
    document.getElementById('node-dialog').classList.add('hidden');
}

function handleNodeDelete() {
    const dialog = document.getElementById('node-dialog');
    const nodeId = dialog.dataset.nodeId;
    
    saveState();
    graph.deleteNode(nodeId);
    updateGraphInfo();
    appState.isModified = true;
    
    dialog.classList.add('hidden');
}

function handleWeightOK() {
    const dialog = document.getElementById('weight-dialog');
    const edgeId = dialog.dataset.edgeId;
    const weight = parseFloat(document.getElementById('weight-input').value);
    const category = document.getElementById('edge-category').value;
    
    if (!isNaN(weight)) {
        const edge = graph.edges.find(e => e.id == edgeId);
        if (edge) {
            saveState();
            edge.weight = weight;
            edge.category = category || null;
            graph.render();
            appState.isModified = true;
        }
    }
    
    dialog.classList.add('hidden');
}

function handleWeightCancel() {
    document.getElementById('weight-dialog').classList.add('hidden');
}

function handleKeyDown(e) {
    if (e.target.tagName === 'INPUT') return;
    
    if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
            case 'n':
                e.preventDefault();
                newGraph();
                break;
            case 's':
                e.preventDefault();
                if (e.shiftKey) {
                    saveGraphToFile(); // Ctrl+Shift+S for Save As
                } else {
                    if (typeof require !== 'undefined') {
                        const { ipcRenderer } = require('electron');
                        ipcRenderer.send('save-current-graph');
                    } else {
                        saveGraphToDatabase(); // Ctrl+S for Save
                    }
                }
                break;
            case 'o':
                e.preventDefault();
                openGraphFile();
                break;
            case 'z':
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
                break;
        }
    }
    
    switch (e.key) {
        case 'Escape':
            setMode('select');
            clearNodeSearch();
            break;
        case 'Delete':
        case 'Backspace':
            if (appState.selectedNode) {
                saveState();
                graph.deleteNode(appState.selectedNode.id);
                updateGraphInfo();
                appState.isModified = true;
            }
            break;
        case 'f':
        case 'F':
            if (!e.target.closest('input')) {
                e.preventDefault();
                document.getElementById('node-search').focus();
            }
            break;
    }
}

function generateSVG() {
    const data = graph.exportData();
    
    if (data.nodes.length === 0) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
            <text x="400" y="300" text-anchor="middle" font-family="Arial" font-size="16">Empty Graph</text>
        </svg>`;
    }

    const width = 800;
    const height = 600;
    const margin = 50;
    
    // Calculate bounds
    const minX = Math.min(...data.nodes.map(n => n.x - n.radius));
    const maxX = Math.max(...data.nodes.map(n => n.x + n.radius));
    const minY = Math.min(...data.nodes.map(n => n.y - n.radius));
    const maxY = Math.max(...data.nodes.map(n => n.y + n.radius));
    
    const scale = Math.min(
        (width - 2 * margin) / (maxX - minX),
        (height - 2 * margin) / (maxY - minY)
    );
    
    const offsetX = margin - minX * scale;
    const offsetY = margin - minY * scale;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <defs>
            <style>
                .node { fill: #3b82f6; stroke: #2563eb; stroke-width: 2; cursor: pointer; }
                .node-text { font-family: Arial, sans-serif; font-size: 12px; fill: white; text-anchor: middle; }
                .edge { stroke: #64748b; stroke-width: 2; }
                .edge-text { font-family: Arial, sans-serif; font-size: 10px; fill: #475569; text-anchor: middle; }
                .background { fill: #f8f9fa; }
            </style>
        </defs>
        <rect class="background" width="${width}" height="${height}"/>
    `;

    // Render edges
    data.edges.forEach(edge => {
        const from = data.nodes.find(n => n.id === edge.from);
        const to = data.nodes.find(n => n.id === edge.to);
        
        if (from && to) {
            const x1 = from.x * scale + offsetX;
            const y1 = from.y * scale + offsetY;
            const x2 = to.x * scale + offsetX;
            const y2 = to.y * scale + offsetY;
            
            svg += `<line class="edge" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
            
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            svg += `<text class="edge-text" x="${midX}" y="${midY - 5}">${edge.weight}</text>`;
        }
    });

    // Render nodes
    data.nodes.forEach(node => {
        const cx = node.x * scale + offsetX;
        const cy = node.y * scale + offsetY;
        const r = node.radius * scale;
        
        svg += `<circle class="node" cx="${cx}" cy="${cy}" r="${r}"></circle>`;
        svg += `<text class="node-text" x="${cx}" y="${cy + 4}">${node.label}</text>`;
    });

    svg += '</svg>';
    return svg;
}

function showGraphSelector(graphs) {
    return new Promise((resolve) => {
        const dialog = document.createElement('div');
        dialog.className = 'graph-selector-dialog';
        dialog.innerHTML = `
            <div class="dialog-overlay">
                <div class="dialog-content">
                    <h3>Select a Graph</h3>
                    <div class="graph-list">
                        ${graphs.map(graph => `
                            <div class="graph-item" data-id="${graph.id}">
                                <div class="graph-name">${graph.name || 'Untitled'}</div>
                                <div class="graph-stats">
                                    ${graph.nodeCount || 0} nodes, ${graph.edgeCount || 0} edges
                                    <br>
                                    ${new Date(graph.lastModified).toLocaleString()}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="dialog-buttons">
                        <button id="cancel-load">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Handle selection
        dialog.querySelectorAll('.graph-item').forEach(item => {
            item.addEventListener('click', () => {
                const graphId = item.dataset.id;
                dialog.remove();
                resolve(graphId);
            });
        });
        
        dialog.querySelector('#cancel-load').addEventListener('click', () => {
            dialog.remove();
            resolve(null);
        });
        
        // Close on overlay click
        dialog.querySelector('.dialog-overlay').addEventListener('click', (e) => {
            if (e.target === dialog.querySelector('.dialog-overlay')) {
                dialog.remove();
                resolve(null);
            }
        });
    });
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
        ${type === 'success' ? 'background: #28a745;' : 'background: #dc3545;'}
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function handleBeforeUnload(e) {
    if (appState.isModified) {
        e.preventDefault();
        e.returnValue = '';
    }
}

function loadDefaultGraph() {
    // Create a simple default graph with bilingual labels
    const node1 = graph.addNode(200, 200, 'Start', '#3b82f6', null, 20, '开始');
    const node2 = graph.addNode(400, 200, 'Process', '#3b82f6', null, 20, '处理');
    const node3 = graph.addNode(300, 350, 'End', '#3b82f6', null, 20, '结束');
    
    graph.addEdge(node1.id, node2.id, 1);
    graph.addEdge(node2.id, node3.id, 2);
    
    // CRITICAL: Don't trigger saveState() during initial load - it overwrites database!
    // Only update UI without triggering save operations
    appState.undoStack = [];
    appState.redoStack = [];
    appState.isModified = false;
    updateGraphInfo();
    graph.render();
}

// CSS for notifications and dialogs
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .graph-selector-dialog .dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }
    
    .graph-selector-dialog .dialog-content {
        background: white;
        padding: 20px;
        border-radius: 8px;
        max-width: 500px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    }
    
    .graph-selector-dialog h3 {
        margin-top: 0;
        color: #333;
    }
    
    .graph-selector-dialog .graph-list {
        margin: 15px 0;
    }
    
    .graph-selector-dialog .graph-item {
        padding: 12px;
        margin: 8px 0;
        border: 1px solid #ddd;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.2s;
    }
    
    .graph-selector-dialog .graph-item:hover {
        background-color: #f5f5f5;
        border-color: #007bff;
    }
    
    .graph-selector-dialog .graph-name {
        font-weight: bold;
        color: #333;
        margin-bottom: 4px;
    }
    
    .graph-selector-dialog .graph-stats {
        font-size: 12px;
        color: #666;
    }
    
    .graph-selector-dialog .dialog-buttons {
        text-align: right;
        margin-top: 15px;
    }
    
    .graph-selector-dialog button {
        padding: 8px 16px;
        margin-left: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: white;
        cursor: pointer;
    }
    
    .graph-selector-dialog button:hover {
        background: #f0f0f0;
    }
    
    #distance-analysis-dialog {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        animation: fadeIn 0.3s ease-out;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    #distance-analysis-dialog .dialog-content {
        background: white;
        padding: 25px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        max-width: 900px;
        max-height: 85vh;
        overflow-y: auto;
    }
    
    #distance-analysis-dialog h3 {
        margin: 0 0 15px 0;
        color: #333;
        font-size: 18px;
    }
    
    #distance-analysis-dialog table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 15px;
    }
    
    #distance-analysis-dialog th,
    #distance-analysis-dialog td {
        padding: 10px 12px;
        text-align: left;
        border-bottom: 1px solid #e0e0e0;
    }
    
    #distance-analysis-dialog th {
        background: #f8f9fa;
        font-weight: 600;
        color: #495057;
        font-size: 13px;
    }
    
    #distance-analysis-dialog td {
        font-size: 13px;
    }
    
    #distance-analysis-dialog tr:hover {
        background: #f8f9fa;
    }
    
    #distance-analysis-dialog .node-label {
        font-weight: 500;
        color: #333;
    }
    
    #distance-analysis-dialog .node-chinese {
        font-size: 12px;
        color: #666;
        margin-top: 2px;
    }
    
    #distance-analysis-dialog .color-swatch {
        display: inline-block;
        width: 20px;
        height: 20px;
        border-radius: 3px;
        border: 1px solid #ccc;
    }
`;
document.head.appendChild(style);