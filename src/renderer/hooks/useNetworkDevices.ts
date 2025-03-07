import { useState, useEffect } from "react";
import { Monitor, Smartphone, Laptop, Tablet } from "lucide-react";
import { useDeviceInfo } from "./useDeviceInfo";

const DEVICE_CACHE_KEY = "lanfile_cached_devices";
const DEVICE_NAME_MAP_KEY = "lanfile_device_name_map";

export interface NetworkDevice {
    name: string;
    type: string;
    icon: any;
    status: string;
    ip: string;
    port: number;
    lastSeen?: number; // 添加最后一次在线时间戳
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

// 加载缓存的设备列表
const loadCachedDevices = (): NetworkDevice[] => {
    try {
        const cachedDevicesJson = localStorage.getItem(DEVICE_CACHE_KEY);
        if (cachedDevicesJson) {
            const devices = JSON.parse(cachedDevicesJson);
            console.log('从缓存加载设备列表:', devices.length, '个设备');

            // 恢复设备图标（因为图标组件不能被序列化）
            return devices.map((device: any) => ({
                ...device,
                icon: getDeviceIcon(device.type),
                status: device.status,
                lastSeen: device.lastSeen || Date.now()
            }));
        }
    } catch (error) {
        console.error('加载缓存设备失败:', error);
    }
    // 返回空数组，不会尝试创建默认设备
    return [];
};

// 保存设备列表到缓存
const saveDevicesToCache = (devices: NetworkDevice[]) => {
    try {
        // 创建一个可序列化的版本
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

// 加载设备名称映射
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

// 保存设备名称映射
const saveDeviceNameMap = (map: Record<string, string>) => {
    try {
        localStorage.setItem(DEVICE_NAME_MAP_KEY, JSON.stringify(map));
        console.log('设备名称映射已保存');
    } catch (error) {
        console.error('保存设备名称映射失败:', error);
    }
};

// 添加工具函数检查是否为有效的IPv4地址
const isValidIPv4 = (ip: string): boolean => {
    if (!ip) return false;
    // 如果包含冒号，可能是IPv6地址
    if (ip.includes(':')) return false;
    // 简单验证IPv4格式
    const ipv4Regex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/;
    return ipv4Regex.test(ip);
};

export const useNetworkDevices = () => {
    // 初始化时从缓存加载设备，但不自动创建设备
    const [devices, setDevices] = useState<NetworkDevice[]>([]);
    const deviceInfo = useDeviceInfo();
    const [networkInfo, setNetworkInfo] = useState<{ ip?: string; type?: string }>({});
    const [isScanning, setIsScanning] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [deviceNameMap, setDeviceNameMap] = useState<Record<string, string>>(loadDeviceNameMap());

    // 加载缓存的设备
    useEffect(() => {
        try {
            const cachedDevices = loadCachedDevices();
            if (cachedDevices.length > 0) {
                setDevices(cachedDevices);
            }
            setIsInitialized(true);
        } catch (error) {
            console.error('初始化设备列表失败:', error);
            setIsInitialized(true); // 即使失败也标记为已初始化
        }
    }, []);

    // 当设备列表变化且设备存在时保存到缓存
    useEffect(() => {
        if (isInitialized && devices.length > 0) {
            saveDevicesToCache(devices);
        }
    }, [devices, isInitialized]);

    // 第一个 useEffect：获取网络信息并更新状态
    useEffect(() => {
        const updateNetworkInfo = async () => {
            try {
                const info = await window.electron.invoke('system:getNetworkInfo');
                console.log('获取到网络信息:', info);

                // 确保优先使用IPv4地址
                if (info) {
                    // 如果IP地址看起来像IPv6地址，尝试使用备用地址
                    if (info.ip && info.ip.includes(':')) {
                        console.log('检测到IPv6地址，尝试使用IPv4地址');
                        // 尝试使用备用IPv4地址
                        if (info.ipv4) {
                            info.ip = info.ipv4;
                        }
                    }

                    // 确认有合法的IP地址
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
        // 每 5 秒更新一次网络信息
        const interval = setInterval(updateNetworkInfo, 5000);
        return () => clearInterval(interval);
    }, []);

    // 第二个 useEffect：当设备初始化完成后且网络和设备信息可用时，更新本机设备
    useEffect(() => {
        if (!isInitialized || !networkInfo.ip || !deviceInfo.currentDevice.name) {
            return; // 等待初始化和所有必要数据
        }

        console.log('更新本机设备信息:', {
            deviceName: deviceInfo.currentDevice.name,
            networkIP: networkInfo.ip
        });

        // 创建新的本机设备对象
        const localDevice = {
            name: deviceInfo.currentDevice.name,
            type: "desktop",
            icon: Monitor,
            status: "在线",
            ip: networkInfo.ip,
            port: 12345,
            lastSeen: Date.now()
        };

        // 更新设备列表 - 保留所有现有设备信息
        setDevices(prev => {
            // 查找并替换本机设备，如果不存在则添加
            const localDeviceIndex = prev.findIndex(d => d.ip === networkInfo.ip);
            if (localDeviceIndex >= 0) {
                // 替换现有本机设备
                const updatedDevices = [...prev];
                updatedDevices[localDeviceIndex] = localDevice;
                return updatedDevices;
            } else {
                // 添加新的本机设备
                return [localDevice, ...prev];
            }
        });

        // 立即开始扫描，发现其他设备
        startScan();
    }, [isInitialized, deviceInfo.currentDevice.name, networkInfo.ip]);

    // 监听设备名称更新事件
    useEffect(() => {
        // 处理本机设备名称更新
        const handleLocalDeviceNameUpdate = (data: any) => {
            console.log('收到本机设备名称更新:', data);

            if (!data) {
                console.error('收到无效的本机设备名称更新数据');
                return;
            }

            setDevices(prev => prev.map(device => {
                // 处理新格式：包含deviceIp, oldName, newName
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
                // 处理旧格式：只有字符串
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

            // 保存到名称映射
            if (typeof data === 'object' && data.deviceIp) {
                updateDeviceNameMap(data.deviceIp, data.newName);
            } else if (typeof data === 'string' && networkInfo.ip) {
                updateDeviceNameMap(networkInfo.ip, data);
            }
        };

        // 处理远程设备名称更新
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

            // 保存到名称映射
            if (data?.deviceIp && data.newName) {
                updateDeviceNameMap(data.deviceIp, data.newName);
            }
        };

        // 注册事件监听器
        window.electron.on('system:deviceNameChanged', handleLocalDeviceNameUpdate);
        window.electron.on('system:remoteDeviceNameChanged', handleRemoteDeviceNameUpdate);

        return () => {
            window.electron.off('system:deviceNameChanged', handleLocalDeviceNameUpdate);
            window.electron.off('system:remoteDeviceNameChanged', handleRemoteDeviceNameUpdate);
        };
    }, [networkInfo.ip]);

    // 处理MDNS发现的设备
    const handleDeviceFound = (device: any) => {
        if (!device || !device.name) {
            console.error('接收到无效设备数据:', device);
            return;
        }

        console.log('【设备发现】收到设备数据:', device);

        // 获取所有IPv4地址
        const ipv4Addresses = device.addresses?.filter(isValidIPv4) || [];

        // 如果没有有效的IPv4地址，忽略此设备
        if (ipv4Addresses.length === 0) {
            console.log(`设备 ${device.name} 没有有效的IPv4地址，已忽略`);
            return;
        }

        const ipAddress = ipv4Addresses[0];

        // 修改设备处理逻辑，确保不会丢失设备
        const timestamp = Date.now();
        console.log(`设备发现时间戳: ${timestamp}, IP: ${ipAddress}`);

        setDevices(prev => {
            // 设备是否已存在
            const existingDeviceIndex = prev.findIndex(d => d.ip === ipAddress);
            const customName = deviceNameMap[ipAddress];

            if (existingDeviceIndex >= 0) {
                // 更新现有设备，保留之前的名称
                return prev.map((d, index) =>
                    index === existingDeviceIndex
                        ? {
                            ...d,
                            name: customName || d.name, // 优先使用保存的名称
                            status: "在线",
                            lastSeen: timestamp
                        }
                        : d
                );
            } else {
                // 添加新设备
                return [...prev, {
                    name: customName || device.name,
                    type: device.type || "desktop",
                    icon: getDeviceIcon(device.type || "desktop"),
                    status: "在线",
                    ip: ipAddress,
                    port: device.port || 0,
                    lastSeen: timestamp
                }];
            }
        });
    };

    // 处理设备离线
    const handleDeviceLeft = (device: any) => {
        if (!device || !device.name) {
            console.error('接收到无效设备离开数据:', device);
            return;
        }

        console.log('【设备离开】:', device);

        setDevices(prev => {
            return prev.map(d => {
                if (d.ip === device.addresses[0]) {
                    // 设备离开时不移除，而是标记为离线
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

    // 第三个 useEffect：处理 MDNS
    useEffect(() => {
        console.log('设置 MDNS 事件监听器');

        // 修复事件监听函数，确保它接收到正确的参数
        const deviceFoundHandler = (device: any) => {
            console.log('收到 mdns:deviceFound 事件:', device ? JSON.stringify(device) : 'undefined');
            if (device) { // 确保数据有效
                handleDeviceFound(device);
            }
        };

        // 注册事件监听
        window.electron.on('mdns:deviceFound', deviceFoundHandler);
        window.electron.on('mdns:deviceLeft', handleDeviceLeft);

        return () => {
            window.electron.off('mdns:deviceFound', deviceFoundHandler);
            window.electron.off('mdns:deviceLeft', handleDeviceLeft);
        };
    }, [networkInfo.ip, deviceNameMap]);

    // 在 useNetworkDevices 函数内添加这个依赖项
    useEffect(() => {
        // 已有的设备与名称映射同步
        if (Object.keys(deviceNameMap).length > 0 && devices.length > 0) {
            // 检查所有设备是否需要应用自定义名称
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
    }, [deviceNameMap]); // 当名称映射变化时重新应用

    // 在每次扫描完成后，应用自定义名称
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

    // 扫描网络，发现设备
    const startScan = () => {
        setIsScanning(true);
        console.log('开始扫描网络设备...');

        // 标记所有非本机设备为"扫描中"状态
        setDevices(prev => prev.map(d =>
            d.ip === networkInfo.ip
                ? d
                : { ...d, status: "扫描中" }
        ));

        // 启动MDNS发现
        window.electron.invoke('mdns:startDiscovery')
            .then(() => {
                console.log('MDNS发现服务已启动');
            })
            .catch(err => {
                console.error('启动MDNS发现服务失败:', err);
            });

        // 5秒后自动停止扫描，但不清除设备列表
        setTimeout(() => {
            window.electron.invoke('mdns:stopDiscovery')
                .then(() => {
                    console.log('MDNS发现服务已停止');

                    // 扫描完成后应用自定义名称
                    applySavedNames();

                    // 然后再检查设备状态
                    checkAllDevicesStatus();
                })
                .catch(err => {
                    console.error('停止MDNS发现服务失败:', err);
                })
                .finally(() => {
                    setIsScanning(false);
                });
        }, 5000);
    };

    // 清除缓存方法
    const clearDeviceCache = () => {
        localStorage.removeItem(DEVICE_CACHE_KEY);
        setDevices([]);
    };

    // 检查设备在线状态的函数
    const checkDeviceStatus = async (device: NetworkDevice) => {
        try {
            // 如果是本机设备，直接返回在线状态
            if (device.ip === networkInfo.ip) {
                return {
                    ...device,
                    status: "在线",
                    lastSeen: Date.now()
                };
            }

            const isAlive = await window.electron.invoke('network:pingDevice', {
                ip: device.ip,
                port: device.port
            });

            return {
                ...device,
                status: isAlive ? "在线" : "离线",
                lastSeen: isAlive ? Date.now() : device.lastSeen
            };
        } catch (error) {
            console.error(`检查设备 ${device.name} (${device.ip}) 状态失败:`, error);
            return device;
        }
    };

    // 检查所有设备状态
    const checkAllDevicesStatus = async () => {
        console.log('开始检查所有设备状态，当前设备数量:', devices.length);

        if (devices.length === 0) {
            console.log('设备列表为空，无需检查状态');
            return;
        }

        try {
            // 为每个设备创建状态检查Promise
            const deviceCheckPromises = devices.map(async (device) => {
                // 如果是本机设备，直接返回在线状态
                if (device.ip === networkInfo.ip) {
                    console.log(`本机设备 ${device.name} (${device.ip}) 始终在线`);
                    return { ...device, status: "在线", lastSeen: Date.now() };
                }

                try {
                    // 尝试检查设备状态
                    console.log(`检查设备 ${device.name} (${device.ip}) 状态...`);
                    const isAlive = await window.electron.invoke('network:pingDevice', {
                        ip: device.ip,
                        port: device.port || 0
                    }).catch(() => false);

                    console.log(`设备 ${device.name} (${device.ip}) 状态检查结果: ${isAlive ? '在线' : '离线'}`);

                    // 总是保留设备，仅更新状态
                    return {
                        ...device,
                        status: isAlive ? "在线" : "离线",
                        lastSeen: isAlive ? Date.now() : device.lastSeen
                    };
                } catch (err) {
                    console.error(`检查设备 ${device.name} (${device.ip}) 状态时出错:`, err);
                    // 发生错误时仍然保留设备，标记为离线
                    return { ...device, status: "离线" };
                }
            });

            // 等待所有设备状态检查完成
            const updatedDevices = await Promise.all(deviceCheckPromises);
            console.log(`状态检查完成，共 ${updatedDevices.length} 个设备（${updatedDevices.filter(d => d.status === "在线").length} 个在线）`);

            // 打印详细设备状态
            updatedDevices.forEach(d => {
                console.log(`- ${d.name} (${d.ip}): ${d.status}`);
            });

            // 更新设备列表，确保不会丢失任何设备
            setDevices(updatedDevices);

            // 应用自定义名称
            setTimeout(applySavedNames, 100);
        } catch (error) {
            console.error('检查设备状态整体过程出错:', error);
        }
    };

    // 定期检查设备状态
    useEffect(() => {
        // 初始检查
        checkAllDevicesStatus();

        // 每30秒检查一次设备状态
        const statusCheckInterval = setInterval(() => {
            console.log("定期检查设备状态...");
            checkAllDevicesStatus();
        }, 30000);

        return () => {
            clearInterval(statusCheckInterval);
        };
    }, [networkInfo.ip]); // 添加networkInfo.ip作为依赖项

    // 更新设备名称映射的函数
    const updateDeviceNameMap = (ip: string, name: string) => {
        setDeviceNameMap(prev => {
            const newMap = { ...prev, [ip]: name };
            saveDeviceNameMap(newMap);
            return newMap;
        });
    };

    // 处理设备名称修改
    const handleNameChange = async (device: NetworkDevice, newName: string) => {
        if (newName && newName !== device.name) {
            try {
                await window.electron.invoke("system:setDeviceName", {
                    deviceIp: device.ip,
                    oldName: device.name,
                    newName: newName,
                });

                // 更新设备列表
                setDevices(prev =>
                    prev.map(d =>
                        d.ip === device.ip && d.name === device.name
                            ? { ...d, name: newName }
                            : d
                    )
                );

                // 保存到名称映射
                updateDeviceNameMap(device.ip, newName);

                console.log(`设备名称已更新 - IP: ${device.ip}, 新名称: ${newName}`);
            } catch (error) {
                console.error("修改设备名称失败:", error);
            }
        }
    };

    // 同样修改设备过滤逻辑
    useEffect(() => {
        // 在每次设备列表更新时过滤掉IPv6设备
        if (devices.length > 0) {
            const filteredDevices = devices.filter(device => isValidIPv4(device.ip));

            if (filteredDevices.length !== devices.length) {
                console.log(`过滤掉了 ${devices.length - filteredDevices.length} 个非IPv4设备`);
                setDevices(filteredDevices);
            }
        }
    }, []);

    return {
        devices,
        setDevices,
        startScan,
        isScanning,
        checkAllDevicesStatus, // 导出手动检查函数，以备需要
        clearDeviceCache,
        handleNameChange,
        deviceNameMap
    };
}; 