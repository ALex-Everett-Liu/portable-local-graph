const express = require('express');
const cors = require('cors');
const DatabaseManager = require('./sqlite-manager');

const app = express();
const PORT = process.env.PORT || 3012;

// Initialize database
let dbManager;

async function initDatabase() {
    dbManager = new DatabaseManager();
    await dbManager.init();
    console.log('✅ Database initialized successfully');
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use(express.static('public'));

// Temporary in-memory graph for compatibility
let currentGraph = {
    nodes: [],
    edges: [],
    metadata: {
        name: 'Untitled Graph',
        created: new Date().toISOString(),
        lastModified: new Date().toISOString()
    }
};

// Routes

// Get current graph (compatibility endpoint)
app.get('/api/graph', async (req, res) => {
    try {
        const graphId = req.query.id || 'current';
        const graph = await dbManager.loadGraph(graphId);
        
        if (graph) {
            res.json(graph);
        } else {
            // Return current in-memory graph if not found in database
            res.json(currentGraph);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Save graph
app.post('/api/graph', async (req, res) => {
    try {
        const { graph, id = 'current' } = req.body;
        
        if (!graph) {
            return res.status(400).json({ error: 'Graph data is required' });
        }

        // Update metadata
        const enrichedGraph = {
            ...graph,
            metadata: {
                ...graph.metadata,
                name: graph.metadata?.name || id,
                lastModified: new Date().toISOString()
            }
        };

        await dbManager.saveGraph(id, enrichedGraph);
        currentGraph = enrichedGraph; // Keep in sync

        res.json({ 
            success: true, 
            message: 'Graph saved successfully',
            graph: enrichedGraph,
            id: id
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Load graph from database
app.post('/api/graph/load', async (req, res) => {
    try {
        const { id } = req.body;
        
        if (!id) {
            return res.status(400).json({ error: 'Graph ID is required' });
        }

        const graph = await dbManager.loadGraph(id);
        
        if (!graph) {
            return res.status(404).json({ error: 'Graph not found' });
        }

        currentGraph = graph; // Keep in sync
        
        res.json({ 
            success: true, 
            message: 'Graph loaded successfully',
            graph: graph,
            id: id
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



// List all saved graphs
app.get('/api/graphs', async (req, res) => {
    try {
        const graphs = await dbManager.listGraphs();
        res.json(graphs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete graph
app.delete('/api/graph/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await dbManager.deleteGraph(id);
        
        if (!deleted) {
            return res.status(404).json({ error: 'Graph not found' });
        }

        res.json({ success: true, message: 'Graph deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Graph validation
app.post('/api/graph/validate', async (req, res) => {
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
app.post('/api/graph/stats', async (req, res) => {
    try {
        const { graph } = req.body;
        
        if (!graph) {
            return res.status(500).json({ error: 'Graph data is required' });
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


// Health check
app.get('/api/health', async (req, res) => {
    try {
        const graphs = await dbManager.listGraphs();
        res.json({ 
            status: 'ok', 
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            graphCount: graphs.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Utility functions


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

// Start server
async function startServer() {
    try {
        await initDatabase();
        
        app.listen(PORT, () => {
            console.log(`🚀 SQLite Graph Server running on port ${PORT}`);
            console.log(`📊 Database: graph.db`);
            console.log(`🌐 Access: http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await dbManager.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await dbManager.close();
    process.exit(0);
});

// Start the server
if (require.main === module) {
    startServer();
}

module.exports = app;