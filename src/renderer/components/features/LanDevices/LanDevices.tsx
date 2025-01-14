import React from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import Card from "../../common/Card";
import Button from "../../common/Button";

interface Device {
  name: string;
  status: "online" | "offline";
}

interface LanDevicesProps {
  devices: Device[];
  onRefresh: () => void;
  onDeviceSelect: (device: Device) => void;
}

const LanDevices: React.FC<LanDevicesProps> = ({
  devices,
  onRefresh,
  onDeviceSelect,
}) => {
  return (
    <Card>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">局域网设备</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          className="!p-2"
        >
          <ArrowPathIcon className="h-5 w-5" />
        </Button>
      </div>

      <div className="space-y-2">
        {devices.map((device, index) => (
          <div
            key={index}
            onClick={() => onDeviceSelect(device)}
            className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-md 
              hover:bg-gray-100 cursor-pointer transition-colors"
          >
            <span className="text-gray-900">{device.name}</span>
            <span
              className={`px-2 py-1 text-xs rounded-full ${
                device.status === "online"
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {device.status === "online" ? "在线" : "离线"}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default LanDevices;
