import React, { useEffect, useState } from "react";
import { useNetworkDevices } from "../../../hooks/useNetworkDevices";

const DeviceList = () => {
  const { devices, isScanning } = useNetworkDevices();

  if (isScanning) return <div>扫描中...</div>;
  if (!devices || devices.length === 0) return <div>未发现设备</div>;

  return (
    <div>
      {devices.map((device) => (
        <div key={device?.ip || "unknown"}>{device?.name || "未知设备"}</div>
      ))}
    </div>
  );
};

export default DeviceList;
