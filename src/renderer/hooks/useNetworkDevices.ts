import { useState, useEffect, useCallback, useRef } from "react";
import { Monitor, Smartphone, Laptop, Tablet } from "lucide-react";
import { useNetworkInfo } from "./useNetworkInfo";
import { useDeviceInfo } from "./useDeviceInfo";

const DEVICE_CACHE_KEY = "lanfile_cached_devices";
const DEVICE_NAME_MAP_KEY = "lanfile_device_name_map";
const DISCOVERED_DEVICES_KEY = "lanfile_discovered_devices";

export interface NetworkDevice {
    name: string;
    type: DeviceType;
    icon: React.ComponentType;
    status: DeviceStatus;
    ip: string;
    port: number;
    lastSeen?: number;
}

type DeviceType = 'mobile' | 'tablet' | 'laptop' | 'desktop';
type DeviceStatus = '在线' | '离线' | '扫描中' | '检测中';

const getDeviceIcon = (type: DeviceType): React.ComponentType => {
    const iconMap: Record<DeviceType, React.ComponentType> = {
        mobile: Smartphone,
        tablet: Tablet,
        laptop: Laptop,
        desktop: Monitor
    };
    return iconMap[type] || Monitor;
};

const loadCachedDevices = (): NetworkDevice[] => {
    try {
        const cachedDevicesJson = localStorage.getItem(DEVICE_CACHE_KEY);
        if (cachedDevicesJson) {
            const devices = JSON.parse(cachedDevicesJson);
            console.log('从缓存加载设备列表:', devices.length, '个设备');

            return devices.map((device: any) => ({
                ...device,
                icon: getDeviceIcon(device.type),
                status: device.status as DeviceStatus,
                lastSeen: device.lastSeen || Date.now()
            }));
        }
    } catch (error) {
        console.error('加载缓存设备失败:', error);
    }
    return [];
};

const saveDevicesToCache = (devices: NetworkDevice[]) => {
    try {
        const serializableDevices = devices.map(device => ({
            name: device.name,
            type: device.type,
            status: device.status,
            ip: device.ip,
            port: device.port,
            lastSeen: device.lastSeen || Date.now()
        }));

        localStorage.setItem(DEVICE_CACHE_KEY, JSON.stringify(serializableDevices));
        console.log('已保存', devices.length, '个设备到缓存');
    } catch (error) {
        console.error('保存设备到缓存失败:', error);
    }
};

const loadDeviceNameMap = (): Record<string, string> => {
    try {
        const nameMapJson = localStorage.getItem(DEVICE_NAME_MAP_KEY);
        if (nameMapJson) {
            return JSON.parse(nameMapJson);
        }
    } catch (error) {
        console.error('加载设备名称映射失败:', error);
    }
    return {};
};

const saveDeviceNameMap = (map: Record<string, string>) => {
    try {
        localStorage.setItem(DEVICE_NAME_MAP_KEY, JSON.stringify(map));
        console.log('设备名称映射已保存');
    } catch (error) {
        console.error('保存设备名称映射失败:', error);
    }
};

const saveDiscoveredDevices = (devices: NetworkDevice[]) => {
    try {
        localStorage.setItem(DISCOVERED_DEVICES_KEY, JSON.stringify(devices));
    } catch (error) {
        console.error('保存已发现设备失败:', error);
    }
};

const loadDiscoveredDevices = (): NetworkDevice[] => {
    try {
        const devicesJson = localStorage.getItem(DISCOVERED_DEVICES_KEY);
        if (devicesJson) {
            return JSON.parse(devicesJson);
        }
    } catch (error) {
        console.error('加载已发现设备失败:', error);
    }
    return [];
};

const isValidIPv4 = (ip: string): boolean => {
    if (!ip) return false;
    if (ip.includes(':')) return false;
    const ipv4Regex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/;
    return ipv4Regex.test(ip);
};

export const useNetworkDevices = () => {
    const [devices, setDevices] = useState<NetworkDevice[]>([]);
    const deviceInfo = useDeviceInfo();
    const [networkInfo, setNetworkInfo] = useState<{ ip?: string; type?: string }>({});
    const [isScanning, setIsScanning] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [deviceNameMap, setDeviceNameMap] = useState<Record<string, string>>(loadDeviceNameMap());

    const statusCheckIntervalRef = useRef<NodeJS.Timeout>();
    const scanTimeoutRef = useRef<NodeJS.Timeout>();

    useEffect(() => {
        try {
            const cachedDevices = loadCachedDevices();
            if (cachedDevices.length > 0) {
                setDevices(cachedDevices);
            }
            setIsInitialized(true);
        } catch (error) {
            console.error('初始化设备列表失败:', error);
            setIsInitialized(true);
        }
    }, []);

    useEffect(() => {
        if (isInitialized && devices.length > 0) {
            saveDevicesToCache(devices);
        }
    }, [devices, isInitialized]);

    useEffect(() => {
        const updateNetworkInfo = async () => {
            try {
                const info = await window.electron.invoke('system:getNetworkInfo');
                console.log('获取到网络信息:', info);

                if (info) {
                    if (info.ip && info.ip.includes(':')) {
                        console.log('检测到IPv6地址，尝试使用IPv4地址');
                        if (info.ipv4) {
                            info.ip = info.ipv4;
                        }
                    }

                    if (info.ip && !info.ip.includes(':')) {
                        setNetworkInfo(info);
                    } else {
                        console.warn('未找到有效的IPv4地址:', info);
                    }
                }
            } catch (error) {
                console.error('获取网络信息失败:', error);
            }
        };

        updateNetworkInfo();
        const interval = setInterval(updateNetworkInfo, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!isInitialized || !networkInfo.ip || !deviceInfo.currentDevice.name) {
            return;
        }

        console.log('更新本机设备信息:', {
            deviceName: deviceInfo.currentDevice.name,
            networkIP: networkInfo.ip
        });

        const localDevice: NetworkDevice = {
            name: deviceInfo.currentDevice.name,
            type: "desktop" as DeviceType,
            icon: Monitor,
            status: "在线" as DeviceStatus,
            ip: networkInfo.ip,
            port: 12345,
            lastSeen: Date.now()
        };

        setDevices(prev => {
            const localDeviceIndex = prev.findIndex(d => d.ip === networkInfo.ip);
            if (localDeviceIndex >= 0) {
                const updatedDevices = [...prev];
                updatedDevices[localDeviceIndex] = localDevice;
                console.log('设置设备列表，之前:', devices.length, '个，现在:', updatedDevices.length, '个');
                return updatedDevices;
            } else {
                console.log('设置设备列表，之前:', devices.length, '个，现在:', [localDevice, ...prev].length, '个');
                return [localDevice, ...prev];
            }
        });

        startScan();
    }, [isInitialized, deviceInfo.currentDevice.name, networkInfo.ip]);

    useEffect(() => {
        const handleLocalDeviceNameUpdate = (data: any) => {
            console.log('收到本机设备名称更新:', data);

            if (!data) {
                console.error('收到无效的本机设备名称更新数据');
                return;
            }

            setDevices(prev => prev.map(device => {
                if (typeof data === 'object' && data.deviceIp) {
                    if (device.ip === data.deviceIp) {
                        console.log(`更新本机设备名称: IP=${data.deviceIp}, ${device.name} -> ${data.newName}`);
                        return {
                            ...device,
                            name: data.newName,
                            status: "在线",
                            lastSeen: Date.now()
                        };
                    }
                }
                else if (typeof data === 'string' && device.ip === networkInfo.ip) {
                    return {
                        ...device,
                        name: data,
                        status: "在线",
                        lastSeen: Date.now()
                    };
                }
                return device;
            }));

            if (typeof data === 'object' && data.deviceIp) {
                updateDeviceNameMap(data.deviceIp, data.newName);
            } else if (typeof data === 'string' && networkInfo.ip) {
                updateDeviceNameMap(networkInfo.ip, data);
            }
        };

        const handleRemoteDeviceNameUpdate = (data: any) => {
            console.log('收到远程设备名称更新:', data);

            if (!data || !data.deviceIp || !data.oldName || !data.newName) {
                console.error('收到无效的远程设备名称更新数据:', data);
                return;
            }

            setDevices(prev => prev.map(device => {
                if (device.ip === data.deviceIp && device.name === data.oldName) {
                    console.log(`更新远程设备名称: IP=${data.deviceIp}, ${data.oldName} -> ${data.newName}`);
                    return {
                        ...device,
                        name: data.newName,
                        lastSeen: Date.now()
                    };
                }
                return device;
            }));

            if (data?.deviceIp && data.newName) {
                updateDeviceNameMap(data.deviceIp, data.newName);
            }
        };

        window.electron.on('system:deviceNameChanged', handleLocalDeviceNameUpdate);
        window.electron.on('system:remoteDeviceNameChanged', handleRemoteDeviceNameUpdate);

        return () => {
            window.electron.off('system:deviceNameChanged', handleLocalDeviceNameUpdate);
            window.electron.off('system:remoteDeviceNameChanged', handleRemoteDeviceNameUpdate);
        };
    }, [networkInfo.ip]);

    const handleDeviceFound = async (device: any) => {
        if (!device || !device.name) {
            console.error('接收到无效设备数据:', device);
            return;
        }

        console.log('【设备发现】收到设备数据:', device);

        const ipv4Addresses = device.addresses?.filter(isValidIPv4) || [];
        if (ipv4Addresses.length === 0) {
            console.log(`设备 ${device.name} 没有有效的IPv4地址，已忽略`);
            return;
        }

        const ipAddress = ipv4Addresses[0];
        const timestamp = Date.now();

        // 立即检查新发现设备的状态
        const deviceStatus = await checkDeviceStatus({
            name: device.name,
            type: (device.type || "desktop") as DeviceType,
            icon: getDeviceIcon((device.type || "desktop") as DeviceType),
            status: "检测中" as DeviceStatus,
            ip: ipAddress,
            port: device.port || 0,
            lastSeen: timestamp
        });

        setDevices(prev => {
            const existingDeviceIndex = prev.findIndex(d => d.ip === ipAddress);
            const customName = deviceNameMap[ipAddress];

            if (existingDeviceIndex >= 0) {
                return prev.map((d, index) =>
                    index === existingDeviceIndex
                        ? {
                            ...deviceStatus,
                            name: customName || d.name,
                        }
                        : d
                );
            } else {
                return [...prev, {
                    ...deviceStatus,
                    name: customName || device.name,
                }];
            }
        });
    };

    const handleDeviceLeft = (device: any) => {
        if (!device || !device.name) {
            console.error('接收到无效设备离开数据:', device);
            return;
        }

        console.log('【设备离开】:', device);

        setDevices(prev => {
            return prev.map(d => {
                if (d.ip === device.addresses[0]) {
                    return {
                        ...d,
                        status: "离线",
                        lastSeen: Date.now()
                    };
                }
                return d;
            });
        });
    };

    useEffect(() => {
        console.log('设置 MDNS 事件监听器');

        const deviceFoundHandler = (device: any) => {
            console.log('收到 mdns:deviceFound 事件:', device ? JSON.stringify(device) : 'undefined');
            if (device) {
                handleDeviceFound(device);
            }
        };

        window.electron.on('mdns:deviceFound', deviceFoundHandler);
        window.electron.on('mdns:deviceLeft', handleDeviceLeft);

        return () => {
            window.electron.off('mdns:deviceFound', deviceFoundHandler);
            window.electron.off('mdns:deviceLeft', handleDeviceLeft);
        };
    }, [networkInfo.ip, deviceNameMap]);

    useEffect(() => {
        if (Object.keys(deviceNameMap).length > 0 && devices.length > 0) {
            setDevices(prev =>
                prev.map(device => {
                    const customName = deviceNameMap[device.ip];
                    if (customName && device.name !== customName) {
                        console.log(`应用自定义名称: ${device.name} -> ${customName}`);
                        return { ...device, name: customName };
                    }
                    return device;
                })
            );
        }
    }, [deviceNameMap]);

    const applySavedNames = () => {
        setDevices(prev =>
            prev.map(device => {
                const customName = deviceNameMap[device.ip];
                if (customName) {
                    return { ...device, name: customName };
                }
                return device;
            })
        );
    };

    const startScan = useCallback(() => {
        setIsScanning(true);
        console.log('开始扫描网络设备...');

        if (scanTimeoutRef.current) {
            clearTimeout(scanTimeoutRef.current);
        }

        setDevices(prev => prev.map(d =>
            d.ip === networkInfo.ip
                ? d
                : { ...d, status: "扫描中" }
        ));

        window.electron.invoke('mdns:startDiscovery')
            .then(() => console.log('MDNS发现服务已启动'))
            .catch(err => console.error('启动MDNS发现服务失败:', err));

        scanTimeoutRef.current = setTimeout(() => {
            window.electron.invoke('mdns:stopDiscovery')
                .then(() => {
                    console.log('MDNS发现服务已停止');
                    applySavedNames();
                    checkAllDevicesStatus();
                })
                .catch(err => console.error('停止MDNS发现服务失败:', err))
                .finally(() => setIsScanning(false));
        }, 5000);
    }, [networkInfo.ip]);

    useEffect(() => {
        return () => {
            if (statusCheckIntervalRef.current) {
                clearInterval(statusCheckIntervalRef.current);
            }
            if (scanTimeoutRef.current) {
                clearTimeout(scanTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        checkAllDevicesStatus();

        statusCheckIntervalRef.current = setInterval(() => {
            console.log("定期检查设备状态...");
            checkAllDevicesStatus();
        }, 30000);

        return () => {
            if (statusCheckIntervalRef.current) {
                clearInterval(statusCheckIntervalRef.current);
            }
        };
    }, [networkInfo.ip]);

    const clearDeviceCache = () => {
        localStorage.removeItem(DEVICE_CACHE_KEY);
        localStorage.removeItem(DISCOVERED_DEVICES_KEY);
        setDevices([]);
    };

    const checkDeviceStatus = async (device: NetworkDevice) => {
        try {
            if (device.ip === networkInfo.ip) {
                return {
                    ...device,
                    status: "在线" as DeviceStatus,
                    lastSeen: Date.now()
                };
            }

            // 使用心跳服务检测
            try {
                const heartbeatPort = await window.electron.invoke('heartbeat:getPort');
                const response = await fetch(`http://${device.ip}:${heartbeatPort}/lanfile/status`, {
                    signal: AbortSignal.timeout(5000)  // 5秒超时
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.status === 'online') {
                        return {
                            ...device,
                            status: "在线" as DeviceStatus,
                            lastSeen: Date.now()
                        };
                    }
                }

                return {
                    ...device,
                    status: "离线" as DeviceStatus
                };
            } catch (err) {
                console.log(`设备 ${device.name} (${device.ip}) 心跳检测失败:`, err);
                return {
                    ...device,
                    status: "离线" as DeviceStatus
                };
            }
        } catch (error) {
            console.error(`检查设备 ${device.name} (${device.ip}) 状态失败:`, error);
            return {
                ...device,
                status: "离线" as DeviceStatus
            };
        }
    };

    const checkAllDevicesStatus = async () => {
        console.log('开始检查所有设备状态，当前设备数量:', devices.length);

        if (devices.length === 0) {
            console.log('设备列表为空，无需检查状态');
            return;
        }

        try {
            const deviceCheckPromises = devices.map(device => checkDeviceStatus(device));
            const updatedDevices = await Promise.all(deviceCheckPromises);

            // 确保设备不会从列表中消失，只会改变状态
            if (updatedDevices.length < devices.length) {
                console.warn(`警告: 设备数量减少 ${devices.length} -> ${updatedDevices.length}`);
            }

            setDevices(updatedDevices);
            setTimeout(applySavedNames, 100);
        } catch (error) {
            console.error('检查设备状态整体过程出错:', error);
        }
    };

    const updateDeviceNameMap = (ip: string, name: string) => {
        setDeviceNameMap(prev => {
            const newMap = { ...prev, [ip]: name };
            saveDeviceNameMap(newMap);
            return newMap;
        });
    };

    const handleNameChange = async (device: NetworkDevice, newName: string) => {
        if (newName && newName !== device.name) {
            try {
                await window.electron.invoke("system:setDeviceName", {
                    deviceIp: device.ip,
                    oldName: device.name,
                    newName: newName,
                });

                setDevices(prev =>
                    prev.map(d =>
                        d.ip === device.ip && d.name === device.name
                            ? { ...d, name: newName }
                            : d
                    )
                );

                updateDeviceNameMap(device.ip, newName);

                console.log(`设备名称已更新 - IP: ${device.ip}, 新名称: ${newName}`);
            } catch (error) {
                console.error("修改设备名称失败:", error);
            }
        }
    };

    useEffect(() => {
        // 每30秒检查一次所有设备状态
        const statusCheckInterval = setInterval(() => {
            if (devices.length > 0) {
                checkAllDevicesStatus();
            }
        }, 30000);  // 30秒

        return () => clearInterval(statusCheckInterval);
    }, [devices.length]);

    return {
        devices,
        setDevices,
        startScan,
        isScanning,
        checkAllDevicesStatus,
        clearDeviceCache,
        handleNameChange,
        deviceNameMap
    };
}; 