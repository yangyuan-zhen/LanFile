import { ipcMain, dialog, BrowserWindow, app } from 'electron';
import { writeFile } from 'fs/promises';
import path from 'path';

// 这个文件负责主进程中的 WebRTC 相关功能

export function setupWebRTCHandlers(mainWindow: BrowserWindow) {
    // 初始化 WebRTC
    ipcMain.handle('webrtc:initialize', async () => {
        console.log('WebRTC 初始化请求');
        return true;
    });

    // 处理发送 WebRTC 提议
    ipcMain.handle('webrtc:sendOffer', async (event, { toPeerId, offer }) => {
        console.log(`发送 WebRTC 提议到设备 ${toPeerId}`);
        // 在实际应用中，您需要通过某种信令机制将提议发送到远程设备
        // 这可以是通过您现有的发现服务或专用信令服务器
        // 简化示例中，我们假设这个消息会通过某种方式到达目标设备

        // 示例：向主窗口发送消息（假设有一个连接的远程设备）
        mainWindow.webContents.send('webrtc:connectionRequest', {
            fromPeerId: 'local-device-id', // 应该是本地设备 ID
            offer
        });

        return true;
    });

    // 处理发送 WebRTC 应答
    ipcMain.handle('webrtc:sendAnswer', async (event, { toPeerId, answer }) => {
        console.log(`发送 WebRTC 应答到设备 ${toPeerId}`);
        // 同上，在实际应用中需要通过信令机制发送

        mainWindow.webContents.send('webrtc:receiveAnswer', {
            fromPeerId: 'local-device-id',
            answer
        });

        return true;
    });

    // 处理发送 ICE 候选
    ipcMain.handle('webrtc:sendIceCandidate', async (event, { toPeerId, candidate }) => {
        console.log(`发送 ICE 候选到设备 ${toPeerId}`);
        // 同上，在实际应用中需要通过信令机制发送

        mainWindow.webContents.send('webrtc:receiveIceCandidate', {
            fromPeerId: 'local-device-id',
            candidate
        });

        return true;
    });

    // 保存下载的文件
    ipcMain.handle('file:saveDownloadedFile', async (event, { url, fileName, fileType }) => {
        try {
            // 先让用户选择保存位置
            const { canceled, filePath } = await dialog.showSaveDialog({
                title: '保存文件',
                defaultPath: path.join(app.getPath('downloads'), fileName),
                filters: [
                    { name: '所有文件', extensions: ['*'] }
                ]
            });

            if (canceled || !filePath) {
                return { success: false, message: '用户取消了保存' };
            }

            // 向渲染进程请求文件数据
            mainWindow.webContents.send('file:requestFileData', { url });

            // 设置一次性监听器接收文件数据
            return new Promise((resolve) => {
                ipcMain.once('file:receiveFileData', async (event, { data }) => {
                    try {
                        // 将 Base64 数据转换为 Buffer
                        const buffer = Buffer.from(data, 'base64');

                        // 写入文件
                        await writeFile(filePath, buffer);
                        resolve({ success: true, path: filePath });
                    } catch (error) {
                        console.error('保存文件失败:', error);
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        resolve({ success: false, message: `保存失败: ${errorMessage}` });
                    }
                });
            });
        } catch (error) {
            console.error('保存文件处理失败:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return { success: false, message: `处理失败: ${errorMessage}` };
        }
    });
} 