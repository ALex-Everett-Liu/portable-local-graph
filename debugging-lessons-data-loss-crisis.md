# Debugging Lessons: Database Data Loss Crisis

## Critical Database Destruction Issues Discovered

### 1. Auto-Save System Causing Data Loss During Load
**Issue**: Load operations were triggering auto-save which overwrote database files
**Root Cause**: `saveState()` called during `loadGraphData()` → auto-save timer → `saveGraphToDatabase()`
**Symptoms**: 
- Database files emptied after loading
- Second load shows empty graphs
- Data mysteriously disappears

### 2. New Graph Button Destroying Database Files
**Issue**: "New Graph" button overwrites current database instead of creating new
**Root Cause**: `newGraph()` calls `saveGraphToDatabase()` which saves empty state to current file
**Symptoms**: 
- Click "New Graph" → current database file becomes empty
- Original database permanently destroyed
- No way to recover original data

### 3. LoadDefaultGraph Overwriting Database
**Issue**: Initial default graph creation overwrites existing database
**Root Cause**: `loadDefaultGraph()` calls `saveState()` → auto-save → overwrite database
**Symptoms**: 
- Fresh start destroys existing database
- Default graph overwrites user data

## Critical Code Analysis

### The Killer Pattern (Before Fix)
```javascript
// These functions were DESTROYING databases:

// Issue 1: Load operations
function loadGraphData(data) {
    graph.importData(data);
    saveState();  // ← TRIGGERS AUTO-SAVE
}

// Issue 2: New graph creation
async function newGraph() {
    graph.clear();
    await saveGraphToDatabase();  // ← OVERWRITES CURRENT DB
    saveState();                  // ← TRIGGERS AUTO-SAVE
}

// Issue 3: Default graph
function loadDefaultGraph() {
    createDefaultGraph();
    saveState();  // ← TRIGGERS AUTO-SAVE
}
```

### Auto-Save Death Chain
```javascript
function saveState() {
    appState.isModified = true;
    
    // This was the killer line:
    setTimeout(() => {
        await saveGraphToDatabase();  // ← OVERWRITES DATABASE
    }, 1000);
}
```

## Emergency Fixes Applied

### Fix 1: Complete Auto-Save Removal
```javascript
// BEFORE (DEADLY)
setTimeout(() => {
    await saveGraphToDatabase();
}, 1000);

// AFTER (SAFE)
// Auto-save completely removed - manual save only!
```

### Fix 2: Load Operations Protection
```javascript
// BEFORE (DESTROYS DATA)
function loadGraphData(data) {
    graph.importData(data);
    saveState();  // ← OVERWRITES DATABASE
}

// AFTER (SAFE)
function loadGraphData(data) {
    graph.importData(data);
    // CRITICAL: No saveState() call!
    updateGraphInfo();
    graph.render();
}
```

### Fix 3: New Graph Safety
```javascript
// BEFORE (DESTROYS DATABASE)
async function newGraph() {
    graph.clear();
    await saveGraphToDatabase();  // ← OVERWRITES CURRENT FILE
}

// AFTER (SAFE)
async function newGraph() {
    graph.clear();
    // CRITICAL: No database operations!
    console.log('[newGraph] Created new graph - use Save As for new database');
}
```

### Fix 4: Default Graph Protection
```javascript
// BEFORE (OVERWRITES DATABASE)
function loadDefaultGraph() {
    createDefaultGraph();
    saveState();  // ← TRIGGERS SAVE
}

// AFTER (SAFE)
function loadDefaultGraph() {
    createDefaultGraph();
    // CRITICAL: No save operations!
    appState.isModified = false;
    updateGraphInfo();
    graph.render();
}
```

## Prevention Strategy: Manual Save Only

### New Architecture Rules
1. **Manual Save Only**: All saves triggered by explicit user action
2. **No Auto-Save**: Complete removal of all automatic save mechanisms
3. **Clear Intent**: Save operations only happen on explicit user commands
4. **Database Protection**: Load operations never trigger writes

### Safe Operation Patterns
```javascript
// Safe Save Operations
- Ctrl+S: Save to current database
- Ctrl+Shift+S: Save As new database
- Save button: Save to current database
- Save As button: Create new database

// Safe Load Operations
- Load button: Read-only operation
- Open file: Read-only operation
- New graph: Clear canvas only
```

## Critical Testing Protocol

### Before Any Release
- [ ] Load database → verify data intact
- [ ] New graph → verify current database untouched
- [ ] Load different database → verify original unchanged
- [ ] Save operation → verify targets correct file
- [ ] Save As → verify creates new file
- [ ] Multiple load/save cycles → verify no data loss

### Emergency Recovery Notes
- Database files are SQLite format
- If corrupted, may be recoverable via SQLite tools
- Always backup before testing new features
- Test with copies of important databases

## Lessons Learned

### 1. Auto-Save is Dangerous
- **Never** implement auto-save without explicit user consent
- **Always** provide clear indication of save operations
- **Consider** destructive operations carefully

### 2. Load Operations Must Be Read-Only
- **Never** trigger writes during load
- **Always** isolate load from save operations
- **Consider** separate read/write contexts

### 3. New File Creation
- **Never** overwrite existing files without explicit Save As
- **Always** create new files via explicit Save As
- **Provide** clear user feedback about file operations

### 4. Testing Protocol
- **Test** with real user data
- **Verify** file integrity after operations
- **Test** edge cases like empty databases
- **Document** all file operations clearly

## Emergency Commands
```bash
# Backup critical databases before testing
cp *.db backup_$(date +%Y%m%d_%H%M%S)/

# Verify database integrity
sqlite3 yourfile.db ".tables"
sqlite3 yourfile.db "SELECT COUNT(*) FROM nodes"
sqlite3 yourfile.db "SELECT COUNT(*) FROM edges"
```

---

**CRITICAL WARNING**: These bugs caused **complete data loss**. Always backup databases before testing new features.

**Last updated**: 2025-08-08  
**File**: `debugging-lessons-data-loss-crisis.md`