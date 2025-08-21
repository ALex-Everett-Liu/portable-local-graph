# Debugging Lessons: Timezone Crisis Investigation

## Critical Timezone Issue Discovered

**Date**: 2025-08-21  
**Issue**: Database timestamps showing UTC time instead of Beijing local time (UTC+8)  
**Impact**: All saved records showing 8 hours behind actual local time

## Debug Process Timeline

### Phase 1: Initial Symptom Detection
```
[DEBUG] Local time: Thu Aug 21 2025 20:13:08 GMT+0800 (中国标准时间)
[DEBUG] UTC time: Thu, 21 Aug 2025 12:13:08 GMT
[DEBUG] SQLite UTC time: 2025-08-21 12:13:08
[DEBUG] SQLite local time: 2025-08-21 20:13:08
[DEBUG] SQLite timezone: null
```

**Problem**: Database stored `2025-08-21 12:13:08` (UTC) instead of `2025-08-21 20:13:08` (Beijing)

### Phase 2: Root Cause Analysis

#### 2.1 SQLite Default Behavior
- **CURRENT_TIMESTAMP**: Returns UTC time by default
- **datetime('now')**: Returns UTC time
- **datetime('now', 'localtime')**: Returns local system time

#### 2.2 Code Issues Identified

**Issue A: CREATE TABLE Defaults**
```sql
-- BEFORE (Problematic)
created_at DATETIME DEFAULT (datetime('now', 'localtime'))
-- SQLite ERROR: default value of column is not constant

-- AFTER (Fixed)
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
-- Accepts UTC as default, INSERT statements handle timezone
```

**Issue B: INSERT Statement Problems**
```sql
-- BEFORE (UTC time)
INSERT INTO nodes (...) VALUES (..., CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)

-- AFTER (Local time)
INSERT INTO nodes (...) VALUES (..., datetime('now', 'localtime'), datetime('now', 'localtime'))
```

**Issue C: String Concatenation Bug**
```javascript
// BEFORE (SQL Injection Risk)
VALUES (..., ${createdAt}, ...)

// AFTER (Safe Parameter Binding)
VALUES (..., COALESCE((SELECT created_at FROM nodes WHERE id = ?), datetime('now', 'localtime')), ...)
```

### Phase 3: Implementation Fixes

#### 3.1 CREATE TABLE Statements
```sql
-- All timestamp columns use CURRENT_TIMESTAMP as default
-- Actual timezone handling done in INSERT statements
CREATE TABLE nodes (
    id BLOB PRIMARY KEY,
    ...,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    modified_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 3.2 INSERT/UPDATE Logic
```javascript
// For new records
INSERT INTO nodes (..., created_at, modified_at)
VALUES (..., datetime('now', 'localtime'), datetime('now', 'localtime'))

// For existing records (preserve created_at)
INSERT INTO nodes (..., created_at, modified_at)
VALUES (..., COALESCE((SELECT created_at FROM nodes WHERE id = ?), datetime('now', 'localtime')), ...)
```

#### 3.3 Parameter Binding Fix
```javascript
// Safe parameter handling for UPSERT operations
const createdAtSQL = existingRow 
    ? "COALESCE((SELECT created_at FROM nodes WHERE id = ?), datetime('now', 'localtime'))"
    : "datetime('now', 'localtime')";

// Dynamic parameter lists based on record existence
let params, sql;
if (existingRow) {
    params = [..., edgeId]; // Include extra param for COALESCE
} else {
    params = [...]; // Standard parameters
}
```

### Phase 4: Verification Testing

#### 4.1 Test Results
```bash
# Test 1: SQLite function behavior
node -e "
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./test.db');
db.serialize(() => {
    db.run('CREATE TABLE test (id INTEGER, created_at DATETIME)');
    db.run('INSERT INTO test VALUES (1, datetime(\"now\", \"localtime\"))');
    db.get('SELECT * FROM test', (err, row) => {
        console.log('Test result:', row);
    });
});
"

# Results:
# Test result: { id: 1, created_at: '2025-08-21 20:18:29' } ✓
```

#### 4.2 Live Application Test
```
[DEBUG] Node f47a2c3b-8d4e-7f2a-9e1b-3c8f5a7b9d2e - existing created_at: 2025-08-21 20:20:15
[DEBUG] Nodes after save - actual timestamps: [
  { id: 'f47a2c3b-8d4e-7f2a-9e1b-3c8f5a7b9d2e', created_at: '2025-08-21 20:20:15', modified_at: '2025-08-21 20:20:15' }
]
```

## Technical Summary

### SQLite Timezone Functions
| Function | Returns | Use Case |
|----------|---------|----------|
| `CURRENT_TIMESTAMP` | UTC time | Default values |
| `datetime('now')` | UTC time | Manual UTC timestamps |
| `datetime('now', 'localtime')` | Local system time | Local timestamps |

### Critical Fix Points
1. **CREATE TABLE**: Use `CURRENT_TIMESTAMP` for defaults (SQLite requirement)
2. **INSERT**: Use `datetime('now', 'localtime')` for local time
3. **UPDATE**: Use `datetime('now', 'localtime')` for modified_at
4. **UPSERT**: Use `COALESCE` to preserve existing timestamps
5. **Parameters**: Always bind parameters safely

### Code Changes Applied
- **database-manager.js**: Fixed 12 instances of timestamp handling
- **CREATE TABLE**: 3 tables with proper defaults
- **INSERT/UPDATE**: 6 SQL statements updated
- **Parameter binding**: 4 UPSERT operations fixed
- **Debug logging**: Enhanced for verification

## Prevention Strategy

### 1. Timezone Testing Protocol
```bash
# Before any release
node -e "
console.log('System timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
console.log('Local time:', new Date().toLocaleString());
console.log('UTC time:', new Date().toUTCString());
"
```

### 2. Database Verification
```sql
-- Verify timestamp correctness
SELECT 
    created_at,
    modified_at,
    datetime('now', 'localtime') as expected_local,
    datetime('now') as expected_utc
FROM nodes LIMIT 5;
```

### 3. Cross-Platform Testing
- Test on systems with different timezones
- Verify behavior across UTC offsets
- Test daylight saving time transitions

## Lessons Learned

### 1. SQLite Function Behavior
- **Key insight**: `CURRENT_TIMESTAMP` ≠ local time
- **Solution**: Use `datetime('now', 'localtime')` for local time
- **Constraint**: Defaults must be `CURRENT_TIMESTAMP`

### 2. SQL Injection Prevention
- **Issue**: String concatenation in SQL is dangerous
- **Solution**: Always use parameter binding
- **Pattern**: COALESCE with subqueries for conditional values

### 3. Timezone Awareness
- **Problem**: Hard-coded timezone offsets break portability
- **Solution**: Use SQLite's `localtime` modifier
- **Benefit**: Works across all timezones automatically

### 4. Debug-Driven Development
- **Approach**: Add comprehensive logging before fixes
- **Benefit**: Verify behavior at each step
- **Pattern**: Log actual database values, not just expected ones

## Emergency Commands

### Check Current Timezone Behavior
```bash
# Quick timezone check
sqlite3 test.db "SELECT 
    datetime('now') as utc, 
    datetime('now', 'localtime') as local, 
    strftime('%Z') as timezone"

# Verify application behavior
node -e "
const db = require('./database-manager');
const dm = new db('./test.db');
dm.init().then(() => {
    console.log('Database initialized with local time handling');
});
"
```

---

**Resolution**: All timestamps now correctly display Beijing local time (UTC+8)  
**Testing**: Verified across multiple save/load cycles  
**Last updated**: 2025-08-21 20:25:00 (Beijing Time)  
**File**: `debugging-lessons-timezone-crisis.md`