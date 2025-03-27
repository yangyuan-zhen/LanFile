import { contextBridge, ipcRenderer } from 'electron';
import { NetworkDevice as Device } from '../renderer/types/electron';

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
        'network:', 'system:', 'mdns:',
        'webrtc:', 'file:'
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
        'webrtc:initialize',
        'webrtc:sendOffer',
        'webrtc:sendAnswer',
        'webrtc:sendIceCandidate',
        'file:saveDownloadedFile',
        'signaling:start',
        'signaling:connectToDevice',
        'signaling:sendMessage',
        'signaling:stop',
        'signaling:getServerConfig',
        'signaling:getServerUrl',
        'file:saveDownload',
        'file:saveToDownloads',
        'file:openFolder',
        'file:openFile'
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
        invoke: (channel: string, ...args: any[]) => {
            return ipcRenderer.invoke(channel, ...args);
        },

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

        on: (channel: string, listener: (...args: any[]) => void) => {
            ipcRenderer.on(channel, (event, ...args) => listener(...args));
            return () => ipcRenderer.removeListener(channel, listener);
        },

        off: (channel: string, func: (...args: any[]) => void) => {
            const validChannels = [
                'update:checking',
                'update:available',
                'webrtc:connectionRequest',
                'webrtc:answer',
                'webrtc:iceCandidate'
            ];
            if (validChannels.includes(channel)) {
                ipcRenderer.removeListener(channel, (_, ...args) => func(...args));
            }
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

        signaling: {
            start: (deviceId: string, deviceName: string) => ipcRenderer.invoke('signaling:start', deviceId, deviceName),
            connectToDevice: (deviceId: string, address: string, port?: number) =>
                ipcRenderer.invoke('signaling:connectToDevice', deviceId, address, port),
            sendMessage: (deviceId: string, message: any) =>
                ipcRenderer.invoke('signaling:sendMessage', deviceId, message),
            broadcast: (message: any) => ipcRenderer.invoke('signaling:broadcast', message),
            getConnectedDevices: () => ipcRenderer.invoke('signaling:getConnectedDevices'),
            disconnectFromDevice: (deviceId: string) =>
                ipcRenderer.invoke('signaling:disconnectFromDevice', deviceId),
            stop: () => ipcRenderer.invoke('signaling:stop'),
            onDeviceConnected: (callback: (device: any) => void) =>
                ipcRenderer.on('signaling:deviceConnected', (_, device) => callback(device)),
            onDeviceDisconnected: (callback: (deviceId: string) => void) =>
                ipcRenderer.on('signaling:deviceDisconnected', (_, deviceId) => callback(deviceId)),
            onMessage: (callback: (message: any) => void) =>
                ipcRenderer.on('signaling:message', (_, message) => callback(message)),
        },

        file: {
            saveDownload: (data: { fileName: string, fileData: string }) =>
                ipcRenderer.invoke('file:saveDownload', data),
            saveToDownloads: (data: { fileName: string, fileData: string, fileType: string }) =>
                ipcRenderer.invoke('file:saveToDownloads', data),
            openFolder: (folderPath: string) => ipcRenderer.invoke('file:openFolder', folderPath),
            openFile: (filePath: string) => ipcRenderer.invoke('file:openFile', filePath)
        }
    });

    console.log('[预加载] API 成功暴露到 window.electron');
} catch (error) {
    console.error('[预加载] API 暴露失败:', error);
}

console.log('预加载脚本执行完毕'); 