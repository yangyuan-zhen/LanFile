import { io, Socket } from 'socket.io-client';

export class WebSocketClient {
    private socket: Socket | null = null;
    private chunkSize: number = 1024 * 1024; // 1MB chunks

    constructor() { }

    connect(serverUrl: string): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.socket = io(serverUrl);

                this.socket.on('connect', () => {
                    console.log('Connected to server');
                    resolve();
                });

                this.socket.on('connect_error', (error) => {
                    console.error('Connection error:', error);
                    reject(error);
                });

                this.setupEventHandlers();
            } catch (error) {
                reject(error);
            }
        });
    }

    private setupEventHandlers() {
        if (!this.socket) return;

        this.socket.on('transfer-started', (data) => {
            console.log('Transfer started:', data);
        });

        this.socket.on('chunk-received', (data) => {
            console.log('Chunk received:', data);
        });

        this.socket.on('transfer-complete', (data) => {
            console.log('Transfer complete:', data);
        });
    }

    async sendFile(file: File): Promise<void> {
        if (!this.socket) {
            throw new Error('Not connected to server');
        }

        // 发送文件开始传输信号
        this.socket.emit('start-transfer', {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type
        });

        // 分块读取并发送文件
        const totalChunks = Math.ceil(file.size / this.chunkSize);

        for (let i = 0; i < totalChunks; i++) {
            const start = i * this.chunkSize;
            const end = Math.min(start + this.chunkSize, file.size);
            const chunk = file.slice(start, end);

            // 将文件块转换为ArrayBuffer
            const arrayBuffer = await chunk.arrayBuffer();

            // 发送文件块
            this.socket.emit('file-chunk', {
                chunkIndex: i,
                totalChunks: totalChunks,
                data: arrayBuffer
            });
        }

        // 发送传输完成信号
        this.socket.emit('transfer-complete', {
            fileName: file.name,
            fileSize: file.size
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
} 