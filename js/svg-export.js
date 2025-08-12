// SVG export functionality

// Generate SVG from current graph
function generateSVG() {
    const data = graph.exportData();
    
    if (data.nodes.length === 0) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
            <text x="400" y="300" text-anchor="middle" font-family="Arial" font-size="16">Empty Graph</text>
        </svg>`;
    }

    const width = 800;
    const height = 600;
    const margin = 50;
    
    // Calculate bounds
    const minX = Math.min(...data.nodes.map(n => n.x - n.radius));
    const maxX = Math.max(...data.nodes.map(n => n.x + n.radius));
    const minY = Math.min(...data.nodes.map(n => n.y - n.radius));
    const maxY = Math.max(...data.nodes.map(n => n.y + n.radius));
    
    const scale = Math.min(
        (width - 2 * margin) / (maxX - minX),
        (height - 2 * margin) / (maxY - minY)
    );
    
    const offsetX = margin - minX * scale;
    const offsetY = margin - minY * scale;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <defs>
            <style>
                .node { fill: #3b82f6; stroke: #2563eb; stroke-width: 2; cursor: pointer; }
                .node-text { font-family: Arial, sans-serif; font-size: 12px; fill: white; text-anchor: middle; }
                .edge { stroke: #64748b; stroke-width: 2; }
                .edge-text { font-family: Arial, sans-serif; font-size: 10px; fill: #475569; text-anchor: middle; }
                .background { fill: #f8f9fa; }
            </style>
        </defs>
        <rect class="background" width="${width}" height="${height}"/>
    `;

    // Render edges
    data.edges.forEach(edge => {
        const from = data.nodes.find(n => n.id === edge.from);
        const to = data.nodes.find(n => n.id === edge.to);
        
        if (from && to) {
            const x1 = from.x * scale + offsetX;
            const y1 = from.y * scale + offsetY;
            const x2 = to.x * scale + offsetX;
            const y2 = to.y * scale + offsetY;
            
            svg += `<line class="edge" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
            
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            svg += `<text class="edge-text" x="${midX}" y="${midY - 5}">${edge.weight}</text>`;
        }
    });

    // Render nodes
    data.nodes.forEach(node => {
        const cx = node.x * scale + offsetX;
        const cy = node.y * scale + offsetY;
        const r = node.radius * scale;
        
        svg += `<circle class="node" cx="${cx}" cy="${cy}" r="${r}"></circle>`;
        svg += `<text class="node-text" x="${cx}" y="${cy + 4}">${node.label}</text>`;
    });

    svg += '</svg>';
    return svg;
}

// Export SVG
function exportSVG() {
    const svg = generateSVG();
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `graph_${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('SVG exported successfully!');
}

// Export JSON
function exportJSON() {
    const data = graph.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `graph_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('JSON exported successfully!');
}

// Import JSON
async function importJSON() {
    if (typeof require !== 'undefined') {
        // Electron mode - use file dialog
        const { ipcRenderer } = require('electron');
        const result = await ipcRenderer.invoke('import-json-file');
        if (result.success) {
            await loadGraphData(result.graphData);
            showNotification(`JSON imported from ${result.fileName}`);
        } else if (!result.cancelled) {
            showNotification('Error importing JSON: ' + result.error, 'error');
        }
    } else {
        // Web mode - use file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        await loadGraphData(data);
                        
                        // Save to database if available
                        if (dbManager) {
                            await saveGraphToDatabase();
                        }
                        
                        showNotification(`JSON imported from ${file.name}`);
                    } catch (error) {
                        showNotification('Error importing JSON: Invalid format', 'error');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateSVG,
        exportSVG,
        exportJSON,
        importJSON
    };
} else {
    Object.assign(window, {
        generateSVG,
        exportSVG,
        exportJSON,
        importJSON
    });
}