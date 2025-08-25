// Test module exports
console.log('🧪 测试模块导出...\n');

try {
    // Test import
    const imported = require('./src/renderer/db-instance-manager');
    console.log('✅ 模块导入成功');
    
    // Check exports
    console.log('📦 导出内容:', Object.keys(imported));
    
    if (imported.dbInstanceManager) {
        console.log('✅ dbInstanceManager 导出成功');
        console.log('📊 管理器类型:', typeof imported.dbInstanceManager);
        
        // Test methods
        if (typeof imported.dbInstanceManager.initialize === 'function') {
            console.log('✅ initialize 方法可用');
        } else {
            console.log('❌ initialize 方法不可用');
        }
        
        if (typeof imported.dbInstanceManager.getMetrics === 'function') {
            console.log('✅ getMetrics 方法可用');
            const metrics = imported.dbInstanceManager.getMetrics();
            console.log('📈 当前指标:', metrics);
        } else {
            console.log('❌ getMetrics 方法不可用');
        }
        
    } else {
        console.log('❌ dbInstanceManager 导出失败');
    }
    
    if (imported.DatabaseInstanceManager) {
        console.log('✅ DatabaseInstanceManager 类导出成功');
    } else {
        console.log('❌ DatabaseInstanceManager 类导出失败');
    }
    
    console.log('\n🎉 模块导出测试完成！');
    
} catch (error) {
    console.error('❌ 模块导出测试失败:', error.message);
    console.error('堆栈:', error.stack);
} 