/**
 * ExportManager - Handles data export in various formats
 * Provides SVG, JSON, and other export capabilities
 */
import { GraphRenderer } from '../rendering/graph-renderer.js';

export class ExportManager {
    constructor(graphData) {
        this.graphData = graphData;
        this.renderer = null;
    }

    /**
     * Set renderer instance for visual exports
     * @param {GraphRenderer} renderer - Graph renderer instance
     */
    setRenderer(renderer) {
        this.renderer = renderer;
    }



    /**
     * Export as CSV format for nodes
     * @returns {string} CSV string
     */
    exportNodesCSV() {
        const data = this.graphData.exportData();
        if (data.nodes.length === 0) return '';

        const headers = ['id', 'label', 'x', 'y', 'color', 'radius', 'category', 'layers'];
        let csv = headers.join(',') + '\n';

        data.nodes.forEach(node => {
            const row = [
                node.id,
                `"${node.label || ''}"`,
                node.x || 0,
                node.y || 0,
                node.color || '#6737E8',
                node.radius || 20,
                node.category || '',
                `"${(node.layers || []).join(';')}"`
            ];
            csv += row.join(',') + '\n';
        });

        return csv;
    }

    /**
     * Export nodes from specific layers as CSV (edges excluded)
     * @param {Array<string>} layerNames - Array of layer names to include
     * @returns {string} CSV string with filtered nodes
     */
    exportLayersNodesCSV(layerNames) {
        const data = this.graphData.exportData();
        
        // Filter nodes that belong to any of the specified layers
        const filteredNodes = data.nodes.filter(node => {
            if (!node.layers || !Array.isArray(node.layers)) return false;
            return node.layers.some(layer => layerNames.includes(layer));
        });

        if (filteredNodes.length === 0) return '';

        const headers = ['id', 'label', 'x', 'y', 'color', 'radius', 'category', 'layers'];
        let csv = headers.join(',') + '\n';

        filteredNodes.forEach(node => {
            const row = [
                node.id,
                `"${node.label || ''}"`,
                node.x || 0,
                node.y || 0,
                node.color || '#6737E8',
                node.radius || 20,
                node.category || '',
                `"${(node.layers || []).join(';')}"`
            ];
            csv += row.join(',') + '\n';
        });

        return csv;
    }

    /**
     * Export as CSV format for edges
     * @returns {string} CSV string
     */
    exportEdgesCSV() {
        const data = this.graphData.exportData();
        if (data.edges.length === 0) return '';

        const headers = ['id', 'from', 'to', 'weight', 'category'];
        let csv = headers.join(',') + '\n';

        data.edges.forEach(edge => {
            const row = [
                edge.id,
                edge.from,
                edge.to,
                edge.weight || 1,
                edge.category || ''
            ];
            csv += row.join(',') + '\n';
        });

        return csv;
    }

    /**
     * Export as GraphML format
     * @returns {string} GraphML string
     */
    exportGraphML() {
        const data = this.graphData.exportData();
        
        let graphml = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="x" for="node" attr.name="x" attr.type="double"/>
  <key id="y" for="node" attr.name="y" attr.type="double"/>
  <key id="color" for="node" attr.name="color" attr.type="string"/>
  <key id="radius" for="node" attr.name="radius" attr.type="double"/>
  <key id="category" for="node" attr.name="category" attr.type="string"/>
  <key id="layers" for="node" attr.name="layers" attr.type="string"/>
  <key id="weight" for="edge" attr.name="weight" attr.type="double"/>
  <key id="category" for="edge" attr.name="category" attr.type="string"/>
  
  <graph id="G" edgedefault="undirected">
`;

        // Add nodes
        data.nodes.forEach(node => {
            graphml += `    <node id="${node.id}">
      <data key="label">${this.escapeXML(node.label || '')}</data>
      <data key="x">${node.x || 0}</data>
      <data key="y">${node.y || 0}</data>
      <data key="color">${node.color || '#6737E8'}</data>
      <data key="radius">${node.radius || 20}</data>
      <data key="category">${this.escapeXML(node.category || '')}</data>
      <data key="layers">${this.escapeXML((node.layers || []).join(';'))}</data>
    </node>
`;
        });

        // Add edges
        data.edges.forEach(edge => {
            graphml += `    <edge id="${edge.id}" source="${edge.from}" target="${edge.to}">
      <data key="weight">${edge.weight || 1}</data>
      <data key="category">${this.escapeXML(edge.category || '')}</data>
    </edge>
`;
        });

        graphml += '  </graph>\n</graphml>';
        return graphml;
    }

    /**
     * Trigger file download
     * @param {string} content - File content
     * @param {string} filename - File name
     * @param {string} mimeType - MIME type
     */
    downloadFile(content, filename, mimeType = 'text/plain') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }

    /**
     * Calculate bounds for SVG export
     * @param {Array} nodes - Array of nodes
     * @returns {Object} Bounds object
     */
    calculateBounds(nodes) {
        if (nodes.length === 0) {
            return { minX: 0, maxX: 100, minY: 0, maxY: 100, width: 100, height: 100 };
        }

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        
        nodes.forEach(node => {
            const radius = node.radius || 20;
            minX = Math.min(minX, node.x - radius);
            maxX = Math.max(maxX, node.x + radius);
            minY = Math.min(minY, node.y - radius);
            maxY = Math.max(maxY, node.y + radius);
        });

        return {
            minX,
            maxX,
            minY,
            maxY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    /**
     * Merge new data with existing graph data
     * @param {Object} newData - Data to merge
     * @param {string} conflictResolution - How to handle ID conflicts
     * @returns {Object} Merge result with statistics
     */
    mergeData(newData, conflictResolution = 'replace') {
        const existingNodes = this.graphData.exportData().nodes;
        const existingEdges = this.graphData.exportData().edges;
        
        const existingNodeIds = new Set(existingNodes.map(node => node.id));
        const existingEdgeIds = new Set(existingEdges.map(edge => edge.id));
        
        const conflicts = [];
        const finalNodes = [...existingNodes];
        const finalEdges = [...existingEdges];
        
        // Process nodes
        const nodeMapping = new Map(); // Maps old IDs to new IDs for edges
        let nodesAdded = 0;
        let nodesSkipped = 0;
        let nodesRenamed = 0;
        
        newData.nodes.forEach(newNode => {
            if (existingNodeIds.has(newNode.id)) {
                // ID conflict detected
                const conflict = {
                    type: 'node_id_conflict',
                    id: newNode.id,
                    existing: existingNodes.find(n => n.id === newNode.id),
                    incoming: newNode
                };
                
                switch (conflictResolution) {
                    case 'skip':
                        conflicts.push(conflict);
                        nodesSkipped++;
                        return;
                        
                    case 'rename':
                        const newId = this.generateUniqueId(newNode.id, existingNodeIds);
                        nodeMapping.set(newNode.id, newId);
                        newNode = { ...newNode, id: newId };
                        existingNodeIds.add(newId);
                        finalNodes.push(newNode);
                        nodesRenamed++;
                        conflicts.push({...conflict, resolution: 'renamed', newId});
                        break;
                        
                    case 'replace':
                    default:
                        // Replace existing node
                        const index = finalNodes.findIndex(n => n.id === newNode.id);
                        finalNodes[index] = newNode;
                        conflicts.push({...conflict, resolution: 'replaced'});
                        nodesAdded++;
                        break;
                }
            } else {
                // No conflict, add new node
                finalNodes.push(newNode);
                existingNodeIds.add(newNode.id);
                nodesAdded++;
            }
        });
        
        // Process edges
        let edgesAdded = 0;
        let edgesSkipped = 0;
        
        newData.edges.forEach(newEdge => {
            // Map node IDs if they were renamed
            let fromId = nodeMapping.get(newEdge.from) || newEdge.from;
            let toId = nodeMapping.get(newEdge.to) || newEdge.to;
            
            // Check if edge ID conflicts
            let finalEdgeId = newEdge.id;
            if (existingEdgeIds.has(newEdge.id)) {
                switch (conflictResolution) {
                    case 'skip':
                        conflicts.push({
                            type: 'edge_id_conflict',
                            id: newEdge.id,
                            resolution: 'skipped'
                        });
                        edgesSkipped++;
                        return;
                        
                    case 'rename':
                        finalEdgeId = this.generateUniqueId(newEdge.id, existingEdgeIds);
                        existingEdgeIds.add(finalEdgeId);
                        break;
                        
                    case 'replace':
                        // Remove existing edge
                        finalEdges = finalEdges.filter(e => e.id !== newEdge.id);
                        break;
                }
            }
            
            // Validate edge references exist
            if (!existingNodeIds.has(fromId) || !existingNodeIds.has(toId)) {
                conflicts.push({
                    type: 'edge_orphaned',
                    id: newEdge.id,
                    from: fromId,
                    to: toId,
                    resolution: 'skipped'
                });
                edgesSkipped++;
                return;
            }
            
            // Add valid edge
            const finalEdge = {
                ...newEdge,
                id: finalEdgeId,
                from: fromId,
                to: toId
            };
            
            finalEdges.push(finalEdge);
            existingEdgeIds.add(finalEdgeId);
            edgesAdded++;
        });
        
        // Update graph data
        this.graphData.nodes = finalNodes;
        this.graphData.edges = finalEdges;
        this.graphData.rebuildMaps();
        
        return {
            nodesAdded,
            nodesSkipped,
            nodesRenamed,
            edgesAdded,
            edgesSkipped,
            conflicts
        };
    }

    /**
     * Generate a unique ID by appending a suffix
     * @param {string} baseId - Original ID
     * @param {Set} existingIds - Set of existing IDs
     * @returns {string} Unique ID
     */
    generateUniqueId(baseId, existingIds) {
        let counter = 1;
        let newId = `${baseId}_${counter}`;
        
        while (existingIds.has(newId)) {
            counter++;
            newId = `${baseId}_${counter}`;
        }
        
        return newId;
    }

    /**
     * Escape XML special characters
     * @param {string} str - Input string
     * @returns {string} Escaped string
     */
    escapeXML(str) {
        return str.replace(/[&<>"']/g, (match) => {
            switch (match) {
                case '&': return '&amp;';
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '"': return '&quot;';
                case "'": return '&apos;';
                default: return match;
            }
        });
    }
}