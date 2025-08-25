// Database Improvements Diagnostic Script
// Run this to test if the enhanced database features are working

console.log('🔍 数据库改进诊断开始...\n');

// Test 1: Check if enhanced error classes are available
console.log('1. 检查错误处理类:');
try {
    require('./src/renderer/database-errors.js');
    console.log('   ✅ 错误处理类已加载');
} catch (error) {
    console.log('   ❌ 错误处理类加载失败:', error.message);
}

// Test 2: Check if health checker is available
console.log('\n2. 检查健康检查器:');
try {
    require('./src/renderer/database-health-checker.js');
    console.log('   ✅ 健康检查器已加载');
} catch (error) {
    console.log('   ❌ 健康检查器加载失败:', error.message);
}

// Test 3: Check if config is available
console.log('\n3. 检查配置管理:');
try {
    const { DatabaseConfig, DatabaseConfigUtils } = require('./src/renderer/database-config.js');
    console.log('   ✅ 配置管理已加载');
    console.log('   📊 当前配置:', DatabaseConfigUtils.getSummary());
} catch (error) {
    console.log('   ❌ 配置管理加载失败:', error.message);
}

// Test 4: Check pool manager with better-sqlite3 dependency
console.log('\n4. 检查连接池管理器:');
try {
    const betterSqlite3Available = require('better-sqlite3');
    console.log('   ✅ better-sqlite3 可用');
    
    const betterSqlitePool = require('better-sqlite-pool');
    console.log('   ✅ better-sqlite-pool 可用');
    
    require('./src/renderer/database-pool-manager.js');
    console.log('   ✅ 连接池管理器已加载');
    
} catch (error) {
    console.log('   ⚠️  连接池不可用:', error.message);
    console.log('   💡 应用将使用传统连接方式');
}

// Test 5: Check enhanced database instance manager
console.log('\n5. 检查增强数据库实例管理器:');
try {
    const { dbInstanceManager, DatabaseInstanceManager } = require('./src/renderer/db-instance-manager.js');
    console.log('   ✅ 增强数据库实例管理器已加载');
    
    const metrics = dbInstanceManager.getMetrics();
    console.log('   📈 管理器状态:', {
        初始化状态: metrics.isInitialized,
        当前文件: metrics.currentFile,
        待处理操作: metrics.pendingOperations,
        运行模式: metrics.mode || 'enhanced'
    });
    
} catch (error) {
    console.log('   ❌ 增强数据库实例管理器加载失败:', error.message);
}

// Test 6: Test basic database operations
console.log('\n6. 测试基本数据库操作:');
(async () => {
    try {
        const { dbInstanceManager } = require('./src/renderer/db-instance-manager.js');
        
        // Test initialization
        console.log('   🔄 初始化测试...');
        await dbInstanceManager.initialize();
        console.log('   ✅ 数据库初始化成功');
        
        // Test health check
        const isHealthy = dbInstanceManager.isHealthy();
        console.log('   💓 健康状态:', isHealthy ? '✅ 健康' : '⚠️ 需要检查');
        
        // Test metrics
        const metrics = dbInstanceManager.getMetrics();
        console.log('   📊 详细指标:', JSON.stringify(metrics, null, 2));
        
        console.log('\n🎉 数据库改进诊断完成！');
        console.log('🚀 应用程序现在可以使用增强的数据库功能。');
        
    } catch (error) {
        console.log('   ❌ 基本操作测试失败:', error.message);
        console.log('   💡 建议: 检查数据库文件路径和权限');
    }
})(); 