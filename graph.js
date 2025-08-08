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

    addNode(x, y, label = null, color = '#3b82f6', category = null, radius = 20, chineseLabel = null) {
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
            category: category
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
}