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

declare global {
    interface Window {
        electron?: {
            network: NetworkAPI;
            test: {
                ping: () => string;
            };
        };
    }
} 