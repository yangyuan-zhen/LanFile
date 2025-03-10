import { contextBridge, ipcRenderer } from 'electron';
import { Device } from '../renderer/types/electron';

console.log('Preload script starting...');

// 添加 heartbeat API 类型定义
interface HeartbeatAPI {
    start: () => Promise<void>;
    stop: () => Promise<void>;
    getPort: () => Promise<number>;
    setPort: (port: number) => Promise<void>;
}

try {
    contextBridge.exposeInMainWorld('electron', {
        test: {
            ping: () => 'pong'
        },
        network: {
            getLocalService: () => ipcRenderer.invoke('network:getLocalService'),
            startDiscovery: () => ipcRenderer.invoke('network:startDiscovery'),
            stopDiscovery: () => ipcRenderer.invoke('network:stopDiscovery'),
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
            publishService: () => ipcRenderer.invoke('mdns:publishService'),
            unpublishService: () => ipcRenderer.invoke('mdns:unpublishService'),
            startDiscovery: () => ipcRenderer.invoke('mdns:startDiscovery'),
            stopDiscovery: () => ipcRenderer.invoke('mdns:stopDiscovery'),
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
            start: () => ipcRenderer.invoke('heartbeat:start'),
            stop: () => ipcRenderer.invoke('heartbeat:stop'),
            getPort: () => ipcRenderer.invoke('heartbeat:getPort'),
            setPort: (port: number) => ipcRenderer.invoke('heartbeat:setPort', port)
        } as HeartbeatAPI,
        invoke: (channel: string, ...args: any[]) => {
            const validChannels = [
                'network:getLocalService',
                'network:startDiscovery',
                'network:stopDiscovery',
                'system:getDeviceName',
                'system:getNetworkInfo',
                'system:setDeviceName',
                'system:updateDeviceName',
                'mdns:startDiscovery',
                'mdns:stopDiscovery',
                'mdns:publishService',
                'mdns:unpublishService',
                'network:pingDevice',
                'heartbeat:start',
                'heartbeat:stop',
                'heartbeat:getPort',
                'heartbeat:setPort'
            ];
            if (validChannels.includes(channel)) {
                return ipcRenderer.invoke(channel, ...args);
            }
            throw new Error(`Unauthorized IPC channel: ${channel}`);
        }
    });
    console.log('APIs exposed successfully');
} catch (error) {
    console.error('Failed to expose APIs:', error);
} 