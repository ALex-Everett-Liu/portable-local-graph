// Edge creation via search functionality

// Show edge search dialog
function showEdgeSearchDialog() {
    const dialog = document.getElementById('edge-search-dialog');
    
    // Reset dialog state
    document.getElementById('edge-source-search').value = '';
    document.getElementById('edge-target-search').value = '';
    document.getElementById('edge-source-info').textContent = 'No source node selected';
    document.getElementById('edge-target-info').textContent = 'No target node selected';
    document.getElementById('edge-search-weight').value = '1';
    document.getElementById('edge-search-category').value = '';
    
    // Clear dropdowns
    document.getElementById('edge-source-dropdown').innerHTML = '';
    document.getElementById('edge-target-dropdown').innerHTML = '';
    document.getElementById('edge-source-dropdown').classList.add('hidden');
    document.getElementById('edge-target-dropdown').classList.add('hidden');
    
    // Setup search listeners
    setupEdgeSearchListeners();
    
    dialog.classList.remove('hidden');
}

// Setup edge search listeners
function setupEdgeSearchListeners() {
    const sourceSearch = document.getElementById('edge-source-search');
    const targetSearch = document.getElementById('edge-target-search');
    const sourceDropdown = document.getElementById('edge-source-dropdown');
    const targetDropdown = document.getElementById('edge-target-dropdown');
    
    // Source node search
    sourceSearch.addEventListener('input', (e) => {
        handleEdgeNodeSearch(e.target.value, sourceDropdown, 'source');
    });
    sourceSearch.addEventListener('keydown', (e) => {
        handleEdgeSearchKeydown(e, sourceDropdown, 'source');
    });
    
    // Target node search
    targetSearch.addEventListener('input', (e) => {
        handleEdgeNodeSearch(e.target.value, targetDropdown, 'target');
    });
    targetSearch.addEventListener('keydown', (e) => {
        handleEdgeSearchKeydown(e, targetDropdown, 'target');
    });
    
    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            sourceDropdown.classList.add('hidden');
            targetDropdown.classList.add('hidden');
        }
    });
}

// Handle edge node search
function handleEdgeNodeSearch(query, container, type) {
    if (!query.trim()) {
        container.classList.add('hidden');
        return;
    }
    
    const nodes = graph.getAllNodes();
    const searchTerm = query.toLowerCase();
    
    const results = nodes.filter(node => 
        node.label.toLowerCase().includes(searchTerm) ||
        (node.chineseLabel && node.chineseLabel.toLowerCase().includes(searchTerm))
    ).slice(0, 20);
    
    renderEdgeSearchResults(results, container, type, query);
}

// Render edge search results
function renderEdgeSearchResults(results, container, type, query) {
    container.innerHTML = '';
    
    if (results.length === 0) {
        container.innerHTML = '<div class="search-result">No nodes found</div>';
    } else {
        results.forEach((node, index) => {
            const resultDiv = document.createElement('div');
            resultDiv.className = 'search-result';
            resultDiv.dataset.nodeId = node.id;
            resultDiv.dataset.index = index;
            
            const labelMatch = highlightMatch(node.label, query);
            const chineseMatch = node.chineseLabel ? highlightMatch(node.chineseLabel, query) : '';
            
            resultDiv.innerHTML = `
                <div class="node-label">${labelMatch}</div>
                ${chineseMatch ? `<div class="node-chinese">${chineseMatch}</div>` : ''}
            `;
            
            resultDiv.addEventListener('click', () => {
                selectEdgeNode(node.id, node.label, type);
                container.classList.add('hidden');
            });
            
            container.appendChild(resultDiv);
        });
    }
    
    container.classList.remove('hidden');
}

// Select edge node
function selectEdgeNode(nodeId, label, type) {
    if (type === 'source') {
        window.edgeSourceNodeId = nodeId;
        document.getElementById('edge-source-info').textContent = `Selected: ${label}`;
    } else {
        window.edgeTargetNodeId = nodeId;
        document.getElementById('edge-target-info').textContent = `Selected: ${label}`;
    }
}

// Handle edge search keydown
function handleEdgeSearchKeydown(e, container, type) {
    if (container.classList.contains('hidden')) return;
    
    const results = container.querySelectorAll('.search-result');
    const active = container.querySelector('.search-result.active');
    
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (active) {
            active.classList.remove('active');
            const next = active.nextElementSibling;
            if (next) next.classList.add('active');
        } else {
            results[0]?.classList.add('active');
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (active) {
            active.classList.remove('active');
            const prev = active.previousElementSibling;
            if (prev) prev.classList.add('active');
        } else {
            results[results.length - 1]?.classList.add('active');
        }
    } else if (e.key === 'Enter') {
        e.preventDefault();
        const activeResult = container.querySelector('.search-result.active') || results[0];
        if (activeResult) {
            const nodeId = activeResult.dataset.nodeId;
            const node = graph.nodes.find(n => n.id == nodeId);
            selectEdgeNode(nodeId, node.label, type);
            container.classList.add('hidden');
        }
    } else if (e.key === 'Escape') {
        container.classList.add('hidden');
    }
}

// Handle edge search OK
function handleEdgeSearchOK() {
    const sourceId = window.edgeSourceNodeId;
    const targetId = window.edgeTargetNodeId;
    const weight = parseFloat(document.getElementById('edge-search-weight').value);
    const category = document.getElementById('edge-search-category').value;
    
    if (!sourceId || !targetId) {
        showNotification('Please select both source and target nodes', 'error');
        return;
    }
    
    if (sourceId === targetId) {
        showNotification('Cannot create edge from a node to itself', 'error');
        return;
    }
    
    if (isNaN(weight) || weight <= 0) {
        showNotification('Please enter a valid weight greater than 0', 'error');
        return;
    }
    
    // Check if edge already exists
    const existingEdge = graph.edges.find(e => 
        (e.from === sourceId && e.to === targetId) || 
        (e.from === targetId && e.to === sourceId)
    );
    
    if (existingEdge) {
        showNotification('Edge already exists between these nodes', 'error');
        return;
    }
    
    saveState();
    graph.addEdge(sourceId, targetId, weight, category || null);
    
    const sourceNode = graph.nodes.find(n => n.id === sourceId);
    const targetNode = graph.nodes.find(n => n.id === targetId);
    
    showNotification(`Edge created: ${sourceNode.label} → ${targetNode.label}`);
    closeEdgeSearchDialog();
    updateGraphInfo();
}

// Close edge search dialog
function closeEdgeSearchDialog() {
    const dialog = document.getElementById('edge-search-dialog');
    dialog.classList.add('hidden');
    
    // Clear state
    window.edgeSourceNodeId = null;
    window.edgeTargetNodeId = null;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showEdgeSearchDialog,
        setupEdgeSearchListeners,
        handleEdgeNodeSearch,
        renderEdgeSearchResults,
        selectEdgeNode,
        handleEdgeSearchKeydown,
        handleEdgeSearchOK,
        closeEdgeSearchDialog
    };
} else {
    Object.assign(window, {
        showEdgeSearchDialog,
        setupEdgeSearchListeners,
        handleEdgeNodeSearch,
        renderEdgeSearchResults,
        selectEdgeNode,
        handleEdgeSearchKeydown,
        handleEdgeSearchOK,
        closeEdgeSearchDialog
    });
}