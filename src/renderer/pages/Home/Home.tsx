import React, { useState } from "react";
import RadarView from "../../components/DeviceScanner/RadarView";
import { useDeviceInfo } from "../../hooks/useDeviceInfo";
import { Device } from "../../types/electron";

export const HomePage: React.FC = () => {
  const [viewMode, setViewMode] = useState<"radar" | "list">("radar");
  const { deviceName } = useDeviceInfo();
  const [devices, setDevices] = useState<Device[]>([]); // 这里可以用 hook 获取实际设备

  // 确保 currentDevice 有正确的名称
  console.log("Current device name:", deviceName); // 添加调试日志

  const currentDevice = {
    name: deviceName || "未知设备", // 添加默认值
    id: "current",
  };

  const handleViewChange = (view: "radar" | "list") => {
    setViewMode(view);
  };

  return (
    <div className="p-4">
      {viewMode === "radar" ? (
        <RadarView
          devices={devices}
          currentDevice={currentDevice}
          onViewChange={handleViewChange}
        />
      ) : (
        <div>
          {/* 这里可以放设备列表视图组件 */}
          列表视图开发中...
        </div>
      )}
    </div>
  );
};
