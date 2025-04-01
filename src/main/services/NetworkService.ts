import { EventEmitter } from 'events';
import dgram from 'dgram';
import { ipcMain } from 'electron';
import { networkInterfaces } from 'os';
import { heartbeatService } from './HeartbeatService';
import net from 'net';

export interface NetworkDevice {
    name: string;
    address: string;
    port: number;
}

export class NetworkService extends EventEmitter {
    private socket: dgram.Socket | null = null;
    private isDiscovering: boolean = false;
    private servicePort: number = 12345;
    private isRunning: boolean = false;
    private deviceId: string;
    private deviceName: string;
    private port: number;
    private udpServer: dgram.Socket | null = null;
    private bandwidthTestServer: net.Server | null = null;
    private bandwidthTestPort: number = 8766;

    constructor(deviceId: string, deviceName: string, port: number) {
        super();
        this.deviceId = deviceId;
        this.deviceName = deviceName;
        this.port = port;
        this.setupSocket();
    }

    private setupSocket() {
        try {
            this.socket = dgram.createSocket('udp4');
            this.socket.on('message', this.handleMessage.bind(this));
            this.socket.on('error', this.handleError.bind(this));
            this.socket.bind(0);
        } catch (error) {
            console.error('Failed to setup UDP socket:', error);
        }
    }

    private handleMessage(msg: Buffer, rinfo: dgram.RemoteInfo) {
        try {
            const data = JSON.parse(msg.toString());
            if (data.type === 'lanfile-announce') {
                this.emit('deviceFound', {
                    name: data.name,
                    address: rinfo.address,
                    port: data.port
                });
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    }

    private handleError(error: Error) {
        console.error('UDP error:', error);
        this.emit('error', error);
    }

    public getLocalService() {
        return {
            name: 'LanFile Device',
            port: this.servicePort
        };
    }

    public startDiscovery(): void {
        if (this.isDiscovering) return;
        this.isDiscovering = true;

        try {
            const message = Buffer.from(JSON.stringify({
                type: 'lanfile-discover'
            }));

            this.socket?.setBroadcast(true);
            this.socket?.send(message, 0, message.length, this.servicePort, '255.255.255.255');
        } catch (error) {
            console.error('Failed to start discovery:', error);
        }
    }

    public stopDiscovery(): void {
        if (!this.isDiscovering) return;
        this.isDiscovering = false;
    }

    public stop() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }

        this.stopBandwidthTestServer();
    }

    public publishService(port: number): void {
        try {
            const message = Buffer.from(JSON.stringify({
                type: 'lanfile-announce',
                name: 'LanFile Device',
                port: port
            }));
            this.socket?.setBroadcast(true);
            this.socket?.send(message, 0, message.length, port, '255.255.255.255');
            this.servicePort = port;
            this.isRunning = true;
        } catch (error) {
            console.error('Failed to publish service:', error);
        }
    }

    public unpublishService(): void {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
            this.isRunning = false;
        }
    }

    updateServicePort(port: number) {
        console.log(`更新网络服务端口: ${port}`);
        this.servicePort = port;

        // 重启服务以应用新端口
        if (this.isRunning) {
            console.log('重新启动网络服务以应用新端口');
            this.unpublishService();
            this.publishService(port);
        }
    }

    broadcastPresence() {
        if (!this.udpServer) return;

        const interfaces = networkInterfaces();
        const broadcastAddresses: string[] = [];

        // 获取所有广播地址
        Object.values(interfaces).forEach(iface => {
            if (!iface) return;
            iface.forEach(details => {
                if (details.family === 'IPv4' && !details.internal) {
                    // 从 IP 和子网掩码计算广播地址
                    const ipParts = details.address.split('.');
                    const maskParts = details.netmask.split('.');
                    const broadcastParts = ipParts.map((part, i) =>
                        (parseInt(part) | (~parseInt(maskParts[i]) & 255)) & 255
                    );
                    broadcastAddresses.push(broadcastParts.join('.'));
                }
            });
        });

        // 发送广播
        const message = JSON.stringify({
            type: 'presence',
            deviceId: this.deviceId,
            deviceName: this.deviceName,
            services: ['file-transfer', 'peer-discovery'],
            ports: {
                'heartbeat': this.port,
                'peer-discovery': 8765
            }
        });

        broadcastAddresses.forEach(address => {
            this.udpServer?.send(message, this.port, address);
        });

        console.log(`发送UDP广播到: ${broadcastAddresses.join(', ')}`);
    }

    /**
     * 启动带宽测试服务器
     * 用于接收带宽测试请求
     */
    public startBandwidthTestServer(): void {
        if (this.bandwidthTestServer) return;

        this.bandwidthTestServer = net.createServer();
        this.bandwidthTestServer.on('connection', this.handleBandwidthTestConnection.bind(this));
        this.bandwidthTestServer.listen(this.bandwidthTestPort, () => {
            console.log(`带宽测试服务器启动在端口: ${this.bandwidthTestPort}`);
        });

        this.bandwidthTestServer.on('error', (err) => {
            console.error('带宽测试服务器错误:', err);
        });
    }

    /**
     * 处理带宽测试连接
     */
    private handleBandwidthTestConnection(socket: net.Socket): void {
        console.log(`收到来自 ${socket.remoteAddress} 的带宽测试连接`);

        // 创建测试数据 (1MB)
        const testData = Buffer.alloc(1024 * 1024, 'B');

        // 发送测试数据
        socket.write(testData);

        socket.on('error', (err) => {
            console.error('带宽测试连接错误:', err);
            socket.destroy();
        });
    }

    /**
     * 测量与指定设备的网络带宽
     * @param ip 目标设备IP
     * @param port 目标设备带宽测试端口
     * @returns 带宽测量结果 (bytes/second)
     */
    public async measureBandwidth(ip: string, port: number = this.bandwidthTestPort): Promise<number> {
        return new Promise((resolve, reject) => {
            const socket = new net.Socket();
            const startTime = Date.now();
            let bytesReceived = 0;
            let testComplete = false;

            // 设置5秒超时
            socket.setTimeout(5000);

            socket.on('data', (data) => {
                bytesReceived += data.length;

                // 接收到足够的数据后计算带宽
                if (bytesReceived >= 1024 * 1024 && !testComplete) {
                    testComplete = true;
                    const endTime = Date.now();
                    const durationSeconds = (endTime - startTime) / 1000;
                    const bandwidth = bytesReceived / durationSeconds;

                    socket.destroy();
                    resolve(bandwidth);
                }
            });

            socket.on('timeout', () => {
                socket.destroy();
                if (!testComplete) {
                    reject(new Error('带宽测试超时'));
                }
            });

            socket.on('error', (err) => {
                socket.destroy();
                if (!testComplete) {
                    reject(err);
                }
            });

            socket.on('close', () => {
                if (!testComplete) {
                    reject(new Error('连接关闭，带宽测试未完成'));
                }
            });

            socket.connect(port, ip);
        });
    }

    /**
     * 执行多次带宽测试并返回平均值，以获得更准确的结果
     * @param ip 目标设备IP
     * @param port 目标设备带宽测试端口
     * @param samples 测试次数
     * @returns 平均带宽 (bytes/second)
     */
    public async getAverageBandwidth(ip: string, port: number = this.bandwidthTestPort, samples: number = 3): Promise<number> {
        console.log(`开始对 ${ip}:${port} 进行带宽测试，样本数: ${samples}`);

        let successfulTests = 0;
        let totalBandwidth = 0;

        for (let i = 0; i < samples; i++) {
            try {
                const bandwidth = await this.measureBandwidth(ip, port);
                totalBandwidth += bandwidth;
                successfulTests++;
                console.log(`带宽测试 #${i + 1}: ${(bandwidth / (1024 * 1024)).toFixed(2)} MB/s`);
            } catch (error) {
                console.error(`带宽测试 #${i + 1} 失败:`, error);
            }

            // 测试之间等待短暂时间
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (successfulTests === 0) {
            throw new Error('所有带宽测试都失败');
        }

        const averageBandwidth = totalBandwidth / successfulTests;
        console.log(`平均带宽: ${(averageBandwidth / (1024 * 1024)).toFixed(2)} MB/s`);

        return averageBandwidth;
    }

    /**
     * 停止带宽测试服务器
     */
    public stopBandwidthTestServer(): void {
        if (this.bandwidthTestServer) {
            this.bandwidthTestServer.close();
            this.bandwidthTestServer = null;
        }
    }
}

// 修改设备检测策略，完全使用TCP检测
export const registerNetworkHandlers = () => {
    ipcMain.handle('network:pingDevice', async (_event, ip, port) => {
        try {
            // 使用TCP端口检测 (快速且轻量)
            console.log(`TCP端口检测设备: ${ip}:${port || 8092}`);
            const tcpResult = await checkTcpConnection(ip, port || 8092);

            if (tcpResult) {
                console.log(`TCP检测成功: ${ip}:${port || 8092}`);
                return true;
            }

            console.log(`TCP检测失败: ${ip}:${port || 8092}`);
            return false;
        } catch (error) {
            console.error('设备检测失败:', error);
            return false;
        }
    });

    // 为保持兼容性，注册device:ping处理程序，但内部使用TCP检测
    ipcMain.handle('device:ping', async (_event, ip) => {
        try {
            console.log(`设备状态检查请求: ${ip}`);

            // 尝试使用不同端口进行检测
            // 1. 检查心跳服务端口
            let isOnline = await checkTcpConnection(ip, heartbeatService.getPort());
            if (isOnline) {
                return { success: true };
            }

            // 2. 检查PeerDiscovery端口
            isOnline = await checkTcpConnection(ip, 8765);
            if (isOnline) {
                return { success: true };
            }

            return { success: false };
        } catch (error) {
            console.error('设备状态检查失败:', error);
            return { success: false };
        }
    });

    // 添加带宽测试IPC处理程序
    ipcMain.handle('network:measureBandwidth', async (_event, ip, port) => {
        try {
            console.log(`收到带宽测试请求: ${ip}:${port || 8766}`);
            const networkService = new NetworkService("temp-id", "temp-name", 0);

            // 启动带宽测试服务器(如果需要接收测试请求)
            networkService.startBandwidthTestServer();

            // 执行带宽测试
            const bandwidth = await networkService.getAverageBandwidth(ip, port || 8766);

            return {
                success: true,
                bandwidth: bandwidth,
                bandwidthMbps: bandwidth / (1024 * 1024),
                unit: 'bytes/second'
            };
        } catch (error: unknown) {
            console.error('带宽测试失败:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    });

    // 获取本地服务带宽测试端口
    ipcMain.handle('network:getBandwidthTestPort', () => {
        return 8766; // 返回默认带宽测试端口
    });
};

// 保留TCP连接检测的代码，移除HTTP检测代码
async function checkTcpConnection(ip: string, port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = require('net').Socket();
        const timeout = 2000;

        socket.setTimeout(timeout);

        socket.on('connect', () => {
            socket.end();
            resolve(true);
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
        });

        socket.on('error', () => {
            socket.destroy();
            resolve(false);
        });

        socket.connect(port, ip);
    });
} 