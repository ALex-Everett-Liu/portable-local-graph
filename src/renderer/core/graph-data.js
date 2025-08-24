/**
 * GraphData - Core data structure for graph storage and manipulation
 * Provides clean separation between data and presentation logic
 */
export class GraphData {
    constructor() {
        this.nodes = [];
        this.edges = [];
        
        // Cache for efficient lookups
        this.nodeMap = new Map();
        this.edgeMap = new Map();
        
        // Event system for data changes
        this.listeners = new Map();
        
        this.rebuildMaps();
    }

    /**
     * Add event listener for data changes
     * @param {string} event - Event type
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
                    console.error('GraphData event listener error:', error);
                }
            });
        }
    }

    /**
     * Rebuild node and edge maps for efficient lookup
     */
    rebuildMaps() {
        this.nodeMap.clear();
        this.edgeMap.clear();
        
        this.nodes.forEach(node => {
            this.nodeMap.set(node.id, node);
        });
        
        this.edges.forEach(edge => {
            if (!this.edgeMap.has(edge.from)) {
                this.edgeMap.set(edge.from, []);
            }
            if (!this.edgeMap.has(edge.to)) {
                this.edgeMap.set(edge.to, []);
            }
            this.edgeMap.get(edge.from).push(edge);
            this.edgeMap.get(edge.to).push(edge);
        });
    }

    /**
     * Add a new node
     * @param {Object} node - Node object
     * @returns {Object} Added node
     */
    addNode(node) {
        this.nodes.push(node);
        this.nodeMap.set(node.id, node);
        this.emit('nodeAdded', { node, nodes: this.nodes });
        return node;
    }

    /**
     * Remove a node by ID
     * @param {string} nodeId - Node ID
     * @returns {boolean} Success status
     */
    removeNode(nodeId) {
        const index = this.nodes.findIndex(n => n.id === nodeId);
        if (index > -1) {
            const node = this.nodes[index];
            this.nodes.splice(index, 1);
            this.nodeMap.delete(nodeId);
            
            // Remove connected edges
            this.edges = this.edges.filter(edge => 
                edge.from !== nodeId && edge.to !== nodeId
            );
            this.rebuildMaps();
            
            this.emit('nodeRemoved', { nodeId, nodes: this.nodes, edges: this.edges });
            return true;
        }
        return false;
    }

    /**
     * Update a node
     * @param {string} nodeId - Node ID
     * @param {Object} updates - Update object
     * @returns {boolean} Success status
     */
    updateNode(nodeId, updates) {
        const node = this.nodeMap.get(nodeId);
        if (node) {
            Object.assign(node, updates);
            this.emit('nodeUpdated', { node, nodes: this.nodes });
            return true;
        }
        return false;
    }

    /**
     * Add a new edge
     * @param {Object} edge - Edge object
     * @returns {Object} Added edge
     */
    addEdge(edge) {
        this.edges.push(edge);
        this.rebuildMaps();
        this.emit('edgeAdded', { edge, edges: this.edges });
        return edge;
    }

    /**
     * Remove an edge by ID
     * @param {string} edgeId - Edge ID
     * @returns {boolean} Success status
     */
    removeEdge(edgeId) {
        const index = this.edges.findIndex(e => e.id === edgeId);
        if (index > -1) {
            const edge = this.edges[index];
            this.edges.splice(index, 1);
            this.rebuildMaps();
            this.emit('edgeRemoved', { edgeId, edges: this.edges });
            return true;
        }
        return false;
    }

    /**
     * Update an edge
     * @param {string} edgeId - Edge ID
     * @param {Object} updates - Update object
     * @returns {boolean} Success status
     */
    updateEdge(edgeId, updates) {
        const edge = this.edges.find(e => e.id === edgeId);
        if (edge) {
            Object.assign(edge, updates);
            this.rebuildMaps();
            this.emit('edgeUpdated', { edge, edges: this.edges });
            return true;
        }
        return false;
    }

    /**
     * Get a node by ID
     * @param {string} nodeId - Node ID
     * @returns {Object|null} Node object
     */
    getNode(nodeId) {
        return this.nodeMap.get(nodeId) || null;
    }

    /**
     * Get all edges for a node
     * @param {string} nodeId - Node ID
     * @returns {Array} Array of edges
     */
    getNodeEdges(nodeId) {
        return this.edgeMap.get(nodeId) || [];
    }

    /**
     * Clear all data
     */
    clear() {
        this.nodes = [];
        this.edges = [];
        this.nodeMap.clear();
        this.edgeMap.clear();
        this.emit('cleared', { nodes: this.nodes, edges: this.edges });
    }

    /**
     * Load data from object
     * @param {Object} data - Data object with nodes and edges
     */
    loadData(data) {
        this.nodes = data.nodes || [];
        this.edges = data.edges || [];
        this.rebuildMaps();
        this.emit('dataLoaded', { nodes: this.nodes, edges: this.edges });
    }

    /**
     * Export data as object
     * @returns {Object} Data object
     */
    exportData() {
        return {
            nodes: [...this.nodes],
            edges: [...this.edges]
        };
    }

    /**
     * Get all layers from nodes
     * @returns {Array} Array of unique layer names
     */
    getAllLayers() {
        const layers = new Set();
        this.nodes.forEach(node => {
            if (node.layers && Array.isArray(node.layers)) {
                node.layers.forEach(layer => layers.add(layer.trim()));
            }
        });
        return Array.from(layers).sort();
    }

    /**
     * Get nodes by layer
     * @param {string} layer - Layer name
     * @returns {Array} Array of nodes
     */
    getNodesByLayer(layer) {
        return this.nodes.filter(node => 
            node.layers && Array.isArray(node.layers) && 
            node.layers.some(l => l.trim() === layer.trim())
        );
    }

    /**
     * Validate graph integrity
     * @returns {Object} Validation results
     */
    validate() {
        const issues = [];
        const nodeIds = new Set(this.nodes.map(n => n.id));
        
        // Check for orphaned edges
        this.edges.forEach(edge => {
            if (!nodeIds.has(edge.from)) {
                issues.push({ type: 'orphaned_edge', edge: edge.id, missing: 'from' });
            }
            if (!nodeIds.has(edge.to)) {
                issues.push({ type: 'orphaned_edge', edge: edge.id, missing: 'to' });
            }
        });
        
        // Check for duplicate node IDs
        const seen = new Set();
        this.nodes.forEach(node => {
            if (seen.has(node.id)) {
                issues.push({ type: 'duplicate_node_id', node: node.id });
            }
            seen.add(node.id);
        });
        
        return {
            valid: issues.length === 0,
            issues
        };
    }

    /**
     * Get graph statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        return {
            nodeCount: this.nodes.length,
            edgeCount: this.edges.length,
            avgNodeConnections: this.edges.length / Math.max(1, this.nodes.length),
            isolatedNodes: this.nodes.filter(node => 
                !this.edges.some(edge => edge.from === node.id || edge.to === node.id)
            ).length
        };
    }
}