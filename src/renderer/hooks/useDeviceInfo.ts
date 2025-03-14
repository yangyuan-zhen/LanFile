import { useState, useEffect } from "react";

interface DeviceInfo {
    id: string;
    name: string;
    ip?: string;
    port?: number;
}

export const useDeviceInfo = (): DeviceInfo => {
    const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
        id: "local-device",
        name: "我的设备",
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
                        id: deviceId || "local-device",
                        name: name,
                    });
                    console.log("设备信息更新成功");
                }
            } catch (error) {
                console.error("获取设备信息失败:", error);
                // 保持默认设备信息
                setDeviceInfo({
                    id: "local-device",
                    name: "我的设备"
                });
            }
        };

        getDeviceInfo();
    }, []);

    return deviceInfo;
}; 