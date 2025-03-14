export interface Device {
    id: string;
    name: string;
    ip: string;
    port: number;
}

export interface NetworkAPI {
    getLocalService: () => Promise<Device>;
    startDiscovery: () => Promise<void>;
    stopDiscovery: () => Promise<void>;
    onDeviceFound: (callback: (device: Device) => void) => () => void;
    onDeviceLeft: (callback: (device: Device) => void) => () => void;
}

export interface NetworkDevice {
    id: string;
    name: string;
    ip: string;
    port?: number;
    type: string;
    online: boolean;
}

interface ElectronAPI {
    network: NetworkAPI;
    test: {
        ping: () => string;
    };
    invoke: (channel: string, ...args: any[]) => Promise<any>;
    on: (channel: string, callback: (...args: any[]) => void) => void;
    off: (channel: string, callback: (...args: any[]) => void) => void;
    http: {
        request: (options: {
            url: string;
            method?: string;
            headers?: Record<string, string>;
            body?: any;
        }) => Promise<{
            ok: boolean;
            status: number;
            data: any;
        }>;
    };
}

declare global {
    interface Window {
        electron: ElectronAPI;
    }
}

interface Window {
    electron: {
        invoke(channel: string, ...args: any[]): Promise<any>;
        on(channel: string, listener: (...args: any[]) => void): void;
        removeListener(channel: string, listener: (...args: any[]) => void): void;
        // 根据实际情况添加其他方法
    }
} 