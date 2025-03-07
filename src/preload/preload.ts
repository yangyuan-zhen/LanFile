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
            'system:deviceNameChanged',
            'mdns:deviceFound',
            'mdns:deviceLeft'
        ];
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, callback);
        }
    },
    off: (channel: string, callback: (...args: any[]) => void) => {
        const validChannels = [
            'network:deviceFound',
            'device:nameUpdated',
            'system:deviceNameChanged',
            'mdns:deviceFound',
            'mdns:deviceLeft'
        ];
        if (validChannels.includes(channel)) {
            ipcRenderer.removeListener(channel, callback);
        }
    },
    invoke: (channel: string, ...args: any[]) => {
        const validChannels = [
            'system:getNetworkInfo',
            'system:getDeviceName',
            'system:setDeviceName',
            'system:updateDeviceName',
            'network:getLocalService',
            'network:startDiscovery',
            'network:stopDiscovery',
            'mdns:publishService',
            'mdns:unpublishService',
            'mdns:startDiscovery',
            'mdns:stopDiscovery'
        ];
        if (validChannels.includes(channel)) {
            return ipcRenderer.invoke(channel, ...args);
        }
        throw new Error(`Unauthorized IPC channel: ${channel}`);
    },
    mdns: {
        publishService: () => ipcRenderer.invoke('mdns:publishService'),
        unpublishService: () => ipcRenderer.invoke('mdns:unpublishService'),
        startDiscovery: () => ipcRenderer.invoke('mdns:startDiscovery'),
        stopDiscovery: () => ipcRenderer.invoke('mdns:stopDiscovery'),
        onDeviceFound: (callback: (device: any) => void) => {
            const subscription = (_: any, device: any) => callback(device);
            ipcRenderer.on('mdns:deviceFound', subscription);
            return () => {
                ipcRenderer.removeListener('mdns:deviceFound', subscription);
            };
        },
        onDeviceLeft: (callback: (device: any) => void) => {
            const subscription = (_: any, device: any) => callback(device);
            ipcRenderer.on('mdns:deviceLeft', subscription);
            return () => {
                ipcRenderer.removeListener('mdns:deviceLeft', subscription);
            };
        }
    }
});

