const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs").promises;
const { v7: uuidv7 } = require("uuid");

/**
 * Database Connection Management & UPSERT Logic
 *
 * The issue was not with UPSERT logic itself, but with connection management.
 * Each database file should maintain its own connection, and connections should
 * be properly closed before switching to new files.
 *
 * CORRECTED APPROACH:
 * - Proper connection management in openFile() to prevent data mixing
 * - UPSERT with field-level change detection to preserve timestamps correctly
 * - Each database maintains its own state without cross-contamination
 */

// UUID conversion utilities for binary storage
function uuidToBuffer(uuid) {
  if (!uuid) return null;

  try {
    // If it's a valid UUID (with hyphens and proper length), convert it
    if (uuid.includes("-") && uuid.length === 36) {
      const hex = uuid.replace(/-/g, "");
      return Buffer.from(hex, "hex");
    }
  } catch (e) {
    // Fall through to string handling
  }

  // For string IDs, create a deterministic 16-byte buffer
  const crypto = require("crypto");
  const hash = crypto.createHash("md5");
  hash.update(String(uuid));
  return hash.digest(); // 16 bytes
}

function bufferToUuid(buffer) {
  if (!buffer || buffer.length !== 16) return null;
  const hex = buffer.toString("hex");
  return `${hex.substr(0, 8)}-${hex.substr(8, 4)}-${hex.substr(12, 4)}-${hex.substr(16, 4)}-${hex.substr(20, 12)}`;
}

class DatabaseManager {
  constructor(dbPath = path.join(__dirname, "data", "graph.db")) {
    this.dbPath = dbPath;
    this.db = null;
  }

  async openFile(filePath) {
    console.log("[DatabaseManager.openFile] Opening database file:", filePath);
    console.log(
      "[DatabaseManager.openFile] Current dbPath before change:",
      this.dbPath,
    );

    // Ensure previous connection is properly closed and wait for completion
    await this.close();
    
    // Force garbage collection of old connection
    if (this.db) {
      console.warn("[DatabaseManager.openFile] Database connection still exists after close!");
    }

    // Reset database instance to ensure clean state
    this.db = null;

    // Update the database path
    this.dbPath = filePath;
    console.log(
      "[DatabaseManager.openFile] Database path set to:",
      this.dbPath,
    );

    // Initialize new connection
    const result = await this.init();
    console.log("[DatabaseManager.openFile] Database initialized successfully, path:", this.dbPath);
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
          "CREATE INDEX IF NOT EXISTS idx_nodes_created ON nodes(created_at)",
          "CREATE INDEX IF NOT EXISTS idx_edges_from_to ON edges(from_node_id, to_node_id)",
          "CREATE INDEX IF NOT EXISTS idx_edges_created ON edges(created_at)",
        ];

        // Handle migration from old schema
        this.db.all("PRAGMA table_info(nodes)", (err, columns) => {
          if (!err && columns.length > 0) {
            const hasGraphId = columns.some((col) => col.name === "graph_id");
            if (hasGraphId) {
              console.log("Old database schema detected, dropping tables...");
              // Drop old tables with graph_id columns
              this.db.run("DROP TABLE IF EXISTS edges", (err) => {
                if (err) console.warn("Error dropping edges table:", err);
              });
              this.db.run("DROP TABLE IF EXISTS nodes", (err) => {
                if (err) console.warn("Error dropping nodes table:", err);
              });
              this.db.run("DROP TABLE IF EXISTS graphs", (err) => {
                if (err) console.warn("Error dropping graphs table:", err);
              });
            }
          }
        });

        // Add chinese_label column to existing nodes table if needed
        this.db.all("PRAGMA table_info(nodes)", (err, columns) => {
          if (!err && columns.length > 0) {
            const hasChineseLabel = columns.some(
              (col) => col.name === "chinese_label",
            );
            if (!hasChineseLabel) {
              this.db.run(
                "ALTER TABLE nodes ADD COLUMN chinese_label TEXT",
                (err) => {
                  if (err)
                    console.warn(
                      "Could not add chinese_label column:",
                      err.message,
                    );
                },
              );
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
    const {
      nodes = [],
      edges = [],
      scale = 1,
      offset = { x: 0, y: 0 },
      metadata = {},
    } = data;

    try {
      return new Promise((resolve, reject) => {
        this.db.serialize(() => {
          // Debug timezone info
          console.log("[DEBUG] saveGraph called");
          console.log(
            "[DEBUG] Local timezone offset:",
            new Date().getTimezoneOffset(),
          );
          console.log("[DEBUG] Local time:", new Date().toString());
          console.log("[DEBUG] UTC time:", new Date().toUTCString());

          // Debug SQLite timezone
          this.db.get(
            "SELECT datetime('now') as utc_time, datetime('now', 'localtime') as local_time, strftime('%Z') as timezone",
            (err, row) => {
              if (!err) {
                console.log("[DEBUG] SQLite UTC time:", row.utc_time);
                console.log("[DEBUG] SQLite local time:", row.local_time);
                console.log("[DEBUG] SQLite timezone:", row.timezone);
              }
            },
          );
          this.db.run("BEGIN TRANSACTION");

          try {
            const graphId = Buffer.from(
              "00000000-0000-0000-0000-000000000000",
              "hex",
            );

            // UPSERT graph metadata with change detection
            this.db.run(
              `
                        INSERT INTO graphs (id, name, description, scale, offset_x, offset_y, metadata, created_at, modified_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))
                        ON CONFLICT(id) DO UPDATE SET
                            name = CASE
                                WHEN graphs.name != excluded.name THEN excluded.name
                                ELSE graphs.name
                            END,
                            description = CASE
                                WHEN graphs.description != excluded.description THEN excluded.description
                                ELSE graphs.description
                            END,
                            scale = CASE
                                WHEN graphs.scale != excluded.scale THEN excluded.scale
                                ELSE graphs.scale
                            END,
                            offset_x = CASE
                                WHEN graphs.offset_x != excluded.offset_x THEN excluded.offset_x
                                ELSE graphs.offset_x
                            END,
                            offset_y = CASE
                                WHEN graphs.offset_y != excluded.offset_y THEN excluded.offset_y
                                ELSE graphs.offset_y
                            END,
                            metadata = CASE
                                WHEN graphs.metadata != excluded.metadata THEN excluded.metadata
                                ELSE graphs.metadata
                            END,
                            modified_at = CASE
                                WHEN graphs.name != excluded.name OR
                                     graphs.description != excluded.description OR
                                     graphs.scale != excluded.scale OR
                                     graphs.offset_x != excluded.offset_x OR
                                     graphs.offset_y != excluded.offset_y OR
                                     graphs.metadata != excluded.metadata
                                THEN datetime('now', 'localtime')
                                ELSE graphs.modified_at
                            END
                    `,
              [
                graphId,
                metadata.name || "Graph",
                metadata.description || "",
                scale,
                offset.x,
                offset.y,
                JSON.stringify(metadata),
              ],
            );

            // Process nodes with UPSERT - always use same logic
            for (const node of nodes) {
              const nodeId = node.id
                ? uuidToBuffer(node.id)
                : uuidToBuffer(uuidv7());

              // Check if this node exists to preserve created_at
              this.db.get(
                "SELECT created_at FROM nodes WHERE id = ?",
                [nodeId],
                (err, existingRow) => {
                  // Use COALESCE to preserve existing timestamp, or use current local time for new records
                  const createdAtSQL = existingRow
                    ? "COALESCE((SELECT created_at FROM nodes WHERE id = ?), datetime('now', 'localtime'))"
                    : "datetime('now', 'localtime')";

                  // console.log(`[DEBUG] Node ${bufferToUuid(nodeId)} - existing created_at:`, existingRow?.created_at);

                  // Build parameter list based on whether we have existing row
                  let params, sql;
                  if (existingRow) {
                    sql = `
                                INSERT INTO nodes (id, x, y, label, chinese_label, color, radius, category, layers, created_at, modified_at)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ${createdAtSQL}, datetime('now', 'localtime'))
                                ON CONFLICT(id) DO UPDATE SET
                                    x = CASE
                                        WHEN nodes.x != excluded.x THEN excluded.x
                                        ELSE nodes.x
                                    END,
                                    y = CASE
                                        WHEN nodes.y != excluded.y THEN excluded.y
                                        ELSE nodes.y
                                    END,
                                    label = CASE
                                        WHEN nodes.label != excluded.label THEN excluded.label
                                        ELSE nodes.label
                                    END,
                                    chinese_label = CASE
                                        WHEN nodes.chinese_label != excluded.chinese_label THEN excluded.chinese_label
                                        ELSE nodes.chinese_label
                                    END,
                                    color = CASE
                                        WHEN nodes.color != excluded.color THEN excluded.color
                                        ELSE nodes.color
                                    END,
                                    radius = CASE
                                        WHEN nodes.radius != excluded.radius THEN excluded.radius
                                        ELSE nodes.radius
                                    END,
                                    category = CASE
                                        WHEN nodes.category != excluded.category THEN excluded.category
                                        ELSE nodes.category
                                    END,
                                    layers = CASE
                                        WHEN nodes.layers != excluded.layers THEN excluded.layers
                                        ELSE nodes.layers
                                    END,
                                    modified_at = CASE
                                        WHEN nodes.x != excluded.x OR
                                             nodes.y != excluded.y OR
                                             nodes.label != excluded.label OR
                                             nodes.chinese_label != excluded.chinese_label OR
                                             nodes.color != excluded.color OR
                                             nodes.radius != excluded.radius OR
                                             nodes.category != excluded.category OR
                                             nodes.layers != excluded.layers
                                        THEN datetime('now', 'localtime')
                                        ELSE nodes.modified_at
                                    END
                            `;
                    params = [
                      nodeId,
                      node.x,
                      node.y,
                      node.label || "",
                      node.chineseLabel || "",
                      node.color || "#3b82f6",
                      node.radius || 20,
                      node.category || null,
                      (node.layers || []).join(","),
                      nodeId, // For the COALESCE subquery
                    ];
                  } else {
                    sql = `
                                INSERT INTO nodes (id, x, y, label, chinese_label, color, radius, category, layers, created_at, modified_at)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))
                                ON CONFLICT(id) DO UPDATE SET
                                    x = CASE
                                        WHEN nodes.x != excluded.x THEN excluded.x
                                        ELSE nodes.x
                                    END,
                                    y = CASE
                                        WHEN nodes.y != excluded.y THEN excluded.y
                                        ELSE nodes.y
                                    END,
                                    label = CASE
                                        WHEN nodes.label != excluded.label THEN excluded.label
                                        ELSE nodes.label
                                    END,
                                    chinese_label = CASE
                                        WHEN nodes.chinese_label != excluded.chinese_label THEN excluded.chinese_label
                                        ELSE nodes.chinese_label
                                    END,
                                    color = CASE
                                        WHEN nodes.color != excluded.color THEN excluded.color
                                        ELSE nodes.color
                                    END,
                                    radius = CASE
                                        WHEN nodes.radius != excluded.radius THEN excluded.radius
                                        ELSE nodes.radius
                                    END,
                                    category = CASE
                                        WHEN nodes.category != excluded.category THEN excluded.category
                                        ELSE nodes.category
                                    END,
                                    layers = CASE
                                        WHEN nodes.layers != excluded.layers THEN excluded.layers
                                        ELSE nodes.layers
                                    END,
                                    modified_at = CASE
                                        WHEN nodes.x != excluded.x OR
                                             nodes.y != excluded.y OR
                                             nodes.label != excluded.label OR
                                             nodes.chinese_label != excluded.chinese_label OR
                                             nodes.color != excluded.color OR
                                             nodes.radius != excluded.radius OR
                                             nodes.category != excluded.category OR
                                             nodes.layers != excluded.layers
                                        THEN datetime('now', 'localtime')
                                        ELSE nodes.modified_at
                                    END
                            `;
                    params = [
                      nodeId,
                      node.x,
                      node.y,
                      node.label || "",
                      node.chineseLabel || "",
                      node.color || "#3b82f6",
                      node.radius || 20,
                      node.category || null,
                      (node.layers || []).join(","),
                    ];
                  }

                  this.db.run(sql, params);
                },
              );
            }

            // Process edges with UPSERT - same logic
            for (const edge of edges) {
              const edgeId = edge.id
                ? uuidToBuffer(edge.id)
                : uuidToBuffer(uuidv7());

              this.db.get(
                "SELECT created_at FROM edges WHERE id = ?",
                [edgeId],
                (err, existingRow) => {
                  // Use COALESCE to preserve existing timestamp, or use current local time for new records
                  const createdAtSQL = existingRow
                    ? "COALESCE((SELECT created_at FROM edges WHERE id = ?), datetime('now', 'localtime'))"
                    : "datetime('now', 'localtime')";

                  // console.log(`[DEBUG] Edge ${bufferToUuid(edgeId)} - existing created_at:`, existingRow?.created_at);

                  // Build parameter list based on whether we have existing row
                  let params, sql;
                  if (existingRow) {
                    sql = `
                                INSERT INTO edges (id, from_node_id, to_node_id, weight, category, created_at, modified_at)
                                VALUES (?, ?, ?, ?, ?, ${createdAtSQL}, datetime('now', 'localtime'))
                                ON CONFLICT(id) DO UPDATE SET
                                    from_node_id = CASE
                                        WHEN edges.from_node_id != excluded.from_node_id THEN excluded.from_node_id
                                        ELSE edges.from_node_id
                                    END,
                                    to_node_id = CASE
                                        WHEN edges.to_node_id != excluded.to_node_id THEN excluded.to_node_id
                                        ELSE edges.to_node_id
                                    END,
                                    weight = CASE
                                        WHEN edges.weight != excluded.weight THEN excluded.weight
                                        ELSE edges.weight
                                    END,
                                    category = CASE
                                        WHEN edges.category != excluded.category THEN excluded.category
                                        ELSE edges.category
                                    END,
                                    modified_at = CASE
                                        WHEN edges.from_node_id != excluded.from_node_id OR
                                             edges.to_node_id != excluded.to_node_id OR
                                             edges.weight != excluded.weight OR
                                             edges.category != excluded.category
                                        THEN datetime('now', 'localtime')
                                        ELSE edges.modified_at
                                    END
                            `;
                    params = [
                      edgeId,
                      uuidToBuffer(String(edge.from)),
                      uuidToBuffer(String(edge.to)),
                      edge.weight || 1,
                      edge.category || null,
                      edgeId, // For the COALESCE subquery
                    ];
                  } else {
                    sql = `
                                INSERT INTO edges (id, from_node_id, to_node_id, weight, category, created_at, modified_at)
                                VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))
                                ON CONFLICT(id) DO UPDATE SET
                                    from_node_id = CASE
                                        WHEN edges.from_node_id != excluded.from_node_id THEN excluded.from_node_id
                                        ELSE edges.from_node_id
                                    END,
                                    to_node_id = CASE
                                        WHEN edges.to_node_id != excluded.to_node_id THEN excluded.to_node_id
                                        ELSE edges.to_node_id
                                    END,
                                    weight = CASE
                                        WHEN edges.weight != excluded.weight THEN excluded.weight
                                        ELSE edges.weight
                                    END,
                                    category = CASE
                                        WHEN edges.category != excluded.category THEN excluded.category
                                        ELSE edges.category
                                    END,
                                    modified_at = CASE
                                        WHEN edges.from_node_id != excluded.from_node_id OR
                                             edges.to_node_id != excluded.to_node_id OR
                                             edges.weight != excluded.weight OR
                                             edges.category != excluded.category
                                        THEN datetime('now', 'localtime')
                                        ELSE edges.modified_at
                                    END
                            `;
                    params = [
                      edgeId,
                      uuidToBuffer(String(edge.from)),
                      uuidToBuffer(String(edge.to)),
                      edge.weight || 1,
                      edge.category || null,
                    ];
                  }

                  this.db.run(sql, params);
                },
              );
            }

            // Clean up deleted nodes and edges - always do this
            const currentNodeIds = nodes
              .map((n) => uuidToBuffer(n.id))
              .filter((id) => id !== null);
            const currentEdgeIds = edges
              .map((e) => uuidToBuffer(e.id))
              .filter((id) => id !== null);

            if (currentNodeIds.length > 0) {
              const placeholders = currentNodeIds.map(() => "?").join(",");
              this.db.run(
                `DELETE FROM nodes WHERE id NOT IN (${placeholders})`,
                currentNodeIds,
              );
            } else {
              this.db.run("DELETE FROM nodes");
            }

            if (currentEdgeIds.length > 0) {
              const placeholders = currentEdgeIds.map(() => "?").join(",");
              this.db.run(
                `DELETE FROM edges WHERE id NOT IN (${placeholders})`,
                currentEdgeIds,
              );
            } else {
              this.db.run("DELETE FROM edges");
            }

            this.db.run("COMMIT", (err) => {
              if (err) {
                this.db.run("ROLLBACK");
                reject(err);
              } else {
                // Debug: Verify actual saved times
                this.db.all(
                  "SELECT id, created_at, modified_at FROM nodes LIMIT 5",
                  (err, rows) => {
                    if (!err) {
                      console.log(
                        "[DEBUG] Nodes after save - actual timestamps:",
                        rows,
                      );
                    }
                  },
                );
                this.db.all(
                  "SELECT id, created_at, modified_at FROM edges LIMIT 5",
                  (err, rows) => {
                    if (!err) {
                      console.log(
                        "[DEBUG] Edges after save - actual timestamps:",
                        rows,
                      );
                    }
                  },
                );
                resolve();
              }
            });
          } catch (error) {
            this.db.run("ROLLBACK");
            reject(error);
          }
        });
      });
    } catch (error) {
      throw error;
    }
  }

  async loadGraph() {
    console.log(
      "[DatabaseManager.loadGraph] Starting to load graph from:",
      this.dbPath,
    );

    return new Promise((resolve, reject) => {
      // CRITICAL: Verify we're connected to the correct database
      console.log("[DatabaseManager.loadGraph] Current database connection path:", this.dbPath);
      
      // Load graph metadata
      console.log("[DatabaseManager.loadGraph] Loading graph metadata...");
      this.db.get(
        "SELECT * FROM graphs WHERE id = ?",
        [Buffer.from("00000000-0000-0000-0000-000000000000", "hex")],
        (err, graphRow) => {
          if (err) {
            console.error(
              "[DatabaseManager.loadGraph] Error loading graph metadata:",
              err,
            );
            reject(err);
            return;
          }

          console.log(
            "[DatabaseManager.loadGraph] Graph metadata row:",
            graphRow,
          );
          const scale = graphRow ? graphRow.scale : 1;
          const offset = graphRow
            ? { x: graphRow.offset_x, y: graphRow.offset_y }
            : { x: 0, y: 0 };
          console.log(
            "[DatabaseManager.loadGraph] Scale:",
            scale,
            "Offset:",
            offset,
          );

          // Load all nodes
          console.log("[DatabaseManager.loadGraph] Loading nodes...");
          this.db.all("SELECT * FROM nodes", (err, nodeRows) => {
            if (err) {
              console.error(
                "[DatabaseManager.loadGraph] Error loading nodes:",
                err,
              );
              reject(err);
              return;
            }

            console.log(
              "[DatabaseManager.loadGraph] Found nodes:",
              nodeRows.length,
              "from database:", this.dbPath,
            );
            console.log("[DatabaseManager.loadGraph] Node rows:", nodeRows);

            // Load all edges
            console.log("[DatabaseManager.loadGraph] Loading edges...");
            this.db.all("SELECT * FROM edges", (err, edgeRows) => {
              if (err) {
                console.error(
                  "[DatabaseManager.loadGraph] Error loading edges:",
                  err,
                );
                reject(err);
                return;
              }

              console.log(
                "[DatabaseManager.loadGraph] Found edges:",
                edgeRows.length,
                "from database:", this.dbPath,
              );
              console.log("[DatabaseManager.loadGraph] Edge rows:", edgeRows);

              const nodes = nodeRows.map((row) => {
                const node = {
                  id: bufferToUuid(row.id),
                  x: row.x,
                  y: row.y,
                  label: row.label,
                  chineseLabel: row.chinese_label || "",
                  color: row.color,
                  radius: row.radius,
                  category: row.category,
                  layers: row.layers
                    ? row.layers
                        .split(",")
                        .map((l) => l.trim())
                        .filter((l) => l)
                    : [],
                  created_at: row.created_at,
                  modified_at: row.modified_at
                };
                console.log(
                  "[DatabaseManager.loadGraph] Processed node:",
                  node,
                );
                return node;
              });

              const edges = edgeRows.map((row) => {
                const edge = {
                  id: bufferToUuid(row.id),
                  from: bufferToUuid(row.from_node_id),
                  to: bufferToUuid(row.to_node_id),
                  weight: row.weight,
                  category: row.category,
                  created_at: row.created_at,
                  modified_at: row.modified_at
                };
                console.log(
                  "[DatabaseManager.loadGraph] Processed edge:",
                  edge,
                );
                return edge;
              });

              const data = {
                nodes,
                edges,
                scale,
                offset,
              };

              console.log("[DatabaseManager.loadGraph] Final data:", data);
              console.log(
                "[DatabaseManager.loadGraph] Nodes count:",
                nodes.length,
                "Edges count:",
                edges.length,
              );
              resolve(data);
            });
          });
        },
      );
    });
  }

  async listGraphs() {
    console.log(
      "[DatabaseManager.listGraphs] Listing graphs from:",
      this.dbPath,
    );

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

      console.log("[DatabaseManager.listGraphs] Executing query:", query);
      this.db.all(query, (err, rows) => {
        if (err) {
          console.error(
            "[DatabaseManager.listGraphs] Error listing graphs:",
            err,
          );
          reject(err);
        } else {
          console.log(
            "[DatabaseManager.listGraphs] Found graphs:",
            rows.length,
          );
          console.log("[DatabaseManager.listGraphs] Raw rows:", rows);

          const graphs = rows.map((row) => {
            const graph = {
              id: bufferToUuid(row.id),
              name: row.name,
              description: row.description || "",
              nodeCount: row.node_count,
              edgeCount: row.edge_count,
              lastModified: new Date(row.modified_at),
              created: new Date(row.created_at),
            };
            console.log("[DatabaseManager.listGraphs] Processed graph:", graph);
            return graph;
          });

          console.log("[DatabaseManager.listGraphs] Final graphs:", graphs);
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
        name: data.name || data.metadata?.name || "Imported Graph",
        description:
          data.description ||
          data.metadata?.description ||
          "Imported from JSON",
        importedAt: new Date().toISOString(),
        ...data.metadata,
      },
    };

    await this.saveGraph(finalId, normalizedData);
    return finalId;
  }

  async exportToJSON(id) {
    return await this.loadGraph(id);
  }

  async migrateFromJSONFiles() {
    try {
      const files = await fs.readdir(".");
      const jsonFiles = files.filter(
        (file) =>
          (file.endsWith(".json") && file.includes("-graph-")) ||
          file.includes("-test-"),
      );

      for (const filename of jsonFiles) {
        try {
          const content = await fs.readFile(filename, "utf8");
          const data = JSON.parse(content);

          // Skip if it's not a valid graph format
          if (!data.nodes || !Array.isArray(data.nodes)) continue;

          const id = filename.replace(".json", "");
          await this.saveGraph(id, data);
          console.log(`Migrated ${filename}`);
        } catch (err) {
          console.error(`Error migrating ${filename}:`, err.message);
        }
      }

      console.log("Migration completed");
    } catch (err) {
      console.error("Error during migration:", err.message);
    }
  }

  async close() {
    return new Promise((resolve) => {
      if (this.db) {
        console.log(
          "[DatabaseManager.close] Closing database connection:",
          this.dbPath,
        );
        this.db.close((err) => {
          if (err) {
            console.error(
              "[DatabaseManager.close] Error closing database:",
              err,
            );
          } else {
            console.log(
              "[DatabaseManager.close] Database closed successfully:",
              this.dbPath,
            );
          }
          this.db = null;
          resolve();
        });
      } else {
        console.log("[DatabaseManager.close] No active database to close");
        resolve();
      }
    });
  }
}

module.exports = DatabaseManager;
