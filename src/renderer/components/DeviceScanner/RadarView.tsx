import React, { useEffect, useRef, useState } from "react";
// import { Device } from "../../types/electron";
import { useNetworkInfo } from "../../hooks/useNetworkInfo";
import { Smartphone, Laptop, Tablet, Monitor } from "lucide-react";
import { useDeviceInfo } from "../../hooks/useDeviceInfo";
import { useNetworkDevices } from "../../hooks/useNetworkDevices";

// 添加在文件顶部其他类型定义附近
type DeviceType = "mobile" | "tablet" | "laptop" | "desktop";

// 重命名本地接口以避免冲突
interface RadarDevice {
  id: string;
  name: string;
  type: string;
  icon: any;
  online: boolean;
  ip?: string;
  port?: number;
}

// 更新 props 接口中的类型
interface RadarViewProps {
  devices: Array<{
    id: string;
    name: string;
    type: DeviceType;
    icon: React.ComponentType;
    online: boolean;
    ip: string;
    port: number;
  }>;
  currentDevice: {
    name: string;
    id?: string;
  };
  onViewChange: (id?: string) => void;
  isScanning: boolean;
  hideNetworkInfo?: boolean;
}

const DeviceList: React.FC<{
  devices: RadarDevice[];
  currentDevice: { name: string };
  networkInfo: { type: string; ssid?: string; ip?: string };
}> = ({ devices, currentDevice, networkInfo }) => {
  // 示例设备数据
  const mockDevices = [
    { name: "iPhone 13", type: "mobile", icon: Smartphone, online: true },
    { name: "MacBook Pro", type: "laptop", icon: Laptop, online: true },
    { name: "iPad Air", type: "tablet", icon: Tablet, online: false },
    { name: "Windows PC", type: "desktop", icon: Monitor, online: true },
  ];

  return (
    <div className="px-4 mx-auto w-full max-w-3xl">
      {/* 本机设备信息 */}
      <div className="mb-8">
        <h2 className="mb-3 text-xl font-medium text-gray-900">当前设备</h2>
        <div className="flex items-center p-5 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex flex-1 items-center">
            <Monitor className="mr-4 w-7 h-7 text-blue-500" />
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  {currentDevice.name}
                </h3>
                <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded-full">
                  在线
                </span>
              </div>
              <p className="text-sm text-gray-500">
                {networkInfo.ip || "未连接到网络"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 可用设备列表 */}
      <h2 className="mb-6 text-xl font-medium text-gray-900">可用设备</h2>
      <div className="space-y-3">
        {mockDevices.map((device) => {
          const Icon = device.icon;
          return (
            <div
              key={device.name}
              className="flex items-center p-5 bg-white rounded-lg border border-gray-200 transition-colors cursor-pointer hover:border-blue-500"
            >
              <div className="flex flex-1 items-center">
                <Icon className="mr-4 w-7 h-7 text-gray-500" />
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">
                      {device.name}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        device.online
                          ? "text-green-700 bg-green-50"
                          : "text-gray-600 bg-gray-100"
                      }`}
                    >
                      {device.online ? "在线" : "离线"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 capitalize">
                    {device.type}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 从设备类型获取图标
const getDeviceTypeIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case "mobile":
    case "phone":
      return Smartphone;
    case "tablet":
    case "ipad":
      return Tablet;
    case "laptop":
      return Laptop;
    case "desktop":
    default:
      return Monitor;
  }
};

const RadarView: React.FC<RadarViewProps> = ({
  devices: propDevices,
  currentDevice: propCurrentDevice,
  onViewChange,
  isScanning = false,
  hideNetworkInfo = false,
}) => {
  const [viewMode, setViewMode] = useState<"radar" | "list">("radar");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameIdRef = useRef<number>();
  const startTimeRef = useRef<number | null>(null);
  const scanStartTimeRef = useRef<number | null>(null);
  const scanDuration = 5000; // 5秒扫描时间
  const networkInfo = useNetworkInfo(); // 使用网络信息钩子
  const { currentDevice } = useDeviceInfo();
  const { devices: networkDevices, isScanning: networkScanning } =
    useNetworkDevices(); // 使用共享的设备列表

  // 整合设备数据 - 优先使用networkDevices以保持一致性
  const effectiveDevices = networkDevices.map((device) => ({
    id: device.ip + device.name,
    name: device.name,
    type: device.type || "desktop",
    icon: device.icon || Monitor,
    online: device.status === "在线",
    ip: device.ip,
    port: device.port,
  }));

  // 添加调试日志
  console.log("RadarView - 使用网络设备:", effectiveDevices);
  console.log("RadarView - 当前设备:", currentDevice);
  console.log("RadarView - 网络信息:", networkInfo);

  // 绘制雷达背景
  const drawRadarBackground = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) / 2 - 20;

    // 绘制同心圆
    ctx.strokeStyle = "rgba(59, 130, 246, 0.2)";
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, (maxRadius / 3) * i, 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  // 绘制中心设备
  const drawCurrentDevice = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 45;

    // 绘制外圈淡蓝色背景
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(59, 130, 246, 0.1)";
    ctx.fill();

    // 绘制中心蓝色圆点
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#3B82F6";
    ctx.fill();

    // 绘制设备名称
    const deviceName = currentDevice.name || "未知设备";
    ctx.font = "12px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(deviceName, centerX, centerY);
  };

  // 绘制设备
  const drawDevices = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    elapsedTime: number
  ) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) / 2 - 40;

    // 过滤出非中心设备且在线的设备
    const otherDevices = effectiveDevices.filter(
      (d) => d.name !== currentDevice.name && d.online
    );

    // 如果没有在线设备，不绘制
    if (otherDevices.length === 0) return;

    // 将设备均匀分布在雷达上
    otherDevices.forEach((device, index) => {
      const angle = (Math.PI * 2 * index) / otherDevices.length;
      const distance = maxRadius * 0.7; // 70% 半径位置
      const x = centerX + distance * Math.cos(angle);
      const y = centerY + distance * Math.sin(angle);

      // 绘制设备图标
      ctx.fillStyle = "#64748b";
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();

      // 绘制设备名称
      ctx.fillStyle = "#334155";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(device.name, x, y - 15);
    });
  };

  // 绘制波纹效果 - 仅在扫描时显示
  const drawRippleEffect = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    elapsedTime: number,
    isScanningActive: boolean
  ) => {
    if (!isScanningActive) return; // 如果不在扫描中，不绘制波纹

    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) / 2 - 20;

    // 计算波纹半径 (0-1 循环)
    const ripplePhase = (elapsedTime % 3000) / 3000;
    const rippleRadius = maxRadius * ripplePhase;

    // 绘制波纹
    ctx.strokeStyle = `rgba(59, 130, 246, ${0.8 - ripplePhase * 0.8})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, rippleRadius, 0, Math.PI * 2);
    ctx.stroke();

    // 绘制第二个波纹 (错开时间)
    const ripplePhase2 = ((elapsedTime + 1500) % 3000) / 3000;
    const rippleRadius2 = maxRadius * ripplePhase2;

    ctx.strokeStyle = `rgba(59, 130, 246, ${0.8 - ripplePhase2 * 0.8})`;
    ctx.beginPath();
    ctx.arc(centerX, centerY, rippleRadius2, 0, Math.PI * 2);
    ctx.stroke();
  };

  // 初始化雷达动画
  const initRadar = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 设置Canvas尺寸
    const updateCanvasSize = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);

    const drawRadar = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsedTime = timestamp - startTimeRef.current;

      // 检查扫描状态和时间
      let isScanningActive = isScanning;
      if (isScanning && !scanStartTimeRef.current) {
        scanStartTimeRef.current = timestamp;
      }

      // 如果扫描开始了且超过了指定的扫描时间，停止扫描动画
      if (
        scanStartTimeRef.current &&
        timestamp - scanStartTimeRef.current > scanDuration
      ) {
        isScanningActive = false;
      }

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      drawRadarBackground(ctx, width, height);
      drawRippleEffect(ctx, width, height, elapsedTime, isScanningActive);
      drawCurrentDevice(ctx, width, height);
      drawDevices(ctx, width, height, elapsedTime);

      animationFrameIdRef.current = requestAnimationFrame(drawRadar);
    };

    startTimeRef.current = null;
    animationFrameIdRef.current = requestAnimationFrame(drawRadar);

    return () => {
      window.removeEventListener("resize", updateCanvasSize);
    };
  };

  // 监听视图模式变化
  useEffect(() => {
    if (viewMode === "radar") {
      const cleanup = initRadar();
      return () => {
        if (animationFrameIdRef.current) {
          cancelAnimationFrame(animationFrameIdRef.current);
        }
        startTimeRef.current = null;
        if (cleanup) cleanup();
      };
    }
  }, [viewMode, effectiveDevices, currentDevice, isScanning]);

  // 监听扫描状态变化
  useEffect(() => {
    if (isScanning) {
      // 重置扫描计时器
      scanStartTimeRef.current = null;
    }
  }, [isScanning]);

  const handleViewChange = (view: "radar" | "list") => {
    onViewChange?.(currentDevice.id || "");
  };

  // 计算设备在雷达上的位置
  const calculateDevicePositions = (
    deviceList: RadarDevice[],
    centerDeviceInfo: RadarDevice
  ) => {
    // 过滤出非中心设备且在线的设备
    const otherDevices = deviceList.filter(
      (d) => d.ip !== centerDeviceInfo.ip && d.online
    );

    // 如果没有其他设备，返回空数组
    if (otherDevices.length === 0) return [];

    // 计算每个设备的角度和半径
    return otherDevices.map((device, index) => {
      const angle = (2 * Math.PI * index) / otherDevices.length;
      // 设备与中心的距离，可以根据不同设备类型设置不同距离
      const radius = 120;

      return {
        ...device,
        x: radius * Math.sin(angle),
        y: -radius * Math.cos(angle),
      };
    });
  };

  // 获取当前设备和定位其他设备
  const centerDevice = effectiveDevices.find(
    (d) => d.ip === networkInfo.ip
  ) || {
    id: "local",
    name: currentDevice.name,
    type: "desktop",
    icon: Monitor,
    online: true,
    ip: networkInfo.ip,
  };

  const positionedDevices = calculateDevicePositions(
    effectiveDevices,
    centerDevice
  );

  // 动态选择图标组件
  const IconComponent = centerDevice.icon || Monitor;

  return (
    <div className="relative w-full h-full">
      {/* 雷达背景圆环 */}
      <div className="flex absolute inset-0 justify-center items-center">
        <div className="w-60 h-60 rounded-full border border-gray-200"></div>
        <div className="absolute w-40 h-40 rounded-full border border-gray-200"></div>
      </div>

      {/* 中心设备（当前设备） */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="flex flex-col items-center">
          <div className="flex justify-center items-center mb-1 w-16 h-16 text-white bg-blue-500 rounded-full">
            <IconComponent width={32} height={32} />
          </div>
          <span className="text-sm font-medium">{centerDevice.name}</span>
          {centerDevice.ip && (
            <span className="text-xs text-gray-500">{centerDevice.ip}</span>
          )}
        </div>
      </div>

      {/* 其他设备 */}
      {positionedDevices.map((device) => (
        <div
          key={device.id}
          className="flex absolute top-1/2 left-1/2 flex-col justify-center items-center"
          style={{
            transform: `translate(calc(-50% + ${device.x}px), calc(-50% + ${device.y}px))`,
            transition: "transform 0.5s ease-out",
          }}
        >
          <div
            className={`flex justify-center items-center mb-1 w-10 h-10 text-white ${
              device.online ? "bg-green-500" : "bg-gray-300"
            } rounded-full`}
          >
            {React.createElement(device.icon || Monitor, { size: 20 })}
          </div>
          <span className="text-xs font-medium">{device.name}</span>
          {device.ip && (
            <span className="text-xs text-gray-500">{device.ip}</span>
          )}
        </div>
      ))}

      {/* 扫描动画 */}
      {(isScanning || networkScanning) && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-60 h-60 rounded-full animate-radar-scan"></div>
        </div>
      )}

      {/* 网络信息 */}
      {!hideNetworkInfo && (
        <div className="absolute bottom-2 left-2 p-2 text-xs text-gray-500 bg-white bg-opacity-70 rounded">
          {networkInfo.type === "wifi"
            ? `WiFi: ${networkInfo.ssid || "未知网络"}`
            : "有线网络"}
          <br />
          IP: {networkInfo.ip || "未知"}
        </div>
      )}
    </div>
  );
};

export default RadarView;
