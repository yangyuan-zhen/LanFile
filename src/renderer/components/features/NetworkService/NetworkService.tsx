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
  const [networkSpeed, setNetworkSpeed] = useState<string>("205.5 Mbps");

  // 清理获取最新设备扫描时间的效果
  // 问题: 这个useEffect与手动点击扫描时的设置冲突
  useEffect(() => {
    // 只在初始加载设备时设置时间，避免覆盖用户手动扫描时间
    if (
      devices.length > 0 &&
      lastScanTime.getTime() === new Date(0).getTime()
    ) {
      // 找出设备中最新的 lastSeen 时间
      const latestTime = Math.max(
        ...devices.map((device) => device.lastSeen || 0)
      );
      if (latestTime > 0) {
        console.log(
          "首次加载设置扫描时间:",
          new Date(latestTime).toLocaleTimeString()
        );
        setLastScanTime(new Date(latestTime));
      }
    }
  }, [devices]);

  // 更频繁地更新显示的时间
  useEffect(() => {
    console.log("设置时间更新计时器");

    // 每15秒更新一次时间显示
    const timer = setInterval(() => {
      console.log("触发时间更新");
      setTimeUpdateTrigger(Date.now()); // 使用当前时间戳作为触发器
    }, 15000);

    return () => {
      console.log("清除时间更新计时器");
      clearInterval(timer);
    };
  }, []);

  // 获取在线设备数量
  const onlineDevicesCount = devices.filter((d) => d.status === "在线").length;

  // 修改时间格式化函数，添加调试输出
  const formatLastScanTime = () => {
    // 无论当前系统时间是什么，只计算相对时间差
    const nowMs = Date.now();
    const scanTimeMs = lastScanTime.getTime();

    // 计算毫秒差
    const diffMs = nowMs - scanTimeMs;
    const diffSeconds = Math.floor(diffMs / 1000);

    // 添加更多调试信息
    console.log(
      `扫描时间计算[${timeUpdateTrigger}]: 差=${diffSeconds}秒, 显示="${
        diffSeconds < 10
          ? "刚刚"
          : diffSeconds < 60
          ? diffSeconds + "秒前"
          : "更早"
      }"`
    );

    // 使用简单的时间差逻辑
    if (diffSeconds < 10) return "刚刚";
    if (diffSeconds < 60) return `${diffSeconds}秒前`;

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}分钟前`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}小时前`;

    // 如果超过24小时，简单显示"X天前"
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}天前`;
  };

  // 使用 deviceInfo 中的真实设备名称
  const currentDevice = {
    name: deviceInfo.name,
    id: deviceInfo.id,
  };

  // 确保在重新扫描时设置正确的时间戳
  const handleScanClick = () => {
    console.log("开始扫描网络设备流程...");

    // 直接使用时间戳
    const nowMs = Date.now();
    setLastScanTime(new Date(nowMs));
    console.log("设置最后扫描时间戳:", nowMs);

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

  // 增加定时器来模拟速度波动
  useEffect(() => {
    // 添加一个计时器，定期更新网络速度值
    const timer = setInterval(() => {
      // 基础速度值
      const baseSpeed = 200;
      // 添加随机波动 (±10%)
      const fluctuation = (Math.random() - 0.5) * 0.2;
      const newSpeed = baseSpeed * (1 + fluctuation);
      // 格式化为最多一位小数
      setNetworkSpeed(`${newSpeed.toFixed(1)} Mbps`);
    }, 3000); // 每3秒更新一次

    return () => clearInterval(timer);
  }, []);

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
            <span className="font-semibold">{networkSpeed}</span>
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
