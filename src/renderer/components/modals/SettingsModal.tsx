import React, { useState, useRef } from "react";
import { X } from "lucide-react";
import NetworkSettings from "../pages/Settings/NetworkSettings";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState("network");
  const networkSettingsRef = useRef<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      if (activeTab === "network" && networkSettingsRef.current) {
        await networkSettingsRef.current.saveSettings();
      }

      onClose();
    } catch (error) {
      console.error("保存设置失败:", error);
      alert("部分设置保存失败，请重试");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">设置</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex h-96">
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
                      activeTab === "general"
                        ? "bg-blue-50 text-blue-600"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => setActiveTab("general")}
                  >
                    常规设置
                  </button>
                </li>
                <li>
                  <button
                    className={`w-full text-left px-3 py-2 rounded ${
                      activeTab === "advanced"
                        ? "bg-blue-50 text-blue-600"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => setActiveTab("advanced")}
                  >
                    高级设置
                  </button>
                </li>
              </ul>
            </nav>
          </div>

          <div className="w-3/4 p-6 overflow-y-auto">
            {activeTab === "network" && (
              <NetworkSettings ref={networkSettingsRef} />
            )}
            {activeTab === "general" && (
              <div>
                <h3 className="text-lg font-medium mb-4">常规设置</h3>
                <p className="text-gray-500">常规设置内容将在此显示</p>
              </div>
            )}
            {activeTab === "advanced" && (
              <div>
                <h3 className="text-lg font-medium mb-4">高级设置</h3>
                <p className="text-gray-500">高级设置内容将在此显示</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded mr-2 hover:bg-gray-300"
            disabled={isSaving}
          >
            取消
          </button>
          <button
            onClick={handleSaveAll}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            disabled={isSaving}
          >
            {isSaving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
