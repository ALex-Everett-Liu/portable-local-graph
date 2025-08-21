const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        icon: path.join(__dirname, 'assets', 'icon.png')
    });

    mainWindow.loadFile('index.html');

    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }

    // Create menu
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Graph',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        mainWindow.webContents.send('new-graph');
                    }
                },
                {
                    label: 'Open Graph...',
                    accelerator: 'CmdOrCtrl+O',
                    click: async () => {
                        const result = await dialog.showOpenDialog(mainWindow, {
                            filters: [
                                { name: 'SQLite Database', extensions: ['db'] },
                                { name: 'JSON Files', extensions: ['json'] }
                            ]
                        });
                        
                        if (!result.canceled && result.filePaths.length > 0) {
                            const filePath = result.filePaths[0];
                            if (filePath.endsWith('.db')) {
                                const DatabaseManager = require('./database-manager');
                                const dbManager = new DatabaseManager(filePath);
                                await dbManager.init();
                                const graphs = await dbManager.listGraphs();
                                if (graphs.length > 0) {
                                    const graphData = await dbManager.loadGraph(graphs[0].id);
                                    await dbManager.close();
                                    mainWindow.webContents.send('open-graph-file-result', {
                                        success: true,
                                        graphData,
                                        graphId: graphs[0].id,
                                        fileName: path.basename(filePath),
                                        filePath: filePath
                                    });
                                } else {
                                    await dbManager.close();
                                    mainWindow.webContents.send('open-graph-file-result', {
                                        success: false,
                                        error: 'No graphs found in database'
                                    });
                                }
                            } else {
                                const data = fs.readFileSync(filePath, 'utf8');
                                mainWindow.webContents.send('open-graph-file-result', {
                                    success: true,
                                    graphData: JSON.parse(data),
                                    fileName: path.basename(filePath),
                                    filePath: filePath
                                });
                            }
                        } else {
                            mainWindow.webContents.send('open-graph-file-result', {
                                success: false,
                                cancelled: true
                            });
                        }
                    }
                },
                {
                    label: 'Save',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => {
                        mainWindow.webContents.send('save-current-graph');
                    }
                },
                {
                    label: 'Save As...',
                    accelerator: 'CmdOrCtrl+Shift+S',
                    click: async () => {
                        const result = await dialog.showSaveDialog(mainWindow, {
                            filters: [
                                { name: 'SQLite Database', extensions: ['db'] },
                                { name: 'JSON Files', extensions: ['json'] }
                            ],
                            defaultPath: 'graph.db'
                        });
                        
                        if (!result.canceled) {
                            if (result.filePath.endsWith('.db')) {
                                mainWindow.webContents.send('save-graph-file-request', result.filePath);
                            } else {
                                mainWindow.webContents.send('save-graph-request', result.filePath);
                            }
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: 'Export SVG',
                    click: () => {
                        mainWindow.webContents.send('export-svg-request');
                    }
                },
                {
                    label: 'Import JSON...',
                    click: () => {
                        mainWindow.webContents.send('import-json-request');
                    }
                },
                {
                    label: 'Export JSON...',
                    click: () => {
                        mainWindow.webContents.send('export-json-request');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Exit',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// IPC handlers for database files
ipcMain.handle('save-graph-file', async (event, data) => {
    console.log('[save-graph-file] Starting Save As operation...');
    console.log('[save-graph-file] Graph data nodes:', data.nodes?.length, 'edges:', data.edges?.length);
    
    try {
        const result = await dialog.showSaveDialog(mainWindow, {
            filters: [
                { name: 'SQLite Database', extensions: ['db'] }
            ],
            defaultPath: 'graph.db'
        });
        
        if (result.canceled) {
            console.log('[save-graph-file] Save dialog cancelled');
            return { success: false, cancelled: true };
        }
        
        console.log('[save-graph-file] Target file path:', result.filePath);
        
        // CRITICAL FIX: Save current graph data to new file instead of copying old file
        console.log('[save-graph-file] Creating new database with current graph data...');
        
        // Ensure target directory exists
        const targetDir = path.dirname(result.filePath);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
            console.log('[save-graph-file] Created target directory:', targetDir);
        }
        
        // Create new database and save current graph data
        const DatabaseManager = require('./database-manager');
        const dbManager = new DatabaseManager(result.filePath);
        await dbManager.init();
        await dbManager.saveGraph(data);
        await dbManager.close();
        
        console.log('[save-graph-file] Database created successfully with current data');
        
        return { 
            success: true, 
            fileName: path.basename(result.filePath),
            filePath: result.filePath,
            method: 'save'
        };
    } catch (error) {
        console.error('[save-graph-file] Error:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('open-graph-file', async () => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            filters: [
                { name: 'SQLite Database', extensions: ['db'] }
            ],
            properties: ['openFile']
        });
        
        if (result.canceled || result.filePaths.length === 0) {
            return { success: false, cancelled: true };
        }
        
        const filePath = result.filePaths[0];
        const DatabaseManager = require('./database-manager');
        const dbManager = new DatabaseManager(filePath);
        await dbManager.init();
        
        // Get the graph data
        const graphData = await dbManager.loadGraph();
        await dbManager.close();
        
        return { 
            success: true, 
            graphData,
            fileName: path.basename(filePath),
            filePath: filePath
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Legacy JSON handlers
ipcMain.handle('save-graph', async (event, data, filePath) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('save-graph-file-request', async (event, filePath, data) => {
    console.log('[save-graph-file-request] Save As request for:', filePath);
    console.log('[save-graph-file-request] Graph data nodes:', data.nodes?.length, 'edges:', data.edges?.length);
    
    try {
        // CRITICAL FIX: Save current graph data to new file instead of copying old file
        console.log('[save-graph-file-request] Creating new database with current graph data...');
        
        // Ensure target directory exists
        const targetDir = path.dirname(filePath);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
            console.log('[save-graph-file-request] Created target directory:', targetDir);
        }
        
        // Create new database and save current graph data
        const DatabaseManager = require('./database-manager');
        const dbManager = new DatabaseManager(filePath);
        await dbManager.init();
        await dbManager.saveGraph(data);
        await dbManager.close();
        
        console.log('[save-graph-file-request] Database created successfully with current data');
        
        return { 
            success: true, 
            fileName: path.basename(filePath),
            filePath: filePath,
            method: 'save'
        };
    } catch (error) {
        console.error('[save-graph-file-request] Error:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('export-svg', async (event, svgData) => {
    try {
        const result = await dialog.showSaveDialog(mainWindow, {
            filters: [
                { name: 'SVG Files', extensions: ['svg'] }
            ]
        });
        
        if (!result.canceled) {
            fs.writeFileSync(result.filePath, svgData);
            return { success: true, filePath: result.filePath };
        }
        return { success: false, cancelled: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('export-json', async (event, data) => {
    try {
        const result = await dialog.showSaveDialog(mainWindow, {
            filters: [
                { name: 'JSON Files', extensions: ['json'] }
            ],
            defaultPath: 'graph.json'
        });
        
        if (!result.canceled) {
            fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2));
            return { success: true, filePath: result.filePath };
        }
        return { success: false, cancelled: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('import-json-file', async () => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            filters: [
                { name: 'JSON Files', extensions: ['json'] }
            ],
            properties: ['openFile']
        });
        
        if (result.canceled || result.filePaths.length === 0) {
            return { success: false, cancelled: true };
        }
        
        const filePath = result.filePaths[0];
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        return { 
            success: true, 
            graphData: data,
            fileName: path.basename(filePath),
            filePath
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});