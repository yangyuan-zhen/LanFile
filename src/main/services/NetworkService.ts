import { EventEmitter } from 'events';
import dgram from 'dgram';
import { ipcMain } from 'electron';
import * as net from 'net';
import fetch from 'node-fetch';

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

    constructor() {
        super();
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
}

// 增加多种检测方法
const DEFAULT_HEARTBEAT_PORT = 32199;
const HTTP_CHECK_PORT = 8899;

// UDP心跳检测 - 轻量快速
const checkDeviceByUDP = async (ip: string, port: number = DEFAULT_HEARTBEAT_PORT): Promise<boolean> => {
    return new Promise((resolve) => {
        try {
            console.log(`UDP检测设备: ${ip}:${port}`);
            const client = dgram.createSocket('udp4');
            const message = Buffer.from('LANFILE_PING');
            let resolved = false;

            // 设置超时
            const timeout = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    client.close();
                    console.log(`UDP检测超时: ${ip}:${port}`);
                    resolve(false);
                }
            }, 1000);

            // 发送UDP请求
            client.send(message, port, ip, (err) => {
                if (err) {
                    clearTimeout(timeout);
                    client.close();
                    resolved = true;
                    console.log(`UDP发送失败: ${ip}:${port}`, err);
                    resolve(false);
                }
            });

            // 监听回复
            client.on('message', () => {
                clearTimeout(timeout);
                client.close();
                resolved = true;
                console.log(`收到UDP回复: ${ip}:${port}`);
                resolve(true);
            });

            // 错误处理
            client.on('error', () => {
                clearTimeout(timeout);
                client.close();
                if (!resolved) {
                    resolved = true;
                    console.log(`UDP错误: ${ip}:${port}`);
                    resolve(false);
                }
            });
        } catch (error) {
            console.error(`UDP检测异常: ${ip}:${port}`, error);
            resolve(false);
        }
    });
};

// TCP心跳检测 - 可靠
const checkDeviceByTCP = async (ip: string, port: number = DEFAULT_HEARTBEAT_PORT): Promise<boolean> => {
    return new Promise((resolve) => {
        try {
            console.log(`TCP检测设备: ${ip}:${port}`);
            const socket = new net.Socket();
            let resolved = false;

            // 减少超时时间提高效率
            socket.setTimeout(1000);

            // 连接成功
            socket.on('connect', () => {
                socket.destroy();
                resolved = true;
                console.log(`TCP连接成功: ${ip}:${port}`);
                resolve(true);
            });

            // 连接超时
            socket.on('timeout', () => {
                socket.destroy();
                if (!resolved) {
                    resolved = true;
                    console.log(`TCP连接超时: ${ip}:${port}`);
                    resolve(false);
                }
            });

            // 连接错误
            socket.on('error', (err) => {
                socket.destroy();
                if (!resolved) {
                    resolved = true;
                    console.log(`TCP连接失败: ${ip}:${port}`, err.message);
                    resolve(false);
                }
            });

            // 尝试连接
            socket.connect(port, ip);
        } catch (error) {
            console.error(`TCP检测异常: ${ip}:${port}`, error);
            resolve(false);
        }
    });
};

// HTTP状态检测 - 功能丰富
const checkDeviceByHTTP = async (ip: string, port: number = HTTP_CHECK_PORT): Promise<boolean> => {
    try {
        console.log(`HTTP检测设备: ${ip}:${port}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const response = await fetch(`http://${ip}:${port}/lanfile/status`, {
            method: 'GET',
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log(`HTTP检测成功: ${ip}:${port}`);
        return response.ok;
    } catch (error: unknown) {
        // 类型安全的错误处理
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`HTTP检测失败: ${ip}:${port}`, errorMessage);
        return false;
    }
};

// 混合检测 - 优先使用UDP快速检测，失败时尝试TCP
const checkDeviceStatus = async (ip: string, port: number = DEFAULT_HEARTBEAT_PORT): Promise<boolean> => {
    try {
        // 先用UDP快速检测
        const udpResult = await checkDeviceByUDP(ip, port);
        if (udpResult) {
            return true;
        }

        // UDP失败时尝试TCP作为备份
        console.log(`UDP检测失败，尝试TCP: ${ip}:${port}`);
        return await checkDeviceByTCP(ip, port);
    } catch (error) {
        console.error(`设备检测异常: ${ip}:${port}`, error);
        return false;
    }
};

// 注册IPC处理程序
export const registerNetworkHandlers = () => {
    // 处理设备状态检查请求 - 保持原有接口兼容
    ipcMain.handle('network:pingDevice', async (_event, ip, port = DEFAULT_HEARTBEAT_PORT) => {
        try {
            return await checkDeviceStatus(ip, port);
        } catch (error) {
            console.error('检查设备状态失败:', error);
            return false;
        }
    });

    // 添加UDP监听服务 - 响应其他设备的UDP检测
    const startUDPHeartbeatService = (port = DEFAULT_HEARTBEAT_PORT) => {
        try {
            const server = dgram.createSocket('udp4');

            server.on('message', (msg, rinfo) => {
                if (msg.toString() === 'LANFILE_PING') {
                    console.log(`收到来自 ${rinfo.address}:${rinfo.port} 的心跳检测`);
                    server.send(Buffer.from('LANFILE_PONG'), rinfo.port, rinfo.address);
                }
            });

            server.on('error', (err) => {
                console.error('UDP心跳服务错误:', err);
                server.close();
            });

            server.bind(port);
            console.log(`UDP心跳服务启动在端口 ${port}`);
            return server;
        } catch (error) {
            console.error('启动UDP心跳服务失败:', error);
            return null;
        }
    };

    // 暴露启动UDP服务的方法
    ipcMain.handle('heartbeat:startUDPService', (_event, port) => {
        return startUDPHeartbeatService(port);
    });
}; 