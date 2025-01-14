import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('electron', {
    // 在这里添加需要暴露给渲染进程的 API
}); 