const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

class IsolatedDatabaseManager {
    constructor(dataDir = path.join(__dirname, 'data')) {
        this.dataDir = dataDir;
        this.connections = new Map(); // Cache database connections
    }

    async init() {
        await this.ensureDataDir();
        console.log('📁 Isolated database manager initialized');
    }

    async ensureDataDir() {
        try {
            await fs.access(this.dataDir);
        } catch {
            await fs.mkdir(this.dataDir, { recursive: true });
        }
    }

    getDbPath(graphId) {
        return path.join(this.dataDir, `${graphId}.db`);
    }

    async getConnection(graphId) {
        if (this.connections.has(graphId)) {
            return this.connections.get(graphId);
        }

        const dbPath = this.getDbPath(graphId);
        const db = new sqlite3.Database(dbPath);
        
        await this.createTables(db);
        this.connections.set(graphId, db);
        
        return db;
    }

    async createTables(db) {
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run(`
                    CREATE TABLE IF NOT EXISTS metadata (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        description TEXT,
                        scale REAL DEFAULT 1.0,
                        offset_x REAL DEFAULT 0,
                        offset_y REAL DEFAULT 0,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `);

                db.run(`
                    CREATE TABLE IF NOT EXISTS nodes (
                        id TEXT PRIMARY KEY,
                        x REAL NOT NULL,
                        y REAL NOT NULL,
                        label TEXT,
                        color TEXT DEFAULT '#3b82f6',
                        radius REAL DEFAULT 20,
                        category TEXT
                    )
                `);

                db.run(`
                    CREATE TABLE IF NOT EXISTS edges (
                        id TEXT PRIMARY KEY,
                        from_node_id TEXT NOT NULL,
                        to_node_id TEXT NOT NULL,
                        weight REAL DEFAULT 1,
                        category TEXT
                    )
                `);

                db.run('PRAGMA foreign_keys = ON', (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });
    }

    async saveGraph(graphId, data) {
        const db = await this.getConnection(graphId);
        
        return new Promise((resolve, reject) => {
            const { nodes = [], edges = [], scale = 1, offset = { x: 0, y: 0 }, metadata = {} } = data;
            
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');

                // Clear existing data
                db.run('DELETE FROM metadata');
                db.run('DELETE FROM nodes');
                db.run('DELETE FROM edges');

                // Insert metadata
                const metaStmt = db.prepare(`
                    INSERT INTO metadata (id, name, description, scale, offset_x, offset_y, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                `);
                
                metaStmt.run(
                    graphId,
                    metadata.name || graphId,
                    metadata.description || '',
                    scale,
                    offset.x,
                    offset.y
                );
                metaStmt.finalize();

                // Insert nodes
                const nodeStmt = db.prepare(`
                    INSERT INTO nodes (id, x, y, label, color, radius, category)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `);
                
                nodes.forEach(node => {
                    nodeStmt.run(
                        String(node.id),
                        node.x,
                        node.y,
                        node.label || '',
                        node.color || '#3b82f6',
                        node.radius || 20,
                        node.category || null
                    );
                });
                nodeStmt.finalize();

                // Insert edges
                const edgeStmt = db.prepare(`
                    INSERT INTO edges (id, from_node_id, to_node_id, weight, category)
                    VALUES (?, ?, ?, ?, ?)
                `);
                
                edges.forEach(edge => {
                    edgeStmt.run(
                        String(edge.id),
                        String(edge.from),
                        String(edge.to),
                        edge.weight || 1,
                        edge.category || null
                    );
                });
                edgeStmt.finalize();

                db.run('COMMIT', (err) => {
                    if (err) {
                        db.run('ROLLBACK');
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        });
    }

    async loadGraph(graphId) {
        const db = await this.getConnection(graphId);
        
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM metadata', (err, metadataRow) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (!metadataRow) {
                    resolve(null);
                    return;
                }

                db.all('SELECT * FROM nodes', (err, nodeRows) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    db.all('SELECT * FROM edges', (err, edgeRows) => {
                        if (err) {
                            reject(err);
                            return;
                        }

                        const nodes = nodeRows.map(row => ({
                            id: row.id,
                            x: row.x,
                            y: row.y,
                            label: row.label,
                            color: row.color,
                            radius: row.radius,
                            category: row.category
                        }));

                        const edges = edgeRows.map(row => ({
                            id: row.id,
                            from: row.from_node_id,
                            to: row.to_node_id,
                            weight: row.weight,
                            category: row.category
                        }));

                        const data = {
                            format: 'graph-data-v1',
                            timestamp: new Date().toISOString(),
                            metadata: {
                                name: metadataRow.name,
                                description: metadataRow.description,
                                created: metadataRow.created_at,
                                lastModified: metadataRow.updated_at
                            },
                            nodes,
                            edges,
                            scale: metadataRow.scale,
                            offset: {
                                x: metadataRow.offset_x,
                                y: metadataRow.offset_y
                            }
                        };

                        resolve(data);
                    });
                });
            });
        });
    }

    async listGraphs() {
        const files = await fs.readdir(this.dataDir);
        const dbFiles = files.filter(file => file.endsWith('.db'));
        
        const graphs = [];
        
        for (const dbFile of dbFiles) {
            try {
                const graphId = dbFile.replace('.db', '');
                const stat = await fs.stat(path.join(this.dataDir, dbFile));
                
                // Load basic info without reading full data
                const graph = await this.loadGraph(graphId);
                if (graph) {
                    graphs.push({
                        id: graphId,
                        name: graph.metadata?.name || graphId,
                        description: graph.metadata?.description || '',
                        created: graph.metadata?.created || stat.birthtime,
                        lastModified: graph.metadata?.lastModified || stat.mtime,
                        nodeCount: graph.nodes?.length || 0,
                        edgeCount: graph.edges?.length || 0,
                        size: stat.size
                    });
                }
            } catch (err) {
                console.warn(`Error reading graph ${dbFile}:`, err.message);
            }
        }
        
        return graphs.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
    }

    async deleteGraph(graphId) {
        const dbPath = this.getDbPath(graphId);
        
        try {
            await fs.unlink(dbPath);
            
            // Remove from cache
            if (this.connections.has(graphId)) {
                this.connections.get(graphId).close();
                this.connections.delete(graphId);
            }
            
            return true;
        } catch (err) {
            if (err.code === 'ENOENT') {
                return false; // File didn't exist
            }
            throw err;
        }
    }

    async exportToJSON(graphId) {
        return await this.loadGraph(graphId);
    }

    async importFromJSON(graphId, data) {
        // Ensure the data has the expected structure
        const normalizedData = {
            nodes: data.nodes || [],
            edges: data.edges || [],
            scale: data.scale || 1,
            offset: data.offset || { x: 0, y: 0 },
            metadata: {
                name: data.metadata?.name || graphId,
                description: data.metadata?.description || 'Imported from JSON',
                importedAt: new Date().toISOString(),
                ...data.metadata
            }
        };

        await this.saveGraph(graphId, normalizedData);
        return graphId;
    }

    async migrateFromJSONFiles() {
        console.log('🔍 Starting isolated JSON to SQLite migration...');
        
        const files = await fs.readdir('.');
        const jsonFiles = files.filter(file => 
            file.endsWith('.json') && 
            (file.includes('-graph-') || file.includes('-test-') || file.startsWith('graph-'))
        );
        
        console.log(`📁 Found ${jsonFiles.length} JSON files to migrate:`, jsonFiles);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const filename of jsonFiles) {
            try {
                console.log(`🔄 Processing ${filename}...`);
                
                const content = await fs.readFile(filename, 'utf8');
                const data = JSON.parse(content);
                
                if (!data || !Array.isArray(data.nodes)) {
                    console.warn(`⚠️  Skipping ${filename}: Invalid graph structure`);
                    errorCount++;
                    continue;
                }
                
                const graphId = filename.replace('.json', '');
                await this.importFromJSON(graphId, data);
                
                console.log(`✅ Migrated ${filename} -> ${graphId}.db`);
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
        
        const graphs = await this.listGraphs();
        console.log(`\n📋 Graphs now in isolated databases:`, graphs.map(g => ({
            id: g.id,
            name: g.name,
            nodes: g.nodeCount,
            edges: g.edgeCount
        })));
    }

    async closeGraph(graphId) {
        if (this.connections.has(graphId)) {
            return new Promise((resolve) => {
                this.connections.get(graphId).close(() => {
                    this.connections.delete(graphId);
                    resolve();
                });
            });
        }
    }

    async closeAll() {
        const promises = Array.from(this.connections.keys()).map(id => this.closeGraph(id));
        await Promise.all(promises);
    }
}

module.exports = IsolatedDatabaseManager;