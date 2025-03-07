import React, { useState, useEffect } from "react";
import RadarView from "../../DeviceScanner/RadarView";
import { useDeviceInfo } from "../../../hooks/useDeviceInfo";
import { useNetworkDevices } from "../../../hooks/useNetworkDevices";
import { useNetworkInfo } from "../../../hooks/useNetworkInfo";

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

  const handleScanNetwork = async () => {
    try {
      // 直接使用 useNetworkDevices 提供的 startScan 方法
      startScan();
      setLastScanTime(new Date()); // 更新扫描时间
    } catch (error) {
      console.error("扫描网络失败:", error);
    }
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

          <button
            onClick={handleScanNetwork}
            disabled={isScanning}
            className={`flex justify-center items-center py-2 mt-4 space-x-2 w-full text-white rounded-md transition-all ${
              isScanning
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            <svg
              className={`mr-2 w-5 h-5 ${isScanning ? "animate-spin" : ""}`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 12h2a8 8 0 0 1 8-8V2"></path>
              <path d="M22 12h-2a8 8 0 0 1-8 8v2"></path>
              <path d="M8 16l4 4 4-4"></path>
              <path d="M16 8l-4-4-4 4"></path>
            </svg>
            <span>{isScanning ? "扫描中..." : "重新扫描网络"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NetworkService;
