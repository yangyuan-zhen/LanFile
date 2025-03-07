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
                'system:setDeviceName',
                'system:updateDeviceName',
                'mdns:startDiscovery',
                'mdns:stopDiscovery',
                'mdns:publishService',
                'mdns:unpublishService'
            ];
            if (validChannels.includes(channel)) {
                return ipcRenderer.invoke(channel, ...args);
            }
            throw new Error(`Unauthorized IPC channel: ${channel}`);
        },
        on: (channel: string, callback: (...args: any[]) => void) => {
            const validChannels = [
                'network:deviceFound',
                'device:nameUpdated',
                'zeroconf:deviceFound',
                'mdns:deviceFound',
                'mdns:deviceLeft'
            ];
            if (validChannels.includes(channel)) {
                ipcRenderer.on(channel, (_event, data) => {
                    if (data) {
                        callback(data);
                    }
                });
            }
        },
        off: (channel: string, callback: (...args: any[]) => void) => {
            const validChannels = [
                'network:deviceFound',
                'device:nameUpdated',
                'zeroconf:deviceFound',
                'mdns:deviceFound',
                'mdns:deviceLeft'
            ];
            if (validChannels.includes(channel)) {
                ipcRenderer.removeListener(channel, (_event, data) => {
                    if (data) {
                        callback(data);
                    }
                });
            }
        }
    });
    console.log('APIs exposed successfully');
} catch (error) {
    console.error('Failed to expose APIs:', error);
} 