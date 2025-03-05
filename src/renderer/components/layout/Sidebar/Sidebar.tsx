import React from "react";
import Logo from "../../common/Logo/Logo";
import CreateFolderButton from "../../common/Button/CreateFolderButton";
import DeviceList from "./DeviceList";
import FileCategories from "./FileCategories";

const Sidebar: React.FC = () => {
  return (
    <div className="flex flex-col w-64 h-screen bg-white border-r">
      <Logo />
      <CreateFolderButton />
      <div className="overflow-y-auto flex-1">
        <DeviceList />
        <FileCategories />
      </div>
    </div>
  );
};

export default Sidebar;
