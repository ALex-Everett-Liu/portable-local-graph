// Layer management dialog functionality

let layerDialogState = {
    layers: [],
    selectedLayers: new Set(),
    searchTerm: '',
    filterMode: 'include'
};

// Initialize layer dialog when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Wait for graph to be available
    const checkGraph = () => {
        if (typeof graph !== 'undefined') {
            setupLayerDialogEvents();
        } else {
            setTimeout(checkGraph, 100);
        }
    };
    checkGraph();
});

function setupLayerDialogEvents() {
    // Open layer dialog
    const manageLayersBtn = document.getElementById('manage-layers-btn');
    if (manageLayersBtn) {
        manageLayersBtn.addEventListener('click', openLayerDialog);
    }
    
    // Dialog buttons
    const applyBtn = document.getElementById('apply-layers-btn');
    const cancelBtn = document.getElementById('cancel-layers-btn');
    const resetBtn = document.getElementById('reset-layers-btn');
    const selectAllBtn = document.getElementById('select-all-layers-btn');
    const selectNoneBtn = document.getElementById('select-none-layers-btn');
    const invertBtn = document.getElementById('invert-selection-btn');
    const searchInput = document.getElementById('layer-search-input');
    
    if (applyBtn) applyBtn.addEventListener('click', applyLayerDialogSelection);
    if (cancelBtn) cancelBtn.addEventListener('click', closeLayerDialog);
    if (resetBtn) resetBtn.addEventListener('click', resetLayerDialog);
    if (selectAllBtn) selectAllBtn.addEventListener('click', selectAllLayers);
    if (selectNoneBtn) selectNoneBtn.addEventListener('click', selectNoneLayers);
    if (invertBtn) invertBtn.addEventListener('click', invertLayerSelection);
    if (searchInput) searchInput.addEventListener('input', handleLayerSearch);


    // Mode radio buttons
    const modeRadios = document.querySelectorAll('input[name="dialog-layer-filter-mode"]');
    modeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            layerDialogState.filterMode = e.target.value;
        });
    });

    // Close dialog with Escape key
    document.addEventListener('keydown', (e) => {
        const dialog = document.getElementById('layer-management-dialog');
        if (e.key === 'Escape' && dialog && !dialog.classList.contains('hidden')) {
            closeLayerDialog();
        }
    });
}

function openLayerDialog() {
    const dialog = document.getElementById('layer-management-dialog');
    
    // Initialize state from current graph
    layerDialogState.layers = graph.getAllLayers();
    layerDialogState.selectedLayers = new Set(graph.activeLayers);
    layerDialogState.filterMode = graph.getLayerFilterMode();
    layerDialogState.searchTerm = '';

    // Reset search input
    document.getElementById('layer-search-input').value = '';

    // Set current mode in dialog
    document.querySelector(`input[name="dialog-layer-filter-mode"][value="${layerDialogState.filterMode}"]`).checked = true;

    // Render layers
    renderLayerGrid();
    updateLayerStats();

    // Show dialog
    dialog.classList.remove('hidden');
}

function closeLayerDialog() {
    document.getElementById('layer-management-dialog').classList.add('hidden');
}

function renderLayerGrid() {
    const layerGrid = document.getElementById('layer-grid');
    const filteredLayers = layerDialogState.layers.filter(layer => 
        layer.toLowerCase().includes(layerDialogState.searchTerm.toLowerCase())
    );

    if (filteredLayers.length === 0) {
        layerGrid.innerHTML = `
            <div style="text-align: center; color: #666; padding: 20px;">
                ${layerDialogState.layers.length === 0 ? 'No layers defined' : 'No layers match your search'}
            </div>
        `;
        return;
    }

    // Create grid layout for better organization
    const gridContainer = document.createElement('div');
    gridContainer.style.display = 'grid';
    gridContainer.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
    gridContainer.style.gap = '8px';

    filteredLayers.forEach(layer => {
        const layerItem = createLayerItem(layer);
        gridContainer.appendChild(layerItem);
    });

    layerGrid.innerHTML = '';
    layerGrid.appendChild(gridContainer);
}

function createLayerItem(layer) {
    const item = document.createElement('div');
    const isSelected = layerDialogState.selectedLayers.has(layer);
    
    item.className = 'layer-grid-item';
    item.style.cssText = `
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
        background: ${isSelected ? '#e3f2fd' : 'white'};
        border-color: ${isSelected ? '#2196f3' : '#ddd'};
    `;

    item.innerHTML = `
        <label style="display: flex; align-items: center; cursor: pointer; font-size: 13px;">
            <input type="checkbox" 
                   ${isSelected ? 'checked' : ''} 
                   style="margin-right: 8px;"
                   onchange="toggleLayerInDialog('${layer}', this.checked)">
            ${layer}
        </label>
    `;

    // Click on entire item to toggle
    item.addEventListener('click', (e) => {
        if (e.target.type !== 'checkbox') {
            const checkbox = item.querySelector('input[type="checkbox"]');
            checkbox.checked = !checkbox.checked;
            toggleLayerInDialog(layer, checkbox.checked);
        }
    });

    return item;
}

function toggleLayerInDialog(layer, isSelected) {
    if (isSelected) {
        layerDialogState.selectedLayers.add(layer);
    } else {
        layerDialogState.selectedLayers.delete(layer);
    }
    updateLayerStats();
    
    // Update visual state
    const item = event.target.closest('.layer-grid-item');
    if (item) {
        item.style.background = isSelected ? '#e3f2fd' : 'white';
        item.style.borderColor = isSelected ? '#2196f3' : '#ddd';
    }
}

function handleLayerSearch(e) {
    layerDialogState.searchTerm = e.target.value;
    renderLayerGrid();
}

function selectAllLayers() {
    layerDialogState.selectedLayers = new Set(layerDialogState.layers);
    renderLayerGrid();
    updateLayerStats();
}

function selectNoneLayers() {
    layerDialogState.selectedLayers.clear();
    renderLayerGrid();
    updateLayerStats();
}

function invertLayerSelection() {
    const newSelection = new Set();
    layerDialogState.layers.forEach(layer => {
        if (!layerDialogState.selectedLayers.has(layer)) {
            newSelection.add(layer);
        }
    });
    layerDialogState.selectedLayers = newSelection;
    renderLayerGrid();
    updateLayerStats();
}

function updateLayerStats() {
    const totalCount = layerDialogState.layers.length;
    const selectedCount = layerDialogState.selectedLayers.size;
    
    const totalCountEl = document.getElementById('total-layers-count');
    const selectedCountEl = document.getElementById('selected-layers-count');
    
    if (totalCountEl) totalCountEl.textContent = totalCount;
    if (selectedCountEl) selectedCountEl.textContent = selectedCount;
    
    // Update sidebar summary
    updateLayerSummary();
}

function applyLayerDialogSelection() {
    const selectedLayers = Array.from(layerDialogState.selectedLayers);
    const mode = layerDialogState.filterMode;

    // Apply to graph
    graph.setLayerFilterMode(mode);
    graph.setActiveLayers(selectedLayers);

    // Update sidebar radio buttons
    const sidebarRadio = document.querySelector(`input[name="layer-filter-mode"][value="${mode}"]`);
    if (sidebarRadio) sidebarRadio.checked = true;

    // Close dialog
    closeLayerDialog();

    // Update UI
    if (typeof updateLayerSummary === 'function') updateLayerSummary();
    if (typeof updateGraphInfo === 'function') updateGraphInfo();

    // Show notification
    if (selectedLayers.length > 0) {
        const modeText = mode === 'include' ? 'Showing' : 'Excluding';
        if (typeof showNotification === 'function') {
            showNotification(`${modeText} ${selectedLayers.length} layer(s): ${selectedLayers.join(', ')}`);
        }
    } else {
        if (typeof showNotification === 'function') {
            showNotification('Showing all layers');
        }
    }
}

function resetLayerDialog() {
    layerDialogState.selectedLayers.clear();
    renderLayerGrid();
    updateLayerStats();
}

function updateLayerSummary() {
    const layerSummary = document.getElementById('layer-summary');
    if (!layerSummary || typeof graph === 'undefined') return;
    
    const allLayers = graph.getAllLayers();
    const activeCount = graph.activeLayers ? graph.activeLayers.size : 0;
    
    if (allLayers.length === 0) {
        layerSummary.textContent = 'No layers defined';
    } else if (activeCount === 0) {
        layerSummary.textContent = `${allLayers.length} layers defined (none selected)`;
    } else {
        const modeText = graph.getLayerFilterMode() === 'include' ? 'showing' : 'excluding';
        layerSummary.textContent = `${allLayers.length} layers defined (${activeCount} ${modeText})`;
    }
}

// Export functions for global access
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        openLayerDialog,
        closeLayerDialog,
        updateLayerSummary
    };
} else {
    Object.assign(window, {
        openLayerDialog,
        closeLayerDialog,
        updateLayerSummary,
        toggleLayerInDialog,
        selectAllLayers,
        selectNoneLayers,
        invertLayerSelection
    });
}