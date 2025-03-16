contextBridge.exposeInMainWorld('electron', {
    signaling: {
        onMessage: (callback) => {
            ipcRenderer.on('signaling:message', (_, message) => callback(message));
        },

        offMessage: (callback) => {
            ipcRenderer.removeListener('signaling:message', callback);
        },

        onDeviceConnected: (callback) => {
            ipcRenderer.on('signaling:deviceConnected', (_, device) => callback(device));
        },

        onDeviceDisconnected: (callback) => {
            ipcRenderer.on('signaling:deviceDisconnected', (_, deviceId) => callback(deviceId));
        }
    }
}); 