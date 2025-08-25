// File operations module

// Global database manager instance (shared with ipc-setup.js)
// This is declared in ipc-setup.js but referenced here

// Save graph to file
async function saveGraphToFile() {
    console.log('saveGraphToFile called');
    if (typeof require !== 'undefined') {
        // Electron mode - use file dialog for Save As
        console.log('Electron mode, using save-graph-file IPC');
        try {
            const { ipcRenderer } = require('electron');
            const data = graph.exportData();
            // Include current database path for accurate copying
            if (dbManager) {
                data.currentDbPath = dbManager.dbPath;
            }
            console.log('[saveGraphToFile] Calling save-graph-file with data:', { 
                hasCurrentPath: !!data.currentDbPath,
                currentPath: data.currentDbPath,
                nodesCount: data.nodes?.length,
                edgesCount: data.edges?.length
            });
            const result = await ipcRenderer.invoke('save-graph-file', data);
            if (result.success) {
                showNotification(`Graph saved to ${result.fileName}`);
            } else if (!result.cancelled) {
                showNotification('Error saving graph: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error in saveGraphToFile:', error);
        }
    } else {
        // Web mode - use Save As to new database file
        console.log('Web mode, using saveAsNewFile');
        try {
            await saveAsNewFile();
        } catch (error) {
            console.error('Error in saveGraphToFile web mode:', error);
        }
    }
}

// Save graph to database
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

// Save as new database file (web mode)
async function saveAsNewFile() {
    if (!dbManager) return;
    
    try {
        // Create a new filename prompt
        const fileName = prompt('Enter new database filename:', 'graph-' + Date.now() + '.db');
        if (!fileName) return;
        
        if (!fileName.endsWith('.db')) {
            alert('Please use .db extension');
            return;
        }
        
        const newPath = path.join(path.dirname(dbManager.dbPath), fileName);
        
        // CRITICAL FIX: Copy current database file to preserve all timestamps
        try {
            // Use fs.copyFileSync in web mode via appropriate method
            const fs = require('fs');
            if (fs.existsSync(dbManager.dbPath)) {
                fs.copyFileSync(dbManager.dbPath, newPath);
                console.log('Database copied successfully, preserving timestamps');
                
                // Now update the copied database with current graph data (UPSERT will preserve timestamps)
                const data = graph.exportData();
                data.currentDbPath = newPath; // Update current path reference
                
                // Switch to new database and update with current data
                await dbManager.openFile(newPath);
                await dbManager.saveGraph(data);
                
                showNotification('Graph saved as new file: ' + fileName);
            } else {
                // Fallback: create new database if source doesn't exist
                console.warn('Source database not found, creating new one');
                await saveGraphToDatabase();
            }
        } catch (copyError) {
            console.error('Copy failed, falling back to save:', copyError);
            await saveGraphToDatabase();
        }
    } catch (error) {
        console.error('Error in saveAsNewFile:', error);
        showNotification('Error saving as new file: ' + error.message, 'error');
    }
}

// Open graph file
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

// Fallback to JSON load via file input
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

// Open from database selector
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

// Load graph from database
async function loadGraphFromDatabase(graphId = null) {
    try {
        console.log('[loadGraphFromDatabase] Loading graph from database...');
        
        // IMPORTANT: This function should NOT create database instances
        // It should only load data from the existing dbManager
        if (!dbManager) {
            console.error('[loadGraphFromDatabase] No dbManager available');
            await loadDefaultGraph();
            return;
        }
        
        const data = await dbManager.loadGraph(graphId);
        console.log('[loadGraphFromDatabase] Received data from new dbManager:', data);
        
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
            await loadDefaultGraph();
        }
    } catch (error) {
        console.error('[loadGraphFromDatabase] Error loading graph from database:', error);
        console.error('[loadGraphFromDatabase] Error stack:', error.stack);
        showNotification('Error loading graph: ' + error.message, 'error');
    }
}

// Load graph data
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

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        saveGraphToFile,
        saveGraphToDatabase,
        saveAsNewFile,
        openGraphFile,
        fallbackToJSONLoad,
        openFromDatabase,
        loadGraphFromDatabase,
        loadGraphData
    };
} else {
    Object.assign(window, {
        saveGraphToFile,
        saveGraphToDatabase,
        saveAsNewFile,
        openGraphFile,
        fallbackToJSONLoad,
        openFromDatabase,
        loadGraphFromDatabase,
        loadGraphData
    });
}