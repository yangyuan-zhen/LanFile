import React, { useState } from "react";
import RadarView from "../../components/DeviceScanner/RadarView";
import { useDeviceInfo } from "../../hooks/useDeviceInfo";
import { Device } from "../../types/electron";

export const HomePage: React.FC = () => {
  const [viewMode, setViewMode] = useState<"radar" | "list">("radar");
  const { currentDevice } = useDeviceInfo();
  const [devices, setDevices] = useState<Device[]>([]);

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
        <div>列表视图开发中...</div>
      )}
    </div>
  );
};
