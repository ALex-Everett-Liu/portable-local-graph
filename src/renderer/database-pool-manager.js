// Database connection pool manager
// Manages connection pools for multiple database files

// Import Pool with fallback for different environments
let Pool;
try {
    if (typeof require !== 'undefined') {
        ({ Pool } = require('better-sqlite-pool'));
    } else {
        console.warn('[DatabasePoolManager] better-sqlite-pool not available in web mode');
    }
} catch (error) {
    console.warn('[DatabasePoolManager] Failed to load better-sqlite-pool:', error.message);
}

class DatabasePoolManager {
    constructor(config = {}) {
        this.config = {
            maxConnections: 3,
            timeout: 5000,
            readonly: false,
            verbose: null,
            ...config
        };
        
        this.pools = new Map();
        this.activeConnections = new Map();
        this.connectionMetrics = new Map();
    }

    /**
     * Gets or creates a connection pool for a database file
     * @param {string} filePath - Path to the database file
     * @returns {Pool} - Connection pool instance
     */
    getOrCreatePool(filePath) {
        if (!Pool) {
            throw new Error('[DatabasePoolManager] Pool class not available - better-sqlite-pool not loaded');
        }
        
        if (!this.pools.has(filePath)) {
            console.log('[DatabasePoolManager] Creating new pool for:', filePath);
            
            const pool = new Pool(filePath, {
                max: this.config.maxConnections,
                timeout: this.config.timeout,
                readonly: this.config.readonly,
                verbose: this.config.verbose
            });
            
            this.pools.set(filePath, pool);
            this.connectionMetrics.set(filePath, {
                created: new Date(),
                acquired: 0,
                released: 0,
                errors: 0
            });
        }
        
        return this.pools.get(filePath);
    }

    /**
     * Acquires a connection from the pool
     * @param {string} filePath - Path to the database file
     * @returns {Promise<Object>} - Managed database connection
     */
    async acquireConnection(filePath) {
        try {
            const pool = this.getOrCreatePool(filePath);
            const connection = await pool.acquire();
            
            // Create managed connection with automatic metrics tracking
            const managedConnection = this.createManagedConnection(connection, filePath);
            
            this.activeConnections.set(connection, {
                filePath,
                acquired: new Date(),
                managedConnection
            });
            
            // Update metrics
            const metrics = this.connectionMetrics.get(filePath);
            metrics.acquired++;
            
            console.log(`[DatabasePoolManager] Connection acquired for: ${filePath} (active: ${this.activeConnections.size})`);
            return managedConnection;
            
        } catch (error) {
            const metrics = this.connectionMetrics.get(filePath);
            if (metrics) {
                metrics.errors++;
            }
            throw error;
        }
    }

    /**
     * Creates a managed connection with automatic release tracking
     * @param {Object} connection - Raw database connection
     * @param {string} filePath - Database file path
     * @returns {Proxy} - Managed connection proxy
     */
    createManagedConnection(connection, filePath) {
        const self = this;
        
        return new Proxy(connection, {
            get(target, prop) {
                if (prop === 'release') {
                    return () => self.releaseConnection(target, filePath);
                }
                
                if (prop === 'close') {
                    // Intercept close calls and redirect to release
                    return () => self.releaseConnection(target, filePath);
                }
                
                // Add error handling wrapper for database operations
                const original = target[prop];
                if (typeof original === 'function') {
                    return function(...args) {
                        try {
                            return original.apply(target, args);
                        } catch (error) {
                            const metrics = self.connectionMetrics.get(filePath);
                            if (metrics) {
                                metrics.errors++;
                            }
                            console.error(`[DatabasePoolManager] Operation error on ${filePath}:`, error);
                            throw error;
                        }
                    };
                }
                
                return original;
            }
        });
    }

    /**
     * Releases a connection back to the pool
     * @param {Object} connection - Database connection to release
     * @param {string} filePath - Database file path
     */
    releaseConnection(connection, filePath) {
        if (!this.activeConnections.has(connection)) {
            console.warn('[DatabasePoolManager] Attempting to release unknown connection');
            return;
        }
        
        // Actually release the connection
        if (connection.release && typeof connection.release === 'function') {
            connection.release();
        }
        
        this.activeConnections.delete(connection);
        
        // Update metrics
        const metrics = this.connectionMetrics.get(filePath);
        if (metrics) {
            metrics.released++;
        }
        
        console.log(`[DatabasePoolManager] Connection released for: ${filePath} (active: ${this.activeConnections.size})`);
    }

    /**
     * Closes a specific pool and all its connections
     * @param {string} filePath - Path to the database file
     */
    async closePool(filePath) {
        if (!this.pools.has(filePath)) {
            return;
        }
        
        console.log(`[DatabasePoolManager] Closing pool for: ${filePath}`);
        
        // Release all active connections for this file
        const connectionsToRelease = [];
        for (const [connection, info] of this.activeConnections) {
            if (info.filePath === filePath) {
                connectionsToRelease.push(connection);
            }
        }
        
        connectionsToRelease.forEach(connection => {
            this.releaseConnection(connection, filePath);
        });
        
        // Close the pool
        const pool = this.pools.get(filePath);
        if (pool && pool.close) {
            pool.close();
        }
        
        this.pools.delete(filePath);
        
        // Keep metrics for debugging but mark as closed
        const metrics = this.connectionMetrics.get(filePath);
        if (metrics) {
            metrics.closed = new Date();
        }
    }

    /**
     * Closes all pools and connections
     */
    async closeAll() {
        console.log('[DatabasePoolManager] Closing all pools');
        
        // Close all active connections first
        const allConnections = Array.from(this.activeConnections.keys());
        allConnections.forEach(connection => {
            const info = this.activeConnections.get(connection);
            this.releaseConnection(connection, info.filePath);
        });
        
        // Close all pools
        const poolPaths = Array.from(this.pools.keys());
        for (const filePath of poolPaths) {
            await this.closePool(filePath);
        }
        
        this.pools.clear();
        this.activeConnections.clear();
    }

    /**
     * Gets connection metrics for monitoring
     * @returns {Object} - Metrics for all database files
     */
    getMetrics() {
        const metrics = {};
        
        for (const [filePath, data] of this.connectionMetrics) {
            metrics[filePath] = {
                ...data,
                active: Array.from(this.activeConnections.values())
                    .filter(info => info.filePath === filePath).length,
                hasPool: this.pools.has(filePath)
            };
        }
        
        return {
            totalPools: this.pools.size,
            totalActiveConnections: this.activeConnections.size,
            databases: metrics
        };
    }

    /**
     * Performs cleanup of idle pools
     * @param {number} maxIdleTime - Maximum idle time in milliseconds
     */
    async cleanupIdlePools(maxIdleTime = 300000) { // 5 minutes default
        const now = new Date();
        const poolsToClose = [];
        
        for (const [filePath, metrics] of this.connectionMetrics) {
            if (metrics.closed) continue; // Already closed
            
            const idleTime = now - (metrics.lastUsed || metrics.created);
            if (idleTime > maxIdleTime) {
                // Check if no active connections
                const activeCount = Array.from(this.activeConnections.values())
                    .filter(info => info.filePath === filePath).length;
                
                if (activeCount === 0) {
                    poolsToClose.push(filePath);
                }
            }
        }
        
        for (const filePath of poolsToClose) {
            console.log(`[DatabasePoolManager] Cleaning up idle pool: ${filePath}`);
            await this.closePool(filePath);
        }
        
        return poolsToClose.length;
    }
}

// Export pool manager
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DatabasePoolManager };
} else if (typeof window !== 'undefined') {
    // Only set if not already defined to prevent redeclaration errors
    if (!window.DatabasePoolManager) {
        window.DatabasePoolManager = DatabasePoolManager;
    }
} 