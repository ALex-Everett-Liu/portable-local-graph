// Search and filter functionality

// Setup search components
function setupSearchComponents() {
    const nodeSearchInput = document.getElementById('node-search');
    const centerNodeSearchInput = document.getElementById('center-node-search');
    const searchResults = document.getElementById('search-results');
    const centerNodeDropdown = document.getElementById('center-node-dropdown');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    
    // Node search functionality
    nodeSearchInput.addEventListener('input', (e) => handleNodeSearch(e.target.value, searchResults, 'search'));
    nodeSearchInput.addEventListener('keydown', (e) => handleSearchKeydown(e, searchResults, 'search'));
    
    // Center node search functionality
    centerNodeSearchInput.addEventListener('input', (e) => handleNodeSearch(e.target.value, centerNodeDropdown, 'filter'));
    centerNodeSearchInput.addEventListener('keydown', (e) => handleSearchKeydown(e, centerNodeDropdown, 'filter'));
    
    // Clear search
    clearSearchBtn.addEventListener('click', clearNodeSearch);
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            searchResults.classList.add('hidden');
            centerNodeDropdown.classList.add('hidden');
        }
    });
}

// Handle node search
function handleNodeSearch(query, container, type) {
    if (!query.trim()) {
        container.classList.add('hidden');
        if (type === 'search') clearNodeHighlighting();
        return;
    }
    
    const nodes = graph.getAllNodes();
    const searchTerm = query.toLowerCase();
    
    const results = nodes.filter(node => 
        node.label.toLowerCase().includes(searchTerm) ||
        (node.chineseLabel && node.chineseLabel.toLowerCase().includes(searchTerm))
    ).slice(0, 20); // Limit to 20 results for performance
    
    renderSearchResults(results, container, type, query);
    
    if (type === 'search') {
        updateSearchCount(results.length, nodes.length);
        highlightSearchResults(results);
    }
}

// Render search results
function renderSearchResults(results, container, type, query) {
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
                if (type === 'search') {
                    selectAndCenterNode(node.id);
                } else {
                    selectCenterNodeForFilter(node.id, node.label);
                }
                container.classList.add('hidden');
            });
            
            container.appendChild(resultDiv);
        });
    }
    
    container.classList.remove('hidden');
}

// Highlight search matches
function highlightMatch(text, query) {
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return text;
    
    const before = text.substring(0, index);
    const match = text.substring(index, index + query.length);
    const after = text.substring(index + query.length);
    
    return `${before}<strong style="background: #fff3cd;">${match}</strong>${after}`;
}

// Handle search keydown events
function handleSearchKeydown(e, container, type) {
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
            
            if (type === 'search') {
                selectAndCenterNode(nodeId);
            } else {
                selectCenterNodeForFilter(nodeId, node.label);
            }
            container.classList.add('hidden');
        }
    } else if (e.key === 'Escape') {
        container.classList.add('hidden');
    }
}

// Select and center node
function selectAndCenterNode(nodeId) {
    const node = graph.nodes.find(n => n.id == nodeId);
    if (!node) return;
    
    // Clear previous selections
    graph.selectedNode = null;
    graph.selectedEdge = null;
    
    // Select the node
    graph.selectedNode = node;
    
    // Center the view on the node
    graph.offset.x = -node.x * graph.scale + graph.canvas.width / 2;
    graph.offset.y = -node.y * graph.scale + graph.canvas.height / 2;
    
    graph.render();
    updateGraphInfo();
    showNotification(`Selected: ${node.label}`);
}

// Select center node for filter
function selectCenterNodeForFilter(nodeId, label) {
    appState.filterParams.centerNodeId = nodeId;
    document.getElementById('center-node-search').value = label;
    document.getElementById('center-node-dropdown').classList.add('hidden');
}

// Highlight search results
function highlightSearchResults(results) {
    // Clear previous highlighting
    clearNodeHighlighting();
    
    // Add highlighting to found nodes using highlightedNodes array
    const highlightedNodeIds = results.map(node => node.id);
    if (graph.setHighlightedNodes) {
        graph.setHighlightedNodes(highlightedNodeIds);
    } else {
        // Fallback for backward compatibility
        graph.highlightedNodes = highlightedNodeIds;
    }
    
    graph.render();
}

// Clear node highlighting
function clearNodeHighlighting() {
    if (graph.clearHighlightedNodes) {
        graph.clearHighlightedNodes();
    } else {
        // Fallback for backward compatibility
        graph.highlightedNodes = [];
    }
    graph.render();
}

// Clear node search
function clearNodeSearch() {
    document.getElementById('node-search').value = '';
    document.getElementById('search-results').classList.add('hidden');
    clearNodeHighlighting();
    updateSearchCount(0, graph.nodes.length);
}

// Update search count
function updateSearchCount(found, total) {
    const countElement = document.getElementById('search-count');
    if (found > 0) {
        countElement.textContent = `${found} of ${total} nodes`;
        countElement.style.color = '#28a745';
    } else if (document.getElementById('node-search').value.trim()) {
        countElement.textContent = `No nodes found (${total} total)`;
        countElement.style.color = '#dc3545';
    } else {
        countElement.textContent = `${total} nodes`;
        countElement.style.color = '#666';
    }
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        setupSearchComponents,
        handleNodeSearch,
        renderSearchResults,
        highlightMatch,
        handleSearchKeydown,
        selectAndCenterNode,
        selectCenterNodeForFilter,
        highlightSearchResults,
        clearNodeHighlighting,
        clearNodeSearch,
        updateSearchCount
    };
} else {
    Object.assign(window, {
        setupSearchComponents,
        handleNodeSearch,
        renderSearchResults,
        highlightMatch,
        handleSearchKeydown,
        selectAndCenterNode,
        selectCenterNodeForFilter,
        highlightSearchResults,
        clearNodeHighlighting,
        clearNodeSearch,
        updateSearchCount
    });
}