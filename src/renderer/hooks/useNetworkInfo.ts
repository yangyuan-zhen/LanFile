import { useState, useEffect } from "react";

export const useNetworkInfo = () => {
    const [networkInfo, setNetworkInfo] = useState({
        type: "none",
        ssid: "",
        ip: "",
        speed: "100 Mbps",
        lastScan: new Date().toISOString()
    });

    useEffect(() => {
        // 获取网络信息
        const fetchNetworkInfo = async () => {
            try {
                const info = await window.electron.invoke('system:getNetworkInfo');
                console.log('获取到网络信息 (useNetworkInfo):', info);
                if (info) {
                    setNetworkInfo({
                        ...networkInfo,
                        type: info.type || 'none',
                        ssid: info.ssid || '',
                        ip: info.ip || '',
                        lastScan: new Date().toISOString()
                    });
                }
            } catch (error) {
                console.error('获取网络信息失败:', error);
            }
        };

        fetchNetworkInfo();

        // 每30秒更新一次
        const interval = setInterval(fetchNetworkInfo, 30000);

        return () => clearInterval(interval);
    }, []);

    return networkInfo;
}; 