import { ipcMain } from 'electron';
import { webSocketSignalingService } from './services/WebSocketSignalingService';
import { logService } from './services/LogService';

// 设置 WebSocket 信令相关的 IPC 处理程序
export const setupSignalingHandlers = () => {
    // 启动信令服务
    ipcMain.handle('signaling:start', async (_, deviceId, deviceName) => {
        try {
            logService.log(`正在启动信令服务，设备ID: ${deviceId}, 设备名称: ${deviceName}`);
            await webSocketSignalingService.start(deviceId, deviceName);
            const port = webSocketSignalingService.getPort();
            logService.log(`信令服务成功启动在端口: ${port}`);
            return {
                success: true,
                port: port
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : '';
            logService.error(`启动信令服务失败: ${errorMessage}`);
            logService.error(`错误堆栈: ${errorStack}`);
            return {
                success: false,
                error: errorMessage
            };
        }
    });

    // 连接到设备
    ipcMain.handle('signaling:connectToDevice', async (_, deviceId, address, port) => {
        try {
            await webSocketSignalingService.connectToDevice(deviceId, address, port);
            return { success: true };
        } catch (error) {
            logService.error(`连接到设备失败: ${error instanceof Error ? error.message : String(error)}`);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    });

    // 发送信令消息
    ipcMain.handle('signaling:sendMessage', (_, deviceId, message) => {
        const success = webSocketSignalingService.sendToDevice(deviceId, message);
        return { success };
    });

    // 广播消息
    ipcMain.handle('signaling:broadcast', (_, message) => {
        webSocketSignalingService.broadcastMessage(message);
        return { success: true };
    });

    // 获取已连接设备
    ipcMain.handle('signaling:getConnectedDevices', () => {
        return webSocketSignalingService.getConnectedDevices();
    });

    // 断开与设备的连接
    ipcMain.handle('signaling:disconnectFromDevice', (_, deviceId) => {
        webSocketSignalingService.disconnectFromDevice(deviceId);
        return { success: true };
    });

    // 停止信令服务
    ipcMain.handle('signaling:stop', () => {
        webSocketSignalingService.stop();
        return { success: true };
    });

    // 转发设备连接/断开事件到渲染进程
    webSocketSignalingService.on('deviceConnected', (device) => {
        logService.log(`发出设备连接事件: ${device.name} (${device.id})`);
        (global as any).mainWindow?.webContents.send('signaling:deviceConnected', device);
    });

    webSocketSignalingService.on('deviceDisconnected', (deviceId) => {
        logService.log(`发出设备断开事件: ${deviceId}`);
        (global as any).mainWindow?.webContents.send('signaling:deviceDisconnected', deviceId);
    });

    // 转发所有信令消息到渲染进程
    webSocketSignalingService.on('message', (message) => {
        (global as any).mainWindow?.webContents.send('signaling:message', message);
    });

    // 添加获取信令服务配置的处理程序
    ipcMain.handle('signaling:getServerConfig', () => {
        try {
            // 返回信令服务器配置
            return {
                host: 'localhost',
                port: 8090 // 或者从配置中读取
            };
        } catch (error) {
            console.error('获取信令服务配置失败:', error);
            throw error;
        }
    });

    // 添加获取信令服务器URL的处理程序 (可选的替代方案)
    ipcMain.handle('signaling:getServerUrl', () => {
        // 返回正确格式的 WebSocket URL 字符串
        const host = 'localhost'; // 或从配置获取
        const port = 8090; // 或从配置获取
        return `ws://${host}:${port}`;
    });

    // 添加检查状态的 IPC 处理程序
    ipcMain.handle('signaling:getStatus', () => {
        return {
            running: webSocketSignalingService.isRunning,
            port: webSocketSignalingService.getPort()
        };
    });

    logService.log('WebSocket 信令处理程序设置完成');
}; 