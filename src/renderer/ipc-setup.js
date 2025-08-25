// IPC setup for Electron

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
                    try {
                        console.log('Opening database via openFile:', result.filePath);
                        
                        // 使用数据库单例进行原子切换
                        const dbInstanceManager = (typeof require !== 'undefined') 
                            ? require('./db-instance-manager').dbInstanceManager 
                            : window.dbInstanceManager;
                        
                        if (typeof require !== 'undefined') {
                            await dbInstanceManager.openFile(result.filePath);
                            console.log('Database switched to new file:', result.filePath);
                        }
                        
                        await loadGraphFromDatabase();
                        appState.isModified = false;
                        showNotification(`Graph opened from ${result.fileName}`);
                    } catch (error) {
                        console.error('Error opening database file:', error);
                        showNotification('Error opening database: ' + error.message, 'error');
                    }
                } else if (!result.cancelled) {
                    showNotification('Error opening graph: ' + result.error, 'error');
                }
            });

            ipcRenderer.on('save-current-graph', async () => {
                const dbInstanceManager = (typeof require !== 'undefined') 
                    ? require('./db-instance-manager').dbInstanceManager 
                    : window.dbInstanceManager;
                const currentDb = dbInstanceManager ? dbInstanceManager.getCurrentDb() : null;
                console.log('Save triggered for current file');
                console.log('Database path:', currentDb ? currentDb.dbPath : 'no db manager');
                
                if (currentDb) {
                    console.log('[save-current-graph] Saving to existing database:', currentDb.dbPath);
                    await saveGraphToDatabase();
                    showNotification('Graph saved to current file');
                } else {
                    console.log('[save-current-graph] No dbManager, falling back to Save As');
                    // Fallback to Save As if no database
                    await saveGraphToFile();
                }
            });

            ipcRenderer.on('save-graph-file-request', async (event, filePath) => {
                const data = graph.exportData();
                
                // Include current database path for accurate copying
                const dbInstanceManager = (typeof require !== 'undefined') 
                    ? require('./db-instance-manager').dbInstanceManager 
                    : window.dbInstanceManager;
                const currentDb = dbInstanceManager ? dbInstanceManager.getCurrentDb() : null;
                if (currentDb) {
                    data.currentDbPath = currentDb.dbPath;
                }
                
                console.log('[save-graph-file-request] Calling with current path:', data.currentDbPath);
                
                const result = await ipcRenderer.invoke('save-graph-file-request', filePath, data);
                if (result.success) {
                    console.log('[save-graph-file-request] Save completed, method:', result.method);
                    // Switch to the new database file using singleton
                    if (result.filePath) {
                        try {
                            await dbInstanceManager.openFile(result.filePath);
                            showNotification(`Graph saved as ${result.fileName} (${result.method})`);
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

// Initialize database
async function initializeDatabase() {
    console.log('[initializeDatabase] Starting database initialization...');
    
    if (typeof require !== 'undefined') {
        try {
            console.log('[initializeDatabase] Electron mode detected');
            
            const dbInstanceManager = require('./db-instance-manager').dbInstanceManager;
            // Use database instance manager for initialization
            await dbInstanceManager.initialize();
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
    } else {
        // Web mode - use default graph
        console.log('[initializeDatabase] Running in web mode (no require)');
        await loadDefaultGraph();
    }
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { setupIPC, initializeDatabase };
} else {
    window.setupIPC = setupIPC;
    window.initializeDatabase = initializeDatabase;
}