/**
 * CentralityCalculator - Computes various graph centrality measures
 * Now supports per-component centrality calculation for disconnected graphs
 */
import { GRAPH_CONSTANTS } from '../utils/constants.js';
import { dijkstra, getConnectedComponents } from '../utils/algorithms.js';

export class CentralityCalculator {
    constructor(nodes, edges) {
        this.nodes = nodes;
        this.edges = edges;
        this.nodeCount = nodes.length;
        
        // Build adjacency structures for efficient computation
        this.adjacency = this.buildAdjacencyMatrix();
        this.edgeMap = this.buildEdgeMap();
        
        // Cache for connected components
        this.components = null;
        this.nodeToComponent = new Map();
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
     * Find connected components and build node-to-component mapping
     */
    findConnectedComponents() {
        if (!this.components) {
            this.components = getConnectedComponents(this.nodes, this.edges);
            
            // Build node-to-component mapping
            this.nodeToComponent.clear();
            this.components.forEach((component, index) => {
                component.forEach(node => {
                    this.nodeToComponent.set(node.id, {
                        component,
                        index,
                        size: component.length
                    });
                });
            });
        }
        return this.components;
    }

    /**
     * Get edges for a specific component
     * @param {Array} component - Component nodes
     * @returns {Array} Component edges
     */
    getComponentEdges(component) {
        const componentNodeIds = new Set(component.map(node => node.id));
        return this.edges.filter(edge => 
            componentNodeIds.has(edge.from) && componentNodeIds.has(edge.to)
        );
    }

    /**
     * Calculate degree centrality for all nodes (per-component calculation)
     * @returns {Object} Degree centrality results
     */
    calculateDegreeCentrality() {
        this.findConnectedComponents();
        const result = {};

        this.components.forEach(component => {
            const componentSize = component.length;
            if (componentSize <= 1) {
                component.forEach(node => {
                    result[node.id] = "0.0000";
                });
                return;
            }

            component.forEach(node => {
                const degree = this.edgeMap.get(node.id).length;
                result[node.id] = (degree / (componentSize - 1)).toFixed(4);
            });
        });

        return result;
    }

    /**
     * Calculate betweenness centrality for all nodes (per-component calculation)
     * @returns {Object} Betweenness centrality results
     */
    calculateBetweennessCentrality() {
        this.findConnectedComponents();
        const result = {};

        this.components.forEach(component => {
            const componentSize = component.length;
            if (componentSize <= 2) {
                component.forEach(node => {
                    result[node.id] = "0.0000";
                });
                return;
            }

            const componentNodes = component;
            const componentEdges = this.getComponentEdges(component);

            // Initialize betweenness for component nodes
            const betweenness = new Map();
            componentNodes.forEach(node => {
                betweenness.set(node.id, 0);
            });

            // Only consider nodes within the same component
            for (let s = 0; s < componentNodes.length; s++) {
                const source = componentNodes[s];
                
                const distances = new Map();
                const sigma = new Map();
                const paths = new Map();
                const delta = new Map();
                
                componentNodes.forEach(node => {
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

                    const componentNodeIds = new Set(componentNodes.map(n => n.id));
                    const connections = this.edgeMap.get(current.nodeId)
                        .filter(conn => componentNodeIds.has(conn.to));
                    
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

            componentNodes.forEach(node => {
                result[node.id] = betweenness.get(node.id).toFixed(4);
            });
        });

        return result;
    }

    /**
     * Calculate closeness centrality for all nodes (per-component calculation)
     * @returns {Object} Closeness centrality results
     */
    calculateClosenessCentrality() {
        this.findConnectedComponents();
        const result = {};

        this.components.forEach(component => {
            const componentSize = component.length;
            if (componentSize <= 1) {
                component.forEach(node => {
                    result[node.id] = "0.0000";
                });
                return;
            }

            const componentNodes = component;
            const componentEdges = this.getComponentEdges(component);

            componentNodes.forEach(node => {
                const distances = dijkstra(componentNodes, componentEdges, node.id);
                const reachable = Array.from(distances.values()).filter(d => d !== Infinity && d > 0);
                
                if (reachable.length === 0) {
                    result[node.id] = "0.0000";
                } else {
                    // Weighted closeness: higher is better (lower total distance)
                    const sumDistance = reachable.reduce((sum, d) => sum + d, 0);
                    
                    // Normalize based on component size (0.1-30 weight range)
                    const maxPossibleDistance = 30 * (componentSize - 1);
                    const minPossibleDistance = 0.1 * (componentSize - 1);
                    
                    let closeness = 0;
                    if (sumDistance > 0) {
                        // Invert so lower distances = higher centrality
                        closeness = minPossibleDistance / Math.max(sumDistance, minPossibleDistance);
                        if (closeness > 1) closeness = 1;
                    }
                    
                    result[node.id] = closeness.toFixed(4);
                }
            });
        });

        return result;
    }

    /**
     * Calculate eigenvector centrality for all nodes (per-component calculation)
     * @returns {Object} Eigenvector centrality results
     */
    calculateEigenvectorCentrality() {
        this.findConnectedComponents();
        const result = {};

        this.components.forEach(component => {
            const componentSize = component.length;
            if (componentSize <= 1) {
                component.forEach(node => {
                    result[node.id] = "0.0000";
                });
                return;
            }

            // Build component-specific adjacency matrix
            const componentNodeIds = new Set(component.map(n => n.id));
            const componentAdjacency = new Map();
            component.forEach(node => {
                componentAdjacency.set(node.id, new Map());
            });

            this.edges.forEach(edge => {
                if (componentNodeIds.has(edge.from) && componentNodeIds.has(edge.to)) {
                    const weight = 1 / edge.weight;
                    componentAdjacency.get(edge.from).set(edge.to, weight);
                    componentAdjacency.get(edge.to).set(edge.from, weight);
                }
            });

            // Power iteration for component
            let eigenvector = new Map();
            component.forEach(node => {
                eigenvector.set(node.id, 1.0);
            });

            for (let iter = 0; iter < GRAPH_CONSTANTS.MAX_ITERATIONS; iter++) {
                const newEigenvector = new Map();
                let norm = 0;

                component.forEach(node => {
                    let sum = 0;
                    component.forEach(neighbor => {
                        const weight = componentAdjacency.get(neighbor.id).get(node.id) || 0;
                        sum += weight * eigenvector.get(neighbor.id);
                    });
                    newEigenvector.set(node.id, sum);
                    norm += sum * sum;
                });

                if (norm < 1e-10) break;
                norm = Math.sqrt(norm);
                
                component.forEach(node => {
                    eigenvector.set(node.id, newEigenvector.get(node.id) / norm);
                });
            }

            // Normalize to [0,1] within component
            const maxVal = Math.max(...Array.from(eigenvector.values()));
            component.forEach(node => {
                result[node.id] = maxVal > 0 ? 
                    (eigenvector.get(node.id) / maxVal).toFixed(4) : "0.0000";
            });
        });

        return result;
    }

    /**
     * Calculate PageRank for all nodes (per-component calculation)
     * @returns {Object} PageRank results
     */
    calculatePageRank() {
        this.findConnectedComponents();
        const result = {};

        this.components.forEach(component => {
            const componentSize = component.length;
            if (componentSize <= 1) {
                component.forEach(node => {
                    result[node.id] = (1.0 / componentSize).toFixed(4);
                });
                return;
            }

            const componentNodeIds = new Set(component.map(n => n.id));
            
            // Build component-specific adjacency lists
            const outLinks = new Map();
            const inLinks = new Map();
            const outWeights = new Map();
            
            component.forEach(node => {
                outLinks.set(node.id, []);
                inLinks.set(node.id, []);
                outWeights.set(node.id, 0);
            });

            this.edges.forEach(edge => {
                if (componentNodeIds.has(edge.from) && componentNodeIds.has(edge.to)) {
                    const weight = 1 / edge.weight;
                    outLinks.get(edge.from).push({ to: edge.to, weight: weight });
                    inLinks.get(edge.to).push({ from: edge.from, weight: weight });
                    outWeights.set(edge.from, outWeights.get(edge.from) + weight);
                }
            });

            // Initialize PageRank for component
            let pr = new Map();
            component.forEach(node => {
                pr.set(node.id, 1.0 / componentSize);
            });

            const damping = GRAPH_CONSTANTS.DAMPING_FACTOR;
            const epsilon = GRAPH_CONSTANTS.CONVERGENCE_THRESHOLD;

            // Power iteration for component
            for (let iter = 0; iter < GRAPH_CONSTANTS.MAX_ITERATIONS; iter++) {
                const newPr = new Map();
                let sumPr = 0;

                component.forEach(node => {
                    let sum = 0;
                    
                    inLinks.get(node.id).forEach(link => {
                        const fromId = link.from;
                        const edgeWeight = link.weight;
                        const totalOutWeight = outWeights.get(fromId);
                        
                        if (totalOutWeight > 0) {
                            sum += pr.get(fromId) * (edgeWeight / totalOutWeight);
                        }
                    });
                    
                    newPr.set(node.id, (1 - damping) / componentSize + damping * sum);
                    sumPr += newPr.get(node.id);
                });

                // Check for convergence
                let maxDiff = 0;
                component.forEach(node => {
                    maxDiff = Math.max(maxDiff, Math.abs(newPr.get(node.id) - pr.get(node.id)));
                });

                pr = newPr;
                if (maxDiff < epsilon) break;
            }

            // Normalize to [0,1] within component
            const maxVal = Math.max(...Array.from(pr.values()));
            component.forEach(node => {
                result[node.id] = maxVal > 0 ? 
                    (pr.get(node.id) / maxVal).toFixed(4) : "0.0000";
            });
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
        
        // Clear component cache when graph changes
        this.components = null;
        this.nodeToComponent.clear();
    }
}