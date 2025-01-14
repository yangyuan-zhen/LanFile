import { Server } from 'socket.io';
import { networkInterfaces } from 'os';
import { BrowserWindow } from 'electron';

export class WebSocketServer {
    private io: Server;
    private mainWindow: BrowserWindow;
    private port: number = 8080;

    constructor(mainWindow: BrowserWindow) {
        this.mainWindow = mainWindow;
        this.io = new Server(this.port, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });

        this.setupEventHandlers();
    }

    private setupEventHandlers() {
        this.io.on('connection', (socket) => {
            console.log('New client connected');

            // 处理文件传输请求
            socket.on('start-transfer', (data) => {
                console.log('File transfer started:', data);
                // 通知渲染进程开始传输
                this.mainWindow.webContents.send('transfer-started', data);
            });

            // 处理文件数据块
            socket.on('file-chunk', (chunk) => {
                // 处理文件数据块
                this.mainWindow.webContents.send('chunk-received', chunk);
            });

            // 处理传输完成
            socket.on('transfer-complete', (data) => {
                console.log('File transfer complete:', data);
                this.mainWindow.webContents.send('transfer-complete', data);
            });

            socket.on('disconnect', () => {
                console.log('Client disconnected');
            });
        });
    }

    // 获取本机IP地址
    public getLocalIPs(): string[] {
        const interfaces = networkInterfaces();
        const addresses: string[] = [];

        for (const interfaceName in interfaces) {
            const interface_ = interfaces[interfaceName];
            if (interface_) {
                for (const address of interface_) {
                    if (address.family === 'IPv4' && !address.internal) {
                        addresses.push(address.address);
                    }
                }
            }
        }

        return addresses;
    }

    public getPort(): number {
        return this.port;
    }

    public close() {
        this.io.close();
    }
} 