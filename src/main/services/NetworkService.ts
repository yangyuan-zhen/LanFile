import { EventEmitter } from 'events';
import dgram from 'dgram';
import { ipcMain } from 'electron';
import { networkInterfaces } from 'os';
import { heartbeatService } from './HeartbeatService';

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