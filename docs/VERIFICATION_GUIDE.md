# Database Isolation Verification Guide

## 🎯 Testing Data Contamination Fix

This guide helps you verify that the critical data contamination bug has been resolved.

## 📋 Test Scenario

The following test will confirm that switching between databases no longer causes data contamination:

### Test Setup

1. **Create Test Database A**:
   - Create a new graph with nodes: "Database A - Node 1", "Database A - Node 2"
   - Add a distinctive edge between them
   - Save as `test_database_A.db`

2. **Create Test Database B**:
   - Create a new graph (File → New Graph)
   - Add different nodes: "Database B - Node X", "Database B - Node Y"
   - Add a different edge between them
   - Save as `test_database_B.db`

### Critical Test Steps

3. **Test Database Switching**:
   - Close the application completely
   - Reopen the application
   - Load `test_database_A.db` → Should show only Database A nodes
   - Load `test_database_B.db` → Should show only Database B nodes
   - **CRITICAL**: Database B should NOT contain any Database A nodes

4. **Test Save As Operation**:
   - Load `test_database_A.db`
   - Use "Save As" to create `test_database_C.db`
   - The new file should contain exact copy of Database A content
   - Make some changes and save
   - Load `test_database_A.db` again → Should be unchanged (no contamination)

5. **Test Rapid Switching**:
   - Switch back and forth between databases several times
   - Each database should maintain its original content
   - No cross-contamination should occur

## ✅ Expected Results

### Before the Fix (Contaminated Behavior)
- Database B would contain nodes from Database A
- Save operations would merge data from previous databases
- Original files would be permanently corrupted

### After the Fix (Clean Behavior) 
- Each database contains only its own data
- No cross-contamination between databases
- Original files remain unmodified during switching
- Clean state isolation between all operations

## 🔍 Visual Verification

### What to Look For:
- **Node Count**: Each database should have exactly the nodes you created
- **Node Labels**: No foreign node labels should appear
- **Edge Count**: Edges should only connect nodes from the same database
- **File Integrity**: Original databases should remain unchanged after switching

### Debug Console (F12)
Look for these log messages confirming proper operation:
```
[DatabaseInstanceManager] Switching to database and loading content: [filepath]
[loadGraphFromDatabase] Loading graph with X nodes and Y edges
[DatabaseInstanceManager] Database switch and content loading completed
```

## 🚨 Warning Signs (If Present, Fix Failed)

- Nodes from different databases appear together
- Original databases show foreign data after switching
- Console shows connection switching without content loading
- Data merges instead of replacing during file operations

## 📞 If Issues Persist

If you still see data contamination after the fix:
1. Check console logs (F12) for error messages
2. Verify all files have been updated with the latest changes
3. Restart the application completely
4. Report the issue with specific reproduction steps

## 🎉 Success Confirmation

**The fix is working correctly when**:
- Database switching shows clean, isolated content
- Save As operations create independent file copies
- Original databases remain uncontaminated
- Each database maintains its distinct data integrity 