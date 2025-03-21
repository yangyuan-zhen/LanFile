import { ipcMain } from 'electron';
import net from 'net';
import dgram from 'dgram';

// 添加ping设备功能
export const setupPingHandler = () => {
    const HEARTBEAT_PORT = 32199; // 使用心跳服务端口

    // 移除network:pingDevice的注册
    // 保留其他处理程序（如果有的话）
};

// 添加UDP端口测试功能
ipcMain.handle('network:testUdpPort', async (_, targetIp: string, port: number) => {
    return new Promise<{ success: boolean, error?: string }>((resolve) => {
        try {
            console.log(`开始测试UDP连接: ${targetIp}:${port}`);

            // 创建UDP客户端和服务端
            const client = dgram.createSocket('udp4');
            const server = dgram.createSocket('udp4');

            // 测试数据
            const testData = Buffer.from('LanFile_UDP_TEST');

            // 超时控制
            const timeout = setTimeout(() => {
                cleanup();
                console.log(`UDP测试超时: ${targetIp}:${port}`);
                resolve({ success: false, error: '连接超时' });
            }, 5000);

            // 清理函数
            const cleanup = () => {
                clearTimeout(timeout);
                try { client.close(); } catch (e) { }
                try { server.close(); } catch (e) { }
            };

            // 完成测试
            const completeTest = (success: boolean, error?: string) => {
                cleanup();
                console.log(`UDP测试结果 (${targetIp}:${port}): ${success ? '成功' : '失败'}`);
                resolve({ success, error });
            };

            // 随机选择本地端口
            const localPort = Math.floor(Math.random() * 10000) + 40000;

            // 设置服务端
            server.on('error', (err) => {
                console.error(`UDP服务端错误:`, err);
                completeTest(false, err.message);
            });

            server.on('message', (msg, rinfo) => {
                if (rinfo.address === targetIp && msg.toString() === testData.toString()) {
                    completeTest(true);
                }
            });

            // 设置客户端
            client.on('error', (err) => {
                console.error(`UDP客户端错误:`, err);
                completeTest(false, err.message);
            });

            // 绑定服务端并发送测试数据
            server.bind(localPort, () => {
                client.send(testData, port, targetIp, (err) => {
                    if (err) {
                        completeTest(false, err.message);
                    }
                });
            });
        } catch (error) {
            console.error('UDP测试失败:', error);
            resolve({
                success: false,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    });
}); 