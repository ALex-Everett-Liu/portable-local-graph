const DatabaseManager = require('./database-manager');

async function debugTimestamp() {
    const dbManager = new DatabaseManager('./debug-timestamp.db');
    
    try {
        await dbManager.init();
        console.log('✅ Database initialized');
        
        // Create initial graph
        const initialGraph = {
            nodes: [
                { id: 'node1', x: 100.5, y: 100.7, label: 'Node 1', color: '#ff0000' },
                { id: 'node2', x: 200.3, y: 200.9, label: 'Node 2', color: '#00ff00' }
            ],
            edges: [
                { id: 'edge1', from: 'node1', to: 'node2', weight: 5.5 }
            ],
            metadata: { name: 'Test Graph' }
        };
        
        console.log('📝 Saving initial graph...');
        await dbManager.saveGraph(initialGraph);
        
        // Get existing data for debugging
        const existingNodes = await new Promise((resolve, reject) => {
            dbManager.db.all('SELECT * FROM nodes', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        const existingEdges = await new Promise((resolve, reject) => {
            dbManager.db.all('SELECT * FROM edges', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        console.log('\n🔍 Existing data in database:');
        existingNodes.forEach(node => {
            console.log(`Node: id=${node.id.toString('hex')}, x=${node.x} (${typeof node.x}), y=${node.y} (${typeof node.y}), label='${node.label}'`);
        });
        existingEdges.forEach(edge => {
            console.log(`Edge: id=${edge.id.toString('hex')}, weight=${edge.weight} (${typeof edge.weight})`);
        });

        // Test the comparison logic
        const testNode = { id: 'node1', x: 100.5, y: 100.7, label: 'Node 1', color: '#ff0000' };
        const existingNode = existingNodes[0];
        
        console.log('\n🔍 Testing node comparison:');
        console.log(`new.x=${testNode.x} (${typeof testNode.x})`);
        console.log(`existing.x=${existingNode.x} (${typeof existingNode.x})`);
        console.log(`new.x === existing.x: ${testNode.x === existingNode.x}`);
        console.log(`new.x == existing.x: ${testNode.x == existingNode.x}`);
        console.log(`Math.abs(new.x - existing.x) < 0.001: ${Math.abs(testNode.x - existingNode.x) < 0.001}`);
        
        const testEdge = { id: 'edge1', from: 'node1', to: 'node2', weight: 5.5 };
        const existingEdge = existingEdges[0];
        
        console.log('\n🔍 Testing edge comparison:');
        console.log(`new.weight=${testEdge.weight} (${typeof testEdge.weight})`);
        console.log(`existing.weight=${existingEdge.weight} (${typeof existingEdge.weight})`);
        console.log(`new.weight === existing.weight: ${testEdge.weight === existingEdge.weight}`);
        console.log(`new.weight == existing.weight: ${testEdge.weight == existingEdge.weight}`);
        
        // Test UUID handling
        console.log('\n🔍 Testing UUID handling:');
        const { v7: uuidv7 } = require('uuid');
        function uuidToBuffer(uuid) {
            if (!uuid) return null;
            const hex = uuid.replace(/-/g, '');
            return Buffer.from(hex, 'hex');
        }
        
        function bufferToUuid(buffer) {
            if (!buffer || buffer.length !== 16) return null;
            const hex = buffer.toString('hex');
            return `${hex.substr(0, 8)}-${hex.substr(8, 4)}-${hex.substr(12, 4)}-${hex.substr(16, 4)}-${hex.substr(20, 12)}`;
        }
        
        const originalId = 'node1';
        const bufferId = uuidToBuffer(originalId);
        const reconstructedId = bufferToUuid(bufferId);
        console.log(`Original: ${originalId}`);
        console.log(`Buffer: ${bufferId?.toString('hex')}`);
        console.log(`Reconstructed: ${reconstructedId}`);
        console.log(`Match: ${originalId === reconstructedId}`);
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
    } finally {
        await dbManager.close();
    }
}

if (require.main === module) {
    debugTimestamp();
}