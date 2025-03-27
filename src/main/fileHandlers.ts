import { ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

// 确保注册了这个处理程序
ipcMain.handle('file:saveToDownloads', async (event, args) => {
    try {
        const { fileName, fileData, fileType } = args;

        // 确保下载目录存在
        const downloadsPath = app.getPath('downloads');
        const filePath = path.join(downloadsPath, fileName);

        // 将 Array 转回 Buffer
        const buffer = Buffer.from(fileData);

        // 写入文件
        fs.writeFileSync(filePath, buffer);

        console.log(`文件已保存到: ${filePath}`);

        return filePath;
    } catch (error) {
        console.error('保存文件错误:', error);
        throw error;
    }
}); 