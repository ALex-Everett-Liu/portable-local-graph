const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3013;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname)));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Routes

// Serve main application
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API Routes

// Get all saved graphs
app.get('/api/graphs', async (req, res) => {
    try {
        const files = await fs.readdir(path.join(__dirname, 'data'));
        const graphFiles = files.filter(file => file.endsWith('.json') && !file.startsWith('sample-'));
        
        const graphs = await Promise.all(
            graphFiles.map(async (filename) => {
                const filepath = path.join(__dirname, 'data', filename);
                const stats = await fs.stat(filepath);
                const content = await fs.readFile(filepath, 'utf8');
                const data = JSON.parse(content);
                
                return {
                    id: filename.replace('.json', ''),
                    name: data.metadata?.name || filename.replace('.json', ''),
                    description: data.metadata?.description || '',
                    filename,
                    size: stats.size,
                    lastModified: stats.mtime,
                    nodeCount: data.nodes?.length || 0,
                    edgeCount: data.edges?.length || 0
                };
            })
        );
        
        res.json(graphs);
    } catch (error) {
        console.error('Error listing graphs:', error);
        res.status(500).json({ error: 'Failed to list graphs' });
    }
});

// Get specific graph
app.get('/api/graphs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const filepath = path.join(__dirname, 'data', `${id}.json`);
        
        if (!await fileExists(filepath)) {
            return res.status(404).json({ error: 'Graph not found' });
        }
        
        const content = await fs.readFile(filepath, 'utf8');
        const data = JSON.parse(content);
        
        res.json(data);
    } catch (error) {
        console.error('Error loading graph:', error);
        res.status(500).json({ error: 'Failed to load graph' });
    }
});

// Save graph
app.post('/api/graphs', async (req, res) => {
    try {
        const { id, data } = req.body;
        
        if (!id || !data) {
            return res.status(400).json({ error: 'Missing id or data' });
        }
        
        // Ensure data directory exists
        await ensureDataDir();
        
        const filepath = path.join(__dirname, 'data', `${id}.json`);
        
        // Add metadata
        const enrichedData = {
            ...data,
            metadata: {
                ...data.metadata,
                lastSaved: new Date().toISOString(),
                version: '1.0'
            }
        };
        
        await fs.writeFile(filepath, JSON.stringify(enrichedData, null, 2));
        
        res.json({ success: true, message: 'Graph saved successfully' });
    } catch (error) {
        console.error('Error saving graph:', error);
        res.status(500).json({ error: 'Failed to save graph' });
    }
});

// Delete graph
app.delete('/api/graphs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const filepath = path.join(__dirname, 'data', `${id}.json`);
        
        if (!await fileExists(filepath)) {
            return res.status(404).json({ error: 'Graph not found' });
        }
        
        await fs.unlink(filepath);
        res.json({ success: true, message: 'Graph deleted successfully' });
    } catch (error) {
        console.error('Error deleting graph:', error);
        res.status(500).json({ error: 'Failed to delete graph' });
    }
});

// Export graph as SVG
app.post('/api/graphs/:id/svg', async (req, res) => {
    try {
        const { id } = req.params;
        const { data } = req.body;
        
        const svg = generateSVG(data);
        
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Content-Disposition', `attachment; filename="${id}.svg"`);
        res.send(svg);
    } catch (error) {
        console.error('Error generating SVG:', error);
        res.status(500).json({ error: 'Failed to generate SVG' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Utility functions
async function fileExists(filepath) {
    try {
        await fs.access(filepath);
        return true;
    } catch {
        return false;
    }
}

async function ensureDataDir() {
    const dataDir = path.join(__dirname, 'data');
    try {
        await fs.access(dataDir);
    } catch {
        await fs.mkdir(dataDir, { recursive: true });
    }
}

function generateSVG(data) {
    const { nodes = [], edges = [] } = data;
    
    if (nodes.length === 0) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">
            <text x="200" y="150" text-anchor="middle" font-family="Arial" font-size="16">
                Empty graph
            </text>
        </svg>`;
    }

    // Calculate bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(node => {
        minX = Math.min(minX, node.x - node.radius);
        minY = Math.min(minY, node.y - node.radius);
        maxX = Math.max(maxX, node.x + node.radius);
        maxY = Math.max(maxY, node.y + node.radius);
    });

    const padding = 50;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <g transform="translate(${padding - minX}, ${padding - minY})">`;

    // Add edges
    edges.forEach(edge => {
        const from = nodes.find(n => n.id === edge.from);
        const to = nodes.find(n => n.id === edge.to);
        
        if (from && to) {
            const weight = edge.weight || 1;
            const strokeWidth = 2 + (weight / 10);
            
            svg += `
                <line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"
                      stroke="#94a3b8" stroke-width="${strokeWidth}" />`;
        }
    });

    // Add nodes
    nodes.forEach(node => {
        svg += `
            <circle cx="${node.x}" cy="${node.y}" r="${node.radius}"
                    fill="${node.color}" stroke="#2563eb" stroke-width="2" />
            <text x="${node.x}" y="${node.y + 5}" text-anchor="middle"
                  font-family="Arial" font-size="12" fill="white">${node.label}</text>`;
    });

    svg += '</g></svg>';
    
    return svg;
}

// Start server
async function startServer() {
    await ensureDataDir();
    
    app.listen(PORT, () => {
        console.log(`🚀 Server running at http://localhost:${PORT}`);
        console.log(`📊 API available at http://localhost:${PORT}/api`);
        console.log(`📁 Data directory: ${path.join(__dirname, 'data')}`);
    });
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

// Start the server
if (require.main === module) {
    startServer().catch(console.error);
}

module.exports = app;