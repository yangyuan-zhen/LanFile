import { app, ipcMain, shell } from 'electron';
import fs from 'fs';
import path from 'path';
import store from './store';

// 定义设置类型
interface Settings {
    downloadPath?: string;
}

// 处理自动保存文件到下载目录
ipcMain.handle('file:saveToDownloads', async (event, args) => {
    try {
        const { fileName, fileData } = args;

        // 从设置中获取下载目录
        const settings = (store.get('settings') || {}) as Settings;
        const downloadPath = settings.downloadPath || app.getPath('downloads');

        // 确保目录存在
        if (!fs.existsSync(downloadPath)) {
            fs.mkdirSync(downloadPath, { recursive: true });
        }

        // 构建完整文件路径
        const filePath = path.join(downloadPath, fileName);

        // 写入文件 - 直接使用 ArrayBuffer
        fs.writeFileSync(filePath, Buffer.from(fileData));

        // 返回保存的路径
        return filePath;
    } catch (error) {
        console.error('保存文件失败:', error);
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