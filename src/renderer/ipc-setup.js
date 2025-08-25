// IPC setup for Electron

// Global database manager instance
let dbManager = null;

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
                        
                        // Always create fresh database manager for file isolation
                        if (typeof require !== 'undefined') {
                            const DatabaseManager = require('../server/database-manager');
                            
                            // Close existing connection
                            if (dbManager) {
                                await dbManager.close();
                            }
                            
                            // Create new instance for the new file
                            dbManager = new DatabaseManager(result.filePath);
                            await dbManager.init();
                            console.log('Database isolated to new file:', result.filePath);
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
                console.log('Save triggered for current file');
                console.log('Database path:', dbManager ? dbManager.dbPath : 'no db manager');
                
                if (dbManager) {
                    console.log('[save-current-graph] Saving to existing database:', dbManager.dbPath);
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
                if (dbManager) {
                    data.currentDbPath = dbManager.dbPath;
                }
                console.log('[save-graph-file-request] Calling with current path:', data.currentDbPath);
                
                const result = await ipcRenderer.invoke('save-graph-file-request', filePath, data);
                if (result.success) {
                    console.log('[save-graph-file-request] Save completed, method:', result.method);
                    // Switch to the new database file
                    if (dbManager && result.filePath) {
                        try {
                            await dbManager.openFile(result.filePath);
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
            const DatabaseManager = require('../server/database-manager');
            console.log('[initializeDatabase] DatabaseManager loaded successfully');
            
            // Always start fresh - close any existing connections first
            if (dbManager) {
                console.log('[initializeDatabase] Closing existing database connection...');
                await dbManager.close();
            }
            
            dbManager = new DatabaseManager();
            console.log('[initializeDatabase] Fresh DatabaseManager instance created');
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

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { setupIPC, initializeDatabase };
} else {
    window.setupIPC = setupIPC;
    window.initializeDatabase = initializeDatabase;
}