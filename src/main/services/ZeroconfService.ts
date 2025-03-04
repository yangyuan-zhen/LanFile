import { EventEmitter } from 'events';

export interface Device {
    name: string;
    host: string;
    port: number;
    addresses: string[];
}

class ZeroconfService extends EventEmitter {
    private static instance: ZeroconfService;
    private isScanning: boolean = false;

    private constructor() {
        super();
    }

    public static getInstance(): ZeroconfService {
        if (!ZeroconfService.instance) {
            ZeroconfService.instance = new ZeroconfService();
        }
        return ZeroconfService.instance;
    }

    public startScan(): void {
        if (this.isScanning) return;
        this.isScanning = true;
        // 使用 NetworkService 进行实际的扫描
    }

    public stopScan(): void {
        if (!this.isScanning) return;
        this.isScanning = false;
    }

    public publishService(port: number): void {
        // 使用 NetworkService 发布服务
    }

    public unpublishService(): void {
        // 停止服务
    }
}

export const zeroconfService = ZeroconfService.getInstance(); 