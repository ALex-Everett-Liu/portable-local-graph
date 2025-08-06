// Application state
const appState = {
    mode: 'node', // 'node', 'edge', 'select'
    edgeStart: null,
    selectedNode: null,
    selectedEdge: null,
    undoStack: [],
    redoStack: [],
    maxHistorySize: 50,
    isModified: false
};

let graph;

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('graph-canvas');
    graph = new Graph(canvas, {
        mode: appState.mode,
        onModeChange: (mode) => setMode(mode),
        onGraphUpdate: updateGraphInfo
    });
    
    setupEventListeners();
    setupIPC();
    updateGraphInfo();
    
    // Load default graph or create new
    loadDefaultGraph();
});

function setupEventListeners() {
    // Toolbar buttons
    document.getElementById('node-mode').addEventListener('click', () => setMode('node'));
    document.getElementById('edge-mode').addEventListener('click', () => setMode('edge'));
    document.getElementById('select-mode').addEventListener('click', () => setMode('select'));
    
    document.getElementById('undo-btn').addEventListener('click', undo);
    document.getElementById('redo-btn').addEventListener('click', redo);
    document.getElementById('clear-btn').addEventListener('click', clearGraph);
    
    document.getElementById('new-graph-btn').addEventListener('click', newGraph);
    document.getElementById('save-btn').addEventListener('click', saveGraph);
    document.getElementById('load-btn').addEventListener('click', loadGraph);
    document.getElementById('export-svg-btn').addEventListener('click', exportSVG);
    
    // Dialog buttons
    document.getElementById('weight-ok').addEventListener('click', handleWeightOK);
    document.getElementById('weight-cancel').addEventListener('click', handleWeightCancel);
    
    document.getElementById('node-ok').addEventListener('click', handleNodeOK);
    document.getElementById('node-cancel').addEventListener('click', handleNodeCancel);
    document.getElementById('node-delete').addEventListener('click', handleNodeDelete);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyDown);
    
    // Window events
    window.addEventListener('beforeunload', handleBeforeUnload);
}

function setupIPC() {
    if (typeof require !== 'undefined') {
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
        
        ipcRenderer.on('export-svg-request', async () => {
            const svgData = generateSVG();
            const result = await ipcRenderer.invoke('export-svg', svgData);
            if (result.success) {
                showNotification('SVG exported successfully!');
            } else if (!result.cancelled) {
                showNotification('Error exporting SVG: ' + result.error);
            }
        });
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

function saveState() {
    const state = graph.exportData();
    appState.undoStack.push(state);
    
    // Limit undo stack size
    if (appState.undoStack.length > appState.maxHistorySize) {
        appState.undoStack.shift();
    }
    
    // Clear redo stack when new action is performed
    appState.redoStack = [];
    
    appState.isModified = true;
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

function newGraph() {
    if (appState.isModified) {
        if (!confirm('Current graph has unsaved changes. Continue?')) {
            return;
        }
    }
    
    graph.clear();
    appState.undoStack = [];
    appState.redoStack = [];
    appState.isModified = false;
    
    currentGraph = {
        nodes: [],
        edges: [],
        metadata: {
            name: 'Untitled Graph',
            created: new Date().toISOString(),
            lastModified: new Date().toISOString()
        }
    };
    
    updateGraphInfo();
    saveState();
}

function saveGraph() {
    if (typeof require !== 'undefined') {
        const { ipcRenderer } = require('electron');
        ipcRenderer.send('save-graph-request');
    } else {
        // Web fallback
        const data = graph.exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `graph_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

function loadGraph() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    loadGraphData(data);
                } catch (error) {
                    showNotification('Error loading graph: Invalid JSON');
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
}

function loadGraphData(data) {
    graph.importData(data);
    currentGraph = {
        ...data,
        metadata: {
            ...data.metadata,
            lastModified: new Date().toISOString()
        }
    };
    
    appState.undoStack = [];
    appState.redoStack = [];
    appState.isModified = false;
    
    updateGraphInfo();
    saveState();
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
}

function showNodeDialog(node) {
    const dialog = document.getElementById('node-dialog');
    const labelInput = document.getElementById('node-label');
    const colorInput = document.getElementById('node-color');
    const categoryInput = document.getElementById('node-category');
    
    labelInput.value = node.label;
    colorInput.value = node.color;
    categoryInput.value = node.category || '';
    
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
    const color = document.getElementById('node-color').value;
    const category = document.getElementById('node-category').value;
    
    const node = graph.nodes.find(n => n.id == nodeId);
    if (node) {
        saveState();
        node.label = label;
        node.color = color;
        node.category = category || null;
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
                saveGraph();
                break;
            case 'o':
                e.preventDefault();
                loadGraph();
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
    // Create a simple default graph
    const node1 = graph.addNode(200, 200, 'Start');
    const node2 = graph.addNode(400, 200, 'Process');
    const node3 = graph.addNode(300, 350, 'End');
    
    graph.addEdge(node1.id, node2.id, 1);
    graph.addEdge(node2.id, node3.id, 2);
    
    saveState();
    updateGraphInfo();
}

// CSS for notifications
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
`;
document.head.appendChild(style);