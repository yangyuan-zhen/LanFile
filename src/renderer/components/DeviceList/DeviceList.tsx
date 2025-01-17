import React, { useEffect, useState } from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { Device } from "../../types/electron";

interface DeviceWithStatus extends Device {
  status: "online" | "offline";
}

export const DeviceList: React.FC = () => {
  const [devices, setDevices] = useState<DeviceWithStatus[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!window.electron?.network) {
      setError("Electron API not available");
      return;
    }

    try {
      const unsubscribeFound = window.electron.network.onDeviceFound(
        (device: Device) => {
          setDevices((prev) => {
            // 检查设备是否已存在
            const exists = prev.some((d) => d.id === device.id);
            if (exists) {
              return prev.map((d) =>
                d.id === device.id ? { ...device, status: "online" } : d
              );
            }
            return [...prev, { ...device, status: "online" }];
          });
        }
      );

      const unsubscribeLeft = window.electron.network.onDeviceLeft(
        (device: Device) => {
          setDevices((prev) =>
            prev.map((d) =>
              d.id === device.id ? { ...d, status: "offline" } : d
            )
          );
        }
      );

      return () => {
        try {
          unsubscribeFound();
          unsubscribeLeft();
        } catch (e) {
          console.error("Error cleaning up device listeners:", e);
        }
      };
    } catch (e) {
      setError("Failed to initialize device discovery");
      console.error("Device discovery error:", e);
    }
  }, []);

  const handleRefresh = async () => {
    if (!window.electron?.network) {
      setError("Electron API not available");
      return;
    }

    setIsRefreshing(true);
    try {
      // 清空设备列表并重新开始发现
      setDevices([]);
      // 这里可以添加重新扫描的逻辑
      setTimeout(() => setIsRefreshing(false), 1000);
    } catch (e) {
      setError("Failed to refresh devices");
      console.error("Refresh error:", e);
    }
  };

  const getStatusColor = (status: "online" | "offline") => {
    return status === "online" ? "text-green-500" : "text-gray-400";
  };

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="text-center py-4 text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-900">局域网设备</h2>
        <button
          onClick={handleRefresh}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          disabled={isRefreshing}
        >
          <ArrowPathIcon
            className={`w-5 h-5 text-gray-500 ${
              isRefreshing ? "animate-spin" : ""
            }`}
          />
        </button>
      </div>

      <div className="space-y-2">
        {devices.map((device) => (
          <div
            key={device.id}
            className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div
                className={`w-2 h-2 rounded-full ${getStatusColor(
                  device.status
                )}`}
              />
              <span className="text-gray-900">{device.name}</span>
            </div>
            <span className={`text-sm ${getStatusColor(device.status)}`}>
              {device.status === "online" ? "在线" : "离线"}
            </span>
          </div>
        ))}

        {devices.length === 0 && (
          <div className="text-center py-8 text-gray-500">暂无发现设备</div>
        )}
      </div>
    </div>
  );
};
