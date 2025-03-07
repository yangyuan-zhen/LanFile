import Bonjour from 'bonjour-service';
import { app } from 'electron';
import store from '../store';
import { networkInterfaces } from 'os';

export interface MDNSDevice {
    name: string;
    host: string;
    addresses: string[];
    port: number;
    type: string;
    status: 'online';
}

class MDNSService {
    private bonjour: any;
    private service: any = null;
    private browser: any = null;
    private eventListeners: { [key: string]: Function[] } = {};
    private SERVICE_TYPE = '_lanfile._tcp.local';
    private SERVICE_PORT = 8898; // 可以在设置中配置或随机生成

    constructor() {
        this.bonjour = new Bonjour();
        this.eventListeners = {
            'deviceFound': [],
            'deviceLeft': []
        };
    }

    // 获取当前设备IP地址
    private getLocalIP(): string | null {
        const interfaces = networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name] || []) {
                // 跳过内部地址和非IPv4地址
                if (!iface.internal && iface.family === 'IPv4') {
                    return iface.address;
                }
            }
        }
        return null;
    }

    // 注册本设备服务
    public publishService(): void {
        try {
            // 从存储中获取设备名称
            const deviceName = store.get('deviceName');
            const localIP = this.getLocalIP();

            if (!localIP) {
                console.error('无法获取本机IP地址');
                return;
            }

            // 发布服务，宣告本设备存在
            this.service = this.bonjour.publish({
                name: deviceName,
                type: this.SERVICE_TYPE,
                port: this.SERVICE_PORT,
                txt: {
                    appVersion: app.getVersion(),
                    deviceType: 'desktop', // 可根据实际设备类型设置
                    os: process.platform
                }
            });

            console.log(`已发布mDNS服务: ${deviceName} at ${localIP}:${this.SERVICE_PORT}`);
        } catch (error) {
            console.error('发布mDNS服务失败:', error);
        }
    }

    // 取消发布服务
    public unpublishService(): void {
        if (this.service) {
            this.service.stop();
            this.service = null;
            console.log('已停止mDNS服务发布');
        }
    }

    // 开始发现局域网内其他设备
    public startDiscovery(): void {
        try {
            if (this.browser) {
                this.browser.stop();
            }

            // 开始浏览指定类型的服务
            this.browser = this.bonjour.find({ type: this.SERVICE_TYPE });

            // 当发现服务时触发
            this.browser.on('up', (service: any) => {
                console.log('发现设备:', service.name, service.addresses);

                const device: MDNSDevice = {
                    name: service.name,
                    host: service.host,
                    addresses: service.addresses,
                    port: service.port,
                    type: service.txt?.deviceType || 'unknown',
                    status: 'online'
                };

                // 触发设备发现事件
                this.emit('deviceFound', device);
            });

            // 当服务离线时触发
            this.browser.on('down', (service: any) => {
                console.log('设备离线:', service.name);
                const device: MDNSDevice = {
                    name: service.name,
                    host: service.host,
                    addresses: service.addresses,
                    port: service.port,
                    type: service.txt?.deviceType || 'unknown',
                    status: 'online'
                };

                this.emit('deviceLeft', device);
            });

            console.log('开始mDNS设备发现');
        } catch (error) {
            console.error('开始设备发现失败:', error);
        }
    }

    // 停止发现设备
    public stopDiscovery(): void {
        if (this.browser) {
            this.browser.stop();
            this.browser = null;
            console.log('已停止mDNS设备发现');
        }
    }

    // 事件处理
    public on(event: string, callback: Function): void {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    public off(event: string, callback: Function): void {
        if (!this.eventListeners[event]) return;
        this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
    }

    private emit(event: string, ...args: any[]): void {
        if (!this.eventListeners[event]) return;
        this.eventListeners[event].forEach(callback => callback(...args));
    }

    // 清理资源
    public destroy(): void {
        this.stopDiscovery();
        this.unpublishService();
        this.bonjour.destroy();
        this.eventListeners = {};
    }
}

export default new MDNSService(); 