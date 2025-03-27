import { ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

// 确保注册了这个处理程序
ipcMain.handle('file:saveToDownloads', async (event, args) => {
    try {
        const { fileName, fileData, fileType } = args;
        console.log(`[主进程] 开始保存文件: ${fileName}, 类型: ${fileType}`);
        console.log(`[主进程] 文件数据类型: ${typeof fileData}, 长度: ${fileData.length}`);

        // 确保下载目录存在
        const downloadsPath = app.getPath('downloads');
        console.log(`[主进程] 保存到目录: ${downloadsPath}`);

        const filePath = path.join(downloadsPath, fileName);
        console.log(`[主进程] 完整文件路径: ${filePath}`);

        // 将 Array 转回 Buffer
        const buffer = Buffer.from(fileData);
        console.log(`[主进程] 创建的Buffer大小: ${buffer.length} 字节`);

        // 写入文件
        fs.writeFileSync(filePath, buffer);
        console.log(`[主进程] 文件已成功写入: ${filePath}`);

        return filePath;
    } catch (error) {
        console.error('[主进程] 保存文件错误:', error);
        throw error;
    }
}); 