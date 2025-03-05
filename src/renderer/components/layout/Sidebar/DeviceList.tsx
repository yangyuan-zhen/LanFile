import React, { useState } from "react";
import { Monitor } from "lucide-react";
import SectionHeader from "../../common/SectionHeader/SectionHeader";
import { useNetworkDevices } from "../../../hooks/useNetworkDevices";

const DeviceList: React.FC = () => {
  const [expanded, setExpanded] = useState(true);
  const devices = useNetworkDevices();
  const [editingDevice, setEditingDevice] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleDoubleClick = (device: any) => {
    if (device.status === "在线") {
      // 只允许编辑在线设备
      setEditingDevice(device.name);
      setEditName(device.name);
    }
  };

  const handleNameChange = async (device: any) => {
    if (editName.trim() && editName !== device.name) {
      try {
        await window.electron.invoke("system:setDeviceName", editName);
        // 更新本地设备列表中的名称
        window.electron.invoke("system:updateDeviceName", {
          oldName: device.name,
          newName: editName,
        });
      } catch (error) {
        console.error("Failed to update device name:", error);
      }
    }
    setEditingDevice(null);
  };

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
                className="flex flex-col px-6 py-2 hover:bg-gray-50"
              >
                <div className="flex items-center">
                  <div
                    className={`w-2 h-2 mr-2 rounded-full ${
                      device.status === "在线" ? "bg-green-500" : "bg-gray-300"
                    }`}
                  />
                  <div className="flex-1">
                    <div className="flex items-center">
                      {editingDevice === device.name ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={() => handleNameChange(device)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleNameChange(device);
                            } else if (e.key === "Escape") {
                              setEditingDevice(null);
                            }
                          }}
                          className="flex-1 px-1 text-base border rounded outline-none"
                          autoFocus
                        />
                      ) : (
                        <span
                          className={`flex-1 text-base ${
                            device.status === "在线" ? "cursor-pointer" : ""
                          }`}
                          onDoubleClick={() => handleDoubleClick(device)}
                        >
                          {device.name}
                        </span>
                      )}
                      <span
                        className={`ml-2 text-sm ${
                          device.status === "在线"
                            ? "text-green-500"
                            : "text-gray-400"
                        }`}
                      >
                        {device.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">{device.ip}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeviceList;
