import WebSocket from 'ws';
import { WebSocketServer } from 'ws';
import { EventEmitter } from 'events';
import { ipcMain } from 'electron';
import { logService } from './LogService';

interface SignalingMessage {
    type: 'offer' | 'answer' | 'ice-candidate' | 'register' | 'disconnect';
    from: string;
    to?: string;
    deviceId?: string;
    deviceName?: string;
    data?: any;
    timestamp?: number;
}

export class WebSocketSignalingService extends EventEmitter {
    private server: any = null;
    private connections: Map<string, WebSocket> = new Map();
    private deviceMap: Map<string, { deviceId: string, deviceName: string }> = new Map();
    private port: number = 8092;
    public isRunning: boolean = false;
    private localDeviceId: string = '';
    private localDeviceName: string = '';

    constructor(port = 8092) {
        super();
        this.port = port;
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

                        const server = new WebSocketServer({ port });

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

                // 向新设备发送当前设备信息
                this.sendToDevice(signalingMessage.deviceId, {
                    type: 'register',
                    from: this.localDeviceId,
                    deviceId: this.localDeviceId,
                    deviceName: this.localDeviceName,
                    timestamp: Date.now()
                });

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
    public connectToDevice(deviceId: string, address: string, port?: number): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                // 检查设备是否已连接
                if (this.connections.has(deviceId)) {
                    logService.log(`设备 ${deviceId} 已连接`);
                    resolve();
                    return;
                }

                // 构建正确的 WebSocket URL
                const wsUrl = `ws://${address}:${port || this.port}`;

                // 添加详细日志
                logService.log(`尝试连接到设备: ${deviceId}, URL: ${wsUrl}`);

                // 创建 WebSocket 对象
                let socket: WebSocket;
                try {
                    socket = new WebSocket(wsUrl);
                } catch (error) {
                    logService.error(`创建 WebSocket 失败: ${error}`);
                    logService.error(`参数: URL=${wsUrl}`);
                    reject(error);
                    return;
                }

                // 设置连接超时
                const connectionTimeout = setTimeout(() => {
                    socket.terminate();
                    logService.error(`连接设备 ${deviceId} 超时`);
                    reject(new Error(`连接到设备 ${deviceId} 超时`));
                }, 10000);

                // 确保连接关闭时清理超时
                const clearConnectionTimeout = () => {
                    if (connectionTimeout) {
                        clearTimeout(connectionTimeout);
                    }
                };

                socket.on('open', () => {
                    clearConnectionTimeout();
                    this.connections.set(deviceId, socket);

                    // 发送注册消息
                    const registerMessage = {
                        type: 'register',
                        from: this.localDeviceId,
                        deviceId: this.localDeviceId,
                        deviceName: this.localDeviceName,
                        timestamp: Date.now()
                    };

                    try {
                        socket.send(JSON.stringify(registerMessage));
                        logService.log(`成功连接到设备 ${deviceId}`);
                        resolve();
                    } catch (error) {
                        logService.error(`发送注册消息失败: ${error}`);
                        reject(error);
                    }
                });

                socket.on('message', (message) => {
                    this.handleIncomingMessage(socket, message);
                });

                socket.on('error', (error) => {
                    clearConnectionTimeout();
                    logService.error(`WebSocket 错误: ${error}`);
                    this.connections.delete(deviceId);
                    reject(error);
                });

                socket.on('close', () => {
                    logService.log(`与设备 ${deviceId} 的连接已关闭`);
                    this.connections.delete(deviceId);
                    this.emit('deviceDisconnected', deviceId);
                });
            } catch (error) {
                logService.error(`创建连接失败, 完整错误: ${error}`);
                reject(error);
            }
        });
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
}

// 创建单例实例
export const webSocketSignalingService = new WebSocketSignalingService(); 