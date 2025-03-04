import { useState, useEffect } from "react";
import os from "os";

export const useDeviceInfo = () => {
    const [deviceName, setDeviceName] = useState("未知设备");

    useEffect(() => {
        // 通过 IPC 从主进程获取设备名称
        window.electron.invoke("system:getDeviceName").then((name: string) => {
            setDeviceName(name);
        });
    }, []);

    return { deviceName };
}; 