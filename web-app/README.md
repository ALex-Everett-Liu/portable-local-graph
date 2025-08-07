# Portable Graph Web Application

A modern, web-based interactive graph visualization tool built with vanilla JavaScript. Perfect for creating, editing, and analyzing node-edge diagrams directly in your browser.

## Features

### 🎨 **Modern Interface**
- Clean, responsive design with dark/light mode support
- Intuitive toolbar with mode switching
- Real-time performance monitoring

### 🖱️ **Interactive Editing**
- **Select Mode**: Drag nodes, pan canvas, multi-select
- **Node Mode**: Click to add new nodes with customizable properties
- **Edge Mode**: Connect nodes by clicking pairs

### 📊 **Performance Optimized**
- Spatial indexing for fast node/edge detection
- Viewport culling for efficient rendering
- Real-time FPS counter and performance metrics
- Handles 1000+ nodes smoothly

### 🔄 **Advanced Features**
- Undo/Redo with configurable history size
- Auto-save to localStorage every 30 seconds
- Import/export JSON files
- Export to SVG format
- Keyboard shortcuts for power users

### 📋 **Data Management**
- Local file system access
- Server API for persistent storage
- Sample graphs included
- Graph statistics and validation

## Quick Start

### Option 1: Local Development Server

```bash
cd web-app
npm install
npm start
```

Visit `http://localhost:3000`

### Option 2: Static File Serving

Simply open `index.html` in your browser - no server required!

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .

# Using PHP
php -S localhost:8000
```

### Option 3: Vercel Deployment

1. Push to GitHub
2. Import to Vercel
3. Deploy!

## Usage

### Basic Operations

| Action | Method |
|--------|--------|
| Add Node | Switch to Node Mode → Click canvas |
| Add Edge | Switch to Edge Mode → Click two nodes |
| Move Node | Select Mode → Drag node |
| Pan Canvas | Select Mode → Drag empty space |
| Zoom | Mouse wheel or toolbar buttons |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1` | Select Mode |
| `2` | Node Mode |
| `3` | Edge Mode |
| `Delete/Backspace` | Delete selected |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+S` | Export |
| `Ctrl+O` | Import |
| `Escape` | Deselect all |

### Node Properties
- **Label**: Display text
- **Color**: Visual customization
- **Size**: Radius from 5-50px
- **Category**: Optional grouping

### Edge Properties
- **Weight**: 0.1-30 (affects line thickness)
- **Category**: Optional grouping

## API Reference

### REST Endpoints

#### GET `/api/graphs`
List all saved graphs

#### GET `/api/graphs/:id`
Load specific graph

#### POST `/api/graphs`
Save graph data

#### DELETE `/api/graphs/:id`
Delete graph

#### POST `/api/graphs/:id/svg`
Export as SVG

### Graph Data Format

```json
{
  "format": "graph-data-v1",
  "timestamp": "2025-08-07T12:00:00.000Z",
  "nodes": [
    {
      "id": "node-1",
      "x": 100,
      "y": 200,
      "label": "My Node",
      "color": "#3b82f6",
      "radius": 20,
      "category": "process"
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "from": "node-1",
      "to": "node-2",
      "weight": 2.5,
      "category": "flow"
    }
  ],
  "scale": 1.0,
  "offset": { "x": 0, "y": 0 }
}
```

## Performance Guidelines

### For Large Graphs (>500 nodes)
- Use categories to organize content
- Avoid overlapping labels
- Use zoom levels effectively
- Consider splitting into multiple graphs

### Memory Usage
- **100 nodes**: ~50KB
- **1000 nodes**: ~500KB
- **5000 nodes**: ~2.5MB

### Browser Support
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Development

### Project Structure
```
web-app/
├── index.html              # Main application
├── css/
│   └── styles.css          # Styling
├── js/
│   ├── graph-engine.js     # Core graph logic
│   ├── app-controller.js   # UI controller
│   └── data-manager.js     # Data operations
├── data/
│   ├── sample-graph.json   # Example graph
│   └── pages.json         # Help content
├── server.js              # Express server
└── package.json
```

### Local Development

```bash
# Install dependencies
npm install

# Development with auto-reload
npm run dev

# Production server
npm start
```

## Sample Graphs

Load these sample graphs to get started:

1. **Workflow Graph** - Basic process flow (included)
2. **Social Network** - Person connections
3. **System Architecture** - Component relationships
4. **Decision Tree** - Hierarchical decisions

## Troubleshooting

### Common Issues

**Graph won't load**
- Check browser console for errors
- Verify JSON file format
- Ensure file size < 10MB

**Performance issues**
- Reduce number of visible elements
- Use zoom to focus on specific areas
- Check FPS counter in performance panel

**Export fails**
- Check browser permissions
- Try different browser
- Use server mode for larger files

### Browser Console
Open developer tools (F12) to see:
- Performance metrics
- Error messages
- Debug information

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## License

MIT License - feel free to use for any purpose.

## Support

- **Issues**: Report on GitHub
- **Questions**: Check the help panel in-app
- **Examples**: See sample graphs in `data/` directory