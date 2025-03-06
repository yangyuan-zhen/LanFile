import React from "react";
import RadarView from "../../DeviceScanner/RadarView";
import { Monitor, Smartphone, Laptop, Tablet } from "lucide-react";
import { useDeviceInfo } from "../../../hooks/useDeviceInfo";
import { useNetworkDevices } from "../../../hooks/useNetworkDevices";

interface NetworkServiceProps {
  networkInfo: {
    currentDevice: string;
    networkStatus: string;
    networkSpeed: string;
    lastUpdate: string;
    connectedDevices: string;
  };
}

const NetworkService: React.FC<NetworkServiceProps> = ({ networkInfo }) => {
  const deviceInfo = useDeviceInfo();
  const { devices } = useNetworkDevices(); // 解构获取 devices

  // 使用 deviceInfo 中的真实设备名称
  const currentDevice = {
    name: deviceInfo.currentDevice.name,
    id: deviceInfo.currentDevice.id,
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* 左侧雷达图 */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 pb-0">
          <h2 className="text-lg font-bold text-gray-900">局域网设备</h2>
        </div>
        <RadarView
          devices={devices.map((device) => ({
            id: device.name, // 使用 name 作为 id
            name: device.name,
            type: device.type,
            icon: device.icon,
            online: device.status === "在线",
            ip: device.ip,
            port: device.port,
          }))}
          currentDevice={currentDevice}
          onViewChange={() => {}}
        />
      </div>

      {/* 右侧网络状态 */}
      <div className="p-6 bg-white rounded-lg shadow-sm">
        <h2 className="mb-6 text-lg font-bold text-gray-900">网络状态</h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-sm text-gray-500">网络状态:</div>
            <div className="text-base font-medium text-green-500">
              {networkInfo.networkStatus}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">网络速度:</div>
            <div className="text-base font-medium">
              {networkInfo.networkSpeed}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">最后扫描:</div>
            <div className="text-base font-medium">
              {networkInfo.lastUpdate}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">设备数量:</div>
            <div className="text-base font-medium">
              {networkInfo.connectedDevices}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkService;
