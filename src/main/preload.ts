import { contextBridge } from 'electron';

// 暴露给渲染进程的API
contextBridge.exposeInMainWorld('electron', {
    // 这里可以添加其他需要的API
}); 