const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use(express.static('public'));

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// Graph data storage
let currentGraph = {
    nodes: [],
    edges: [],
    metadata: {
        name: 'Untitled Graph',
        created: new Date().toISOString(),
        lastModified: new Date().toISOString()
    }
};

// Auto-save interval
let autoSaveInterval;

// Routes

// Get current graph
app.get('/api/graph', (req, res) => {
    res.json(currentGraph);
});

// Save graph
app.post('/api/graph', (req, res) => {
    try {
        const { graph } = req.body;
        
        if (!graph) {
            return res.status(400).json({ error: 'Graph data is required' });
        }

        currentGraph = {
            ...graph,
            metadata: {
                ...graph.metadata,
                lastModified: new Date().toISOString()
            }
        };

        // Auto-save to file
        saveGraphToFile();

        res.json({ 
            success: true, 
            message: 'Graph saved successfully',
            graph: currentGraph 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Load graph from file
app.post('/api/graph/load', (req, res) => {
    try {
        const { filename } = req.body;
        
        if (!filename) {
            return res.status(400).json({ error: 'Filename is required' });
        }

        const filePath = path.join(dataDir, filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        const data = fs.readFileSync(filePath, 'utf8');
        currentGraph = JSON.parse(data);
        
        res.json({ 
            success: true, 
            message: 'Graph loaded successfully',
            graph: currentGraph 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Export graph as JSON
app.get('/api/graph/export/json', (req, res) => {
    try {
        const filename = `graph_${Date.now()}.json`;
        const filePath = path.join(dataDir, filename);
        
        fs.writeFileSync(filePath, JSON.stringify(currentGraph, null, 2));
        
        res.download(filePath, filename, (err) => {
            if (err) {
                res.status(500).json({ error: err.message });
            }
            // Clean up file after download
            setTimeout(() => {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }, 5000);
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Export graph as SVG
app.post('/api/graph/export/svg', (req, res) => {
    try {
        const { graph } = req.body;
        const svg = generateSVG(graph);
        
        res.json({ 
            success: true, 
            svg: svg 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// List saved graphs
app.get('/api/graphs', (req, res) => {
    try {
        const files = fs.readdirSync(dataDir)
            .filter(file => file.endsWith('.json'))
            .map(file => {
                const filePath = path.join(dataDir, file);
                const stats = fs.statSync(filePath);
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                
                return {
                    filename: file,
                    name: data.metadata?.name || 'Untitled Graph',
                    created: data.metadata?.created || stats.birthtime,
                    lastModified: data.metadata?.lastModified || stats.mtime,
                    size: stats.size
                };
            })
            .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
        
        res.json(files);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete graph
app.delete('/api/graph/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(dataDir, filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }
        
        fs.unlinkSync(filePath);
        res.json({ success: true, message: 'Graph deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Graph validation
app.post('/api/graph/validate', (req, res) => {
    try {
        const { graph } = req.body;
        
        if (!graph || !graph.nodes || !graph.edges) {
            return res.status(400).json({ error: 'Invalid graph structure' });
        }

        const nodeIds = new Set(graph.nodes.map(n => n.id));
        const validEdges = graph.edges.filter(e => 
            nodeIds.has(e.from) && nodeIds.has(e.to)
        );

        res.json({
            valid: true,
            nodes: graph.nodes.length,
            edges: validEdges.length,
            invalidEdges: graph.edges.length - validEdges.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Graph statistics
app.post('/api/graph/stats', (req, res) => {
    try {
        const { graph } = req.body;
        
        if (!graph) {
            return res.status(400).json({ error: 'Graph data is required' });
        }

        const nodeCount = graph.nodes.length;
        const edgeCount = graph.edges.length;
        
        // Calculate degree for each node
        const degrees = {};
        graph.nodes.forEach(node => {
            degrees[node.id] = 0;
        });
        
        graph.edges.forEach(edge => {
            degrees[edge.from] = (degrees[edge.from] || 0) + 1;
            degrees[edge.to] = (degrees[edge.to] || 0) + 1;
        });
        
        const maxDegree = Math.max(...Object.values(degrees));
        const minDegree = Math.min(...Object.values(degrees));
        const avgDegree = edgeCount > 0 ? (edgeCount * 2) / nodeCount : 0;

        res.json({
            nodeCount,
            edgeCount,
            maxDegree,
            minDegree,
            avgDegree: parseFloat(avgDegree.toFixed(2))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Utility functions

function saveGraphToFile() {
    try {
        const filename = `autosave_${Date.now()}.json`;
        const filePath = path.join(dataDir, filename);
        
        fs.writeFileSync(filePath, JSON.stringify(currentGraph, null, 2));
        
        // Clean up old auto-saves (keep last 10)
        const files = fs.readdirSync(dataDir)
            .filter(file => file.startsWith('autosave_'))
            .sort()
            .reverse();
        
        files.slice(10).forEach(file => {
            fs.unlinkSync(path.join(dataDir, file));
        });
    } catch (error) {
        console.error('Auto-save error:', error);
    }
}

function generateSVG(graph) {
    const width = 800;
    const height = 600;
    const margin = 50;
    
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <defs>
            <style>
                .node { fill: #3b82f6; stroke: #2563eb; stroke-width: 2; }
                .node-text { font-family: Arial, sans-serif; font-size: 12px; fill: white; text-anchor: middle; }
                .edge { stroke: #64748b; stroke-width: 2; }
                .edge-text { font-family: Arial, sans-serif; font-size: 10px; fill: #475569; text-anchor: middle; }
                .background { fill: #f8f9fa; }
            </style>
        </defs>
        <rect class="background" width="${width}" height="${height}"/>
    `;

    // Calculate bounds
    if (graph.nodes.length > 0) {
        const minX = Math.min(...graph.nodes.map(n => n.x)) - 50;
        const maxX = Math.max(...graph.nodes.map(n => n.x)) + 50;
        const minY = Math.min(...graph.nodes.map(n => n.y)) - 50;
        const maxY = Math.max(...graph.nodes.map(n => n.y)) + 50;
        
        const scale = Math.min(
            (width - 2 * margin) / (maxX - minX),
            (height - 2 * margin) / (maxY - minY)
        );
        
        const offsetX = margin - minX * scale;
        const offsetY = margin - minY * scale;

        // Render edges
        graph.edges.forEach(edge => {
            const from = graph.nodes.find(n => n.id === edge.from);
            const to = graph.nodes.find(n => n.id === edge.to);
            
            if (from && to) {
                const x1 = from.x * scale + offsetX;
                const y1 = from.y * scale + offsetY;
                const x2 = to.x * scale + offsetX;
                const y2 = to.y * scale + offsetY;
                
                svg += `<line class="edge" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><`;
                
                const midX = (x1 + x2) / 2;
                const midY = (y1 + y2) / 2;
                svg += `<text class="edge-text" x="${midX}" y="${midY - 5}">${edge.weight}</text>`;
            }
        });

        // Render nodes
        graph.nodes.forEach(node => {
            const cx = node.x * scale + offsetX;
            const cy = node.y * scale + offsetY;
            const r = node.radius * scale;
            
            svg += `<circle class="node" cx="${cx}" cy="${cy}" r="${r}"></circle>`;
            svg += `<text class="node-text" x="${cx}" y="${cy + 4}">${node.label}</text>`;
        });
    }

    svg += '</svg>';
    return svg;
}

// Start auto-save
autoSaveInterval = setInterval(saveGraphToFile, 60000); // Every minute

// Graceful shutdown
process.on('SIGINT', () => {
    clearInterval(autoSaveInterval);
    saveGraphToFile();
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    console.log(`Manual Graph Drawing Server running on port ${PORT}`);
    console.log(`Data directory: ${dataDir}`);
});