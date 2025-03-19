import { ipcMain } from 'electron';

// 添加获取已发现设备的处理程序
ipcMain.handle('mdns:getDiscoveredDevices', () => {
    try {
        // 如果全局有mdnsService实例
        if ((global as any).mdnsService && typeof (global as any).mdnsService.getDiscoveredDevices === 'function') {
            return (global as any).mdnsService.getDiscoveredDevices();
        }

        // 无法获取实际设备，返回示例数据
        return [
            { name: '示例设备1', host: '192.168.1.101', port: 8092, signalingPort: 8092 },
            { name: '示例设备2', host: '192.168.1.102', port: 8092, signalingPort: 8102 }
        ];
    } catch (error) {
        console.error('获取发现的设备失败:', error);
        return [];
    }
}); 