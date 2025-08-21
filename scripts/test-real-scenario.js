const DatabaseManager = require('../database-manager');
const fs = require('fs');

async function testRealScenario() {
    console.log('🔍 Testing real-world data contamination scenario...');
    
    const db1Path = './real-scenario-1.db';
    const db2Path = './real-scenario-2.db';
    
    // Clean up
    [db1Path, db2Path].forEach(file => {
        if (fs.existsSync(file)) fs.unlinkSync(file);
    });
    
    try {
        // Step 1: Create Database 1 with original data
        console.log('\n📊 Step 1: Creating Database 1 with original data...');
        const dbManager = new DatabaseManager(db1Path);
        await dbManager.init();
        
        const originalData = {
            nodes: [
                { id: 'orig-node-1', x: 100, y: 100, label: 'Original Node 1', color: '#ff0000' },
                { id: 'orig-node-2', x: 200, y: 200, label: 'Original Node 2', color: '#00ff00' }
            ],
            edges: [
                { id: 'orig-edge-1', from: 'orig-node-1', to: 'orig-node-2', weight: 5 }
            ],
            metadata: { name: 'Original Database' }
        };
        
        await dbManager.saveGraph(originalData);
        console.log(`✅ Database 1 created: ${originalData.nodes.length} nodes, ${originalData.edges.length} edges`);
        
        // Step 2: Save Database 1 and verify contents
        const db1Contents = await dbManager.loadGraph();
        console.log(`📊 Database 1 verification: ${db1Contents.nodes.length} nodes, ${db1Contents.edges.length} edges`);
        
        // Step 3: Switch to Database 2 (this is where contamination might occur)
        console.log('\n📊 Step 3: Switching to Database 2...');
        await dbManager.openFile(db2Path);
        
        // Step 4: Create Database 2 with different data
        const newData = {
            nodes: [
                { id: 'new-node-1', x: 300, y: 300, label: 'New Node 1', color: '#0000ff' },
                { id: 'new-node-2', x: 400, y: 400, label: 'New Node 2', color: '#ffff00' }
            ],
            edges: [
                { id: 'new-edge-1', from: 'new-node-1', to: 'new-node-2', weight: 10 }
            ],
            metadata: { name: 'New Database' }
        };
        
        await dbManager.saveGraph(newData);
        console.log(`✅ Database 2 created: ${newData.nodes.length} nodes, ${newData.edges.length} edges`);
        
        // Step 5: Switch back to Database 1 and check for contamination
        console.log('\n📊 Step 4: Switching back to Database 1...');
        await dbManager.openFile(db1Path);
        
        const afterSwitchData = await dbManager.loadGraph();
        console.log(`📊 Database 1 after switch: ${afterSwitchData.nodes.length} nodes, ${afterSwitchData.edges.length} edges`);
        
        // Check for contamination
        const hasNewData = afterSwitchData.nodes.some(node => 
            node.label.includes('New Node') || node.id.startsWith('new-')
        );
        
        if (hasNewData) {
            console.log('🚨 CONTAMINATION DETECTED!');
            console.log('   Database 1 contains data from Database 2');
            console.log('   Contaminated nodes:', afterSwitchData.nodes.map(n => n.label));
        } else {
            console.log('✅ No contamination detected - databases are isolated');
        }
        
        // Step 6: Save Database 1 again and verify
        console.log('\n📊 Step 5: Saving Database 1 again...');
        await dbManager.saveGraph(afterSwitchData);
        
        // Step 7: Final verification by reopening both databases
        await dbManager.close();
        
        const finalDb1 = new DatabaseManager(db1Path);
        await finalDb1.init();
        const finalDb1Data = await finalDb1.loadGraph();
        
        const finalDb2 = new DatabaseManager(db2Path);
        await finalDb2.init();
        const finalDb2Data = await finalDb2.loadGraph();
        
        console.log('\n📋 Final Verification:');
        console.log(`Database 1: ${finalDb1Data.nodes.length} nodes, ${finalDb1Data.edges.length} edges`);
        console.log(`Database 2: ${finalDb2Data.nodes.length} nodes, ${finalDb2Data.edges.length} edges`);
        
        // Detailed contamination check
        const db1NodeIds = new Set(finalDb1Data.nodes.map(n => n.id));
        const db2NodeIds = new Set(finalDb2Data.nodes.map(n => n.id));
        
        const intersection = [...db1NodeIds].filter(id => db2NodeIds.has(id));
        
        if (intersection.length > 0) {
            console.log('🚨 CRITICAL: Shared node IDs between databases:', intersection);
        } else {
            console.log('✅ No shared data between databases');
        }
        
        // Check actual file contents
        const db1RawNodes = await getAllNodes(finalDb1);
        const db2RawNodes = await getAllNodes(finalDb2);
        
        console.log('\n🔍 Raw database inspection:');
        console.log(`DB1 actual nodes: ${db1RawNodes.length}`);
        console.log(`DB2 actual nodes: ${db2RawNodes.length}`);
        
        // Cross-contamination check
        const db1Labels = db1RawNodes.map(n => n.label);
        const db2Labels = db2RawNodes.map(n => n.label);
        
        const mixedLabels = db1Labels.filter(label => db2Labels.includes(label));
        
        if (mixedLabels.length > 0) {
            console.log('🚨 MIXED DATA FOUND:', mixedLabels);
        } else {
            console.log('✅ Data integrity maintained');
        }
        
        await finalDb1.close();
        await finalDb2.close();
        
        // Summary
        const allClean = !hasNewData && intersection.length === 0 && mixedLabels.length === 0;
        console.log(`\n🎯 Real scenario test: ${allClean ? '✅ PASSED' : '❌ FAILED'}`);
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        // Cleanup
        [db1Path, db2Path].forEach(file => {
            if (fs.existsSync(file)) fs.unlinkSync(file);
        });
    }
}

// Helper functions
async function getAllNodes(dbManager) {
    return new Promise((resolve, reject) => {
        dbManager.db.all('SELECT * FROM nodes', (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

if (require.main === module) {
    testRealScenario();
}

module.exports = testRealScenario;