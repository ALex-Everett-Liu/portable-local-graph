let graph;
let appMode = 'select';
let contextMenu = null;

function init() {
    const canvas = document.getElementById('canvas');
    graph = new Graph(canvas);

    setupEventListeners();
    setupContextMenu();
    setupDialogs();

    // Set initial mode
    setMode('select');
}

function setupEventListeners() {
    // Mode buttons
    document.getElementById('select-mode').addEventListener('click', () => setMode('select'));
    document.getElementById('node-mode').addEventListener('click', () => setMode('node'));
    document.getElementById('edge-mode').addEventListener('click', () => setMode('edge'));

    // Action buttons
    document.getElementById('clear-btn').addEventListener('click', () => {
        if (confirm('Clear all nodes and edges?')) {
            graph.clear();
        }
    });

    document.getElementById('save-btn').addEventListener('click', saveGraph);
    document.getElementById('load-btn').addEventListener('click', loadGraph);

    // Hide context menu when clicking elsewhere
    document.addEventListener('click', () => {
        hideContextMenu();
    });
}

function setupContextMenu() {
    contextMenu = document.getElementById('context-menu');

    document.querySelectorAll('.context-menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            handleContextMenuAction(action);
            hideContextMenu();
        });
    });
}

function setupDialogs() {
    // Node dialog
    document.getElementById('node-save').addEventListener('click', saveNodeEdit);
    document.getElementById('node-cancel').addEventListener('click', () => {
        document.getElementById('node-dialog').style.display = 'none';
    });

    // Edge dialog
    document.getElementById('edge-save').addEventListener('click', saveEdgeEdit);
    document.getElementById('edge-cancel').addEventListener('click', () => {
        document.getElementById('edge-dialog').style.display = 'none';
    });
}

function setMode(mode) {
    appMode = mode;
    window.appMode = mode;

    // Update button states
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(mode + '-mode').classList.add('active');

    // Update cursor
    const canvas = document.getElementById('canvas');
    canvas.className = mode === 'select' ? 'select-mode' : '';

    // Reset edge creation state
    if (graph) {
        graph.tempEdgeStart = null;
    }
}

function showContextMenu(x, y) {
    contextMenu.style.display = 'block';
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
}

function hideContextMenu() {
    contextMenu.style.display = 'none';
}

function handleContextMenuAction(action) {
    if (action === 'edit') {
        if (graph.selectedNode) {
            showNodeDialog();
        } else if (graph.selectedEdge) {
            showEdgeDialog();
        }
    } else if (action === 'delete') {
        if (graph.selectedNode) {
            graph.deleteNode(graph.selectedNode);
        } else if (graph.selectedEdge) {
            graph.deleteEdge(graph.selectedEdge);
        }
    }
}

function showNodeDialog() {
    if (!graph.selectedNode) return;

    const dialog = document.getElementById('node-dialog');
    const labelInput = document.getElementById('node-label');
    const colorInput = document.getElementById('node-color');

    labelInput.value = graph.selectedNode.label;
    colorInput.value = graph.selectedNode.color;

    dialog.style.display = 'block';
}

function showEdgeDialog() {
    if (!graph.selectedEdge) return;

    const dialog = document.getElementById('edge-dialog');
    const weightInput = document.getElementById('edge-weight');

    weightInput.value = graph.selectedEdge.weight;

    dialog.style.display = 'block';
}

function saveNodeEdit() {
    if (!graph.selectedNode) return;

    const label = document.getElementById('node-label').value;
    const color = document.getElementById('node-color').value;

    graph.selectedNode.label = label || 'Node';
    graph.selectedNode.color = color;

    document.getElementById('node-dialog').style.display = 'none';
    graph.render();
}

function saveEdgeEdit() {
    if (!graph.selectedEdge) return;

    const weight = parseFloat(document.getElementById('edge-weight').value);

    graph.selectedEdge.weight = weight;

    document.getElementById('edge-dialog').style.display = 'none';
    graph.render();
}

function saveGraph() {
    const data = graph.exportData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'graph.json';
    a.click();

    URL.revokeObjectURL(url);
}

function loadGraph() {
    const input = document.getElementById('file-input');
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                graph.importData(data);
            } catch (error) {
                alert('Error loading file: ' + error.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', init);