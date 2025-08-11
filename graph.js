class Graph {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.nodes = [];
        this.edges = [];
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
        this.onModeChange = options.onModeChange || (() => {});
        this.onGraphUpdate = options.onGraphUpdate || (() => {});
        this.onSelectionChange = options.onSelectionChange || (() => {});
        
        // Layer filtering state
        this.activeLayers = new Set(); // Empty set means show all layers
        this.layerFilterEnabled = false;
        
        this.setupCanvas();
        this.setupEventListeners();
    }

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

    // Create a new node at specified coordinates with customizable properties.
    addNode(x, y, label = null, color = '#3b82f6', category = null, radius = 20, chineseLabel = null, layers = []) {
        // Generate consistent UUID format
        let uuid;
        if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
            // Use browser's native crypto API for UUID v4
            uuid = window.crypto.randomUUID();
        } else if (typeof require !== 'undefined') {
            // Node.js environment
            try {
                const { v7 } = require('uuid');
                uuid = v7();
            } catch (e) {
                uuid = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
            }
        } else {
            // Fallback for other environments
            uuid = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
        }
        
        const node = {
            id: uuid,
            x: x,
            y: y,
            label: label || `Node ${this.nodes.length + 1}`,
            chineseLabel: chineseLabel || '',
            color: color,
            radius: Math.max(1, Math.min(100, radius || 20)),
            category: category,
            layers: Array.isArray(layers) ? layers : (layers ? [layers] : [])
        };
        this.nodes.push(node);
        return node;
    }

    addEdge(fromNode, toNode, weight = 1, category = null) {
        const existingEdge = this.edges.find(e => 
            (e.from === fromNode && e.to === toNode) || 
            (e.from === toNode && e.to === fromNode)
        );
        
        if (existingEdge) {
            existingEdge.weight = weight;
            if (category !== null) existingEdge.category = category;
            return existingEdge;
        }

        // Generate consistent UUID format
        let uuid;
        if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
            // Use browser's native crypto API for UUID v4
            uuid = window.crypto.randomUUID();
        } else if (typeof require !== 'undefined') {
            // Node.js environment
            try {
                const { v7 } = require('uuid');
                uuid = v7();
            } catch (e) {
                uuid = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
            }
        } else {
            // Fallback for other environments
            uuid = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
        }
        
        const edge = {
            id: uuid,
            from: fromNode,
            to: toNode,
            weight: weight,
            category: category
        };
        this.edges.push(edge);
        return edge;
    }

    getNodeAt(x, y) {
        return this.nodes.find(node => {
            const dx = x - node.x;
            const dy = y - node.y;
            return Math.sqrt(dx * dx + dy * dy) <= node.radius;
        });
    }

    getEdgeAt(x, y) {
        for (const edge of this.edges) {
            const from = this.nodes.find(n => n.id === edge.from);
            const to = this.nodes.find(n => n.id === edge.to);
            
            if (from && to) {
                const distance = this.distanceToLineSegment(x, y, from.x, from.y, to.x, to.y);
                if (distance <= 5) {
                    return edge;
                }
            }
        }
        return null;
    }

    distanceToLineSegment(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        
        if (len === 0) return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
        
        const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (len * len)));
        const projX = x1 + t * dx;
        const projY = y1 + t * dy;
        
        return Math.sqrt((px - projX) * (px - projX) + (py - projY) * (py - projY));
    }

    deleteNode(nodeId) {
        this.nodes = this.nodes.filter(n => n.id !== nodeId);
        this.edges = this.edges.filter(e => e.from !== nodeId && e.to !== nodeId);
        
        if (this.selectedNode && this.selectedNode.id === nodeId) {
            this.selectedNode = null;
            this.onSelectionChange();
        }
    }

    deleteEdge(edgeId) {
        this.edges = this.edges.filter(e => e.id !== edgeId);
        
        if (this.selectedEdge && this.selectedEdge.id === edgeId) {
            this.selectedEdge = null;
            this.onSelectionChange();
        }
    }

    moveNode(node, dx, dy) {
        node.x += dx;
        node.y += dy;
        this.onSelectionChange();
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.save();
        this.ctx.translate(this.offset.x, this.offset.y);
        this.ctx.scale(this.scale, this.scale);

        this.renderGrid();
        this.renderEdges();
        this.renderNodes();

        this.ctx.restore();
    }

    renderGrid() {
        const gridSize = 20;
        const width = this.canvas.width / this.scale;
        const height = this.canvas.height / this.scale;
        
        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.lineWidth = 1 / this.scale;
        
        for (let x = 0; x <= width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y <= height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }
    }

    renderNodes() {
        this.nodes.forEach(node => {
            // Skip rendering if layer filter is enabled and node doesn't match
            if (this.layerFilterEnabled && this.activeLayers.size > 0) {
                const nodeLayers = node.layers || [];
                const hasMatchingLayer = nodeLayers.some(layer => this.activeLayers.has(layer));
                if (!hasMatchingLayer) return;
            }
            
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
            
            if (node === this.selectedNode) {
                this.ctx.fillStyle = '#007bff';
                this.ctx.strokeStyle = '#0056b3';
                this.ctx.lineWidth = 3 / this.scale;
            } else if (node.highlighted) {
                this.ctx.fillStyle = node.color;
                this.ctx.strokeStyle = '#ffc107';
                this.ctx.lineWidth = 4 / this.scale;
            } else {
                this.ctx.fillStyle = node.color;
                this.ctx.strokeStyle = '#2563eb';
                this.ctx.lineWidth = 2 / this.scale;
            }
            
            this.ctx.fill();
            this.ctx.stroke();
            
            // Calculate text width for background
            this.ctx.font = `${14 / this.scale}px Arial`;
            const textWidth = this.ctx.measureText(node.label).width;
            const textHeight = 14 / this.scale;
            
            // Only add background if text is larger than node
            if (textWidth > node.radius * 1.5) {
                // Draw text background
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                this.ctx.fillRect(
                    node.x - textWidth / 2 - 4 / this.scale,
                    node.y - textHeight / 2 - 2 / this.scale,
                    textWidth + 8 / this.scale,
                    textHeight + 4 / this.scale
                );
            }
            
            // Draw text
            this.ctx.fillStyle = '#ffffff';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(node.label, node.x, node.y);
        });
    }

    getEdgeLineWidth(weight) {
        // Negative correlation: weight as distance/cost
        // weight range: 0.1-30, line width range: 0.5-8
        // Higher weight = thinner line (more distant/expensive)
        // Lower weight = thicker line (closer/cheaper)
        
        const clampedWeight = Math.max(0.1, Math.min(30, weight));
        
        // Inverted logarithmic mapping
        // Small weights (close) = thick lines
        // Large weights (distant) = thin lines
        const logWeight = Math.log(clampedWeight + 0.1) + 2.3;
        const normalized = Math.max(0, Math.min(1, (logWeight - 1.5) / 3.5));
        
        // Invert the mapping: 1 - normalized
        const invertedNormalized = 1 - normalized;
        
        // Map to line width range: 0.5 to 8
        // Weight 0.1 → max thickness (8px)
        // Weight 30 → min thickness (0.5px)
        const baseWidth = 0.5 + (invertedNormalized * 7.5);
        
        return Math.max(0.5, Math.min(8, baseWidth));
    }

    renderEdges() {
        this.edges.forEach(edge => {
            const from = this.nodes.find(n => n.id === edge.from);
            const to = this.nodes.find(n => n.id === edge.to);
            
            if (from && to) {
                // Skip rendering if layer filter is enabled and either node doesn't match
                if (this.layerFilterEnabled && this.activeLayers.size > 0) {
                    const fromLayers = from.layers || [];
                    const toLayers = to.layers || [];
                    const fromHasLayer = fromLayers.some(layer => this.activeLayers.has(layer));
                    const toHasLayer = toLayers.some(layer => this.activeLayers.has(layer));
                    
                    // Only render edge if both nodes are visible in active layers
                    if (!fromHasLayer || !toHasLayer) return;
                }
                
                this.ctx.beginPath();
                this.ctx.moveTo(from.x, from.y);
                this.ctx.lineTo(to.x, to.y);
                
                const lineWidth = this.getEdgeLineWidth(edge.weight);
                
                if (edge === this.selectedEdge) {
                    this.ctx.strokeStyle = '#007bff';
                    this.ctx.lineWidth = (lineWidth + 1) / this.scale;
                } else {
                    this.ctx.strokeStyle = '#94a3b8';
                    this.ctx.lineWidth = lineWidth / this.scale;
                }
                
                this.ctx.stroke();
                
                const midX = (from.x + to.x) / 2;
                const midY = (from.y + to.y) / 2;
                
                this.ctx.fillStyle = '#000000';
                this.ctx.font = `${12 / this.scale}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(edge.weight.toString(), midX, midY - 10 / this.scale);
            }
        });
    }

    handleMouseDown(e) {
        const pos = this.getMousePos(e);
        const node = this.getNodeAt(pos.x, pos.y);
        
        if (e.button === 0) { // Left click
            if (this.mode === 'node') {
                if (!node) {
                    this.addNode(pos.x, pos.y);
                    if (this.onGraphUpdate) this.onGraphUpdate();
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
                            if (this.onGraphUpdate) this.onGraphUpdate();
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
            this.dragNode.x = pos.x - this.dragOffset.x;
            this.dragNode.y = pos.y - this.dragOffset.y;
            this.render();
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

    exportData() {
        // If currently filtered, merge new changes with original data
        if (this.originalNodes && this.originalEdges) {
            // Create maps for efficient lookup
            const originalNodeMap = new Map(this.originalNodes.map(n => [n.id, n]));
            const currentNodeMap = new Map(this.nodes.map(n => [n.id, n]));
            
            // Start with original nodes, then add/update with current nodes
            const mergedNodes = [...this.originalNodes];
            
            // Add new nodes (that don't exist in original)
            this.nodes.forEach(currentNode => {
                if (!originalNodeMap.has(currentNode.id)) {
                    mergedNodes.push(currentNode);
                }
            });
            
            // Update existing nodes with any changes
            mergedNodes.forEach((node, index) => {
                if (currentNodeMap.has(node.id)) {
                    const currentNode = currentNodeMap.get(node.id);
                    mergedNodes[index] = { ...currentNode };
                }
            });
            
            // Same process for edges
            const originalEdgeMap = new Map(this.originalEdges.map(e => [e.id, e]));
            const currentEdgeMap = new Map(this.edges.map(e => [e.id, e]));
            
            const mergedEdges = [...this.originalEdges];
            
            // Add new edges
            this.edges.forEach(currentEdge => {
                if (!originalEdgeMap.has(currentEdge.id)) {
                    mergedEdges.push(currentEdge);
                }
            });
            
            // Update existing edges
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
        
        // Not filtered, export current data
        return {
            nodes: this.nodes,
            edges: this.edges,
            scale: this.scale,
            offset: this.offset
        };
    }

    importData(data) {
        this.nodes = data.nodes || [];
        this.edges = data.edges || [];
        this.scale = data.scale || 1;
        this.offset = data.offset || { x: 0, y: 0 };
        this.render();
    }

    clear() {
        this.nodes = [];
        this.edges = [];
        this.selectedNode = null;
        this.selectedEdge = null;
        this.scale = 1;
        this.offset = { x: 0, y: 0 };
        this.onSelectionChange();
        this.render();
    }

    // Distance-based filtering methods
    calculateDistances(centerNodeId, maxDistance = 10, maxDepth = 5) {
        const distances = new Map();
        const depths = new Map();
        const queue = [{ nodeId: centerNodeId, distance: 0, depth: 0 }];
        
        distances.set(centerNodeId, 0);
        depths.set(centerNodeId, 0);
        
        while (queue.length > 0) {
            const { nodeId, distance, depth } = queue.shift();
            
            // Find all edges connected to this node
            const connectedEdges = this.edges.filter(edge => 
                edge.from === nodeId || edge.to === nodeId
            );
            
            for (const edge of connectedEdges) {
                const neighborId = edge.from === nodeId ? edge.to : edge.from;
                const newDistance = distance + edge.weight;
                const newDepth = depth + 1;
                
                // Check if neighbor satisfies either constraint (OR logic)
                const satisfiesDistance = newDistance <= maxDistance;
                const satisfiesDepth = newDepth <= maxDepth;
                
                if ((satisfiesDistance || satisfiesDepth) && 
                    (!distances.has(neighborId) || newDistance < distances.get(neighborId))) {
                    
                    distances.set(neighborId, newDistance);
                    depths.set(neighborId, newDepth);
                    queue.push({ nodeId: neighborId, distance: newDistance, depth: newDepth });
                }
            }
        }
        
        return { distances, depths };
    }

    filterLocalGraph(centerNodeId, maxDistance = 10, maxDepth = 5) {
        const centerNode = this.nodes.find(n => n.id === centerNodeId);
        if (!centerNode) {
            return { nodes: [], edges: [], centerNode: null };
        }
        
        const { distances, depths } = this.calculateDistances(centerNodeId, maxDistance, maxDepth);
        
        // Get all nodes that are reachable
        const filteredNodes = this.nodes.filter(node => distances.has(node.id));
        
        // Get edges between filtered nodes
        const filteredEdges = this.edges.filter(edge => {
            const fromIncluded = distances.has(edge.from);
            const toIncluded = distances.has(edge.to);
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

    applyLocalGraphFilter(centerNodeId, maxDistance = 10, maxDepth = 5) {
        const filteredData = this.filterLocalGraph(centerNodeId, maxDistance, maxDepth);
        
        if (filteredData.nodes.length === 0) {
            return false;
        }
        
        // Store original data before filtering
        this.originalNodes = [...this.nodes];
        this.originalEdges = [...this.edges];
        
        // Apply filter
        this.nodes = filteredData.nodes;
        this.edges = filteredData.edges;
        
        // Center the view on the center node
        if (filteredData.centerNode) {
            const canvasRect = this.canvas.getBoundingClientRect();
            this.offset.x = canvasRect.width / 2 - filteredData.centerNode.x * this.scale;
            this.offset.y = canvasRect.height / 2 - filteredData.centerNode.y * this.scale;
        }
        
        this.render();
        return true;
    }

    resetFilter() {
        if (this.originalNodes && this.originalEdges) {
            this.nodes = this.originalNodes;
            this.edges = this.originalEdges;
            this.originalNodes = null;
            this.originalEdges = null;
            this.render();
            return true;
        }
        return false;
    }

    // Distance analysis table functionality
    analyzeDistancesTable(centerNodeId, maxDistance = 10, maxDepth = 5) {
        const centerNode = this.nodes.find(n => n.id === centerNodeId);
        if (!centerNode) {
            return { nodes: [], centerNode: null };
        }

        const { distances, depths } = this.calculateDistances(centerNodeId, maxDistance, maxDepth);
        
        // Create analysis data for all reachable nodes
        const analysisData = [];
        distances.forEach((distance, nodeId) => {
            const node = this.nodes.find(n => n.id === nodeId);
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

        // Sort by distance then by depth
        analysisData.sort((a, b) => {
            if (a.distance !== b.distance) {
                return a.distance - b.distance;
            }
            return a.depth - b.depth;
        });

        return {
            nodes: analysisData,
            centerNode: centerNode,
            totalCount: analysisData.length
        };
    }

    getAllNodes() {
        return this.nodes.map(node => ({
            id: node.id,
            label: node.label,
            chineseLabel: node.chineseLabel || '',
            layers: node.layers || []
        }));
    }

    // Layer filtering methods
    getAllLayers() {
        const layers = new Set();
        this.nodes.forEach(node => {
            if (node.layers && Array.isArray(node.layers)) {
                node.layers.forEach(layer => layers.add(layer.trim()));
            }
        });
        return Array.from(layers).sort();
    }

    setActiveLayers(layers) {
        this.activeLayers = new Set(layers);
        this.layerFilterEnabled = this.activeLayers.size > 0;
        this.render();
    }

    addActiveLayer(layer) {
        this.activeLayers.add(layer.trim());
        this.layerFilterEnabled = true;
        this.render();
    }

    removeActiveLayer(layer) {
        this.activeLayers.delete(layer.trim());
        this.layerFilterEnabled = this.activeLayers.size > 0;
        this.render();
    }

    clearLayerFilter() {
        this.activeLayers.clear();
        this.layerFilterEnabled = false;
        this.render();
    }

    toggleLayer(layer) {
        const trimmedLayer = layer.trim();
        if (this.activeLayers.has(trimmedLayer)) {
            this.removeActiveLayer(trimmedLayer);
        } else {
            this.addActiveLayer(trimmedLayer);
        }
    }

    isLayerActive(layer) {
        return this.activeLayers.has(layer.trim());
    }

    // Centrality calculation methods
    calculateCentralities() {
        if (this.nodes.length === 0) return;

        // Initialize centrality storage
        this.nodes.forEach(node => {
            node.centrality = node.centrality || {};
        });

        this.calculateDegreeCentrality();
        this.calculateBetweennessCentrality();
        this.calculateClosenessCentrality();
        this.calculateEigenvectorCentrality();
        this.calculatePageRank();
        
        // Calculate rankings after all centralities are computed
        this.calculateCentralityRankings();
    }

    calculateCentralityRankings() {
        if (this.nodes.length === 0) return;

        // Store all centrality values for ranking
        this.centralityRankings = {};
        const centralityTypes = ['degree', 'betweenness', 'closeness', 'eigenvector', 'pagerank'];

        centralityTypes.forEach(type => {
            // Create array of [nodeId, value] pairs
            const values = this.nodes.map(node => ({
                nodeId: node.id,
                value: parseFloat(node.centrality[type]) || 0
            }));

            // Sort by value (descending)
            values.sort((a, b) => b.value - a.value);

            // Create ranking map
            const rankings = new Map();
            values.forEach((item, index) => {
                rankings.set(item.nodeId, index + 1); // 1-based ranking
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

    calculateDegreeCentrality() {
        const nodeCount = this.nodes.length;
        if (nodeCount <= 1) return;

        this.nodes.forEach(node => {
            const degree = this.edges.filter(edge => 
                edge.from === node.id || edge.to === node.id
            ).length;
            node.centrality.degree = (degree / (nodeCount - 1)).toFixed(4);
        });
    }

    calculateBetweennessCentrality() {
        const nodeCount = this.nodes.length;
        if (nodeCount <= 2) {
            this.nodes.forEach(node => {
                node.centrality.betweenness = "0.0000";
            });
            return;
        }

        // Initialize betweenness for all nodes
        const betweenness = new Map();
        this.nodes.forEach(node => {
            betweenness.set(node.id, 0);
        });

        // For each source node, find weighted shortest paths
        for (let s = 0; s < this.nodes.length; s++) {
            const source = this.nodes[s];
            
            // Dijkstra's algorithm for weighted shortest paths
            const distances = new Map();
            const sigma = new Map(); // Number of shortest paths
            const paths = new Map(); // Predecessors
            const delta = new Map(); // Dependency
            
            this.nodes.forEach(node => {
                distances.set(node.id, Infinity);
                sigma.set(node.id, 0);
                paths.set(node.id, []);
                delta.set(node.id, 0);
            });
            
            distances.set(source.id, 0);
            sigma.set(source.id, 1);
            
            const queue = [{ nodeId: source.id, distance: 0 }];
            const processed = [];

            while (queue.length > 0) {
                queue.sort((a, b) => a.distance - b.distance);
                const current = queue.shift();
                
                if (distances.get(current.nodeId) < current.distance) continue;
                
                processed.push(current.nodeId);

                // Find connected edges
                const connectedEdges = this.edges.filter(edge => 
                    edge.from === current.nodeId || edge.to === current.nodeId
                );

                connectedEdges.forEach(edge => {
                    const neighborId = edge.from === current.nodeId ? edge.to : edge.from;
                    const neighbor = this.nodes.find(n => n.id === neighborId);
                    if (!neighbor) return;

                    const newDist = current.distance + edge.weight;
                    
                    if (newDist < distances.get(neighborId)) {
                        distances.set(neighborId, newDist);
                        sigma.set(neighborId, 0);
                        paths.set(neighborId, []);
                        queue.push({ nodeId: neighborId, distance: newDist });
                    }
                    
                    if (Math.abs(newDist - distances.get(neighborId)) < 1e-10) {
                        sigma.set(neighborId, sigma.get(neighborId) + sigma.get(current.nodeId));
                        paths.get(neighborId).push(current.nodeId);
                    }
                });
            }

            // Accumulation (reverse order of processing)
            while (processed.length > 0) {
                const w = processed.pop();
                paths.get(w).forEach(v => {
                    const contribution = (sigma.get(v) / sigma.get(w)) * (1 + delta.get(w));
                    delta.set(v, delta.get(v) + contribution);
                });
                
                if (w !== source.id) {
                    betweenness.set(w, betweenness.get(w) + delta.get(w));
                }
            }
        }

        // Normalize for weighted graphs
        const norm = (nodeCount >= 3) ? 1 : 0;
        this.nodes.forEach(node => {
            node.centrality.betweenness = betweenness.get(node.id).toFixed(4);
        });
    }

    calculateClosenessCentrality() {
        const nodeCount = this.nodes.length;
        if (nodeCount <= 1) return;

        this.nodes.forEach(node => {
            const distances = this.calculateShortestPaths(node.id);
            const reachable = Array.from(distances.values()).filter(d => d !== Infinity && d > 0);
            
            if (reachable.length === 0) {
                node.centrality.closeness = "0.0000";
            } else {
                // Weighted closeness: higher is better (lower total distance)
                const sumDistance = reachable.reduce((sum, d) => sum + d, 0);
                const avgDistance = sumDistance / reachable.length;
                
                // Normalize based on your weight range (0.1-30)
                const maxPossibleDistance = 30 * (nodeCount - 1);
                const minPossibleDistance = 0.1 * (nodeCount - 1);
                
                let closeness = 0;
                if (sumDistance > 0) {
                    // Invert so lower distances = higher centrality
                    closeness = minPossibleDistance / Math.max(sumDistance, minPossibleDistance);
                    if (closeness > 1) closeness = 1;
                }
                
                node.centrality.closeness = closeness.toFixed(4);
            }
        });
    }

    calculateEigenvectorCentrality() {
        const nodeCount = this.nodes.length;
        if (nodeCount <= 1) return;

        // Create weighted adjacency matrix
        const adjacency = new Map();
        this.nodes.forEach(node => {
            adjacency.set(node.id, new Map());
        });

        // Build weighted adjacency matrix using inverse edge weights
        this.edges.forEach(edge => {
            const fromNode = this.nodes.find(n => n.id === edge.from);
            const toNode = this.nodes.find(n => n.id === edge.to);
            if (fromNode && toNode) {
                // Use inverse weight: lower weight = stronger connection = higher weight in matrix
                const weight = 1 / edge.weight;
                adjacency.get(edge.from).set(edge.to, weight);
                adjacency.get(edge.to).set(edge.from, weight);
            }
        });

        // Power iteration for weighted eigenvector centrality
        let eigenvector = new Map();
        this.nodes.forEach(node => {
            eigenvector.set(node.id, 1.0);
        });

        for (let iter = 0; iter < 100; iter++) {
            const newEigenvector = new Map();
            let norm = 0;

            this.nodes.forEach(node => {
                let sum = 0;
                this.nodes.forEach(neighbor => {
                    const weight = adjacency.get(neighbor.id).get(node.id) || 0;
                    sum += weight * eigenvector.get(neighbor.id);
                });
                newEigenvector.set(node.id, sum);
                norm += sum * sum;
            });

            if (norm < 1e-10) break;
            norm = Math.sqrt(norm);
            
            this.nodes.forEach(node => {
                eigenvector.set(node.id, newEigenvector.get(node.id) / norm);
            });
        }

        // Normalize to [0,1]
        const maxVal = Math.max(...Array.from(eigenvector.values()));
        this.nodes.forEach(node => {
            node.centrality.eigenvector = maxVal > 0 ? 
                (eigenvector.get(node.id) / maxVal).toFixed(4) : "0.0000";
        });
    }

    calculatePageRank() {
        const nodeCount = this.nodes.length;
        if (nodeCount <= 1) return;

        const damping = 0.85;
        const epsilon = 1e-6;
        
        // Initialize PageRank
        let pr = new Map();
        this.nodes.forEach(node => {
            pr.set(node.id, 1.0 / nodeCount);
        });

        // Build weighted adjacency lists using inverse edge weights
        const outLinks = new Map();
        const inLinks = new Map();
        const outWeights = new Map(); // Total outbound weight for each node
        
        this.nodes.forEach(node => {
            outLinks.set(node.id, []);
            inLinks.set(node.id, []);
            outWeights.set(node.id, 0);
        });

        // Build weighted connections
        this.edges.forEach(edge => {
            // Use inverse weight: lower weight = stronger connection = higher transition probability
            const weight = 1 / edge.weight;
            
            outLinks.get(edge.from).push({ to: edge.to, weight: weight });
            inLinks.get(edge.to).push({ from: edge.from, weight: weight });
            outWeights.set(edge.from, outWeights.get(edge.from) + weight);
        });

        // Power iteration with weighted transitions
        for (let iter = 0; iter < 100; iter++) {
            const newPr = new Map();
            let sumPr = 0;

            this.nodes.forEach(node => {
                let sum = 0;
                
                // Sum weighted contributions from incoming edges
                inLinks.get(node.id).forEach(link => {
                    const fromId = link.from;
                    const edgeWeight = link.weight;
                    const totalOutWeight = outWeights.get(fromId);
                    
                    if (totalOutWeight > 0) {
                        sum += pr.get(fromId) * (edgeWeight / totalOutWeight);
                    }
                });
                
                newPr.set(node.id, (1 - damping) / nodeCount + damping * sum);
                sumPr += newPr.get(node.id);
            });

            // Normalize
            this.nodes.forEach(node => {
                newPr.set(node.id, newPr.get(node.id) / sumPr);
            });

            // Check convergence
            let maxDiff = 0;
            this.nodes.forEach(node => {
                maxDiff = Math.max(maxDiff, Math.abs(newPr.get(node.id) - pr.get(node.id)));
            });

            pr = newPr;
            if (maxDiff < epsilon) break;
        }

        // Normalize to [0,1]
        const maxVal = Math.max(...Array.from(pr.values()));
        this.nodes.forEach(node => {
            node.centrality.pagerank = maxVal > 0 ? 
                (pr.get(node.id) / maxVal).toFixed(4) : "0.0000";
        });
    }

    calculateShortestPaths(startNodeId) {
        const distances = new Map();
        this.nodes.forEach(node => {
            distances.set(node.id, Infinity);
        });
        distances.set(startNodeId, 0);

        const visited = new Set();
        const queue = [{ nodeId: startNodeId, distance: 0 }];

        while (queue.length > 0) {
            // Find node with minimum distance (Dijkstra's algorithm)
            queue.sort((a, b) => a.distance - b.distance);
            const current = queue.shift();
            
            if (visited.has(current.nodeId)) continue;
            visited.add(current.nodeId);

            // Find connected edges with their weights
            const connectedEdges = this.edges.filter(edge => 
                edge.from === current.nodeId || edge.to === current.nodeId
            );

            connectedEdges.forEach(edge => {
                const neighborId = edge.from === current.nodeId ? edge.to : edge.from;
                if (!visited.has(neighborId)) {
                    const newDist = current.distance + edge.weight;
                    if (newDist < distances.get(neighborId)) {
                        distances.set(neighborId, newDist);
                        queue.push({ nodeId: neighborId, distance: newDist });
                    }
                }
            });
        }

        return distances;
    }
}