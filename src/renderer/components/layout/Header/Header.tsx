import React from "react";
import {
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import Button from "../../common/Button";
import icon from "@assets/images/icon.svg";

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
  return (
    <header className="bg-white shadow">
      <div className="flex justify-between items-center px-4 py-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="flex items-center">
          <img src={icon} alt="LanFile" className="mr-3 w-8 h-8" />
          <h1 className="text-2xl font-bold text-gray-900">LanFile_PC</h1>
        </div>

        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">
            当前设备: {currentDevice}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onSettingsClick}
            className="!p-2"
          >
            <Cog6ToothIcon className="w-5 h-5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onHelpClick}
            className="!p-2"
          >
            <QuestionMarkCircleIcon className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
