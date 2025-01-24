import React, { useEffect, useState } from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { Device } from "../../types/electron";
import { DeviceScanner } from "../DeviceScanner/DeviceScanner";

interface DeviceWithStatus extends Device {
  status: "online" | "offline";
}

export const DeviceList: React.FC = () => {
  const [devices, setDevices] = useState<DeviceWithStatus[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("DeviceList mounted");
    console.log("Window electron object:", window.electron);

    if (window.electron?.test?.ping) {
      console.log("Test ping result:", window.electron.test.ping());
    } else {
      console.error("Test API not available");
    }

    // 设置设备发现监听器
    const unsubscribe = window.electron?.network?.onDeviceFound((device) => {
      handleDeviceFound(device);
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  const handleRefresh = async () => {
    console.log("Refresh clicked");
    try {
      if (!window.electron?.network) {
        throw new Error("Network API not available");
      }

      setIsRefreshing(true);
      const localService = await window.electron.network.getLocalService();
      console.log("Local service:", localService);

      setDevices([
        {
          id: localService.id,
          name: localService.name,
          ip: localService.ip,
          port: localService.port,
          status: "online",
        },
      ]);
    } catch (error: unknown) {
      console.error("Refresh error:", error);
      setError(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDeviceFound = (device: Device) => {
    console.log("Device found:", device);
    setDevices((prev) => {
      const exists = prev.some((d) => d.id === device.id);
      if (exists) {
        return prev.map((d) =>
          d.id === device.id ? { ...d, status: "online" } : d
        );
      }
      return [...prev, { ...device, status: "online" }];
    });
  };

  const handleScanningChange = (scanning: boolean) => {
    setIsScanning(scanning);
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
            onClick={handleRefresh}
            className="p-2 rounded-full transition-colors hover:bg-gray-100"
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
              className="flex justify-between items-center p-3 rounded-lg transition-colors hover:bg-gray-50"
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
            <div className="py-8 text-center text-gray-500">暂无发现设备</div>
          )}
        </div>
      </div>

      <DeviceScanner
        isScanning={isScanning}
        onDeviceFound={handleDeviceFound}
        onScanningChange={handleScanningChange}
      />
    </div>
  );
};
