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
  getSelectedFiles?: () => FileList | null;
}

const NetworkService: React.FC<NetworkServiceProps> = ({
  networkInfo,
  getSelectedFiles,
}) => {
  const deviceInfo = useDeviceInfo();
  const { devices, startScan, isScanning } = useNetworkDevices();
  const networkStatusInfo = useNetworkInfo();
  const [lastScanTime, setLastScanTime] = useState<Date>(new Date());
  const [timeUpdateTrigger, setTimeUpdateTrigger] = useState(0);

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

  // 在 useEffect 中，添加一个定时器来实时更新显示的时间
  useEffect(() => {
    // 设置一个每分钟更新一次的定时器，确保时间显示实时更新
    const timer = setInterval(() => {
      // 增加触发器的值来强制组件重新渲染
      setTimeUpdateTrigger((prev) => prev + 1);
    }, 60000); // 每分钟更新一次

    return () => clearInterval(timer); // 组件卸载时清除定时器
  }, []);

  // 获取在线设备数量
  const onlineDevicesCount = devices.filter((d) => d.status === "在线").length;

  // 格式化最后扫描时间
  const formatLastScanTime = () => {
    // timeUpdateTrigger 变化会导致这个函数重新计算
    console.log("更新时间显示，触发器:", timeUpdateTrigger);

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
    // 立即更新最后扫描时间为当前时间
    setLastScanTime(new Date());
    // 调用 startScan() 开始扫描
    startScan();
  };

  const getNetworkStatus = () => {
    if (!networkStatusInfo.isConnected) {
      return {
        text: "未连接到网络",
        color: "text-red-500",
      };
    }

    if (networkStatusInfo.type === "ethernet") {
      return {
        text: "已连接到有线网络",
        color: "text-green-500",
      };
    }

    if (networkStatusInfo.type === "wifi") {
      return {
        text: networkStatusInfo.ssid
          ? `已连接到 ${networkStatusInfo.ssid}`
          : "已连接到无线网络",
        color: "text-green-500",
      };
    }

    return {
      text: "网络状态未知",
      color: "text-yellow-500",
    };
  };

  const status = getNetworkStatus();

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
            isScanning={isScanning}
            hideNetworkInfo={true}
            getSelectedFiles={getSelectedFiles}
          />
        </div>

        {/* 右侧网络状态 */}
        <div className="pl-0 w-full lg:w-1/3 xl:w-1/2 lg:pl-6">
          {/* 添加 Wi-Fi 信息 */}
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">连接网络:</span>
            <span className={`font-semibold ${status.color}`}>
              {status.text}
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
