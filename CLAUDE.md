# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

**Portable Local Graph** is a lightweight browser-based graph drawing application. Core architecture:

- **Frontend**: Pure HTML5 Canvas + JavaScript (no frameworks)
- **Optional Backend**: Express.js server for file persistence and SVG export
- **Data Storage**: JSON format for graph serialization

## Key Files

- `graph.js`: Core graph engine with Canvas rendering, interaction handling
- `app.js`: Application controller, event management, UI coordination
- `server.js`: Express backend for file operations and API endpoints
- `index.html`: Main UI with canvas and toolbars

## Development Commands

### Local Development
```bash
# Start Express server for file operations
npm run server

# Start Electron app (development)
npm start

# Start with dev tools
npm run dev

# Web browser mode
npm run server
# Then open http://localhost:3001
```

### Build Commands
```bash
npm run build              # Build for current platform
npm run build -- --win     # Build for Windows
npm run build -- --mac     # Build for macOS
npm run build -- --linux   # Build for Linux
```

### Testing Workflow
No formal test suite - manual testing via browser interface:
- Load `index.html` directly in browser for testing
- Use `npm run dev` for Electron development with dev tools
- Test graph operations: node creation, edge connections, weight editing

## Key Features

### Visual Mapping
- **Edge Weights**: Inverted correlation (v0.1.3) - higher weight = thinner line
  - Weight 0.1 → 8px (closest)
  - Weight 30 → 0.5px (farthest)
- **Node Sizes**: 1-100px radius with slider control
- **Categories**: Optional categorization for nodes and edges

### Data Formats
- **Graph Export**: `{nodes: [...], edges: [...], scale, offset}`
- **Node**: `{id, x, y, label, color, radius, category}`
- **Edge**: `{id, from, to, weight, category}`

## Interaction Modes

1. **Node Mode**: Click to add nodes
2. **Edge Mode**: Click two nodes to connect
3. **Select Mode**: Drag nodes, right-click to edit

## File Operations
- **Save/Load**: JSON format via file dialog
- **SVG Export**: Vector graphics generation
- **Auto-save**: Server mode only (every minute)

## Common Tasks

### Adding New Features
1. Update `graph.js` for rendering logic
2. Update `app.js` for UI interactions
3. Update `index.html` for dialog templates
4. Update documentation (CHANGELOG.md, ARCHITECTURE.md, README.md)
5. Commit with semantic versioning [x.y.z]

### Weight Value Mapping
Current mapping uses inverted logarithmic scaling for distance/cost semantics. Located in `graph.js:getEdgeLineWidth()`.