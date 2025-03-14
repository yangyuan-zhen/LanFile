import React, { useState, useEffect } from "react";
import { X, Folder } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState("network");
  const [heartbeatPort, setHeartbeatPort] = useState(8080);
  const [downloadPath, setDownloadPath] = useState("");
  const [chunkSize, setChunkSize] = useState<number>(16384); // 默认16KB

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

      // 直接获取下载路径（不需要先测试）
      console.log("请求下载路径设置...");
      setDownloadPath("获取中...");

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

  const handleSaveSettings = async () => {
    try {
      // 保存心跳端口
      await window.electron.invoke(
        "heartbeat:setPort",
        parseInt(heartbeatPort.toString())
      );

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
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg">
        {/* 标题栏 */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">设置</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex h-96">
          {/* 左侧导航 */}
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
              </ul>
            </nav>
          </div>

          {/* 右侧内容 */}
          <div className="p-6 w-3/4">
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

            <div className="mt-4">
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

        {/* 底部按钮 */}
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
