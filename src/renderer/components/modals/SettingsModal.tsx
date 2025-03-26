import React, { useState, useEffect } from "react";
import { X, Folder } from "lucide-react";
import { WebRTCDiagnostics } from "../diagnostics/WebRTCDiagnostics";
import { usePeerJS } from "../../hooks/usePeerJS";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState("network");
  const [heartbeatPort, setHeartbeatPort] = useState(8080);
  const [signalingPort, setSignalingPort] = useState(8092);
  const [downloadPath, setDownloadPath] = useState("");
  const [chunkSize, setChunkSize] = useState<number>(16384); // 默认16KB
  const [detectedPorts, setDetectedPorts] = useState<string[]>([]);

  const { isReady: peerJSReady, deviceId } = usePeerJS();

  // 组件加载时获取当前设置
  useEffect(() => {
    if (isOpen) {
      // 获取心跳端口设置
      window.electron
        .invoke("heartbeat:getPort")
        .then((port: number) => {
          setHeartbeatPort(port || 8080);
        })
        .catch((error: Error) => {
          console.error("获取心跳端口设置失败:", error);
        });

      // 获取信令服务端口
      window.electron
        .invoke("signaling:getPort")
        .then((port: number) => {
          setSignalingPort(port || 8092);
        })
        .catch((error: Error) => {
          console.error("获取信令端口设置失败:", error);
          // 如果API不存在，使用默认值
          setSignalingPort(8092);
        });

      // 扫描局域网中的活跃端口
      scanNetworkPorts();

      // 获取下载路径
      window.electron
        .invoke("settings:getDownloadPath")
        .then((path: string) => {
          console.log("获取到下载路径:", path);
          if (path && typeof path === "string" && path.length > 0) {
            setDownloadPath(path);
          } else {
            setDownloadPath("使用系统默认下载文件夹");
          }
        })
        .catch((error: Error) => {
          console.error("获取下载路径失败:", error);
          setDownloadPath("使用系统默认下载文件夹");
        });

      // 获取分块大小设置
      window.electron
        .invoke("settings:get")
        .then((settings: any) => {
          if (settings?.chunkSize) {
            setChunkSize(settings.chunkSize);
          }
        })
        .catch((error: Error) => {
          console.error("获取分块大小设置失败:", error);
        });
    }
  }, [isOpen]);

  // 修改扫描网络端口方法以处理未实现的后端API
  const scanNetworkPorts = async () => {
    try {
      // 检查是否实现了获取设备的API
      try {
        const devices = await window.electron.invoke(
          "mdns:getDiscoveredDevices"
        );

        // 提取并存储所有检测到的设备的端口
        const ports: string[] = [];
        if (Array.isArray(devices)) {
          devices.forEach((device: any) => {
            if (device.port && !ports.includes(String(device.port))) {
              ports.push(String(device.port));
            }
            if (
              device.signalingPort &&
              !ports.includes(String(device.signalingPort))
            ) {
              ports.push(String(device.signalingPort));
            }
          });

          setDetectedPorts(ports);
        }
      } catch (error) {
        // 如果API未实现，使用备用方法
        console.log("端口扫描API未实现，使用备用方案");
        // 添加常用端口作为备选
        setDetectedPorts(["8092", "8102", "8112"]);
      }
    } catch (error) {
      console.error("扫描网络端口失败:", error);
    }
  };

  if (!isOpen) return null;

  // 选择下载文件夹
  const handleSelectDownloadFolder = async () => {
    try {
      const result = await window.electron.invoke("dialog:openDirectory");
      console.log("文件保存路径选择结果:", result);

      if (
        result &&
        !result.canceled &&
        result.filePaths &&
        result.filePaths.length > 0
      ) {
        // 使用数组的第一个元素，因为 showOpenDialog 返回的是文件路径数组
        setDownloadPath(result.filePaths[0]);
      }
    } catch (error) {
      console.error("选择文件保存路径失败:", error);
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      alert(`选择文件保存路径失败: ${errorMessage}`);
    }
  };

  // 修改保存设置方法处理未实现的API
  const handleSaveSettings = async () => {
    try {
      // 保存心跳端口
      await window.electron.invoke(
        "heartbeat:setPort",
        parseInt(heartbeatPort.toString())
      );

      // 尝试保存信令端口
      try {
        await window.electron.invoke(
          "signaling:setPort",
          parseInt(signalingPort.toString())
        );
      } catch (error) {
        console.warn("信令端口设置API未实现，无法保存信令端口设置", error);
        // 显示友好提示
        alert("注意：信令端口设置未保存，请手动配置或等待下一版本支持。");
      }

      // 保存下载路径
      if (downloadPath && downloadPath !== "使用系统默认下载文件夹") {
        await window.electron.invoke("settings:setDownloadPath", downloadPath);
      }

      // 保存分块大小
      await window.electron.invoke("settings:save", {
        chunkSize,
      });

      onClose();
    } catch (error) {
      console.error("保存设置失败:", error);
    }
  };

  // 预设的分块大小选项
  const chunkSizeOptions = [
    { label: "4KB (网络较差)", value: 4096 },
    { label: "16KB (默认)", value: 16384 },
    { label: "64KB (网络良好)", value: 65536 },
    { label: "256KB (局域网)", value: 262144 },
  ];

  return (
    <div className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-50">
      <div className="flex overflow-hidden flex-col w-4/5 max-w-4xl bg-white rounded-lg shadow-lg">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-medium">设置</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex overflow-hidden flex-1">
          <div className="w-1/4 border-r">
            <nav className="p-4">
              <ul className="space-y-2">
                <li>
                  <button
                    className={`w-full text-left px-3 py-2 rounded ${
                      activeTab === "network"
                        ? "bg-blue-50 text-blue-600"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => setActiveTab("network")}
                  >
                    网络设置
                  </button>
                </li>
                <li>
                  <button
                    className={`w-full text-left px-3 py-2 rounded ${
                      activeTab === "download"
                        ? "bg-blue-50 text-blue-600"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => setActiveTab("download")}
                  >
                    下载设置
                  </button>
                </li>
                <li>
                  <button
                    className={`w-full text-left px-3 py-2 rounded ${
                      activeTab === "diagnostics"
                        ? "bg-blue-50 text-blue-600"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => setActiveTab("diagnostics")}
                  >
                    网络诊断
                  </button>
                </li>
              </ul>
            </nav>
          </div>

          <div
            className="overflow-y-auto p-6 w-3/4"
            style={{ maxHeight: "calc(80vh - 130px)" }}
          >
            {activeTab === "network" && (
              <div>
                <h3 className="mb-4 text-lg font-medium">网络设置</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block mb-1 text-sm font-medium">
                      心跳服务端口
                    </label>
                    <input
                      type="number"
                      value={heartbeatPort}
                      onChange={(e) => setHeartbeatPort(Number(e.target.value))}
                      className="px-3 py-2 w-32 rounded border"
                      min="1024"
                      max="65535"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      用于检测其他设备上的 LanFile 是否正在运行
                    </p>
                  </div>

                  <div>
                    <label className="block mb-1 text-sm font-medium">
                      信令服务端口
                    </label>
                    <div className="flex items-center">
                      <input
                        type="number"
                        value={signalingPort}
                        onChange={(e) =>
                          setSignalingPort(Number(e.target.value))
                        }
                        className="px-3 py-2 w-32 rounded border"
                        min="1024"
                        max="65535"
                      />
                      {detectedPorts.length > 0 && (
                        <div className="ml-4">
                          <span className="text-sm text-gray-600">
                            检测到的端口:{" "}
                          </span>
                          {detectedPorts.map((port, index) => (
                            <span
                              key={port}
                              className={`cursor-pointer px-2 py-1 rounded ml-1 text-sm
                                ${
                                  port === signalingPort.toString()
                                    ? "bg-green-100 text-green-700"
                                    : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                                }`}
                              onClick={() => setSignalingPort(Number(port))}
                            >
                              {port}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      用于WebRTC连接建立所需的信令交换。
                      <span className="text-red-500">
                        注意: 必须与其他设备一致才能建立连接！
                      </span>
                    </p>
                  </div>

                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      文件传输分块大小
                    </label>
                    <select
                      value={chunkSize}
                      onChange={(e) => setChunkSize(Number(e.target.value))}
                      className="block px-3 py-2 w-full rounded-md border border-gray-300 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      {chunkSizeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      较小的分块大小适合不稳定网络，较大的分块大小提高传输速度
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "download" && (
              <div>
                <h3 className="mb-4 text-lg font-medium">下载设置</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block mb-1 text-sm font-medium">
                      下载位置
                    </label>
                    <div className="flex items-center mb-1">
                      <p className="flex-1 mr-2 text-sm text-gray-700 truncate">
                        {downloadPath}
                      </p>
                      <button
                        onClick={handleSelectDownloadFolder}
                        className="flex items-center p-2 text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
                        title="选择下载文件夹"
                      >
                        <Folder size={16} className="mr-1" />
                        <span>浏览...</span>
                      </button>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      从其他设备接收的文件将保存在此文件夹中
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "diagnostics" && (
              <div>
                <h3 className="mb-4 text-lg font-medium">网络诊断工具</h3>
                <p className="mb-4 text-sm text-gray-600">
                  使用此工具检测您的网络环境是否支持 WebRTC 连接和 NAT 穿透。
                  这有助于确定文件传输可能遇到的问题。
                </p>
                <WebRTCDiagnostics />

                <div className="p-4 mt-6 bg-gray-50 rounded-md">
                  <h4 className="mb-2 font-medium text-md">信令服务端口检测</h4>
                  <p className="mb-2 text-sm text-gray-600">
                    这些是在局域网中检测到的其他LanFile设备使用的端口：
                  </p>
                  {detectedPorts.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {detectedPorts.map((port) => (
                        <div
                          key={port}
                          className="px-3 py-1 text-blue-700 bg-blue-50 rounded"
                        >
                          {port} {port === signalingPort.toString() && "(当前)"}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      未检测到其他设备的端口
                    </p>
                  )}
                  <p className="mt-3 text-sm text-amber-600">
                    <strong>提示：</strong>{" "}
                    确保所有设备使用相同的信令端口才能建立连接
                  </p>
                </div>

                <div className="setting-item">
                  <h3>PeerJS 连接</h3>
                  <div className="status-indicator">
                    状态: {peerJSReady ? "已就绪" : "初始化中"}
                  </div>
                  <div className="info-text">
                    设备 ID: {deviceId || "未初始化"}
                  </div>
                  {/* 可能的 PeerJS 配置选项 */}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 mr-2 text-gray-800 bg-gray-200 rounded hover:bg-gray-300"
          >
            取消
          </button>
          <button
            onClick={handleSaveSettings}
            className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
