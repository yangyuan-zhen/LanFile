import React from "react";
import { Home, Upload, Download, Signal, Settings } from "lucide-react";

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({
  icon,
  label,
  isActive,
  onClick,
}) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center flex-1 py-2 space-y-1 ${
      isActive ? "text-blue-500" : "text-gray-500"
    }`}
  >
    <div className="w-6 h-6">{icon}</div>
    <span className="text-xs">{label}</span>
  </button>
);

interface BottomNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onTabChange,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
      <div className="flex items-center justify-between px-4 mx-auto max-w-7xl">
        <NavItem
          icon={<Home size={24} strokeWidth={1.5} />}
          label="主页"
          isActive={currentTab === "home"}
          onClick={() => onTabChange("home")}
        />
        <NavItem
          icon={<Upload size={24} strokeWidth={1.5} />}
          label="发送"
          isActive={currentTab === "send"}
          onClick={() => onTabChange("send")}
        />
        <NavItem
          icon={<Download size={24} strokeWidth={1.5} />}
          label="接收"
          isActive={currentTab === "receive"}
          onClick={() => onTabChange("receive")}
        />
        <NavItem
          icon={<Signal size={24} strokeWidth={1.5} />}
          label="状态"
          isActive={currentTab === "status"}
          onClick={() => onTabChange("status")}
        />
        <NavItem
          icon={<Settings size={24} strokeWidth={1.5} />}
          label="设置"
          isActive={currentTab === "settings"}
          onClick={() => onTabChange("settings")}
        />
      </div>
    </nav>
  );
};
