import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
    network: {
        startDiscovery: () => ipcRenderer.invoke('network:startDiscovery'),
        stopDiscovery: () => ipcRenderer.invoke('network:stopDiscovery'),
    },
    on: (channel: string, callback: (...args: any[]) => void) => {
        ipcRenderer.on(channel, callback);
    },
    off: (channel: string, callback: (...args: any[]) => void) => {
        ipcRenderer.removeListener(channel, callback);
    },
    invoke: (channel: string, ...args: any[]) => {
        const validChannels = [
            'system:getNetworkInfo',
            'system:getDeviceName',
            'system:setDeviceName',     // 添加这两个新的通道
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