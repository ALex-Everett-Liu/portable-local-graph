# Graph JSON Format Documentation

This document describes the JSON format used by the Portable Local Graph application for storing and exchanging graph data.

## Overview

The JSON format represents a directed/undirected graph with nodes (vertices) and edges (connections) along with visual positioning and styling information.

## File Structure

```json
{
  "nodes": [...],
  "edges": [...],
  "scale": 1.078,
  "offset": { "x": 2.23, "y": -1.53 }
}
```

## Node Object Structure

Each node in the `nodes` array contains the following fields:

| Field | Type | Description | Required | Example |
|-------|------|-------------|----------|---------|
| `id` | string | Unique identifier (UUID v7) | ✅ | `"f75cd187-c31b-4bae-863a-8304e44ea019"` |
| `x` | number | X-coordinate on canvas | ✅ | `681` |
| `y` | number | Y-coordinate on canvas | ✅ | `337.6` |
| `label` | string | Display label text | ✅ | `"Node 1"` |
| `chineseLabel` | string | Chinese label text (optional) | ❌ | `"节点1"` |
| `color` | string | Node color in hex format | ✅ | `"#3b82f6"` |
| `radius` | number | Node radius in pixels | ✅ | `20` |
| `category` | string/null | Node category for grouping | ❌ | `null` |
| `layers` | array[string] | Layer assignments for filtering | ❌ | `["layer1", "ly2"]` |

### Node Color Values
- Default: `"#3b82f6"` (blue)
- Common alternatives: `"#6737E8"` (purple), `"#ef4444"` (red)

### Layer System
- Multiple layers can be assigned to each node
- Used for filtering and visibility control
- Layer names are arbitrary strings (e.g., `"layer1"`, `"ly2"`, `"ly3"`)

## Edge Object Structure

Each edge in the `edges` array contains the following fields:

| Field | Type | Description | Required | Example |
|-------|------|-------------|----------|---------|
| `id` | string | Unique identifier (UUID v7) | ✅ | `"b276db95-451d-4526-9969-bd710461b07d"` |
| `from` | string | Source node ID | ✅ | `"f75cd187-c31b-4bae-863a-8304e44ea019"` |
| `to` | string | Target node ID | ✅ | `"0f729271-e258-4d74-9993-9452a85e202a"` |
| `weight` | number | Edge weight (1-30) | ✅ | `1` |
| `category` | string/null | Edge category for grouping | ❌ | `null` |

### Weight Interpretation
- Weight values range from 0.1 to 30
- Lower weights = thicker lines (closer connections)
- Higher weights = thinner lines (distant connections)
- Default: `1`

## Viewport Configuration

### Scale
- Type: `number`
- Description: Zoom level multiplier
- Default: `1.0`
- Range: Any positive number

### Offset
- Type: `object` with `x` and `y` properties
- Description: Pan offset for the viewport
- Default: `{ "x": 0, "y": 0 }`

## Example Usage

### Basic Node
```json
{
  "id": "node-1",
  "x": 100,
  "y": 200,
  "label": "Start Node",
  "color": "#3b82f6",
  "radius": 20
}
```

### Node with All Features
```json
{
  "id": "complex-node",
  "x": 300,
  "y": 400,
  "label": "Processing Node",
  "chineseLabel": "处理节点",
  "color": "#6737E8",
  "radius": 25,
  "category": "processing",
  "layers": ["main", "debug"]
}
```

### Basic Edge
```json
{
  "id": "edge-1",
  "from": "node-1",
  "to": "node-2",
  "weight": 1
}
```

### Edge with Category
```json
{
  "id": "edge-2",
  "from": "node-1",
  "to": "node-3",
  "weight": 2.5,
  "category": "data-flow"
}
```

## Compatibility Notes

### Backward Compatibility
- All fields are optional except `id`, `x`, `y`, `label`, `color`, `radius` for nodes
- All fields are optional except `id`, `from`, `to`, `weight` for edges
- Missing optional fields will use default values

### Forward Compatibility
- Additional fields can be added without breaking compatibility
- Unknown fields will be ignored by the application

## Integration Examples

### JavaScript Usage
```javascript
// Load graph data
const graphData = JSON.parse(jsonString);

// Access nodes
graphData.nodes.forEach(node => {
  console.log(`Node ${node.label} at (${node.x}, ${node.y})`);
});

// Access edges
graphData.edges.forEach(edge => {
  console.log(`Edge from ${edge.from} to ${edge.to}`);
});
```

### Python Usage
```python
import json

# Load graph data
with open('graph.json', 'r') as f:
    graph_data = json.load(f)

# Process nodes
for node in graph_data['nodes']:
    print(f"Node {node['label']} at ({node['x']}, {node['y']})")

# Process edges
for edge in graph_data['edges']:
    print(f"Edge from {edge['from']} to {edge['to']}")
```

## File Naming Convention

Exported files follow the pattern: `graph_[timestamp].json`
- Timestamp format: Unix milliseconds
- Example: `graph_1755601245909.json`

## Validation Schema

For validation purposes, ensure:
1. `nodes` is an array of objects
2. `edges` is an array of objects
3. All node IDs are unique
4. All edge IDs are unique
5. All edge `from` and `to` values reference existing node IDs
6. `scale` is a positive number
7. `offset.x` and `offset.y` are numbers