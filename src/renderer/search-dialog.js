// Node Search Dialog Module
let searchDialogState = {
    selectedNode: null,
    searchResults: [],
    searchTerm: '',
    highlightedIndex: -1
};

// Initialize search dialog when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeSearchDialog();
});

function initializeSearchDialog() {
    // Add event listeners for search dialog
    const searchInput = document.getElementById('dialog-node-search');
    const clearBtn = document.getElementById('dialog-clear-search-btn');
    const selectBtn = document.getElementById('dialog-select-node-btn');
    const navigateBtn = document.getElementById('dialog-search-navigate');
    const cancelBtn = document.getElementById('dialog-search-cancel');

    if (searchInput) {
        searchInput.addEventListener('input', handleDialogSearch);
        searchInput.addEventListener('keydown', handleDialogSearchKeydown);
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', clearDialogSearch);
    }

    if (selectBtn) {
        selectBtn.addEventListener('click', selectDialogNode);
    }

    if (navigateBtn) {
        navigateBtn.addEventListener('click', navigateToSelectedNode);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeSearchDialog);
    }

    // Close dialog with Escape key
    document.addEventListener('keydown', (e) => {
        const searchDialog = document.getElementById('node-search-dialog');
        if (e.key === 'Escape' && searchDialog && !searchDialog.classList.contains('hidden')) {
            closeSearchDialog();
        }
    });
}

// Show search dialog
function showSearchDialog() {
    const dialog = document.getElementById('node-search-dialog');
    if (!dialog) {
        console.error('Search dialog not found');
        return;
    }

    // Reset state
    searchDialogState = {
        selectedNode: null,
        searchResults: [],
        searchTerm: '',
        highlightedIndex: -1
    };

    // Clear previous search
    const searchInput = document.getElementById('dialog-node-search');
    const searchResults = document.getElementById('dialog-search-results');
    const searchResultsList = document.getElementById('search-results-list');
    const selectedNodeInfo = document.getElementById('selected-node-info');

    if (searchInput) searchInput.value = '';
    if (searchResults) searchResults.classList.add('hidden');
    if (searchResultsList) {
        searchResultsList.innerHTML = '<p style="text-align: center; color: #666; font-size: 12px; margin: 20px 0;">Start typing to search for nodes...</p>';
    }
    if (selectedNodeInfo) selectedNodeInfo.style.display = 'none';

    updateDialogButtons();

    // Show dialog
    dialog.classList.remove('hidden');

    // Focus search input
    if (searchInput) {
        searchInput.focus();
    }
}

// Close search dialog
function closeSearchDialog() {
    const dialog = document.getElementById('node-search-dialog');
    if (dialog) {
        dialog.classList.add('hidden');
    }
}

// Handle search input
function handleDialogSearch(e) {
    const searchTerm = e.target.value.trim();
    searchDialogState.searchTerm = searchTerm;
    searchDialogState.highlightedIndex = -1;

    if (searchTerm.length === 0) {
        clearDialogSearchResults();
        return;
    }

    performDialogSearch(searchTerm);
}

// Perform the actual search
function performDialogSearch(searchTerm) {
    if (!graph || !graph.nodes) {
        console.error('Graph not available for search');
        return;
    }

    const results = graph.nodes.filter(node => {
        const label = (node.label || '').toLowerCase();
        const searchLower = searchTerm.toLowerCase();
        return label.includes(searchLower);
    }).slice(0, 20); // Limit to 20 results for performance

    searchDialogState.searchResults = results;
    updateDialogSearchResults(results);
    updateDialogSearchCount(results.length);
}

// Update search results display
function updateDialogSearchResults(results) {
    const searchResultsList = document.getElementById('search-results-list');
    const searchDropdown = document.getElementById('dialog-search-results');

    if (!searchResultsList) return;

    if (results.length === 0) {
        searchResultsList.innerHTML = '<p style="text-align: center; color: #666; font-size: 12px; margin: 20px 0;">No nodes found matching your search.</p>';
        if (searchDropdown) searchDropdown.classList.add('hidden');
        return;
    }

    // Build results list
    let html = '';
    results.forEach((node, index) => {
        const isSelected = searchDialogState.selectedNode && searchDialogState.selectedNode.id === node.id;
        const isHighlighted = searchDialogState.highlightedIndex === index;

        html += `
            <div class="search-result-item"
                 data-node-id="${node.id}"
                 style="padding: 8px; margin: 2px 0; border-radius: 4px; cursor: pointer;
                        background: ${isSelected ? '#e3f2fd' : (isHighlighted ? '#f5f5f5' : 'white')};
                        border: 1px solid ${isSelected ? '#2196f3' : '#eee'};"
                 onmouseenter="highlightDialogSearchResult(${index})">
                <div style="font-weight: bold; font-size: 13px;">${escapeHtml(node.label || 'Unnamed Node')}</div>
                <div style="font-size: 11px; color: #666;">
                    ID: ${node.id} | Position: (${Math.round(node.x)}, ${Math.round(node.y)})
                </div>
                ${node.category ? `<div style="font-size: 10px; color: #888; margin-top: 2px;">Category: ${escapeHtml(node.category)}</div>` : ''}
            </div>
        `;
    });

    searchResultsList.innerHTML = html;

    // Add click handlers
    searchResultsList.querySelectorAll('.search-result-item').forEach((item, index) => {
        item.addEventListener('click', () => selectDialogSearchResult(index));
    });

    // Update dropdown
    if (searchDropdown) {
        searchDropdown.innerHTML = results.map(node => `
            <div class="search-dropdown-item" data-node-id="${node.id}" style="padding: 4px 8px; cursor: pointer;">
                ${escapeHtml(node.label || 'Unnamed Node')}
            </div>
        `).join('');
        searchDropdown.classList.remove('hidden');
    }
}

// Update search count
function updateDialogSearchCount(count) {
    const countElement = document.getElementById('dialog-search-count');
    if (countElement) {
        countElement.textContent = count === 0 ? 'No results' : `${count} node${count !== 1 ? 's' : ''} found`;
    }
}

// Handle search keydown for navigation
function handleDialogSearchKeydown(e) {
    const results = searchDialogState.searchResults;
    if (results.length === 0) return;

    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            searchDialogState.highlightedIndex = Math.min(searchDialogState.highlightedIndex + 1, results.length - 1);
            updateDialogSearchResults(results);
            break;
        case 'ArrowUp':
            e.preventDefault();
            searchDialogState.highlightedIndex = Math.max(searchDialogState.highlightedIndex - 1, 0);
            updateDialogSearchResults(results);
            break;
        case 'Enter':
            e.preventDefault();
            if (searchDialogState.highlightedIndex >= 0) {
                selectDialogSearchResult(searchDialogState.highlightedIndex);
            } else if (searchDialogState.selectedNode) {
                navigateToSelectedNode();
            }
            break;
    }
}

// Highlight a search result
function highlightDialogSearchResult(index) {
    searchDialogState.highlightedIndex = index;
    updateDialogSearchResults(searchDialogState.searchResults);
}

// Select a search result
function selectDialogSearchResult(index) {
    const results = searchDialogState.searchResults;
    if (index < 0 || index >= results.length) return;

    searchDialogState.selectedNode = results[index];
    searchDialogState.highlightedIndex = index;

    updateDialogSearchResults(results);
    updateSelectedNodeInfo(results[index]);
    updateDialogButtons();
}

// Update selected node info display
function updateSelectedNodeInfo(node) {
    const selectedNodeInfo = document.getElementById('selected-node-info');
    const selectedNodeDetails = document.getElementById('selected-node-details');

    if (!selectedNodeInfo || !selectedNodeDetails) return;

    selectedNodeInfo.style.display = 'block';
    selectedNodeDetails.innerHTML = `
        <div><strong>Name:</strong> ${escapeHtml(node.label || 'Unnamed Node')}</div>
        <div><strong>ID:</strong> ${node.id}</div>
        <div><strong>Position:</strong> (${Math.round(node.x)}, ${Math.round(node.y)})</div>
        ${node.category ? `<div><strong>Category:</strong> ${escapeHtml(node.category)}</div>` : ''}
        ${node.color ? `<div><strong>Color:</strong> <span style="display: inline-block; width: 12px; height: 12px; background: ${node.color}; border-radius: 2px; vertical-align: middle; margin-right: 4px;"></span>${node.color}</div>` : ''}
        ${node.radius ? `<div><strong>Size:</strong> ${node.radius}px</div>` : ''}
    `;
}

// Clear search
function clearDialogSearch() {
    const searchInput = document.getElementById('dialog-node-search');
    if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
    }

    searchDialogState.searchTerm = '';
    searchDialogState.searchResults = [];
    searchDialogState.selectedNode = null;
    searchDialogState.highlightedIndex = -1;

    clearDialogSearchResults();
    updateDialogButtons();
}

// Clear search results
function clearDialogSearchResults() {
    const searchResultsList = document.getElementById('search-results-list');
    const searchDropdown = document.getElementById('dialog-search-results');
    const selectedNodeInfo = document.getElementById('selected-node-info');

    if (searchResultsList) {
        searchResultsList.innerHTML = '<p style="text-align: center; color: #666; font-size: 12px; margin: 20px 0;">Start typing to search for nodes...</p>';
    }
    if (searchDropdown) {
        searchDropdown.classList.add('hidden');
    }
    if (selectedNodeInfo) {
        selectedNodeInfo.style.display = 'none';
    }

    updateDialogSearchCount(0);
}

// Select the current node
function selectDialogNode() {
    if (!searchDialogState.selectedNode) return;

    // Select the node in the graph
    if (graph && graph.selectNode) {
        graph.selectNode(searchDialogState.selectedNode.id);
        graph.render();
    }

    closeSearchDialog();
    showNotification(`Selected node: ${searchDialogState.selectedNode.label || 'Unnamed Node'}`);
}

// Navigate to selected node
function navigateToSelectedNode() {
    if (!searchDialogState.selectedNode) return;

    const node = searchDialogState.selectedNode;

    // Center the view on the node
    if (graph && graph.centerOnNode) {
        graph.centerOnNode(node.id);
    } else if (graph && graph.offset !== undefined) {
        // Fallback: manually center the view
        const canvas = document.getElementById('graph-canvas');
        if (canvas) {
            const rect = canvas.getBoundingClientRect();
            graph.offset = {
                x: rect.width / 2 - node.x,
                y: rect.height / 2 - node.y
            };
            graph.render();
        }
    }

    // Select the node
    if (graph && graph.selectNode) {
        graph.selectNode(node.id);
        graph.render();
    }

    closeSearchDialog();
    showNotification(`Navigated to node: ${node.label || 'Unnamed Node'}`);
}

// Update dialog button states
function updateDialogButtons() {
    const hasSelection = searchDialogState.selectedNode !== null;

    const selectBtn = document.getElementById('dialog-select-node-btn');
    const navigateBtn = document.getElementById('dialog-search-navigate');

    if (selectBtn) {
        selectBtn.disabled = !hasSelection;
    }
    if (navigateBtn) {
        navigateBtn.disabled = !hasSelection;
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export functions for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showSearchDialog,
        closeSearchDialog
    };
} else {
    window.showSearchDialog = showSearchDialog;
    window.closeSearchDialog = closeSearchDialog;
}