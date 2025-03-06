import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
    network: {
        startDiscovery: () => ipcRenderer.invoke('network:startDiscovery'),
        stopDiscovery: () => ipcRenderer.invoke('network:stopDiscovery'),
    },
    on: (channel: string, callback: (...args: any[]) => void) => {
        const validChannels = [
            'network:deviceFound',
            'device:nameUpdated',
            'system:deviceNameChanged'
        ];
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, callback);
        }
    },
    off: (channel: string, callback: (...args: any[]) => void) => {
        const validChannels = [
            'network:deviceFound',
            'device:nameUpdated',
            'system:deviceNameChanged'
        ];
        if (validChannels.includes(channel)) {
            ipcRenderer.removeListener(channel, callback);
        }
    },
    invoke: (channel: string, ...args: any[]) => {
        const validChannels = [
            'system:getNetworkInfo',
            'system:getDeviceName',
            'system:setDeviceName',     // 添加这个通道
            'system:updateDeviceName',  // 授权通道
            'network:getLocalService',
            'network:startDiscovery',
            'network:stopDiscovery'
        ];
        if (validChannels.includes(channel)) {
            return ipcRenderer.invoke(channel, ...args);
        }
        throw new Error(`Unauthorized IPC channel: ${channel}`);
    }
});

