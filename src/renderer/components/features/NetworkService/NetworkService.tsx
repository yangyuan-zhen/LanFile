import React, { useState, useEffect } from "react";
import RadarView from "../../DeviceScanner/RadarView";
import { useDeviceInfo } from "../../../hooks/useDeviceInfo";
import { useNetworkDevices } from "../../../hooks/useNetworkDevices";
import { useNetworkInfo } from "../../../hooks/useNetworkInfo";
import { Button } from "../../common/Button/Button";
import { RefreshCw } from "lucide-react";

interface NetworkServiceProps {
  networkInfo: {
    currentDevice: string;
    networkStatus: string;
    networkSpeed: string;
    lastUpdate: string;
    connectedDevices: string;
  };
}

const NetworkService: React.FC<NetworkServiceProps> = ({ networkInfo }) => {
  const deviceInfo = useDeviceInfo();
  const { devices, startScan, isScanning } = useNetworkDevices();
  const networkStatusInfo = useNetworkInfo();
  const [lastScanTime, setLastScanTime] = useState<Date>(new Date());

  // 获取最新设备扫描时间
  useEffect(() => {
    if (devices.length > 0) {
      // 找出设备中最新的 lastSeen 时间
      const latestTime = Math.max(
        ...devices.map((device) => device.lastSeen || 0)
      );
      if (latestTime > 0) {
        setLastScanTime(new Date(latestTime));
      }
    }
  }, [devices]);

  // 获取在线设备数量
  const onlineDevicesCount = devices.filter((d) => d.status === "在线").length;

  // 格式化最后扫描时间
  const formatLastScanTime = () => {
    const now = new Date();
    const diff = Math.floor(
      (now.getTime() - lastScanTime.getTime()) / 1000 / 60
    ); // 分钟差

    if (diff < 1) return "刚刚";
    if (diff < 60) return `${diff} 分钟前`;

    const hours = Math.floor(diff / 60);
    if (hours < 24) return `${hours} 小时前`;

    return lastScanTime.toLocaleDateString();
  };

  // 使用 deviceInfo 中的真实设备名称
  const currentDevice = {
    name: deviceInfo.currentDevice.name,
    id: deviceInfo.currentDevice.id,
  };

  const handleScanClick = () => {
    console.log("开始扫描网络设备流程...");
    // 调用 startScan() 开始扫描，其中包含了以下步骤：
    // 1. 启动 MDNS 发现服务
    // 2. 5秒后停止发现服务
    // 3. 保存发现的设备到缓存
    // 4. 检查所有设备状态
    startScan();
  };

  return (
    <div className="p-6 mb-6 bg-white rounded-xl shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">局域网设备</h3>
      <div className="flex flex-wrap justify-center items-center">
        {/* 左侧雷达图 */}
        <div className="relative mb-6 w-full h-80 lg:w-2/3 xl:w-1/2">
          <RadarView
            devices={devices.map((device) => ({
              id: device.name,
              name: device.name,
              type: device.type,
              icon: device.icon,
              online: device.status === "在线",
              ip: device.ip,
              port: device.port,
            }))}
            currentDevice={currentDevice}
            onViewChange={() => {}}
            isScanning={isScanning} // 传递扫描状态
          />
        </div>

        {/* 右侧网络状态 */}
        <div className="pl-0 w-full lg:w-1/3 xl:w-1/2 lg:pl-6">
          {/* 添加 Wi-Fi 信息 */}
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">连接网络:</span>
            <span className="font-semibold">
              {networkStatusInfo.type === "wifi"
                ? networkStatusInfo.ssid || "未知网络"
                : networkStatusInfo.type === "ethernet"
                ? "有线网络"
                : "未连接到网络"}
            </span>
          </div>

          <div className="flex justify-between mb-2">
            <span className="text-gray-600">当前在线设备:</span>
            <span className="font-semibold">
              {onlineDevicesCount}/{devices.length}
            </span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">网络状态:</span>
            <span className="font-semibold text-green-600">
              {networkInfo.networkStatus || "稳定"}
            </span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">网络速度:</span>
            <span className="font-semibold">
              {networkInfo.networkSpeed ||
                networkStatusInfo.speed ||
                "100 Mbps"}
            </span>
          </div>
          <div className="flex justify-between mb-4">
            <span className="text-gray-600">最后扫描:</span>
            <span className="text-gray-500">{formatLastScanTime()}</span>
          </div>

          <div className="mb-4">
            <Button
              onClick={handleScanClick}
              disabled={isScanning}
              className="flex items-center text-white bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400"
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isScanning ? "animate-spin" : ""}`}
              />
              <span>{isScanning ? "扫描中..." : "重新扫描网络"}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkService;
