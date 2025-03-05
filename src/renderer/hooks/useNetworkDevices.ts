import { useState, useEffect } from "react";
import { Monitor, Smartphone, Laptop, Tablet } from "lucide-react";
import { useDeviceInfo } from "./useDeviceInfo";

export interface NetworkDevice {
    name: string;
    type: "desktop" | "mobile" | "laptop" | "tablet";
    icon: typeof Monitor | typeof Smartphone | typeof Laptop | typeof Tablet;
    status: "在线" | "离线";
    ip: string;
    port: number;
}

export const useNetworkDevices = () => {
    const [devices, setDevices] = useState<NetworkDevice[]>([]);
    const deviceInfo = useDeviceInfo();
    const [networkInfo, setNetworkInfo] = useState<{ ip?: string }>({});

    useEffect(() => {
        // 获取网络信息
        window.electron.invoke('system:getNetworkInfo').then((info) => {
            setNetworkInfo(info);
        });

        // 添加本机设备
        setDevices([{
            name: deviceInfo.currentDevice.name,
            type: "desktop",
            icon: Monitor,
            status: "在线",
            ip: networkInfo.ip || "获取中...",
            port: 12345
        }]);

        const handleDeviceFound = (device: any) => {
            setDevices(prev => {
                // 根据设备类型设置对应的图标
                const icon = getDeviceIcon(device.type);
                return [...prev, {
                    name: device.name,
                    type: device.type,
                    icon,
                    status: device.status === "online" ? "在线" : "离线",
                    ip: device.address,
                    port: device.port
                }];
            });
        };

        // 使用 window.electron.on 而不是 network.on
        window.electron.on('network:deviceFound', handleDeviceFound);
        window.electron?.network?.startDiscovery();

        // 监听设备名称更新
        const handleNameUpdate = (_event: any, { oldName, newName }: any) => {
            setDevices(prev => prev.map(device =>
                device.name === oldName
                    ? { ...device, name: newName }
                    : device
            ));
        };

        window.electron.on('device:nameUpdated', handleNameUpdate);

        return () => {
            window.electron?.network?.stopDiscovery();
            window.electron.off('network:deviceFound', handleDeviceFound);
            window.electron.off('device:nameUpdated', handleNameUpdate);
        };
    }, [deviceInfo, networkInfo.ip]);

    const getDeviceIcon = (type: string) => {
        switch (type) {
            case "desktop": return Monitor;
            case "mobile": return Smartphone;
            case "laptop": return Laptop;
            case "tablet": return Tablet;
            default: return Monitor;
        }
    };

    return devices;
}; 