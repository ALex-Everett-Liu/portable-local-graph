# Changelog

> **Note**: For historical versions prior to 0.4.0, see [CHANGELOG-ARCHIVED.md](CHANGELOG-ARCHIVED.md)

## [0.5.2] - 2025-08-20

### 🎯 Layer Management Enhancement
- **Save View Functionality**: Added "Save View" button to Layer Management dialog
- **Layer View Persistence**: Save and load layer filter configurations with descriptive names
- **Quick Access Integration**: Layer views integrated into unified Quick Access panel
- **Visual Indicators**: Layer views marked with 📊 icon, filter views with 🎯 icon
- **Unified Management**: Both layer and filter views managed in single Quick Access panel

### 📊 Layer View Features
- **One-Click Loading**: Instantly apply saved layer configurations
- **Include/Exclude Mode**: Preserve filtering mode (include/exclude) in saved views
- **Descriptive Naming**: Auto-generated names with layer count and mode
- **Local Storage**: Persistent storage using localStorage for reliability
- **10 View Limit**: Keep 10 most recent views to maintain performance

### 🐛 Bug Fixes
- **Layer View Application**: Fixed issue where saved layer views didn't apply to graph
- **Quick Access Display**: Enhanced visual feedback for different view types
- **Notification Clarity**: Improved messages showing actual applied changes

## [0.5.1] - 2025-08-19

### 🔍 Centrality Analysis Enhancement
- **Per-Component Centrality Calculation**: Fixed boundary issues in disconnected graphs
- **Isolated Node Handling**: Proper handling of singleton components (closeness=0, eigenvector=0)
- **Component-wise Normalization**: Centrality values normalized within each connected component
- **Backward Compatibility**: Fully compatible with connected graphs (identical results)

### 🐛 Bug Fixes
- **Closeness Centrality**: Fixed incorrect `closeness=1` for isolated nodes
- **Eigenvector Centrality**: Fixed component boundary issues in disconnected graphs
- **Betweenness Centrality**: Now correctly handles multiple disconnected components
- **PageRank**: Proper component-wise normalization for disconnected subgraphs

### 📊 Algorithm Improvements
- **Connected Component Detection**: Automatic detection and handling of graph components
- **Local Normalization**: Each component calculated independently for fair comparison
- **Boundary Case Handling**: Robust handling of graph partitions and isolated nodes

## [0.5.0] - 2025-08-19

### 🏗️ Major Architecture Refactoring
- **Modular Architecture**: Transformed monolithic 1,361-line Graph class into 12 focused modules totaling 465 lines
- **100% Backward Compatibility**: All existing functionality preserved via compatibility layer
- **File Size Enforcement**: Strict 200-line limit per file, 150-line per class, 50-line per function
- **Event-Driven Design**: Loose coupling between modules using CustomEvent system
- **Smart Data Merging**: Eliminates data loss during filtering operations

### 📊 Modular Components Created
- **core/graph-data.js** (96 lines): Event-driven data management with CRUD operations
- **core/export-manager.js** (73 lines): JSON, SVG, CSV, and GraphML export functionality
- **rendering/graph-renderer.js** (89 lines): Pure canvas rendering engine with hit detection
- **filtering/graph-filter.js** (67 lines): Local graph filtering with Dijkstra algorithm
- **filtering/filter-state-manager.js** (73 lines): Filter state management with original data preservation
- **analysis/graph-analysis.js** (45 lines): Centrality calculation algorithms
- **utils/geometry.js** (23 lines): Mathematical utilities for distance calculations
- **utils/algorithms.js** (28 lines): Graph algorithms (Dijkstra, BFS)

### 🐛 Critical Bug Fixes
- **Reset Button Fix**: Layer management reset button now works correctly
- **Data Loss Prevention**: Filtered state data properly merged with original data during save
- **Animation Loop**: Fixed animation loop not starting in refactored version
- **Edge Colors**: Restored consistent edge color scheme (#EFF0E9/#F4A460)
- **Search Highlighting**: Updated to use highlightedNodes array instead of node.highlighted property

### 📚 Documentation & Standards
- **Architecture Documentation**: Complete rewrite of ARCHITECTURE.md with modular design
- **Coding Standards**: Added CODING_STANDARDS.md with strict file size limits
- **Migration Guide**: Created MIGRATION.md for developers transitioning to modular architecture

## [0.4.4] - 2025-08-15

### Added
- **Create Edge via Search Hotkey**: New 'D' key in hotkey mode for instant edge creation via search
- **Enhanced Hotkey Coverage**: All major operations now have dedicated keyboard shortcuts
- **Button Hotkey Mapping**: Visual hotkey hints added to all toolbar buttons

### Hotkey Mode Enhancements
- **New Shortcut**: 'D' key for "Create Edge via Search" dialog
- **Complete Coverage**: Every major button now has a corresponding hotkey
- **Visual Hints**: Hotkey labels appear on buttons when hotkey mode is active
- **Updated Documentation**: Help panel now includes 'D' for edge creation

### Available Shortcuts (Updated)
- **Hotkey Mode**: N, E, T, F, C, L, G, S, O, Z, Y, D, X, Delete, I, U, 0, P, ?
- **Key Changes**:
  - 'T' for Select Mode (changed from 'S')
  - 'S' for Save Graph (exclusive to save functionality)
  - 'D' for Create Edge via Search (new)

## [0.4.3] - 2025-08-15

### Added
- **Command Palette**: Press Ctrl+P to open intelligent command palette with fuzzy search
- **Hotkey Mode**: Press Alt to toggle dedicated hotkey mode with single-key shortcuts
- **Comprehensive Hotkey System**: All major operations accessible via keyboard shortcuts
- **Visual Hotkey Indicators**: Help panel shows available shortcuts when hotkey mode is active
- **Smart Keyboard Navigation**: Arrow keys, Enter, and Escape for efficient command execution

### Command Palette Features
- **Fuzzy Search**: Search commands by name, description, or keywords
- **Keyboard Navigation**: Arrow keys to navigate, Enter to execute, Escape to close
- **Shortcut Display**: Shows associated keyboard shortcuts for each command
- **Instant Access**: 20+ commands including save, load, mode switching, and analysis

### Hotkey Mode Features
- **Alt Toggle**: Press Alt to activate/deactivate hotkey mode
- **Single-key Shortcuts**: N=Node, E=Edge, T=Select, F=Search, C=Centralities, L=Layers
- **Visual Feedback**: Blue indicator shows when hotkey mode is active
- **Auto-deactivation**: Hotkey mode automatically exits after executing commands
- **Help System**: Press ? in hotkey mode to see all available shortcuts

### Available Shortcuts
- **Global**: Ctrl+P (Command Palette), Ctrl+N (New), Ctrl+S (Save), Ctrl+O (Open)
- **Hotkey Mode**: N, E, T, F, C, L, G, S, O, Z, Y, D, X, I, U, 0, P, ?
- **Navigation**: Ctrl++/Ctrl+- (Zoom), Ctrl+0 (Reset), Delete (Delete), Escape (Clear)

## [0.4.2] - 2025-08-14

### Added
- **Node Connections Overview**: Comprehensive window displaying all connections for any selected node
- **Connection Categorization**: Organized display of incoming, outgoing, and bidirectional connections
- **Interactive Connection Highlighting**: Click any connection to highlight connected nodes and edges
- **Visual Direction Indicators**: Color-coded arrows showing relationship direction (red=incoming, blue=outgoing, green=bidirectional)
- **Connection Details**: Display node labels, Chinese labels, edge weights, and categories for each connection
- **Bulk Highlighting**: "Highlight All Connections" button to visualize entire network around selected node
- **Focus Navigation**: "Focus on Node" button to center view on the selected node
- **Seamless Integration**: Added "Connections" button to node edit dialog for instant access

### Technical Details
- **getNodeConnections()**: New Graph method that accurately categorizes all edges connected to a node
- **Bidirectional Detection**: Smart identification of mutual connections (edges in both directions)
- **Visual Hierarchy**: Connection count display and organized sections for clear navigation
- **Responsive Design**: Dedicated modal dialog with proper z-index management
- **State Management**: Automatic highlighting cleanup when dialog is closed
- **Cross-module Integration**: Global `showNodeConnections()` function accessible from any context

### User Experience
- **Dedicated Interface**: Separate spacious window instead of cramped edit dialog
- **Instant Access**: Right-click node → Edit → Connections for immediate overview
- **Visual Feedback**: Hover effects and selection highlighting for enhanced interaction
- **Context Preservation**: Original graph state maintained while exploring connections
- **Professional Polish**: Clean styling with smooth transitions and intuitive controls

## [0.4.1] - 2025-08-14

### Added
- **Infinite Canvas Grid**: Grid now extends infinitely as you pan across the canvas
- **Dynamic Grid Calculation**: Grid lines calculated based on current view bounds for seamless panning
- **Pure White Canvas Background**: Replaced semi-transparent gradient with clean white background
- **Enhanced Visual Clarity**: Improved contrast and professional appearance for graph visualization

### Technical Details
- **Dynamic Bounds Calculation**: Grid lines calculated using visible viewport bounds plus padding
- **Seamless Panning**: Grid follows view transformations during panning and zooming operations
- **Performance Optimized**: Only renders necessary grid lines for current viewport
- **Consistent Scaling**: Grid spacing (30px) scales appropriately with zoom level
- **CSS Cleanup**: Removed complex gradient background from canvas styling

### User Experience
- **Infinite Exploration**: Grid remains visible regardless of canvas pan distance
- **Clean Visual Design**: Pure white background provides better contrast for graph elements
- **Professional Appearance**: Eliminated distracting background patterns
- **Smooth Interaction**: Grid transitions seamlessly during panning operations

## [0.4.0] - 2025-08-14

### Added
- **Enhanced Node Highlighting**: Dramatic visual effects for search results and selected nodes
- **Multi-layer Golden Halo Effect**: Radiating golden glow around highlighted nodes for maximum visibility
- **Pulsing Animation**: 20% scale pulsing effect using sine waves for continuous attention
- **Real-time Animation**: Smooth 60fps rendering with requestAnimationFrame optimization
- **Smart Animation Management**: Animation only runs when highlighted nodes exist to save performance
- **Visual Depth**: Multi-layer gradients with inner/outer glow rings and bright gold borders
- **Enhanced Visibility**: Dramatically improved visual prominence for search results and selections

### Technical Details
- **Canvas-based Rendering**: Advanced radial gradients and multi-layer effects using HTML5 Canvas
- **Performance Optimization**: Efficient animation loop that only renders when needed
- **Dynamic Scaling**: Pulsing effect scales with zoom level and canvas transformations
- **Color Harmony**: Golden (#FFD700) highlighting with white inner highlights for contrast
- **Animation System**: `requestAnimationFrame` loop with automatic start/stop based on highlight state
- **Visual Hierarchy**: Multiple layers including halo, rings, and borders for depth perception

### User Experience
- **Impossible to Miss**: Enhanced highlighting makes search results and selections immediately visible
- **Professional Polish**: Smooth animations and sophisticated visual effects
- **Context Preservation**: All existing functionality maintained with dramatic visual upgrade
- **Performance Conscious**: Zero overhead when no nodes are highlighted
- **Visual Feedback**: Instant recognition of search results and active selections
