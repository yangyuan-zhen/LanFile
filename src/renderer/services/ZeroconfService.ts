import { EventEmitter } from 'events';

export interface Device {
    name: string;
    host: string;
    port: number;
    addresses: string[];
    connectionStatus?: 'available' | 'connecting' | 'connected' | 'failed';
    lastError?: string;
}

class ZeroconfService extends EventEmitter {
    private static instance: ZeroconfService;
    private isScanning: boolean = false;
    private knownDevices: Map<string, Device> = new Map();

    private constructor() {
        super();
        this.setupIpcListeners();
    }

    private setupIpcListeners() {
        window.electron.on('zeroconf:deviceFound', (device: Device) => {
            this.knownDevices.set(device.host, device);
            this.emit('deviceFound', device);
        });

        window.electron.on('network:statusChange', (status: any) => {
            this.emit('networkStatusChange', status);
        });
    }

    public updateDeviceStatus(host: string, status: Device['connectionStatus'], error?: string): void {
        const device = this.knownDevices.get(host);
        if (device) {
            device.connectionStatus = status;
            device.lastError = error;
            this.knownDevices.set(host, device);
            this.emit('deviceStatusChange', device);
        }
    }

    public async checkDeviceConnectivity(host: string): Promise<{ reachable: boolean, natType?: string }> {
        try {
            const pingResult = await window.electron.invoke('network:pingDevice', host);

            const signalingPortTest = await window.electron.invoke('network:testTcpPort', host, 8080);

            return {
                reachable: pingResult.success || signalingPortTest.success,
                natType: await this.detectNatType()
            };
        } catch (error) {
            console.error(`设备连接性检查失败: ${host}`, error);
            return { reachable: false };
        }
    }

    private async detectNatType(): Promise<string> {
        try {
            const pc = new RTCPeerConnection({
                iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
            });

            let natType = "未知";

            return new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    pc.close();
                    resolve(natType);
                }, 5000);

                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        const candidate = event.candidate.candidate;
                        if (candidate.includes("srflx")) {
                            const parts = candidate.split(" ");
                            if (parts[4] === parts[5]) {
                                natType = "无NAT (公网IP)";
                            } else {
                                natType = "NAT后 (需要穿透)";
                            }
                            clearTimeout(timeout);
                            pc.close();
                            resolve(natType);
                        }
                    }
                };

                pc.createDataChannel("nat-test");
                pc.createOffer().then(offer => pc.setLocalDescription(offer));
            });
        } catch (error) {
            console.error("NAT检测失败:", error);
            return "检测失败";
        }
    }

    public getDeviceInfo(host: string): Device | undefined {
        return this.knownDevices.get(host);
    }

    public getAllDevices(): Device[] {
        return Array.from(this.knownDevices.values());
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

    public async testUdpConnectivity(host: string): Promise<boolean> {
        try {
            // 测试常见WebRTC使用的UDP端口
            const udpPorts = [19302, 3478, 8080];

            for (const port of udpPorts) {
                const result = await window.electron.invoke('network:testUdpPort', host, port);
                if (result.success) {
                    return true;
                }
            }

            return false;
        } catch (error) {
            console.error(`UDP连接性检查失败: ${host}`, error);
            return false;
        }
    }

    public async checkFullConnectivity(host: string): Promise<{
        tcp: boolean,
        udp: boolean,
        natType: string,
        recommendations: string[]
    }> {
        const tcpResult = await this.checkDeviceConnectivity(host);
        const udpResult = await this.testUdpConnectivity(host);
        const natType = await this.detectNatType();

        const recommendations: string[] = [];

        if (!tcpResult.reachable) {
            recommendations.push('检查设备间基本网络连接和防火墙TCP设置');
        }

        if (!udpResult) {
            recommendations.push('UDP连接受阻，检查防火墙是否允许UDP通信');
            recommendations.push('考虑启用TURN服务器作为备选连接方式');
        }

        if (natType.includes('NAT后')) {
            recommendations.push('设备在NAT后，可能需要STUN/TURN服务进行穿透');
        }

        return {
            tcp: tcpResult.reachable,
            udp: udpResult,
            natType,
            recommendations
        };
    }

    public static getInstance(): ZeroconfService {
        if (!ZeroconfService.instance) {
            ZeroconfService.instance = new ZeroconfService();
        }
        return ZeroconfService.instance;
    }
}

export const zeroconfService = ZeroconfService.getInstance(); 