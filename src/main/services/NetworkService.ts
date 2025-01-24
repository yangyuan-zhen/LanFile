import { EventEmitter } from 'events';
import mdns from 'multicast-dns';
import { networkInterfaces } from 'os';
import { Device } from '../../renderer/types/electron';

const SERVICE_TYPE = '_lanfile._tcp.local';
const DISCOVERY_INTERVAL = 5000; // 5 seconds

export class NetworkService extends EventEmitter {
    private mdns: any;
    private localDevice: Device;
    private discoveryTimer: NodeJS.Timeout | null = null;
    private isDiscovering = false;

    constructor() {
        super();
        this.mdns = mdns();
        this.localDevice = this.createLocalDevice();

        // 监听 MDNS 响应
        this.mdns.on('response', (response: any) => {
            this.handleMdnsResponse(response);
        });
    }

    private createLocalDevice(): Device {
        const interfaces = networkInterfaces();
        let ipAddress = '';

        // 获取本机IP地址
        Object.values(interfaces).forEach((iface) => {
            if (!iface) return;
            iface.forEach((addr) => {
                if (addr.family === 'IPv4' && !addr.internal) {
                    ipAddress = addr.address;
                }
            });
        });

        return {
            id: `device_${Math.random().toString(36).substr(2, 9)}`,
            name: require('os').hostname(),
            ip: ipAddress,
            port: 27725, // 使用固定端口
        };
    }

    private handleMdnsResponse(response: any) {
        if (!this.isDiscovering) return;

        try {
            const answers = response.answers || [];
            const additionals = response.additionals || [];
            const allRecords = [...answers, ...additionals];

            const serviceRecord = allRecords.find(
                (record: any) => record.name === SERVICE_TYPE
            );

            if (serviceRecord) {
                const device: Device = {
                    id: serviceRecord.data.id || `device_${Math.random().toString(36).substr(2, 9)}`,
                    name: serviceRecord.data.name || 'Unknown Device',
                    ip: serviceRecord.data.ip || '',
                    port: serviceRecord.data.port || 27725,
                };

                this.emit('deviceFound', device);
            }
        } catch (error) {
            console.error('Error handling MDNS response:', error);
        }
    }

    public getLocalService(): Device {
        return this.localDevice;
    }

    public startDiscovery(): Promise<void> {
        return new Promise((resolve) => {
            if (this.isDiscovering) {
                resolve();
                return;
            }

            this.isDiscovering = true;

            try {
                // 广播本机服务
                const serviceData = {
                    answers: [{
                        name: SERVICE_TYPE,
                        type: 'PTR',
                        ttl: 300,
                        data: this.localDevice.name
                    }, {
                        name: this.localDevice.name,
                        type: 'SRV',
                        ttl: 300,
                        data: {
                            port: this.localDevice.port,
                            target: this.localDevice.name
                        }
                    }, {
                        name: this.localDevice.name,
                        type: 'TXT',
                        ttl: 300,
                        data: Buffer.from(JSON.stringify({
                            id: this.localDevice.id,
                            name: this.localDevice.name,
                            ip: this.localDevice.ip
                        }))
                    }]
                };

                // 发送查询
                this.mdns.query({
                    questions: [{
                        name: SERVICE_TYPE,
                        type: 'PTR'
                    }]
                });

                // 发布本机服务
                this.mdns.respond(serviceData);

                // 定期发送查询
                this.discoveryTimer = setInterval(() => {
                    this.mdns.query({
                        questions: [{
                            name: SERVICE_TYPE,
                            type: 'PTR'
                        }]
                    });
                }, DISCOVERY_INTERVAL);

                resolve();
            } catch (error) {
                console.error('Error starting discovery:', error);
                this.isDiscovering = false;
                resolve(); // 即使出错也resolve，避免卡住UI
            }
        });
    }

    public stopDiscovery(): Promise<void> {
        return new Promise((resolve) => {
            try {
                this.isDiscovering = false;
                if (this.discoveryTimer) {
                    clearInterval(this.discoveryTimer);
                    this.discoveryTimer = null;
                }
            } catch (error) {
                console.error('Error stopping discovery:', error);
            }
            resolve();
        });
    }

    public stop() {
        try {
            this.stopDiscovery();
            if (this.mdns) {
                this.mdns.destroy();
            }
        } catch (error) {
            console.error('Error stopping network service:', error);
        }
    }
} 