import React, { useState, useEffect } from "react";
import { Monitor } from "lucide-react";
import SectionHeader from "../../common/SectionHeader/SectionHeader";
import { useNetworkDevices } from "../../../hooks/useNetworkDevices";
import { useDeviceInfo } from "../../../hooks/useDeviceInfo";
import { useNetworkInfo } from "../../../hooks/useNetworkInfo";

const DeviceList: React.FC = () => {
  const [expanded, setExpanded] = useState(true);
  const { devices, handleNameChange, startScan, isScanning } =
    useNetworkDevices();
  const deviceInfo = useDeviceInfo();
  const networkInfo = useNetworkInfo();
  const [editingDevice, setEditingDevice] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // 修改设备过滤逻辑，保留所有设备
  const filteredDevices = devices;

  // 添加调试日志
  useEffect(() => {
    console.log("DeviceList 渲染 - 当前设备数量:", devices.length);
    devices.forEach((device) => {
      console.log(`- ${device.name} (${device.ip}): ${device.status}`);
    });
  }, [devices]);

  const handleDoubleClick = (device: any) => {
    // 只允许编辑在线设备
    if (isDeviceOnline(device)) {
      setEditingDevice(device.name);
      setEditName(device.name);
    }
  };

  const handleDeviceNameChange = async (device: any) => {
    const newName = editName.trim();
    if (newName && newName !== device.name) {
      await handleNameChange(device, newName);
    }
    setEditingDevice(null);
    setEditName("");
  };

  const handleKeyDown = (e: React.KeyboardEvent, device: any) => {
    if (e.key === "Enter") {
      handleDeviceNameChange(device);
    } else if (e.key === "Escape") {
      setEditingDevice(null);
      setEditName("");
    }
  };

  const isDeviceOnline = (device: any) => {
    // 如果设备状态明确为"在线"，则返回 true
    if (device.status === "在线") return true;

    // 如果设备有 lastSeen 时间戳，检查是否在最近 30 秒内有更新
    if (device.lastSeen) {
      const timeSinceLastSeen = Date.now() - device.lastSeen;
      return timeSinceLastSeen < 30000; // 30 秒内认为是在线的
    }

    return false; // 默认离线
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
            {filteredDevices.length === 0 ? (
              <div className="px-6 py-4 text-center text-gray-500">
                未发现其他设备
              </div>
            ) : (
              <>
                {filteredDevices.map((device) => (
                  <div
                    key={`${device.ip}-${device.name}`}
                    className="flex flex-col px-6 py-2 hover:bg-gray-50"
                  >
                    <div className="flex items-center">
                      <div
                        className={`w-2 h-2 mr-2 rounded-full ${
                          isDeviceOnline(device)
                            ? "bg-green-500"
                            : "bg-gray-300"
                        }`}
                      />
                      <div className="flex-1">
                        <div className="flex items-center">
                          {editingDevice === device.name ? (
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onBlur={() => handleDeviceNameChange(device)}
                              onKeyDown={(e) => handleKeyDown(e, device)}
                              className="flex-1 px-1 text-base rounded border border-blue-500 outline-none"
                              autoFocus
                            />
                          ) : (
                            <span
                              className={`flex-1 text-base ${
                                isDeviceOnline(device) ? "cursor-pointer" : ""
                              }`}
                              onDoubleClick={() => handleDoubleClick(device)}
                              title={
                                isDeviceOnline(device) ? "双击修改设备名称" : ""
                              }
                            >
                              {device.name}
                            </span>
                          )}
                          <span
                            className={`ml-2 text-sm ${
                              isDeviceOnline(device)
                                ? "text-green-500"
                                : "text-gray-400"
                            }`}
                          >
                            {isDeviceOnline(device) ? "在线" : "离线"}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          <div>
                            {device.ip && !device.ip.includes(":")
                              ? device.ip
                              : "未知IP"}
                          </div>
                          {device.lastSeen && (
                            <div>
                              最后在线:{" "}
                              {new Date(device.lastSeen).toLocaleTimeString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeviceList;
