import { EventEmitter } from 'events';
import dgram from 'dgram';

export interface NetworkDevice {
    name: string;
    address: string;
    port: number;
}

export class NetworkService extends EventEmitter {
    private socket: dgram.Socket | null = null;
    private isDiscovering: boolean = false;

    constructor() {
        super();
        this.setupSocket();
    }

    private setupSocket() {
        try {
            this.socket = dgram.createSocket('udp4');
            this.socket.on('message', this.handleMessage.bind(this));
            this.socket.on('error', this.handleError.bind(this));
            this.socket.bind(0);
        } catch (error) {
            console.error('Failed to setup UDP socket:', error);
        }
    }

    private handleMessage(msg: Buffer, rinfo: dgram.RemoteInfo) {
        try {
            const data = JSON.parse(msg.toString());
            if (data.type === 'lanfile-announce') {
                this.emit('deviceFound', {
                    name: data.name,
                    address: rinfo.address,
                    port: data.port
                });
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    }

    private handleError(error: Error) {
        console.error('UDP error:', error);
        this.emit('error', error);
    }

    public getLocalService() {
        return {
            name: 'LanFile Device',
            port: 12345
        };
    }

    public startDiscovery(): void {
        if (this.isDiscovering) return;
        this.isDiscovering = true;

        try {
            const message = Buffer.from(JSON.stringify({
                type: 'lanfile-discover'
            }));

            this.socket?.setBroadcast(true);
            this.socket?.send(message, 0, message.length, 12345, '255.255.255.255');
        } catch (error) {
            console.error('Failed to start discovery:', error);
        }
    }

    public stopDiscovery(): void {
        if (!this.isDiscovering) return;
        this.isDiscovering = false;
    }

    public stop() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }

    public publishService(port: number): void {
        try {
            const message = Buffer.from(JSON.stringify({
                type: 'lanfile-announce',
                name: 'LanFile Device',
                port: port
            }));
            this.socket?.setBroadcast(true);
            this.socket?.send(message, 0, message.length, 12345, '255.255.255.255');
        } catch (error) {
            console.error('Failed to publish service:', error);
        }
    }

    public unpublishService(): void {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }
} 