# 🚨 CODING STANDARDS - STRICT ENFORCEMENT

## ❌ ABSOLUTE PROHIBITIONS

### File Length Limits
- **NO file > 200 lines** (except compatibility layers marked DEPRECATED)
- **NO class > 150 lines** 
- **NO function > 50 lines**

### Prohibited Practices
- ❌ **NO monolithic classes** - Split after 150 lines
- ❌ **NO god objects** - Single responsibility only
- ❌ **NO duplication** - Extract to utilities
- ❌ **NO inline complexity** - Extract to focused modules

## ✅ REQUIRED PRACTICES

### Modular Architecture
```
js/
├── core/           # Data structures only
├── rendering/      # Canvas operations only
├── filtering/      # Filter logic only
├── analysis/       # Algorithms only
├── utils/          # Pure functions only
└── ui/             # UI components only
```

### File Structure Rules
1. **One class per file** maximum
2. **One concern per module** maximum
3. **Extract after 50 lines** - no exceptions
4. **Pure functions preferred** over methods
5. **Dependency injection** required

### Enforcement Checklist
- [ ] Run `wc -l *.js` before commit
- [ ] Any file > 200 lines must be split
- [ ] Any class > 150 lines must be refactored
- [ ] Any function > 50 lines must be extracted

### Warning Signs
- File growing beyond 100 lines
- Class with more than 5 methods
- Function with nested logic > 3 levels
- Import statements > 10 per file

## 🎯 SUCCESS METRICS
- **Target**: Each module 45-100 lines
- **Maximum**: 150 lines absolute limit
- **Average**: 75 lines per module
- **Total modular**: 465 lines vs 1361 original

## 🔍 REVIEW PROCESS
1. **Pre-commit hook**: Block files > 200 lines
2. **Code review**: Reject PRs violating limits
3. **Refactoring**: Mandatory for violations
4. **Documentation**: Update this file with lessons learned