import { useState, useEffect } from "react";

interface NetworkInfo {
    ip: string;
    type: string;
    isConnected: boolean;
    ipv4?: string;
    ssid?: string;
    speed?: string;
}

export const useNetworkInfo = () => {
    const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
        ip: "",
        type: "none",
        isConnected: false,
        ssid: "",
        speed: "100 Mbps"
    });

    useEffect(() => {
        // 获取网络信息
        const fetchNetworkInfo = async () => {
            try {
                const info = await window.electron.invoke('system:getNetworkInfo');
                console.log('获取到网络信息 (useNetworkInfo):', info);

                if (info) {
                    // 确保 IPv4 地址
                    if (info.ip && info.ip.includes(':') && info.ipv4) {
                        info.ip = info.ipv4;
                    }

                    // 验证 IP 地址是否有效
                    const isValidIP = info.ip && !info.ip.includes(':');
                    const isConnected = isValidIP && info.isConnected;

                    setNetworkInfo({
                        ...info,
                        isConnected,
                        type: isConnected ? (info.type || 'ethernet') : 'none',
                        ssid: info.ssid || "",
                        speed: info.speed || "100 Mbps"
                    });

                    console.log('网络状态更新:', {
                        ip: info.ip,
                        type: info.type,
                        isConnected,
                        ssid: info.ssid
                    });
                }
            } catch (error) {
                console.error('获取网络信息失败:', error);
                setNetworkInfo({
                    ip: "",
                    type: "none",
                    isConnected: false,
                    ssid: "",
                    speed: ""
                });
            }
        };

        fetchNetworkInfo();

        // 每10秒更新一次
        const interval = setInterval(fetchNetworkInfo, 10000);

        return () => clearInterval(interval);
    }, []);

    return networkInfo;
}; 