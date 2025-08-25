// Database singleton manager - handles database instance lifecycle
// Enhanced with connection pooling, error handling, and health checking

// Prevent duplicate execution in browser environment
(function() {
    'use strict';
    
    // Check if already loaded and return early
    if (typeof window !== 'undefined' && window.DatabaseInstanceManagerLoaded) {
        console.log('[DatabaseInstanceManager] Already loaded, skipping redeclaration');
        return;
    }
    
    // Mark as loaded
    if (typeof window !== 'undefined') {
        window.DatabaseInstanceManagerLoaded = true;
    }

    // Import dependencies (with fallback for web mode)
    var DatabasePoolManager, DatabaseHealthChecker;
    var DatabaseError, DatabaseConnectionError, DatabaseValidationError, DatabaseTimeoutError;
    var DatabaseConfig, DatabaseConfigUtils;

    try {
        if (typeof require !== 'undefined') {
            ({ DatabasePoolManager } = require('./database-pool-manager'));
            ({ DatabaseHealthChecker } = require('./database-health-checker'));
            ({ DatabaseError, DatabaseConnectionError, DatabaseValidationError, DatabaseTimeoutError } = require('./database-errors'));
            ({ DatabaseConfig, DatabaseConfigUtils } = require('./database-config'));
        } else {
            // Web mode fallback
            DatabasePoolManager = window.DatabasePoolManager;
            DatabaseHealthChecker = window.DatabaseHealthChecker;
            DatabaseError = window.DatabaseError;
            DatabaseConnectionError = window.DatabaseConnectionError;
            DatabaseValidationError = window.DatabaseValidationError;
            DatabaseTimeoutError = window.DatabaseTimeoutError;
            DatabaseConfig = window.DatabaseConfig;
            DatabaseConfigUtils = window.DatabaseConfigUtils;
        }
    } catch (error) {
        console.warn('[DatabaseInstanceManager] Failed to load dependencies:', error.message);
    }

class DatabaseInstanceManager {
    constructor(DatabaseManagerClass = null, config = {}) {
        // Load configuration from DatabaseConfig with user overrides
        const defaultConfig = DatabaseConfigUtils ? DatabaseConfigUtils.getInstanceManagerConfig() : {};
        
        // Check for manual override flag
        if (typeof window !== 'undefined' && window.DATABASE_OVERRIDE_ACTIVE) {
            console.log('[DatabaseInstanceManager] Manual override detected, using safe configuration');
            this.config = {
                maxRetries: 1,
                retryDelay: 1000,
                healthCheckInterval: 0, // Disable health checks
                enablePooling: false,   // Disable pooling
                poolConfig: {
                    maxConnections: 1,
                    timeout: 5000
                },
                ...config
            };
        } else {
            this.config = {
                ...defaultConfig,
                ...config
            };
        }

        // Core state
        this.dbManager = null;
        this.currentFilePath = null;
        this.isInitialized = false;
        
        // Dependency injection
        this.DatabaseManagerClass = DatabaseManagerClass;
        
        // Enhanced features
        this.poolManager = this.config.enablePooling && DatabasePoolManager ? new DatabasePoolManager(this.config.poolConfig) : null;
        this.healthChecker = DatabaseHealthChecker ? new DatabaseHealthChecker() : null;
        this.pendingOperations = new Set();
        
        // Health monitoring
        this.healthCheckTimer = null;
        this.lastHealthCheck = null;
        
        // Setup lifecycle management
        this.setupGracefulShutdown();
        this.startHealthMonitoring();
    }

    /**
     * Initialize the database manager with enhanced error handling
     */
    async initialize() {
        return this.executeWithTracking(async () => {
            console.log('[DatabaseInstanceManager] Starting initialization...');
            
            try {
                await this.closeCurrentConnection();
                
                // Load DatabaseManager class if not injected
                if (!this.DatabaseManagerClass) {
                    if (typeof require !== 'undefined') {
                        this.DatabaseManagerClass = require('../server/sqlite-manager');
                    } else {
                        throw new DatabaseError('DatabaseManager class not available in web mode');
                    }
                }
                
                if (this.config.enablePooling && this.poolManager && DatabasePoolManager) {
                    try {
                        // Use connection pool for initialization
                        const tempFilePath = this.getCurrentTempPath();
                        this.dbManager = await this.poolManager.acquireConnection(tempFilePath);
                        this.currentFilePath = tempFilePath;
                    } catch (poolError) {
                        console.warn('[DatabaseInstanceManager] Pool initialization failed, falling back to traditional connection:', poolError.message);
                        // Fall back to traditional initialization
                        this.dbManager = new this.DatabaseManagerClass();
                        await this.dbManager.init();
                        this.currentFilePath = this.dbManager.dbPath;
                    }
                } else {
                    // Traditional initialization
                    this.dbManager = new this.DatabaseManagerClass();
                    await this.dbManager.init();
                    this.currentFilePath = this.dbManager.dbPath;
                }
                
                // Validate initialization
                await this.validateConnection();
                
                this.isInitialized = true;
                console.log('[DatabaseInstanceManager] Initialization completed:', this.currentFilePath);
                
            } catch (error) {
                const dbError = new DatabaseConnectionError(
                    'Failed to initialize database manager',
                    error,
                    this.currentFilePath
                );
                console.error('[DatabaseInstanceManager] Initialization failed:', dbError);
                throw dbError;
            }
        });
    }

    /**
     * Enhanced file opening with retries and validation
     */
    async openFile(filePath) {
        return this.executeWithRetries(async () => {
            console.log('[DatabaseInstanceManager] Opening file:', filePath);
            
            try {
                await this.closeCurrentConnection();
                
                if (this.config.enablePooling && this.poolManager && DatabasePoolManager) {
                    try {
                        // Use connection pool
                        this.dbManager = await this.poolManager.acquireConnection(filePath);
                    } catch (poolError) {
                        console.warn('[DatabaseInstanceManager] Pool connection failed, falling back to traditional connection:', poolError.message);
                        // Fall back to traditional connection
                        this.dbManager = new this.DatabaseManagerClass(filePath);
                        await this.dbManager.init();
                    }
                } else {
                    // Traditional connection
                    this.dbManager = new this.DatabaseManagerClass(filePath);
                    await this.dbManager.init();
                }
                
                this.currentFilePath = filePath;
                
                // Validate the new connection
                await this.validateConnection();
                
                console.log('[DatabaseInstanceManager] File opened successfully:', filePath);
                
            } catch (error) {
                throw new DatabaseConnectionError(
                    `Failed to open database file: ${filePath}`,
                    error,
                    filePath
                );
            }
        });
    }

    /**
     * Enhanced database switching with automatic state loading
     */
    async switchToDatabase(filePath) {
        return this.executeWithTracking(async () => {
            console.log('[DatabaseInstanceManager] Switching to database:', filePath);
            
            try {
                // Switch the database connection
                await this.openFile(filePath);
                
                // Load graph data with error handling
                await this.loadDatabaseContent();
                
                // Reset application state
                this.resetModificationState();
                
                console.log('[DatabaseInstanceManager] Database switch completed successfully');
                
            } catch (error) {
                const dbError = new DatabaseConnectionError(
                    'Failed to switch database',
                    error,
                    filePath
                );
                console.error('[DatabaseInstanceManager] Database switch failed:', dbError);
                throw dbError;
            }
        });
    }

    /**
     * Enhanced connection validation with health checks
     */
    async validateConnection() {
        if (!this.dbManager) {
            throw new DatabaseValidationError('No database connection available');
        }
        
        try {
            if (this.healthChecker) {
                const healthResults = await this.healthChecker.performHealthCheck(this.dbManager);
                this.lastHealthCheck = healthResults;
                
                if (!healthResults.healthy) {
                    const errorDetails = healthResults.errors.map(e => e.message).join('; ');
                    throw new DatabaseValidationError(`Database health check failed: ${errorDetails}`);
                }
            } else {
                console.warn('[DatabaseInstanceManager] Health checker not available, skipping health check');
            }
            
            console.log('[DatabaseInstanceManager] Connection validation passed');
            return true;
            
        } catch (error) {
            if (error instanceof DatabaseValidationError) {
                throw error;
            }
            throw new DatabaseValidationError('Connection validation failed', error);
        }
    }

    /**
     * Load database content with error handling
     */
    async loadDatabaseContent() {
        try {
            // Try different ways to access the load function
            if (typeof loadGraphFromDatabase === 'function') {
                await loadGraphFromDatabase();
            } else if (typeof window !== 'undefined' && window.loadGraphFromDatabase) {
                await window.loadGraphFromDatabase();
            } else {
                console.warn('[DatabaseInstanceManager] loadGraphFromDatabase function not available');
            }
        } catch (error) {
            console.error('[DatabaseInstanceManager] Failed to load database content:', error);
            throw new DatabaseError('Failed to load database content', error);
        }
    }

    /**
     * Reset application modification state
     */
    resetModificationState() {
        try {
            if (typeof appState !== 'undefined' && appState) {
                appState.isModified = false;
            } else if (typeof window !== 'undefined' && window.appState) {
                window.appState.isModified = false;
            }
        } catch (error) {
            console.warn('[DatabaseInstanceManager] Failed to reset modification state:', error);
        }
    }

    /**
     * Enhanced close with connection pool support
     */
    async close() {
        return this.executeWithTracking(async () => {
            console.log('[DatabaseInstanceManager] Closing database connection...');
            
            try {
                await this.closeCurrentConnection();
                
                if (this.poolManager) {
                    await this.poolManager.closeAll();
                }
                
                this.stopHealthMonitoring();
                this.isInitialized = false;
                
                console.log('[DatabaseInstanceManager] Database closed successfully');
                
            } catch (error) {
                console.error('[DatabaseInstanceManager] Error during close:', error);
                throw new DatabaseError('Failed to close database properly', error);
            }
        });
    }

    /**
     * Close current connection helper
     */
    async closeCurrentConnection() {
        if (this.dbManager) {
            try {
                if (this.config.enablePooling && this.poolManager && DatabasePoolManager && this.dbManager.release) {
                    // Connection will be released back to pool
                    this.dbManager.release();
                } else {
                    // Traditional close
                    await this.dbManager.close();
                }
            } catch (error) {
                console.warn('[DatabaseInstanceManager] Warning during connection close:', error);
            } finally {
                this.dbManager = null;
                this.currentFilePath = null;
            }
        }
    }

    /**
     * Execute operation with automatic retry logic
     */
    async executeWithRetries(operation) {
        let attempts = 0;
        let lastError;
        
        while (attempts < this.config.maxRetries) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                attempts++;
                
                if (attempts < this.config.maxRetries) {
                    const delay = this.config.retryDelay * Math.pow(2, attempts - 1);
                    console.warn(`[DatabaseInstanceManager] Attempt ${attempts} failed, retrying in ${delay}ms...`);
                    await this.delay(delay);
                } else {
                    console.error(`[DatabaseInstanceManager] All ${attempts} attempts failed`);
                }
            }
        }
        
        throw new DatabaseTimeoutError(
            `Operation failed after ${attempts} attempts`,
            lastError,
            this.config.maxRetries
        );
    }

    /**
     * Execute operation with tracking for graceful shutdown
     */
    async executeWithTracking(operation) {
        const operationId = Symbol('operation');
        this.pendingOperations.add(operationId);
        
        try {
            return await operation();
        } finally {
            this.pendingOperations.delete(operationId);
        }
    }

    /**
     * Health monitoring setup
     */
    startHealthMonitoring() {
        if (this.config.healthCheckInterval > 0) {
            this.healthCheckTimer = setInterval(async () => {
                if (this.dbManager && this.isInitialized && this.healthChecker) {
                    try {
                        await this.healthChecker.isConnectionHealthy(this.dbManager);
                    } catch (error) {
                        console.warn('[DatabaseInstanceManager] Health check failed:', error.message);
                    }
                }
            }, this.config.healthCheckInterval);
        }
    }

    stopHealthMonitoring() {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }
    }

    /**
     * Graceful shutdown setup
     */
    setupGracefulShutdown() {
        const gracefulShutdown = async (signal) => {
            console.log(`[DatabaseInstanceManager] Received ${signal}, initiating graceful shutdown...`);
            
            try {
                await this.waitForPendingOperations();
                await this.close();
                process.exit(0);
            } catch (error) {
                console.error('[DatabaseInstanceManager] Error during graceful shutdown:', error);
                process.exit(1);
            }
        };
        
        // Only set up process handlers in Node.js environment
        if (typeof process !== 'undefined' && process.on) {
            process.on('SIGINT', () => gracefulShutdown('SIGINT'));
            process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        }
    }

    async waitForPendingOperations(timeout = 10000) {
        const start = Date.now();
        
        while (this.pendingOperations.size > 0 && Date.now() - start < timeout) {
            await this.delay(100);
        }
        
        if (this.pendingOperations.size > 0) {
            console.warn(`[DatabaseInstanceManager] ${this.pendingOperations.size} operations still pending after timeout`);
        }
    }

    /**
     * Utility methods
     */
    getCurrentDb() {
        return this.dbManager;
    }

    getCurrentFilePath() {
        return this.currentFilePath;
    }

    getCurrentTempPath() {
        // Generate temporary path for initialization
        try {
            if (typeof require !== 'undefined') {
                const path = require('path');
                return path.join(process.cwd(), "data", "temp.db");
            } else {
                // Fallback for web environment
                return "data/temp.db";
            }
        } catch (error) {
            console.warn('[DatabaseInstanceManager] Failed to generate temp path:', error.message);
            return "temp.db";
        }
    }

    isHealthy() {
        return this.isInitialized && this.dbManager && (!this.lastHealthCheck || this.lastHealthCheck.healthy);
    }

    getMetrics() {
        return {
            isInitialized: this.isInitialized,
            currentFile: this.currentFilePath,
            pendingOperations: this.pendingOperations.size,
            lastHealthCheck: this.lastHealthCheck,
            poolMetrics: this.poolManager ? this.poolManager.getMetrics() : null
        };
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Singleton instance with enhanced initialization using default configuration
let dbInstanceManager;
try {
    const config = DatabaseConfigUtils ? DatabaseConfigUtils.getInstanceManagerConfig() : {};
    dbInstanceManager = new DatabaseInstanceManager(null, config);
} catch (error) {
    console.warn('[DatabaseInstanceManager] Failed to create enhanced instance, creating basic instance:', error.message);
    // Fallback to basic instance
    class BasicDatabaseInstanceManager {
        constructor() {
            this.dbManager = null;
            this.currentFilePath = null;
            this.isInitialized = false;
        }
        
        async initialize() {
            if (this.dbManager) {
                await this.close();
            }
            
            const DatabaseManager = require('../server/sqlite-manager');
            this.dbManager = new DatabaseManager();
            await this.dbManager.init();
            this.currentFilePath = this.dbManager.dbPath;
            this.isInitialized = true;
            console.log('[BasicDatabaseInstanceManager] Initialized with:', this.currentFilePath);
        }
        
        async openFile(filePath) {
            console.log('[BasicDatabaseInstanceManager] Switching to file:', filePath);
            
            if (this.dbManager) {
                await this.dbManager.close();
                this.dbManager = null;
            }
            
            const DatabaseManager = require('../server/sqlite-manager');
            this.dbManager = new DatabaseManager(filePath);
            await this.dbManager.init();
            this.currentFilePath = filePath;
            
            console.log('[BasicDatabaseInstanceManager] Successfully switched to:', this.currentFilePath);
        }
        
        async switchToDatabase(filePath) {
            await this.openFile(filePath);
            
            if (typeof loadGraphFromDatabase === 'function') {
                await loadGraphFromDatabase();
            } else if (typeof window !== 'undefined' && window.loadGraphFromDatabase) {
                await window.loadGraphFromDatabase();
            }
            
            if (typeof appState !== 'undefined' && appState) {
                appState.isModified = false;
            } else if (typeof window !== 'undefined' && window.appState) {
                window.appState.isModified = false;
            }
        }
        
        async close() {
            if (this.dbManager) {
                await this.dbManager.close();
                this.dbManager = null;
                this.currentFilePath = null;
                this.isInitialized = false;
            }
        }
        
        getCurrentDb() {
            return this.dbManager;
        }
        
        getCurrentFilePath() {
            return this.currentFilePath;
        }
        
        isHealthy() {
            return this.isInitialized && this.dbManager;
        }
        
        getMetrics() {
            return {
                isInitialized: this.isInitialized,
                currentFile: this.currentFilePath,
                pendingOperations: 0,
                lastHealthCheck: null,
                poolMetrics: null,
                mode: 'basic'
            };
        }
    }
    
    dbInstanceManager = new BasicDatabaseInstanceManager();
}

// Export with enhanced error handling
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        dbInstanceManager,
        DatabaseInstanceManager // Export class for dependency injection
    };
} else if (typeof window !== 'undefined') {
    window.dbInstanceManager = dbInstanceManager;
    window.DatabaseInstanceManager = DatabaseInstanceManager;
}

})(); // Close and execute the IIFE