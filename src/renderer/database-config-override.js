// Temporary configuration override to disable pooling until issues are resolved
// This ensures the application can run with basic database functionality

console.log('[ConfigOverride] 应用临时配置 - 禁用连接池以确保基本功能');

// Wait for config to be loaded, then override
if (typeof window !== 'undefined') {
    // Override config immediately if available
    if (window.DatabaseConfig) {
        console.log('[ConfigOverride] 立即应用配置覆盖');
        applyOverride();
    } else {
        // Wait for config to load
        const checkConfig = setInterval(() => {
            if (window.DatabaseConfig && window.DatabaseConfigUtils) {
                console.log('[ConfigOverride] 配置已加载，应用覆盖');
                clearInterval(checkConfig);
                applyOverride();
            }
        }, 100);
        
        // Stop checking after 5 seconds
        setTimeout(() => {
            clearInterval(checkConfig);
            console.warn('[ConfigOverride] 配置加载超时，跳过覆盖');
        }, 5000);
    }
}

function applyOverride() {
    try {
        // Disable problematic features temporarily
        window.DatabaseConfig.pooling.enabled = false;
        window.DatabaseConfig.healthCheck.enabled = false;
        window.DatabaseConfig.healthCheck.interval = 0; // Disable periodic checks
        window.DatabaseConfig.development.enabled = true;
        window.DatabaseConfig.development.verboseLogging = true;
        window.DatabaseConfig.errorHandling.maxRetries = 1; // Reduce retries to avoid loops
        
        // Override at the utils level too
        if (window.DatabaseConfigUtils) {
            // Force disable pooling at the utils level
            const originalConfig = window.DatabaseConfigUtils.getInstanceManagerConfig();
            originalConfig.enablePooling = false;
            originalConfig.healthCheckInterval = 0;
        }
        
        console.log('[ConfigOverride] 已应用强化临时配置:', {
            连接池: window.DatabaseConfig.pooling.enabled,
            健康检查: window.DatabaseConfig.healthCheck.enabled,
            健康检查间隔: window.DatabaseConfig.healthCheck.interval,
            开发模式: window.DatabaseConfig.development.enabled,
            重试次数: window.DatabaseConfig.errorHandling.maxRetries
        });
        
        // Force a config update if utils are available
        if (window.DatabaseConfigUtils) {
            const summary = window.DatabaseConfigUtils.getSummary();
            console.log('[ConfigOverride] 更新后的配置摘要:', summary);
        }
        
        // Also set a flag to indicate manual override
        window.DATABASE_OVERRIDE_ACTIVE = true;
        
    } catch (error) {
        console.error('[ConfigOverride] 应用配置覆盖失败:', error);
    }
} 