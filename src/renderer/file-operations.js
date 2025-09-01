// File operations module - 仅负责数据操作，不负责数据库实例管理

// Get current database instance
function getCurrentDb() {
    const dbInstanceManager = (typeof require !== 'undefined') 
        ? require('./db-instance-manager').dbInstanceManager 
        : window.dbInstanceManager;
    return dbInstanceManager ? dbInstanceManager.getCurrentDb() : null;
}

// Save graph to file
async function saveGraphToFile() {
    console.log('saveGraphToFile called');
    if (typeof require !== 'undefined') {
        // Electron mode - use file dialog for Save As
        console.log('Electron mode, using save-graph-file IPC');
        try {
            const { ipcRenderer } = require('electron');
            const data = graph.exportData();
            
            // Include current database path
            const currentDb = getCurrentDb();
            if (currentDb) {
                data.currentDbPath = currentDb.dbPath;
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
    const currentDb = getCurrentDb();
    if (!currentDb) {
        console.error('No database available for save');
        return;
    }
    
    try {
        const graphData = graph.exportData();
        const data = {
            ...graphData,
            metadata: {
                name: 'Graph ' + new Date().toLocaleString(),
                lastModified: new Date().toISOString()
            }
        };
        
        await currentDb.saveGraph(data);
        appState.isModified = false;
    } catch (error) {
        console.error('Error saving to database:', error);
        showNotification('Error saving graph: ' + error.message, 'error');
    }
}

// Save as new database file (web mode)
async function saveAsNewFile() {
    const dbInstanceManager = (typeof require !== 'undefined') 
        ? require('./db-instance-manager').dbInstanceManager 
        : window.dbInstanceManager;
    if (!dbInstanceManager) return;
    
    try {
        // Create a new filename prompt
        const fileName = prompt('Enter new database filename:', 'graph-' + Date.now() + '.db');
        if (!fileName) return;
        
        if (!fileName.endsWith('.db')) {
            alert('Please use .db extension');
            return;
        }
        
        const newPath = path.join(path.dirname(dbInstanceManager.getCurrentDb().dbPath), fileName);
        
        // CRITICAL FIX: Copy current database file to preserve all timestamps
        try {
            // Use fs.copyFileSync in web mode via appropriate method
            const fs = require('fs');
            const currentDbPath = dbInstanceManager.getCurrentDb().dbPath;
            if (fs.existsSync(currentDbPath)) {
                fs.copyFileSync(currentDbPath, newPath);
                console.log('Database copied successfully, preserving timestamps');
                
                // Now update the copied database with current graph data (UPSERT will preserve timestamps)
                const data = graph.exportData();
                data.currentDbPath = newPath; // Update current path reference
                
                // CRITICAL FIX: Switch to new database and update with current data
                await dbInstanceManager.openFile(newPath);
                const currentDb = dbInstanceManager.getCurrentDb();
                await currentDb.saveGraph(data);
                
                // CRITICAL FIX: Load the database content to sync application state
                await loadGraphFromDatabase();
                
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

// Fallback to JSON load via file input with merge option
function fallbackToJSONLoad() {
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
                    
                    // Show import mode dialog
                    const result = await showImportModeDialog(jsonString);
                    if (!result) return; // User cancelled
                    
                    const { mode, conflictResolution } = result;
                    
                    if (mode === 'replace') {
                        // Original behavior: replace all data
                        const data = JSON.parse(jsonString);
                        const dbInstanceManager = (typeof require !== 'undefined') 
                            ? require('./db-instance-manager').dbInstanceManager 
                            : window.dbInstanceManager;
                        if (dbInstanceManager) {
                            await dbInstanceManager.importFromJSON(data);
                            await loadGraphFromDatabase();
                            showNotification('JSON imported to database!');
                        } else {
                            loadGraphData(data);
                        }
                    } else {
                        // Merge mode: use ExportManager
                        if (!window.exportManager) {
                            showNotification('Export manager not available', 'error');
                            return;
                        }
                        
                        const importResult = window.exportManager.importJSON(jsonString, {
                            merge: true,
                            conflictResolution: conflictResolution
                        });
                        
                        if (importResult.success) {
                            const mergeResult = importResult.mergeResult;
                            const message = this.formatImportNotification(mergeResult);
                            showNotification(message);
                            updateGraphInfo();
                            graph.render();
                        } else {
                            showNotification('Error importing graph: ' + importResult.error, 'error');
                        }
                    }
                } catch (error) {
                    console.error('Error loading graph:', error);
                    showNotification('Error loading graph: ' + error.message, 'error');
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
}

/**
 * Show import mode selection dialog
 * @param {string} jsonString - The JSON data to import
 * @returns {Promise<Object|null>} Import options or null if cancelled
 */
function showImportModeDialog(jsonString) {
    return new Promise((resolve) => {
        // Create dialog
        const dialog = document.createElement('div');
        dialog.className = 'import-dialog';
        dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: auto;
            height: auto;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10000;
            display: block;
        `;
        
        const content = document.createElement('div');
        content.className = 'import-dialog-content';
        content.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 8px;
            max-width: 400px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            position: relative;
            margin: 0;
        `;
        
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
        
        content.innerHTML = `
            <h3>Import Options</h3>
            <p>Found ${nodeCount} nodes and ${edgeCount} edges in the file.</p>
            
            <div style="margin: 15px 0;">
                <label style="display: block; margin-bottom: 10px;">
                    <input type="radio" name="import-mode" value="replace" checked style="margin-right: 8px;">
                    <strong>Replace Current Graph</strong><br>
                    <small style="color: #666;">Replace all existing data with imported data</small>
                </label>
                
                <label style="display: block; margin-bottom: 10px;">
                    <input type="radio" name="import-mode" value="merge" style="margin-right: 8px;">
                    <strong>Merge with Current Graph</strong><br>
                    <small style="color: #666;">Add imported data to existing graph</small>
                </label>
            </div>
            
            <div id="merge-options" style="display: none; margin: 15px 0; padding: 10px; background: #f5f5f5; border-radius: 4px;">
                <label style="display: block; margin-bottom: 5px;">Handle ID Conflicts:</label>
                <select id="conflict-resolution" style="width: 100%; padding: 5px;">
                    <option value="replace">Replace existing items</option>
                    <option value="skip">Skip conflicting items</option>
                    <option value="rename">Rename imported items</option>
                </select>
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                <button id="import-cancel" class="btn btn-secondary">Cancel</button>
                <button id="import-confirm" class="btn btn-primary">Import</button>
            </div>
        `;
        
        // Remove any existing import dialogs first
        const existingDialog = document.querySelector('.import-dialog');
        if (existingDialog && existingDialog.parentNode) {
            existingDialog.parentNode.removeChild(existingDialog);
        }
        
        dialog.appendChild(content);
        document.body.appendChild(dialog);
        
        // Handle radio buttons
        const replaceRadio = content.querySelector('input[value="replace"]');
        const mergeRadio = content.querySelector('input[value="merge"]');
        const mergeOptions = content.querySelector('#merge-options');
        
        const updateUI = () => {
            mergeOptions.style.display = mergeRadio.checked ? 'block' : 'none';
        };
        
        replaceRadio.addEventListener('change', updateUI);
        mergeRadio.addEventListener('change', updateUI);
        
        // Handle buttons
        content.querySelector('#import-cancel').onclick = () => {
            document.body.removeChild(dialog);
            resolve(null);
        };
        
        content.querySelector('#import-confirm').onclick = () => {
            const mode = content.querySelector('input[name="import-mode"]:checked').value;
            const conflictResolution = content.querySelector('#conflict-resolution').value;
            
            document.body.removeChild(dialog);
            resolve({ mode, conflictResolution });
        };
        
        // Handle escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(dialog);
                document.removeEventListener('keydown', handleEscape);
                resolve(null);
            }
        };
        document.addEventListener('keydown', handleEscape);
    });
}

/**
 * Format import result notification
 * @param {Object} result - Merge result from exportManager
 * @returns {string} Formatted notification message
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

// Open from database selector
async function openFromDatabase() {
    const dbInstanceManager = (typeof require !== 'undefined') 
        ? require('./db-instance-manager').dbInstanceManager 
        : window.dbInstanceManager;
    if (!dbInstanceManager) return;
    
    try {
        const graphs = await dbInstanceManager.listGraphs();
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
        
        const currentDb = getCurrentDb();
        if (!currentDb) {
            console.error('[loadGraphFromDatabase] No database available');
            await loadDefaultGraph();
            return;
        }
        
        const data = await currentDb.loadGraph(graphId);
        console.log('[loadGraphFromDatabase] Received data from database:', data);
        
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
        loadGraphData,
        formatImportNotification
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
        loadGraphData,
        formatImportNotification
    });
}