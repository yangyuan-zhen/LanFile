export interface NetworkAPI {
    startDiscovery: () => void;
    stopDiscovery: () => void;
    on: (event: string, callback: (device: any) => void) => void;
    removeListener: (event: string, callback: (device: any) => void) => void;
} 