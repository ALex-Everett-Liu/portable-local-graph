# Minimal Graph

A lightweight, browser-based graph drawing application with core functionality only.

## Features

- **Node Management**: Add, edit, delete, and drag nodes
- **Edge Creation**: Connect nodes with weighted edges
- **Three Interaction Modes**:
  - Select: Drag nodes and select elements
  - Add Node: Click to create new nodes
  - Add Edge: Click two nodes to connect them
- **File Operations**: Save/load graphs as JSON
- **Context Menu**: Right-click to edit or delete elements

## Usage

1. Open `index.html` in a web browser
2. Use the toolbar buttons to switch between modes:
   - **Select**: Drag existing nodes around
   - **Add Node**: Click on canvas to create nodes
   - **Add Edge**: Click two nodes to connect them
3. Right-click on nodes/edges to edit properties or delete them
4. Use Save/Load buttons to persist your graphs

## File Structure

- `index.html` - Main HTML interface
- `graph.js` - Core graph rendering and logic
- `app.js` - UI interactions and event handling

## Technical Details

- Pure HTML5 Canvas + JavaScript (no frameworks)
- No backend dependencies
- Responsive canvas that fills available space
- Weight-based edge thickness (higher weight = thinner line)
- Simple JSON format for data persistence

## Data Format

```json
{
  "nodes": [
    {
      "id": 1234567890.123,
      "x": 100,
      "y": 100,
      "label": "Node 1",
      "color": "#3b82f6",
      "radius": 20
    }
  ],
  "edges": [
    {
      "id": 1234567890.456,
      "from": 1234567890.123,
      "to": 1234567890.789,
      "weight": 1.0
    }
  ]
}
```

## Browser Compatibility

Works in modern browsers that support HTML5 Canvas and ES6.