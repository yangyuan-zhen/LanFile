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
                console.log("开始获取设备信息...");

                const name = await window.electron.invoke("system:getDeviceName");
                console.log("获取到设备名称:", name);

                const deviceId = await window.electron.invoke("system:getDeviceId");
                console.log("获取到设备ID:", deviceId);

                if (name) {
                    setDeviceInfo({
                        currentDevice: {
                            name,
                            id: deviceId || undefined
                        }
                    });
                    console.log("设备信息更新成功");
                }
            } catch (error) {
                console.error("获取设备信息失败:", error);
                // 保持默认设备名称
                setDeviceInfo({
                    currentDevice: { name: "我的设备" }
                });
            }
        };

        getDeviceInfo();
    }, []);

    return deviceInfo;
}; 