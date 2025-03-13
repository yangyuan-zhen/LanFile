import { useState, useEffect, useCallback } from "react";
import { NetworkDevice } from "../types/electron";

export const useNetworkDevices = () => {
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [deviceNameMap, setDeviceNameMap] = useState<Record<string, string>>(
    {}
  );
  const [networkInfo, setNetworkInfo] = useState<NetworkDevice | null>(null);

  // 检查所有设备状态
  const checkAllDevicesStatus = useCallback(async () => {
    if (devices.length === 0) return devices;

    try {
      console.log("开始检查所有设备状态");
      const updatedDevices = await Promise.all(
        devices.map(async (device) => {
          try {
            // 跳过本地设备
            if (device.ip === networkInfo?.ip) {
              return {
                ...device,
                online: true,
                status: "在线",
              };
            }

            // 通过ping或其他方式检查设备在线状态
            const isOnline = await window.electron.invoke(
              "network:pingDevice",
              device.ip
            );
            console.log(
              `设备 ${device.name} (${device.ip}) 在线状态: ${isOnline}`
            );
            return {
              ...device,
              online: isOnline,
              status: isOnline ? "在线" : "离线",
            };
          } catch (error) {
            console.error(
              `检查设备 ${device.name} (${device.ip}) 状态失败:`,
              error
            );
            return device;
          }
        })
      );

      console.log("设备状态检查完成:", updatedDevices);
      setDevices(updatedDevices);
      return updatedDevices;
    } catch (error) {
      console.error("检查设备状态失败:", error);
      return devices;
    }
  }, [devices, networkInfo]);

  // 开始扫描
  const startScan = useCallback(() => {
    setIsScanning(true);
    // 实现扫描逻辑
  }, []);

  // 清除设备缓存
  const clearDeviceCache = useCallback(() => {
    setDevices([]);
    setDeviceNameMap({});
  }, []);

  // 处理设备名称变更
  const handleNameChange = useCallback(
    async (device: NetworkDevice, newName: string) => {
      // 实现名称变更逻辑
      return true;
    },
    []
  );

  // 刷新设备
  const refreshDevices = useCallback(async () => {
    setIsScanning(true);
    try {
      await window.electron.invoke("mdns:startDiscovery");
      if (devices.length > 0) {
        await checkAllDevicesStatus();
      }
    } catch (error) {
      console.error("刷新设备失败:", error);
    } finally {
      setIsScanning(false);
    }
  }, [devices, checkAllDevicesStatus]);

  useEffect(() => {
    // 每15秒检查一次设备状态，原来是30秒
    const statusCheckInterval = setInterval(() => {
      if (devices.length > 0) {
        checkAllDevicesStatus();
      }
    }, 15000);

    return () => clearInterval(statusCheckInterval);
  }, [devices.length, checkAllDevicesStatus]);

  useEffect(() => {
    // 获取当前设备的网络信息
    const getNetworkInfo = async () => {
      try {
        const info = await window.electron.invoke("system:getNetworkInfo");
        setNetworkInfo({
          id: "local",
          name: await window.electron.invoke("system:getDeviceName"),
          ip: info.ip,
          type: "desktop",
          online: true,
        });
      } catch (error) {
        console.error("获取网络信息失败:", error);
      }
    };

    getNetworkInfo();
  }, []);

  return {
    devices,
    setDevices,
    startScan,
    isScanning,
    checkAllDevicesStatus,
    clearDeviceCache,
    handleNameChange,
    deviceNameMap,
    refreshDevices,
  };
};
