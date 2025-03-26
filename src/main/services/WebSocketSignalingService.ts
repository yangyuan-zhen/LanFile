import WebSocket from 'ws';
import { WebSocketServer } from 'ws';
import { EventEmitter } from 'events';
import { ipcMain } from 'electron';
import { logService } from './LogService';
import net from 'net';

interface SignalingMessage {
    type: 'offer' | 'answer' | 'ice-candidate' | 'register' | 'disconnect' | 'ping' | 'pong';
    from: string;
    to?: string;
    deviceId?: string;
    deviceName?: string;
    data?: any;
    timestamp?: number;
    originalTimestamp?: number;
}

export class WebSocketSignalingService extends EventEmitter {
    private server: any = null;
    private connections: Map<string, WebSocket> = new Map();
    private deviceMap: Map<string, { deviceId: string, deviceName: string }> = new Map();
    private port: number = 8092;
    public isRunning: boolean = false;
    private localDeviceId: string = '';
    private localDeviceName: string = '';
    private ipToDeviceIdMap: Map<string, string> = new Map();
    private keepAliveInterval: NodeJS.Timeout | null = null;
    private serverInitiatedConnections: Set<string> = new Set();
    private connectionStatus: Map<string, {
        reconnectAttempts: number,
        lastConnected: number,
        reconnecting: boolean
    }> = new Map();

    constructor(port = 8092) {
        super();
        this.port = port;
        this.setupAutoReconnect();
    }

    public start(deviceId: string, deviceName: string, port?: number): Promise<boolean> {
        try {
            this.localDeviceId = deviceId;
            this.localDeviceName = deviceName;

            if (port && port > 0) {
                this.port = port;
            }

            return new Promise((resolve, reject) => {
                const tryStartServer = (port: number, maxRetries = 5, retryCount = 0) => {
                    if (retryCount >= maxRetries) {
                        logService.error(`无法启动信令服务：尝试了${maxRetries}个端口后仍失败`);
                        reject(new Error(`无法启动信令服务：尝试了${maxRetries}个端口后仍失败`));
                        return;
                    }

                    try {
                        logService.log(`尝试在端口 ${port} 上启动 WebSocket 服务器`);

                        const server = new WebSocketServer({
                            port,
                            perMessageDeflate: {
                                zlibDeflateOptions: {
                                    chunkSize: 1024,
                                    memLevel: 7,
                                    level: 3
                                },
                                zlibInflateOptions: {
                                    chunkSize: 10 * 1024
                                },
                                serverNoContextTakeover: true,
                                clientNoContextTakeover: true,
                                clientMaxWindowBits: 10,
                                concurrencyLimit: 10,
                                threshold: 1024
                            },
                            maxPayload: 50 * 1024 * 1024
                        });

                        // 添加错误处理
                        server.on('error', (error: any) => {
                            if (error.code === 'EADDRINUSE') {
                                logService.log(`端口 ${port} 已被占用，尝试端口 ${port + 1}`);
                                // 递增端口并重试
                                tryStartServer(port + 1, maxRetries, retryCount + 1);
                            } else {
                                logService.error(`启动 WebSocket 服务器失败：${error.message}`);
                                reject(error);
                            }
                        });

                        server.on('listening', () => {
                            this.server = server;
                            this.isRunning = true;

                            // 设置定时心跳
                            this.keepAliveInterval = setInterval(() => {
                                for (const [deviceId, connection] of this.connections.entries()) {
                                    if (connection.readyState === WebSocket.OPEN) {
                                        try {
                                            connection.ping();
                                        } catch (error) {
                                            console.error(`向设备 ${deviceId} 发送ping失败:`, error);
                                        }
                                    }
                                }
                            }, 30000); // 每30秒ping一次

                            logService.log(`WebSocket 信令服务器成功运行在端口 ${port}`);
                            resolve(true);
                        });

                        // 设置连接处理器
                        server.on('connection', (ws: WebSocket, request: any) => {
                            const ip = request.socket.remoteAddress || 'unknown';
                            logService.log(`新的 WebSocket 连接来自 ${ip}`);

                            // 注册消息处理器
                            ws.on('message', (message: WebSocket.RawData) => this.handleIncomingMessage(ws, message));

                            ws.on('close', () => {
                                logService.log(`WebSocket 连接关闭: ${ip}`);
                                // 查找并删除断开的设备
                                for (const [deviceId, connection] of this.connections.entries()) {
                                    if (connection === ws) {
                                        this.connections.delete(deviceId);
                                        this.emit('deviceDisconnected', deviceId);
                                        break;
                                    }
                                }

                                // 更新连接状态
                                if (deviceId) {
                                    this.updateConnectionStatus(deviceId, {
                                        reconnecting: false,
                                        lastConnected: Date.now()
                                    });
                                }
                            });

                            ws.on('error', (error: Error) => {
                                logService.error(`WebSocket 连接错误: ${error.message}`);
                            });
                        });

                    } catch (error) {
                        if (error instanceof Error && error.message.includes('EADDRINUSE')) {
                            logService.log(`端口 ${port} 已被占用，尝试端口 ${port + 1}`);
                            // 递增端口并重试
                            tryStartServer(port + 1, maxRetries, retryCount + 1);
                        } else {
                            logService.error(`启动 WebSocket 服务器失败：${error instanceof Error ? error.message : String(error)}`);
                            reject(error);
                        }
                    }
                };

                // 从设置的初始端口开始尝试
                tryStartServer(this.port);
            });
        } catch (error) {
            console.error('启动信令服务失败:', error);
            return Promise.resolve(false);
        }
    }

    private handleIncomingMessage(ws: WebSocket, message: WebSocket.RawData): void {
        try {
            const signalingMessage = JSON.parse(message.toString()) as SignalingMessage;

            // 处理注册消息，将设备ID与连接关联
            if (signalingMessage.type === 'register' && signalingMessage.deviceId) {
                // 获取客户端IP地址
                const clientIp = this.getClientIp(ws);
                if (clientIp) {
                    // 记录IP到设备ID的映射
                    this.ipToDeviceIdMap.set(clientIp, signalingMessage.deviceId);
                    console.log(`记录IP映射: ${clientIp} -> ${signalingMessage.deviceId}`);
                }

                // 检查设备是否已注册且连接是否相同
                const existingConnection = this.connections.get(signalingMessage.deviceId);
                if (existingConnection === ws) {
                    console.log(`设备 ${signalingMessage.deviceName} 已经注册，忽略重复注册`);
                    return;
                }

                // 如果有旧连接但不是当前连接，先关闭旧连接
                if (existingConnection && existingConnection !== ws) {
                    console.log(`设备 ${signalingMessage.deviceName} 有旧连接，关闭旧连接并重新注册`);
                    try {
                        existingConnection.close();
                    } catch (err) {
                        console.error('关闭旧连接失败:', err);
                    }
                }

                // 注册新连接
                this.connections.set(signalingMessage.deviceId, ws);
                this.deviceMap.set(signalingMessage.deviceId, {
                    deviceId: signalingMessage.deviceId,
                    deviceName: signalingMessage.deviceName || signalingMessage.deviceId
                });

                logService.log(`设备已注册: ${signalingMessage.deviceName} (${signalingMessage.deviceId})`);

                // 通知新设备连接
                this.emit('deviceConnected', {
                    id: signalingMessage.deviceId,
                    name: signalingMessage.deviceName || signalingMessage.deviceId
                });

                return;
            }

            // 处理ping请求，立即返回pong响应
            if (signalingMessage.type === 'ping') {
                console.log(`收到来自 ${signalingMessage.from} 的ping请求`);
                this.sendToDevice(signalingMessage.from, {
                    type: 'pong',
                    from: this.localDeviceId,
                    timestamp: Date.now(),
                    originalTimestamp: signalingMessage.timestamp
                });
                return;
            }

            // 处理pong响应
            if (signalingMessage.type === 'pong') {
                console.log(`收到来自 ${signalingMessage.from} 的pong响应`);
                this.emit(`pong:${signalingMessage.from}`);
                return;
            }

            // 转发消息到目标设备
            if (signalingMessage.to) {
                this.forwardMessage(signalingMessage);
            }

            // 触发事件，让应用可以处理消息
            this.emit('message', signalingMessage);

        } catch (error) {
            logService.error(`处理 WebSocket 消息错误: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private forwardMessage(message: SignalingMessage): boolean {
        if (!message.to) return false;

        const targetConnection = this.connections.get(message.to);
        if (!targetConnection) {
            logService.warn(`无法找到目标设备连接: ${message.to}`);
            return false;
        }

        try {
            targetConnection.send(JSON.stringify(message));
            return true;
        } catch (error) {
            logService.error(`转发消息失败: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }

    // 连接到远程信令服务器
    public async connectToDevice(deviceId: string, host: string, port: number): Promise<boolean> {
        try {
            const url = `ws://${host}:${port}`;

            console.log(`尝试连接到设备: ${deviceId}, URL: ${url}`);

            // 创建WebSocket并添加稳定性参数
            const ws = new WebSocket(url, {
                // 增加超时时间
                handshakeTimeout: 10000,
                // 禁用Nagle算法
                perMessageDeflate: false,
                // 禁用ping/pong自动响应
                skipUTF8Validation: true,
                // 增加重试能力
                followRedirects: true,
                // 最大消息大小
                maxPayload: 10 * 1024 * 1024
            });

            // 记录此连接为服务器主动发起
            this.serverInitiatedConnections.add(deviceId);

            // 设置连接超时
            const connectionTimeout = setTimeout(() => {
                ws.terminate();
                logService.error(`连接设备 ${deviceId} 超时`);
                this.connections.delete(deviceId);
                this.emit('deviceDisconnected', deviceId);
            }, 10000);

            // 确保连接关闭时清理超时
            const clearConnectionTimeout = () => {
                if (connectionTimeout) {
                    clearTimeout(connectionTimeout);
                }
            };

            ws.on('open', () => {
                clearConnectionTimeout();
                this.connections.set(deviceId, ws);

                // 发送注册消息
                const registerMessage = {
                    type: 'register',
                    from: this.localDeviceId,
                    deviceId: this.localDeviceId,
                    deviceName: this.localDeviceName,
                    timestamp: Date.now()
                };

                try {
                    ws.send(JSON.stringify(registerMessage));
                    logService.log(`成功连接到设备 ${deviceId}`);
                } catch (error) {
                    logService.error(`发送注册消息失败: ${error}`);
                    this.connections.delete(deviceId);
                    this.emit('deviceDisconnected', deviceId);
                }
            });

            ws.on('message', (message) => {
                this.handleIncomingMessage(ws, message);
            });

            ws.on('error', (error) => {
                clearConnectionTimeout();
                logService.error(`WebSocket 错误: ${error}`);
                this.connections.delete(deviceId);
                this.emit('deviceDisconnected', deviceId);
            });

            ws.on('close', () => {
                logService.log(`与设备 ${deviceId} 的连接已关闭`);
                this.connections.delete(deviceId);
                this.emit('deviceDisconnected', deviceId);
            });

            return true;
        } catch (error) {
            logService.error(`创建连接失败, 完整错误: ${error}`);
            return false;
        }
    }

    // 发送信令消息到特定设备
    public sendToDevice(deviceId: string, message: SignalingMessage): boolean {
        if (!this.connections.has(deviceId)) {
            logService.warn(`无法发送消息：未连接到设备 ${deviceId}`);
            return false;
        }

        try {
            const connection = this.connections.get(deviceId);
            connection?.send(JSON.stringify(message));
            return true;
        } catch (error) {
            logService.error(`发送消息到设备 ${deviceId} 失败: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }

    // 向所有连接的设备发送消息
    public broadcastMessage(message: Omit<SignalingMessage, 'to'>): void {
        for (const [deviceId, connection] of this.connections.entries()) {
            if (connection.readyState === WebSocket.OPEN) {
                try {
                    connection.send(JSON.stringify({
                        ...message,
                        to: deviceId
                    }));
                } catch (error) {
                    logService.error(`广播消息到设备 ${deviceId} 失败: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        }
    }

    // 获取所有已连接的设备
    public getConnectedDevices(): Array<{ id: string, name: string }> {
        return Array.from(this.deviceMap.entries()).map(([id, device]) => ({
            id,
            name: device.deviceName
        }));
    }

    // 断开与特定设备的连接
    public disconnectFromDevice(deviceId: string): void {
        const connection = this.connections.get(deviceId);
        if (connection) {
            // 发送断开连接消息
            try {
                connection.send(JSON.stringify({
                    type: 'disconnect',
                    from: this.localDeviceId,
                    to: deviceId,
                    timestamp: Date.now()
                }));
            } catch (error) {
                // 忽略发送错误
            }

            connection.close();
            this.connections.delete(deviceId);
            this.deviceMap.delete(deviceId);
        }
    }

    public stop(): void {
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
        }
        // 向所有连接发送断开消息
        this.broadcastMessage({
            type: 'disconnect',
            from: this.localDeviceId,
            timestamp: Date.now()
        });

        // 关闭所有连接
        for (const connection of this.connections.values()) {
            connection.close();
        }

        this.connections.clear();
        this.deviceMap.clear();

        if (this.server) {
            (this.server as any).close();
            this.server = null;
        }

        this.isRunning = false;
        logService.log('WebSocket 信令服务已停止');
    }

    public getPort(): number {
        return this.port;
    }

    public setPort(port: number): void {
        if (this.port !== port) {
            const wasRunning = this.isRunning;
            if (wasRunning) {
                this.stop();
            }

            this.port = port;

            if (wasRunning) {
                this.start(this.localDeviceId, this.localDeviceName);
            }
        }
    }

    /**
     * 发送ping消息并等待pong响应
     */
    public async pingDevice(deviceId: string): Promise<boolean> {
        // 保存原始IP地址，使用IP连接而非主机名
        const originalIp = deviceId;
        let actualDeviceId = deviceId;

        // 先检查是否是IP地址，如果是则尝试查找映射用于事件监听
        if (/^(\d{1,3}\.){3}\d{1,3}$/.test(deviceId) && this.ipToDeviceIdMap.has(deviceId)) {
            actualDeviceId = this.ipToDeviceIdMap.get(deviceId)!;
            console.log(`使用设备映射处理消息: ${deviceId} -> ${actualDeviceId}`);
        }

        // 检查连接状态
        const isConnected = this.connections.has(actualDeviceId);

        // 如果未连接，先尝试建立连接 - 但使用原始IP而非主机名
        if (!isConnected) {
            try {
                // 使用原始IP建立连接
                const [ip, port] = originalIp.includes(':')
                    ? originalIp.split(':')
                    : [originalIp, '8092'];

                console.log(`设备未连接，尝试建立连接: ${ip}:${port}`);

                // 尝试连接
                await this.connectToDevice(actualDeviceId, ip, parseInt(port));

                // 给连接建立一些时间
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                console.error(`连接设备失败: ${originalIp}`, error);
                return false;
            }
        }

        return new Promise((resolve) => {
            // 设置超时
            const timeoutId = setTimeout(() => {
                this.removeListener(`pong:${actualDeviceId}`, responseHandler);
                console.log(`设备 ${actualDeviceId} ping超时`);
                resolve(false);
            }, 3000);

            // 定义响应处理器
            const responseHandler = () => {
                clearTimeout(timeoutId);
                resolve(true);
            };

            // 注册一次性监听器
            this.once(`pong:${actualDeviceId}`, responseHandler);

            // 发送ping消息
            try {
                this.sendToDevice(actualDeviceId, {
                    type: 'ping',
                    from: this.localDeviceId,
                    timestamp: Date.now()
                });
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.warn(`发送ping消息失败: ${errorMessage}`);
                clearTimeout(timeoutId);
                resolve(false);
            }
        });
    }

    private getClientIp(ws: WebSocket): string | null {
        const req = (ws as any)._socket?.remoteAddress;
        // 处理IPv6格式的IPv4地址 (::ffff:192.168.31.118)
        if (req && req.startsWith('::ffff:')) {
            return req.substr(7);
        }
        return req || null;
    }

    // 添加自动重连功能
    private setupAutoReconnect(): void {
        this.on('deviceDisconnected', (deviceId: string) => {
            // 只对服务器端发起的连接进行重连
            if (/^(\d{1,3}\.){3}\d{1,3}$/.test(deviceId) && this.serverInitiatedConnections.has(deviceId)) {
                console.log(`服务器初始连接的设备 ${deviceId} 断开，尝试重连...`);
                // 重连逻辑...
            }
        });
    }

    // 在连接断开时更新状态
    private updateConnectionStatus(deviceId: string, status: {
        reconnecting: boolean,
        lastConnected: number
    }): void {
        const currentStatus = this.connectionStatus.get(deviceId);
        if (currentStatus) {
            currentStatus.reconnecting = status.reconnecting;
            currentStatus.lastConnected = status.lastConnected;
        } else {
            this.connectionStatus.set(deviceId, {
                reconnecting: status.reconnecting,
                lastConnected: status.lastConnected,
                reconnectAttempts: 0
            });
        }
    }

    // 避免过于频繁的重连
    private shouldAttemptReconnect(deviceId: string): boolean {
        const status = this.connectionStatus.get(deviceId);
        if (!status) return true;

        // 如果30秒内已经尝试了3次以上，暂停重连
        if (status.reconnectAttempts > 3 &&
            (Date.now() - status.lastConnected) < 30000) {
            return false;
        }

        return true;
    }
}

// 创建单例实例
export const webSocketSignalingService = new WebSocketSignalingService();

// 在主进程中添加
ipcMain.handle('signaling:sendDirectMessage', async (_, targetIp, message) => {
    try {
        console.log(`尝试直接发送消息到IP: ${targetIp}`);

        // 创建TCP客户端直接连接目标IP
        const client = new net.Socket();

        return new Promise((resolve) => {
            client.connect(8092, targetIp, () => { // 使用信令服务默认端口
                console.log(`已连接到 ${targetIp}:8092`);
                client.write(JSON.stringify(message));
                client.end();
                resolve(true);
            });

            client.on('error', (err) => {
                console.error(`连接失败: ${err.message}`);
                resolve(false);
            });

            // 5秒超时
            setTimeout(() => {
                client.destroy();
                resolve(false);
            }, 5000);
        });
    } catch (error) {
        console.error('直接发送消息失败:', error);
        return false;
    }
}); 