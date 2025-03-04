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
        this.setupIpcListeners();
    }

    private setupIpcListeners() {
        // 监听来自主进程的设备发现事件
        window.electron.on('zeroconf:deviceFound', (device: Device) => {
            this.emit('deviceFound', device);
        });
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
        window.electron.invoke('zeroconf:startScan');
    }

    public stopScan(): void {
        if (!this.isScanning) return;
        this.isScanning = false;
        window.electron.invoke('zeroconf:stopScan');
    }

    public publishService(port: number): void {
        window.electron.invoke('zeroconf:publishService', port);
    }

    public unpublishService(): void {
        window.electron.invoke('zeroconf:unpublishService');
    }
}

export const zeroconfService = ZeroconfService.getInstance(); 