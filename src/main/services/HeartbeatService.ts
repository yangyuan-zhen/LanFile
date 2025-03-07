import { createServer, Server } from 'http';
import { ipcMain } from 'electron';
import { EventEmitter } from 'events';

export class HeartbeatService extends EventEmitter {
    private server: Server | null = null;
    private port: number = 8080;

    constructor(port = 8080) {
        super();
        this.port = port;
    }

    start() {
        if (this.server) return;

        this.server = createServer((req, res) => {
            if (req.url === '/status') {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                    app: "LanFile",
                    running: true,
                    timestamp: Date.now()
                }));
            } else {
                res.statusCode = 404;
                res.end();
            }
        });

        this.server.listen(this.port, () => {
            console.log(`心跳服务已启动，端口: ${this.port}`);
        });

        // 处理错误
        this.server.on('error', (err) => {
            console.error('心跳服务错误:', err);
            this.emit('error', err);
        });
    }

    stop() {
        if (this.server) {
            this.server.close(() => {
                console.log('心跳服务已停止');
                this.server = null;
            });
        }
    }

    getPort() {
        return this.port;
    }

    setPort(newPort: number) {
        if (this.server) {
            this.stop();
            this.port = newPort;
            this.start();
        } else {
            this.port = newPort;
        }
    }
}

// 创建服务实例
const heartbeatService = new HeartbeatService();

// 设置 IPC 处理器
ipcMain.handle('heartbeat:start', () => {
    heartbeatService.start();
    return { success: true, port: heartbeatService.getPort() };
});

ipcMain.handle('heartbeat:stop', () => {
    heartbeatService.stop();
    return { success: true };
});

ipcMain.handle('heartbeat:getPort', () => {
    return heartbeatService.getPort();
});

ipcMain.handle('heartbeat:setPort', (_, port: number) => {
    heartbeatService.setPort(port);
    return { success: true };
});

export default heartbeatService; 