import { contextBridge, ipcRenderer } from 'electron';

// 暴露给渲染进程的API
contextBridge.exposeInMainWorld('electron', {
    // 接收服务器信息
    onServerInfo: (callback: (serverInfo: any) => void) => {
        ipcRenderer.on('server-info', (_event, serverInfo) => callback(serverInfo));
    },

    // 文件传输相关事件
    onTransferStarted: (callback: (data: any) => void) => {
        ipcRenderer.on('transfer-started', (_event, data) => callback(data));
    },

    onChunkReceived: (callback: (chunk: any) => void) => {
        ipcRenderer.on('chunk-received', (_event, chunk) => callback(chunk));
    },

    onTransferComplete: (callback: (data: any) => void) => {
        ipcRenderer.on('transfer-complete', (_event, data) => callback(data));
    },

    // 移除事件监听
    removeAllListeners: (channel: string) => {
        ipcRenderer.removeAllListeners(channel);
    }
}); 