import { contextBridge, ipcRenderer } from 'electron';
import { Device } from '../renderer/types/electron';

console.log('Preload script starting...');

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
        invoke: (channel: string, ...args: any[]) => {
            const validChannels = [
                'network:getLocalService',
                'network:startDiscovery',
                'network:stopDiscovery',
                'zeroconf:startScan',
                'zeroconf:stopScan',
                'zeroconf:publishService',
                'zeroconf:unpublishService',
                'system:getDeviceName',
                'system:getNetworkInfo',
            ];
            if (validChannels.includes(channel)) {
                return ipcRenderer.invoke(channel, ...args);
            }
            throw new Error(`Unauthorized IPC channel: ${channel}`);
        },
        on: (channel: string, callback: (...args: any[]) => void) => {
            ipcRenderer.on(channel, (_, ...args) => callback(...args));
        },
        off: (channel: string, callback: (...args: any[]) => void) => {
            ipcRenderer.off(channel, callback);
        }
    });
    console.log('APIs exposed successfully');
} catch (error) {
    console.error('Failed to expose APIs:', error);
} 