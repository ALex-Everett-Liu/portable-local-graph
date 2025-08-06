# Changelog

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