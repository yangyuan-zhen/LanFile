export interface IElectronAPI {
    invoke(channel: 'heartbeat:getPort'): Promise<number>;
    invoke(channel: 'heartbeat:setPort', port: number): Promise<void>;
    invoke(channel: 'settings:getDownloadPath'): Promise<string>;
    invoke(channel: 'settings:setDownloadPath', path: string): Promise<void>;
    invoke(channel: 'settings:setPort', port: number): Promise<void>;
    invoke(channel: 'settings:setHeartbeatType', type: string): Promise<void>;
    invoke(channel: 'dialog:openDirectory'): Promise<Electron.OpenDialogReturnValue>;
    invoke(channel: 'network:pingDevice', ip: string, port?: number): Promise<boolean>;
    invoke(channel: 'system:getNetworkInfo'): Promise<any>;
    invoke(channel: 'system:getDeviceName'): Promise<string>;
    invoke(channel: 'mdns:startDiscovery'): Promise<void>;
    invoke(channel: 'webrtc:initialize'): Promise<void>;
    invoke(channel: 'webrtc:sendIceCandidate', data: { toPeerId: string, candidate: RTCIceCandidate }): Promise<void>;
    invoke(channel: 'webrtc:sendOffer', data: { toPeerId: string, offer: RTCSessionDescriptionInit }): Promise<void>;
    invoke(channel: 'webrtc:sendAnswer', data: { toPeerId: string, answer: RTCSessionDescriptionInit }): Promise<void>;
    invoke(channel: 'file:saveDownloadedFile', data: { url: string, fileName: string, fileType: string }): Promise<void>;
    invoke(channel: 'heartbeat:startUDPService', port?: number): Promise<void>;
    on(channel: string, listener: (...args: any[]) => void): void;
    off(channel: string, listener: (...args: any[]) => void): void;
}

export interface IElectronRemote {
    dialog: {
        showOpenDialog(options: Electron.OpenDialogOptions): Promise<Electron.OpenDialogReturnValue>;
    };
}

declare global {
    interface Window {
        electron: IElectronAPI;
        electronRemote: IElectronRemote;
    }
}

export interface NetworkDevice {
    id: string;
    name: string;
    ip: string;
    port?: number;
    type: string;
    online: boolean;
    icon?: any;
    status?: string;
    stableConnectionCount?: number;
    lastChecked?: number;
    isConnected?: boolean;
    lastSeen?: number;
} 