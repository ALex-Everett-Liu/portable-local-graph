class GraphEngine {
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
        this.mode = options.mode || 'select';
        this.edgeStart = null;
        
        // Performance optimizations
        this.animationId = null;
        this.isDirty = true;
        this.viewport = { x: 0, y: 0, width: 0, height: 0 };
        this.spatialIndex = new Map();
        
        // Performance monitoring
        this.fps = 60;
        this.lastFrameTime = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        
        this.setupCanvas();
        this.setupEventListeners();
        this.updateViewport();
    }

    setupCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.updateViewport();
        this.markDirty();
    }

    updateViewport() {
        this.viewport = {
            x: -this.offset.x / this.scale,
            y: -this.offset.y / this.scale,
            width: this.canvas.width / this.scale,
            height: this.canvas.height / this.scale
        };
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

    // Performance optimized hit detection
    getNodeAt(x, y) {
        // Quick spatial index check first
        const gridKey = this.getGridKey(x, y);
        const nearbyNodes = this.spatialIndex.get(gridKey) || [];
        
        for (const node of nearbyNodes) {
            const dx = x - node.x;
            const dy = y - node.y;
            if (Math.sqrt(dx * dx + dy * dy) <= node.radius) {
                return node;
            }
        }
        
        // Fallback to full scan if spatial index doesn't have it
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

    getGridKey(x, y) {
        const gridSize = 100;
        const gx = Math.floor(x / gridSize);
        const gy = Math.floor(y / gridSize);
        return `${gx},${gy}`;
    }

    updateSpatialIndex() {
        this.spatialIndex.clear();
        for (const node of this.nodes) {
            const gridKey = this.getGridKey(node.x, node.y);
            if (!this.spatialIndex.has(gridKey)) {
                this.spatialIndex.set(gridKey, []);
            }
            this.spatialIndex.get(gridKey).push(node);
            
            // Also add to neighboring cells for edge cases
            const neighbors = this.getNeighborKeys(node.x, node.y);
            for (const neighbor of neighbors) {
                if (!this.spatialIndex.has(neighbor)) {
                    this.spatialIndex.set(neighbor, []);
                }
                this.spatialIndex.get(neighbor).push(node);
            }
        }
    }

    getNeighborKeys(x, y) {
        const keys = [];
        const gridSize = 100;
        const gx = Math.floor(x / gridSize);
        const gy = Math.floor(y / gridSize);
        
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                keys.push(`${gx + dx},${gy + dy}`);
            }
        }
        return keys;
    }

    addNode(x, y, label = null, color = '#3b82f6', category = null, radius = 20) {
        const node = {
            id: Date.now() + Math.random(),
            x: x,
            y: y,
            label: label || `Node ${this.nodes.length + 1}`,
            color: color,
            radius: Math.max(5, Math.min(50, radius || 20)),
            category: category
        };
        this.nodes.push(node);
        this.updateSpatialIndex();
        this.markDirty();
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
            this.markDirty();
            return existingEdge;
        }

        const edge = {
            id: Date.now() + Math.random(),
            from: fromNode,
            to: toNode,
            weight: weight,
            category: category
        };
        this.edges.push(edge);
        this.markDirty();
        return edge;
    }

    deleteNode(nodeId) {
        this.nodes = this.nodes.filter(n => n.id !== nodeId);
        this.edges = this.edges.filter(e => e.from !== nodeId && e.to !== nodeId);
        this.updateSpatialIndex();
        
        if (this.selectedNode && this.selectedNode.id === nodeId) {
            this.selectedNode = null;
        }
        this.markDirty();
    }

    deleteEdge(edgeId) {
        this.edges = this.edges.filter(e => e.id !== edgeId);
        
        if (this.selectedEdge && this.selectedEdge.id === edgeId) {
            this.selectedEdge = null;
        }
        this.markDirty();
    }

    moveNode(node, dx, dy) {
        node.x += dx;
        node.y += dy;
        this.updateSpatialIndex();
        this.markDirty();
    }

    // Performance optimized rendering
    markDirty() {
        this.isDirty = true;
    }

    renderLoop(currentTime) {
        if (this.isDirty) {
            this.render();
            this.isDirty = false;
        }
        
        // Update FPS counter
        this.frameCount++;
        if (currentTime - this.lastFpsUpdate >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFpsUpdate));
            this.frameCount = 0;
            this.lastFpsUpdate = currentTime;
            
            if (this.onPerformanceUpdate) {
                this.onPerformanceUpdate({ fps: this.fps });
            }
        }
        
        this.animationId = requestAnimationFrame((time) => this.renderLoop(time));
    }

    startRenderLoop() {
        if (!this.animationId) {
            this.renderLoop(0);
        }
    }

    stopRenderLoop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
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
        
        // Update performance info
        if (this.onPerformanceUpdate) {
            this.onPerformanceUpdate({
                fps: this.fps,
                nodes: this.nodes.length,
                edges: this.edges.length
            });
        }
    }

    renderGrid() {
        const gridSize = 20;
        const width = this.canvas.width / this.scale;
        const height = this.canvas.height / this.scale;
        
        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.lineWidth = 1 / this.scale;
        
        // Only render visible grid lines
        const startX = Math.floor(this.viewport.x / gridSize) * gridSize;
        const endX = Math.ceil((this.viewport.x + this.viewport.width) / gridSize) * gridSize;
        const startY = Math.floor(this.viewport.y / gridSize) * gridSize;
        const endY = Math.ceil((this.viewport.y + this.viewport.height) / gridSize) * gridSize;
        
        for (let x = startX; x <= endX; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, startY);
            this.ctx.lineTo(x, endY);
            this.ctx.stroke();
        }
        
        for (let y = startY; y <= endY; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(startX, y);
            this.ctx.lineTo(endX, y);
            this.ctx.stroke();
        }
    }

    renderNodes() {
        // Only render visible nodes
        const visibleNodes = this.nodes.filter(node => 
            node.x + node.radius >= this.viewport.x &&
            node.x - node.radius <= this.viewport.x + this.viewport.width &&
            node.y + node.radius >= this.viewport.y &&
            node.y - node.radius <= this.viewport.y + this.viewport.height
        );

        visibleNodes.forEach(node => {
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
            
            if (node === this.selectedNode) {
                this.ctx.fillStyle = '#007bff';
                this.ctx.strokeStyle = '#0056b3';
                this.ctx.lineWidth = 3 / this.scale;
            } else {
                this.ctx.fillStyle = node.color;
                this.ctx.strokeStyle = '#2563eb';
                this.ctx.lineWidth = 2 / this.scale;
            }
            
            this.ctx.fill();
            this.ctx.stroke();
            
            // Text rendering with visibility check
            const textSize = Math.max(8, 14 / this.scale);
            if (textSize > 6) { // Only render text if it's readable
                this.ctx.font = `${textSize}px Arial`;
                const textWidth = this.ctx.measureText(node.label).width;
                
                // Background for text if needed
                if (textWidth > node.radius * 1.5) {
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                    this.ctx.fillRect(
                        node.x - textWidth / 2 - 4 / this.scale,
                        node.y - textSize / 2 - 2 / this.scale,
                        textWidth + 8 / this.scale,
                        textSize + 4 / this.scale
                    );
                }
                
                this.ctx.fillStyle = '#ffffff';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(node.label, node.x, node.y);
            }
        });
    }

    renderEdges() {
        // Only render visible edges
        const visibleNodes = new Set(this.nodes.filter(node => 
            node.x + node.radius >= this.viewport.x &&
            node.x - node.radius <= this.viewport.x + this.viewport.width &&
            node.y + node.radius >= this.viewport.y &&
            node.y - node.radius <= this.viewport.y + this.viewport.height
        ).map(n => n.id));

        const visibleEdges = this.edges.filter(edge => 
            visibleNodes.has(edge.from) && visibleNodes.has(edge.to)
        );

        visibleEdges.forEach(edge => {
            const from = this.nodes.find(n => n.id === edge.from);
            const to = this.nodes.find(n => n.id === edge.to);
            
            if (from && to) {
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
                
                // Weight label
                const midX = (from.x + to.x) / 2;
                const midY = (from.y + to.y) / 2;
                
                const fontSize = Math.max(8, 12 / this.scale);
                if (fontSize > 6) {
                    this.ctx.fillStyle = '#000000';
                    this.ctx.font = `${fontSize}px Arial`;
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.fillText(edge.weight.toString(), midX, midY - 10 / this.scale);
                }
            }
        });
    }

    getEdgeLineWidth(weight) {
        // Same as original but with performance considerations
        const clampedWeight = Math.max(0.1, Math.min(30, weight));
        const logWeight = Math.log(clampedWeight + 0.1) + 2.3;
        const normalized = Math.max(0, Math.min(1, (logWeight - 1.5) / 3.5));
        const invertedNormalized = 1 - normalized;
        const baseWidth = 0.5 + (invertedNormalized * 7.5);
        
        return Math.max(0.5, Math.min(8, baseWidth));
    }

    // Event handlers
    handleMouseDown(e) {
        if (e.button !== 0) return;
        
        const pos = this.getMousePos(e);
        const node = this.getNodeAt(pos.x, pos.y);
        
        switch (this.mode) {
            case 'node':
                if (!node) {
                    const newNode = this.addNode(pos.x, pos.y);
                    if (this.onGraphUpdate) this.onGraphUpdate();
                    this.selectNode(newNode);
                }
                break;
                
            case 'select':
                if (node) {
                    this.dragNode = node;
                    this.isDragging = true;
                    this.dragOffset = {
                        x: pos.x - node.x,
                        y: pos.y - node.y
                    };
                    this.selectNode(node);
                } else {
                    const edge = this.getEdgeAt(pos.x, pos.y);
                    if (edge) {
                        this.selectEdge(edge);
                    } else {
                        this.isPanning = true;
                        this.lastPanPoint = { x: e.clientX, y: e.clientY };
                        this.deselectAll();
                    }
                }
                break;
                
            case 'edge':
                if (node) {
                    if (this.edgeStart === null) {
                        this.edgeStart = node;
                        this.selectNode(node);
                    } else {
                        if (this.edgeStart !== node) {
                            const newEdge = this.addEdge(this.edgeStart.id, node.id);
                            if (this.onGraphUpdate) this.onGraphUpdate();
                            this.selectEdge(newEdge);
                        }
                        this.edgeStart = null;
                    }
                }
                break;
        }
        
        this.markDirty();
    }

    handleMouseMove(e) {
        const pos = this.getMousePos(e);
        
        if (this.isDragging && this.dragNode) {
            this.dragNode.x = pos.x - this.dragOffset.x;
            this.dragNode.y = pos.y - this.dragOffset.y;
            this.markDirty();
        } else if (this.isPanning) {
            const dx = e.clientX - this.lastPanPoint.x;
            const dy = e.clientY - this.lastPanPoint.y;
            this.offset.x += dx;
            this.offset.y += dy;
            this.lastPanPoint = { x: e.clientX, y: e.clientY };
            this.updateViewport();
            this.markDirty();
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
        
        // Zoom to mouse position
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const worldX = (mouseX - this.offset.x) / this.scale;
        const worldY = (mouseY - this.offset.y) / this.scale;
        
        this.scale *= delta;
        this.scale = Math.max(0.1, Math.min(5, this.scale));
        
        this.offset.x = mouseX - worldX * this.scale;
        this.offset.y = mouseY - worldY * this.scale;
        
        this.updateViewport();
        this.markDirty();
    }

    handleContextMenu(e) {
        e.preventDefault();
        // Handled by app controller
    }

    // Selection management
    selectNode(node) {
        this.selectedNode = node;
        this.selectedEdge = null;
        this.edgeStart = null;
        if (this.onSelectionChange) this.onSelectionChange();
    }

    selectEdge(edge) {
        this.selectedEdge = edge;
        this.selectedNode = null;
        this.edgeStart = null;
        if (this.onSelectionChange) this.onSelectionChange();
    }

    deselectAll() {
        this.selectedNode = null;
        this.selectedEdge = null;
        this.edgeStart = null;
        if (this.onSelectionChange) this.onSelectionChange();
    }

    // Data import/export
    exportData() {
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
        this.deselectAll();
        this.updateSpatialIndex();
        this.updateViewport();
        this.markDirty();
    }

    clear() {
        this.nodes = [];
        this.edges = [];
        this.selectedNode = null;
        this.selectedEdge = null;
        this.edgeStart = null;
        this.scale = 1;
        this.offset = { x: 0, y: 0 };
        this.spatialIndex.clear();
        this.updateViewport();
        this.markDirty();
    }

    // Utility methods
    fitToView() {
        if (this.nodes.length === 0) return;

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        this.nodes.forEach(node => {
            minX = Math.min(minX, node.x - node.radius);
            minY = Math.min(minY, node.y - node.radius);
            maxX = Math.max(maxX, node.x + node.radius);
            maxY = Math.max(maxY, node.y + node.radius);
        });

        const padding = 50;
        const graphWidth = maxX - minX + padding * 2;
        const graphHeight = maxY - minY + padding * 2;

        const scaleX = this.canvas.width / graphWidth;
        const scaleY = this.canvas.height / graphHeight;
        this.scale = Math.min(scaleX, scaleY, 2);

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        this.offset.x = this.canvas.width / 2 - centerX * this.scale;
        this.offset.y = this.canvas.height / 2 - centerY * this.scale;

        this.updateViewport();
        this.markDirty();
    }

    // Get performance info
    getPerformanceInfo() {
        return {
            fps: this.fps,
            nodes: this.nodes.length,
            edges: this.edges.length,
            scale: this.scale
        };
    }
}