import { useState, useEffect, useCallback } from "react";
import { NetworkDevice } from "../@types/electron";

// 扩展 NetworkDevice 类型
interface ExtendedNetworkDevice extends NetworkDevice {
  stableConnectionCount?: number;
  lastChecked?: number;
}

export const useNetworkDevices = () => {
  const [devices, setDevices] = useState<ExtendedNetworkDevice[]>([]);
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

      // 并行检查所有设备状态，但限制并发数为5
      const concurrentCheck = async (devices, concurrency = 5) => {
        // 明确指定结果数组的类型
        const results: ExtendedNetworkDevice[] = [];
        for (let i = 0; i < devices.length; i += concurrency) {
          const batch = devices.slice(i, i + concurrency);
          const batchResults = await Promise.all(
            batch.map(async (device) => {
              try {
                // 跳过本地设备
                if (device.ip === networkInfo?.ip) {
                  return {
                    ...device,
                    online: true,
                    status: "在线",
                    stableConnectionCount:
                      (device.stableConnectionCount || 0) + 1,
                  };
                }

                // 获取检查间隔 - 稳定设备检查频率降低
                const isStableDevice =
                  ((device as any).stableConnectionCount || 0) > 5;

                // 对长期稳定的设备跳过一些检测，提高效率
                if (isStableDevice && Math.random() > 0.3) {
                  return device;
                }

                // 设备检测
                const isOnline = await window.electron.invoke(
                  "network:pingDevice",
                  device.ip,
                  32199 // 使用统一的心跳端口
                );

                console.log(
                  `设备 ${device.name} (${device.ip}) 在线检测结果: ${isOnline}，使用端口: 32199`
                );

                // 更新稳定连接计数
                const stableConnectionCount = isOnline
                  ? (device.stableConnectionCount || 0) + 1
                  : 0;

                return {
                  ...device,
                  online: isOnline,
                  status: isOnline ? "在线" : "离线",
                  stableConnectionCount,
                  lastChecked: Date.now(),
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
          results.push(...batchResults);
        }
        return results;
      };

      const updatedDevices = await concurrentCheck(devices);
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

  // 自适应检测间隔
  useEffect(() => {
    // 设置固定的5秒检测间隔
    console.log("设置设备状态检测定时器");
    const statusCheckInterval = setInterval(() => {
      console.log("===== 定时器触发，开始检查设备状态 =====");
      console.log(`当前设备列表数量: ${devices.length}`);
      if (devices.length > 0) {
        checkAllDevicesStatus();
      } else {
        console.log("没有设备需要检查");
      }
    }, 5000); // 每5秒检测一次

    return () => {
      console.log("清理设备状态检测定时器");
      clearInterval(statusCheckInterval);
    };
  }, [devices, checkAllDevicesStatus]);

  useEffect(() => {
    // 获取当前设备的网络信息
    const getNetworkInfo = async () => {
      try {
        const info = await window.electron.invoke("system:getNetworkInfo");
        console.log("获取到的网络信息:", info);

        setNetworkInfo({
          id: "local",
          name: await window.electron.invoke("system:getDeviceName"),
          ip: info.ip,
          type: "desktop",
          online: true, // 强制设置为 true，确保本机总是"在线"
        });
      } catch (error) {
        console.error("获取网络信息失败:", error);
      }
    };

    getNetworkInfo();
  }, []);

  // 修改设备检测逻辑，只使用 TCP 和 HTTP

  // 在设备检测部分
  const checkDeviceStatus = async (device: NetworkDevice) => {
    try {
      console.log(`开始检查设备 ${device.name} (${device.ip}) 的状态`);

      // 如果是本机，始终返回在线状态
      if (networkInfo && device.ip === networkInfo.ip) {
        console.log(`设备 ${device.name} (${device.ip}) 是本机，设置为在线`);
        return { ...device, status: "在线", lastSeen: Date.now() };
      }

      // 注释掉网络连接检查
      /*
      // 检查网络连接状态
      if (!networkInfo?.online) {
        console.log("网络未连接，设备状态设置为离线");
        return {
          ...device,
          status: "离线",
        };
      }
      */

      // 直接进行设备检测
      const heartbeatPort = await window.electron.invoke("heartbeat:getPort");
      console.log(
        `检查设备心跳: ${device.name} (${device.ip}:${heartbeatPort})`
      );

      const startTime = Date.now();
      const isOnline = await window.electron.invoke(
        "network:pingDevice",
        device.ip,
        heartbeatPort
      );
      const endTime = Date.now();

      console.log(
        `设备 ${device.name} (${device.ip}) 心跳检测结果: ${
          isOnline ? "在线" : "离线"
        }, 耗时: ${endTime - startTime}ms`
      );

      return {
        ...device,
        status: isOnline ? "在线" : "离线",
        lastSeen: isOnline ? Date.now() : device.lastSeen,
      };
    } catch (error) {
      console.error(`检查设备 ${device.name} (${device.ip}) 心跳异常:`, error);
      return { ...device, status: "离线" };
    }
  };

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
