// Simple test to verify fixes
console.log('🔧 测试数据库改进修复...\n');

try {
    // Test error classes
    const { DatabaseError, DatabaseConnectionError } = require('./src/renderer/database-errors.js');
    console.log('✅ 错误处理类加载成功');

    // Test config
    const { DatabaseConfig, DatabaseConfigUtils } = require('./src/renderer/database-config.js');
    console.log('✅ 配置管理加载成功');
    
    // Apply override to disable pooling
    DatabaseConfig.pooling.enabled = false;
    DatabaseConfig.healthCheck.enabled = false;
    console.log('🔧 已禁用连接池和健康检查');

    // Test health checker
    const { DatabaseHealthChecker } = require('./src/renderer/database-health-checker.js');
    console.log('✅ 健康检查器加载成功');

    // Test enhanced instance manager (should fall back to basic mode)
    const { dbInstanceManager } = require('./src/renderer/db-instance-manager.js');
    console.log('✅ 数据库实例管理器加载成功');
    
    // Check metrics
    const metrics = dbInstanceManager.getMetrics();
    console.log('📊 管理器状态:', {
        模式: metrics.mode || 'enhanced',
        初始化: metrics.isInitialized,
        连接池指标: metrics.poolMetrics ? '已启用' : '已禁用'
    });

    console.log('\n🎉 所有核心组件加载成功！');
    console.log('💡 连接池已临时禁用，应用应该可以正常运行');

} catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('堆栈:', error.stack);
} 