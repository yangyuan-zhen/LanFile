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
        }
    });
    console.log('APIs exposed successfully');
} catch (error) {
    console.error('Failed to expose APIs:', error);
} 