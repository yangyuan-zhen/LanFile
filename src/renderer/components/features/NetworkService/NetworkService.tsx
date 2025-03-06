import React from "react";
import RadarView from "../../DeviceScanner/RadarView";
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
  const { devices } = useNetworkDevices();

  // 使用 deviceInfo 中的真实设备名称
  const currentDevice = {
    name: deviceInfo.currentDevice.name,
    id: deviceInfo.currentDevice.id,
  };

  const handleScanNetwork = async () => {
    try {
      await window.electron?.network?.startDiscovery();
    } catch (error) {
      console.error("扫描网络失败:", error);
    }
  };

  return (
    <div className="p-6 mb-6 bg-white rounded-xl shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">局域网设备</h3>
      <div className="flex flex-wrap justify-center items-center">
        {/* 左侧雷达图 - 增加高度 */}
        <div className="relative mb-6 w-full h-80 lg:w-2/3 xl:w-1/2">
          <RadarView
            devices={devices.map((device) => ({
              id: device.name,
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
        <div className="pl-0 w-full lg:w-1/3 xl:w-1/2 lg:pl-6">
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">当前在线设备:</span>
            <span className="font-semibold">
              {devices.filter((d) => d.status === "在线").length}/
              {devices.length}
            </span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">网络状态:</span>
            <span className="font-semibold text-green-600">
              {networkInfo.networkStatus || "稳定"}
            </span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">网络速度:</span>
            <span className="font-semibold">
              {networkInfo.networkSpeed || "100 Mbps"}
            </span>
          </div>
          <div className="flex justify-between mb-4">
            <span className="text-gray-600">最后扫描:</span>
            <span className="text-gray-500">
              {networkInfo.lastUpdate || "2 分钟前"}
            </span>
          </div>

          <button
            onClick={handleScanNetwork}
            className="flex justify-center items-center py-2 mt-4 space-x-2 w-full text-white rounded-md transition-all bg-blue-500 hover:bg-blue-600"
          >
            <svg
              className="w-5 h-5 mr-2"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 12h2a8 8 0 0 1 8-8V2"></path>
              <path d="M22 12h-2a8 8 0 0 1-8 8v2"></path>
              <path d="M8 16l4 4 4-4"></path>
              <path d="M16 8l-4-4-4 4"></path>
            </svg>
            <span>重新扫描网络</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NetworkService;
