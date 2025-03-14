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
    const [networkInfo, setNetworkInfo] = useState<{ ip?: string; type?: string; isConnected: boolean }>({ isConnected: false });
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

                if (info && info.isConnected && info.ip) {
                    if (info.ip.includes(':') && info.ipv4) {
                        info.ip = info.ipv4;
                    }

                    if (!info.ip.includes(':')) {
                        setNetworkInfo(info);
                        console.log('网络已连接:', info);
                    } else {
                        console.warn('未找到有效的IPv4地址:', info);
                    }
                } else {
                    setNetworkInfo({ ...info, type: 'none', isConnected: false });
                    console.log('网络未连接');
                }
            } catch (error) {
                console.error('获取网络信息失败:', error);
                setNetworkInfo({ type: 'none', ip: '', isConnected: false });
            }
        };

        updateNetworkInfo();
        const interval = setInterval(updateNetworkInfo, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // 确保本机设备始终存在且在线
        const ensureLocalDevice = () => {
            // 添加 IP 检查
            const currentIp = networkInfo.ip;
            if (!currentIp || !deviceInfo.currentDevice.name) return;

            setDevices(prev => {
                const localDeviceIndex = prev.findIndex(d => d.ip === currentIp);
                const localDevice: NetworkDevice = {  // 添加类型注解
                    name: deviceInfo.currentDevice.name,
                    type: "desktop",
                    icon: Monitor,
                    status: "在线",
                    ip: currentIp,  // 使用已验证的 IP
                    port: 12345,
                    lastSeen: Date.now()
                };

                if (localDeviceIndex === -1) {
                    return [localDevice, ...prev];
                } else {
                    const updatedDevices = [...prev];
                    updatedDevices[localDeviceIndex] = {
                        ...updatedDevices[localDeviceIndex],
                        status: "在线",
                        lastSeen: Date.now()
                    };
                    return updatedDevices;
                }
            });
        };

        // 立即执行一次
        ensureLocalDevice();

        // 设置定时器，每5秒检查一次
        const timer = setInterval(ensureLocalDevice, 5000);

        return () => clearInterval(timer);
    }, [networkInfo.ip, deviceInfo.currentDevice.name]);

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
            // 创建新的设备列表的副本，避免引用问题
            const updatedDevices = [...prev];
            const existingDeviceIndex = updatedDevices.findIndex(d => d.ip === ipAddress);
            const customName = deviceNameMap[ipAddress];

            // 合并设备信息而不是替换
            if (existingDeviceIndex >= 0) {
                updatedDevices[existingDeviceIndex] = {
                    ...updatedDevices[existingDeviceIndex],
                    ...deviceStatus,
                    name: customName || updatedDevices[existingDeviceIndex].name,
                    lastSeen: Date.now()
                };
                console.log(`更新现有设备: ${updatedDevices[existingDeviceIndex].name} (${ipAddress})`);
            } else {
                updatedDevices.push({
                    ...deviceStatus,
                    name: customName || device.name,
                });
                console.log(`添加新设备: ${customName || device.name} (${ipAddress})`);
            }

            // 每次设备列表变化时保存
            setTimeout(() => saveDevicesToCache(updatedDevices), 100);

            return updatedDevices;
        });
    };

    const handleDeviceLeft = (device: any) => {
        if (!device || !device.name) {
            console.error('接收到无效设备离开数据:', device);
            return;
        }

        console.log('【设备离开】:', device);

        // 仅更新状态，不从列表移除
        setDevices(prev => {
            const deviceToUpdate = prev.find(d => d.ip === device.addresses[0]);
            if (!deviceToUpdate) {
                console.log(`离开的设备不在列表中: ${device.name} (${device.addresses[0]})`);
                return prev;
            }

            console.log(`设备标记为离线: ${deviceToUpdate.name} (${deviceToUpdate.ip})`);
            return prev.map(d => {
                if (d.ip === device.addresses[0]) {
                    return {
                        ...d,
                        status: "离线" as DeviceStatus,
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

        setDevices(prev => {
            console.log('扫描前更新设备状态，当前数量:', prev.length);
            return prev.map(d =>
                d.ip === networkInfo.ip
                    ? d
                    : { ...d, status: "扫描中" }
            );
        });

        window.electron.invoke('mdns:startDiscovery')
            .then(() => console.log('MDNS发现服务已启动'))
            .catch((err: unknown) => console.error('启动MDNS发现服务失败:', err));

        scanTimeoutRef.current = setTimeout(() => {
            window.electron.invoke('mdns:stopDiscovery')
                .then(() => {
                    console.log('MDNS发现服务已停止');

                    // 保持已有设备，只更新状态和新设备
                    setDevices(currentDevices => {
                        console.log('扫描结束，当前设备数量:', currentDevices.length);

                        // 确保不会丢失之前发现的设备
                        const knownDevices = new Map();
                        currentDevices.forEach(device => {
                            knownDevices.set(device.ip, device);
                        });

                        // 合并新设备和已知设备
                        saveDevicesToCache(Array.from(knownDevices.values()));

                        // 检查所有设备状态
                        setTimeout(() => checkAllDevicesStatus(), 100);

                        return currentDevices;
                    });
                })
                .catch((err: Error) => console.error('停止MDNS发现服务失败:', err))
                .finally(() => setIsScanning(false));
        }, 5000);
    }, [networkInfo.ip]);

    useEffect(() => {
        // 使用一个标志记录是否是首次加载
        if (!isInitialized) {
            // 先尝试加载缓存的设备
            const cachedDevices = loadCachedDevices();
            if (cachedDevices.length > 0) {
                console.log('从缓存加载了', cachedDevices.length, '个设备');
                setDevices(cachedDevices);
            } else {
                console.log('缓存中没有设备，将开始扫描');
                // 如果没有缓存设备，才执行扫描
                startScan();
            }
            setIsInitialized(true);
        }
    }, []);

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
            // 如果是本机，始终返回在线状态
            if (device.ip === networkInfo.ip) {
                console.log('本机设备状态检查 - 始终在线');
                return {
                    ...device,
                    status: "在线" as DeviceStatus,
                    lastSeen: Date.now()
                };
            }

            // 检查网络连接状态
            if (!networkInfo.isConnected) {
                console.log('网络未连接，设备状态设置为离线');
                return {
                    ...device,
                    status: "离线" as DeviceStatus
                };
            }

            // 使用心跳服务检测其他设备
            try {
                const heartbeatPort = await window.electron.invoke('heartbeat:getPort');
                console.log(`检查设备状态: ${device.name} (${device.ip}:${heartbeatPort})`);

                const response = await window.electron.http.request({
                    url: `http://${device.ip}:${heartbeatPort}/lanfile/status`,
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                    },
                });

                if (response.ok && response.data.status === 'online') {
                    console.log(`设备 ${device.name} (${device.ip}) 在线`);
                    return {
                        ...device,
                        status: "在线" as DeviceStatus,
                        lastSeen: Date.now()
                    };
                }
            } catch (err) {
                console.log(`设备 ${device.name} (${device.ip}) 心跳检测失败:`, err);
            }

            return {
                ...device,
                status: "离线" as DeviceStatus
            };
        } catch (error) {
            console.error(`检查设备 ${device.name} (${device.ip}) 状态失败:`, error);
            // 如果是本机，即使发生错误也保持在线状态
            if (device.ip === networkInfo.ip) {
                return {
                    ...device,
                    status: "在线" as DeviceStatus,
                    lastSeen: Date.now()
                };
            }
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
            // 确保设备列表中包含本地设备
            const hasLocalDevice = devices.some(d => d.ip === networkInfo.ip);

            if (!hasLocalDevice && networkInfo.ip) {
                console.log('设备列表中缺少本地设备，正在添加...');
                const localDevice = {
                    name: deviceInfo.currentDevice.name,
                    type: "desktop" as DeviceType,
                    icon: Monitor,
                    status: "在线" as DeviceStatus,
                    ip: networkInfo.ip,
                    port: 12345,
                    lastSeen: Date.now()
                };

                setDevices(prev => [localDevice, ...prev]);
                return; // 添加后退出，下次检查会包含所有设备
            }

            // 对每个设备检查状态
            const updatedDevices = await Promise.all(
                devices.map(device => checkDeviceStatus(device))
            );

            // 打印详细日志
            console.log('状态检查完成:');
            updatedDevices.forEach(device => {
                console.log(`- ${device.name} (${device.ip}): ${device.status}`);
            });

            setDevices(updatedDevices);

            // 延迟应用自定义名称
            setTimeout(applySavedNames, 100);
        } catch (error) {
            console.error('检查设备状态过程出错:', error);
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