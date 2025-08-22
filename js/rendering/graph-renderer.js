/**
 * GraphRenderer - Handles all canvas rendering operations
 */
import { GRAPH_CONSTANTS } from '../utils/constants.js';
import { 
    calculateGridBounds, 
    getVisibleBounds, 
    screenToWorld 
} from '../utils/geometry.js';
import {
    getEdgeLineWidth,
    getScaledRadius,
    getScaledLineWidth,
    getScaledTextSize,
    createHighlightGradient,
    getPulsingRadius,
    truncateText,
    getTextDimensions,
    needsTextBackground,
    getNodeColor,
    getNodeBorderColor,
    getFontString
} from './styles.js';

export class GraphRenderer {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.options = {
            showGrid: options.showGrid !== false,
            showLabels: options.showLabels !== false,
            showNodeBorders: options.showNodeBorders !== false,
            ...options
        };
    }

    /**
     * Main render method - orchestrates all rendering
     * @param {Array} nodes - Array of node objects
     * @param {Array} edges - Array of edge objects
     * @param {Object} viewState - Current view state {scale, offset}
     * @param {Object} selectionState - Current selection state {selectedNode, selectedEdge, highlightedNodes}
     * @param {Object} filterState - Current filter state {layerFilterEnabled, activeLayers, layerFilterMode}
     */
    render(nodes, edges, viewState, selectionState = {}, filterState = {}) {
        // Ensure appState is available
        if (!window.appState) {
            console.warn('appState not available, creating fallback');
            window.appState = { showEdgeArrows: false };
        }
        
        // Ensure showEdgeArrows is initialized
        if (typeof window.appState.showEdgeArrows === 'undefined') {
            window.appState.showEdgeArrows = false;
        }
        
        console.log("=== GRAPH RENDER START ===");
        console.log("Nodes:", nodes.length, "Edges:", edges.length);
        console.log("Show edge arrows:", window.appState.showEdgeArrows);
        
        if (!viewState) {
            viewState = { scale: 1, offset: { x: 0, y: 0 } };
        }
        const { scale, offset } = viewState;
        const { selectedNode, selectedEdge, highlightedNodes = [] } = selectionState;
        
        console.log("View state - scale:", scale, "offset:", offset);
        
        this.clearCanvas();
        
        this.ctx.save();
        this.ctx.translate(offset.x, offset.y);
        this.ctx.scale(scale, scale);
        
        if (this.options.showGrid) {
            this.renderGrid(viewState);
        }
        
        this.renderEdges(edges, nodes, viewState, selectedEdge);
        this.renderNodes(nodes, viewState, selectionState, filterState);
        
        this.ctx.restore();
        console.log("=== GRAPH RENDER END ===");
    }

    /**
     * Clear the entire canvas
     */
    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Render the grid background
     * @param {Object} viewState - Current view state {scale, offset}
     */
    renderGrid(viewState) {
        const { scale, offset } = viewState;
        const bounds = getVisibleBounds(offset.x, offset.y, scale, this.canvas.width, this.canvas.height);
        const gridBounds = calculateGridBounds(bounds.left, bounds.top, bounds.right, bounds.bottom, GRAPH_CONSTANTS.GRID_SIZE);
        
        this.ctx.strokeStyle = GRAPH_CONSTANTS.GRID_COLOR;
        this.ctx.lineWidth = getScaledLineWidth(GRAPH_CONSTANTS.GRID_LINE_WIDTH, scale);
        
        // Draw vertical lines
        for (let x = gridBounds.startX; x <= gridBounds.endX; x += GRAPH_CONSTANTS.GRID_SIZE) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, gridBounds.startY);
            this.ctx.lineTo(x, gridBounds.endY);
            this.ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = gridBounds.startY; y <= gridBounds.endY; y += GRAPH_CONSTANTS.GRID_SIZE) {
            this.ctx.beginPath();
            this.ctx.moveTo(gridBounds.startX, y);
            this.ctx.lineTo(gridBounds.endX, y);
            this.ctx.stroke();
        }
    }

    /**
     * Render all edges
     * @param {Array} edges - Array of edge objects
     * @param {Array} nodes - Array of node objects for node lookup
     * @param {Object} viewState - Current view state {scale, offset}
     * @param {Object} selectedEdge - Currently selected edge
     */
    renderEdges(edges, nodes, viewState, selectedEdge) {
        const { scale } = viewState;
        console.log("renderEdges called with", edges.length, "edges, scale:", scale);
        
        edges.forEach(edge => {
            const from = nodes.find(n => n.id === edge.from);
            const to = nodes.find(n => n.id === edge.to);
            
            if (!from || !to) {
                console.log("Skipping edge", edge.id, "- missing from/to nodes");
                return;
            }
            
            console.log("Processing edge", edge.id, "from node", edge.from, "to node", edge.to);
            const isSelected = selectedEdge && selectedEdge.id === edge.id;
            this.renderEdge(from, to, edge, scale, isSelected);
        });
    }

    /**
     * Render a single edge
     * @param {Object} from - From node
     * @param {Object} to - To node
     * @param {Object} edge - Edge object
     * @param {number} scale - Current zoom scale
     * @param {boolean} isSelected - Whether edge is selected
     */
    renderEdge(from, to, edge, scale, isSelected) {
        console.log("renderEdge called for edge:", edge.id, "showEdgeArrows:", window.appState ? window.appState.showEdgeArrows : 'undefined');
        
        this.ctx.strokeStyle = isSelected ? '#F4A460' : '#EFF0E9';
        this.ctx.lineWidth = getScaledLineWidth(
            isSelected ? 3 : getEdgeLineWidth(edge.weight), 
            scale
        );
        
        this.ctx.beginPath();
        this.ctx.moveTo(from.x, from.y);
        this.ctx.lineTo(to.x, to.y);
        this.ctx.stroke();
        
        // Draw arrow if enabled in app state
        const showArrows = window.appState && window.appState.showEdgeArrows === true;
        if (showArrows) {
            console.log("Rendering arrow for edge", edge.id, "from", from.id, "to", to.id);
            console.log("Arrow rendering conditions met - showEdgeArrows is true");
            this.renderEdgeArrow(from, to, scale);
        } else {
            console.log("Skipping arrow - showEdgeArrows is", window.appState ? window.appState.showEdgeArrows : 'undefined');
        }
        
        // Always draw weight label
        this.renderEdgeLabel(from, to, edge, scale);
    }

    /**
     * Render direction arrow on edge
     * @param {Object} from - From node
     * @param {Object} to - To node
     * @param {number} scale - Current zoom scale
     */
    renderEdgeArrow(from, to, scale) {
        console.log("=== ARROW RENDERING DEBUG ===");
        console.log("renderEdgeArrow called with scale:", scale, "from:", from, "to:", to);
        console.log("From node position:", {x: from.x, y: from.y, radius: from.radius});
        console.log("To node position:", {x: to.x, y: to.y, radius: to.radius});
        
        // Calculate direction vector
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        console.log("Vector calculations - dx:", dx, "dy:", dy, "length:", length);
        
        if (length === 0) {
            console.log("Skipping arrow - zero length vector");
            return;
        }
        
        // Calculate arrow position (near the end of the line)
        const arrowDistance = 15 / scale; // Distance from target node
        const arrowX = to.x - (dx / length) * arrowDistance;
        const arrowY = to.y - (dy / length) * arrowDistance;
        
        console.log("Arrow position calculations:");
        console.log("- arrowDistance:", arrowDistance, "(15/scale)")
        console.log("- arrowX:", arrowX, "=", to.x, "- (", dx, "/", length, ") *", arrowDistance);
        console.log("- arrowY:", arrowY, "=", to.y, "- (", dy, "/", length, ") *", arrowDistance);
        
        // Calculate arrow size based on scale
        const arrowSize = 8 / scale;
        const arrowAngle = Math.PI / 6; // 30 degrees
        
        console.log("Arrow size parameters:");
        console.log("- arrowSize:", arrowSize, "(8/scale)")
        console.log("- arrowAngle:", arrowAngle, "radians (", (arrowAngle * 180 / Math.PI), "degrees)")
        
        // Calculate arrow points
        const angle = Math.atan2(dy, dx);
        console.log("Angle calculation - atan2(dy, dx):", angle, "radians (", (angle * 180 / Math.PI), "degrees)")
        
        const x1 = arrowX - arrowSize * Math.cos(angle - arrowAngle);
        const y1 = arrowY - arrowSize * Math.sin(angle - arrowAngle);
        const x2 = arrowX - arrowSize * Math.cos(angle + arrowAngle);
        const y2 = arrowY - arrowSize * Math.sin(angle + arrowAngle);
        
        console.log("Arrow triangle points:");
        console.log("- Tip (arrowX, arrowY):", arrowX, arrowY)
        console.log("- Point 1 (x1, y1):", x1, y1)
        console.log("- Point 2 (x2, y2):", x2, y2)
        
        // Draw arrow
        this.ctx.fillStyle = '#ff0000'; // Make it bright red for visibility
        console.log("Drawing arrow with fillStyle:", this.ctx.fillStyle)
        
        this.ctx.beginPath();
        this.ctx.moveTo(arrowX, arrowY);
        this.ctx.lineTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.closePath();
        
        // Log path coordinates for debugging
        console.log("Arrow path created with points:", [
            {x: arrowX, y: arrowY},
            {x: x1, y: y1},
            {x: x2, y: y2}
        ]);
        
        this.ctx.fill();
        console.log("Arrow filled successfully");
        console.log("=== ARROW RENDERING COMPLETE ===");
    }

    /**
     * Render edge weight label
     * @param {Object} from - From node
     * @param {Object} to - To node
     * @param {Object} edge - Edge object
     * @param {number} scale - Current zoom scale
     */
    renderEdgeLabel(from, to, edge, scale) {
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        
        this.ctx.fillStyle = '#000000';
        this.ctx.font = getFontString(12, scale);
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(edge.weight.toString(), midX, midY - 10 / scale);
    }

    /**
     * Render all nodes
     * @param {Array} nodes - Array of node objects
     * @param {Object} viewState - Current view state {scale, offset}
     * @param {Object} selectionState - Current selection state
     * @param {Object} filterState - Current filter state
     */
    renderNodes(nodes, viewState, selectionState, filterState) {
        const { scale } = viewState;
        const { selectedNode, highlightedNodes = [] } = selectionState;
        
        const filteredNodes = this.filterNodes(nodes, filterState);
        
        filteredNodes.forEach(node => {
            const isSelected = selectedNode && selectedNode.id === node.id;
            const isHighlighted = highlightedNodes.includes(node.id);
            this.renderNode(node, scale, isSelected, isHighlighted);
        });
    }

    /**
     * Filter nodes based on layer filter state
     * @param {Array} nodes - Array of node objects
     * @param {Object} filterState - Current filter state
     * @returns {Array} Filtered nodes
     */
    filterNodes(nodes, filterState) {
        const { layerFilterEnabled, activeLayers, layerFilterMode } = filterState;
        
        if (!layerFilterEnabled || activeLayers.size === 0) {
            return nodes;
        }
        
        return nodes.filter(node => {
            const nodeLayers = node.layers || [];
            const hasMatchingLayer = nodeLayers.some(layer => activeLayers.has(layer));
            
            return layerFilterMode === 'include' 
                ? hasMatchingLayer 
                : !hasMatchingLayer;
        });
    }

    /**
     * Render a single node
     * @param {Object} node - Node object
     * @param {number} scale - Current zoom scale
     * @param {boolean} isSelected - Whether node is selected
     * @param {boolean} isHighlighted - Whether node is highlighted
     */
    renderNode(node, scale, isSelected, isHighlighted) {
        const radius = getScaledRadius(node.radius, scale);
        
        if (isHighlighted) {
            this.renderHighlightedNode(node, radius, scale);
        } else {
            this.renderStandardNode(node, radius, scale, isSelected);
        }
        
        if (this.options.showLabels) {
            this.renderNodeLabel(node, radius, scale);
        }
    }

    /**
     * Render a highlighted node with animation effects
     * @param {Object} node - Node object
     * @param {number} radius - Scaled node radius
     * @param {number} scale - Current zoom scale
     */
    renderHighlightedNode(node, radius, scale) {
        const time = Date.now() * 0.005;
        const pulsingRadius = getPulsingRadius(radius, time);
        
        // Create multi-layer halo effect
        const haloRadius = pulsingRadius * 1.5;
        const gradient = createHighlightGradient(this.ctx, node.x, node.y, pulsingRadius, haloRadius);
        
        // Draw outer glow/halo
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, haloRadius, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Draw bright ring around the halo
        this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
        this.ctx.lineWidth = getScaledLineWidth(2, scale);
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, haloRadius * 0.8, 0, 2 * Math.PI);
        this.ctx.stroke();
        
        // Main node with bright border
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, pulsingRadius, 0, 2 * Math.PI);
        this.ctx.fillStyle = node.color;
        this.ctx.fill();
        
        // Bright gold border
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = getScaledLineWidth(4, scale);
        this.ctx.stroke();
        
        // Inner white highlight ring
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = getScaledLineWidth(1.5, scale);
        this.ctx.stroke();
    }

    /**
     * Render a standard node
     * @param {Object} node - Node object
     * @param {number} radius - Scaled node radius
     * @param {number} scale - Current zoom scale
     * @param {boolean} isSelected - Whether node is selected
     */
    renderStandardNode(node, radius, scale, isSelected) {
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
        this.ctx.fillStyle = isSelected ? '#87CEFA' : node.color;
        this.ctx.fill();
        
        if (this.options.showNodeBorders) {
            this.ctx.strokeStyle = isSelected ? '#B0C4DE' : '#C0C0C0';
            this.ctx.lineWidth = getScaledLineWidth(isSelected ? 3 : 2, scale);
            this.ctx.stroke();
        }
    }

    /**
     * Render node label
     * @param {Object} node - Node object
     * @param {number} radius - Scaled node radius
     * @param {number} scale - Current zoom scale
     */
    renderNodeLabel(node, radius, scale) {
        const displayLabel = truncateText(node.label);
        const fontSize = getScaledTextSize(GRAPH_CONSTANTS.DEFAULT_FONT_SIZE, scale);
        
        this.ctx.font = getFontString(GRAPH_CONSTANTS.DEFAULT_FONT_SIZE, scale);
        const textDimensions = getTextDimensions(this.ctx, displayLabel, fontSize);
        
        // Add background if text is larger than node
        if (needsTextBackground(textDimensions.width, radius)) {
            this.ctx.fillStyle = 'rgba(105, 105, 105, 0.7)';
            const padding = 4 / scale;
            this.ctx.fillRect(
                node.x - textDimensions.width / 2 - padding,
                node.y - textDimensions.height / 2 - padding / 2,
                textDimensions.width + padding * 2,
                textDimensions.height + padding
            );
        }
        
        // Draw text
        this.ctx.fillStyle = '#ffffff';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(displayLabel, node.x, node.y);
    }

    /**
     * Resize the canvas
     * @param {number} width - New width
     * @param {number} height - New height
     */
    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
    }

    /**
     * Get canvas dimensions
     * @returns {{width: number, height: number}} Canvas dimensions
     */
    getDimensions() {
        return {
            width: this.canvas.width,
            height: this.canvas.height
        };
    }

    /**
     * Update rendering options
     * @param {Object} newOptions - New options to merge
     */
    updateOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
    }

    /**
     * Get current rendering options
     * @returns {Object} Current options
     */
    getOptions() {
        return { ...this.options };
    }

    /**
     * Render a specific region (for partial updates)
     * @param {Array} nodes - Nodes to render
     * @param {Array} edges - Edges to render
     * @param {Object} viewState - View state
     * @param {Object} region - Region to render {x, y, width, height}
     */
    renderRegion(nodes, edges, viewState, region) {
        this.ctx.save();
        this.ctx.clearRect(region.x, region.y, region.width, region.height);
        
        // Clip to region
        this.ctx.beginPath();
        this.ctx.rect(region.x, region.y, region.width, region.height);
        this.ctx.clip();
        
        // Render normally within region
        this.render(nodes, edges, viewState);
        
        this.ctx.restore();
    }

    /**
     * Take a snapshot of the current canvas
     * @returns {ImageData} Canvas image data
     */
    snapshot() {
        return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Restore canvas from snapshot
     * @param {ImageData} imageData - Image data to restore
     */
    restore(imageData) {
        this.ctx.putImageData(imageData, 0, 0);
    }

    /**
     * Export canvas as data URL
     * @param {string} type - Image type (default 'image/png')
     * @param {number} quality - Image quality (0-1, for JPEG)
     * @returns {string} Data URL
     */
    toDataURL(type = 'image/png', quality = 1.0) {
        return this.canvas.toDataURL(type, quality);
    }

    /**
     * Export canvas as blob
     * @param {Function} callback - Callback function with blob
     * @param {string} type - Image type (default 'image/png')
     * @param {number} quality - Image quality (0-1, for JPEG)
     */
    toBlob(callback, type = 'image/png', quality = 1.0) {
        this.canvas.toBlob(callback, type, quality);
    }

    /**
     * Get canvas context for direct drawing
     * @returns {CanvasRenderingContext2D} Canvas context
     */
    getContext() {
        return this.ctx;
    }

    /**
     * Get canvas element
     * @returns {HTMLCanvasElement} Canvas element
     */
    getCanvas() {
        return this.canvas;
    }

    /**
     * Set canvas background color
     * @param {string} color - Background color
     */
    setBackgroundColor(color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Clear canvas with specific color
     * @param {string} color - Clear color
     */
    clearWithColor(color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Render debug information
     * @param {Object} debugInfo - Debug information to display
     */
    renderDebugInfo(debugInfo) {
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(10, 10, 200, 100);
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = '12px monospace';
        Object.entries(debugInfo).forEach(([key, value], index) => {
            this.ctx.fillText(`${key}: ${value}`, 15, 25 + index * 15);
        });
        
        this.ctx.restore();
    }
}