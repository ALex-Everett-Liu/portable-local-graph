// Layer management functionality

// Update layer list - now deprecated, use layer dialog instead
function updateLayerList() {
    // This function is deprecated - layer management is now handled by the dialog
    // Kept for backward compatibility
    if (typeof updateLayerSummary === 'function') {
        updateLayerSummary();
    }
}

// Apply layer filter
function applyLayerFilter() {
    const checkboxes = document.querySelectorAll('.layer-checkbox:checked');
    const selectedLayers = Array.from(checkboxes).map(cb => cb.dataset.layer);
    const mode = document.querySelector('input[name="layer-filter-mode"]:checked').value;
    
    graph.setLayerFilterMode(mode);
    
    if (selectedLayers.length > 0) {
        graph.setActiveLayers(selectedLayers);
        const modeText = mode === 'include' ? 'Showing' : 'Excluding';
        showNotification(`${modeText} ${selectedLayers.length} layer(s): ${selectedLayers.join(', ')}`);
    } else {
        graph.clearLayerFilter();
        showNotification('Showing all layers');
    }
    
    updateLayerList();
    updateGraphInfo();
}

// Reset layer filter
function resetLayerFilter() {
    graph.clearLayerFilter();
    updateLayerList();
    updateGraphInfo();
    showNotification('Layer filter reset - showing all nodes');
}

// Show all layers
function showAllLayers() {
    const allLayers = graph.getAllLayers();
    const mode = document.querySelector('input[name="layer-filter-mode"]:checked').value;
    
    if (allLayers.length > 0) {
        graph.setActiveLayers(allLayers);
        const modeText = mode === 'include' ? 'Showing' : 'Excluding';
        showNotification(`${modeText} all ${allLayers.length} layers`);
    } else {
        showNotification('No layers to show');
    }
    updateLayerList();
    updateGraphInfo();
}

// Update layer filter
function updateLayerFilter() {
    const filterInput = document.getElementById('layer-filter-input').value.toLowerCase();
    const layerItems = document.querySelectorAll('.layer-item');
    
    layerItems.forEach(item => {
        const layerName = item.textContent.toLowerCase();
        if (filterInput === '' || layerName.includes(filterInput)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// Update layer summary instead of full list
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

// Add event listeners for mode radio buttons
document.addEventListener('DOMContentLoaded', function() {
    const modeRadios = document.querySelectorAll('input[name="layer-filter-mode"]');
    modeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.checked) {
                graph.setLayerFilterMode(this.value);
                updateLayerSummary();
                
                // Apply current filter with new mode
                if (graph.activeLayers.size > 0) {
                    const modeText = this.value === 'include' ? 'Showing' : 'Excluding';
                    showNotification(`${modeText} ${graph.activeLayers.size} layer(s): ${Array.from(graph.activeLayers).join(', ')}`);
                }
            }
        });
    });

    // Initialize layer summary when graph is ready
    const checkGraph = () => {
        if (typeof graph !== 'undefined') {
            updateLayerSummary();
        } else {
            setTimeout(checkGraph, 100);
        }
    };
    checkGraph();
});

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        updateLayerList,
        applyLayerFilter,
        resetLayerFilter,
        showAllLayers,
        updateLayerFilter
    };
} else {
    Object.assign(window, {
        updateLayerList,
        applyLayerFilter,
        resetLayerFilter,
        showAllLayers,
        updateLayerFilter
    });
}