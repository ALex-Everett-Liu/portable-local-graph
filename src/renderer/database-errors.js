// Database error handling classes
// Provides structured error handling for database operations

class DatabaseError extends Error {
    constructor(message, originalError = null, context = {}) {
        super(message);
        this.name = this.constructor.name;
        this.originalError = originalError;
        this.context = context;
        this.timestamp = new Date().toISOString();
        
        // Maintain stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            context: this.context,
            timestamp: this.timestamp,
            stack: this.stack,
            originalError: this.originalError ? {
                name: this.originalError.name,
                message: this.originalError.message,
                stack: this.originalError.stack
            } : null
        };
    }
}

class DatabaseConnectionError extends DatabaseError {
    constructor(message, originalError = null, filePath = null) {
        super(message, originalError, { filePath });
        this.filePath = filePath;
    }
}

class DatabaseValidationError extends DatabaseError {
    constructor(message, originalError = null, validationType = null) {
        super(message, originalError, { validationType });
        this.validationType = validationType;
    }
}

class DatabaseTimeoutError extends DatabaseError {
    constructor(message, originalError = null, timeout = null) {
        super(message, originalError, { timeout });
        this.timeout = timeout;
    }
}

// Export error classes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DatabaseError,
        DatabaseConnectionError,
        DatabaseValidationError,
        DatabaseTimeoutError
    };
} else if (typeof window !== 'undefined') {
    // Only set if not already defined to prevent redeclaration errors
    if (!window.DatabaseError) {
        window.DatabaseError = DatabaseError;
        window.DatabaseConnectionError = DatabaseConnectionError;
        window.DatabaseValidationError = DatabaseValidationError;
        window.DatabaseTimeoutError = DatabaseTimeoutError;
    }
} 