import { app, ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import store from './store'; // 修改为默认导入

// 在文件顶部添加
interface Settings {
    downloadPath?: string;
    // 其他设置...
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

        // 写入文件
        fs.writeFileSync(filePath, Buffer.from(await fileData.arrayBuffer()));

        // 返回保存的路径
        return filePath;
    } catch (error) {
        console.error('保存文件失败:', error);
        throw error;
    }
}); 