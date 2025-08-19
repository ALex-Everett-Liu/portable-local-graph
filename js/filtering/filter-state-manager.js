/**
 * FilterStateManager - Manages filter state and provides event-driven updates
 */
export class FilterStateManager {
    constructor(graphFilter) {
        this.filter = graphFilter;
        this.listeners = new Map();
        this.state = {
            isFiltered: false,
            filterType: null,
            filterParams: {},
            layerFilter: {
                enabled: false,
                activeLayers: [],
                mode: 'include'
            },
            distanceFilter: {
                centerNodeId: null,
                maxDistance: 10,
                maxDepth: 5
            }
        };
        
        this.history = [];
        this.maxHistory = 50;
        this.currentHistoryIndex = -1;
    }

    /**
     * Add event listener for filter changes
     * @param {string} event - Event type ('filterChanged', 'layerChanged', 'distanceChanged')
     * @param {Function} callback - Callback function
     */
    addEventListener(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    /**
     * Remove event listener
     * @param {string} event - Event type
     * @param {Function} callback - Callback function
     */
    removeEventListener(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * Emit event to listeners
     * @param {string} event - Event type
     * @param {Object} data - Event data
     */
    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Filter event listener error:', error);
                }
            });
        }
    }

    /**
     * Apply local graph filter with state management
     * @param {string} centerNodeId - Center node ID
     * @param {number} maxDistance - Maximum distance
     * @param {number} maxDepth - Maximum depth
     * @returns {Object} Filter result
     */
    applyLocalGraphFilter(centerNodeId, maxDistance = 10, maxDepth = 5) {
        const result = this.filter.applyLocalGraphFilter(centerNodeId, maxDistance, maxDepth);
        
        if (result.success) {
            this.updateState({
                isFiltered: true,
                filterType: 'distance',
                filterParams: { centerNodeId, maxDistance, maxDepth },
                distanceFilter: { centerNodeId, maxDistance, maxDepth }
            });
            
            this.addToHistory({
                type: 'distance',
                params: { centerNodeId, maxDistance, maxDepth }
            });
            
            this.emit('filterChanged', {
                type: 'distance',
                data: result,
                state: this.getState()
            });
        }
        
        return result;
    }

    /**
     * Apply layer filter with state management
     * @param {Array} activeLayers - Array of active layer names
     * @param {string} mode - Filter mode ('include' or 'exclude')
     * @returns {Object} Filter result
     */
    applyLayerFilter(activeLayers, mode = 'include') {
        const result = this.filter.applyLayerFilter(activeLayers, mode);
        
        if (result.success) {
            this.updateState({
                isFiltered: activeLayers.length > 0,
                filterType: activeLayers.length > 0 ? 'layer' : null,
                filterParams: { activeLayers, mode },
                layerFilter: {
                    enabled: activeLayers.length > 0,
                    activeLayers,
                    mode
                }
            });
            
            this.addToHistory({
                type: 'layer',
                params: { activeLayers, mode }
            });
            
            this.emit('filterChanged', {
                type: 'layer',
                data: result,
                state: this.getState()
            });
        }
        
        return result;
    }

    /**
     * Apply centrality filter with state management
     * @param {string} centralityType - Type of centrality
     * @param {number} minValue - Minimum value
     * @param {number} maxValue - Maximum value
     * @param {Object} centralities - Centrality data
     * @returns {Object} Filter result
     */
    applyCentralityFilter(centralityType, minValue, maxValue, centralities) {
        const result = this.filter.applyCentralityFilter(centralityType, minValue, maxValue, centralities);
        
        if (result.success) {
            this.updateState({
                isFiltered: true,
                filterType: 'centrality',
                filterParams: { centralityType, minValue, maxValue }
            });
            
            this.addToHistory({
                type: 'centrality',
                params: { centralityType, minValue, maxValue }
            });
            
            this.emit('filterChanged', {
                type: 'centrality',
                data: result,
                state: this.getState()
            });
        }
        
        return result;
    }

    /**
     * Reset all filters with state management
     * @returns {Object} Reset result
     */
    resetFilters() {
        console.log('[FilterStateManager.resetFilters] Starting filter reset...');
        const result = this.filter.resetFilters();
        console.log('[FilterStateManager.resetFilters] GraphFilter result:', result);
        
        this.updateState({
            isFiltered: false,
            filterType: null,
            filterParams: {},
            layerFilter: {
                enabled: false,
                activeLayers: [],
                mode: 'include'
            },
            distanceFilter: {
                centerNodeId: null,
                maxDistance: 10,
                maxDepth: 5
            }
        });
        
        this.addToHistory({ type: 'reset' });
        
        this.emit('filterChanged', {
            type: 'reset',
            data: result,
            state: this.getState()
        });
        
        console.log('[FilterStateManager.resetFilters] Final result:', result);
        return result;
    }

    /**
     * Backward compatibility method for reset filter
     * @returns {boolean} Success status
     */
    resetFilter() {
        const result = this.resetFilters();
        return result.success;
    }

    /**
     * Update state and notify listeners
     * @param {Object} newState - New state to merge
     */
    updateState(newState) {
        this.state = { ...this.state, ...newState };
        this.emit('stateUpdated', this.state);
    }

    /**
     * Get current state
     * @returns {Object} Current state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Get filter statistics
     * @returns {Object} Filter statistics
     */
    getFilterStats() {
        return this.filter.getFilterStats();
    }

    /**
     * Add entry to history
     * @param {Object} entry - History entry
     */
    addToHistory(entry) {
        // Remove future history if we're not at the end
        if (this.currentHistoryIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.currentHistoryIndex + 1);
        }
        
        this.history.push({
            ...entry,
            timestamp: Date.now()
        });
        
        // Limit history size
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        } else {
            this.currentHistoryIndex = this.history.length - 1;
        }
    }

    /**
     * Undo last filter action
     * @returns {Object} Undo result
     */
    undo() {
        if (this.currentHistoryIndex <= 0) {
            return { success: false, error: 'No actions to undo' };
        }
        
        this.currentHistoryIndex--;
        
        // Find last non-reset action
        let targetIndex = this.currentHistoryIndex;
        while (targetIndex >= 0 && this.history[targetIndex].type === 'reset') {
            targetIndex--;
        }
        
        if (targetIndex < 0) {
            // Reset to original state
            return this.resetFilters();
        }
        
        const targetEntry = this.history[targetIndex];
        return this.replayHistoryEntry(targetEntry);
    }

    /**
     * Redo last undone filter action
     * @returns {Object} Redo result
     */
    redo() {
        if (this.currentHistoryIndex >= this.history.length - 1) {
            return { success: false, error: 'No actions to redo' };
        }
        
        this.currentHistoryIndex++;
        const entry = this.history[this.currentHistoryIndex];
        return this.replayHistoryEntry(entry);
    }

    /**
     * Replay a history entry
     * @param {Object} entry - History entry
     * @returns {Object} Replay result
     */
    replayHistoryEntry(entry) {
        switch (entry.type) {
            case 'distance':
                return this.applyLocalGraphFilter(
                    entry.params.centerNodeId,
                    entry.params.maxDistance,
                    entry.params.maxDepth
                );
            case 'layer':
                return this.applyLayerFilter(
                    entry.params.activeLayers,
                    entry.params.mode
                );
            case 'centrality':
                return this.applyCentralityFilter(
                    entry.params.centralityType,
                    entry.params.minValue,
                    entry.params.maxValue,
                    {} // Would need to pass actual centralities
                );
            case 'reset':
                return this.resetFilters();
            default:
                return { success: false, error: 'Unknown history entry type' };
        }
    }

    /**
     * Get history
     * @returns {Array} History entries
     */
    getHistory() {
        return [...this.history];
    }

    /**
     * Clear history
     */
    clearHistory() {
        this.history = [];
        this.currentHistoryIndex = -1;
    }

    /**
     * Can undo?
     * @returns {boolean} Whether undo is possible
     */
    canUndo() {
        return this.currentHistoryIndex > 0;
    }

    /**
     * Can redo?
     * @returns {boolean} Whether redo is possible
     */
    canRedo() {
        return this.currentHistoryIndex < this.history.length - 1;
    }

    /**
     * Save current state as preset
     * @param {string} name - Preset name
     * @returns {Object} Preset data
     */
    savePreset(name) {
        const preset = {
            name,
            state: this.getState(),
            timestamp: Date.now()
        };
        
        // Save to localStorage or return for external storage
        const presets = this.loadPresets();
        presets[name] = preset;
        this.savePresets(presets);
        
        return preset;
    }

    /**
     * Load preset
     * @param {string} name - Preset name
     * @returns {Object} Load result
     */
    loadPreset(name) {
        const presets = this.loadPresets();
        const preset = presets[name];
        
        if (!preset) {
            return { success: false, error: 'Preset not found' };
        }
        
        if (preset.state.filterType === 'layer') {
            return this.applyLayerFilter(
                preset.state.layerFilter.activeLayers,
                preset.state.layerFilter.mode
            );
        }
        
        if (preset.state.filterType === 'distance') {
            return this.applyLocalGraphFilter(
                preset.state.distanceFilter.centerNodeId,
                preset.state.distanceFilter.maxDistance,
                preset.state.distanceFilter.maxDepth
            );
        }
        
        return this.resetFilters();
    }

    /**
     * Get all presets
     * @returns {Object} All presets
     */
    getPresets() {
        return this.loadPresets();
    }

    /**
     * Delete preset
     * @param {string} name - Preset name
     */
    deletePreset(name) {
        const presets = this.loadPresets();
        delete presets[name];
        this.savePresets(presets);
    }

    /**
     * Load presets from localStorage
     * @returns {Object} Presets
     */
    loadPresets() {
        try {
            const stored = localStorage.getItem('graphFilterPresets');
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.warn('Failed to load presets:', error);
            return {};
        }
    }

    /**
     * Save presets to localStorage
     * @param {Object} presets - Presets to save
     */
    savePresets(presets) {
        try {
            localStorage.setItem('graphFilterPresets', JSON.stringify(presets));
        } catch (error) {
            console.warn('Failed to save presets:', error);
        }
    }

    /**
     * Export current filter state
     * @returns {Object} Export data
     */
    exportState() {
        return {
            state: this.getState(),
            filterConfig: this.filter.exportFilterConfig(),
            stats: this.getFilterStats()
        };
    }

    /**
     * Import filter state
     * @param {Object} data - Import data
     * @returns {Object} Import result
     */
    importState(data) {
        try {
            return this.filter.importFilterConfig(data.filterConfig);
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Subscribe to filter changes
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback) {
        this.addEventListener('filterChanged', callback);
        return () => this.removeEventListener('filterChanged', callback);
    }

    /**
     * Update graph data
     * @param {Array} nodes - New nodes array
     * @param {Array} edges - New edges array
     */
    updateGraphData(nodes, edges) {
        this.filter.updateOriginalData(nodes, edges);
        this.clearHistory();
        this.emit('graphDataUpdated', { nodes, edges });
    }
}