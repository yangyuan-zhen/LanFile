import { useState, useEffect } from "react";

export interface NetworkInfo {
    ip: string;
    type: string; // wifi 或 ethernet
    ssid?: string; // WiFi名称
    speed?: string; // 网络速度
    ipv4?: string; // 备用IPv4
}

export const useNetworkInfo = () => {
    const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
        ip: "",
        type: "",
    });

    useEffect(() => {
        // 获取网络信息
        const fetchNetworkInfo = async () => {
            try {
                const info = await window.electron.invoke('system:getNetworkInfo');
                console.log('获取到网络信息 (useNetworkInfo):', info);
                if (info) {
                    setNetworkInfo(info);
                }
            } catch (error) {
                console.error('获取网络信息失败:', error);
            }
        };

        fetchNetworkInfo();

        // 每10秒更新一次
        const interval = setInterval(fetchNetworkInfo, 10000);

        return () => clearInterval(interval);
    }, []);

    return networkInfo;
}; 