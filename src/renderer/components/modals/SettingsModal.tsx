import React, { useState } from "react";
import { X } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState("network");
  const [heartbeatPort, setHeartbeatPort] = useState(8899);

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      await window.electron.invoke("heartbeat:setPort", heartbeatPort);
      onClose();
    } catch (error) {
      console.error("保存设置失败:", error);
      alert("保存设置失败，请重试");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
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
              </ul>
            </nav>
          </div>

          {/* 右侧内容 */}
          <div className="w-3/4 p-6">
            {activeTab === "network" && (
              <div>
                <h3 className="text-lg font-medium mb-4">网络设置</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      心跳服务端口
                    </label>
                    <input
                      type="number"
                      value={heartbeatPort}
                      onChange={(e) => setHeartbeatPort(Number(e.target.value))}
                      className="px-3 py-2 border rounded w-32"
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
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded mr-2 hover:bg-gray-300"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
