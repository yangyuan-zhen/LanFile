import { useState, useEffect } from "react";
import { Monitor, Smartphone, Laptop, Tablet } from "lucide-react";
import { useDeviceInfo } from "./useDeviceInfo";

export interface NetworkDevice {
    name: string;
    type: string;
    icon: any;
    status: string;
    ip: string;
    port: number;
}

// 根据设备类型获取图标
const getDeviceIcon = (type: string) => {
    switch (type.toLowerCase()) {
        case "mobile":
        case "phone":
            return Smartphone;
        case "tablet":
        case "ipad":
            return Tablet;
        case "laptop":
            return Laptop;
        case "desktop":
        default:
            return Monitor;
    }
};

export const useNetworkDevices = () => {
    const [devices, setDevices] = useState<NetworkDevice[]>([]);
    const deviceInfo = useDeviceInfo();
    const [networkInfo, setNetworkInfo] = useState<{ ip?: string }>({});

    // 第一个 useEffect：获取网络信息并更新状态
    useEffect(() => {
        window.electron.invoke('system:getNetworkInfo').then((info) => {
            setNetworkInfo(info);
        });
    }, []);

    // 第二个 useEffect：当 deviceInfo 或 networkInfo 改变时更新本机设备
    useEffect(() => {
        // 创建新的本机设备对象
        const localDevice = {
            name: deviceInfo.currentDevice.name,
            type: "desktop",
            icon: Monitor,
            status: "在线",
            ip: networkInfo.ip || "获取中...",
            port: 12345
        };

        // 更新设备列表 - 使用更严格的查重逻辑
        setDevices(prev => {
            // 过滤掉所有本机设备（避免重复）
            const filteredDevices = prev.filter(d =>
                // 如果名称不同且IP也不同，则保留
                !(d.name.toLowerCase() === deviceInfo.currentDevice.name.toLowerCase() ||
                    (networkInfo.ip && d.ip === networkInfo.ip))
            );

            // 添加最新的本机设备
            return [localDevice, ...filteredDevices];
        });
    }, [deviceInfo, networkInfo]);

    // 处理MDNS发现的设备
    const handleDeviceFound = (device: any) => {
        console.log('发现设备:', device);

        // 防御性检查
        if (!device) return;

        // 排除本机设备 - 更严格的检查
        if (device.name === deviceInfo.currentDevice.name ||
            (device.addresses && device.addresses.some((addr: string) => addr === networkInfo.ip))) {
            console.log('忽略本机设备:', device.name);
            return;
        }

        setDevices(prev => {
            // 检查设备是否已经存在
            const existingDevice = prev.find(d =>
                d.name === device.name ||
                (device.addresses && device.addresses.length > 0 && d.ip === device.addresses[0])
            );

            if (existingDevice) {
                return prev.map(d =>
                    (d.name === device.name || (device.addresses && device.addresses.length > 0 && d.ip === device.addresses[0]))
                        ? {
                            ...d,
                            status: "在线",
                            ip: device.addresses && device.addresses.length > 0 ? device.addresses[0] : d.ip,
                            port: device.port || d.port
                        }
                        : d
                );
            }

            // 添加新设备
            const icon = getDeviceIcon(device.type || "unknown");
            return [...prev, {
                name: device.name || "未知设备",
                type: device.type || "unknown",
                icon,
                status: "在线",
                ip: device.addresses && device.addresses.length > 0 ? device.addresses[0] : "未知IP",
                port: device.port || 0
            }];
        });
    };

    // 处理设备离线
    const handleDeviceLeft = (device: any) => {
        console.log('设备离线:', device);

        // 防御性检查，确保 device 不为 undefined
        if (!device) {
            console.error('收到空设备离线数据');
            return;
        }

        setDevices(prev =>
            prev.map(d =>
                (d.name === device.name || (device.addresses && device.addresses.length > 0 && d.ip === device.addresses[0]))
                    ? { ...d, status: "离线" }
                    : d
            )
        );
    };

    // 第三个 useEffect：处理 MDNS 设备发现
    useEffect(() => {
        // 使用通用 on 方法代替 mdns 特定方法
        window.electron.on('mdns:deviceFound', (_event, device) => {
            handleDeviceFound(device);
        });
        window.electron.on('mdns:deviceLeft', handleDeviceLeft);

        // 使用 invoke 代替直接调用
        window.electron.invoke('mdns:startDiscovery');

        return () => {
            // 使用 off 取消事件监听
            window.electron.off('mdns:deviceFound', handleDeviceFound);
            window.electron.off('mdns:deviceLeft', handleDeviceLeft);
            window.electron.invoke('mdns:stopDiscovery');
        };
    }, [deviceInfo]); // 依赖于设备信息

    // 确保返回有效对象
    return { devices, setDevices };
}; 