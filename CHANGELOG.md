# Changelog

## [0.1.3] - 2025-08-06

### Added
- **Inverted Weight Visualization**: Edge weight now represents distance/cost with negative correlation
- **Distance-based Mapping**: Higher weight values (more distant/expensive) render thinner lines
- **Node Label Background**: Semi-transparent backgrounds for long node labels to ensure readability
- **Visual Semantics**: Weight 0.1 = closest/strongest (thick 8px), weight 30 = farthest/weakest (thin 0.5px)

### Technical Details
- **Negative Correlation**: Inverted logarithmic mapping from weight to line thickness
- **Range Preserved**: Maintains 0.1-30 weight range with 0.5-8px visual range
- **Label Readability**: Automatic text backgrounds when labels exceed node radius
- **Zoom Compatibility**: All visual elements properly scale with canvas zoom

## [0.1.2] - 2025-08-06

### Added
- **Node Size Customization**: Nodes can now be resized with configurable radius
- **Size Range**: Node radius adjustable from 1 to 100 pixels
- **Interactive Size Control**: Slider control in node edit dialog with real-time preview
- **Dynamic Node Creation**: New nodes default to 20px radius but can be customized

### Technical Details
- **Size Range**: 1px (minimum) to 100px (maximum) node radius
- **Default Value**: 20px radius for new nodes
- **Zoom Scaling**: Node sizes properly scale with canvas zoom level
- **Visual Consistency**: Node labels and selection indicators scale proportionally

## [0.1.1] - 2025-08-06

### Added
- **Edge Weight Visualization**: Edge line thickness now scales with weight values
- **Non-linear Mapping**: Logarithmic scaling from weight (0.1-30) to line width (0.5-8px) for better visual differentiation
- **Weight-based Rendering**: New `getEdgeLineWidth()` method in graph.js for dynamic line thickness

### Technical Details
- **Weight Range**: Supports 0.1 (minimum width) to 30 (maximum width)
- **Visual Sensitivity**: Optimized for common 0.5-5 weight range with logarithmic scaling
- **Zoom Scaling**: Line thickness properly scales with canvas zoom level

## [0.1.6] - 2025-08-07

### Added
- **Primary Database Storage**: Complete migration from JSON to SQLite as primary storage
- **Real-time Database Updates**: All graph changes are automatically persisted to SQLite
- **Database-first Architecture**: JSON files now serve only as backup/export format
- **Auto-save Functionality**: Changes saved to database after 1-second delay
- **Graph Selection Dialog**: New UI for browsing and selecting from multiple saved graphs
- **Database Manager Integration**: Enhanced `app.js` with SQLite database integration
- **Real-time Persistence**: No data loss even during crashes or browser restarts

### Technical Details
- **Storage Architecture**: Single SQLite database with multiple graph support
- **Auto-save**: Changes persisted to database automatically without user intervention
- **Graph Selection**: Interactive dialog for loading graphs from database
- **JSON Compatibility**: Full import/export support maintained for backup/sharing
- **Migration**: Automatic import of existing JSON files into database

### Changed
- **Primary Storage**: JSON files → SQLite database for real-time data persistence
- **Save Behavior**: Manual JSON saves → automatic database updates
- **Load Behavior**: File picker → database selection dialog
- **Data Integrity**: Improved with transactional database operations

## [0.1.5] - 2025-08-07

### Added
- **SQLite Database Migration**: Complete migration from JSON files to isolated SQLite databases
- **Isolated Storage**: Each graph now has its own `.db` file for complete data isolation
- **Database Manager**: New `database-isolated.js` for managing separate SQLite databases
- **Migration Tools**: Automated migration script `migrate-isolated.js` with interactive mode
- **Backward Compatibility**: Full JSON import/export support maintained
- **Performance**: Improved data integrity and faster graph loading

### Technical Details
- **Storage Architecture**: One SQLite database per graph (e.g., `250806-test-01.db`)
- **Schema Design**: Separate tables for metadata, nodes, and edges in each database
- **Migration**: Automated 1:1 conversion from JSON files to isolated databases
- **API Endpoints**: Updated REST API to work with isolated database structure
- **File Management**: Graphs stored in `./data/` directory as individual `.db` files

### Changed
- **Server Mode**: Updated to use `server-isolated.js` with SQLite backend
- **Data Persistence**: Replaced JSON file storage with SQLite database storage
- **API Structure**: REST endpoints now use graph IDs as database identifiers
- **Package Scripts**: Added `migrate` and `migrate:interactive` commands

## [0.1.7] - 2025-08-07

### Added
- **Dedicated JSON Import**: New "Import JSON" button and menu option for explicit JSON file import
- **File-based Database**: Support for opening and saving to any `.db` file (not just `graph.db`)
- **Enhanced Import/Export**: Clear separation between Save (to .db) and Export (to .json/.svg)
- **Toolbar Improvements**: New Import button (📥) for JSON file selection
- **Menu Integration**: File menu now supports "Import JSON..." and "Export JSON..." options
- **Electron Integration**: Full file dialog support for database and JSON operations

### Changed
- **Storage Naming**: "Save" now refers to database (.db) files, "Export" refers to JSON/SVG files
- **File Operations**: Replaced single-file database with support for arbitrary .db file locations
- **Import Process**: JSON import now explicit action rather than implicit fallback
- **User Interface**: Clear button labels and menu items for import/export operations

### Technical Details
- **Database Manager**: Added `openFile()` method for dynamic database file selection
- **IPC Handlers**: New handlers for JSON import (`import-json-file`) and file-based save/load
- **File Dialogs**: Support for .db and .json file filters in save/open dialogs
- **Backward Compatibility**: Existing JSON files can be imported without modification

## [0.1.0] - 2025-08-06

### Added
- Added category support for nodes and edges in the graph visualization
- New `category` parameter in `addNode()` method to assign categories to nodes
- New `category` parameter in `addEdge()` method to assign categories to edges
- Categories are now included in JSON export/import functionality
- **UI**: Category field added to node edit dialog
- **UI**: Category field added to edge properties dialog
- **UI**: Edge dialog title changed from "Set Edge Weight" to "Set Edge Properties"

### Changed
- Updated `addNode()` signature to include optional `category` parameter
- Updated `addEdge()` signature to include optional `category` parameter
- Enhanced edge update behavior to preserve existing categories when weight is updated