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
        console.log('[DatabaseManager.openFile] Opening database file:', filePath);
        console.log('[DatabaseManager.openFile] Current dbPath before change:', this.dbPath);
        await this.close();
        this.dbPath = filePath;
        console.log('[DatabaseManager.openFile] Database path set to:', this.dbPath);
        const result = await this.init();
        console.log('[DatabaseManager.openFile] Database initialized successfully');
        return result;
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
                id BLOB PRIMARY KEY,
                x REAL NOT NULL,
                y REAL NOT NULL,
                label TEXT,
                chinese_label TEXT,
                color TEXT DEFAULT '#3b82f6',
                radius REAL DEFAULT 20,
                category TEXT,
                layers TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                modified_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const createEdgesTable = `
            CREATE TABLE IF NOT EXISTS edges (
                id BLOB PRIMARY KEY,
                from_node_id BLOB NOT NULL,
                to_node_id BLOB NOT NULL,
                weight REAL DEFAULT 1,
                category TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                modified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (from_node_id) REFERENCES nodes(id),
                FOREIGN KEY (to_node_id) REFERENCES nodes(id)
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
                    'CREATE INDEX IF NOT EXISTS idx_nodes_created ON nodes(created_at)',
                    'CREATE INDEX IF NOT EXISTS idx_edges_from_to ON edges(from_node_id, to_node_id)',
                    'CREATE INDEX IF NOT EXISTS idx_edges_created ON edges(created_at)'
                ];

                // Handle migration from old schema
                this.db.all("PRAGMA table_info(nodes)", (err, columns) => {
                    if (!err && columns.length > 0) {
                        const hasGraphId = columns.some(col => col.name === 'graph_id');
                        if (hasGraphId) {
                            console.log('Old database schema detected, dropping tables...');
                            // Drop old tables with graph_id columns
                            this.db.run('DROP TABLE IF EXISTS edges', (err) => {
                                if (err) console.warn('Error dropping edges table:', err);
                            });
                            this.db.run('DROP TABLE IF EXISTS nodes', (err) => {
                                if (err) console.warn('Error dropping nodes table:', err);
                            });
                            this.db.run('DROP TABLE IF EXISTS graphs', (err) => {
                                if (err) console.warn('Error dropping graphs table:', err);
                            });
                        }
                    }
                });

                // Add chinese_label column to existing nodes table if needed
                this.db.all("PRAGMA table_info(nodes)", (err, columns) => {
                    if (!err && columns.length > 0) {
                        const hasChineseLabel = columns.some(col => col.name === 'chinese_label');
                        if (!hasChineseLabel) {
                            this.db.run('ALTER TABLE nodes ADD COLUMN chinese_label TEXT', (err) => {
                                if (err) console.warn('Could not add chinese_label column:', err.message);
                            });
                        }
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

async saveGraph(data) {
        return new Promise((resolve, reject) => {
            const { nodes = [], edges = [], scale = 1, offset = { x: 0, y: 0 }, metadata = {} } = data;
            
            this.db.serialize(() => {
                this.db.run('BEGIN TRANSACTION');

                // Insert or update graph metadata
                const graphStmt = this.db.prepare(`
                    INSERT OR REPLACE INTO graphs (id, name, description, scale, offset_x, offset_y, metadata, modified_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                `);
                
                graphStmt.run(
                    Buffer.from('00000000-0000-0000-0000-000000000000', 'hex'), // Single graph ID
                    metadata.name || 'Graph',
                    metadata.description || '',
                    scale,
                    offset.x,
                    offset.y,
                    JSON.stringify(metadata)
                );
                graphStmt.finalize();

                // Clear existing data
                this.db.run('DELETE FROM nodes');
                this.db.run('DELETE FROM edges');

                // Insert nodes
                const nodeStmt = this.db.prepare(`
                    INSERT INTO nodes (id, x, y, label, chinese_label, color, radius, category, layers)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);
                
                nodes.forEach(node => {
                    const nodeId = node.id && node.id.length > 10 ? uuidToBuffer(node.id) : uuidToBuffer(uuidv7());
                    nodeStmt.run(
                        nodeId,
                        node.x,
                        node.y,
                        node.label || '',
                        node.chineseLabel || '',
                        node.color || '#3b82f6',
                        node.radius || 20,
                        node.category || null,
                        (node.layers || []).join(',')
                    );
                });
                nodeStmt.finalize();

                // Insert edges
                const edgeStmt = this.db.prepare(`
                    INSERT INTO edges (id, from_node_id, to_node_id, weight, category)
                    VALUES (?, ?, ?, ?, ?)
                `);
                
                edges.forEach(edge => {
                    const edgeId = edge.id && edge.id.length > 10 ? uuidToBuffer(edge.id) : uuidToBuffer(uuidv7());
                    edgeStmt.run(
                        edgeId,
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

    async loadGraph() {
        console.log('[DatabaseManager.loadGraph] Starting to load graph from:', this.dbPath);
        
        return new Promise((resolve, reject) => {
            // Load graph metadata
            console.log('[DatabaseManager.loadGraph] Loading graph metadata...');
            this.db.get('SELECT * FROM graphs WHERE id = ?', [Buffer.from('00000000-0000-0000-0000-000000000000', 'hex')], (err, graphRow) => {
                if (err) {
                    console.error('[DatabaseManager.loadGraph] Error loading graph metadata:', err);
                    reject(err);
                    return;
                }
                
                console.log('[DatabaseManager.loadGraph] Graph metadata row:', graphRow);
                const scale = graphRow ? graphRow.scale : 1;
                const offset = graphRow ? { x: graphRow.offset_x, y: graphRow.offset_y } : { x: 0, y: 0 };
                console.log('[DatabaseManager.loadGraph] Scale:', scale, 'Offset:', offset);

                // Load all nodes
                console.log('[DatabaseManager.loadGraph] Loading nodes...');
                this.db.all('SELECT * FROM nodes', (err, nodeRows) => {
                    if (err) {
                        console.error('[DatabaseManager.loadGraph] Error loading nodes:', err);
                        reject(err);
                        return;
                    }

                    console.log('[DatabaseManager.loadGraph] Found nodes:', nodeRows.length);
                    console.log('[DatabaseManager.loadGraph] Node rows:', nodeRows);

                    // Load all edges
                    console.log('[DatabaseManager.loadGraph] Loading edges...');
                    this.db.all('SELECT * FROM edges', (err, edgeRows) => {
                        if (err) {
                            console.error('[DatabaseManager.loadGraph] Error loading edges:', err);
                            reject(err);
                            return;
                        }

                        console.log('[DatabaseManager.loadGraph] Found edges:', edgeRows.length);
                        console.log('[DatabaseManager.loadGraph] Edge rows:', edgeRows);

                        const nodes = nodeRows.map(row => {
                            const node = {
                                id: bufferToUuid(row.id),
                                x: row.x,
                                y: row.y,
                                label: row.label,
                                chineseLabel: row.chinese_label || '',
                                color: row.color,
                                radius: row.radius,
                                category: row.category,
                                layers: row.layers ? row.layers.split(',').map(l => l.trim()).filter(l => l) : []
                            };
                            console.log('[DatabaseManager.loadGraph] Processed node:', node);
                            return node;
                        });

                        const edges = edgeRows.map(row => {
                            const edge = {
                                id: bufferToUuid(row.id),
                                from: bufferToUuid(row.from_node_id),
                                to: bufferToUuid(row.to_node_id),
                                weight: row.weight,
                                category: row.category
                            };
                            console.log('[DatabaseManager.loadGraph] Processed edge:', edge);
                            return edge;
                        });

                        const data = {
                            nodes,
                            edges,
                            scale,
                            offset
                        };

                        console.log('[DatabaseManager.loadGraph] Final data:', data);
                        console.log('[DatabaseManager.loadGraph] Nodes count:', nodes.length, 'Edges count:', edges.length);
                        resolve(data);
                    });
                });
            });
        });
    }

    async listGraphs() {
        console.log('[DatabaseManager.listGraphs] Listing graphs from:', this.dbPath);
        
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
                    (SELECT COUNT(*) FROM nodes) as node_count,
                    (SELECT COUNT(*) FROM edges) as edge_count
                FROM graphs
                ORDER BY modified_at DESC
            `;

            console.log('[DatabaseManager.listGraphs] Executing query:', query);
            this.db.all(query, (err, rows) => {
                if (err) {
                    console.error('[DatabaseManager.listGraphs] Error listing graphs:', err);
                    reject(err);
                } else {
                    console.log('[DatabaseManager.listGraphs] Found graphs:', rows.length);
                    console.log('[DatabaseManager.listGraphs] Raw rows:', rows);
                    
                    const graphs = rows.map(row => {
                        const graph = {
                            id: bufferToUuid(row.id),
                            name: row.name,
                            description: row.description || '',
                            nodeCount: row.node_count,
                            edgeCount: row.edge_count,
                            lastModified: new Date(row.modified_at),
                            created: new Date(row.created_at)
                        };
                        console.log('[DatabaseManager.listGraphs] Processed graph:', graph);
                        return graph;
                    });
                    
                    console.log('[DatabaseManager.listGraphs] Final graphs:', graphs);
                    resolve(graphs);
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