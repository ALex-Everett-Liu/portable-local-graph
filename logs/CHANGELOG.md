# Changelog

> **Note**: For historical versions prior to 0.4.0, see [CHANGELOG-ARCHIVED.md](CHANGELOG-ARCHIVED.md)

## [0.7.6] - 2025-01-XX

### 🗑️ Search & Filter System Removal
- **Feature Removal**: Removed all search and filter functionality for future redesign
- **Search Functionality**: Removed node search UI, search dialog, and search components
- **Filter System**: Removed graph filtering engine, filter state management, and all filtering logic
- **UI Cleanup**: Removed search button, search dialog, and search sidebar section
- **Code Cleanup**: Removed all search and filter modules and related functionality

### 🔧 Removed Components
- **Search Filter Module**: Deleted `search-filter.js` with all node search and highlighting functionality
- **Search Dialog Module**: Deleted `search-dialog.js` with dedicated search dialog interface
- **Graph Filter Module**: Deleted `filtering/graph-filter.js` with layer filtering engine
- **Filter State Manager**: Deleted `filtering/filter-state-manager.js` with filter state management
- **UI Elements**: Removed search button from toolbar, search dialog from HTML, and "Search & Filter" sidebar section
- **Event Handlers**: Removed all search-related event listeners and setupSearchComponents() calls

### 🔧 Technical Changes
- **Script Loading**: Removed script tags for search-filter.js and search-dialog.js from index.html
- **Event Handlers**: Removed search dialog button event listener and setupSearchComponents() call from event-handlers.js
- **App Initialization**: Removed setupSearchComponents() call from app.js
- **Graph Compatibility**: Removed GraphFilter and FilterStateManager imports and initialization from graph-compatibility.js
- **Layer Filtering**: Stubbed out all layer filtering methods (getAllLayers, setActiveLayers, clearLayerFilter, etc.) for backward compatibility
- **File Operations**: Removed filter state saving and loading from file-operations.js
- **Module Exports**: Removed GraphFilter and FilterStateManager exports from index.js
- **Graph Operations**: Removed updateSearchCount() call from graph-operations.js
- **Distance Analysis**: Commented out applyLocalGraphFilter() call in distance-analysis.js

### 📊 Codebase Impact
- **Reduced Complexity**: Removed ~1,200+ lines of search and filter code
- **Cleaner Architecture**: Simplified codebase by removing filtering dependencies
- **Future Ready**: Codebase prepared for redesigned search and filter functionality
- **Backward Compatibility**: Layer filtering method signatures preserved (stubbed out) to prevent breaking changes

### 🎯 User Experience
- **Temporary Limitation**: Search and filter functionality temporarily unavailable until redesign is complete
- **No Data Loss**: Existing graphs and database files remain fully compatible
- **Node Layers Preserved**: Nodes can still have layers assigned (data layer), only filtering UI removed
- **Redesign Opportunity**: Clean slate for implementing improved search and filter system

### 🐛 Bug Fixes
- **ReferenceError Fix**: Fixed updateSearchCount undefined error by removing call from graph-operations.js

## [0.7.5] - 2025-01-XX

### 🗑️ Layer Management UI Removal
- **Feature Removal**: Removed all layer management UI functionality for future redesign
- **Layer Filtering UI**: Removed layer filtering controls, dialogs, and management interface
- **UI Cleanup**: Removed layer management buttons, dialogs, and sidebar controls
- **Code Cleanup**: Removed all layer management UI modules and related event handlers

### 🔧 Removed Components
- **Layer Management Module**: Deleted `layer-management.js` with all layer filtering and management functionality
- **Layer Dialog Module**: Deleted `layer-dialog.js` with layer selection dialog and rename functionality
- **UI Elements**: Removed "Layer Management" sidebar section with filter mode radio buttons, apply/reset buttons, and layer summary
- **Dialogs**: Removed layer management dialog and layer rename dialog from HTML
- **Event Handlers**: Removed all layer management event listeners (apply filter, reset filter, manage layers buttons)
- **Quick Access**: Cleaned up quick-access.js to remove layer-view type handling

### 🔧 Technical Changes
- **Script Loading**: Removed script tags for layer-management.js and layer-dialog.js from index.html
- **Event Handlers**: Removed layer filtering event listeners from event-handlers.js
- **UI Functions**: Removed updateLayerList() call from ui-functions.js
- **Graph Compatibility**: Removed updateLayerList() call from graph-compatibility.js after node creation
- **CSS Cleanup**: Removed layer-management-dialog and layer-rename-dialog CSS styles
- **Quick Access**: Simplified quick-access.js to only handle filter views, removed layer-view type

### 📊 Codebase Impact
- **Reduced Complexity**: Removed ~600+ lines of layer management UI code
- **Cleaner Architecture**: Simplified codebase by removing layer management dependencies
- **Future Ready**: Codebase prepared for redesigned layer management functionality
- **Preserved Features**: Core graph filtering engine remains intact (internal functionality preserved)

### 🎯 User Experience
- **Temporary Limitation**: Layer filtering UI temporarily unavailable until redesign is complete
- **No Data Loss**: Existing graphs and database files remain fully compatible
- **Node Layers Preserved**: Nodes can still have layers assigned (data layer), only UI management removed
- **Redesign Opportunity**: Clean slate for implementing improved layer management system

## [0.7.4] - 2025-01-XX

### 🗑️ Graph Analysis Modules Removal
- **Feature Removal**: Removed all graph analysis modules and centrality calculation functionality for future redesign
- **Centrality Calculations**: Removed all centrality calculation algorithms (degree, betweenness, closeness, eigenvector, PageRank)
- **Graph Analysis**: Removed GraphAnalysis class and all analysis coordination functionality
- **UI Cleanup**: Removed centrality calculation button and analysis display from sidebar

### 🔧 Removed Components
- **Graph Analysis Module**: Deleted `graph-analysis.js` with all analysis coordination and caching functionality
- **Centrality Calculator Module**: Deleted `centrality-calculator.js` with all centrality calculation algorithms
- **Centrality Methods**: Removed `calculateCentralities()`, `calculateCentralityRankings()`, and `getCentralityRank()` from Graph class
- **Centrality Display**: Removed centrality analysis display from node selection info panel
- **Centrality Filtering**: Removed centrality-based filtering from GraphFilter and FilterStateManager classes
- **UI Elements**: Removed "Graph Analysis" section with "Calculate Centralities" button from sidebar

### 🔧 Technical Changes
- **Module Exports**: Removed GraphAnalysis and CentralityCalculator exports from index.js
- **Import Cleanup**: Removed GraphAnalysis import and instance from graph-compatibility.js
- **Event Handlers**: Removed calculateCentralities button event handler from event-handlers.js
- **Distance Analysis**: Removed calculateCentralities function from distance-analysis.js
- **Graph Operations**: Removed centrality display code from graph-operations.js
- **Filter Modules**: Removed applyCentralityFilter methods from graph-filter.js and filter-state-manager.js
- **HTML Cleanup**: Removed centrality calculation UI elements from index.html

### 📊 Codebase Impact
- **Reduced Complexity**: Removed ~800+ lines of graph analysis and centrality calculation code
- **Cleaner Architecture**: Simplified codebase by removing analysis dependencies
- **Future Ready**: Codebase prepared for redesigned graph analysis functionality with thorough algorithm understanding
- **Preserved Features**: Pathfinding engine remains intact and fully functional

### 🎯 User Experience
- **Temporary Limitation**: Centrality calculations temporarily unavailable until redesign is complete
- **No Data Loss**: Existing graphs and database files remain fully compatible
- **Redesign Opportunity**: Clean slate for implementing improved graph analysis system with better algorithm understanding
- **Pathfinding Preserved**: Pathfinding functionality (shortest path, k-shortest paths, etc.) remains available

## [0.7.3] - 2025-01-XX

### ⌨️ Keyboard Shortcuts System Removal
- **Feature Removal**: Removed all keyboard shortcuts and command palette functionality for future redesign
- **Hotkey Mode**: Removed hotkey-mode.js module and all related hotkey mode functionality
- **Keyboard Shortcuts**: Removed keyboard-shortcuts.js module and all keyboard event handling
- **Command Palette**: Removed command-palette.js module and Ctrl+P command palette interface

### 🗑️ Removed Components
- **Hotkey Mode Module**: Deleted `hotkey-mode.js` with all hotkey registration, activation, and hint display functionality
- **Keyboard Shortcuts Module**: Deleted `keyboard-shortcuts.js` with all keyboard event handlers and shortcut mappings
- **Command Palette Module**: Deleted `command-palette.js` with command registration, filtering, and execution system
- **Debug Tools**: Cleaned up `debug-hotkeys.html` to remove hotkey-mode references

### 🔧 Technical Changes
- **Script Loading**: Removed script tags for hotkey-mode.js, keyboard-shortcuts.js, and command-palette.js from index.html
- **Initialization**: Removed `initializeHotkeyMode()` and `initializeCommandPalette()` calls from app.js
- **Event Handlers**: Removed keyboard event listener registrations from event-handlers.js
- **Before Unload**: Preserved window beforeunload handler with inline implementation
- **Command Palette References**: Removed "Toggle Hotkey Mode" command from command palette (before deletion)

### 📊 Codebase Impact
- **Reduced Complexity**: Removed ~1,500+ lines of keyboard shortcut and command palette code
- **Cleaner Architecture**: Simplified event handling system without keyboard shortcut dependencies
- **Future Ready**: Codebase prepared for redesigned keyboard shortcuts and command palette system
- **No Breaking Changes**: All UI functionality remains accessible via mouse/touch interactions

### 🎯 User Experience
- **Temporary Limitation**: Keyboard shortcuts temporarily unavailable until redesign is complete
- **UI Access**: All features remain accessible through toolbar buttons and UI controls
- **No Data Loss**: Existing graphs and database files remain fully compatible
- **Redesign Opportunity**: Clean slate for implementing improved keyboard shortcut system

## [0.7.2] - 2025-11-18

### 🔢 Sequence ID System Implementation
- **Stable Sequential Identifiers**: Added sequence ID system to nodes and edges tables for human-readable, stable sequential numbering
- **Automatic Assignment**: New nodes and edges automatically receive sequential IDs (1, 2, 3, ...) based on creation order
- **Existing Data Population**: Existing records without sequence IDs are automatically populated on database initialization
- **Chronological Ordering**: Sequence IDs assigned based on `created_at` timestamp to maintain chronological sequence
- **Persistent Identifiers**: Sequence IDs remain stable across save/load operations and don't change when records are modified

### 💾 Database Schema Enhancement
- **New Columns**: Added `sequence_id INTEGER` column to both `nodes` and `edges` tables
- **Migration Support**: Automatic migration adds sequence_id columns to existing databases without data loss
- **Index Optimization**: Created indexes on sequence_id columns for improved query performance
- **Backward Compatibility**: Existing databases seamlessly upgraded with sequence ID support

### 🔧 Technical Implementation
- **Database Manager Enhancement**: Added `populateSequenceIds()` method to automatically populate existing records
- **Save Logic Update**: Modified `saveGraph()` to assign sequence IDs to new nodes and edges during save operations
- **Load Integration**: Updated `loadGraph()` to include sequence_id in returned node and edge objects
- **Initialization Flow**: Sequence ID population runs automatically after table creation during database initialization
- **Transaction Safety**: All sequence ID operations wrapped in transactions for data consistency

### 🎯 User Experience Benefits
- **Human-Readable References**: Nodes and edges can now be referenced by sequential numbers (e.g., "Node #123")
- **Consistent Ordering**: Records maintain consistent ordering based on creation time
- **Stable Identifiers**: Sequence IDs provide stable references that don't change with modifications
- **Automatic Management**: No manual intervention required - sequence IDs managed automatically

### 📊 Implementation Details
- **Conflict-Free Generation**: Sequence IDs calculated from maximum existing ID + 1 to prevent conflicts
- **NULL Handling**: Gracefully handles NULL sequence_ids and populates them on initialization
- **Idempotent Operations**: Population function safe to run multiple times without side effects
- **Error Handling**: Comprehensive error handling with transaction rollback on failures

## [0.7.1] - 2025-11-18

### 🗑️ Local Graph Filtering Removal
- **Feature Removal**: Removed all local graph filtering functionality for future redesign
- **Distance-Based Filtering**: Removed distance and depth-based graph filtering features
- **UI Cleanup**: Removed filter controls, sliders, and analysis buttons from sidebar
- **Code Cleanup**: Removed all filtering methods, state management, and related utilities

### 🔧 Removed Components
- **Filter Methods**: Removed `applyLocalGraphFilter()`, `filterLocalGraph()`, `analyzeDistancesTable()`, `calculateDistances()`, and `calculateDepths()` methods
- **UI Elements**: Removed center node search, max distance/depth sliders, filter condition selector, Apply/Reset/Analyze buttons
- **State Management**: Removed distance filter state from FilterStateManager and GraphFilter classes
- **Event Handlers**: Removed all filter-related event listeners and handlers
- **File Operations**: Removed distance filter restoration from database load operations
- **Quick Access**: Updated quick access to handle removed filter view configurations gracefully

### 🐛 Bug Fixes
- **Missing Functions**: Fixed `calculateCentralities` undefined error by creating inline event handler
- **Export Function**: Removed undefined `exportSelectedLayers` from layer-management.js exports
- **CSV Export**: Removed remaining CSV export functionality from layer dialog (consistent with v0.7.0 removal)
- **Null References**: Fixed null reference errors in `setupSearchComponents()` for removed center node search elements

### 📊 Codebase Impact
- **Reduced Complexity**: Simplified filtering architecture by removing distance-based filtering
- **Cleaner Code**: Removed ~500+ lines of filtering-related code across multiple modules
- **Preserved Features**: Layer filtering functionality remains intact and fully functional
- **Future Ready**: Codebase prepared for redesigned local graph filtering feature

### 🎯 User Experience
- **Simplified Interface**: Cleaner sidebar without filter controls
- **Consistent Behavior**: All remaining features continue to work as expected
- **No Data Loss**: Existing graphs and database files remain fully compatible

## [0.7.0] - 2025-11-18

### 🎯 Project Simplification - JSON Export/Import Removal
- **Streamlined Feature Set**: Removed all JSON export/import functionality to focus exclusively on database operations
- **Database-First Approach**: Project now exclusively uses SQLite database save/load/merge for all data persistence
- **Reduced Complexity**: Eliminated redundant file format support to simplify codebase and maintenance

### 🗑️ Removed Features
- **JSON Export**: Removed all JSON export endpoints, UI buttons, and functionality
- **JSON Import**: Removed all JSON import endpoints, file dialogs, and merge import features
- **Layer JSON Export**: Removed ability to export selected layers as JSON files
- **Migration Tools**: Removed JSON file migration endpoints and utilities
- **Import Dialogs**: Removed JSON import mode selection dialogs and conflict resolution UI
- **SVG Export**: Removed all SVG export endpoints, UI buttons, IPC handlers, and functionality
- **SVG Generation**: Removed SVG generation utilities and export methods from export manager

### 🔧 Technical Changes
- **Server Endpoints**: Removed `/api/graph/export/json`, `/api/graph/import`, `/api/graph/load-file`, `/api/migrate`, and `/api/graph/export/svg` endpoints
- **UI Components**: Removed Import JSON, Export JSON, and Export SVG buttons from toolbar and layer management dialogs
- **IPC Handlers**: Removed `import-json-file`, `export-json`, and `export-svg` IPC handlers from main process
- **Export Manager**: Completely deleted `export-manager.js` module (removed all CSV, JSON, SVG, and GraphML export methods)
- **Graph Compatibility**: Removed ExportManager instantiation and integration from Graph class
- **File Operations**: Removed `fallbackToJSONLoad()`, `showImportModeDialog()`, and `formatImportNotification()` functions
- **Database Manager**: Removed `importFromJSON()`, `exportToJSON()`, and `migrateFromJSONFiles()` methods
- **Server Utilities**: Removed `generateSVG()` utility function from server
- **Command Palette**: Removed "Export as SVG" command
- **Layer Management**: Removed CSV export function that depended on ExportManager
- **Module Deletion**: Deleted `json-import-export.js`, `svg-export.js`, and `export-manager.js` modules entirely

### 💾 Database Functionality Preserved
- **Save/Load**: All database save and load operations remain fully functional
- **Merge**: Database merge functionality with conflict resolution continues to work
- **Backup**: Database backup functionality remains available
- **Data Integrity**: All existing database features and data remain unaffected

### 🎯 User Experience
- **Simplified Workflow**: Users now have a single, consistent data persistence method
- **Reduced Confusion**: Eliminates choice between JSON and database formats
- **Focus on Core Features**: Streamlined interface emphasizes database operations
- **Backward Compatibility**: Existing database files continue to work without changes

### 📊 Codebase Impact
- **Reduced File Count**: Removed three entire modules (`json-import-export.js`, `svg-export.js`, and `export-manager.js`)
- **Massive Code Reduction**: Removed over 1,200 lines of export-related code across all modules
- **Cleaner Architecture**: Simplified codebase with fewer code paths to maintain
- **Better Maintainability**: Reduced complexity makes future development easier
- **Consistent Patterns**: All data operations now follow same database-first pattern
- **Focused Feature Set**: Project now exclusively focuses on database operations without any export format distractions
- **Zero Export Dependencies**: No export functionality remains - completely database-focused

## [0.6.9] - 2025-10-21

### 🔍 Enhanced Node Search with Dedicated Dialog
- **Dedicated Search Dialog**: Replaced cramped sidebar search with spacious, professional search dialog
- **Advanced Search Interface**: Large search input with real-time dropdown results and detailed result list
- **Enhanced Result Display**: Shows node name, ID, position, category, color, and size in organized layout
- **Interactive Result Navigation**: Click to select, keyboard navigation with arrow keys, Enter to confirm
- **Node Selection & Navigation**: Select nodes directly from search results or navigate canvas to center on them

### 🎛️ User Interface Improvements
- **Toolbar Integration**: Added 🔍 "Search" button to main toolbar for instant access
- **Command Palette Support**: Added "Search Nodes (Dialog)" command with keywords: search, find, nodes, dialog, advanced
- **Keyboard Navigation**: Full keyboard support with arrow keys, Enter confirmation, Escape to close
- **Professional Dialog Design**: Consistent with existing layer management dialog styling and behavior
- **Real-time Search Feedback**: Live result count and clear visual indicators for selected/highlighted items

### 💡 Search Functionality Enhancements
- **Comprehensive Node Information**: Displays full node details including position coordinates
- **Visual Result Highlighting**: Selected and highlighted nodes clearly indicated with color coding
- **Search Result Limiting**: Limits to 20 results for performance while maintaining usability
- **Case-insensitive Search**: Searches node labels regardless of case for better user experience
- **Instant Clear Function**: One-click clear button to reset search and start fresh

### 🔧 Technical Implementation
- **Dedicated Module**: Created `search-dialog.js` module following existing dialog patterns
- **State Management**: Proper search dialog state handling with selection and highlighting
- **Event Handling**: Comprehensive keyboard and mouse event support
- **Graph Integration**: Seamless integration with existing graph selection and navigation systems
- **Cross-browser Compatibility**: Works with all modern browsers and input methods

### 🎯 User Experience Benefits
- **More Screen Space**: Dedicated dialog provides much more room for search interface
- **Better Visual Hierarchy**: Clear separation between search input, results, and selected node details
- **Improved Workflow**: Faster node finding with professional search interface
- **Backward Compatibility**: Original sidebar search still available for quick access
- **Professional Polish**: Consistent with application's design language and interaction patterns

## [0.6.8] - 2025-10-21

### 💾 Database Backup Functionality
- **One-Click Database Backup**: Added ability to create timestamped backups of current working database
- **Automatic Timestamp Naming**: Backup files named with ISO timestamp format (e.g., `graph-backup-2025-10-21T14-30-25.db`)
- **Same Directory Storage**: Backups created in same directory as original database for easy access
- **Non-Destructive Operation**: Original database remains completely unchanged during backup process
- **Cross-Platform Support**: Works in Electron mode with proper file system operations

### 🎛️ User Interface Integration
- **Toolbar Integration**: Added "Backup" button (💾) next to existing Import/Export controls
- **Command Palette Support**: Added "Backup Database" command accessible via Ctrl+P with keywords: backup, database, save, copy, archive
- **Visual Feedback**: Clear notifications showing backup filename and success status
- **Error Handling**: User-friendly error messages for backup failures

### 🔧 Technical Implementation
- **File System Operations**: Uses Node.js `fs.copyFileSync()` for reliable file copying
- **Path Management**: Proper handling of file paths and directory structures
- **Timestamp Generation**: ISO 8601 format with sanitized characters for filename compatibility
- **Mode Detection**: Graceful handling of both Electron and web environments
- **Error Recovery**: Comprehensive error handling with fallback mechanisms

### 🛡️ Data Safety Features
- **Atomic File Operations**: Uses synchronous file copying to prevent corruption
- **Original File Preservation**: Source database file is never modified during backup
- **Backup Verification**: File operations include error checking and validation
- **User Confirmation**: Clear notifications confirm successful backup creation

### 🎯 User Experience
- **Dual Access Methods**: Access via toolbar button or command palette for maximum convenience
- **Instant Operation**: Fast backup creation without interrupting current workflow
- **Professional Interface**: Consistent with existing application design patterns
- **Keyboard Accessibility**: Full keyboard navigation support through command palette integration

## [0.6.7] - 2025-10-21

### 🔗 Database Merge Functionality
- **SQLite Database Merging**: Added ability to merge data from one database file into another with conflict resolution
- **Three Conflict Resolution Strategies**: Skip (keep existing), Replace (overwrite), or Rename (create new IDs) for conflicting items
- **Smart Conflict Detection**: Automatically detects ID conflicts between nodes and edges during merge operations
- **Comprehensive Statistics**: Provides detailed merge results showing items added, skipped, renamed, and conflicts resolved
- **Cross-Database Operations**: Works seamlessly across different database files while maintaining data integrity

### 🎛️ User Interface Integration
- **Toolbar Integration**: Added "Merge DB" button (🔗) next to existing Import/Export controls for easy access
- **Command Palette Support**: Added "Merge Database" command accessible via Ctrl+P with keywords: merge, database, import, combine, db
- **Interactive Merge Dialog**: Clean dialog interface explaining conflict resolution options with user-friendly descriptions
- **Real-time Feedback**: Detailed notifications showing merge statistics and operation results

### 🔧 Technical Implementation
- **Database Manager Enhancement**: Added `mergeFromDatabase()` method to SQLite manager with robust conflict handling
- **Node/Edge Relationship Preservation**: Processes nodes first, then edges to maintain referential integrity
- **Connection Management**: Proper database connection handling with temporary connections for source databases
- **Error Handling**: Comprehensive error handling with user-friendly messages and fallback mechanisms
- **State Synchronization**: Automatic application state updates after merge operations

### 🛡️ Data Safety Features
- **Non-Destructive Operations**: Original database files remain unchanged during merge operations
- **Transaction Safety**: Uses proper database transactions to ensure data consistency
- **Backup Compatibility**: Works with existing backup and save mechanisms
- **Conflict Tracking**: Detailed logging of all conflicts and resolution actions for user transparency

### 🎯 User Experience
- **Dual Access Methods**: Access via toolbar button or command palette for maximum convenience
- **Clear Workflow**: Intuitive file selection → conflict resolution choice → detailed results
- **Professional Interface**: Consistent with existing application design patterns and dialogs
- **Keyboard Accessibility**: Full keyboard navigation support through command palette integration

## [0.6.6] - 2025-10-09

### 🔧 Layer State Persistence
- **Active/Inactive Layer Memory**: Graph now remembers which layers are active/inactive when saving to database
- **Filter State Storage**: Layer filter mode (include/exclude) and active layer selections are preserved
- **Distance Filter Persistence**: Local graph filter settings (center node, max distance, max depth) are also saved
- **Seamless Integration**: Works transparently with existing save/load operations - no user action required
- **Database Schema**: Added `filter_state` table to store comprehensive filter configuration

### 🛡️ Critical Data Preservation Fix
- **Complete Data Integrity**: ALL nodes and edges are now saved to database regardless of filter state
- **No Data Loss**: Previously, saving with active filters could cause inactive nodes/edges to be lost
- **Filter-Only Persistence**: Only the filter state (visibility settings) is saved, not filtered data
- **Full Restorability**: Inactive layers can be fully restored after save/load operations
- **Backward Safety**: Existing filtered graphs will load with complete data and applied filters

### 💾 Technical Implementation
- **Database Enhancement**: New `filter_state` table with support for both layer and distance filters
- **State Management**: FilterStateManager state is captured and stored during save operations
- **Load-Time Filtering**: Complete graph data is loaded first, then filters are applied (preserving all data)
- **Backward Compatibility**: Existing graphs without filter state load normally (no filters applied)
- **Error Handling**: Graceful handling of missing or corrupted filter state data

### 🎯 User Experience
- **Workflow Continuity**: Users can restart work exactly where they left off with same layer visibility
- **No Manual Setup**: Layer filters are automatically restored - no need to reconfigure visibility
- **Professional Workflow**: Supports iterative graph analysis with persistent filtering preferences
- **Data Safety**: Users can save filtered views without losing access to hidden data

### 🔍 Filter State Components
- **Layer Filter**: Active layers array, include/exclude mode, enabled/disabled status
- **Distance Filter**: Center node ID, maximum distance threshold, maximum depth limit
- **Cross-Session Persistence**: Filter state survives application restarts and database switching
- **Real-Time Updates**: Filter changes are saved with each graph save operation

## [0.6.5] - 2025-10-04

### 🎨 Enhanced Node Color Editing
- **Hex Color Input**: Added hex color input field alongside the color picker in Edit Node dialog
- **Real-time Synchronization**: Color picker and hex input stay synchronized automatically
- **Input Validation**: Validates hex color format (#RRGGBB) with user-friendly error messages
- **Monospace Font**: Hex input uses monospace font for better readability
- **Backward Compatibility**: Existing color picker functionality remains unchanged

### 📍 Precise Position Editing
- **X,Y Coordinate Inputs**: Added numeric input fields for precise node positioning in Edit Node dialog
- **Position Display**: Shows current node coordinates rounded to integers
- **Input Validation**: Validates numeric coordinates with clear error messages
- **Decimal Support**: Accepts both integer and decimal coordinate values
- **Drag Compatibility**: Manual positioning works alongside existing drag-and-drop functionality

### 🔧 Technical Implementation
- **Enhanced UI Functions**: Updated `showNodeDialog()`, `handleNodeOK()`, and `handleNodeCancel()` functions
- **Helper Functions**: Added `isValidHex()`, `hexToRgb()`, and `rgbToHex()` utility functions
- **Input Synchronization**: Bidirectional sync between color picker and hex input fields
- **Position Validation**: Numeric validation for X and Y coordinate inputs
- **Error Handling**: User-friendly notifications for invalid inputs

### 🎯 User Experience
- **Precise Control**: Users can now input exact hex colors and coordinates
- **Visual Feedback**: Real-time validation with clear error messages
- **Professional Interface**: Clean layout with proper spacing and alignment
- **Enhanced Workflow**: Quick access to both color and position editing in one dialog

## [0.6.4] - 2025-09-28

### 🔧 Edge Direction Consistency Fix
- **Undirected Edge Handling**: Fixed inconsistency between centrality calculations and distance analysis
- **Algorithm Alignment**: All graph algorithms now consistently treat edges as undirected
- **Infinity Depth Resolution**: Eliminated "Infinity" depth values in Local Graph Filter analysis
- **Bidirectional Traversal**: Dijkstra, BFS, and depth calculations now check both edge directions

### 🎯 AND/OR Filter Conditions
- **User-Selectable Logic**: New dropdown in Local Graph Filter to choose between AND/OR conditions
- **OR Condition (Default)**: Nodes included if they meet either distance OR depth criteria (more inclusive)
- **AND Condition**: Nodes included only if they meet both distance AND depth criteria (more restrictive)
- **Visual Interface**: Clear dropdown options explaining the difference between conditions
- **Backward Compatibility**: OR condition maintains existing behavior as default

### 🔧 Technical Implementation
- **Algorithm Updates**: Modified `dijkstra()` and `bfs()` in `utils/algorithms.js` for undirected traversal
- **Filter Logic Enhancement**: Updated `filterLocalGraph()` in `graph-compatibility.js` with condition parameter
- **Distance Analysis**: Enhanced `analyzeDistancesTable()` to apply AND/OR filtering logic
- **UI Integration**: Added condition selector dropdown to Local Graph Filter section

### 📊 Filter Behavior
- **OR Logic**: `distance <= maxDistance OR depth <= maxDepth` (inclusive filtering)
- **AND Logic**: `distance <= maxDistance AND depth <= maxDepth` (restrictive filtering)
- **Consistent Application**: Both graph filtering and distance analysis use same condition logic
- **Real-time Updates**: Condition changes apply immediately to both filtering and analysis

### 🐛 Bug Fixes
- **Edge Direction Bug**: Fixed directed vs undirected edge inconsistency across algorithms
- **Infinity Values**: Resolved unreachable nodes showing "Infinity" depth in analysis tables
- **Filter Consistency**: Ensured filtering logic is consistent between different graph operations

## [0.6.3] - 2025-09-01

### 🔄 JSON Import/Export Enhancement (Complete)
- **Selective Layer Export**: Added ability to export nodes from specific layers while excluding edges to avoid cross-layer connection issues
- **Merge Import Functionality**: New option to supplement current graph instead of replacing it entirely
- **Conflict Resolution**: Three strategies for handling ID conflicts during merge import (replace/skip/rename)
- **Dialog Integration**: Proper HTML-based import dialog following same pattern as layer management dialogs
- **CSV Export Support**: Added CSV export for selective layer data with comprehensive node information

### 🔧 Technical Implementation
- **New Module**: Dedicated `json-import-export.js` module for clean separation from SVG functionality
- **Merge Logic**: Intelligent merging with node/edge conflict detection and resolution strategies
- **Layer Filtering**: Precise node filtering by layer membership with edge exclusion for data integrity
- **Dialog System**: Replaced dynamic JS dialogs with proper HTML modal system for consistent positioning
- **Export Formats**: JSON for complete data, CSV for spreadsheet compatibility

### 🎯 User Experience
- **Layer Export**: "Manage Layers" → "Export JSON/CSV" exports nodes from selected layers only
- **Import Options**: Clear choice between "Replace Current Graph" vs "Merge with Current Graph"
- **Visual Feedback**: Real-time notification of import results with detailed statistics
- **Seamless Integration**: Works with both Electron file dialogs and web file inputs

### 🛡️ Data Integrity
- **Cross-layer Safety**: Edges excluded from layer exports to prevent broken connections
- **Conflict Prevention**: Smart ID conflict resolution prevents data corruption during merge
- **State Preservation**: Original graph state maintained during merge operations
- **Backward Compatibility**: All existing JSON export/import functionality preserved

## [0.6.1] - 2025-08-25

### 🎯 CRITICAL DATA CONTAMINATION FIX (Complete Resolution)
- **Root Cause Identified**: Missing `loadGraphFromDatabase()` calls after database switching operations
- **Unified Database Switching**: Created `switchToDatabase()` method that combines connection switching with state loading
- **Surgical Fixes**: Fixed 3 specific locations where database switching lacked state synchronization
- **Method Call Error Fixed**: Corrected `dbInstanceManager.saveGraph()` to proper `getCurrentDb().saveGraph()` calls
- **Prevention Architecture**: All database switching now uses unified method to prevent future contamination

### 🛠️ Technical Implementation
- **New Method**: `DatabaseInstanceManager.switchToDatabase(filePath)` with automatic state loading
- **Fixed Handlers**: `save-graph-file-request`, `open-graph-file-result`, `handleLoadClick()` now use unified switching
- **Error Correction**: Fixed incorrect method calls in `file-operations.js` saveAsNewFile function
- **State Validation**: Added defensive programming with function availability checks
- **Cross-Platform Support**: Works in both Electron and web modes with proper fallbacks

### ✅ Verification Complete
- **Data Isolation**: Database switching no longer causes cross-contamination
- **State Consistency**: Application state always matches active database content
- **File Integrity**: Original database files remain uncontaminated during operations
- **User Safety**: No more silent data loss or corruption during file switching

### 🏁 Issue Resolution Status
- ✅ **Database connection isolation**: Working correctly (was already fixed)
- ✅ **Application state isolation**: NOW FIXED - properly synchronizes with database
- ✅ **Data contamination vulnerability**: ELIMINATED
- ✅ **File switching reliability**: FULLY OPERATIONAL

## [0.6.0] - 2025-08-25

### 🏗️ Major Directory Restructure (Complete Rewrite)
- **Directory Architecture**: Completely eliminated `js/` directory in favor of standard `src/` structure
- **Modern Structure**: Adopted Electron/Node.js conventions with `src/main/`, `src/renderer/`, `src/server/`
- **Breaking Changes**: All file paths updated to use `src/` prefix throughout codebase
- **File Renaming**: Resolved naming conflicts with `sqlite-manager.js` and `db-instance-manager.js` separation

### 🔧 Database Architecture Overhaul (Fraught with Issues)
- **Singleton Pattern**: Implemented `DatabaseInstanceManager` for database lifecycle management
- **Connection Isolation**: Fixed atomic file switching with complete connection cleanup
- **Variable Reference Hell**: Eliminated 15+ `dbManager` undefined reference errors across renderer files
- **Scope Isolation**: Resolved global scope conflicts in HTML script loading
- **Cross-Platform Compatibility**: Unified access patterns for Electron and web modes

### ⚠️ Critical Data Contamination Issue (Unsolved)
- **Database Isolation Failure**: Severe cross-contamination between database files during switching
- **Data Merging Bug**: Save operations incorrectly merge graph state instead of replacing
- **File Corruption**: Original database files get permanently polluted with foreign data
- **Root Cause**: Graph state not properly cleared on file switching (fundamental design flaw)
- **Status**: Architecture works at connection level but fails at application state level

### 🐛 Failed Attempts and Struggles
- **Initial Mistake**: First attempted to change code logic instead of just directory structure
- **Variable Chaos**: Multiple iterations of `dbManager` vs `dbInstanceManager` confusion
- **Loading Order Issues**: HTML script tag conflicts causing duplicate declarations
- **Incomplete Migration**: Fixed variable references but missed state isolation
- **Silent Data Loss**: Database contamination discovered after "fixing" variable issues

### 📊 Technical Debt Created
- **State Management Gap**: Graph state persistence across file switches
- **Testing Deficit**: No comprehensive database isolation tests
- **Architecture Flaw**: Connection isolation ≠ data isolation
- **Emergency Documentation**: Added DATABASE_ANALYSIS.md to track critical issues

### 🎯 Partial Successes
- **Structure**: Successfully migrated from `js/` to `src/` directory
- **Variables**: Eliminated all undefined `dbManager` references
- **Connections**: Database connection lifecycle properly managed
- **Files**: All imports and references updated correctly

### 🚨 Known Critical Issues (Unresolved)
- **Data Contamination**: Database switching causes permanent data corruption
- **State Isolation**: Graph state not cleared between database files
- **Testing**: No validation of database isolation
- **User Impact**: Users may lose data without warning
