#!/usr/bin/env node

const IsolatedDatabaseManager = require('./database-isolated');
const fs = require('fs').promises;
const path = require('path');

async function migrateJSONToIsolatedSQLite() {
    console.log('🔍 Starting isolated JSON to SQLite migration...');
    
    const dbManager = new IsolatedDatabaseManager();
    await dbManager.init();
    
    try {
        // Get all JSON files in current directory
        const files = await fs.readdir('.');
        const jsonFiles = files.filter(file => 
            file.endsWith('.json') && 
            (file.includes('-graph-') || 
             file.includes('-test-') || 
             file.startsWith('graph-') || 
             file.includes('sample-'))
        );
        
        console.log(`📁 Found ${jsonFiles.length} JSON files to migrate:`, jsonFiles);
        
        let successCount = 0;
        let errorCount = 0;
        const results = [];
        
        for (const filename of jsonFiles) {
            try {
                console.log(`🔄 Processing ${filename}...`);
                
                const content = await fs.readFile(filename, 'utf8');
                const data = JSON.parse(content);
                
                // Validate graph structure
                if (!data || !Array.isArray(data.nodes)) {
                    console.warn(`⚠️  Skipping ${filename}: Invalid graph structure`);
                    errorCount++;
                    results.push({ filename, status: 'skipped', reason: 'Invalid structure' });
                    continue;
                }
                
                const graphId = filename.replace('.json', '');
                
                // Check if already migrated
                try {
                    const existing = await dbManager.loadGraph(graphId);
                    if (existing) {
                        console.log(`ℹ️  ${graphId}.db already exists, skipping`);
                        results.push({ filename, status: 'skipped', reason: 'Already exists' });
                        continue;
                    }
                } catch (err) {
                    // File doesn't exist, proceed with migration
                }
                
                // Ensure the data has proper structure
                const enrichedData = {
                    nodes: data.nodes || [],
                    edges: data.edges || [],
                    scale: data.scale || 1,
                    offset: data.offset || { x: 0, y: 0 },
                    metadata: {
                        name: data.metadata?.name || graphId,
                        description: data.metadata?.description || `Migrated from ${filename}`,
                        originalFilename: filename,
                        migratedAt: new Date().toISOString(),
                        ...data.metadata
                    }
                };
                
                await dbManager.importFromJSON(graphId, enrichedData);
                
                // Also create JSON file for direct browser loading
                const jsonFilename = `${graphId}.json`;
                await fs.writeFile(jsonFilename, JSON.stringify(enrichedData, null, 2));
                
                console.log(`✅ Migrated ${filename} -> ${graphId}.db + ${jsonFilename}`);
                successCount++;
                results.push({ filename, status: 'success', graphId });
                
            } catch (err) {
                console.error(`❌ Error migrating ${filename}:`, err.message);
                errorCount++;
                results.push({ filename, status: 'error', error: err.message });
            }
        }
        
        console.log(`\n📊 Migration Summary:`);
        console.log(`   ✅ Successful: ${successCount} files`);
        console.log(`   ❌ Failed: ${errorCount} files`);
        console.log(`   📁 Total processed: ${jsonFiles.length} files`);
        console.log(`   📄 JSON files created: ${successCount} files`);
        
        // Show detailed results
        console.log('\n📋 Detailed Results:');
        results.forEach(result => {
            const status = result.status === 'success' ? '✅' : 
                          result.status === 'skipped' ? '⏭️' : '❌';
            console.log(`   ${status} ${result.filename}: ${result.status}`);
            if (result.reason) console.log(`      ${result.reason}`);
        });
        
        // Show all graphs in isolated databases
        const graphs = await dbManager.listGraphs();
        console.log(`\n📂 Isolated databases created:`, graphs.map(g => ({
            id: g.id,
            name: g.name,
            nodes: g.nodeCount,
            edges: g.edgeCount,
            file: `${g.id}.db`
        })));
        
        // Verify migration by checking file sizes
        const dbFiles = await fs.readdir(dbManager.dataDir);
        const createdDbFiles = dbFiles.filter(f => f.endsWith('.db'));
        console.log(`\n📊 Database files created: ${createdDbFiles.length}`);
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await dbManager.closeAll();
    }
}

// Backup existing JSON files
async function backupJSONFiles() {
    console.log('📦 Creating backup of JSON files...');
    
    const backupDir = path.join(__dirname, 'backup-json');
    try {
        await fs.mkdir(backupDir, { recursive: true });
        
        const files = await fs.readdir('.');
        const jsonFiles = files.filter(file => 
            file.endsWith('.json') && 
            (file.includes('-graph-') || 
             file.includes('-test-') || 
             file.startsWith('graph-') || 
             file.includes('sample-'))
        );
        
        for (const filename of jsonFiles) {
            await fs.copyFile(
                path.join(__dirname, filename),
                path.join(backupDir, filename)
            );
        }
        
        console.log(`✅ Backed up ${jsonFiles.length} JSON files to ${backupDir}/`);
    } catch (error) {
        console.warn('⚠️  Could not create backup:', error.message);
    }
}

// Interactive migration with prompts
async function interactiveMigration() {
    console.log('\n🎯 Isolated SQLite Migration Tool');
    console.log('===================================');
    
    // Check if backup is needed
    const files = await fs.readdir('.');
    const jsonFiles = files.filter(file => 
        file.endsWith('.json') && 
        (file.includes('-graph-') || 
         file.includes('-test-') || 
         file.startsWith('graph-') || 
         file.includes('sample-'))
    );
    
    if (jsonFiles.length === 0) {
        console.log('❌ No JSON files found to migrate');
        return;
    }
    
    console.log(`\n📋 Found ${jsonFiles.length} JSON files:`);
    jsonFiles.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file}`);
    });
    
    console.log('\n🔄 Proceeding with migration...');
    
    // Create backup
    await backupJSONFiles();
    
    // Run migration
    await migrateJSONToIsolatedSQLite();
    
    console.log('\n🎉 Migration complete!');
    console.log('📊 Each graph is now stored in its own .db file');
    console.log('📁 Check ./data/ directory for the SQLite files');
}

// Run migration if called directly
if (require.main === module) {
    // Check for flags
    const args = process.argv.slice(2);
    
    if (args.includes('--backup')) {
        backupJSONFiles().catch(console.error);
    } else if (args.includes('--interactive')) {
        interactiveMigration().catch(console.error);
    } else if (args.includes('--file')) {
        const fileIndex = args.indexOf('--file');
        const filename = args[fileIndex + 1];
        if (filename) {
            migrateSingleFile(filename).catch(console.error);
        } else {
            console.error('❌ Please specify a filename with --file');
            process.exit(1);
        }
    } else {
        migrateJSONToIsolatedSQLite().catch(console.error);
    }
}

async function migrateSingleFile(filename) {
    console.log(`🎯 Migrating single file: ${filename}`);
    
    const dbManager = new IsolatedDatabaseManager();
    await dbManager.init();
    
    try {
        // Check if file exists
        await fs.access(filename);
        
        const content = await fs.readFile(filename, 'utf8');
        const data = JSON.parse(content);
        
        // Validate graph structure
        if (!data || !Array.isArray(data.nodes)) {
            console.error(`❌ Invalid graph structure in ${filename}`);
            process.exit(1);
        }
        
        const graphId = filename.replace('.json', '');
        
        // Check if already migrated
        try {
            const existing = await dbManager.loadGraph(graphId);
            if (existing) {
                console.log(`ℹ️  ${graphId}.db already exists`);
                return;
            }
        } catch (err) {
            // File doesn't exist, proceed
        }
        
        const enrichedData = {
            nodes: data.nodes || [],
            edges: data.edges || [],
            scale: data.scale || 1,
            offset: data.offset || { x: 0, y: 0 },
            metadata: {
                name: data.metadata?.name || graphId,
                description: data.metadata?.description || `Migrated from ${filename}`,
                originalFilename: filename,
                migratedAt: new Date().toISOString(),
                ...data.metadata
            }
        };
        
        await dbManager.importFromJSON(graphId, enrichedData);
        console.log(`✅ Successfully migrated ${filename} -> ${graphId}.db`);
        
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`❌ File not found: ${filename}`);
        } else {
            console.error(`❌ Error migrating ${filename}:`, error.message);
        }
        process.exit(1);
    } finally {
        await dbManager.closeAll();
    }
}

module.exports = {
    migrateJSONToIsolatedSQLite,
    backupJSONFiles,
    interactiveMigration,
    migrateSingleFile
};