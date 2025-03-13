import { contextBridge, ipcRenderer } from 'electron';
import { Device } from '../renderer/types/electron';

// 增加更多调试日志
console.log('预加载脚本开始执行...');

// 定义 heartbeat API 类型
interface HeartbeatAPI {
    start: () => Promise<void>;
    stop: () => Promise<void>;
    getPort: () => Promise<number>;
    setPort: (port: number) => Promise<void>;
}

// 通用 invoke 函数，用于处理所有 IPC 调用
const invokeHandler = (channel: string, ...args: any[]) => {
    console.log(`[预加载] 调用通道: ${channel}，参数:`, args);

    // 检查通道名称
    const allowedPrefixes = [
        'dialog:', 'settings:', 'heartbeat:',
        'network:', 'system:', 'mdns:'
    ];

    // 完整通道列表
    const validChannels = [
        'network:getLocalService',
        'network:startDiscovery',
        'network:stopDiscovery',
        'system:getDeviceName',
        'system:getNetworkInfo',
        'system:setDeviceName',
        'system:updateDeviceName',
        'system:getDeviceInfo',
        'mdns:startDiscovery',
        'mdns:stopDiscovery',
        'mdns:publishService',
        'mdns:unpublishService',
        'network:pingDevice',
        'heartbeat:start',
        'heartbeat:stop',
        'heartbeat:getPort',
        'heartbeat:setPort',
        'settings:getDownloadPath',
        'settings:setDownloadPath',
        'dialog:openDirectory',
        'system:getDeviceId',
        'http:request',
    ];

    const isAllowed = validChannels.includes(channel) ||
        allowedPrefixes.some(prefix => channel.startsWith(prefix));

    if (isAllowed) {
        return ipcRenderer.invoke(channel, ...args);
    }

    throw new Error(`Unauthorized IPC channel: ${channel}`);
};

// 合并两个预加载脚本的 API
try {
    contextBridge.exposeInMainWorld('electron', {
        // 通用 invoke 方法
        invoke: invokeHandler,

        // 从 main/preload.ts 合并的 API
        network: {
            getLocalService: () => invokeHandler('network:getLocalService'),
            startDiscovery: () => invokeHandler('network:startDiscovery'),
            stopDiscovery: () => invokeHandler('network:stopDiscovery'),
            onDeviceFound: (callback: (device: Device) => void) => {
                const subscription = (_: any, device: Device) => callback(device);
                ipcRenderer.on('network:deviceFound', subscription);
                return () => {
                    ipcRenderer.removeListener('network:deviceFound', subscription);
                };
            },
            onDeviceLeft: (callback: (device: Device) => void) => {
                const subscription = (_: any, device: Device) => callback(device);
                ipcRenderer.on('network:deviceLeft', subscription);
                return () => {
                    ipcRenderer.removeListener('network:deviceLeft', subscription);
                };
            }
        },

        mdns: {
            publishService: () => invokeHandler('mdns:publishService'),
            unpublishService: () => invokeHandler('mdns:unpublishService'),
            startDiscovery: () => invokeHandler('mdns:startDiscovery'),
            stopDiscovery: () => invokeHandler('mdns:stopDiscovery'),
            onDeviceFound: (callback: (device: Device) => void) => {
                const subscription = (_: any, device: Device) => callback(device);
                ipcRenderer.on('mdns:deviceFound', subscription);
                return () => {
                    ipcRenderer.removeListener('mdns:deviceFound', subscription);
                };
            },
            onDeviceLeft: (callback: (device: Device) => void) => {
                const subscription = (_: any, device: Device) => callback(device);
                ipcRenderer.on('mdns:deviceLeft', subscription);
                return () => {
                    ipcRenderer.removeListener('mdns:deviceLeft', subscription);
                };
            }
        },

        on: (channel: string, func: (...args: any[]) => void) => {
            const validChannels = [
                'mdns:deviceFound',
                'mdns:deviceLeft',
                'system:deviceNameChanged',
                'system:remoteDeviceNameChanged',
                'device:nameUpdated',
            ];

            if (!validChannels.includes(channel)) {
                console.error(`无效的频道名称: ${channel}`);
                return;
            }

            const subscription = (_event: any, data: any) => {
                if (!data) {
                    console.error(`从主进程接收到无效数据，频道: ${channel}`);
                    return;
                }

                console.log(`Preload - 从主进程收到数据(${channel}):`, data);
                func(data);
            };

            ipcRenderer.on(channel, subscription);
            return () => ipcRenderer.removeListener(channel, subscription);
        },

        off: (channel: string, func: (...args: any[]) => void) => {
            ipcRenderer.removeListener(channel, func);
        },

        heartbeat: {
            start: () => invokeHandler('heartbeat:start'),
            stop: () => invokeHandler('heartbeat:stop'),
            getPort: () => invokeHandler('heartbeat:getPort'),
            setPort: (port: number) => invokeHandler('heartbeat:setPort', port)
        } as HeartbeatAPI,

        http: {
            request: (options: {
                url: string;
                method?: string;
                headers?: Record<string, string>;
                body?: any;
            }) => invokeHandler('http:request', options),
        },
    });

    console.log('[预加载] API 成功暴露到 window.electron');
} catch (error) {
    console.error('[预加载] API 暴露失败:', error);
}

console.log('预加载脚本执行完毕'); 