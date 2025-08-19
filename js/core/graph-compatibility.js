/**
 * ⚠️  DEPRECATED COMPATIBILITY LAYER ⚠️
 * 
 * This file is a BACKWARD COMPATIBILITY LAYER only. It should NOT be extended.
 * All new features should be added to the modular components instead.
 * 
 * ❌ DO NOT ADD NEW METHODS HERE
 * ❌ DO NOT MODIFY EXISTING METHODS
 * ❌ DO NOT USE AS A BASE FOR NEW FEATURES
 * 
 * ✅ Add new features to:
 *   - js/core/graph-data.js (data management)
 *   - js/rendering/graph-renderer.js (rendering)
 *   - js/filtering/graph-filter.js (filtering)
 *   - js/analysis/graph-analysis.js (algorithms)
 * 
 * This file will be removed in future versions. Use modular components directly.
 * 
 * Total modular codebase: ~465 lines vs original 1361 lines
 * Each module: 45-96 lines max - maintainable and testable
 */
import { GraphData } from './graph-data.js';
import { ExportManager } from './export-manager.js';
import { GraphFilter } from '../filtering/graph-filter.js';
import { FilterStateManager } from '../filtering/filter-state-manager.js';
import { GraphAnalysis } from '../analysis/graph-analysis.js';
import { GraphRenderer } from '../rendering/graph-renderer.js';
import { calculateDistance, distanceToLineSegment } from '../utils/geometry.js';
import { dijkstra } from '../utils/algorithms.js';

export class Graph {
    constructor(canvas, options = {}) {
        // Core components
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.graphData = new GraphData();
        this.exportManager = new ExportManager(this.graphData);
        this.graphFilter = new GraphFilter();
        this.filterStateManager = new FilterStateManager(this.graphFilter);
        this.graphAnalysis = new GraphAnalysis();
        this.renderer = null;

        // State management
        this.selectedNode = null;
        this.selectedEdge = null;
        this.dragNode = null;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.scale = 1;
        this.offset = { x: 0, y: 0 };
        this.isPanning = false;
        this.lastPanPoint = { x: 0, y: 0 };
        this.mode = options.mode || 'node';
        this.edgeStart = null;

        // Original filtering state
        this.originalNodes = null;
        this.originalEdges = null;

        // Animation
        this.animationId = null;
        this.hasHighlightedNodes = false;

        // Callbacks
        this.onModeChange = options.onModeChange || (() => {});
        this.onGraphUpdate = options.onGraphUpdate || (() => {});
        this.onSelectionChange = options.onSelectionChange || (() => {});

        // Initialize renderer
        this.initializeRenderer();
        this.setupCanvas();
        this.setupEventListeners();
        this.startAnimationLoop();

        // Synchronize data
        this.syncData();
    }

    /**
     * Initialize the renderer
     */
    initializeRenderer() {
        this.renderer = new GraphRenderer(this.canvas, this.graphData);
        this.exportManager.setRenderer(this.renderer);
    }

    /**
     * Synchronize data between components
     */
    syncData() {
        const data = this.graphData.exportData();
        this.graphFilter.updateOriginalData(data.nodes, data.edges);
        this.graphAnalysis.updateGraph(data.nodes, data.edges);
    }

    /**
     * Setup canvas
     */
    setupCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.render();
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
        this.canvas.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left - this.offset.x) / this.scale,
            y: (e.clientY - rect.top - this.offset.y) / this.scale
        };
    }

    // Node and edge operations
    addNode(x, y, label = null, color = '#6737E8', category = null, radius = 20, chineseLabel = null, layers = null) {
        const data = this.graphData.exportData();
        
        // Generate UUID
        let uuid;
        if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
            uuid = window.crypto.randomUUID();
        } else {
            uuid = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
        }

        // Handle layers inheritance
        let nodeLayers = [];
        if (layers !== null) {
            nodeLayers = Array.isArray(layers) ? layers : [layers];
        } else if (data.nodes.length > 0) {
            const lastNode = data.nodes[data.nodes.length - 1];
            nodeLayers = lastNode.layers || [];
        }

        const node = {
            id: uuid,
            x: x,
            y: y,
            label: label || `Node ${data.nodes.length + 1}`,
            chineseLabel: chineseLabel || '',
            color: color,
            radius: Math.max(1, Math.min(100, radius || 20)),
            category: category,
            layers: nodeLayers
        };

        this.graphData.addNode(node);
        this.syncData();
        this.render();
        return node;
    }

    addEdge(fromNode, toNode, weight = 1, category = null) {
        const data = this.graphData.exportData();
        
        // Check for existing edge
        const existingEdge = data.edges.find(e => 
            (e.from === fromNode && e.to === toNode) || 
            (e.from === toNode && e.to === fromNode)
        );
        
        if (existingEdge) {
            this.graphData.updateEdge(existingEdge.id, { weight, category });
            this.syncData();
            this.render();
            return existingEdge;
        }

        let uuid;
        if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
            uuid = window.crypto.randomUUID();
        } else {
            uuid = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
        }

        const edge = {
            id: uuid,
            from: fromNode,
            to: toNode,
            weight: weight,
            category: category
        };

        this.graphData.addEdge(edge);
        this.syncData();
        this.render();
        return edge;
    }

    getNodeAt(x, y) {
        const data = this.graphData.exportData();
        return data.nodes.find(node => {
            const dx = x - node.x;
            const dy = y - node.y;
            return Math.sqrt(dx * dx + dy * dy) <= node.radius;
        });
    }

    getEdgeAt(x, y) {
        const data = this.graphData.exportData();
        for (const edge of data.edges) {
            const from = data.nodes.find(n => n.id === edge.from);
            const to = data.nodes.find(n => n.id === edge.to);
            
            if (from && to) {
                const distance = distanceToLineSegment(x, y, from.x, from.y, to.x, to.y);
                if (distance <= 5) {
                    return edge;
                }
            }
        }
        return null;
    }

    distanceToLineSegment(px, py, x1, y1, x2, y2) {
        return distanceToLineSegment(px, py, x1, y1, x2, y2);
    }

    deleteNode(nodeId) {
        this.graphData.removeNode(nodeId);
        this.syncData();
        if (this.selectedNode && this.selectedNode.id === nodeId) {
            this.selectedNode = null;
            this.onSelectionChange();
        }
        this.render();
    }

    deleteEdge(edgeId) {
        this.graphData.removeEdge(edgeId);
        this.syncData();
        if (this.selectedEdge && this.selectedEdge.id === edgeId) {
            this.selectedEdge = null;
            this.onSelectionChange();
        }
        this.render();
    }

    moveNode(node, dx, dy) {
        this.graphData.updateNode(node.id, {
            x: node.x + dx,
            y: node.y + dy
        });
        this.onSelectionChange();
        this.render();
    }

    // Rendering
    render() {
        const data = this.graphData.exportData();
        if (this.renderer) {
            this.renderer.render(
                data.nodes,
                data.edges,
                { scale: this.scale, offset: this.offset },
                { 
                    selectedNode: this.selectedNode, 
                    selectedEdge: this.selectedEdge, 
                    highlightedNodes: this.highlightedNodes || []
                },
                {
                    layerFilterEnabled: this.graphFilter.layerFilterEnabled,
                    activeLayers: this.graphFilter.activeLayers,
                    layerFilterMode: this.graphFilter.layerFilterMode
                }
            );
        }
    }

    // Event handlers
    handleMouseDown(e) {
        const pos = this.getMousePos(e);
        const data = this.graphData.exportData();
        const node = this.getNodeAt(pos.x, pos.y);
        
        if (e.button === 0) {
            if (this.mode === 'node') {
                if (!node) {
                    const newNode = this.addNode(pos.x, pos.y);
                    this.onGraphUpdate();
                    if (window.updateLayerList) window.updateLayerList();
                }
            } else if (this.mode === 'select') {
                if (node) {
                    this.dragNode = node;
                    this.isDragging = true;
                    this.dragOffset = {
                        x: pos.x - node.x,
                        y: pos.y - node.y
                    };
                    this.selectedNode = node;
                    this.selectedEdge = null;
                    this.onSelectionChange();
                } else {
                    this.selectedNode = null;
                    this.selectedEdge = null;
                    this.onSelectionChange();
                    this.isPanning = true;
                    this.lastPanPoint = { x: e.clientX, y: e.clientY };
                }
            } else if (this.mode === 'edge') {
                if (node) {
                    if (this.edgeStart === null) {
                        this.edgeStart = node;
                    } else {
                        if (this.edgeStart !== node) {
                            this.addEdge(this.edgeStart.id, node.id);
                            this.onGraphUpdate();
                        }
                        this.edgeStart = null;
                    }
                }
            }
        }
        
        this.render();
    }

    handleMouseMove(e) {
        const pos = this.getMousePos(e);
        
        if (this.isDragging && this.dragNode) {
            this.moveNode(this.dragNode, pos.x - this.dragNode.x - this.dragOffset.x, pos.y - this.dragNode.y - this.dragOffset.y);
        } else if (this.isPanning) {
            const dx = e.clientX - this.lastPanPoint.x;
            const dy = e.clientY - this.lastPanPoint.y;
            this.offset.x += dx;
            this.offset.y += dy;
            this.lastPanPoint = { x: e.clientX, y: e.clientY };
            this.render();
        }
    }

    handleMouseUp(e) {
        this.isDragging = false;
        this.dragNode = null;
        this.isPanning = false;
    }

    handleWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.scale *= delta;
        this.scale = Math.max(0.1, Math.min(5, this.scale));
        this.render();
    }

    handleContextMenu(e) {
        e.preventDefault();
        const pos = this.getMousePos(e);
        const node = this.getNodeAt(pos.x, pos.y);
        const edge = this.getEdgeAt(pos.x, pos.y);
        
        if (node) {
            this.selectedNode = node;
            this.selectedEdge = null;
            this.onSelectionChange();
            window.showNodeDialog(node);
        } else if (edge) {
            this.selectedEdge = edge;
            this.selectedNode = null;
            this.onSelectionChange();
            window.showEdgeDialog(edge);
        }
    }

    // Export functionality
    exportData() {
        if (this.originalNodes && this.originalEdges) {
            // Filtered state - merge changes
            const data = this.graphData.exportData();
            
            const originalNodeMap = new Map(this.originalNodes.map(n => [n.id, n]));
            const currentNodeMap = new Map(data.nodes.map(n => [n.id, n]));
            
            const mergedNodes = [...this.originalNodes];
            
            data.nodes.forEach(currentNode => {
                if (!originalNodeMap.has(currentNode.id)) {
                    mergedNodes.push(currentNode);
                }
            });
            
            mergedNodes.forEach((node, index) => {
                if (currentNodeMap.has(node.id)) {
                    const currentNode = currentNodeMap.get(node.id);
                    mergedNodes[index] = { ...currentNode };
                }
            });
            
            const originalEdgeMap = new Map(this.originalEdges.map(e => [e.id, e]));
            const currentEdgeMap = new Map(data.edges.map(e => [e.id, e]));
            
            const mergedEdges = [...this.originalEdges];
            
            data.edges.forEach(currentEdge => {
                if (!originalEdgeMap.has(currentEdge.id)) {
                    mergedEdges.push(currentEdge);
                }
            });
            
            mergedEdges.forEach((edge, index) => {
                if (currentEdgeMap.has(edge.id)) {
                    const currentEdge = currentEdgeMap.get(edge.id);
                    mergedEdges[index] = { ...currentEdge };
                }
            });
            
            return {
                nodes: mergedNodes,
                edges: mergedEdges,
                scale: this.scale,
                offset: this.offset
            };
        }
        
        const data = this.graphData.exportData();
        return {
            nodes: data.nodes,
            edges: data.edges,
            scale: this.scale,
            offset: this.offset
        };
    }

    importData(data) {
        this.graphData.loadData({
            nodes: data.nodes || [],
            edges: data.edges || []
        });
        this.syncData();
        this.scale = data.scale || 1;
        this.offset = data.offset || { x: 0, y: 0 };
        this.render();
    }

    clear() {
        this.graphData.clear();
        this.syncData();
        this.selectedNode = null;
        this.selectedEdge = null;
        this.scale = 1;
        this.offset = { x: 0, y: 0 };
        this.onSelectionChange();
        this.render();
    }

    // Filtering methods
    applyLocalGraphFilter(centerNodeId, maxDistance = 10, maxDepth = 5) {
        const result = this.filterStateManager.applyLocalGraphFilter(centerNodeId, maxDistance, maxDepth);
        
        if (result.success) {
            const data = this.graphData.exportData();
            this.originalNodes = [...data.nodes];
            this.originalEdges = [...data.edges];
            
            this.graphData.loadData({
                nodes: result.nodes,
                edges: result.edges
            });
            this.syncData();
            
            const canvasRect = this.canvas.getBoundingClientRect();
            this.offset.x = canvasRect.width / 2 - result.centerNode.x * this.scale;
            this.offset.y = canvasRect.height / 2 - result.centerNode.y * this.scale;
            
            this.render();
            return true;
        }
        return false;
    }

    resetFilter() {
        console.log('[resetFilter] Starting distance filter reset...');
        const result = this.filterStateManager.resetFilters();
        
        if (result.success && this.originalNodes && this.originalEdges) {
            console.log('[resetFilter] Merging original data with new additions...');
            
            // Get current filtered data (may contain new nodes/edges)
            const currentData = this.graphData.exportData();
            const originalNodeMap = new Map(this.originalNodes.map(n => [n.id, n]));
            const originalEdgeMap = new Map(this.originalEdges.map(e => [e.id, e]));
            
            // Identify new nodes/edges created after filtering
            const newNodes = currentData.nodes.filter(node => !originalNodeMap.has(node.id));
            const newEdges = currentData.edges.filter(edge => !originalEdgeMap.has(edge.id));
            
            console.log('[resetFilter] New nodes to preserve:', newNodes.length);
            console.log('[resetFilter] New edges to preserve:', newEdges.length);
            
            // Merge: original data + new additions
            const mergedNodes = [...this.originalNodes, ...newNodes];
            const mergedEdges = [...this.originalEdges, ...newEdges];
            
            this.graphData.loadData({
                nodes: mergedNodes,
                edges: mergedEdges
            });
            this.syncData();
            this.originalNodes = null;
            this.originalEdges = null;
            this.render();
            console.log('[resetFilter] Data merged and restored successfully');
            return true;
        }
        return false;
    }

    // Layer filtering methods
    getAllLayers() {
        return this.graphData.getAllLayers();
    }

    setActiveLayers(layers) {
        console.log('[setActiveLayers] Setting active layers:', layers);
        
        // Check if we need to save original data
        if (!this.originalNodes || !this.originalEdges) {
            const data = this.graphData.exportData();
            this.originalNodes = [...data.nodes];
            this.originalEdges = [...data.edges];
            console.log('[setActiveLayers] Saved original data:', {
                nodes: this.originalNodes.length,
                edges: this.originalEdges.length
            });
        }
        
        const result = this.filterStateManager.applyLayerFilter(layers, this.graphFilter.layerFilterMode);
        console.log('[setActiveLayers] applyLayerFilter result:', result);
        
        if (result.success) {
            this.graphData.loadData({
                nodes: result.nodes,
                edges: result.edges
            });
            this.syncData();
            this.render();
            console.log('[setActiveLayers] Layer filter applied successfully');
        } else {
            console.error('[setActiveLayers] Layer filter failed:', result.error);
        }
    }

    setLayerFilterMode(mode) {
        if (mode === 'include' || mode === 'exclude') {
            this.graphFilter.layerFilterMode = mode;
            this.render();
        }
    }

    getLayerFilterMode() {
        return this.graphFilter.layerFilterMode;
    }

    addActiveLayer(layer) {
        const activeLayers = Array.from(this.filterStateManager.state.layerFilter.activeLayers || []);
        activeLayers.push(layer.trim());
        this.setActiveLayers(activeLayers);
    }

    removeActiveLayer(layer) {
        const activeLayers = Array.from(this.filterStateManager.state.layerFilter.activeLayers || []);
        const index = activeLayers.indexOf(layer.trim());
        if (index > -1) {
            activeLayers.splice(index, 1);
            this.setActiveLayers(activeLayers);
        }
    }

    clearLayerFilter() {
        console.log('[clearLayerFilter] Starting layer filter reset...');
        console.log('[clearLayerFilter] originalNodes:', this.originalNodes?.length || 0);
        console.log('[clearLayerFilter] originalEdges:', this.originalEdges?.length || 0);
        
        const result = this.filterStateManager.resetFilters();
        console.log('[clearLayerFilter] resetFilters result:', result);
        
        if (result.success) {
            console.log('[clearLayerFilter] Reset successful');
            
            if (this.originalNodes && this.originalEdges) {
                console.log('[clearLayerFilter] Merging original data with new additions...');
                
                // Get current filtered data (may contain new nodes/edges)
                const currentData = this.graphData.exportData();
                const originalNodeMap = new Map(this.originalNodes.map(n => [n.id, n]));
                const originalEdgeMap = new Map(this.originalEdges.map(e => [e.id, e]));
                
                // Identify new nodes/edges created after filtering
                const newNodes = currentData.nodes.filter(node => !originalNodeMap.has(node.id));
                const newEdges = currentData.edges.filter(edge => !originalEdgeMap.has(edge.id));
                
                console.log('[clearLayerFilter] New nodes to preserve:', newNodes.length);
                console.log('[clearLayerFilter] New edges to preserve:', newEdges.length);
                
                // Merge: original data + new additions
                const mergedNodes = [...this.originalNodes, ...newNodes];
                const mergedEdges = [...this.originalEdges, ...newEdges];
                
                console.log('[clearLayerFilter] Final merged data:', {
                    originalNodes: this.originalNodes.length,
                    newNodes: newNodes.length,
                    totalNodes: mergedNodes.length,
                    originalEdges: this.originalEdges.length,
                    newEdges: newEdges.length,
                    totalEdges: mergedEdges.length
                });
                
                this.graphData.loadData({
                    nodes: mergedNodes,
                    edges: mergedEdges
                });
                this.syncData();
                this.originalNodes = null;
                this.originalEdges = null;
                console.log('[clearLayerFilter] Data merged and restored successfully');
            } else {
                console.log('[clearLayerFilter] No original data to restore');
            }
        } else {
            console.error('[clearLayerFilter] Reset failed:', result.error);
        }
        
        console.log('[clearLayerFilter] Current graph state:', {
            nodes: this.graphData.exportData().nodes.length,
            edges: this.graphData.exportData().edges.length
        });
        
        this.render();
        return true;
    }

    toggleLayer(layer) {
        const activeLayers = Array.from(this.filterStateManager.state.layerFilter.activeLayers || []);
        const trimmedLayer = layer.trim();
        const index = activeLayers.indexOf(trimmedLayer);
        
        if (index > -1) {
            activeLayers.splice(index, 1);
        } else {
            activeLayers.push(trimmedLayer);
        }
        
        this.setActiveLayers(activeLayers);
    }

    isLayerActive(layer) {
        return this.filterStateManager.state.layerFilter.activeLayers?.has(layer.trim()) || false;
    }

    // Centrality calculations
    calculateCentralities() {
        const data = this.graphData.exportData();
        this.graphAnalysis.updateGraph(data.nodes, data.edges);
        
        const centralities = this.graphAnalysis.calculateCentralities();
        
        // Update nodes with centrality data
        data.nodes.forEach(node => {
            if (!node.centrality) node.centrality = {};
            Object.keys(centralities).forEach(type => {
                node.centrality[type] = centralities[type][node.id];
            });
        });
        
        this.calculateCentralityRankings();
    }

    calculateCentralityRankings() {
        const data = this.graphData.exportData();
        if (data.nodes.length === 0) return;

        this.centralityRankings = {};
        const centralityTypes = ['degree', 'betweenness', 'closeness', 'eigenvector', 'pagerank'];

        centralityTypes.forEach(type => {
            const values = data.nodes.map(node => ({
                nodeId: node.id,
                value: parseFloat(node.centrality?.[type]) || 0
            }));

            values.sort((a, b) => b.value - a.value);

            const rankings = new Map();
            values.forEach((item, index) => {
                rankings.set(item.nodeId, index + 1);
            });

            this.centralityRankings[type] = rankings;
        });
    }

    getCentralityRank(nodeId, centralityType) {
        if (!this.centralityRankings || !this.centralityRankings[centralityType]) {
            return null;
        }
        return this.centralityRankings[centralityType].get(nodeId);
    }

    // Utility methods
    getAllNodes() {
        const data = this.graphData.exportData();
        return data.nodes.map(node => ({
            id: node.id,
            label: node.label,
            chineseLabel: node.chineseLabel || '',
            layers: node.layers || []
        }));
    }

    // Backward compatibility properties
    get nodes() {
        return this.graphData.exportData().nodes;
    }

    get edges() {
        return this.graphData.exportData().edges;
    }

    // Search highlighting support
    setHighlightedNodes(nodeIds) {
        this.highlightedNodes = nodeIds || [];
    }

    clearHighlightedNodes() {
        this.highlightedNodes = [];
    }

    // Additional backward compatibility - no need to override existing methods

    getNodeConnections(nodeId) {
        const data = this.graphData.exportData();
        const node = data.nodes.find(n => n.id === nodeId);
        if (!node) return { incoming: [], outgoing: [], bidirectional: [], all: [] };

        const incoming = [];
        const outgoing = [];
        const bidirectional = [];

        data.edges.forEach(edge => {
            if (edge.from === nodeId) {
                const targetNode = data.nodes.find(n => n.id === edge.to);
                if (targetNode) {
                    outgoing.push({
                        edge: edge,
                        node: targetNode,
                        direction: 'outgoing'
                    });
                }
            } else if (edge.to === nodeId) {
                const sourceNode = data.nodes.find(n => n.id === edge.from);
                if (sourceNode) {
                    incoming.push({
                        edge: edge,
                        node: sourceNode,
                        direction: 'incoming'
                    });
                }
            }
        });

        return { incoming, outgoing, bidirectional, all: [...incoming, ...outgoing] };
    }

    // Animation
    startAnimationLoop() {
        const animate = () => {
            const data = this.graphData.exportData();
            this.hasHighlightedNodes = this.highlightedNodes && this.highlightedNodes.length > 0;
            if (this.hasHighlightedNodes) {
                this.render();
            }
            this.animationId = requestAnimationFrame(animate);
        };
        this.animationId = requestAnimationFrame(animate);
    }

    stopAnimationLoop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    // Original filtering methods (for backward compatibility)
    calculateDistances(centerNodeId, maxDistance = 10, maxDepth = 5) {
        const data = this.graphData.exportData();
        return dijkstra(data.nodes, data.edges, centerNodeId);
    }

    calculateDepths(centerNodeId, maxDepth = 5) {
        const data = this.graphData.exportData();
        const depths = new Map();
        const queue = [centerNodeId];
        
        data.nodes.forEach(node => {
            depths.set(node.id, node.id === centerNodeId ? 0 : Infinity);
        });
        
        while (queue.length > 0) {
            const currentId = queue.shift();
            const currentDepth = depths.get(currentId);
            
            if (currentDepth >= maxDepth) continue;
            
            const connectedEdges = data.edges.filter(edge => 
                edge.from === currentId || edge.to === currentId
            );
            
            connectedEdges.forEach(edge => {
                const neighborId = edge.from === currentId ? edge.to : edge.from;
                if (depths.get(neighborId) === Infinity) {
                    depths.set(neighborId, currentDepth + 1);
                    queue.push(neighborId);
                }
            });
        }
        
        return depths;
    }

    analyzeDistancesTable(centerNodeId, maxDistance = 10, maxDepth = 5) {
        const data = this.graphData.exportData();
        const centerNode = data.nodes.find(n => n.id === centerNodeId);
        if (!centerNode) {
            return { nodes: [], centerNode: null };
        }

        console.log('[analyzeDistancesTable] Data:', { nodes: data.nodes.length, edges: data.edges.length });
        console.log('[analyzeDistancesTable] Edges with weights:', data.edges.map(e => ({from: e.from, to: e.to, weight: e.weight})));

        const distances = this.calculateDistances(centerNodeId, maxDistance, maxDepth);
        console.log('[analyzeDistancesTable] Distances:', Object.fromEntries(distances));
        
        // Calculate depths using BFS for layered analysis
        const depths = this.calculateDepths(centerNodeId, maxDepth);
        console.log('[analyzeDistancesTable] Depths:', Object.fromEntries(depths));
        
        // Create analysis data for all reachable nodes
        const analysisData = [];
        distances.forEach((distance, nodeId) => {
            const node = data.nodes.find(n => n.id === nodeId);
            if (node) {
                analysisData.push({
                    id: node.id,
                    label: node.label,
                    chineseLabel: node.chineseLabel || '',
                    x: node.x,
                    y: node.y,
                    distance: distance,
                    depth: depths.get(nodeId) || 0,
                    color: node.color,
                    radius: node.radius
                });
            }
        });

        return {
            nodes: analysisData,
            centerNode,
            distances: Object.fromEntries(distances),
            depths: Object.fromEntries(depths)
        };
    }

    filterLocalGraph(centerNodeId, maxDistance = 10, maxDepth = 5) {
        const data = this.graphData.exportData();
        const centerNode = data.nodes.find(n => n.id === centerNodeId);
        if (!centerNode) {
            return { nodes: [], edges: [], centerNode: null };
        }

        const distances = this.calculateDistances(centerNodeId, maxDistance, maxDepth);
        
        const filteredNodes = data.nodes.filter(node => 
            distances.has(node.id) && distances.get(node.id) !== Infinity
        );
        
        const nodeIds = new Set(filteredNodes.map(n => n.id));
        const filteredEdges = data.edges.filter(edge => 
            nodeIds.has(edge.from) && nodeIds.has(edge.to)
        );

        return {
            nodes: filteredNodes,
            edges: filteredEdges,
            centerNode,
            distances: Object.fromEntries(distances),
            depths: {}
        };
    }

    // Batch operations
    renameLayer(oldName, newName) {
        return this.graphData.renameLayer(oldName, newName);
    }

    getLayerUsage(layerName) {
        return this.graphData.getLayerUsage(layerName);
    }
}