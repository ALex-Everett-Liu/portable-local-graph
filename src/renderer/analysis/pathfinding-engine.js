/**
 * PathfindingEngine - Advanced pathfinding and graph traversal algorithms
 */
import { dijkstra, bfs } from '../utils/algorithms.js';

export class PathfindingEngine {
    constructor(nodes, edges) {
        this.nodes = nodes;
        this.edges = edges;
        this.nodeMap = this.buildNodeMap();
        this.edgeMap = this.buildEdgeMap();
    }

    /**
     * Build node map for quick lookup
     * @returns {Map} Node map by ID
     */
    buildNodeMap() {
        const map = new Map();
        this.nodes.forEach(node => {
            map.set(node.id, node);
        });
        return map;
    }

    /**
     * Build edge map for quick lookup
     * @returns {Map} Edge map by node ID
     */
    buildEdgeMap() {
        const map = new Map();
        this.nodes.forEach(node => {
            map.set(node.id, []);
        });

        this.edges.forEach(edge => {
            map.get(edge.from).push({ to: edge.to, weight: edge.weight, id: edge.id });
            map.get(edge.to).push({ to: edge.from, weight: edge.weight, id: edge.id });
        });

        return map;
    }

    /**
     * Find shortest path between two nodes using Dijkstra's algorithm
     * @param {string} startNodeId - Starting node ID
     * @param {string} endNodeId - Ending node ID
     * @returns {Object} Path result with distance and path
     */
    findShortestPath(startNodeId, endNodeId) {
        if (startNodeId === endNodeId) {
            return { distance: 0, path: [startNodeId], edges: [] };
        }

        const distances = new Map();
        const previous = new Map();
        const visited = new Set();
        const queue = [];

        // Initialize
        this.nodes.forEach(node => {
            distances.set(node.id, node.id === startNodeId ? 0 : Infinity);
            previous.set(node.id, null);
        });

        queue.push({ nodeId: startNodeId, distance: 0 });

        while (queue.length > 0) {
            queue.sort((a, b) => a.distance - b.distance);
            const current = queue.shift();

            if (visited.has(current.nodeId)) continue;
            visited.add(current.nodeId);

            if (current.nodeId === endNodeId) {
                break;
            }

            const connections = this.edgeMap.get(current.nodeId);
            connections.forEach(conn => {
                if (visited.has(conn.to)) return;

                const newDistance = current.distance + conn.weight;
                if (newDistance < distances.get(conn.to)) {
                    distances.set(conn.to, newDistance);
                    previous.set(conn.to, { node: current.nodeId, edge: conn.id });
                    queue.push({ nodeId: conn.to, distance: newDistance });
                }
            });
        }

        // Reconstruct path
        if (distances.get(endNodeId) === Infinity) {
            return { distance: Infinity, path: [], edges: [] };
        }

        const path = [];
        const edges = [];
        let current = endNodeId;

        while (current !== startNodeId) {
            path.unshift(current);
            const prev = previous.get(current);
            if (prev) {
                edges.unshift(prev.edge);
                current = prev.node;
            } else {
                break;
            }
        }

        path.unshift(startNodeId);

        return {
            distance: distances.get(endNodeId),
            path: path,
            edges: edges
        };
    }

    /**
     * Find all paths between two nodes (for analysis)
     * @param {string} startNodeId - Starting node ID
     * @param {string} endNodeId - Ending node ID
     * @param {number} maxDepth - Maximum path depth
     * @returns {Array} Array of paths
     */
    findAllPaths(startNodeId, endNodeId, maxDepth = 10) {
        const paths = [];
        const visited = new Set();

        const dfs = (current, target, path, depth) => {
            if (depth > maxDepth) return;
            if (current === target) {
                paths.push([...path]);
                return;
            }

            visited.add(current);
            const connections = this.edgeMap.get(current);

            connections.forEach(conn => {
                if (!visited.has(conn.to)) {
                    path.push(conn.to);
                    dfs(conn.to, target, path, depth + 1);
                    path.pop();
                }
            });

            visited.delete(current);
        };

        dfs(startNodeId, endNodeId, [startNodeId], 0);
        return paths;
    }

    /**
     * Find k-shortest paths between two nodes
     * @param {string} startNodeId - Starting node ID
     * @param {string} endNodeId - Ending node ID
     * @param {number} k - Number of shortest paths to find
     * @returns {Array} Array of k shortest paths
     */
    findKShortestPaths(startNodeId, endNodeId, k = 3) {
        const paths = [];
        const removedEdges = new Set();

        for (let i = 0; i < k; i++) {
            const path = this.findShortestPath(startNodeId, endNodeId);
            if (path.distance === Infinity) break;

            paths.push(path);

            // Remove edges from the found path to find next shortest
            path.edges.forEach(edgeId => {
                removedEdges.add(edgeId);
            });
        }

        return paths;
    }

    /**
     * Find all nodes within a certain distance from a start node
     * @param {string} startNodeId - Starting node ID
     * @param {number} maxDistance - Maximum distance
     * @returns {Object} Nodes within distance with their distances
     */
    findNodesWithinDistance(startNodeId, maxDistance) {
        const distances = dijkstra(this.nodes, this.edges, startNodeId);
        const result = {};

        distances.forEach((distance, nodeId) => {
            if (distance <= maxDistance) {
                result[nodeId] = distance;
            }
        });

        return result;
    }

    /**
     * Find connected component containing a specific node
     * @param {string} nodeId - Node ID
     * @returns {Object} Connected component info
     */
    findConnectedComponent(nodeId) {
        if (!this.nodeMap.has(nodeId)) {
            return { nodes: [], edges: [], size: 0 };
        }

        const visited = new Set();
        const component = [];
        const componentEdges = [];

        const dfs = (current) => {
            if (visited.has(current)) return;
            visited.add(current);
            component.push(current);

            const connections = this.edgeMap.get(current);
            connections.forEach(conn => {
                if (!visited.has(conn.to)) {
                    componentEdges.push(conn.id);
                    dfs(conn.to);
                }
            });
        };

        dfs(nodeId);

        return {
            nodes: component,
            edges: componentEdges,
            size: component.length
        };
    }

    /**
     * Calculate eccentricity for all nodes
     * @returns {Object} Eccentricity results
     */
    calculateEccentricity() {
        const result = {};
        
        this.nodes.forEach(node => {
            const distances = dijkstra(this.nodes, this.edges, node.id);
            const maxDistance = Math.max(...Array.from(distances.values()).filter(d => d !== Infinity));
            result[node.id] = maxDistance === -Infinity ? Infinity : maxDistance;
        });

        return result;
    }

    /**
     * Find graph diameter and radius
     * @returns {Object} Graph diameter and radius
     */
    calculateGraphDiameter() {
        const eccentricity = this.calculateEccentricity();
        const values = Object.values(eccentricity).filter(d => d !== Infinity);
        
        if (values.length === 0) {
            return { diameter: Infinity, radius: Infinity };
        }

        return {
            diameter: Math.max(...values),
            radius: Math.min(...values)
        };
    }

    /**
     * Find center and periphery of the graph
     * @returns {Object} Center and periphery nodes
     */
    findCenterAndPeriphery() {
        const eccentricity = this.calculateEccentricity();
        const diameter = Math.max(...Object.values(eccentricity).filter(d => d !== Infinity));
        const radius = Math.min(...Object.values(eccentricity).filter(d => d !== Infinity));

        const center = [];
        const periphery = [];

        Object.entries(eccentricity).forEach(([nodeId, ecc]) => {
            if (ecc === radius) center.push(nodeId);
            if (ecc === diameter) periphery.push(nodeId);
        });

        return { center, periphery, diameter, radius };
    }

    /**
     * Find bridges (critical edges) in the graph
     * @returns {Array} Array of bridge edges
     */
    findBridges() {
        const bridges = [];
        const visited = new Set();
        const disc = new Map();
        const low = new Map();
        const parent = new Map();
        let time = 0;

        const dfs = (u, parentId = null) => {
            visited.add(u);
            disc.set(u, time);
            low.set(u, time);
            time++;

            const connections = this.edgeMap.get(u);
            connections.forEach(conn => {
                const v = conn.to;
                if (!visited.has(v)) {
                    parent.set(v, u);
                    dfs(v, u);

                    low.set(u, Math.min(low.get(u), low.get(v)));

                    if (low.get(v) > disc.get(u)) {
                        bridges.push(conn.id);
                    }
                } else if (v !== parentId) {
                    low.set(u, Math.min(low.get(u), disc.get(v)));
                }
            });
        };

        this.nodes.forEach(node => {
            if (!visited.has(node.id)) {
                dfs(node.id);
            }
        });

        return bridges;
    }

    /**
     * Find articulation points (critical nodes) in the graph
     * @returns {Array} Array of articulation points
     */
    findArticulationPoints() {
        const articulation = new Set();
        const visited = new Set();
        const disc = new Map();
        const low = new Map();
        const parent = new Map();
        let time = 0;

        const dfs = (u, parentId = null) => {
            let children = 0;
            visited.add(u);
            disc.set(u, time);
            low.set(u, time);
            time++;

            const connections = this.edgeMap.get(u);
            connections.forEach(conn => {
                const v = conn.to;
                if (!visited.has(v)) {
                    children++;
                    parent.set(v, u);
                    dfs(v, u);

                    low.set(u, Math.min(low.get(u), low.get(v)));

                    if (parentId === null && children > 1) {
                        articulation.add(u);
                    }
                    if (parentId !== null && low.get(v) >= disc.get(u)) {
                        articulation.add(u);
                    }
                } else if (v !== parentId) {
                    low.set(u, Math.min(low.get(u), disc.get(v)));
                }
            });
        };

        this.nodes.forEach(node => {
            if (!visited.has(node.id)) {
                dfs(node.id);
            }
        });

        return Array.from(articulation);
    }

    /**
     * Update graph data
     * @param {Array} nodes - New nodes array
     * @param {Array} edges - New edges array
     */
    updateGraph(nodes, edges) {
        this.nodes = nodes;
        this.edges = edges;
        this.nodeMap = this.buildNodeMap();
        this.edgeMap = this.buildEdgeMap();
    }

    /**
     * Get graph summary statistics
     * @returns {Object} Graph summary
     */
    getGraphSummary() {
        const connectedComponents = this.findConnectedComponents();
        const bridges = this.findBridges();
        const articulationPoints = this.findArticulationPoints();
        const { diameter, radius } = this.calculateGraphDiameter();

        return {
            nodeCount: this.nodes.length,
            edgeCount: this.edges.length,
            connectedComponents: connectedComponents.length,
            largestComponent: Math.max(...connectedComponents.map(c => c.size)),
            bridges: bridges.length,
            articulationPoints: articulationPoints.length,
            diameter,
            radius,
            density: this.calculateDensity()
        };
    }

    /**
     * Find connected components
     * @returns {Array} Array of connected components
     */
    findConnectedComponents() {
        const visited = new Set();
        const components = [];

        const dfs = (nodeId, component) => {
            if (visited.has(nodeId)) return;
            visited.add(nodeId);
            component.add(nodeId);

            const connections = this.edgeMap.get(nodeId);
            connections.forEach(conn => {
                dfs(conn.to, component);
            });
        };

        this.nodes.forEach(node => {
            if (!visited.has(node.id)) {
                const component = new Set();
                dfs(node.id, component);
                components.push({
                    nodes: Array.from(component),
                    size: component.size
                });
            }
        });

        return components;
    }

    /**
     * Calculate graph density
     * @returns {number} Graph density
     */
    calculateDensity() {
        const n = this.nodes.length;
        if (n < 2) return 0;
        
        const maxEdges = n * (n - 1) / 2;
        return this.edges.length / maxEdges;
    }
}