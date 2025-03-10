import React from "react";
import NetworkService from "../../components/features/NetworkService/NetworkService";
import TransferStatus from "../../components/features/TransferStatus/TransferStatus";

export const HomePage = () => {
  const networkInfo = {
    currentDevice: "当前在线设备",
    networkStatus: "稳定",
    networkSpeed: "100 Mbps",
    lastUpdate: "2 分钟前",
    connectedDevices: "3/4",
  };

  const transfers = [
    {
      id: "1",
      fileName: "项目设计_最终版.psd",
      fileType: "psd",
      fileSize: 648 * 1024 * 1024,
      transferredSize: 421 * 1024 * 1024,
      speed: "12.4 MB/s",
      direction: "download" as const,
      sourceDevice: "办公室台式机",
      progress: 65,
      timeRemaining: "剩余 45 秒",
    },
    {
      id: "2",
      fileName: "会议记录.docx",
      fileType: "docx",
      fileSize: 9 * 1024 * 1024,
      transferredSize: 7.8 * 1024 * 1024,
      speed: "8.7 MB/s",
      direction: "upload" as const,
      targetDevice: "iPad Pro",
      progress: 87,
      timeRemaining: "剩余 10 秒",
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">仪表盘</h1>
      </div>
      <NetworkService networkInfo={networkInfo} />
      <TransferStatus transfers={transfers} />
    </div>
  );
};
