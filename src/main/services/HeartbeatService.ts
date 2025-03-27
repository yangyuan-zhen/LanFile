import { createServer, Server } from 'http';
import { EventEmitter } from 'events';

export class HeartbeatService extends EventEmitter {
    private server: Server | null = null;
    private port: number = 8080; // 修改默认端口为8080
    public isRunning: boolean = false; // 修改为公共属性使外部可以访问

    constructor(port = 8080) { // 修改构造函数默认值
        super();
        this.port = port;
        this.setupServer();
        console.log(`HeartbeatService 初始化，默认端口: ${this.port}`);
    }

    private setupServer() {
        this.server = createServer((req, res) => {
            console.log(`收到请求: ${req.url} 从 ${req.socket.remoteAddress}`);
            if (req.url === '/lanfile/status') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    status: 'online',
                    version: process.env.APP_VERSION || '1.0.0',
                    timestamp: Date.now()
                }));
            } else {
                res.writeHead(404);
                res.end();
            }
        });

        this.server.on('error', (error: any) => {
            console.error('心跳服务器错误:', error);
            if (error.code === 'EADDRINUSE') {
                console.log(`端口 ${this.port} 已被占用，尝试使用 ${this.port + 1}`);
                this.port++;
                this.setupServer(); // 尝试使用下一个端口
            }
        });
    }

    public start(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.isRunning) {
                resolve();
                return;
            }

            this.server?.listen(this.port, '0.0.0.0', () => {
                console.log(`心跳服务已启动在端口 ${this.port}，监听所有网络接口`);
                this.isRunning = true;
                resolve();
            }).on('error', reject);
        });
    }

    public stop(): void {
        if (this.server && this.isRunning) {
            this.server.close();
            this.isRunning = false;
            console.log('心跳服务已停止');
        }
    }

    public getPort(): number {
        return this.port;
    }

    public setPort(port: number): void {
        if (this.port !== port) {
            this.port = port;
            this.stop();
            this.setupServer();
            if (this.isRunning) {
                this.start();
            }
        }
    }
}

// 创建单例实例
export const heartbeatService = new HeartbeatService();
export default heartbeatService; 