import { useState, useEffect } from "react";
import os from "os";

export const useDeviceInfo = () => {
    const [deviceInfo] = useState({
        currentDevice: {
            name: "Windows 10 设备",
            id: "1"
        }
    });

    useEffect(() => {
        // 通过 IPC 从主进程获取设备名称
        window.electron.invoke("system:getDeviceName").then((name: string) => {
            deviceInfo.currentDevice.name = name;
        });
    }, [deviceInfo]);

    return deviceInfo;
}; 