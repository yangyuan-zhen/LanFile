import { EventEmitter } from 'events';
import dgram from 'dgram';
import { ipcMain } from 'electron';

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
    ipcMain.handle('device:ping', async (_event, ip, port) => {
        try {
            console.log(`设备状态检查请求: ${ip}`);
            const isOnline = await checkTcpConnection(ip, port || 8092);
            return { success: isOnline };
        } catch (error) {
            console.error('设备状态检查失败:', error);
            return { success: false };
        }
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