import React, { useEffect, useState, useRef } from "react";
import { Device } from "../../types/electron";
import { usePeerJS } from "../../hooks/usePeerJS";

interface DeviceScannerProps {
  onDeviceFound?: (device: Device) => void;
  isScanning: boolean;
  onScanningChange: (scanning: boolean) => void;
}

export const DeviceScanner: React.FC<DeviceScannerProps> = ({
  onDeviceFound,
  isScanning,
  onScanningChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [foundDevices, setFoundDevices] = useState<Device[]>([]);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameIdRef = useRef<number>();
  const [connectingDevice, setConnectingDevice] = useState<string | null>(null);
  const { connectToPeer } = usePeerJS();

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
    ctx.strokeStyle = "rgba(59, 130, 246, 0.3)";
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, (maxRadius / 3) * i, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 绘制十字线
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // 绘制距离标记
    ctx.fillStyle = "rgba(0, 255, 0, 0.5)";
    ctx.font = "10px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    for (let i = 1; i <= 5; i++) {
      const distance = (i * 3).toString() + "m";
      ctx.fillText(distance, centerX + 5, centerY - (maxRadius / 5) * i);
    }
  };

  // 绘制扫描线
  const drawScanLine = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    angle: number
  ) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 20;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);

    // 创建渐变效果
    const gradient = ctx.createLinearGradient(0, 0, radius, 0);
    gradient.addColorStop(0, "rgba(59, 130, 246, 0.8)");
    gradient.addColorStop(0.5, "rgba(59, 130, 246, 0.3)");
    gradient.addColorStop(1, "rgba(59, 130, 246, 0)");

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(radius, 0);
    ctx.arc(0, 0, radius, 0, Math.PI / 8);
    ctx.lineTo(0, 0);
    ctx.fillStyle = gradient;
    ctx.fill();

    // 添加扫描线的边缘线
    ctx.strokeStyle = "rgba(59, 130, 246, 0.8)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(radius, 0);
    ctx.stroke();

    ctx.restore();
  };

  // 绘制设备图标
  const drawDevices = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    currentAngle: number
  ) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) / 2 - 20;

    foundDevices.forEach((device) => {
      // 根据设备索引计算位置
      const angle =
        (2 * Math.PI * foundDevices.indexOf(device)) / foundDevices.length;
      const distance = maxRadius * 0.6; // 60% 半径位置
      const x = centerX + distance * Math.cos(angle);
      const y = centerY + distance * Math.sin(angle);

      // 始终显示设备
      {
        // 绘制设备图标（点）
        ctx.fillStyle = "#3b82f6";
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();

        // 绘制设备名称
        ctx.fillStyle = "#1f2937";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(device.name || "Unknown Device", x, y - 10);
      }
    });
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

      // 计算旋转角度 - 每3秒完成一次完整旋转
      const angle = (elapsedTime / 3000) * (Math.PI * 2);

      drawRadarBackground(ctx, width, height);
      drawScanLine(ctx, width, height, angle);
      drawDevices(ctx, width, height, angle);

      if (isScanning) {
        animationFrameIdRef.current = requestAnimationFrame(drawRadar);
      }
    };

    if (isScanning) {
      startTimeRef.current = null; // 重置开始时间
      animationFrameIdRef.current = requestAnimationFrame(drawRadar);
    }

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      startTimeRef.current = null;
    };
  }, [isScanning, foundDevices]);

  // 监听 MDNS 设备发现
  useEffect(() => {
    if (!isScanning) {
      setFoundDevices([]); // 停止扫描时清空设备列表
      return;
    }

    const handleDeviceFound = (device: Device) => {
      setFoundDevices((prev) => {
        if (prev.some((d) => d.id === device.id)) return prev;
        return [...prev, device];
      });
      onDeviceFound?.(device);
    };

    const unsubscribe =
      window.electron?.network?.onDeviceFound(handleDeviceFound);

    return () => {
      unsubscribe?.();
    };
  }, [isScanning, onDeviceFound]);

  // 处理开始扫描
  const handleStartScanning = async () => {
    try {
      await window.electron?.network?.startDiscovery();
      onScanningChange(true);
    } catch (error) {
      console.error("Failed to start discovery:", error);
    }
  };

  // 处理停止扫描
  const handleStopScanning = async () => {
    try {
      await window.electron?.network?.stopDiscovery();
      onScanningChange(false);
    } catch (error) {
      console.error("Failed to stop discovery:", error);
    }
  };

  // 修改连接逻辑，使用设备的 IP 地址
  const handleConnect = async (device: Device) => {
    try {
      setConnectingDevice(device.id);
      // 直接使用设备 IP 连接
      const success = await connectToPeer(device.ip);
      if (success) {
        // 连接成功逻辑
      } else {
        // 错误处理
      }
    } catch (error) {
      console.error(`连接到设备 ${device.name} 失败:`, error);
    } finally {
      setConnectingDevice(null);
    }
  };

  return (
    <div className="flex flex-col items-center p-4 bg-white rounded-lg shadow-sm">
      <h3 className="mb-4 text-lg text-gray-900">设备扫描器</h3>
      <canvas ref={canvasRef} width={400} height={400} className="mb-6" />
      <div className="flex gap-4">
        <button
          className={`px-6 py-2 rounded-md ${
            isScanning
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-blue-500 hover:bg-blue-600"
          } text-white transition-colors`}
          onClick={handleStartScanning}
          disabled={isScanning}
        >
          开始扫描
        </button>
        <button
          className={`px-6 py-2 rounded-md ${
            !isScanning
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gray-600 hover:bg-gray-700"
          } text-white transition-colors`}
          onClick={handleStopScanning}
          disabled={!isScanning}
        >
          停止扫描
        </button>
      </div>
      <div className="flex gap-4 mt-4">
        <button
          className="px-4 py-2 text-white bg-blue-500 rounded-md"
          disabled
        >
          雷达
        </button>
        <button className="px-4 py-2 text-gray-600 bg-gray-300 rounded-md">
          列表
        </button>
      </div>
      <p className="mt-4 text-sm text-gray-500">
        发现 {foundDevices.length} 个设备
      </p>
    </div>
  );
};
