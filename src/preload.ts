// 添加导入语句
import { contextBridge, ipcRenderer } from 'electron';

// 在预加载脚本中正确暴露 API
contextBridge.exposeInMainWorld('electron', {
    invoke: (channel: string, data?: any) => {
        // 仅允许特定通道
        const validChannels = [
            'file:saveToDownloads',
            'file:openFolder',
            'file:openFile',
            // 其他有效通道...
        ];
        if (validChannels.includes(channel)) {
            return ipcRenderer.invoke(channel, data);
        }
        throw new Error(`不允许的IPC通道: ${channel}`);
    },
    // 其他 API...
}); 