/**
 * Algorithm utility functions for graph analysis
 */

/**
 * Generate a unique identifier
 * @returns {string} UUID string
 */
export function generateUUID() {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
        return window.crypto.randomUUID();
    } else if (typeof require !== 'undefined') {
        try {
            const { v7 } = require('uuid');
            return v7();
        } catch (e) {
            return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
        }
    } else {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }
}

/**
 * Dijkstra's algorithm for shortest path calculation
 * @param {Array} nodes - Array of node objects
 * @param {Array} edges - Array of edge objects
 * @param {string} startNodeId - Starting node ID
 * @returns {Map} Map of distances from start node to all other nodes
 */
export function dijkstra(nodes, edges, startNodeId) {
    const distances = new Map();
    const visited = new Set();
    const queue = [];
    
    // Initialize distances
    nodes.forEach(node => {
        distances.set(node.id, node.id === startNodeId ? 0 : Infinity);
    });
    
    queue.push({ nodeId: startNodeId, distance: 0 });
    
    while (queue.length > 0) {
        queue.sort((a, b) => a.distance - b.distance);
        const current = queue.shift();
        
        if (visited.has(current.nodeId)) continue;
        visited.add(current.nodeId);
        
        // Find connected edges
        const connectedEdges = edges.filter(edge => 
            edge.from === current.nodeId || edge.to === current.nodeId
        );
        
        connectedEdges.forEach(edge => {
            const neighborId = edge.from === current.nodeId ? edge.to : edge.from;
            if (visited.has(neighborId)) return;
            
            const newDistance = current.distance + edge.weight;
            if (newDistance < distances.get(neighborId)) {
                distances.set(neighborId, newDistance);
                queue.push({ nodeId: neighborId, distance: newDistance });
            }
        });
    }
    
    return distances;
}

/**
 * Breadth-First Search (BFS) for unweighted graphs
 * @param {Array} nodes - Array of node objects
 * @param {Array} edges - Array of edge objects
 * @param {string} startNodeId - Starting node ID
 * @returns {Map} Map of distances from start node to all other nodes
 */
export function bfs(nodes, edges, startNodeId) {
    const distances = new Map();
    const queue = [startNodeId];
    
    nodes.forEach(node => {
        distances.set(node.id, node.id === startNodeId ? 0 : Infinity);
    });
    
    while (queue.length > 0) {
        const currentId = queue.shift();
        const currentDistance = distances.get(currentId);
        
        const connectedEdges = edges.filter(edge => 
            edge.from === currentId || edge.to === currentId
        );
        
        connectedEdges.forEach(edge => {
            const neighborId = edge.from === currentId ? edge.to : edge.from;
            if (distances.get(neighborId) === Infinity) {
                distances.set(neighborId, currentDistance + 1);
                queue.push(neighborId);
            }
        });
    }
    
    return distances;
}

/**
 * Get connected components of a graph
 * @param {Array} nodes - Array of node objects
 * @param {Array} edges - Array of edge objects
 * @returns {Array} Array of arrays, each containing nodes in a connected component
 */
export function getConnectedComponents(nodes, edges) {
    const visited = new Set();
    const components = [];
    
    const getNeighbors = (nodeId) => {
        const neighbors = [];
        edges.forEach(edge => {
            if (edge.from === nodeId) neighbors.push(edge.to);
            if (edge.to === nodeId) neighbors.push(edge.from);
        });
        return neighbors;
    };
    
    const dfs = (nodeId, component) => {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);
        component.push(nodes.find(n => n.id === nodeId));
        
        getNeighbors(nodeId).forEach(neighborId => {
            dfs(neighborId, component);
        });
    };
    
    nodes.forEach(node => {
        if (!visited.has(node.id)) {
            const component = [];
            dfs(node.id, component);
            components.push(component);
        }
    });
    
    return components;
}

/**
 * Check if graph is connected
 * @param {Array} nodes - Array of node objects
 * @param {Array} edges - Array of edge objects
 * @returns {boolean} True if graph is connected
 */
export function isConnected(nodes, edges) {
    if (nodes.length === 0) return true;
    const distances = bfs(nodes, edges, nodes[0].id);
    return Array.from(distances.values()).every(d => d !== Infinity);
}

/**
 * Calculate graph density
 * @param {Array} nodes - Array of node objects
 * @param {Array} edges - Array of edge objects
 * @returns {number} Graph density (0-1)
 */
export function calculateGraphDensity(nodes, edges) {
    const n = nodes.length;
    if (n < 2) return 0;
    
    const maxEdges = n * (n - 1) / 2;
    return edges.length / maxEdges;
}

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation between two values
 * @param {number} start - Start value
 * @param {number} end - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} Interpolated value
 */
export function lerp(start, end, t) {
    return start + (end - start) * t;
}

/**
 * Map a value from one range to another
 * @param {number} value - Value to map
 * @param {number} fromMin - Source range min
 * @param {number} fromMax - Source range max
 * @param {number} toMin - Target range min
 * @param {number} toMax - Target range max
 * @returns {number} Mapped value
 */
export function mapRange(value, fromMin, fromMax, toMin, toMax) {
    return toMin + (value - fromMin) * (toMax - toMin) / (fromMax - fromMin);
}