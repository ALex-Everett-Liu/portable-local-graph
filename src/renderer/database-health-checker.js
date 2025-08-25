// Database health checker
// Validates database connections and provides health monitoring

class DatabaseHealthChecker {
    constructor(config = {}) {
        this.config = {
            checkTimeout: 5000,
            maxRetries: 3,
            retryDelay: 1000,
            healthCheckQuery: 'SELECT 1',
            ...config
        };
    }

    /**
     * Validates if a database connection is healthy
     * @param {Object} db - Database instance to check
     * @returns {Promise<boolean>} - True if connection is healthy
     */
    async isConnectionHealthy(db) {
        if (!db) {
            return false;
        }

        try {
            await this.executeWithTimeout(
                () => this.runHealthCheck(db),
                this.config.checkTimeout
            );
            return true;
        } catch (error) {
            console.warn('[DatabaseHealthChecker] Health check failed:', error.message);
            return false;
        }
    }

    /**
     * Validates database structure
     * @param {Object} db - Database instance to check
     * @returns {Promise<boolean>} - True if structure is valid
     */
    async validateDatabaseStructure(db) {
        if (!db) {
            return false;
        }

        try {
            // Check if required tables exist
            const requiredTables = ['nodes', 'edges'];
            
            for (const table of requiredTables) {
                const result = await this.executeWithTimeout(
                    () => new Promise((resolve, reject) => {
                        try {
                            if (typeof db.get === 'function') {
                                db.get(
                                    "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                                    [table],
                                    (err, row) => {
                                        if (err) reject(err);
                                        else resolve(row);
                                    }
                                );
                            } else if (typeof db.prepare === 'function') {
                                // better-sqlite3 style
                                const stmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?");
                                const row = stmt.get(table);
                                resolve(row);
                            } else if (db._db && typeof db._db.get === 'function') {
                                db._db.get(
                                    "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                                    [table],
                                    (err, row) => {
                                        if (err) reject(err);
                                        else resolve(row);
                                    }
                                );
                            } else {
                                // Handle unexpected connection types for structure validation
                                console.warn('[DatabaseHealthChecker] Unknown connection type for structure validation');
                                
                                // If it's an array, try to use the first element
                                if (Array.isArray(db) && db.length > 0) {
                                    const actualDb = db[0];
                                    if (actualDb && typeof actualDb.get === 'function') {
                                        actualDb.get(
                                            "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                                            [table],
                                            (err, row) => {
                                                if (err) reject(err);
                                                else resolve(row);
                                            }
                                        );
                                        return;
                                    } else if (actualDb && typeof actualDb.prepare === 'function') {
                                        const stmt = actualDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?");
                                        const row = stmt.get(table);
                                        resolve(row);
                                        return;
                                    }
                                }
                                
                                console.warn('[DatabaseHealthChecker] No compatible interface for structure validation, skipping');
                                resolve(null); // Return null to indicate table not found/verified
                            }
                        } catch (error) {
                            reject(error);
                        }
                    }),
                    this.config.checkTimeout
                );

                if (!result) {
                    console.warn(`[DatabaseHealthChecker] Required table '${table}' not found`);
                    return false;
                }
            }
            
            return true;
        } catch (error) {
            console.warn('[DatabaseHealthChecker] Structure validation failed:', error.message);
            return false;
        }
    }

    /**
     * Performs a comprehensive health check
     * @param {Object} db - Database instance to check
     * @returns {Promise<Object>} - Health check results
     */
    async performHealthCheck(db) {
        const results = {
            connection: false,
            structure: false,
            timestamp: new Date().toISOString(),
            errors: []
        };

        try {
            results.connection = await this.isConnectionHealthy(db);
        } catch (error) {
            results.errors.push({
                type: 'connection',
                message: error.message
            });
        }

        try {
            results.structure = await this.validateDatabaseStructure(db);
        } catch (error) {
            results.errors.push({
                type: 'structure',
                message: error.message
            });
        }

        results.healthy = results.connection && results.structure;
        return results;
    }

    /**
     * Executes health check query
     * @private
     */
    async runHealthCheck(db) {
        return new Promise((resolve, reject) => {
            try {
                // Check if db has the expected method
                if (typeof db.get === 'function') {
                    db.get(this.config.healthCheckQuery, (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                } else if (typeof db.prepare === 'function') {
                    // Try with better-sqlite3 style (synchronous)
                    const stmt = db.prepare(this.config.healthCheckQuery);
                    const row = stmt.get();
                    resolve(row);
                } else if (db._db && typeof db._db.get === 'function') {
                    // If it's a wrapped connection, try accessing the underlying db
                    db._db.get(this.config.healthCheckQuery, (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                } else {
                    // Handle unexpected connection types
                    console.warn('[DatabaseHealthChecker] Unknown database connection type. Type:', typeof db);
                    console.warn('[DatabaseHealthChecker] Connection details:', {
                        isArray: Array.isArray(db),
                        constructor: db ? db.constructor.name : 'undefined',
                        keys: db ? Object.keys(db) : 'no keys',
                        hasLength: db && 'length' in db,
                        length: db ? db.length : 'no length'
                    });
                    
                    // If it's an array, try to use the first element
                    if (Array.isArray(db) && db.length > 0) {
                        console.log('[DatabaseHealthChecker] Trying to use first array element as connection');
                        const actualDb = db[0];
                        if (actualDb && typeof actualDb.get === 'function') {
                            actualDb.get(this.config.healthCheckQuery, (err, row) => {
                                if (err) reject(err);
                                else resolve(row);
                            });
                            return;
                        } else if (actualDb && typeof actualDb.prepare === 'function') {
                            const stmt = actualDb.prepare(this.config.healthCheckQuery);
                            const row = stmt.get();
                            resolve(row);
                            return;
                        }
                    }
                    
                    console.warn('[DatabaseHealthChecker] No compatible database interface found, skipping health check');
                    resolve({ healthy: false, reason: 'Unsupported connection type' });
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Executes operation with timeout
     * @private
     */
    async executeWithTimeout(operation, timeout) {
        return new Promise(async (resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Operation timed out after ${timeout}ms`));
            }, timeout);

            try {
                const result = await operation();
                clearTimeout(timer);
                resolve(result);
            } catch (error) {
                clearTimeout(timer);
                reject(error);
            }
        });
    }

    /**
     * Performs health check with retries
     * @param {Object} db - Database instance to check
     * @returns {Promise<boolean>} - True if healthy after retries
     */
    async healthCheckWithRetries(db) {
        let attempts = 0;
        
        while (attempts < this.config.maxRetries) {
            try {
                const isHealthy = await this.isConnectionHealthy(db);
                if (isHealthy) {
                    return true;
                }
            } catch (error) {
                console.warn(`[DatabaseHealthChecker] Health check attempt ${attempts + 1} failed:`, error.message);
            }
            
            attempts++;
            if (attempts < this.config.maxRetries) {
                await this.delay(this.config.retryDelay * Math.pow(2, attempts - 1)); // Exponential backoff
            }
        }
        
        return false;
    }

    /**
     * Delay utility
     * @private
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export health checker
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DatabaseHealthChecker };
} else if (typeof window !== 'undefined') {
    // Only set if not already defined to prevent redeclaration errors
    if (!window.DatabaseHealthChecker) {
        window.DatabaseHealthChecker = DatabaseHealthChecker;
    }
} 