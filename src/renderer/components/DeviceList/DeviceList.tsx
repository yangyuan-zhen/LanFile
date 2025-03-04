import React, { useEffect, useState } from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { Device } from "../../services/ZeroconfService";
import { zeroconfService } from "../../services/ZeroconfService";

interface DeviceWithStatus extends Device {
  status: "online" | "offline";
}

export const DeviceList: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 设置事件监听器
    zeroconfService.on("deviceFound", handleDeviceFound);
    zeroconfService.on("error", handleError);

    // 清理函数
    return () => {
      zeroconfService.removeListener("deviceFound", handleDeviceFound);
      zeroconfService.removeListener("error", handleError);
      zeroconfService.stopScan();
    };
  }, []);

  const handleDeviceFound = (device: Device) => {
    setDevices((prev) => {
      // 检查设备是否已存在
      const exists = prev.some((d) => d.host === device.host);
      if (exists) return prev;
      return [...prev, device];
    });
  };

  const handleError = (error: Error) => {
    setError(error.message);
    setIsScanning(false);
  };

  const handleStartScan = () => {
    setDevices([]);
    setError(null);
    setIsScanning(true);
    zeroconfService.startScan();
  };

  const handleStopScan = () => {
    setIsScanning(false);
    zeroconfService.stopScan();
  };

  const getStatusColor = (status: "online" | "offline") => {
    return status === "online" ? "text-green-500" : "text-gray-400";
  };

  if (error) {
    return (
      <div className="p-4 bg-white rounded-lg shadow-sm">
        <div className="py-4 text-center text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-white rounded-lg shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">局域网设备</h2>
          <button
            onClick={isScanning ? handleStopScan : handleStartScan}
            className={`px-4 py-2 rounded ${
              isScanning
                ? "bg-red-500 hover:bg-red-600"
                : "bg-blue-500 hover:bg-blue-600"
            } text-white`}
          >
            {isScanning ? "停止扫描" : "开始扫描"}
          </button>
        </div>

        <div className="space-y-2">
          {devices.map((device, index) => (
            <div
              key={index}
              className="p-3 bg-gray-50 rounded transition-colors hover:bg-gray-100"
            >
              <div className="font-medium">{device.name}</div>
              <div className="text-sm text-gray-500">
                {device.addresses.join(", ")}
              </div>
              <div className="text-sm text-gray-500">端口: {device.port}</div>
            </div>
          ))}

          {isScanning && devices.length === 0 && (
            <div className="py-4 text-center text-gray-500">
              正在扫描设备...
            </div>
          )}

          {!isScanning && devices.length === 0 && (
            <div className="py-4 text-center text-gray-500">未发现设备</div>
          )}
        </div>
      </div>
    </div>
  );
};
