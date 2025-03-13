import React, { useRef } from "react";
import NetworkService from "../../components/features/NetworkService/NetworkService";
import FileList from "../../components/features/FileList/FileList";
import FileUploader from "../../components/features/FileUploader/FileUploader";
import CurrentTransfers from "../../components/features/CurrentTransfers/CurrentTransfers";

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

  // 添加文件列表数据
  const files = [
    {
      id: "1",
      name: "年度报告-Q4-2023.pdf",
      type: "pdf",
      uploadDate: "2023-12-02",
      lastModified: "1小时前",
      size: "1.3 MB",
    },
    {
      id: "2",
      name: "客户满意度调查结果.xlsx",
      type: "xlsx",
      uploadDate: "2023-12-02",
      lastModified: "1小时前",
      size: "2.1 MB",
    },
    {
      id: "3",
      name: "销售演示模板.html",
      type: "html",
      uploadDate: "2023-12-03",
      lastModified: "15分钟前",
      size: "0.8 MB",
    },
  ];

  // 添加文件上传处理函数
  const handleFileSelect = (files: FileList) => {
    console.log("文件已选择，准备上传:", files);
    // 实现文件上传逻辑
  };

  // 添加文件选择状态的引用
  const fileUploaderRef = useRef<HTMLInputElement>(null);

  // 获取已选择的文件
  const getSelectedFiles = () => {
    return fileUploaderRef.current?.files || null;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">仪表盘</h1>
      </div>
      <NetworkService
        networkInfo={networkInfo}
        getSelectedFiles={getSelectedFiles} // 传递获取文件方法
      />
      <CurrentTransfers transfers={transfers} />
      <FileUploader
        ref={fileUploaderRef} // 添加 ref
        onFileSelect={handleFileSelect}
      />
      <FileList files={files} />
    </div>
  );
};
