import { app, ipcMain, shell } from 'electron';
import fs from 'fs';
import path from 'path';
import store from './store';

// 跟踪已注册的处理程序
const registeredHandlers: Set<string> = new Set();

// 安全注册处理程序的辅助函数
function safeHandle(channel: string, handler: (event: any, ...args: any[]) => Promise<any>) {
    if (!registeredHandlers.has(channel)) {
        ipcMain.handle(channel, handler);
        registeredHandlers.add(channel);
        console.log(`[主进程] IPC处理程序已注册: ${channel}`);
    } else {
        console.log(`[主进程] 跳过已注册的IPC处理程序: ${channel}`);
    }
}

// 定义设置类型
interface Settings {
    downloadPath?: string;
}

// 处理自动保存文件到下载目录
ipcMain.handle('file:saveToDownloads', async (event, args) => {
    try {
        const { fileName, fileData, fileType } = args;
        console.log(`[主进程] 开始保存文件: ${fileName}, 类型: ${fileType}`);

        // 从设置中获取用户自定义下载目录
        const settings = store.get('settings') as Settings || {};
        const userDownloadPath = settings.downloadPath;

        // 使用用户设置的路径或默认下载路径
        const downloadPath = userDownloadPath || app.getPath('downloads');
        console.log(`[主进程] 保存到用户设置的目录: ${downloadPath}`);

        // 确保目录存在
        if (!fs.existsSync(downloadPath)) {
            fs.mkdirSync(downloadPath, { recursive: true });
        }

        const filePath = path.join(downloadPath, fileName);
        console.log(`[主进程] 完整文件路径: ${filePath}`);

        // 将 Array 转回 Buffer
        const buffer = Buffer.from(fileData);

        // 写入文件
        fs.writeFileSync(filePath, buffer);
        console.log(`[主进程] 文件已成功写入: ${filePath}`);

        return filePath;
    } catch (error) {
        console.error('[主进程] 保存文件错误:', error);
        throw error;
    }
});

// 打开文件所在文件夹
ipcMain.handle('file:openFolder', async (event, filePath) => {
    try {
        shell.showItemInFolder(filePath);
        return { success: true };
    } catch (error) {
        console.error('打开文件夹失败:', error);
        return { success: false, error: String(error) };
    }
});

// 打开文件
ipcMain.handle('file:openFile', async (event, filePath) => {
    try {
        shell.openPath(filePath);
        return { success: true };
    } catch (error) {
        console.error('打开文件失败:', error);
        return { success: false, error: String(error) };
    }
});

// 使用辅助函数注册设置处理程序
safeHandle('settings:get', async (event) => {
    try {
        return store.get('settings') || {};
    } catch (error) {
        console.error('[主进程] 获取设置错误:', error);
        return {};
    }
});

safeHandle('settings:set', async (event, settings) => {
    try {
        console.log('[主进程] 保存设置:', settings);
        store.set('settings', settings);
        return { success: true };
    } catch (error) {
        console.error('[主进程] 保存设置错误:', error);
        return { success: false, error: String(error) };
    }
});

// 导出已注册的处理程序集合
export { registeredHandlers }; 