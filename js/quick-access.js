// Quick access functionality for saved view configurations

// Save view configuration
function saveViewConfig() {
    if (!appState.filterParams.centerNodeId) {
        showNotification('Please apply a filter first before saving', 'error');
        return;
    }
    
    const centerNode = graph.nodes.find(n => n.id === appState.filterParams.centerNodeId);
    if (!centerNode) {
        showNotification('Center node not found', 'error');
        return;
    }
    
    const config = {
        id: 'view-' + Date.now(),
        name: `${centerNode.label} (D:${appState.filterParams.maxDistance}, H:${appState.filterParams.maxDepth})`,
        centerNodeId: appState.filterParams.centerNodeId,
        maxDistance: appState.filterParams.maxDistance,
        maxDepth: appState.filterParams.maxDepth,
        centerNodeLabel: centerNode.label,
        timestamp: new Date().toISOString()
    };
    
    appState.quickAccess.push(config);
    
    // Keep only the 10 most recent configurations
    if (appState.quickAccess.length > 10) {
        appState.quickAccess = appState.quickAccess.slice(-10);
    }
    
    saveQuickAccess();
    renderQuickAccess();
    showNotification('View configuration saved');
}

// Load quick access from localStorage
function loadQuickAccess() {
    try {
        const saved = localStorage.getItem('graphQuickAccess');
        if (saved) {
            appState.quickAccess = JSON.parse(saved);
        }
    } catch (error) {
        console.error('Error loading quick access:', error);
        appState.quickAccess = [];
    }
}

// Save quick access to localStorage
function saveQuickAccess() {
    try {
        localStorage.setItem('graphQuickAccess', JSON.stringify(appState.quickAccess));
    } catch (error) {
        console.error('Error saving quick access:', error);
    }
}

// Render quick access list
function renderQuickAccess() {
    const container = document.getElementById('quick-access-list');
    container.innerHTML = '';
    
    if (appState.quickAccess.length === 0) {
        container.innerHTML = '<p style="font-size: 11px; color: #666;">No saved views</p>';
        return;
    }
    
    appState.quickAccess.forEach(config => {
        const item = document.createElement('div');
        item.className = 'quick-access-item';
        
        let onclickHandler = '';
        let typeIndicator = '';
        
        if (config.type === 'layer-view') {
            onclickHandler = `loadLayerView('${config.id}')`;
            typeIndicator = '📊';
        } else {
            onclickHandler = `loadViewConfig('${config.id}')`;
            typeIndicator = '🎯';
        }
        
        item.innerHTML = `
            <div style="flex: 1; cursor: pointer; display: flex; align-items: center;" onclick="${onclickHandler}">
                <span style="margin-right: 8px;">${typeIndicator}</span>
                <div>
                    <div style="font-weight: bold; font-size: 12px;">${config.name}</div>
                    <div style="font-size: 10px; color: #666;">${config.type === 'layer-view' ? 'Layer View' : 'Filter View'}</div>
                </div>
            </div>
            <button onclick="deleteViewConfig('${config.id}')" style="background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px; width: 20px; height: 20px;">×</button>
        `;
        container.appendChild(item);
    });
}

// Load view configuration
function loadViewConfig(configId) {
    const config = appState.quickAccess.find(c => c.id === configId);
    if (!config) {
        showNotification('View configuration not found', 'error');
        return;
    }
    
    if (config.type === 'layer-view') {
        // Load layer view
        const modeText = config.mode === 'include' ? 'Showing' : 'Excluding';
        graph.setLayerFilterMode(config.mode);
        graph.setActiveLayers(config.layers);
        
        // Update sidebar radio buttons
        const sidebarRadio = document.querySelector(`input[name="layer-filter-mode"][value="${config.mode}"]`);
        if (sidebarRadio) sidebarRadio.checked = true;
        
        // Update UI elements
        if (typeof updateLayerSummary === 'function') updateLayerSummary();
        if (typeof updateGraphInfo === 'function') updateGraphInfo();
        
        showNotification(`${modeText} ${config.layers.length} layer(s): ${config.layers.join(', ')}`);
    } else {
        // Load filter view
        // Update UI controls
        document.getElementById('center-node-select').value = config.centerNodeId;
        document.getElementById('max-distance').value = config.maxDistance;
        document.getElementById('max-depth').value = config.maxDepth;
        
        // Update app state
        appState.filterParams.centerNodeId = config.centerNodeId;
        appState.filterParams.maxDistance = config.maxDistance;
        appState.filterParams.maxDepth = config.maxDepth;
        
        // Update displays
        updateDistanceDisplay();
        updateDepthDisplay();
        
        // Apply the filter
        applyFilter();
    }
}

// Delete view configuration
function deleteViewConfig(configId) {
    appState.quickAccess = appState.quickAccess.filter(c => c.id !== configId);
    saveQuickAccess();
    renderQuickAccess();
    showNotification('View configuration deleted');
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        saveViewConfig,
        loadQuickAccess,
        saveQuickAccess,
        renderQuickAccess,
        loadViewConfig,
        deleteViewConfig
    };
} else {
    Object.assign(window, {
        saveViewConfig,
        loadQuickAccess,
        saveQuickAccess,
        renderQuickAccess,
        loadViewConfig,
        deleteViewConfig
    });
}