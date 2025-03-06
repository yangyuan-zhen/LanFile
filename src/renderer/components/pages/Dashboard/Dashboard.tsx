import React from "react";
import NetworkService from "../../features/NetworkService/NetworkService";
import TransferStatus from "../../features/TransferStatus/TransferStatus";

const Dashboard: React.FC = () => {
  // 示例数据
  const networkInfo = {
    currentDevice: "我的电脑",
    networkStatus: "稳定",
    networkSpeed: "100 Mbps",
    lastUpdate: "2 分钟前",
    connectedDevices: "4 台",
  };

  // 修复这里的传输数据类型
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
      <NetworkService networkInfo={networkInfo} />
      <TransferStatus transfers={transfers} />
    </div>
  );
};

export default Dashboard;
