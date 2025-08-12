const DatabaseManager = require('./database-manager');

async function testDatabaseIntegration() {
    console.log('Testing database integration...');
    
    const dbManager = new DatabaseManager();
    
    try {
        await dbManager.init();
        console.log('✓ Database initialized');
        
        // Test saving a simple graph
        const testData = {
            nodes: [
                { id: 'node1', x: 100, y: 100, label: 'Test Node 1', color: '#ff0000', radius: 25 },
                { id: 'node2', x: 200, y: 200, label: 'Test Node 2', color: '#00ff00', radius: 30 }
            ],
            edges: [
                { id: 'edge1', from: 'node1', to: 'node2', weight: 5, category: 'test' }
            ],
            scale: 1.5,
            offset: { x: 10, y: 20 },
            metadata: { name: 'Test Graph', description: 'Testing DB integration' }
        };
        
        await dbManager.saveGraph('test-graph-123', testData);
        console.log('✓ Graph saved successfully');
        
        // Test loading the graph
        const loadedData = await dbManager.loadGraph('test-graph-123');
        console.log('✓ Graph loaded successfully');
        console.log(`Nodes: ${loadedData.nodes.length}, Edges: ${loadedData.edges.length}`);
        
        // Test listing graphs
        const graphs = await dbManager.listGraphs();
        console.log(`✓ Found ${graphs.length} graphs in database`);
        
        console.log('✓ All database tests passed!');
        
    } catch (error) {
        console.error('✗ Test failed:', error);
    } finally {
        await dbManager.close();
    }
}

if (require.main === module) {
    testDatabaseIntegration();
}

module.exports = testDatabaseIntegration;