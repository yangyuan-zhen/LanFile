import React from "react";
import Sidebar from "../Sidebar/Sidebar";
import SearchBar from "../../common/SearchBar/SearchBar";
import { Settings } from "lucide-react";

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部搜索栏 */}
        <div className="flex items-center px-6 py-4 bg-white border-b border-gray-200">
          <div className="flex-1 px-4 max-w-md">
            <SearchBar onSearch={console.log} />
          </div>
          <div className="flex items-center ml-4">
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
