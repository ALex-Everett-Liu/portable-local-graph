// Database singleton manager - handles database instance lifecycle
// Manages database instances throughout the application lifecycle

class DatabaseInstanceManager {
    constructor() {
        this.dbManager = null;
        this.currentFilePath = null;
    }

    async initialize() {
        if (this.dbManager) {
            await this.close();
        }
        
        const DatabaseManager = require('../server/sqlite-manager');
        this.dbManager = new DatabaseManager();
        await this.dbManager.init();
        this.currentFilePath = this.dbManager.dbPath;
        console.log('[DatabaseInstanceManager] Initialized with:', this.currentFilePath);
    }

    async openFile(filePath) {
        console.log('[DatabaseInstanceManager] Switching to file:', filePath);
        
        // 完全关闭当前连接
        if (this.dbManager) {
            await this.dbManager.close();
            this.dbManager = null;
        }
        
        // 创建指向新文件的新实例
        const DatabaseManager = require('../server/sqlite-manager');
        this.dbManager = new DatabaseManager(filePath);
        await this.dbManager.init();
        this.currentFilePath = filePath;
        
        console.log('[DatabaseManagerSingleton] Successfully switched to:', this.currentFilePath);
    }

    /**
     * Switch to a new database file and automatically load its graph data
     * This prevents data contamination by ensuring the application state matches the database
     * @param {string} filePath - Path to the database file to switch to
     * @returns {Promise<void>}
     */
    async switchToDatabase(filePath) {
        console.log('[DatabaseInstanceManager] Switching to database and loading content:', filePath);
        
        // Switch the database connection
        await this.openFile(filePath);
        
        // Load the graph data from the new database to sync application state
        if (typeof loadGraphFromDatabase === 'function') {
            await loadGraphFromDatabase();
        } else if (typeof window !== 'undefined' && window.loadGraphFromDatabase) {
            await window.loadGraphFromDatabase();
        } else {
            console.warn('[DatabaseInstanceManager] loadGraphFromDatabase function not available');
        }
        
        // Reset modification state
        if (typeof appState !== 'undefined' && appState) {
            appState.isModified = false;
        } else if (typeof window !== 'undefined' && window.appState) {
            window.appState.isModified = false;
        }
        
        console.log('[DatabaseInstanceManager] Database switch and content loading completed');
    }

    async close() {
        if (this.dbManager) {
            await this.dbManager.close();
            this.dbManager = null;
            this.currentFilePath = null;
        }
    }

    getCurrentDb() {
        return this.dbManager;
    }

    getCurrentFilePath() {
        return this.currentFilePath;
    }

    /**
     * Merge data from another database file into the current database
     * @param {string} sourceDbPath - Path to the source database file
     * @param {Object} options - Merge options
     * @param {string} options.conflictResolution - How to handle conflicts: 'replace', 'skip', or 'rename'
     * @returns {Promise<Object>} Merge result with statistics
     */
    async mergeFromDatabase(sourceDbPath, options = {}) {
        if (!this.dbManager) {
            throw new Error('No database connection available');
        }

        console.log('[DatabaseInstanceManager] Merging from database:', sourceDbPath);
        const result = await this.dbManager.mergeFromDatabase(sourceDbPath, options);
        console.log('[DatabaseInstanceManager] Merge completed:', result);

        // Mark as modified since we've added data
        if (typeof appState !== 'undefined' && appState) {
            appState.isModified = true;
        } else if (typeof window !== 'undefined' && window.appState) {
            window.appState.isModified = true;
        }

        return result;
    }
}

// Singleton instance
const dbInstanceManager = new DatabaseInstanceManager();

// Export access function
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { dbInstanceManager };
} else {
    window.dbInstanceManager = dbInstanceManager;
}