const DatabaseManager = require('../database-manager');
const fs = require('fs');
const path = require('path');

async function testDataContamination() {
    console.log('🔍 Testing critical data contamination issue...');
    
    // Create test database files
    const db1Path = './test-contamination-1.db';
    const db2Path = './test-contamination-2.db';
    
    // Clean up previous test files
    [db1Path, db2Path].forEach(file => {
        if (fs.existsSync(file)) {
            fs.unlinkSync(file);
        }
    });
    
    try {
        // Test 1: Create first database with specific data
        console.log('\n📊 Test 1: Creating Database 1...');
        const dbManager1 = new DatabaseManager(db1Path);
        await dbManager1.init();
        
        const graph1Data = {
            nodes: [
                { id: 'node1', x: 100, y: 100, label: 'DB1 Node 1', color: '#ff0000' },
                { id: 'node2', x: 200, y: 200, label: 'DB1 Node 2', color: '#00ff00' }
            ],
            edges: [
                { id: 'edge1', from: 'node1', to: 'node2', weight: 5 }
            ],
            metadata: { name: 'Database 1 Graph' }
        };
        
        await dbManager1.saveGraph(graph1Data);
        console.log('✅ Database 1 created with 2 nodes, 1 edge');
        
        // Verify Database 1 contents
        const db1Nodes = await getAllNodes(dbManager1);
        const db1Edges = await getAllEdges(dbManager1);
        console.log(`📊 DB1 verification: ${db1Nodes.length} nodes, ${db1Edges.length} edges`);
        
        // Test 2: Create second database with different data
        console.log('\n📊 Test 2: Creating Database 2...');
        const dbManager2 = new DatabaseManager(db2Path);
        await dbManager2.init();
        
        const graph2Data = {
            nodes: [
                { id: 'node3', x: 300, y: 300, label: 'DB2 Node 3', color: '#0000ff' },
                { id: 'node4', x: 400, y: 400, label: 'DB2 Node 4', color: '#ffff00' }
            ],
            edges: [
                { id: 'edge2', from: 'node3', to: 'node4', weight: 10 }
            ],
            metadata: { name: 'Database 2 Graph' }
        };
        
        await dbManager2.saveGraph(graph2Data);
        console.log('✅ Database 2 created with 2 nodes, 1 edge');
        
        // Verify Database 2 contents
        const db2Nodes = await getAllNodes(dbManager2);
        const db2Edges = await getAllEdges(dbManager2);
        console.log(`📊 DB2 verification: ${db2Nodes.length} nodes, ${db2Edges.length} edges`);
        
        // Test 3: Close both databases
        await dbManager1.close();
        await dbManager2.close();
        console.log('✅ Both databases closed');
        
        // Test 4: Reopen Database 1 and verify isolation
        console.log('\n🔍 Test 4: Reopening Database 1...');
        const dbManager1Reopen = new DatabaseManager(db1Path);
        await dbManager1Reopen.init();
        
        const loadedDb1Data = await dbManager1Reopen.loadGraph();
        console.log(`📊 DB1 after reopen: ${loadedDb1Data.nodes.length} nodes, ${loadedDb1Data.edges.length} edges`);
        
        // Check for contamination
        const db1Labels = loadedDb1Data.nodes.map(n => n.label);
        const hasDb2Data = db1Labels.some(label => label.includes('DB2'));
        console.log(`🔍 DB1 contamination check: ${hasDb2Data ? 'CONTAMINATED' : 'CLEAN'}`);
        
        // Test 5: Reopen Database 2 and verify isolation
        console.log('\n🔍 Test 5: Reopening Database 2...');
        const dbManager2Reopen = new DatabaseManager(db2Path);
        await dbManager2Reopen.init();
        
        const loadedDb2Data = await dbManager2Reopen.loadGraph();
        console.log(`📊 DB2 after reopen: ${loadedDb2Data.nodes.length} nodes, ${loadedDb2Data.edges.length} edges`);
        
        // Check for contamination
        const db2Labels = loadedDb2Data.nodes.map(n => n.label);
        const hasDb1Data = db2Labels.some(label => label.includes('DB1'));
        console.log(`🔍 DB2 contamination check: ${hasDb1Data ? 'CONTAMINATED' : 'CLEAN'}`);
        
        // Test 6: Switch between databases using same manager (critical test)
        console.log('\n🔍 Test 6: Switching databases with same manager...');
        const sharedManager = new DatabaseManager(db1Path);
        await sharedManager.init();
        
        // Load DB1
        const dataFromDb1 = await sharedManager.loadGraph();
        console.log(`📊 Shared manager - DB1: ${dataFromDb1.nodes.length} nodes`);
        
        // Switch to DB2
        await sharedManager.openFile(db2Path);
        const dataFromDb2 = await sharedManager.loadGraph();
        console.log(`📊 Shared manager - DB2: ${dataFromDb2.nodes.length} nodes`);
        
        // Switch back to DB1
        await sharedManager.openFile(db1Path);
        const dataFromDb1Again = await sharedManager.loadGraph();
        console.log(`📊 Shared manager - DB1 again: ${dataFromDb1Again.nodes.length} nodes`);
        
        // Verify no mixing
        const db1AgainLabels = dataFromDb1Again.nodes.map(n => n.label);
        const stillHasDb2Data = db1AgainLabels.some(label => label.includes('DB2'));
        console.log(`🔍 After switch-back contamination check: ${stillHasDb2Data ? 'CONTAMINATED' : 'CLEAN'}`);
        
        // Test 7: Save to DB1 after switching (this is where contamination might occur)
        console.log('\n🔍 Test 7: Saving to DB1 after DB2 operations...');
        const modifiedGraph1 = {
            ...dataFromDb1Again,
            nodes: [
                ...dataFromDb1Again.nodes,
                { id: 'node5', x: 500, y: 500, label: 'DB1 New Node 5', color: '#ff00ff' }
            ]
        };
        
        await sharedManager.saveGraph(modifiedGraph1);
        console.log(`📊 Modified DB1: ${modifiedGraph1.nodes.length} nodes`);
        
        // Verify DB1 only has its own data
        const finalDb1Check = await sharedManager.loadGraph();
        const finalDb1Labels = finalDb1Check.nodes.map(n => n.label);
        const contaminationAfterSave = finalDb1Labels.some(label => 
            label.includes('DB2') || label.includes('DB2 Node 3') || label.includes('DB2 Node 4')
        );
        console.log(`🔍 Final contamination check: ${contaminationAfterSave ? 'CONTAMINATED' : 'CLEAN'}`);
        
        await sharedManager.close();
        
        // Test 8: Direct file inspection
        console.log('\n🔍 Test 8: Direct file inspection...');
        
        const finalDb1Manager = new DatabaseManager(db1Path);
        await finalDb1Manager.init();
        const finalDb1AllNodes = await getAllNodes(finalDb1Manager);
        const finalDb1AllEdges = await getAllEdges(finalDb1Manager);
        console.log(`📊 Final DB1 inspection: ${finalDb1AllNodes.length} nodes, ${finalDb1AllEdges.length} edges`);
        
        const finalDb2Manager = new DatabaseManager(db2Path);
        await finalDb2Manager.init();
        const finalDb2AllNodes = await getAllNodes(finalDb2Manager);
        const finalDb2AllEdges = await getAllEdges(finalDb2Manager);
        console.log(`📊 Final DB2 inspection: ${finalDb2AllNodes.length} nodes, ${finalDb2AllEdges.length} edges`);
        
        await finalDb1Manager.close();
        await finalDb2Manager.close();
        
        // Summary
        console.log('\n📋 Test Summary:');
        const allTestsPassed = !hasDb2Data && !hasDb1Data && !stillHasDb2Data && !contaminationAfterSave;
        console.log(`🎯 Overall result: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ CONTAMINATION DETECTED'}`);
        
        if (!allTestsPassed) {
            console.log('🚨 CRITICAL: Database contamination confirmed!');
            console.log('   - Different database files are mixing their data');
            console.log('   - This violates file isolation principles');
            console.log('   - Immediate investigation required');
        }
        
    } catch (error) {
        console.error('❌ Test failed with error:', error);
        console.error(error.stack);
    } finally {
        // Clean up test files
        [db1Path, db2Path].forEach(file => {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
                console.log(`🧹 Cleaned up ${file}`);
            }
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

async function getAllEdges(dbManager) {
    return new Promise((resolve, reject) => {
        dbManager.db.all('SELECT * FROM edges', (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// Run the test
if (require.main === module) {
    testDataContamination();
}

module.exports = testDataContamination;