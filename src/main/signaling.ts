import { ipcMain } from 'electron';
import { webSocketSignalingService } from './services/WebSocketSignalingService';
import { logService } from './services/LogService';

// 设置 WebSocket 信令相关的 IPC 处理程序
export const setupSignalingHandlers = () => {
    // 启动信令服务
    ipcMain.handle('signaling:start', async (_, deviceId, deviceName) => {
        try {
            await webSocketSignalingService.start(deviceId, deviceName);
            return {
                success: true,
                port: webSocketSignalingService.getPort()
            };
        } catch (error) {
            logService.error(`启动信令服务失败: ${error instanceof Error ? error.message : String(error)}`);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
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
        try {
            return 'ws://localhost:8090'; // 或者从配置中构建
        } catch (error) {
            console.error('获取信令服务URL失败:', error);
            throw error;
        }
    });

    logService.log('WebSocket 信令处理程序设置完成');
}; 