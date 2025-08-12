// UI Functions Module

// Show node dialog
function showNodeDialog(node) {
    const dialog = document.getElementById('node-dialog');
    const labelInput = document.getElementById('node-label');
    const chineseInput = document.getElementById('node-chinese');
    const colorInput = document.getElementById('node-color');
    const categoryInput = document.getElementById('node-category');
    const sizeInput = document.getElementById('node-size');
    const sizeDisplay = document.getElementById('size-display');
    const layersInput = document.getElementById('node-layers');
    
    // Clear form fields for new nodes, populate for existing nodes
    const isExistingNode = node.id && graph && graph.nodes && graph.nodes.find(n => n.id === node.id);
    if (isExistingNode) {
        // Existing node - populate with current values
        labelInput.value = node.label || '';
        chineseInput.value = node.chineseLabel || '';
        colorInput.value = node.color || '#6737E8';
        categoryInput.value = node.category || '';
        sizeInput.value = node.radius || 20;
        sizeDisplay.textContent = node.radius || 20;
        layersInput.value = (node.layers || []).join(', ');
    } else {
        // New node - clear all fields
        labelInput.value = '';
        chineseInput.value = '';
        colorInput.value = '#6737E8';
        categoryInput.value = '';
        sizeInput.value = 20;
        sizeDisplay.textContent = 20;
        layersInput.value = '';
    }
    
    // Update size display when slider changes
    sizeInput.oninput = () => {
        sizeDisplay.textContent = sizeInput.value;
    };
    
    dialog.dataset.nodeId = node.id;
    dialog.classList.remove('hidden');
}

// Show edge dialog
function showEdgeDialog(edge) {
    const dialog = document.getElementById('weight-dialog');
    const weightInput = document.getElementById('weight-input');
    const categoryInput = document.getElementById('edge-category');
    
    weightInput.value = edge.weight;
    categoryInput.value = edge.category || '';
    dialog.dataset.edgeId = edge.id;
    dialog.classList.remove('hidden');
}

// Handle node OK
function handleNodeOK() {
    const dialog = document.getElementById('node-dialog');
    const nodeId = dialog.dataset.nodeId;
    const label = document.getElementById('node-label').value;
    const chineseLabel = document.getElementById('node-chinese').value;
    const color = document.getElementById('node-color').value;
    const category = document.getElementById('node-category').value;
    const radius = parseInt(document.getElementById('node-size').value);
    const layersInput = document.getElementById('node-layers').value;
    
    const node = graph.nodes.find(n => n.id == nodeId);
    if (node) {
        saveState();
        node.label = label;
        node.chineseLabel = chineseLabel || '';
        node.color = color;
        node.category = category || null;
        node.radius = Math.max(1, Math.min(100, radius));
        
        // Parse layers from comma-separated input
        if (layersInput.trim()) {
            node.layers = layersInput.split(',').map(l => l.trim()).filter(l => l);
        } else {
            node.layers = [];
        }
        
        graph.render();
        appState.isModified = true;
        updateLayerList(); // Refresh layer list
    }
    
    dialog.classList.add('hidden');
}

// Handle node cancel
function handleNodeCancel() {
    const dialog = document.getElementById('node-dialog');
    // Clear form fields to prevent persistence
    document.getElementById('node-label').value = '';
    document.getElementById('node-chinese').value = '';
    document.getElementById('node-color').value = '#6737E8';
    document.getElementById('node-category').value = '';
    document.getElementById('node-layers').value = '';
    document.getElementById('node-size').value = '20';
    dialog.classList.add('hidden');
}

// Handle node delete
function handleNodeDelete() {
    const dialog = document.getElementById('node-dialog');
    const nodeId = dialog.dataset.nodeId;
    
    saveState();
    graph.deleteNode(nodeId);
    updateGraphInfo();
    appState.isModified = true;
    
    dialog.classList.add('hidden');
}

// Handle weight OK
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

// Handle weight cancel
function handleWeightCancel() {
    document.getElementById('weight-dialog').classList.add('hidden');
}

// Handle weight delete
function handleWeightDelete() {
    const dialog = document.getElementById('weight-dialog');
    const edgeId = dialog.dataset.edgeId;
    
    if (edgeId) {
        saveState();
        graph.deleteEdge(edgeId);
        graph.render();
        appState.isModified = true;
    }
    
    dialog.classList.add('hidden');
}

// Show notification
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

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showNodeDialog,
        showEdgeDialog,
        handleNodeOK,
        handleNodeCancel,
        handleNodeDelete,
        handleWeightOK,
        handleWeightCancel,
        handleWeightDelete,
        showNotification
    };
} else {
    Object.assign(window, {
        showNodeDialog,
        showEdgeDialog,
        handleNodeOK,
        handleNodeCancel,
        handleNodeDelete,
        handleWeightOK,
        handleWeightCancel,
        handleWeightDelete,
        showNotification
    });
}