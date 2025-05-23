import React, { useState } from "react";
import { Settings } from "lucide-react";
import Sidebar from "../Sidebar/Sidebar";
import SearchBar from "../../common/SearchBar/SearchBar";
import SettingsModal from "../../modals/SettingsModal";
import NotificationDropdown from "../../common/NotificationDropdown/NotificationDropdown";

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <div className="flex overflow-hidden flex-col flex-1">
        {/* 顶部搜索栏 */}
        <div className="flex justify-between items-center px-6 py-4 bg-white border-b border-gray-200">
          <div className="w-96">
            <SearchBar onSearch={console.log} />
          </div>
          <div className="flex items-center space-x-4">
            <NotificationDropdown />
            <button
              className="p-2 text-gray-400 hover:text-gray-600"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="w-5 h-5" />
            </button>
            <div className="flex items-center">
              <img
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                alt="用户头像"
                className="w-8 h-8 rounded-full"
              />
            </div>
          </div>
        </div>

        {/* 内容区域 */}
        <main className="overflow-y-auto overflow-x-hidden flex-1 bg-gray-50">
          {children}
        </main>
      </div>

      {/* 设置弹窗 */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
};

export default MainLayout;
