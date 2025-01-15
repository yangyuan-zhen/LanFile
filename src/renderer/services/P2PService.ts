import SimplePeer from 'simple-peer';

export interface FileInfo {
    name: string;
    size: number;
    type: string;
}

export class P2PService {
    private peer: SimplePeer.Instance | null = null;
    private chunkSize: number = 1024 * 1024; // 1MB chunks
    private onProgressCallback: ((progress: number) => void) | null = null;
    private onCompleteCallback: ((file: File) => void) | null = null;

    constructor() { }

    initiate(initiator: boolean): Promise<string> {
        return new Promise((resolve, reject) => {
            this.peer = new SimplePeer({
                initiator,
                trickle: false
            });

            this.peer.on('error', (err) => reject(err));

            this.peer.on('signal', (data) => {
                // 返回连接信息
                resolve(JSON.stringify(data));
            });

            this.setupDataHandlers();
        });
    }

    connect(signalData: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.peer) {
                reject(new Error('Peer not initialized'));
                return;
            }

            try {
                this.peer.signal(JSON.parse(signalData));
                this.peer.on('connect', () => resolve());
            } catch (err) {
                reject(err);
            }
        });
    }

    private setupDataHandlers() {
        if (!this.peer) return;

        let receivedChunks: ArrayBuffer[] = [];
        let currentFileInfo: FileInfo | null = null;

        this.peer.on('data', (data: ArrayBuffer) => {
            // 检查是否是文件信息
            if (typeof data === 'string') {
                try {
                    currentFileInfo = JSON.parse(data) as FileInfo;
                    receivedChunks = [];
                    return;
                } catch (e) {
                    console.error('Invalid file info:', e);
                }
            }

            // 处理文件块
            if (currentFileInfo) {
                receivedChunks.push(data);

                // 计算进度
                const receivedSize = receivedChunks.reduce((size, chunk) => size + chunk.byteLength, 0);
                const progress = (receivedSize / currentFileInfo.size) * 100;

                if (this.onProgressCallback) {
                    this.onProgressCallback(progress);
                }

                // 检查是否接收完成
                if (receivedSize >= currentFileInfo.size) {
                    const file = new File(receivedChunks, currentFileInfo.name, {
                        type: currentFileInfo.type
                    });

                    if (this.onCompleteCallback) {
                        this.onCompleteCallback(file);
                    }

                    // 重置状态
                    receivedChunks = [];
                    currentFileInfo = null;
                }
            }
        });
    }

    async sendFile(file: File): Promise<void> {
        if (!this.peer) {
            throw new Error('Peer not connected');
        }

        // 发送文件信息
        const fileInfo: FileInfo = {
            name: file.name,
            size: file.size,
            type: file.type
        };
        this.peer.send(JSON.stringify(fileInfo));

        // 分块发送文件
        const totalChunks = Math.ceil(file.size / this.chunkSize);

        for (let i = 0; i < totalChunks; i++) {
            const start = i * this.chunkSize;
            const end = Math.min(start + this.chunkSize, file.size);
            const chunk = file.slice(start, end);

            // 将文件块转换为ArrayBuffer
            const buffer = await chunk.arrayBuffer();
            this.peer.send(buffer);

            // 更新进度
            const progress = ((i + 1) / totalChunks) * 100;
            if (this.onProgressCallback) {
                this.onProgressCallback(progress);
            }
        }
    }

    onProgress(callback: (progress: number) => void) {
        this.onProgressCallback = callback;
    }

    onComplete(callback: (file: File) => void) {
        this.onCompleteCallback = callback;
    }

    destroy() {
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
    }
} 