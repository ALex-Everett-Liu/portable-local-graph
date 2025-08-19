/**
 * GraphAnalysis - Main analysis coordinator
 * Provides a unified interface for all graph analysis operations
 */
import { CentralityCalculator } from './centrality-calculator.js';
import { PathfindingEngine } from './pathfinding-engine.js';

export class GraphAnalysis {
    constructor(nodes = [], edges = []) {
        this.nodes = nodes;
        this.edges = edges;
        this.centralityCalculator = new CentralityCalculator(nodes, edges);
        this.pathfindingEngine = new PathfindingEngine(nodes, edges);
        
        // Cache for computed results
        this.cache = new Map();
        this.cacheTimeout = 5000; // 5 seconds
    }

    /**
     * Update graph data
     * @param {Array} nodes - New nodes array
     * @param {Array} edges - New edges array
     */
    updateGraph(nodes, edges) {
        this.nodes = nodes;
        this.edges = edges;
        this.centralityCalculator.updateGraph(nodes, edges);
        this.pathfindingEngine.updateGraph(nodes, edges);
        this.cache.clear();
    }

    /**
     * Calculate all centrality measures
     * @param {boolean} useCache - Whether to use cached results
     * @returns {Object} All centrality results
     */
    calculateCentralities(useCache = true) {
        const cacheKey = 'centralities';
        
        if (useCache && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        const results = this.centralityCalculator.calculateAllCentralities();
        
        this.cache.set(cacheKey, {
            data: results,
            timestamp: Date.now()
        });

        return results;
    }

    /**
     * Calculate specific centrality measure
     * @param {string} type - Centrality type ('degree', 'betweenness', 'closeness', 'eigenvector', 'pagerank')
     * @returns {Object} Centrality results
     */
    calculateCentrality(type) {
        switch (type) {
            case 'degree':
                return this.centralityCalculator.calculateDegreeCentrality();
            case 'betweenness':
                return this.centralityCalculator.calculateBetweennessCentrality();
            case 'closeness':
                return this.centralityCalculator.calculateClosenessCentrality();
            case 'eigenvector':
                return this.centralityCalculator.calculateEigenvectorCentrality();
            case 'pagerank':
                return this.centralityCalculator.calculatePageRank();
            default:
                throw new Error(`Unknown centrality type: ${type}`);
        }
    }

    /**
     * Find shortest path between two nodes
     * @param {string} startNodeId - Starting node ID
     * @param {string} endNodeId - Ending node ID
     * @param {string} algorithm - Algorithm type ('dijkstra', 'astar')
     * @returns {Object} Path result
     */
    findShortestPath(startNodeId, endNodeId, algorithm = 'dijkstra') {
        return this.pathfindingEngine.findShortestPath(startNodeId, endNodeId);
    }

    /**
     * Find all paths between two nodes
     * @param {string} startNodeId - Starting node ID
     * @param {string} endNodeId - Ending node ID
     * @param {number} maxDepth - Maximum path depth
     * @returns {Array} Array of paths
     */
    findAllPaths(startNodeId, endNodeId, maxDepth = 10) {
        return this.pathfindingEngine.findAllPaths(startNodeId, endNodeId, maxDepth);
    }

    /**
     * Find k-shortest paths between two nodes
     * @param {string} startNodeId - Starting node ID
     * @param {string} endNodeId - Ending node ID
     * @param {number} k - Number of shortest paths
     * @returns {Array} Array of k shortest paths
     */
    findKShortestPaths(startNodeId, endNodeId, k = 3) {
        return this.pathfindingEngine.findKShortestPaths(startNodeId, endNodeId, k);
    }

    /**
     * Find nodes within a certain distance from a start node
     * @param {string} startNodeId - Starting node ID
     * @param {number} maxDistance - Maximum distance
     * @returns {Object} Nodes within distance
     */
    findNodesWithinDistance(startNodeId, maxDistance) {
        return this.pathfindingEngine.findNodesWithinDistance(startNodeId, maxDistance);
    }

    /**
     * Get graph summary statistics
     * @returns {Object} Graph summary
     */
    getGraphSummary() {
        return this.pathfindingEngine.getGraphSummary();
    }

    /**
     * Find connected components
     * @returns {Array} Connected components
     */
    findConnectedComponents() {
        return this.pathfindingEngine.findConnectedComponents();
    }

    /**
     * Find bridges (critical edges)
     * @returns {Array} Bridge edges
     */
    findBridges() {
        return this.pathfindingEngine.findBridges();
    }

    /**
     * Find articulation points (critical nodes)
     * @returns {Array} Articulation points
     */
    findArticulationPoints() {
        return this.pathfindingEngine.findArticulationPoints();
    }

    /**
     * Calculate graph diameter and radius
     * @returns {Object} Diameter and radius
     */
    calculateGraphDiameter() {
        return this.pathfindingEngine.calculateGraphDiameter();
    }

    /**
     * Find center and periphery of the graph
     * @returns {Object} Center and periphery nodes
     */
    findCenterAndPeriphery() {
        return this.pathfindingEngine.findCenterAndPeriphery();
    }

    /**
     * Find connected component containing a specific node
     * @param {string} nodeId - Node ID
     * @returns {Object} Connected component
     */
    findConnectedComponent(nodeId) {
        return this.pathfindingEngine.findConnectedComponent(nodeId);
    }

    /**
     * Calculate eccentricity for all nodes
     * @returns {Object} Eccentricity results
     */
    calculateEccentricity() {
        return this.pathfindingEngine.calculateEccentricity();
    }

    /**
     * Get centrality rankings
     * @param {string} centralityType - Type of centrality
     * @param {number} limit - Number of top nodes to return
     * @returns {Array} Ranked nodes
     */
    getCentralityRankings(centralityType, limit = null) {
        const centralities = this.calculateCentrality(centralityType);
        const sorted = Object.entries(centralities)
            .sort(([, a], [, b]) => parseFloat(b) - parseFloat(a))
            .map(([nodeId, value], index) => ({
                nodeId,
                value: parseFloat(value),
                rank: index + 1
            }));

        return limit ? sorted.slice(0, limit) : sorted;
    }

    /**
     * Get node analysis summary
     * @param {string} nodeId - Node ID
     * @returns {Object} Node analysis summary
     */
    getNodeAnalysis(nodeId) {
        if (!this.nodeMap.has(nodeId)) {
            return null;
        }

        const centralities = this.calculateCentralities();
        const component = this.findConnectedComponent(nodeId);
        const eccentricity = this.calculateEccentricity();

        return {
            nodeId,
            centralities: {
                degree: parseFloat(centralities.degree[nodeId]) || 0,
                betweenness: parseFloat(centralities.betweenness[nodeId]) || 0,
                closeness: parseFloat(centralities.closeness[nodeId]) || 0,
                eigenvector: parseFloat(centralities.eigenvector[nodeId]) || 0,
                pagerank: parseFloat(centralities.pagerank[nodeId]) || 0
            },
            eccentricity: parseFloat(eccentricity[nodeId]) || 0,
            connectedComponent: component,
            degree: this.pathfindingEngine.edgeMap.get(nodeId)?.length || 0
        };
    }

    /**
     * Perform comprehensive graph analysis
     * @returns {Object} Complete analysis results
     */
    performFullAnalysis() {
        const summary = this.getGraphSummary();
        const centralities = this.calculateCentralities();
        const connectedComponents = this.findConnectedComponents();
        const bridges = this.findBridges();
        const articulationPoints = this.findArticulationPoints();
        const { diameter, radius } = this.calculateGraphDiameter();
        const { center, periphery } = this.findCenterAndPeriphery();

        return {
            summary,
            centralities,
            connectedComponents,
            bridges,
            articulationPoints,
            diameter,
            radius,
            center,
            periphery,
            timestamp: Date.now()
        };
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Set cache timeout
     * @param {number} timeout - Cache timeout in milliseconds
     */
    setCacheTimeout(timeout) {
        this.cacheTimeout = timeout;
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
            timeout: this.cacheTimeout
        };
    }

    /**
     * Validate graph data
     * @returns {Object} Validation results
     */
    validateGraph() {
        const issues = [];
        
        // Check for isolated nodes
        const isolatedNodes = this.nodes.filter(node => {
            const connections = this.pathfindingEngine.edgeMap.get(node.id);
            return !connections || connections.length === 0;
        });

        if (isolatedNodes.length > 0) {
            issues.push({
                type: 'isolated_nodes',
                count: isolatedNodes.length,
                nodes: isolatedNodes.map(n => n.id)
            });
        }

        // Check for duplicate edges
        const edgePairs = new Set();
        const duplicateEdges = [];

        this.edges.forEach(edge => {
            const pair = edge.from < edge.to 
                ? `${edge.from}-${edge.to}` 
                : `${edge.to}-${edge.from}`;
            
            if (edgePairs.has(pair)) {
                duplicateEdges.push(edge.id);
            } else {
                edgePairs.add(pair);
            }
        });

        if (duplicateEdges.length > 0) {
            issues.push({
                type: 'duplicate_edges',
                count: duplicateEdges.length,
                edges: duplicateEdges
            });
        }

        return {
            valid: issues.length === 0,
            issues,
            nodeCount: this.nodes.length,
            edgeCount: this.edges.length
        };
    }
}