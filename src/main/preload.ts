import { contextBridge, ipcRenderer } from 'electron';

// 暴露给渲染进程的API
contextBridge.exposeInMainWorld('electron', {
    // 这里可以添加其他需要的API

    network: {
        // 获取本地服务信息
        getLocalService: () => ipcRenderer.invoke('network:getLocalService'),

        // 监听发现的设备
        onDeviceFound: (callback: (device: any) => void) => {
            ipcRenderer.on('network:deviceFound', (_event, device) => callback(device));
            return () => {
                ipcRenderer.removeAllListeners('network:deviceFound');
            };
        },

        // 监听设备离线
        onDeviceLeft: (callback: (device: any) => void) => {
            ipcRenderer.on('network:deviceLeft', (_event, device) => callback(device));
            return () => {
                ipcRenderer.removeAllListeners('network:deviceLeft');
            };
        }
    }
}); 