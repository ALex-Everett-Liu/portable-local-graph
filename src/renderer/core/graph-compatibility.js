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
 *   - js/analysis/pathfinding-engine.js (pathfinding algorithms)
 * 
 * This file will be removed in future versions. Use modular components directly.
 * 
 * Total modular codebase: ~465 lines vs original 1361 lines
 * Each module: 45-96 lines max - maintainable and testable
 */
import { GraphData } from './graph-data.js';
import { GraphRenderer } from '../rendering/graph-renderer.js';
import { calculateDistance, distanceToLineSegment } from '../utils/geometry.js';
import { dijkstra } from '../utils/algorithms.js';

export class Graph {
    constructor(canvas, options = {}) {
        // Core components
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.graphData = new GraphData();
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
    }

    /**
     * Synchronize data between components
     */
    syncData() {
        // Data synchronization - filtering removed
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
            return Math.sqrt(dx * dx + dy * dy) <= (node.radius + 3);
        });
    }

    getEdgeAt(x, y) {
        const data = this.graphData.exportData();
        for (const edge of data.edges) {
            const from = data.nodes.find(n => n.id === edge.from);
            const to = data.nodes.find(n => n.id === edge.to);
            
            if (from && to) {
                const distance = distanceToLineSegment(x, y, from.x, from.y, to.x, to.y);
                if (distance <= 8) {
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
                {}
            );
        }
    }

    // Event handlers
    handleMouseDown(e) {
        const pos = this.getMousePos(e);
        const data = this.graphData.exportData();
        const node = this.getNodeAt(pos.x, pos.y);
        const edge = !node ? this.getEdgeAt(pos.x, pos.y) : null;
        
        if (e.button === 0) {
            if (this.mode === 'node') {
                if (!node) {
                    const newNode = this.addNode(pos.x, pos.y);
                    this.onGraphUpdate();
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
                } else if (edge) {
                    // Select edge on left-click
                    this.selectedNode = null;
                    this.selectedEdge = edge;
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


    resetFilter() {
        // Filtering functionality removed - will be redesigned later
        return false;
    }

    // Layer filtering methods - stubbed out for redesign
    getAllLayers() {
        return this.graphData.getAllLayers();
    }

    setActiveLayers(layers) {
        // Layer filtering functionality removed - will be redesigned later
        console.log('[setActiveLayers] Layer filtering removed for redesign');
    }

    setLayerFilterMode(mode) {
        // Layer filtering functionality removed - will be redesigned later
    }

    getLayerFilterMode() {
        return 'include'; // Default mode
    }

    addActiveLayer(layer) {
        // Layer filtering functionality removed - will be redesigned later
    }

    removeActiveLayer(layer) {
        // Layer filtering functionality removed - will be redesigned later
    }

    clearLayerFilter() {
        // Layer filtering functionality removed - will be redesigned later
        return true;
    }

    toggleLayer(layer) {
        // Layer filtering functionality removed - will be redesigned later
    }

    isLayerActive(layer) {
        return false; // No layers active
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


    // Batch operations
    renameLayer(oldName, newName) {
        return this.graphData.renameLayer(oldName, newName);
    }

    getLayerUsage(layerName) {
        return this.graphData.getLayerUsage(layerName);
    }
}