# Debugging Lessons: Save/Load Button Database Context Issues

## Critical Findings from Database File Switching Investigation

### 1. Database Context Mismatch Between Menu and Buttons
**Issue**: Save button was saving to wrong database file (always `graph.db` instead of loaded file)
**Root Cause**: Load button wasn't properly switching database context like menu did
**Symptoms**: 
- Load new database file → appears to work but save still updates `graph.db`
- Graph appears empty after loading database file

### 2. Critical Architectural Insight
**Discovery**: Two completely different code paths for the same functionality

| Menu (Ctrl+O) | Load Button (Before Fix) |
|---------------|-------------------------|
| Uses `dialog.showOpenDialog()` directly | Uses `ipcRenderer.invoke('open-graph-file')` |
| Creates temporary dbManager to load data | Relies on returned data from IPC |
| Switches dbManager to new file | Only loads data, no db switch |
| Loads data from new database | Uses stale data from IPC |

### 3. Data Flow Analysis
**Menu Flow** (working correctly):
```
dialog.showOpenDialog() → create dbManager(filePath) → loadGraph(graphId) → send result → switch db → load data
```

**Load Button Flow** (broken):
```
ipcRenderer.invoke('open-graph-file') → get result → switch db → use stale data (WRONG!)
```

**Fixed Load Button Flow**:
```
ipcRenderer.invoke('open-graph-file') → get filePath → switch db → load from new db → use fresh data
```

### 4. Debugging Methodology

#### Step 1: Identify Context Switching Failure
- **Symptom**: Save button updates `graph.db` regardless of loaded file
- **Root Cause**: `dbManager.dbPath` never updated after file load

#### Step 2: Compare Code Paths
- **Menu**: `main.js:40-87` - proper db file switching
- **Load Button**: `app.js:107-140` - missing db context switch

#### Step 3: Validate Data Loading
- **Issue**: `loadGraphData(result.graphData)` uses data from temporary dbManager
- **Fix**: Load data from switched database instead

### 5. Implementation Fixes Applied

#### Fix 1: Load Button Database Switching
```javascript
// Before (broken)
await dbManager.openFile(result.filePath);
loadGraphData(result.graphData);  // Uses stale data

// After (fixed)
await dbManager.openFile(result.filePath);
const graphs = await dbManager.listGraphs();
const graphData = await dbManager.loadGraph(graphs[0].id);
loadGraphData(graphData);  // Uses fresh data from new db
```

#### Fix 2: Save Button Consistency
```javascript
// Both now use same mechanism
await saveGraphToDatabase();  // Uses current dbManager.dbPath
```

### 6. Critical Debugging Patterns

#### Pattern 1: Database Context Validation
```javascript
console.log('Current database:', dbManager?.dbPath);
console.log('Current graph ID:', currentGraphId);
```

#### Pattern 2: File Operation Verification
```javascript
console.log('Loading from:', filePath);
console.log('Switching database to:', result.filePath);
console.log('Database now pointing to:', dbManager.dbPath);
```

### 7. Prevention Strategies

#### 1. Unified File Operations
- **Create**: `file-operations.js` module
- **Purpose**: Centralize all file I/O operations
- **Benefit**: Ensure consistent behavior across UI elements

#### 2. Database Context Manager
```javascript
class DatabaseContext {
    constructor() {
        this.currentFile = null;
        this.dbManager = null;
    }
    
    async switchToFile(filePath) {
        await this.dbManager.openFile(filePath);
        this.currentFile = filePath;
        return this.dbManager;
    }
}
```

#### 3. Debug Logging Standards
```javascript
// Always log these on file operations
console.group('Database Operation');
console.log('Action:', operation);
console.log('Current file:', dbManager?.dbPath);
console.log('Target file:', targetPath);
console.log('Graph ID:', currentGraphId);
console.groupEnd();
```

### 8. Testing Checklist for File Operations

#### Before Any Database Operation:
- [ ] Current database path logged
- [ ] Target file path validated
- [ ] Database manager state verified

#### After File Load:
- [ ] Database context switched
- [ ] Graph data loaded from new file
- [ ] Current graph ID updated
- [ ] Save operations target correct file

#### Regression Testing:
- [ ] Load database A → make changes → save → verify A updated
- [ ] Load database B → make changes → save → verify B updated (not A)
- [ ] New database → save as → verify new file created

### 9. Common Pitfalls to Avoid

| Symptom | Root Cause | Prevention |
|---------|------------|------------|
| Saves to wrong file | Database context not switched | Always verify `dbManager.dbPath` |
| Empty graph after load | Using stale data from IPC | Load fresh data after db switch |
| Missing nodes/edges | Temporary dbManager closed | Use current dbManager for loading |

### 10. Future Architecture Recommendations

#### 1. Centralized File Manager
```javascript
// Single source of truth for file operations
const fileManager = {
    currentFile: null,
    load: async (filePath) => { /* unified loading */ },
    save: async (data) => { /* unified saving */ },
    getCurrentPath: () => this.currentFile
};
```

#### 2. Event-Driven Architecture
```javascript
// Emit events for file operations
eventBus.emit('file-loaded', { filePath, graphData });
eventBus.emit('file-saved', { filePath, graphData });
```

#### 3. State Management
```javascript
// Store current database state
const appState = {
    currentDatabaseFile: null,
    currentGraphId: null,
    isModified: false
};
```

---

**Lessons Learned**: Always verify that UI buttons use the same underlying mechanisms as menu items. Database context switching is a critical operation that must be handled consistently across all entry points.

**Last updated**: 2025-08-08  
**File**: `debugging-lessons-save-load-buttons.md`