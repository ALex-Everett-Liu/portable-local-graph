// Keyboard shortcuts module

function handleKeyDown(e) {
    // Ignore if input is focused
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    // Handle Alt key for hotkey mode (let hotkey-mode.js handle it)
    if (e.key === 'Alt' && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
        // Let hotkey-mode handle this
        return;
    }
    
    // Handle Ctrl+P for command palette
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        if (window.commandPalette) {
            window.commandPalette.toggle();
        }
        return;
    }
    
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
            case '=':
            case '+':
                e.preventDefault();
                if (graph) {
                    graph.scale *= 1.2;
                    graph.scale = Math.min(5, graph.scale);
                    graph.render();
                }
                break;
            case '-':
                e.preventDefault();
                if (graph) {
                    graph.scale *= 0.8;
                    graph.scale = Math.max(0.1, graph.scale);
                    graph.render();
                }
                break;
            case '0':
                e.preventDefault();
                if (graph) {
                    graph.scale = 1;
                    graph.render();
                }
                break;
        }
    }
    
    // Single key shortcuts (only when not in hotkey mode)
    if (!window.hotkeyMode || !window.hotkeyMode.isActive) {
        switch (e.key.toLowerCase()) {
            case 'n':
                if (!e.ctrlKey && !e.metaKey && !e.altKey) {
                    setMode('node');
                }
                break;
            case 'e':
                if (!e.ctrlKey && !e.metaKey && !e.altKey) {
                    setMode('edge');
                }
                break;
            case 's':
                if (!e.ctrlKey && !e.metaKey && !e.altKey) {
                    setMode('select');
                }
                break;
            case 'f':
            case 'F':
                if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.target.closest('input')) {
                    e.preventDefault();
                    const searchInput = document.getElementById('node-search');
                    if (searchInput) searchInput.focus();
                }
                break;
            case 'c':
                if (!e.ctrlKey && !e.metaKey && !e.altKey) {
                    if (graph && graph.calculateCentralities) {
                        graph.calculateCentralities();
                    }
                }
                break;
            case 'l':
                if (!e.ctrlKey && !e.metaKey && !e.altKey) {
                    if (window.toggleLayerManager) {
                        window.toggleLayerManager();
                    }
                }
                break;
        }
    }
    
    switch (e.key) {
        case 'Escape':
            // If hotkey mode is active, let it handle Escape
            if (window.hotkeyMode && window.hotkeyMode.isActive) {
                return; // hotkey-mode.js will handle this
            }
            
            // Otherwise, handle Escape normally
            if (!window.commandPalette || !window.commandPalette.isOpen) {
                setMode('select');
                clearNodeSearch();
            }
            break;
        case 'Delete':
        case 'Backspace':
            if (graph && graph.selectedNode) {
                saveState();
                graph.deleteNode(graph.selectedNode.id);
                updateGraphInfo();
                if (appState) appState.isModified = true;
            }
            break;
    }
}

// Handle before unload
function handleBeforeUnload(e) {
    if (appState.isModified) {
        e.preventDefault();
        e.returnValue = '';
    }
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { handleKeyDown, handleBeforeUnload };
} else {
    window.handleKeyDown = handleKeyDown;
    window.handleBeforeUnload = handleBeforeUnload;
}