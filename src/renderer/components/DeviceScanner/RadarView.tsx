import React, { useEffect, useRef, useState } from "react";
import { Device } from "../../types/electron";
import { useNetworkInfo } from "../../hooks/useNetworkInfo";
import { Smartphone, Laptop, Tablet, Monitor } from "lucide-react";

interface RadarViewProps {
  devices: Device[];
  currentDevice: {
    name: string;
    id: string;
  };
  onViewChange?: (view: "radar" | "list") => void;
}

const DeviceList: React.FC<{
  devices: Device[];
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

const RadarView: React.FC<RadarViewProps> = ({
  devices,
  currentDevice,
  onViewChange,
}) => {
  const [viewMode, setViewMode] = useState<"radar" | "list">("radar");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameIdRef = useRef<number>();
  const startTimeRef = useRef<number | null>(null);
  const networkInfo = useNetworkInfo();

  // 添加调试日志
  console.log("RadarView currentDevice:", currentDevice);

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
    ctx.fillStyle = "#334155";
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

    // 预定义设备名称和位置
    const predefinedDevices = [
      { name: "Windows PC", angle: Math.PI * 0.5 },
      { name: "iPad Air", angle: Math.PI },
      { name: "iPhone 13", angle: Math.PI * 1.5 },
      { name: "MacBook Pro", angle: Math.PI * 2 },
    ];

    predefinedDevices.forEach((device, index) => {
      const distance = maxRadius * 0.7; // 70% 半径位置
      const x = centerX + distance * Math.cos(device.angle);
      const y = centerY + distance * Math.sin(device.angle);

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

  // 绘制波纹效果
  const drawRippleEffect = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    elapsedTime: number
  ) => {
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

    const drawRadar = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }
      const elapsedTime = timestamp - startTimeRef.current;

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      drawRadarBackground(ctx, width, height);
      drawRippleEffect(ctx, width, height, elapsedTime);
      drawCurrentDevice(ctx, width, height);
      drawDevices(ctx, width, height, elapsedTime);

      animationFrameIdRef.current = requestAnimationFrame(drawRadar);
    };

    startTimeRef.current = null;
    animationFrameIdRef.current = requestAnimationFrame(drawRadar);
  };

  // 监听视图模式变化
  useEffect(() => {
    if (viewMode === "radar") {
      initRadar();
    }
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      startTimeRef.current = null;
    };
  }, [viewMode, devices, currentDevice]);

  const handleViewChange = (view: "radar" | "list") => {
    onViewChange?.(view);
  };

  return (
    <div className="flex flex-col items-center">
      <canvas ref={canvasRef} width={400} height={340} />

      {/* 只保留 Wi-Fi 信息 */}
      <div className="mt-2 text-center">
        <div className="text-sm text-gray-600">
          已连接到 Wi-Fi:{" "}
          {networkInfo.type === "wifi"
            ? networkInfo.ssid || "未知网络"
            : networkInfo.type === "ethernet"
            ? "有线网络"
            : "未连接到网络"}
        </div>
      </div>
    </div>
  );
};

export default RadarView;
