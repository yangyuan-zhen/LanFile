import { useState, useEffect } from "react";

interface NetworkInfo {
    type: 'wifi' | 'ethernet' | 'none';
    ssid?: string;
    ip?: string;
}

export const useNetworkInfo = () => {
    const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
        type: 'none'
    });

    useEffect(() => {
        const fetchNetworkInfo = async () => {
            try {
                const info = await window.electron.invoke('system:getNetworkInfo');
                setNetworkInfo(info);
            } catch (error) {
                console.error('Failed to get network info:', error);
                setNetworkInfo({ type: 'none' });
            }
        };

        fetchNetworkInfo();
        // 每30秒更新一次网络信息
        const interval = setInterval(fetchNetworkInfo, 30000);
        return () => clearInterval(interval);
    }, []);

    return networkInfo;
}; 