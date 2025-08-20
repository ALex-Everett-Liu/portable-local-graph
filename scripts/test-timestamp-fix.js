const DatabaseManager = require('./database-manager');

async function testTimestampFix() {
    const dbManager = new DatabaseManager('./test-timestamp-fix.db');
    
    try {
        await dbManager.init();
        console.log('✅ Database initialized');
        
        // Create initial graph
        const initialGraph = {
            nodes: [
                { id: 'node1', x: 100, y: 100, label: 'Node 1', color: '#ff0000' },
                { id: 'node2', x: 200, y: 200, label: 'Node 2', color: '#00ff00' }
            ],
            edges: [
                { id: 'edge1', from: 'node1', to: 'node2', weight: 5 }
            ],
            metadata: { name: 'Test Graph' }
        };
        
        console.log('📝 Saving initial graph...');
        await dbManager.saveGraph(initialGraph);
        
        // Get initial timestamps
        const initialNodes = await new Promise((resolve, reject) => {
            dbManager.db.all('SELECT id, label, created_at, modified_at FROM nodes', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        const initialEdges = await new Promise((resolve, reject) => {
            dbManager.db.all('SELECT id, weight, created_at, modified_at FROM edges', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log('\n📊 Initial timestamps:');
        initialNodes.forEach(node => {
            console.log(`Node ${node.label}: created=${node.created_at}, modified=${node.modified_at}`);
        });
        initialEdges.forEach(edge => {
            console.log(`Edge weight ${edge.weight}: created=${edge.created_at}, modified=${edge.modified_at}`);
        });
        
        // Wait a moment to see time difference
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Save same graph without changes
        console.log('\n🔄 Saving same graph (no changes)...');
        await dbManager.saveGraph(initialGraph);
        
        // Get timestamps after no-change save
        const noChangeNodes = await new Promise((resolve, reject) => {
            dbManager.db.all('SELECT id, label, created_at, modified_at FROM nodes', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        const noChangeEdges = await new Promise((resolve, reject) => {
            dbManager.db.all('SELECT id, weight, created_at, modified_at FROM edges', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log('\n📊 After no-change save:');
        noChangeNodes.forEach(node => {
            console.log(`Node ${node.label}: created=${node.created_at}, modified=${node.modified_at}`);
        });
        noChangeEdges.forEach(edge => {
            console.log(`Edge weight ${edge.weight}: created=${edge.created_at}, modified=${edge.modified_at}`);
        });
        
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Save graph with actual changes
        const changedGraph = {
            ...initialGraph,
            nodes: [
                { id: 'node1', x: 100, y: 100, label: 'Node 1 (changed)', color: '#ff0000' }, // Changed label
                { id: 'node2', x: 200, y: 200, label: 'Node 2', color: '#00ff00' }
            ],
            edges: [
                { id: 'edge1', from: 'node1', to: 'node2', weight: 10 } // Changed weight
            ]
        };
        
        console.log('\n📝 Saving graph with actual changes...');
        await dbManager.saveGraph(changedGraph);
        
        // Get timestamps after actual changes
        const changedNodes = await new Promise((resolve, reject) => {
            dbManager.db.all('SELECT id, label, created_at, modified_at FROM nodes', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        const changedEdges = await new Promise((resolve, reject) => {
            dbManager.db.all('SELECT id, weight, created_at, modified_at FROM edges', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log('\n📊 After actual changes:');
        changedNodes.forEach(node => {
            console.log(`Node ${node.label}: created=${node.created_at}, modified=${node.modified_at}`);
        });
        changedEdges.forEach(edge => {
            console.log(`Edge weight ${edge.weight}: created=${edge.created_at}, modified=${edge.modified_at}`);
        });
        
        // Verify timestamps
        console.log('\n✅ Verification:');
        
        // Check if created_at remained the same for no-change save
        const node1Initial = initialNodes.find(n => n.label === 'Node 1');
        const node1NoChange = noChangeNodes.find(n => n.label === 'Node 1');
        const node1Changed = changedNodes.find(n => n.label === 'Node 1 (changed)');
        
        if (node1Initial.created_at === node1NoChange.created_at && node1Initial.modified_at === node1NoChange.modified_at) {
            console.log('✅ No-change save preserved timestamps correctly');
        } else {
            console.log('❌ No-change save modified timestamps incorrectly');
        }
        
        if (node1Changed.created_at === node1Initial.created_at && node1Changed.modified_at > node1Initial.modified_at) {
            console.log('✅ Change save updated modified_at correctly');
        } else {
            console.log('❌ Change save did not update modified_at correctly');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await dbManager.close();
        
        // Clean up test file
        const fs = require('fs');
        try {
            fs.unlinkSync('./test-timestamp-fix.db');
            console.log('🧹 Test database cleaned up');
        } catch (e) {
            // Ignore cleanup errors
        }
    }
}

if (require.main === module) {
    testTimestampFix();
}

module.exports = testTimestampFix;