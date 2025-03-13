import { ipcMain } from 'electron';
import net from 'net';

// 添加ping设备功能
export const setupPingHandler = () => {
    const HEARTBEAT_PORT = 32199; // 使用心跳服务端口

    ipcMain.handle('network:pingDevice', async (event, ip) => {
        try {
            console.log(`尝试 ping 设备: ${ip}:${HEARTBEAT_PORT}`);

            return new Promise<boolean>((resolve) => {
                const socket = new net.Socket();
                const timeout = 2000;

                socket.setTimeout(timeout);

                socket.on('connect', () => {
                    socket.destroy();
                    console.log(`Ping设备 ${ip} 结果: true`);
                    resolve(true);
                });

                socket.on('timeout', () => {
                    socket.destroy();
                    console.log(`Ping设备 ${ip} 结果: false (超时)`);
                    resolve(false);
                });

                socket.on('error', () => {
                    socket.destroy();
                    console.log(`Ping设备 ${ip} 结果: false (错误)`);
                    resolve(false);
                });

                socket.connect(HEARTBEAT_PORT, ip);
            });
        } catch (error) {
            console.error('Ping设备失败:', error);
            return false;
        }
    });
}; 