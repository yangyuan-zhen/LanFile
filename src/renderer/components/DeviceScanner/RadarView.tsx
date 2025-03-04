import React, { useEffect, useRef, useState } from "react";
import { Device } from "../../types/electron";
import { useNetworkInfo } from "../../hooks/useNetworkInfo";

interface RadarViewProps {
  devices: Device[];
  currentDevice: {
    name: string;
    id: string;
  };
  onViewChange?: (view: "radar" | "list") => void;
}

const RadarView: React.FC<RadarViewProps> = ({
  devices,
  currentDevice,
  onViewChange,
}) => {
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

    // 绘制中心设备背景
    ctx.fillStyle = "rgba(59, 130, 246, 0.1)";
    ctx.beginPath();
    ctx.arc(centerX, centerY, 40, 0, Math.PI * 2);
    ctx.fill();

    // 绘制中心设备图标
    ctx.fillStyle = "#3b82f6";
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
    ctx.fill();

    // 确保使用传入的设备名称
    const displayName = currentDevice.name || "未知设备";
    console.log("Drawing device name:", displayName); // 添加调试日志

    ctx.fillStyle = "#3b82f6";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(displayName, centerX, centerY + 25);
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

  // 动画循环
  useEffect(() => {
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

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      startTimeRef.current = null;
    };
  }, [devices, currentDevice]);

  const handleViewChange = (view: "radar" | "list") => {
    onViewChange?.(view);
  };

  return (
    <div className="flex flex-col items-center">
      <canvas ref={canvasRef} width={400} height={400} className="mb-4" />

      <div className="flex gap-4 mb-2">
        <button
          className="px-4 py-2 text-white bg-blue-500 rounded-md"
          onClick={() => handleViewChange("radar")}
          disabled
        >
          雷达
        </button>
        <button
          className="px-4 py-2 text-gray-600 bg-gray-300 rounded-md hover:bg-gray-400"
          onClick={() => handleViewChange("list")}
        >
          列表
        </button>
      </div>

      <div className="text-center text-gray-500">
        {networkInfo.type === "wifi" && (
          <p>已连接到 Wi-Fi: {networkInfo.ssid || "未知网络"}</p>
        )}
        {networkInfo.type === "ethernet" && (
          <p>已连接到有线网络: {networkInfo.ip}</p>
        )}
        {networkInfo.type === "none" && <p>未连接到网络</p>}
        <p>发现 {devices.length || 4} 个设备</p>
      </div>
    </div>
  );
};

export default RadarView;
