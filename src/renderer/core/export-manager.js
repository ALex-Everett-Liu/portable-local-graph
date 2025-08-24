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
     * Export graph data as JSON
     * @param {Object} options - Export options
     * @returns {string} JSON string
     */
    exportJSON(options = {}) {
        const data = this.graphData.exportData();
        const exportData = {
            nodes: data.nodes,
            edges: data.edges,
            scale: options.scale || 1,
            offset: options.offset || { x: 0, y: 0 },
            timestamp: new Date().toISOString(),
            version: '1.0'
        };
        
        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Import graph data from JSON
     * @param {string} jsonString - JSON string
     * @returns {Object} Import result
     */
    importJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            
            // Validate required fields
            if (!data.nodes || !Array.isArray(data.nodes)) {
                throw new Error('Invalid JSON: missing or invalid nodes array');
            }
            if (!data.edges || !Array.isArray(data.edges)) {
                throw new Error('Invalid JSON: missing or invalid edges array');
            }
            
            this.graphData.loadData(data);
            
            return {
                success: true,
                data: {
                    nodes: data.nodes,
                    edges: data.edges,
                    scale: data.scale || 1,
                    offset: data.offset || { x: 0, y: 0 }
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Export graph as SVG
     * @param {Object} options - Export options
     * @returns {string} SVG string
     */
    exportSVG(options = {}) {
        if (!this.renderer) {
            throw new Error('Renderer required for SVG export');
        }

        const data = this.graphData.exportData();
        const bounds = this.calculateBounds(data.nodes);
        const padding = options.padding || 50;
        
        const svgWidth = bounds.width + (padding * 2);
        const svgHeight = bounds.height + (padding * 2);
        
        let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
  <defs>
    <style>
      .node { fill: #6737E8; stroke: #C0C0C0; stroke-width: 2; }
      .node-selected { fill: #87CEFA; stroke: #B0C4DE; stroke-width: 3; }
      .edge { stroke: #EFF0E9; stroke-width: 1; }
      .edge-selected { stroke: #F4A460; stroke-width: 2; }
      .label { font-family: Arial, sans-serif; font-size: 12px; fill: #000000; text-anchor: middle; dominant-baseline: middle; }
      .weight { font-family: Arial, sans-serif; font-size: 10px; fill: #000000; text-anchor: middle; dominant-baseline: middle; }
    </style>
  </defs>
  <rect width="100%" height="100%" fill="white"/>
`;

        // Calculate transform to center the graph
        const transformX = -bounds.minX + padding;
        const transformY = -bounds.minY + padding;

        // Render edges
        data.edges.forEach(edge => {
            const from = data.nodes.find(n => n.id === edge.from);
            const to = data.nodes.find(n => n.id === edge.to);
            
            if (from && to) {
                const x1 = from.x + transformX;
                const y1 = from.y + transformY;
                const x2 = to.x + transformX;
                const y2 = to.y + transformY;
                
                const lineWidth = Math.max(1, Math.min(8, 1 / edge.weight * 5));
                
                svg += `  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="edge" stroke-width="${lineWidth}"/>
`;
                
                // Add weight label
                const midX = (x1 + x2) / 2;
                const midY = (y1 + y2) / 2;
                svg += `  <text x="${midX}" y="${midY - 10}" class="weight">${edge.weight}</text>
`;
            }
        });

        // Render nodes
        data.nodes.forEach(node => {
            const x = node.x + transformX;
            const y = node.y + transformY;
            const radius = Math.max(5, node.radius);
            
            svg += `  <circle cx="${x}" cy="${y}" r="${radius}" class="node"/>
`;
            svg += `  <text x="${x}" y="${y}" class="label">${node.label}</text>
`;
        });

        svg += '</svg>';
        return svg;
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