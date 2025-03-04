import React, { useState } from "react";
import RadarView from "./RadarView";

interface Device {
  id: string;
  name: string;
  status: "online" | "offline";
}

const RadarDemo: React.FC = () => {
  const [viewMode, setViewMode] = useState<"radar" | "list">("radar");

  // 模拟当前设备
  const currentDevice = {
    name: "Current Device 13",
    id: "current-device-id",
  };

  // 模拟设备列表
  const mockDevices: Device[] = [
    { id: "device-1", name: "Windows PC", status: "online" },
    { id: "device-2", name: "iPad Air", status: "online" },
    { id: "device-3", name: "iPhone 13", status: "online" },
    { id: "device-4", name: "MacBook Pro", status: "online" },
  ];

  const handleViewChange = (view: "radar" | "list") => {
    setViewMode(view);
  };

  return (
    <div className="p-6 mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">设备雷达</h1>

      <div className="p-6 bg-white rounded-lg shadow-sm">
        {viewMode === "radar" ? (
          <RadarView
            devices={mockDevices.map((device) => ({
              ...device,
              ip: "192.168.1.1", // 添加默认IP
              port: 8080, // 添加默认端口
            }))}
            currentDevice={currentDevice}
            onViewChange={handleViewChange}
          />
        ) : (
          <div className="space-y-2">
            {mockDevices.map((device) => (
              <div
                key={device.id}
                className="flex justify-between items-center p-3 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100"
              >
                <span>{device.name}</span>
                <span className="px-2 py-1 text-xs text-green-800 bg-green-100 rounded-full">
                  在线
                </span>
              </div>
            ))}

            <div className="flex justify-center mt-4">
              <button
                className="px-4 py-2 mr-2 text-gray-600 bg-gray-300 rounded-md hover:bg-gray-400"
                onClick={() => handleViewChange("radar")}
              >
                雷达
              </button>
              <button
                className="px-4 py-2 text-white bg-blue-500 rounded-md"
                disabled
              >
                列表
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RadarDemo;
