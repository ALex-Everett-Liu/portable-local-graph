# Manual Graph Drawing App

A simple, interactive desktop application for manually drawing graphs using Node.js, Express, and Electron. Perfect for creating, editing, and managing graphs with an intuitive drag-and-drop interface.

## Features

### Core Functionality
- **Manual Node Creation**: Click anywhere on the canvas to add nodes
- **Edge Creation**: Connect two nodes by clicking them in sequence
- **Interactive Editing**: Drag nodes, edit labels, adjust edge weights
- **Visual Feedback**: Real-time rendering with smooth animations
- **Grid Background**: Snap-to-grid functionality with visual guides

### Editing Tools
- **Three Modes**: Node mode, Edge mode, and Select mode
- **Drag & Drop**: Move nodes around the canvas
- **Zoom & Pan**: Navigate large graphs with mouse wheel and drag
- **Right-click Context Menus**: Quick access to edit/delete options
- **Keyboard Shortcuts**: Efficient editing with Ctrl+Z, Ctrl+Y, etc.
- **Weight Visualization**: Edge thickness scales with weight values (0.1-30)

### Data Management
- **JSON Export/Import**: Save and load graphs as JSON files
- **SVG Export**: Export graphs as vector graphics
- **Auto-save**: Automatic backup every minute
- **Undo/Redo**: Unlimited undo/redo with history management
- **File Management**: Built-in file browser for saved graphs

### User Interface
- **Responsive Design**: Adapts to different screen sizes
- **Clean Toolbar**: Intuitive tool selection
- **Sidebar Info**: Real-time graph statistics and instructions
- **Dark Theme**: Modern, eye-friendly interface
- **Status Notifications**: Clear feedback for user actions

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Setup
1. Clone or download the project
2. Navigate to the project directory:
   ```bash
   cd manual-graph-app
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

## Usage

### Development Mode
```bash
# Start the Express server
npm run server

# In another terminal, start the Electron app
npm start

# Or for development with dev tools
npm run dev
```

### Production Build
```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build -- --win
npm run build -- --mac
npm run build -- --linux
```

### Web Mode
You can also run the app in a web browser:
```bash
npm run server
# Then open http://localhost:3001 in your browser
```

## User Guide

### Creating Your First Graph

1. **Launch the App**: Start the application and you'll see a grid canvas
2. **Add Nodes**: Select "Node Mode" (⚫) and click anywhere to add nodes
3. **Connect Nodes**: Switch to "Edge Mode" (🔗) and click two nodes to connect them
4. **Edit Properties**: Right-click nodes or edges to edit labels and weights
5. **Save Your Work**: Use Ctrl+S or the Save button to save as JSON

### Working with Categories

You can now assign categories to both nodes and edges for better organization:

#### Node Categories
- **Add categorized nodes**: When adding nodes programmatically, include a category parameter
- **Edit categories**: Right-click nodes to edit their category along with label and color
- **Visual grouping**: Nodes with the same category can be styled consistently

#### Edge Categories
- **Create categorized edges**: When connecting nodes, edges can be assigned categories
- **Update categories**: Right-click edges to modify their category and weight
- **Relationship types**: Use categories to define different types of relationships (e.g., "friend", "colleague", "family")

### Working with Modes

#### Node Mode
- **Click**: Add new node at cursor position
- **Right-click node**: Edit label and color
- **Drag**: Move nodes around (in Select mode)

#### Edge Mode
- **Click node 1**: Select starting node
- **Click node 2**: Create edge between nodes
- **Right-click edge**: Edit weight

#### Select Mode
- **Click**: Select/deselect nodes and edges
- **Drag**: Move selected nodes
- **Delete key**: Remove selected items

### Keyboard Shortcuts
- **Ctrl+N**: New graph
- **Ctrl+O**: Open graph
- **Ctrl+S**: Save graph
- **Ctrl+Z**: Undo
- **Ctrl+Y**: Redo
- **Delete**: Delete selected nodes/edges
- **Escape**: Switch to select mode

### Navigation
- **Mouse Wheel**: Zoom in/out
- **Drag**: Pan the canvas (in Select mode)
- **Right-click + drag**: Pan from anywhere

## File Formats

### JSON Format
Graphs are saved in a simple JSON format:
```json
{
  "nodes": [
    {
      "id": 1234567890,
      "x": 200,
      "y": 150,
      "label": "Node 1",
      "color": "#3b82f6",
      "radius": 25,
      "category": "person"
    }
  ],
  "edges": [
    {
      "id": 1234567891,
      "from": 1234567890,
      "to": 1234567892,
      "weight": 1.5,
      "category": "friend"
    }
  ],
  "scale": 1,
  "offset": {"x": 0, "y": 0}
}
```

### SVG Export
Vector graphics export includes:
- Scalable nodes with labels
- Weighted edges with values
- Clean, professional styling
- Suitable for presentations and documents

## API Endpoints

The Express server provides these REST endpoints:

- `GET /api/graph` - Get current graph data
- `POST /api/graph` - Save/update graph data
- `POST /api/graph/load` - Load graph from file
- `GET /api/graph/export/json` - Export as JSON
- `POST /api/graph/export/svg` - Export as SVG
- `GET /api/graphs` - List saved graphs
- `DELETE /api/graph/:filename` - Delete saved graph
- `POST /api/graph/validate` - Validate graph structure
- `POST /api/graph/stats` - Get graph statistics

## Configuration

### Environment Variables
- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment (development/production)

### Data Directory
- Graphs are saved in `./data/` directory
- Auto-saves occur every minute
- File names include timestamps for versioning

## Troubleshooting

### Common Issues

**App won't start:**
- Ensure Node.js is installed: `node --version`
- Check dependencies: `npm install`

**Canvas not rendering:**
- Try refreshing with F5 or Ctrl+R
- Check browser console for errors
- Ensure canvas has sufficient size

**Graph not saving:**
- Check file permissions
- Verify data directory exists
- Look for error messages in console

**Performance issues:**
- Reduce number of nodes/edges
- Clear browser cache
- Check system resources

### Debug Mode
Run with dev tools: `npm run dev`
This opens the Chrome DevTools for debugging.

## Contributing

Feel free to contribute improvements:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this in your own projects!

## Support

For issues or questions:
- Check the troubleshooting section
- Review browser console for errors
- Test with sample graphs provided
- Create an issue on GitHub