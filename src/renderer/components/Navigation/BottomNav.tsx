import React from "react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();

  const handleTabChange = (tab: string, path: string) => {
    onTabChange(tab);
    navigate(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-1px_2px_rgba(0,0,0,0.05)]">
      <div className="flex justify-between items-center px-4 mx-auto max-w-7xl">
        <NavItem
          icon={<Home size={24} strokeWidth={1.5} />}
          label="主页"
          isActive={currentTab === "home"}
          onClick={() => handleTabChange("home", "/")}
        />
        <NavItem
          icon={<Upload size={24} strokeWidth={1.5} />}
          label="发送"
          isActive={currentTab === "send"}
          onClick={() => handleTabChange("send", "/send")}
        />
        <NavItem
          icon={<Download size={24} strokeWidth={1.5} />}
          label="接收"
          isActive={currentTab === "receive"}
          onClick={() => handleTabChange("receive", "/receive")}
        />
        <NavItem
          icon={<Signal size={24} strokeWidth={1.5} />}
          label="状态"
          isActive={currentTab === "status"}
          onClick={() => handleTabChange("status", "/status")}
        />
        <NavItem
          icon={<Settings size={24} strokeWidth={1.5} />}
          label="设置"
          isActive={currentTab === "settings"}
          onClick={() => handleTabChange("settings", "/settings")}
        />
      </div>
    </nav>
  );
};

export default BottomNav;
