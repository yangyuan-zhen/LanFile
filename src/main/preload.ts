import { contextBridge, ipcRenderer } from 'electron';

console.log('Preload script starting...');

try {
    contextBridge.exposeInMainWorld('electron', {
        test: {
            ping: () => 'pong'
        },
        network: {
            getLocalService: async () => {
                console.log('Calling getLocalService from preload');
                const result = await ipcRenderer.invoke('network:getLocalService');
                console.log('getLocalService result:', result);
                return result;
            }
        }
    });
    console.log('APIs exposed successfully');
} catch (error) {
    console.error('Failed to expose APIs:', error);
} 