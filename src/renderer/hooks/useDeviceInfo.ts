import { useState, useEffect } from "react";

interface DeviceInfo {
    currentDevice: {
        name: string;
        id?: string;
    };
}

export const useDeviceInfo = (): DeviceInfo => {
    const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
        currentDevice: { name: "我的设备" },
    });

    useEffect(() => {
        const getDeviceInfo = async () => {
            try {
                const name = await window.electron.invoke("system:getDeviceName");
                if (name) {
                    setDeviceInfo({ currentDevice: { name, id: require('os').hostname() } });
                }
            } catch (error) {
                console.error("获取设备信息失败:", error);
            }
        };

        getDeviceInfo();
    }, []);

    return deviceInfo;
}; 