export interface Device {
    id: string;
    name: string;
    ip: string;
    port: number;
}

declare global {
    interface Window {
        electron: {
            test: {
                ping: () => string;
            };
            network: {
                getLocalService: () => Promise<Device>;
                onDeviceFound: (callback: (device: Device) => void) => () => void;
                onDeviceLeft: (callback: (device: Device) => void) => () => void;
            };
        };
    }
} 