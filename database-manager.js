const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;
const { v7: uuidv7 } = require('uuid');

// UUID conversion utilities for binary storage
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

class DatabaseManager {
    constructor(dbPath = path.join(__dirname, 'data', 'graph.db')) {
        this.dbPath = dbPath;
        this.db = null;
    }

    async openFile(filePath) {
        console.log('Opening database file:', filePath);
        await this.close();
        this.dbPath = filePath;
        console.log('Database path set to:', this.dbPath);
        return await this.init();
    }

    async init() {
        await this.ensureDataDir();
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    this.createTables()
                        .then(() => resolve(this))
                        .catch(reject);
                }
            });
        });
    }

    async createTables() {
        const createGraphsTable = `
            CREATE TABLE IF NOT EXISTS graphs (
                id BLOB PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                scale REAL DEFAULT 1.0,
                offset_x REAL DEFAULT 0,
                offset_y REAL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                modified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                metadata TEXT
            )
        `;

        const createNodesTable = `
            CREATE TABLE IF NOT EXISTS nodes (
                id BLOB NOT NULL,
                graph_id BLOB NOT NULL,
                x REAL NOT NULL,
                y REAL NOT NULL,
                label TEXT,
                chinese_label TEXT,
                color TEXT DEFAULT '#3b82f6',
                radius REAL DEFAULT 20,
                category TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                modified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id, graph_id),
                FOREIGN KEY (graph_id) REFERENCES graphs(id) ON DELETE CASCADE
            )
        `;

        const createEdgesTable = `
            CREATE TABLE IF NOT EXISTS edges (
                id BLOB NOT NULL,
                graph_id BLOB NOT NULL,
                from_node_id BLOB NOT NULL,
                to_node_id BLOB NOT NULL,
                weight REAL DEFAULT 1,
                category TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                modified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id, graph_id),
                FOREIGN KEY (graph_id) REFERENCES graphs(id) ON DELETE CASCADE,
                FOREIGN KEY (from_node_id, graph_id) REFERENCES nodes(id, graph_id),
                FOREIGN KEY (to_node_id, graph_id) REFERENCES nodes(id, graph_id)
            )
        `;

        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run(createGraphsTable, (err) => {
                    if (err) reject(err);
                });
                this.db.run(createNodesTable, (err) => {
                    if (err) reject(err);
                });
                this.db.run(createEdgesTable, (err) => {
                    if (err) reject(err);
                });

                // Create indexes for performance optimization
                const createIndexes = [
                    'CREATE INDEX IF NOT EXISTS idx_nodes_graph_id ON nodes(graph_id)',
                    'CREATE INDEX IF NOT EXISTS idx_nodes_created ON nodes(created_at)',
                    'CREATE INDEX IF NOT EXISTS idx_edges_graph_id ON edges(graph_id)',
                    'CREATE INDEX IF NOT EXISTS idx_edges_from_to ON edges(from_node_id, to_node_id)',
                    'CREATE INDEX IF NOT EXISTS idx_edges_created ON edges(created_at)'
                ];

                // Migrate existing database - add chinese_label column if it doesn't exist
                this.db.get("PRAGMA table_info(nodes)", (err, rows) => {
                    if (!err) {
                        this.db.all("PRAGMA table_info(nodes)", (err, columns) => {
                            const hasChineseLabel = columns.some(col => col.name === 'chinese_label');
                            if (!hasChineseLabel) {
                                this.db.run('ALTER TABLE nodes ADD COLUMN chinese_label TEXT', (err) => {
                                    if (err) console.warn('Could not add chinese_label column:', err.message);
                                });
                            }
                        });
                    }
                });

                createIndexes.forEach((sql, index) => {
                    this.db.run(sql, (err) => {
                        if (err) reject(err);
                        else if (index === createIndexes.length - 1) resolve();
                    });
                });
            });
        });
    }

    async ensureDataDir() {
        const dataDir = path.dirname(this.dbPath);
        try {
            await fs.access(dataDir);
        } catch {
            await fs.mkdir(dataDir, { recursive: true });
        }
    }

    async saveGraph(id, data) {
        return new Promise((resolve, reject) => {
            const { nodes = [], edges = [], scale = 1, offset = { x: 0, y: 0 }, metadata = {} } = data;
            
            this.db.serialize(() => {
                this.db.run('BEGIN TRANSACTION');

                // Insert or update graph
                const graphStmt = this.db.prepare(`
                    INSERT OR REPLACE INTO graphs (id, name, description, scale, offset_x, offset_y, metadata, modified_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                `);
                
                graphStmt.run(
                    uuidToBuffer(id), // Convert UUID string to binary (16 bytes)
                    metadata.name || String(id),
                    metadata.description || '',
                    scale,
                    offset.x,
                    offset.y,
                    JSON.stringify(metadata)
                );
                graphStmt.finalize();

                // Delete existing nodes and edges for this graph
                this.db.run('DELETE FROM nodes WHERE graph_id = ?', [uuidToBuffer(id)]);
                this.db.run('DELETE FROM edges WHERE graph_id = ?', [uuidToBuffer(id)]);

                // Insert nodes
                const nodeStmt = this.db.prepare(`
                    INSERT INTO nodes (id, graph_id, x, y, label, chinese_label, color, radius, category)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);
                
                nodes.forEach(node => {
                    const nodeId = node.id && node.id.length > 10 ? uuidToBuffer(node.id) : uuidToBuffer(uuidv7());
                    nodeStmt.run(
                        nodeId,
                        uuidToBuffer(id),
                        node.x,
                        node.y,
                        node.label || '',
                        node.chineseLabel || '',
                        node.color || '#3b82f6',
                        node.radius || 20,
                        node.category || null
                    );
                });
                nodeStmt.finalize();

                // Insert edges
                const edgeStmt = this.db.prepare(`
                    INSERT INTO edges (id, graph_id, from_node_id, to_node_id, weight, category)
                    VALUES (?, ?, ?, ?, ?, ?)
                `);
                
                edges.forEach(edge => {
                    const edgeId = edge.id && edge.id.length > 10 ? uuidToBuffer(edge.id) : uuidToBuffer(uuidv7());
                    edgeStmt.run(
                        edgeId,
                        uuidToBuffer(id),
                        uuidToBuffer(String(edge.from)),
                        uuidToBuffer(String(edge.to)),
                        edge.weight || 1,
                        edge.category || null
                    );
                });
                edgeStmt.finalize();

                this.db.run('COMMIT', (err) => {
                    if (err) {
                        this.db.run('ROLLBACK');
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        });
    }

    async loadGraph(id) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM graphs WHERE id = ?', [uuidToBuffer(id)], (err, graphRow) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (!graphRow) {
                    resolve(null);
                    return;
                }

                // Load nodes
                this.db.all('SELECT * FROM nodes WHERE graph_id = ?', [uuidToBuffer(id)], (err, nodeRows) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    // Load edges
                    this.db.all('SELECT * FROM edges WHERE graph_id = ?', [uuidToBuffer(id)], (err, edgeRows) => {
                        if (err) {
                            reject(err);
                            return;
                        }

                        const nodes = nodeRows.map(row => ({
                            id: bufferToUuid(row.id),
                            x: row.x,
                            y: row.y,
                            label: row.label,
                            chineseLabel: row.chinese_label || '',
                            color: row.color,
                            radius: row.radius,
                            category: row.category
                        }));

                        const edges = edgeRows.map(row => ({
                            id: bufferToUuid(row.id),
                            from: bufferToUuid(row.from_node_id),
                            to: bufferToUuid(row.to_node_id),
                            weight: row.weight,
                            category: row.category
                        }));

                        const data = {
                            nodes,
                            edges,
                            scale: graphRow.scale,
                            offset: {
                                x: graphRow.offset_x,
                                y: graphRow.offset_y
                            }
                        };

                        resolve(data);
                    });
                });
            });
        });
    }

    async listGraphs() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    id,
                    name,
                    description,
                    scale,
                    offset_x,
                    offset_y,
                    created_at,
                    modified_at,
                    metadata,
                    (SELECT COUNT(*) FROM nodes WHERE graph_id = g.id) as node_count,
                    (SELECT COUNT(*) FROM edges WHERE graph_id = g.id) as edge_count
                FROM graphs g
                ORDER BY modified_at DESC
            `;

            this.db.all(query, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const graphs = rows.map(row => ({
                        id: bufferToUuid(row.id),
                        name: row.name,
                        description: row.description || '',
                        nodeCount: row.node_count,
                        edgeCount: row.edge_count,
                        lastModified: new Date(row.modified_at),
                        created: new Date(row.created_at)
                    }));
                    resolve(graphs);
                }
            });
        });
    }

    async deleteGraph(id) {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM graphs WHERE id = ?', [uuidToBuffer(id)], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            });
        });
    }

    async importFromJSON(data, id = null) {
        // Use provided ID or generate one
        const finalId = id || uuidv7();
        
        // Ensure the data has the expected structure
        const normalizedData = {
            nodes: data.nodes || [],
            edges: data.edges || [],
            scale: data.scale || 1,
            offset: data.offset || { x: 0, y: 0 },
            metadata: {
                name: data.name || data.metadata?.name || 'Imported Graph',
                description: data.description || data.metadata?.description || 'Imported from JSON',
                importedAt: new Date().toISOString(),
                ...data.metadata
            }
        };

        await this.saveGraph(finalId, normalizedData);
        return finalId;
    }

    async exportToJSON(id) {
        return await this.loadGraph(id);
    }

    async migrateFromJSONFiles() {
        try {
            const files = await fs.readdir('.');
            const jsonFiles = files.filter(file => file.endsWith('.json') && file.includes('-graph-') || file.includes('-test-'));
            
            for (const filename of jsonFiles) {
                try {
                    const content = await fs.readFile(filename, 'utf8');
                    const data = JSON.parse(content);
                    
                    // Skip if it's not a valid graph format
                    if (!data.nodes || !Array.isArray(data.nodes)) continue;
                    
                    const id = filename.replace('.json', '');
                    await this.saveGraph(id, data);
                    console.log(`Migrated ${filename}`);
                } catch (err) {
                    console.error(`Error migrating ${filename}:`, err.message);
                }
            }
            
            console.log('Migration completed');
        } catch (err) {
            console.error('Error during migration:', err.message);
        }
    }

    async close() {
        return new Promise((resolve) => {
            if (this.db) {
                this.db.close(() => resolve());
            } else {
                resolve();
            }
        });
    }
}

module.exports = DatabaseManager;