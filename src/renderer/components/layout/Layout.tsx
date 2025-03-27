import React from "react";
import NotificationDropdown from "../common/NotificationDropdown/NotificationDropdown";

export const Layout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <div className="flex flex-col min-h-screen">
      {/* 页面头部 */}
      <header className="px-4 py-2 bg-white border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h1 className="text-lg font-semibold">LanFile</h1>
          <div className="flex items-center">
            <NotificationDropdown />
            {/* 其他导航项 */}
          </div>
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="flex-1">{children}</main>
    </div>
  );
};

export default Layout;
