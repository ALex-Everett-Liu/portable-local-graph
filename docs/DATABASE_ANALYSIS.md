# Database Connection Architecture Analysis

## Overview
This document analyzes the current database management architecture in the Portable Local Graph application, identifies issues, and provides a comprehensive understanding of the database connection lifecycle.

## Current File Structure

### Database Management Files
```
src/
├── main/main.js                    # Electron main process IPC handlers
├── server/sqlite-manager.js        # Core SQLite database implementation
├── renderer/
│   ├── db-instance-manager.js      # Singleton database instance manager
│   ├── file-operations.js          # File operations with database access
│   ├── ipc-setup.js                # IPC communication setup
│   ├── event-handlers.js           # UI event handlers
│   └── svg-export.js               # SVG export with database access
```

## Current Architecture Components

### 1. DatabaseManager Class (sqlite-manager.js)
- **Purpose**: Core SQLite database implementation
- **Location**: `src/server/sqlite-manager.js`
- **Features**:
  - Direct SQLite connection management
  - CRUD operations for graph data
  - JSON import/export functionality
  - UPSERT operations for data persistence

### 2. DatabaseInstanceManager (db-instance-manager.js)
- **Purpose**: Singleton pattern for database lifecycle management
- **Location**: `src/renderer/db-instance-manager.js`
- **Features**:
  - Manages single database instance per application lifecycle
  - Provides atomic file switching
  - Cleans up old connections
  - Maintains current file path state

### 3. IPC Layer (main.js)
- **Purpose**: Electron main process database handling
- **Location**: `src/main/main.js`
- **Features**:
  - Creates temporary DatabaseManager instances for file operations
  - Handles Save As operations with fresh connections
  - Manages file dialogs and filesystem operations

## Current Issues Identified

### 1. Inconsistent Variable References
- **Problem**: Files use `dbManager` which doesn't exist in scope
- **Affected Files**: event-handlers.js, file-operations.js, svg-export.js
- **Root Cause**: Migration from direct database access to singleton pattern without updating all references

### 2. Loading Order Dependencies
- **Problem**: Files loaded as `<script>` tags create global scope conflicts
- **Affected Mechanism**: HTML script loading in index.html
- **Root Cause**: Multiple files declaring same variable names in global scope

### 3. Scope Isolation Issues
- **Problem**: Database instance management not properly isolated
- **Affected Files**: All renderer process files
- **Root Cause**: Mixing of module loading and global script loading

### 4. Redundant Database Manager Creation
- **Problem**: Some files create new DatabaseManager instances unnecessarily
- **Affected Areas**: Save As operations, file switching
- **Root Cause**: Incomplete migration to singleton pattern

## Current Access Patterns

### Correct Pattern (Singleton)
```javascript
const dbInstanceManager = (typeof require !== 'undefined') 
    ? require('./db-instance-manager').dbInstanceManager 
    : window.dbInstanceManager;

const currentDb = dbInstanceManager.getCurrentDb();
```

### Incorrect Patterns (To be fixed)
```javascript
// These patterns cause undefined errors
if (dbManager) { ... }  // dbManager is undefined
await dbManager.openFile(...)  // dbManager is undefined
```

## Analysis of Database Lifecycle

### 1. Application Startup
1. `index.html` loads scripts in order
2. `db-instance-manager.js` creates global singleton
3. `ipc-setup.js` or web mode initialization occurs
4. Database initialization happens via `initializeDatabase()`

### 2. File Operations Flow
1. User triggers file operation (save/load)
2. Event handler calls appropriate function
3. Function gets current database via singleton
4. Operation performed on current database instance

### 3. File Switching Flow
1. User opens new database file
2. `dbInstanceManager.openFile(newPath)` called
3. Old database connection closed
4. New DatabaseManager instance created for new file
5. All operations now use new instance

## Critical Design Decisions

### 1. Singleton Pattern vs Multiple Instances
- **Current**: Singleton pattern for renderer process
- **Server**: Temporary instances for file operations
- **Rationale**: Ensures data isolation and prevents connection leaks

### 2. Global vs Module Scope
- **Renderer**: Uses global `window.dbInstanceManager` for web mode
- **Electron**: Uses `require()` for module loading
- **Rationale**: Maintains compatibility across environments

### 3. IPC vs Direct Access
- **Renderer**: Uses singleton for all database operations
- **Main Process**: Creates temporary instances for file operations
- **Rationale**: Security isolation and proper resource management

## Recommended Next Steps

### Immediate Fixes Required
1. **Complete variable reference cleanup** in all renderer files
2. **Verify loading order** in HTML script tags
3. **Test file switching** functionality
4. **Validate database isolation** between files

### Testing Checklist
- [ ] New graph creation
- [ ] Save to existing database
- [ ] Save As to new database
- [ ] Open existing database
- [ ] Switch between databases
- [ ] Web mode functionality
- [ ] Electron mode functionality

### Architecture Validation
- [ ] Singleton pattern working correctly
- [ ] Database connections properly closed
- [ ] File switching maintains data isolation
- [ ] All error cases handled gracefully

## File-by-File Status

| File | Status | Issues | Notes |
|------|--------|--------|-------|
| db-instance-manager.js | ✅ Complete | None | Singleton pattern implemented |
| file-operations.js | ✅ Complete | Fixed | All dbManager references updated |
| ipc-setup.js | ✅ Complete | Fixed | All dbManager references updated |
| event-handlers.js | ✅ Complete | Fixed | All dbManager references updated |
| svg-export.js | ✅ Complete | Fixed | All dbManager references updated |
| main.js | ✅ Complete | None | Uses temporary instances (correct) |
| server.js | ✅ Complete | None | Uses temporary instances (correct) |

## Critical Data Contamination Issue Discovered

### Problem Description
**Severe Database Isolation Failure**: When switching between different database files, data from previously loaded databases contaminates the currently active database file during save operations.

### Symptoms
- **Cross-database data mixing**: Nodes and edges from previously loaded databases appear in the wrong database file
- **Data persistence across file switches**: Previous database data survives file switching
- **File corruption**: Original database files get polluted with foreign data
- **Silent data loss**: Original data may be overwritten without user awareness

### Root Cause Analysis
The issue occurs because:
1. **Graph state is not properly cleared** when switching database files
2. **Application state (graph.nodes, graph.edges) retains previous data**
3. **Save operations merge current graph state with new database instead of replacing**
4. **No clean separation between database switching and graph state management**

### Technical Details
- **Affected Operations**: Save, Save As, Open File operations
- **Data Contamination Pattern**: 
  - Load database A (contains nodes X, Y)
  - Load database B (contains nodes P, Q)
  - Save to database B → now contains nodes X, Y, P, Q
- **Persistence**: Contaminated data survives application restarts

### Reproduction Steps
1. Create a new graph with nodes A, B, C and save to file1.db
2. Create another graph with nodes X, Y, Z and save to file2.db
3. Close and reopen application
4. Load file1.db (shows A, B, C correctly)
5. Load file2.db (should show X, Y, Z, but may also show A, B, C)
6. Save file2.db (now contains mixed data)

### Critical Impact
- **Data Integrity**: Original database files are permanently corrupted
- **User Trust**: Users cannot rely on database isolation
- **Backup Requirements**: Users must backup files before any operations
- **Workflow Disruption**: Database switching becomes unreliable

## Updated Testing Priority

### High Priority Tests
- [ ] **Database Isolation Test**: Verify no cross-contamination between databases
- [ ] **Clean State Test**: Ensure graph state is cleared on file switch
- [ ] **Save Integrity Test**: Verify save operations don't merge data
- [ ] **File Switching Test**: Test rapid switching between multiple databases
- [ ] **Data Persistence Test**: Verify original database files remain unchanged

### Investigation Required
- [ ] **Graph state cleanup mechanism** on file switch
- [ ] **Application state reset** procedures
- [ ] **Database connection lifecycle** verification
- [ ] **Graph import/export** isolation verification
- [ ] **Memory management** for graph data

## Updated Architecture Analysis

### Critical Design Flaw
The current architecture successfully isolates database connections but **fails to isolate graph state**, creating the contamination vulnerability.

### Required Fixes
1. **Implement graph state reset** on file switching
2. **Add data validation** before save operations
3. **Create clean separation** between database and application state
4. **Add integrity checks** for database operations

## Updated File-by-File Status

| File | Status | Issues | Notes |
|------|--------|--------|-------|
| db-instance-manager.js | ⚠️ Needs Review | Data isolation failure | Singleton pattern works but state management needs fixing |
| file-operations.js | ⚠️ Needs Review | May not clear state properly | Need to verify clean state on file switch |
| ipc-setup.js | ⚠️ Needs Review | Graph state persistence | Need to ensure state reset on file operations |
| event-handlers.js | ⚠️ Needs Review | State management | Need to verify clean state on file switch |
| graph.js | ⚠️ Needs Review | State management | Core state management needs isolation |

## Next Steps Priority

### Immediate Actions
1. **Implement graph state reset** on file switching
2. **Add data isolation verification** tests
3. **Create state cleanup mechanisms** for file operations
4. **Test database switching** with sample data

### Investigation Required
- [ ] **Graph state reset implementation** in graph.js
- [ ] **Application state cleanup** in app-state.js
- [ ] **Database switching validation** in db-instance-manager.js
- [ ] **Memory leak detection** in state management

## Conclusion

**CRITICAL**: While the variable reference issues have been resolved, the database architecture has a **fundamental data isolation flaw** that causes severe data contamination. This requires immediate attention to prevent permanent data loss and corruption.

The architecture is sound at the connection level but **fails at the application state level**. The next phase must focus on proper state isolation and cleanup mechanisms.