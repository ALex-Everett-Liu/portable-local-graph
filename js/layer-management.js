// Layer management functionality

// Update layer list
function updateLayerList() {
    const layers = graph.getAllLayers();
    const layerList = document.getElementById('layer-list');
    
    if (layers.length === 0) {
        layerList.innerHTML = '<p style="font-size: 11px; color: #666;">No layers found</p>';
        return;
    }
    
    layerList.innerHTML = '';
    layers.forEach(layer => {
        const layerItem = document.createElement('div');
        layerItem.className = 'layer-item';
        layerItem.innerHTML = `
            <label style="display: flex; align-items: center; font-size: 12px; cursor: pointer;">
                <input type="checkbox" 
                       class="layer-checkbox" 
                       data-layer="${layer}" 
                       ${graph.isLayerActive(layer) ? 'checked' : ''}
                       style="margin-right: 6px;">
                ${layer}
            </label>
        `;
        layerList.appendChild(layerItem);
    });
    
    // Add event listeners to checkboxes
    layerList.querySelectorAll('.layer-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const layer = e.target.dataset.layer;
            graph.toggleLayer(layer);
            updateLayerList();
        });
    });
    
    // Update mode radio buttons to reflect current mode
    const currentMode = graph.getLayerFilterMode();
    document.querySelector(`input[name="layer-filter-mode"][value="${currentMode}"]`).checked = true;
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

// Add event listeners for mode radio buttons
document.addEventListener('DOMContentLoaded', function() {
    const modeRadios = document.querySelectorAll('input[name="layer-filter-mode"]');
    modeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.checked) {
                graph.setLayerFilterMode(this.value);
                
                // Re-apply current filter with new mode
                const checkboxes = document.querySelectorAll('.layer-checkbox:checked');
                const selectedLayers = Array.from(checkboxes).map(cb => cb.dataset.layer);
                
                if (selectedLayers.length > 0) {
                    const modeText = this.value === 'include' ? 'Showing' : 'Excluding';
                    showNotification(`${modeText} ${selectedLayers.length} layer(s): ${selectedLayers.join(', ')}`);
                }
            }
        });
    });
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