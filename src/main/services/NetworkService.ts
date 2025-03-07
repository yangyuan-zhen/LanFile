import { EventEmitter } from 'events';
import dgram from 'dgram';
import { ipcMain } from 'electron';
import * as net from 'net';

export interface NetworkDevice {
    name: string;
    address: string;
    port: number;
}

export class NetworkService extends EventEmitter {
    private socket: dgram.Socket | null = null;
    private isDiscovering: boolean = false;

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
            port: 12345
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
            this.socket?.send(message, 0, message.length, 12345, '255.255.255.255');
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
            this.socket?.send(message, 0, message.length, 12345, '255.255.255.255');
        } catch (error) {
            console.error('Failed to publish service:', error);
        }
    }

    public unpublishService(): void {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }
}

// 检查设备是否在线
const checkDeviceStatus = async (ip: string, port: number): Promise<boolean> => {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const timeout = 1000; // 1秒超时

        // 设置超时
        socket.setTimeout(timeout);

        // 尝试连接
        socket.connect(port, ip, () => {
            socket.destroy();
            resolve(true);
        });

        // 处理错误
        socket.on('error', () => {
            socket.destroy();
            resolve(false);
        });

        // 处理超时
        socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
        });
    });
};

// 注册IPC处理程序
export const registerNetworkHandlers = () => {
    // ... 其他现有代码 ...

    // 处理设备状态检查请求
    ipcMain.handle('network:pingDevice', async (_event, { ip, port }) => {
        try {
            return await checkDeviceStatus(ip, port);
        } catch (error) {
            console.error('检查设备状态失败:', error);
            return false;
        }
    });
}; 