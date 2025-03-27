import { contextBridge, ipcRenderer } from 'electron';

// 添加新的API
contextBridge.exposeInMainWorld('electron', {
    // 现有的 API...

    // 添加自动保存到下载目录的 API
    invoke: async (channel: string, args: any) => {
        if (
            channel === 'file:saveToDownloads' &&
            typeof args === 'object' &&
            args !== null &&
            'fileName' in args &&
            'fileData' in args
        ) {
            // 确保 fileData 是一个 ArrayBuffer
            return await ipcRenderer.invoke(channel, {
                fileName: args.fileName,
                fileData: args.fileData  // ArrayBuffer 是可序列化的
            });
        }
        // 其他现有的 invoke 调用...

        // 添加打开文件和文件夹的API
        if (channel === 'file:openFolder' && typeof args === 'string') {
            return await ipcRenderer.invoke(channel, args);
        }
        if (channel === 'file:openFile' && typeof args === 'string') {
            return await ipcRenderer.invoke(channel, args);
        }

        // 添加设置API
        if (channel === 'settings:get') {
            return await ipcRenderer.invoke(channel);
        }
        if (channel === 'settings:set' && typeof args === 'object') {
            return await ipcRenderer.invoke(channel, args);
        }
    }
}); 