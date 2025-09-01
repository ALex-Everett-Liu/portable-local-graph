# Graph JSON Format Documentation

This document describes the JSON format used by the Portable Local Graph application for storing and exchanging graph data.

## Overview

The JSON format represents a directed/undirected graph with nodes (vertices) and edges (connections) along with visual positioning and styling information, including creation and modification timestamps for audit trails.

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
| `created_at` | string | Creation timestamp | ✅ | `"2025-08-21 01:35:37"` |
| `modified_at` | string | Last modification timestamp | ✅ | `"2025-08-21 01:35:37"` |

### Node Color Values
- Default: `"#3b82f6"` (blue)
- Common alternatives: `"#6737E8"` (purple), `"#ef4444"` (red)

### Layer System
- Multiple layers can be assigned to each node
- Used for filtering and visibility control
- Layer names are arbitrary strings (e.g., `"layer1"`, `"ly2"`, `"ly3"`)

### Timestamp Format
- Format: `"YYYY-MM-DD HH:mm:ss"`
- Timezone: Local system time
- Both `created_at` and `modified_at` use the same format
- `modified_at` is updated whenever the node is edited

## Edge Object Structure

Each edge in the `edges` array contains the following fields:

| Field | Type | Description | Required | Example |
|-------|------|-------------|----------|---------|
| `id` | string | Unique identifier (UUID v7) | ✅ | `"b276db95-451d-4526-9969-bd710461b07d"` |
| `from` | string | Source node ID | ✅ | `"f75cd187-c31b-4bae-863a-8304e44ea019"` |
| `to` | string | Target node ID | ✅ | `"0f729271-e258-4d74-9993-9452a85e202a"` |
| `weight` | number | Edge weight (0.1-30) | ✅ | `1` |
| `category` | string/null | Edge category for grouping | ❌ | `null` |
| `created_at` | string | Creation timestamp | ✅ | `"2025-08-21 01:35:37"` |
| `modified_at` | string | Last modification timestamp | ✅ | `"2025-08-21 01:35:37"` |

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
  "radius": 20,
  "created_at": "2025-01-26 14:30:00",
  "modified_at": "2025-01-26 14:30:00"
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
  "layers": ["main", "debug"],
  "created_at": "2025-01-26 14:30:00",
  "modified_at": "2025-01-26 15:45:12"
}
```

### Basic Edge
```json
{
  "id": "edge-1",
  "from": "node-1",
  "to": "node-2",
  "weight": 1,
  "created_at": "2025-01-26 14:32:00",
  "modified_at": "2025-01-26 14:32:00"
}
```

### Edge with Category
```json
{
  "id": "edge-2",
  "from": "node-1",
  "to": "node-3",
  "weight": 2.5,
  "category": "data-flow",
  "created_at": "2025-01-26 14:33:00",
  "modified_at": "2025-01-26 16:20:45"
}
```

## Compatibility Notes

### Backward Compatibility
- All fields are optional except core required fields
- **Nodes**: Required fields are `id`, `x`, `y`, `label`, `color`, `radius`, `created_at`, `modified_at`
- **Edges**: Required fields are `id`, `from`, `to`, `weight`, `created_at`, `modified_at`
- Missing optional fields will use default values
- Older files without timestamp fields should be migrated

### Forward Compatibility
- Additional fields can be added without breaking compatibility
- Unknown fields will be ignored by the application

### Migration Notes
- Files created before timestamp implementation may lack `created_at`/`modified_at` fields
- Import functions should auto-populate missing timestamps with current time
- Export functions always include timestamp fields

## Integration Examples

### JavaScript Usage
```javascript
// Load graph data
const graphData = JSON.parse(jsonString);

// Access nodes with timestamps
graphData.nodes.forEach(node => {
  console.log(`Node ${node.label} created: ${node.created_at}, modified: ${node.modified_at}`);
  console.log(`Position: (${node.x}, ${node.y})`);
});

// Access edges with timestamps
graphData.edges.forEach(edge => {
  console.log(`Edge ${edge.id} from ${edge.from} to ${edge.to}`);
  console.log(`Weight: ${edge.weight}, created: ${edge.created_at}`);
});

// Filter by creation date
const recentNodes = graphData.nodes.filter(node => {
  const created = new Date(node.created_at);
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return created > dayAgo;
});
```

### Python Usage
```python
import json
from datetime import datetime, timedelta

# Load graph data
with open('graph.json', 'r') as f:
    graph_data = json.load(f)

# Process nodes with timestamps
for node in graph_data['nodes']:
    print(f"Node {node['label']} at ({node['x']}, {node['y']})")
    print(f"Created: {node['created_at']}, Modified: {node['modified_at']}")

# Process edges with timestamps
for edge in graph_data['edges']:
    print(f"Edge from {edge['from']} to {edge['to']}")
    print(f"Weight: {edge['weight']}, Created: {edge['created_at']}")

# Find recently modified nodes
recent_cutoff = datetime.now() - timedelta(hours=24)
recent_nodes = [
    node for node in graph_data['nodes']
    if datetime.strptime(node['modified_at'], '%Y-%m-%d %H:%M:%S') > recent_cutoff
]
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
8. All nodes have valid `created_at` and `modified_at` timestamps
9. All edges have valid `created_at` and `modified_at` timestamps
10. Timestamp format matches `YYYY-MM-DD HH:mm:ss` pattern
11. `modified_at` timestamp should be >= `created_at` timestamp

## Audit Trail Features

### Timestamp Tracking
- **Creation tracking**: `created_at` records when nodes/edges were first created
- **Modification tracking**: `modified_at` updates whenever properties change
- **Data integrity**: Timestamps help identify data freshness and change patterns

### Use Cases
- **Version control**: Track when elements were added or modified
- **Data analysis**: Analyze graph evolution over time
- **Debugging**: Identify recent changes that might have caused issues
- **Collaboration**: See who made changes and when (when combined with user tracking)

### Best Practices
- Always update `modified_at` when making changes to node/edge properties
- Preserve `created_at` during data migrations
- Use consistent timestamp format across all records
- Consider timezone implications when sharing files across regions