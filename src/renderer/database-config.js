// Database management configuration
// Allows customization of database behavior and features

const DatabaseConfig = {
    // Connection Pool Settings
    pooling: {
        enabled: true,              // Enable connection pooling
        maxConnections: 3,          // Maximum connections per database file
        timeout: 5000,              // Connection timeout in milliseconds
        cleanupInterval: 300000,    // Cleanup idle pools every 5 minutes
    },

    // Error Handling & Retries
    errorHandling: {
        maxRetries: 3,              // Maximum retry attempts for failed operations
        retryDelay: 1000,           // Base delay between retries (exponential backoff)
        enableDetailedLogging: true, // Log detailed error information
    },

    // Health Monitoring
    healthCheck: {
        enabled: true,              // Enable health monitoring
        interval: 30000,            // Health check interval in milliseconds (30 seconds)
        timeout: 5000,              // Health check timeout
        validateStructure: true,    // Validate database table structure
    },

    // Performance Settings
    performance: {
        enableMetrics: true,        // Collect performance metrics
        logOperations: false,       // Log all database operations (for debugging)
        gracefulShutdownTimeout: 10000, // Max time to wait for pending operations
    },

    // Development/Debug Settings
    development: {
        enabled: false,             // Enable development mode features
        verboseLogging: false,      // Enable verbose console logging
        simulateErrors: false,      // Simulate random errors for testing
        debugHealthChecks: false,   // Log detailed health check results
    },

    // Feature Toggles
    features: {
        automaticBackups: false,    // Enable automatic database backups (future feature)
        connectionCaching: true,    // Cache database connections
        transactionPooling: false,  // Pool transactions (future feature)
        asyncOperations: true,      // Use async/await pattern throughout
    }
};

// Environment-specific overrides
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
    DatabaseConfig.development.enabled = true;
    DatabaseConfig.development.verboseLogging = true;
    DatabaseConfig.errorHandling.enableDetailedLogging = true;
}

// Configuration validation
function validateConfig(config) {
    const errors = [];
    
    if (config.pooling.maxConnections < 1) {
        errors.push('pooling.maxConnections must be at least 1');
    }
    
    if (config.errorHandling.maxRetries < 0) {
        errors.push('errorHandling.maxRetries must be non-negative');
    }
    
    if (config.healthCheck.interval < 1000) {
        errors.push('healthCheck.interval should be at least 1000ms');
    }
    
    if (errors.length > 0) {
        console.warn('[DatabaseConfig] Configuration validation errors:', errors);
    }
    
    return errors.length === 0;
}

// Configuration utilities
const DatabaseConfigUtils = {
    /**
     * Get configuration for DatabaseInstanceManager
     */
    getInstanceManagerConfig() {
        return {
            maxRetries: DatabaseConfig.errorHandling.maxRetries,
            retryDelay: DatabaseConfig.errorHandling.retryDelay,
            healthCheckInterval: DatabaseConfig.healthCheck.enabled ? DatabaseConfig.healthCheck.interval : 0,
            enablePooling: DatabaseConfig.pooling.enabled,
            poolConfig: {
                maxConnections: DatabaseConfig.pooling.maxConnections,
                timeout: DatabaseConfig.pooling.timeout,
                verbose: DatabaseConfig.development.verboseLogging ? console.log : null
            }
        };
    },

    /**
     * Get configuration for DatabasePoolManager
     */
    getPoolManagerConfig() {
        return {
            maxConnections: DatabaseConfig.pooling.maxConnections,
            timeout: DatabaseConfig.pooling.timeout,
            readonly: false,
            verbose: DatabaseConfig.development.verboseLogging ? console.log : null
        };
    },

    /**
     * Get configuration for DatabaseHealthChecker
     */
    getHealthCheckerConfig() {
        return {
            checkTimeout: DatabaseConfig.healthCheck.timeout,
            maxRetries: DatabaseConfig.errorHandling.maxRetries,
            retryDelay: DatabaseConfig.errorHandling.retryDelay,
            healthCheckQuery: 'SELECT 1'
        };
    },

    /**
     * Enable development mode
     */
    enableDevelopmentMode() {
        DatabaseConfig.development.enabled = true;
        DatabaseConfig.development.verboseLogging = true;
        DatabaseConfig.errorHandling.enableDetailedLogging = true;
        console.log('[DatabaseConfig] Development mode enabled');
    },

    /**
     * Enable production mode (optimized settings)
     */
    enableProductionMode() {
        DatabaseConfig.development.enabled = false;
        DatabaseConfig.development.verboseLogging = false;
        DatabaseConfig.performance.logOperations = false;
        DatabaseConfig.healthCheck.interval = 60000; // Less frequent health checks
        console.log('[DatabaseConfig] Production mode enabled');
    },

    /**
     * Disable connection pooling (for debugging)
     */
    disablePooling() {
        DatabaseConfig.pooling.enabled = false;
        console.log('[DatabaseConfig] Connection pooling disabled');
    },

    /**
     * Get current configuration summary
     */
    getSummary() {
        return {
            pooling: DatabaseConfig.pooling.enabled,
            healthChecks: DatabaseConfig.healthCheck.enabled,
            maxRetries: DatabaseConfig.errorHandling.maxRetries,
            maxConnections: DatabaseConfig.pooling.maxConnections,
            developmentMode: DatabaseConfig.development.enabled
        };
    }
};

// Validate configuration on load
validateConfig(DatabaseConfig);

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DatabaseConfig,
        DatabaseConfigUtils
    };
} else if (typeof window !== 'undefined') {
    // Only set if not already defined to prevent redeclaration errors
    if (!window.DatabaseConfig) {
        window.DatabaseConfig = DatabaseConfig;
        window.DatabaseConfigUtils = DatabaseConfigUtils;
    }
}

// Log configuration summary
console.log('[DatabaseConfig] Loaded configuration:', DatabaseConfigUtils.getSummary()); 