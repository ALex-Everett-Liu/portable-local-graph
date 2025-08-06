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
                    label: 'Open Graph',
                    accelerator: 'CmdOrCtrl+O',
                    click: async () => {
                        const result = await dialog.showOpenDialog(mainWindow, {
                            filters: [
                                { name: 'JSON Files', extensions: ['json'] }
                            ]
                        });
                        
                        if (!result.canceled && result.filePaths.length > 0) {
                            const data = fs.readFileSync(result.filePaths[0], 'utf8');
                            mainWindow.webContents.send('load-graph', JSON.parse(data));
                        }
                    }
                },
                {
                    label: 'Save Graph',
                    accelerator: 'CmdOrCtrl+S',
                    click: async () => {
                        const result = await dialog.showSaveDialog(mainWindow, {
                            filters: [
                                { name: 'JSON Files', extensions: ['json'] }
                            ]
                        });
                        
                        if (!result.canceled) {
                            mainWindow.webContents.send('save-graph-request', result.filePath);
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: 'Export as SVG',
                    click: () => {
                        mainWindow.webContents.send('export-svg-request');
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

// IPC handlers
ipcMain.handle('save-graph', async (event, data, filePath) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return { success: true };
    } catch (error) {
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