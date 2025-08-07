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
- **Weight Visualization**: Edge thickness scales inversely with weight values (0.1-30), supporting both connection strength and distance/cost semantics
- **Node Size Control**: Adjustable node radius from 1-100 pixels with slider control

### Data Management
- **SQLite Database**: Primary storage with real-time persistence
- **JSON Export/Import**: Backup and sharing via JSON files
- **SVG Export**: Export graphs as vector graphics
- **Auto-save**: Automatic database updates every second
- **Undo/Redo**: Unlimited undo/redo with history management
- **Graph Selection**: Browse and load from multiple saved graphs

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

### Database Storage

The application now uses **SQLite database as primary storage** with JSON as backup format:

#### **SQLite Database (Primary)**
- **Real-time persistence**: All changes automatically saved to database
- **Graph selection**: Browse available graphs with interactive dialog
- **No data loss**: Survives crashes and browser restarts
- **Multiple graphs**: Support for unlimited saved graphs

#### **JSON Format (Backup/Export)**
- **Import/Export**: JSON files for backup and sharing
- **Migration**: Existing JSON files automatically imported to database
- **Compatibility**: Full backward compatibility maintained

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
- **Ctrl+O**: Open graph database selection dialog
- **Ctrl+S**: Save to database (auto-save also enabled)
- **Ctrl+Z**: Undo
- **Ctrl+Y**: Redo
- **Delete**: Delete selected nodes/edges
- **Escape**: Switch to select mode

### Navigation
- **Mouse Wheel**: Zoom in/out
- **Drag**: Pan the canvas (in Select mode)
- **Right-click + drag**: Pan from anywhere

## File Formats

### Loading Graphs

#### **SQLite Database (Primary Storage)**
- **Real-time persistence**: All changes automatically saved to database
- **Graph selection**: Interactive dialog for browsing saved graphs
- **No file selection needed**: Graphs loaded from database directly
- **Multiple graphs**: Support for unlimited saved graphs in single database

#### **JSON Format (Backup/Export)**
Graphs can still be imported and exported in JSON format:
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

### Graph Operations
- `GET /api/graphs` - List all available graphs (SQLite databases)
- `POST /api/graph/:id` - Save graph to specific SQLite database
- `GET /api/graph/:id` - Load graph from specific SQLite database
- `DELETE /api/graph/:id` - Delete specific graph database

### Import/Export
- `POST /api/graph/:id/import/json` - Import JSON data to SQLite database
- `GET /api/graph/:id/export/json` - Export SQLite data to JSON format
- `POST /api/graph/:id/export/svg` - Export graph as SVG vector graphics

### Statistics & Validation
- `GET /api/graph/:id/stats` - Get graph statistics
- `POST /api/graph/:id/validate` - Validate graph structure

### Legacy Support (for backward compatibility)
- `GET /api/graph` - Get current graph (legacy)
- `POST /api/graph` - Save current graph (legacy)

## Configuration

### Environment Variables
- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment (development/production)

### Data Directory
- Graphs are saved as isolated `.db` files in `./data/` directory
- Each graph has its own SQLite database file
- Auto-saves occur every minute to the active graph's database
- JSON import/export maintains backward compatibility
- Migration tools available for existing JSON files

### Usage Notes
- **Database-first**: All operations use SQLite database as primary storage
- **JSON Compatibility**: JSON import/export available for external sharing
- **No manual migration**: Existing JSON files imported automatically
- **Real-time persistence**: Changes saved automatically without user action

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