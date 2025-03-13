import { useState, useEffect, useCallback } from "react";
import { NetworkDevice } from "../types/electron";

export const useNetworkDevices = () => {
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [deviceNameMap, setDeviceNameMap] = useState<Record<string, string>>(
    {}
  );

  // 检查所有设备状态
  const checkAllDevicesStatus = useCallback(async () => {
    if (devices.length === 0) return devices;

    try {
      const updatedDevices = await Promise.all(
        devices.map(async (device) => {
          // 实现设备状态检查逻辑
          return device;
        })
      );
      setDevices(updatedDevices);
      return updatedDevices;
    } catch (error) {
      console.error("检查设备状态失败:", error);
      return devices;
    }
  }, [devices]);

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
