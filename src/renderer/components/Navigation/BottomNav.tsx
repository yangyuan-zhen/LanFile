import React from "react";
import {
  HomeIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  SignalIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

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
    <nav className="fixed right-0 bottom-0 left-0 bg-white border-t border-gray-200">
      <div className="flex justify-between items-center px-4 mx-auto max-w-7xl">
        <NavItem
          icon={<HomeIcon />}
          label="主页"
          isActive={currentTab === "home"}
          onClick={() => onTabChange("home")}
        />
        <NavItem
          icon={<ArrowUpTrayIcon />}
          label="发送"
          isActive={currentTab === "send"}
          onClick={() => onTabChange("send")}
        />
        <NavItem
          icon={<ArrowDownTrayIcon />}
          label="接收"
          isActive={currentTab === "receive"}
          onClick={() => onTabChange("receive")}
        />
        <NavItem
          icon={<SignalIcon />}
          label="状态"
          isActive={currentTab === "status"}
          onClick={() => onTabChange("status")}
        />
        <NavItem
          icon={<Cog6ToothIcon />}
          label="设置"
          isActive={currentTab === "settings"}
          onClick={() => onTabChange("settings")}
        />
      </div>
    </nav>
  );
};
