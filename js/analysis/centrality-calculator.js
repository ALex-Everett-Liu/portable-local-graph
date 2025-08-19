/**
 * CentralityCalculator - Computes various graph centrality measures
 */
import { GRAPH_CONSTANTS } from '../utils/constants.js';
import { dijkstra } from '../utils/algorithms.js';

export class CentralityCalculator {
    constructor(nodes, edges) {
        this.nodes = nodes;
        this.edges = edges;
        this.nodeCount = nodes.length;
        
        // Build adjacency structures for efficient computation
        this.adjacency = this.buildAdjacencyMatrix();
        this.edgeMap = this.buildEdgeMap();
    }

    /**
     * Build adjacency matrix for efficient computation
     * @returns {Map} Adjacency matrix
     */
    buildAdjacencyMatrix() {
        const adjacency = new Map();
        this.nodes.forEach(node => {
            adjacency.set(node.id, new Map());
        });

        this.edges.forEach(edge => {
            // Use inverse weight: lower weight = stronger connection = higher weight in matrix
            const weight = 1 / edge.weight;
            adjacency.get(edge.from).set(edge.to, weight);
            adjacency.get(edge.to).set(edge.from, weight);
        });

        return adjacency;
    }

    /**
     * Build edge map for quick lookup
     * @returns {Map} Edge map
     */
    buildEdgeMap() {
        const edgeMap = new Map();
        this.nodes.forEach(node => {
            edgeMap.set(node.id, []);
        });

        this.edges.forEach(edge => {
            edgeMap.get(edge.from).push({ to: edge.to, weight: edge.weight });
            edgeMap.get(edge.to).push({ to: edge.from, weight: edge.weight });
        });

        return edgeMap;
    }

    /**
     * Calculate degree centrality for all nodes
     * @returns {Object} Degree centrality results
     */
    calculateDegreeCentrality() {
        if (this.nodeCount <= 1) {
            const result = {};
            this.nodes.forEach(node => {
                result[node.id] = "0.0000";
            });
            return result;
        }

        const result = {};
        this.nodes.forEach(node => {
            const degree = this.edgeMap.get(node.id).length;
            result[node.id] = (degree / (this.nodeCount - 1)).toFixed(4);
        });

        return result;
    }

    /**
     * Calculate betweenness centrality for all nodes
     * @returns {Object} Betweenness centrality results
     */
    calculateBetweennessCentrality() {
        if (this.nodeCount <= 2) {
            const result = {};
            this.nodes.forEach(node => {
                result[node.id] = "0.0000";
            });
            return result;
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
                const connections = this.edgeMap.get(current.nodeId);
                connections.forEach(conn => {
                    const newDist = current.distance + conn.weight;
                    
                    if (newDist < distances.get(conn.to)) {
                        distances.set(conn.to, newDist);
                        sigma.set(conn.to, 0);
                        paths.set(conn.to, []);
                        queue.push({ nodeId: conn.to, distance: newDist });
                    }
                    
                    if (Math.abs(newDist - distances.get(conn.to)) < 1e-10) {
                        sigma.set(conn.to, sigma.get(conn.to) + sigma.get(current.nodeId));
                        paths.get(conn.to).push(current.nodeId);
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
        const result = {};
        this.nodes.forEach(node => {
            result[node.id] = betweenness.get(node.id).toFixed(4);
        });

        return result;
    }

    /**
     * Calculate closeness centrality for all nodes
     * @returns {Object} Closeness centrality results
     */
    calculateClosenessCentrality() {
        if (this.nodeCount <= 1) {
            const result = {};
            this.nodes.forEach(node => {
                result[node.id] = "0.0000";
            });
            return result;
        }

        const result = {};
        this.nodes.forEach(node => {
            const distances = dijkstra(this.nodes, this.edges, node.id);
            const reachable = Array.from(distances.values()).filter(d => d !== Infinity && d > 0);
            
            if (reachable.length === 0) {
                result[node.id] = "0.0000";
            } else {
                // Weighted closeness: higher is better (lower total distance)
                const sumDistance = reachable.reduce((sum, d) => sum + d, 0);
                
                // Normalize based on weight range (0.1-30)
                const maxPossibleDistance = 30 * (this.nodeCount - 1);
                const minPossibleDistance = 0.1 * (this.nodeCount - 1);
                
                let closeness = 0;
                if (sumDistance > 0) {
                    // Invert so lower distances = higher centrality
                    closeness = minPossibleDistance / Math.max(sumDistance, minPossibleDistance);
                    if (closeness > 1) closeness = 1;
                }
                
                result[node.id] = closeness.toFixed(4);
            }
        });

        return result;
    }

    /**
     * Calculate eigenvector centrality for all nodes
     * @returns {Object} Eigenvector centrality results
     */
    calculateEigenvectorCentrality() {
        if (this.nodeCount <= 1) {
            const result = {};
            this.nodes.forEach(node => {
                result[node.id] = "0.0000";
            });
            return result;
        }

        // Power iteration for weighted eigenvector centrality
        let eigenvector = new Map();
        this.nodes.forEach(node => {
            eigenvector.set(node.id, 1.0);
        });

        for (let iter = 0; iter < GRAPH_CONSTANTS.MAX_ITERATIONS; iter++) {
            const newEigenvector = new Map();
            let norm = 0;

            this.nodes.forEach(node => {
                let sum = 0;
                this.nodes.forEach(neighbor => {
                    const weight = this.adjacency.get(neighbor.id).get(node.id) || 0;
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
        const result = {};
        this.nodes.forEach(node => {
            result[node.id] = maxVal > 0 ? 
                (eigenvector.get(node.id) / maxVal).toFixed(4) : "0.0000";
        });

        return result;
    }

    /**
     * Calculate PageRank for all nodes
     * @returns {Object} PageRank results
     */
    calculatePageRank() {
        if (this.nodeCount <= 1) {
            const result = {};
            this.nodes.forEach(node => {
                result[node.id] = (1.0 / this.nodeCount).toFixed(4);
            });
            return result;
        }

        const damping = GRAPH_CONSTANTS.DAMPING_FACTOR;
        const epsilon = GRAPH_CONSTANTS.CONVERGENCE_THRESHOLD;
        
        // Initialize PageRank
        let pr = new Map();
        this.nodes.forEach(node => {
            pr.set(node.id, 1.0 / this.nodeCount);
        });

        // Build weighted adjacency lists
        const outLinks = new Map();
        const inLinks = new Map();
        const outWeights = new Map();
        
        this.nodes.forEach(node => {
            outLinks.set(node.id, []);
            inLinks.set(node.id, []);
            outWeights.set(node.id, 0);
        });

        this.edges.forEach(edge => {
            // Use inverse weight: lower weight = stronger connection = higher transition probability
            const weight = 1 / edge.weight;
            
            outLinks.get(edge.from).push({ to: edge.to, weight: weight });
            inLinks.get(edge.to).push({ from: edge.from, weight: weight });
            outWeights.set(edge.from, outWeights.get(edge.from) + weight);
        });

        // Power iteration with weighted transitions
        for (let iter = 0; iter < GRAPH_CONSTANTS.MAX_ITERATIONS; iter++) {
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
                
                newPr.set(node.id, (1 - damping) / this.nodeCount + damping * sum);
                sumPr += newPr.get(node.id);
            });

            // Check for convergence
            let maxDiff = 0;
            this.nodes.forEach(node => {
                maxDiff = Math.max(maxDiff, Math.abs(newPr.get(node.id) - pr.get(node.id)));
            });

            pr = newPr;
            if (maxDiff < epsilon) break;
        }

        // Normalize
        const maxVal = Math.max(...Array.from(pr.values()));
        const result = {};
        this.nodes.forEach(node => {
            result[node.id] = (pr.get(node.id) / maxVal).toFixed(4);
        });

        return result;
    }

    /**
     * Calculate all centrality measures at once
     * @returns {Object} All centrality results
     */
    calculateAllCentralities() {
        return {
            degree: this.calculateDegreeCentrality(),
            betweenness: this.calculateBetweennessCentrality(),
            closeness: this.calculateClosenessCentrality(),
            eigenvector: this.calculateEigenvectorCentrality(),
            pagerank: this.calculatePageRank()
        };
    }

    /**
     * Update graph data
     * @param {Array} nodes - New nodes array
     * @param {Array} edges - New edges array
     */
    updateGraph(nodes, edges) {
        this.nodes = nodes;
        this.edges = edges;
        this.nodeCount = nodes.length;
        this.adjacency = this.buildAdjacencyMatrix();
        this.edgeMap = this.buildEdgeMap();
    }
}