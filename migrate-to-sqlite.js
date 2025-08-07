#!/usr/bin/env node

const DatabaseManager = require('./database-manager');
const fs = require('fs').promises;
const path = require('path');

async function migrateAllJSONFiles() {
    console.log('🔍 Starting JSON to SQLite migration...');
    
    const dbManager = new DatabaseManager();
    await dbManager.init();
    
    try {
        // Get all JSON files in current directory
        const files = await fs.readdir('.');
        const jsonFiles = files.filter(file => 
            file.endsWith('.json') && (file.includes('-graph-') || file.includes('-test-') || file.startsWith('graph-'))
        );
        
        console.log(`📁 Found ${jsonFiles.length} JSON files to migrate:`, jsonFiles);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const filename of jsonFiles) {
            try {
                console.log(`🔄 Processing ${filename}...`);
                
                const content = await fs.readFile(filename, 'utf8');
                const data = JSON.parse(content);
                
                // Validate graph structure
                if (!data || !Array.isArray(data.nodes)) {
                    console.warn(`⚠️  Skipping ${filename}: Invalid graph structure`);
                    errorCount++;
                    continue;
                }
                
                // Use filename without extension as ID
                const id = filename.replace('.json', '');
                
                // Ensure metadata exists
                const enrichedData = {
                    ...data,
                    metadata: {
                        name: data.metadata?.name || id,
                        description: data.metadata?.description || `Migrated from ${filename}`,
                        originalFilename: filename,
                        migratedAt: new Date().toISOString(),
                        ...data.metadata
                    }
                };
                
                await dbManager.saveGraph(id, enrichedData);
                console.log(`✅ Migrated ${filename} -> graph ID: ${id}`);
                successCount++;
                
            } catch (err) {
                console.error(`❌ Error migrating ${filename}:`, err.message);
                errorCount++;
            }
        }
        
        console.log(`\n📊 Migration Summary:`);
        console.log(`   ✅ Successful: ${successCount} files`);
        console.log(`   ❌ Failed: ${errorCount} files`);
        console.log(`   📁 Total processed: ${jsonFiles.length} files`);
        
        // Show all graphs in database
        const graphs = await dbManager.listGraphs();
        console.log(`\n📋 Graphs now in database:`, graphs.map(g => ({
            id: g.id,
            name: g.name,
            nodes: g.nodeCount,
            edges: g.edgeCount
        })));
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await dbManager.close();
    }
}

// Run migration if called directly
if (require.main === module) {
    migrateAllJSONFiles().catch(console.error);
}

module.exports = migrateAllJSONFiles;