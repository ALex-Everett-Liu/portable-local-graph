// Keyboard shortcuts module

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
            if (graph.selectedNode) {
                saveState();
                graph.deleteNode(graph.selectedNode.id);
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