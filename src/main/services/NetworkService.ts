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
export const DEFAULT_HEARTBEAT_PORT = 8080;

// TCP 连接检测
const checkDeviceByTCP = async (ip: string, port: number): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
        try {
            console.log(`TCP检测设备: ${ip}:${port}`);
            const socket = new net.Socket();
            const timeout = 1000;

            socket.setTimeout(timeout);

            socket.on('connect', () => {
                socket.destroy();
                console.log(`TCP连接成功: ${ip}:${port}`);
                resolve(true);
            });

            socket.on('timeout', () => {
                socket.destroy();
                console.log(`TCP连接超时: ${ip}:${port}`);
                resolve(false);
            });

            socket.on('error', (err) => {
                socket.destroy();
                console.log(`TCP连接错误: ${ip}:${port}`, err.message);
                resolve(false);
            });

            socket.connect(port, ip);
        } catch (error) {
            console.error(`TCP检测异常: ${ip}:${port}`, error);
            resolve(false);
        }
    });
};

// 修改 HTTP 检测实现
const checkDeviceByHTTP = async (ip: string, port: number): Promise<boolean> => {
    try {
        console.log(`开始HTTP检测设备: ${ip}:${port}`);

        // 创建一个带超时的 Promise
        const timeoutPromise = new Promise<Response>((_, reject) => {
            setTimeout(() => {
                console.log(`HTTP请求超时: ${ip}:${port}`);
                reject(new Error('请求超时'));
            }, 2000);
        });

        const url = `http://${ip}:${port}/lanfile/status`;
        console.log(`发送HTTP请求: ${url}`);

        // 创建实际的 fetch 请求
        const fetchPromise = fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        // 使用 Promise.race 实现超时
        const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;

        console.log(`HTTP检测成功: ${ip}:${port}, 状态码: ${response.status}`);
        return response.ok;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`HTTP检测失败详细信息: ${ip}:${port}, 错误: ${errorMessage}`);
        return false;
    }
};

// 简化设备检测 - 主要依赖 HTTP 检测
export const checkDeviceStatus = async (ip: string, port: number = DEFAULT_HEARTBEAT_PORT): Promise<boolean> => {
    try {
        // 直接使用 HTTP 检测
        return await checkDeviceByHTTP(ip, port);
    } catch (error) {
        console.error(`设备检测异常: ${ip}:${port}`, error);
        return false;
    }
};

// 注册简化的IPC处理程序
export const registerNetworkHandlers = () => {
    // 处理设备状态检查请求
    ipcMain.handle('network:pingDevice', async (_event, ip, port = DEFAULT_HEARTBEAT_PORT) => {
        try {
            return await checkDeviceStatus(ip, port);
        } catch (error) {
            console.error('检查设备状态失败:', error);
            return false;
        }
    });

    // 移除 UDP 相关的处理程序
}; 