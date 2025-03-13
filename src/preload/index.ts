import { contextBridge, ipcRenderer } from 'electron';

// 增加更多调试日志
console.log('预加载脚本开始执行...');

// 定义要暴露给渲染进程的 API
const api = {
    invoke: (channel: string, ...args: any[]) => {
        console.log(`[预加载] 调用通道: ${channel}，参数:`, args);

        // 检查通道名称前缀
        const allowedPrefixes = [
            'dialog:', 'settings:', 'heartbeat:',
            'network:', 'system:', 'mdns:', 'test:'
        ];

        const isAllowed = allowedPrefixes.some(prefix => channel.startsWith(prefix));

        if (isAllowed) {
            // 记录每次调用
            console.log(`[预加载] 允许调用通道: ${channel}`);
            return ipcRenderer.invoke(channel, ...args)
                .then(result => {
                    console.log(`[预加载] 通道 ${channel} 返回结果:`, result);
                    return result;
                })
                .catch(error => {
                    console.error(`[预加载] 通道 ${channel} 调用失败:`, error);
                    throw error;
                });
        }

        console.error(`[预加载] 未授权的通道: ${channel}`);
        throw new Error(`Unauthorized IPC channel: ${channel}`);
    }
};

// 使用 try-catch 来确保任何错误都被记录
try {
    // 将 API 暴露给渲染进程
    contextBridge.exposeInMainWorld('electron', api);
    console.log('[预加载] API 成功暴露到 window.electron');
} catch (error) {
    console.error('[预加载] API 暴露失败:', error);
}

// 记录预加载脚本完成
console.log('预加载脚本执行完毕'); 