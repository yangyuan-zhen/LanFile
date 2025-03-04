import React, { useState } from "react";
import { Settings, HelpCircle, RotateCw } from "lucide-react";
import Button from "../../common/Button";
import icon from "../../../../assets/images/icon.svg";

interface HeaderProps {
  currentDevice: string;
  onSettingsClick: () => void;
  onHelpClick: () => void;
}

const Header: React.FC<HeaderProps> = ({
  currentDevice,
  onSettingsClick,
  onHelpClick,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    if (isRefreshing) {
      setIsRefreshing(false);
      return;
    }
    setIsRefreshing(true);
  };

  return (
    <header className="bg-white shadow">
      <div className="flex justify-between items-center px-4 py-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="flex items-center">
          <img src={icon} alt="LanFile" className="mr-3 w-8 h-8" />
          <h1 className="text-2xl font-bold text-gray-900">LanFile</h1>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">当前设备:</span>
            <span className="text-sm font-medium text-gray-900">
              {currentDevice}
            </span>
            <button
              onClick={handleRefresh}
              className="p-1 transition-colors hover:text-blue-500 focus:outline-none"
            >
              <RotateCw
                size={20}
                className={`${
                  isRefreshing ? "text-blue-500 animate-spin" : "text-gray-900"
                }`}
              />
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onSettingsClick}
            className="!p-2"
          >
            <Settings size={20} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onHelpClick}
            className="!p-2"
          >
            <HelpCircle size={20} />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
