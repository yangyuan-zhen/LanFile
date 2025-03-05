import React, { useState } from "react";
import { Monitor } from "lucide-react";
import SectionHeader from "../../common/SectionHeader/SectionHeader";

const DeviceList: React.FC = () => {
  const [expanded, setExpanded] = useState(true);
  const devices = [
    { name: "我的笔记本", status: "在线" },
    { name: "办公室台式机", status: "在线" },
    { name: "iPhone 13", status: "离线" },
    { name: "iPad Pro", status: "在线" },
  ];

  return (
    <div className="mb-2">
      <div className="flex items-center px-6 py-2 text-base text-gray-600">
        <Monitor className="mr-2 w-4 h-4" />
        仪表盘
      </div>
      <div>
        <SectionHeader
          title="网络设备"
          expanded={expanded}
          onToggle={() => setExpanded(!expanded)}
        />
        {expanded && (
          <div>
            {devices.map((device) => (
              <div
                key={device.name}
                className="flex items-center px-6 py-2 text-base hover:bg-gray-50"
              >
                <div className="flex items-center">
                  <div
                    className={`w-2 h-2 mr-2 rounded-full ${
                      device.status === "在线" ? "bg-green-500" : "bg-gray-300"
                    }`}
                  />
                  {device.name}
                </div>
                <span
                  className={`ml-auto text-sm ${
                    device.status === "在线"
                      ? "text-green-500"
                      : "text-gray-400"
                  }`}
                >
                  {device.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeviceList;
