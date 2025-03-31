import React from "react";
import Logo from "../../common/Logo/Logo";
import CreateFolderButton from "../../common/Button/CreateFolderButton";
import DeviceList from "./DeviceList";
import FileCategories from "./FileCategories";
import {
  useTransferSimulator,
  TransferSimulatorModal,
} from "../../development/TransferSimulatorModal";

const Sidebar: React.FC = () => {
  // 是否为开发环境
  const isDevelopment = process.env.NODE_ENV === "development";

  // 使用传输模拟器弹窗钩子
  const {
    isOpen,
    openTransferSimulator,
    closeTransferSimulator,
    SimulatorButton,
  } = useTransferSimulator();

  return (
    <>
      <div className="flex flex-col w-64 h-screen bg-white border-r">
        <Logo />
        <CreateFolderButton />
        <div className="overflow-y-auto flex-1">
          <DeviceList />
          <FileCategories />

          {/* 开发工具链接 - 仅在开发环境显示 */}
          {isDevelopment && (
            <div className="px-4 mt-6">
              <div className="mb-2 text-sm font-semibold text-gray-400">
                开发工具
              </div>
              {/* 使用SimulatorButton组件打开弹窗，而不是导航到新页面 */}
              <SimulatorButton />
            </div>
          )}
        </div>
      </div>

      {/* 传输模拟器弹窗 */}
      <TransferSimulatorModal
        isOpen={isOpen}
        onClose={closeTransferSimulator}
      />
    </>
  );
};

export default Sidebar;
