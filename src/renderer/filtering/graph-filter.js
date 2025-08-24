/**
 * GraphFilter - Handles graph filtering operations including distance-based and layer filtering
 */
import { dijkstra } from '../utils/algorithms.js';

export class GraphFilter {
    constructor(nodes = [], edges = []) {
        this.originalNodes = [...nodes];
        this.originalEdges = [...edges];
        this.currentNodes = [...nodes];
        this.currentEdges = [...edges];
        
        // Filter state
        this.isFiltered = false;
        this.filterType = null; // 'distance', 'layer', 'centrality', etc.
        this.filterParams = {};
        
        // Layer filtering state
        this.activeLayers = new Set();
        this.layerFilterEnabled = false;
        this.layerFilterMode = 'include'; // 'include' or 'exclude'
        
        // Distance filtering state
        this.distanceFilterParams = {
            centerNodeId: null,
            maxDistance: 10,
            maxDepth: 5
        };
    }

    /**
     * Apply local graph filter (distance-based)
     * @param {string} centerNodeId - Center node ID
     * @param {number} maxDistance - Maximum distance from center
     * @param {number} maxDepth - Maximum depth from center
     * @returns {Object} Filtered data and metadata
     */
    applyLocalGraphFilter(centerNodeId, maxDistance = 10, maxDepth = 5) {
        if (!this.originalNodes.find(n => n.id === centerNodeId)) {
            return { success: false, error: 'Center node not found' };
        }

        const filteredData = this.filterLocalGraph(centerNodeId, maxDistance, maxDepth);
        
        if (filteredData.nodes.length === 0) {
            return { success: false, error: 'No nodes within specified distance' };
        }

        this.currentNodes = filteredData.nodes;
        this.currentEdges = filteredData.edges;
        this.isFiltered = true;
        this.filterType = 'distance';
        this.filterParams = { centerNodeId, maxDistance, maxDepth };

        return {
            success: true,
            nodes: filteredData.nodes,
            edges: filteredData.edges,
            centerNode: filteredData.centerNode,
            distances: filteredData.distances,
            depths: filteredData.depths,
            metadata: {
                nodeCount: filteredData.nodes.length,
                edgeCount: filteredData.edges.length,
                originalNodeCount: this.originalNodes.length,
                originalEdgeCount: this.originalEdges.length
            }
        };
    }

    /**
     * Filter local graph based on distance and depth
     * @param {string} centerNodeId - Center node ID
     * @param {number} maxDistance - Maximum distance
     * @param {number} maxDepth - Maximum depth
     * @returns {Object} Filtered data
     */
    filterLocalGraph(centerNodeId, maxDistance, maxDepth) {
        const centerNode = this.originalNodes.find(n => n.id === centerNodeId);
        if (!centerNode) {
            return { nodes: [], edges: [], centerNode: null, distances: {}, depths: {} };
        }

        // Use BFS for weighted shortest paths
        const distances = new Map();
        const depths = new Map();
        const queue = [{ nodeId: centerNodeId, distance: 0, depth: 0 }];
        const visited = new Set();

        distances.set(centerNodeId, 0);
        depths.set(centerNodeId, 0);

        const filteredNodes = [centerNode];
        const filteredNodeIds = new Set([centerNodeId]);

        while (queue.length > 0) {
            queue.sort((a, b) => a.distance - b.distance);
            const current = queue.shift();

            if (visited.has(current.nodeId)) continue;
            visited.add(current.nodeId);

            const connections = this.getNodeConnections(current.nodeId);
            connections.forEach(conn => {
                const newDistance = current.distance + conn.weight;
                const newDepth = current.depth + 1;

                if (newDistance <= maxDistance && newDepth <= maxDepth) {
                    if (!filteredNodeIds.has(conn.to)) {
                        const node = this.originalNodes.find(n => n.id === conn.to);
                        if (node) {
                            filteredNodes.push(node);
                            filteredNodeIds.add(conn.to);
                        }
                    }

                    if (!distances.has(conn.to) || newDistance < distances.get(conn.to)) {
                        distances.set(conn.to, newDistance);
                        depths.set(conn.to, newDepth);
                        queue.push({ nodeId: conn.to, distance: newDistance, depth: newDepth });
                    }
                }
            });
        }

        // Filter edges between filtered nodes
        const filteredEdges = this.originalEdges.filter(edge => {
            const fromIncluded = filteredNodeIds.has(edge.from);
            const toIncluded = filteredNodeIds.has(edge.to);
            return fromIncluded && toIncluded;
        });

        return {
            nodes: filteredNodes,
            edges: filteredEdges,
            centerNode,
            distances: Object.fromEntries(distances),
            depths: Object.fromEntries(depths)
        };
    }

    /**
     * Apply layer-based filtering
     * @param {Array} activeLayers - Array of active layer names
     * @param {string} mode - Filter mode ('include' or 'exclude')
     * @returns {Object} Filtered data and metadata
     */
    applyLayerFilter(activeLayers, mode = 'include') {
        this.activeLayers = new Set(activeLayers);
        this.layerFilterMode = mode;
        this.layerFilterEnabled = activeLayers.length > 0;

        if (!this.layerFilterEnabled) {
            this.currentNodes = [...this.originalNodes];
            this.currentEdges = [...this.originalEdges];
            this.isFiltered = false;
            this.filterType = null;
            return { success: true, nodes: this.currentNodes, edges: this.currentEdges };
        }

        const filteredNodes = this.originalNodes.filter(node => {
            const nodeLayers = node.layers || [];
            const hasMatchingLayer = nodeLayers.some(layer => this.activeLayers.has(layer));
            
            return mode === 'include' ? hasMatchingLayer : !hasMatchingLayer;
        });

        const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
        const filteredEdges = this.originalEdges.filter(edge => {
            return filteredNodeIds.has(edge.from) && filteredNodeIds.has(edge.to);
        });

        this.currentNodes = filteredNodes;
        this.currentEdges = filteredEdges;
        this.isFiltered = true;
        this.filterType = 'layer';
        this.filterParams = { activeLayers, mode };

        return {
            success: true,
            nodes: filteredNodes,
            edges: filteredEdges,
            metadata: {
                activeLayers: Array.from(activeLayers),
                mode,
                nodeCount: filteredNodes.length,
                edgeCount: filteredEdges.length,
                originalNodeCount: this.originalNodes.length,
                originalEdgeCount: this.originalEdges.length
            }
        };
    }

    /**
     * Apply centrality-based filtering
     * @param {string} centralityType - Type of centrality ('degree', 'betweenness', etc.)
     * @param {number} minValue - Minimum centrality value
     * @param {number} maxValue - Maximum centrality value
     * @param {Object} centralities - Pre-calculated centrality values
     * @returns {Object} Filtered data and metadata
     */
    applyCentralityFilter(centralityType, minValue, maxValue, centralities) {
        if (!centralities || !centralities[centralityType]) {
            return { success: false, error: 'Invalid centrality data' };
        }

        const centralityData = centralities[centralityType];
        const filteredNodes = this.originalNodes.filter(node => {
            const value = parseFloat(centralityData[node.id]) || 0;
            return value >= minValue && value <= maxValue;
        });

        const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
        const filteredEdges = this.originalEdges.filter(edge => {
            return filteredNodeIds.has(edge.from) && filteredNodeIds.has(edge.to);
        });

        this.currentNodes = filteredNodes;
        this.currentEdges = filteredEdges;
        this.isFiltered = true;
        this.filterType = 'centrality';
        this.filterParams = { centralityType, minValue, maxValue };

        return {
            success: true,
            nodes: filteredNodes,
            edges: filteredEdges,
            metadata: {
                centralityType,
                minValue,
                maxValue,
                nodeCount: filteredNodes.length,
                edgeCount: filteredEdges.length,
                originalNodeCount: this.originalNodes.length,
                originalEdgeCount: this.originalEdges.length
            }
        };
    }

    /**
     * Reset all filters (backward compatibility)
     * @returns {boolean} Success status
     */
    resetFilter() {
        const result = this.resetFilters();
        return result.success;
    }

    /**
     * Reset all filters
     * @returns {Object} Reset result
     */
    resetFilters() {
        console.log('[GraphFilter.resetFilters] Starting...');
        console.log('[GraphFilter.resetFilters] originalNodes:', this.originalNodes?.length || 0);
        console.log('[GraphFilter.resetFilters] originalEdges:', this.originalEdges?.length || 0);
        console.log('[GraphFilter.resetFilters] currentNodes:', this.currentNodes?.length || 0);
        console.log('[GraphFilter.resetFilters] currentEdges:', this.currentEdges?.length || 0);
        
        this.currentNodes = [...this.originalNodes];
        this.currentEdges = [...this.originalEdges];
        this.isFiltered = false;
        this.filterType = null;
        this.filterParams = {};
        
        // Reset layer filter state
        this.activeLayers.clear();
        this.layerFilterEnabled = false;
        this.layerFilterMode = 'include';
        
        // Reset distance filter state
        this.distanceFilterParams = {
            centerNodeId: null,
            maxDistance: 10,
            maxDepth: 5
        };

        const result = {
            success: true,
            nodes: this.currentNodes,
            edges: this.currentEdges,
            metadata: {
                nodeCount: this.currentNodes.length,
                edgeCount: this.currentEdges.length
            }
        };
        
        console.log('[GraphFilter.resetFilters] Completed:', result);
        return result;
    }

    /**
     * Get current filter state
     * @returns {Object} Current filter state
     */
    getFilterState() {
        return {
            isFiltered: this.isFiltered,
            filterType: this.filterType,
            filterParams: { ...this.filterParams },
            layerFilter: {
                enabled: this.layerFilterEnabled,
                activeLayers: Array.from(this.activeLayers),
                mode: this.layerFilterMode
            },
            distanceFilter: { ...this.distanceFilterParams }
        };
    }

    /**
     * Get available layers from original nodes
     * @returns {Array} Array of unique layer names
     */
    getAvailableLayers() {
        const layers = new Set();
        this.originalNodes.forEach(node => {
            if (node.layers) {
                node.layers.forEach(layer => layers.add(layer));
            }
        });
        return Array.from(layers).sort();
    }

    /**
     * Get node connections for a specific node
     * @param {string} nodeId - Node ID
     * @returns {Array} Array of connections
     */
    getNodeConnections(nodeId) {
        return this.originalEdges
            .filter(edge => edge.from === nodeId || edge.to === nodeId)
            .map(edge => ({
                to: edge.from === nodeId ? edge.to : edge.from,
                weight: edge.weight,
                id: edge.id
            }));
    }

    /**
     * Update original graph data
     * @param {Array} nodes - New nodes array
     * @param {Array} edges - New edges array
     */
    updateOriginalData(nodes, edges) {
        this.originalNodes = [...nodes];
        this.originalEdges = [...edges];
        
        // Reset filters when data changes
        this.resetFilters();
    }

    /**
     * Get filtered data
     * @returns {Object} Current filtered data
     */
    getFilteredData() {
        return {
            nodes: this.currentNodes,
            edges: this.currentEdges,
            isFiltered: this.isFiltered,
            originalNodes: this.originalNodes,
            originalEdges: this.originalEdges
        };
    }

    /**
     * Check if a specific node is visible in current filter
     * @param {string} nodeId - Node ID
     * @returns {boolean} Whether node is visible
     */
    isNodeVisible(nodeId) {
        return this.currentNodes.some(node => node.id === nodeId);
    }

    /**
     * Check if a specific edge is visible in current filter
     * @param {string} edgeId - Edge ID
     * @returns {boolean} Whether edge is visible
     */
    isEdgeVisible(edgeId) {
        return this.currentEdges.some(edge => edge.id === edgeId);
    }

    /**
     * Get filter statistics
     * @returns {Object} Filter statistics
     */
    getFilterStats() {
        return {
            originalNodeCount: this.originalNodes.length,
            originalEdgeCount: this.originalEdges.length,
            filteredNodeCount: this.currentNodes.length,
            filteredEdgeCount: this.currentEdges.length,
            nodeReduction: this.originalNodes.length - this.currentNodes.length,
            edgeReduction: this.originalEdges.length - this.currentEdges.length,
            nodeReductionPercent: this.originalNodes.length > 0 
                ? ((this.originalNodes.length - this.currentNodes.length) / this.originalNodes.length) * 100 
                : 0,
            edgeReductionPercent: this.originalEdges.length > 0
                ? ((this.originalEdges.length - this.currentEdges.length) / this.originalEdges.length) * 100
                : 0,
            isFiltered: this.isFiltered,
            filterType: this.filterType
        };
    }

    /**
     * Export filter configuration
     * @returns {Object} Filter configuration
     */
    exportFilterConfig() {
        return {
            filterType: this.filterType,
            filterParams: this.filterParams,
            layerFilter: {
                enabled: this.layerFilterEnabled,
                activeLayers: Array.from(this.activeLayers),
                mode: this.layerFilterMode
            },
            distanceFilter: this.distanceFilterParams
        };
    }

    /**
     * Import filter configuration
     * @param {Object} config - Filter configuration
     * @returns {Object} Import result
     */
    importFilterConfig(config) {
        try {
            this.resetFilters();
            
            if (config.filterType === 'layer' && config.layerFilter) {
                return this.applyLayerFilter(
                    config.layerFilter.activeLayers || [],
                    config.layerFilter.mode || 'include'
                );
            }
            
            if (config.filterType === 'distance' && config.distanceFilter) {
                return this.applyLocalGraphFilter(
                    config.distanceFilter.centerNodeId,
                    config.distanceFilter.maxDistance,
                    config.distanceFilter.maxDepth
                );
            }
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}