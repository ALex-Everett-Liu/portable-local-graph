# Database Migration Summary

## Overview
The application has been successfully migrated to use SQLite database as the primary storage for real-time graph data. JSON files are now only used for backup/export purposes.

## Key Changes

### ✅ Database Integration
- **Primary Storage**: All graph data (nodes, edges, metadata) is now stored in SQLite database files
- **Auto-save**: Graph changes are automatically saved to database after 1 second delay
- **Real-time Updates**: Every modification (node creation, edge connections, weight changes) is persisted to database

### ✅ Backup Functionality
- **JSON Export**: Still available for creating backup files
- **JSON Import**: Can import existing JSON files into the database
- **Database Files**: Each graph is stored as a separate `.db` file in the `./data/` directory

### ✅ Enhanced Features
- **Graph Selection**: New dialog for selecting from multiple saved graphs
- **Real-time Persistence**: No data loss even if application crashes
- **Metadata Storage**: Graph scale, offset, and other settings are preserved

## File Structure
```
data/
├── graph-[timestamp].db  # Individual graph databases
└── graph.db             # Default database file

app.js                    # Updated with database integration
database-manager.js       # SQLite database operations
test-db-integration.js    # Database test suite
```

## Usage

### Starting the Application
```bash
npm run server    # Start with database support
npm start         # Start Electron app
npm run dev       # Start with dev tools
```

### Graph Operations
- **New Graph**: Creates new database entry with unique ID
- **Save**: Automatically saves to current database file
- **Load**: Shows dialog with all available graphs
- **JSON Export**: Available as backup option
- **JSON Import**: Imports into database for future use

### Database Features
- **Auto-save**: Changes saved after 1 second delay
- **Persistent Storage**: Data survives app restarts
- **Multiple Graphs**: Support for unlimited graphs
- **Metadata Tracking**: Creation date, last modified, graph name

## Technical Details

### Database Schema
```sql
-- Graphs table
CREATE TABLE graphs (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    scale REAL,
    offset_x REAL,
    offset_y REAL,
    created_at DATETIME,
    updated_at DATETIME
);

-- Nodes table
CREATE TABLE nodes (
    id TEXT,
    graph_id TEXT,
    x REAL, y REAL,
    label TEXT,
    color TEXT,
    radius REAL,
    category TEXT
);

-- Edges table
CREATE TABLE edges (
    id TEXT,
    graph_id TEXT,
    from_node_id TEXT,
    to_node_id TEXT,
    weight REAL,
    category TEXT
);
```

### API Methods
- `dbManager.saveGraph(id, data)`: Save graph to database
- `dbManager.loadGraph(id)`: Load graph from database
- `dbManager.listGraphs()`: Get list of all saved graphs
- `dbManager.importFromJSON(data, id)`: Import JSON to database
- `dbManager.exportToJSON(id)`: Export database to JSON format

## Migration from JSON
- Existing JSON files can be imported into the database
- No manual migration required - handled automatically
- JSON backup files can still be created for external sharing