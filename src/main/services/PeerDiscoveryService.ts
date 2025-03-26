import express from 'express';
import http from 'http';
import { ipcMain } from 'electron';
import fetch from 'node-fetch';

class PeerDiscoveryService {
    private app = express();
    private server: http.Server | null = null;
    private port = 8765;
    private myPeerId = '';

    constructor() {
        console.log('初始化 PeerDiscoveryService');
        this.setupAPI();
        this.setupIPC();
    }

    private setupAPI() {
        // 返回当前设备的 PeerJS ID
        this.app.get('/peer-id', (req, res) => {
            res.json({ peerId: this.myPeerId });
        });
    }

    private setupIPC() {
        // 启动服务
        ipcMain.handle('peer:startDiscovery', (_, peerId) => {
            this.myPeerId = peerId;
            return this.start();
        });

        // 获取远程设备的 PeerJS ID
        ipcMain.handle('peer:getRemotePeerId', async (_, ip) => {
            try {
                // 使用 AbortController 实现超时功能
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);

                const response = await fetch(`http://${ip}:${this.port}/peer-id`, {
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                    const data = await response.json() as { peerId: string };
                    return { success: true, peerId: data.peerId };
                }
                return { success: false, error: '无法获取对方PeerJS ID' };
            } catch (error) {
                console.error('获取远程PeerJS ID失败:', error);
                return { success: false, error: String(error) };
            }
        });
    }

    async start(): Promise<boolean> {
        console.log(`尝试在端口 ${this.port} 启动 PeerDiscoveryService`);
        return new Promise((resolve) => {
            this.server = this.app.listen(this.port, '0.0.0.0', () => {
                console.log(`PeerJS ID 发现服务已启动，监听端口 ${this.port} 和所有网络接口`);
                resolve(true);
            });

            this.server.on('error', (err) => {
                console.error('启动PeerJS ID发现服务失败:', err);
                resolve(false);
            });
        });
    }

    stop() {
        if (this.server) {
            this.server.close();
            this.server = null;
        }
    }
}

export const peerDiscoveryService = new PeerDiscoveryService(); 