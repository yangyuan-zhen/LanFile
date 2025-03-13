import React from "react";
import { Progress } from "../../common/Progress/Progress";

interface TransferItem {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  transferredSize: number;
  speed: string;
  direction: "download" | "upload";
  sourceDevice?: string;
  targetDevice?: string;
  progress: number;
  timeRemaining: string;
}

interface StorageInfo {
  used: number; // 已使用空间（GB）
  total: number; // 总空间（GB）
  fileTypes: {
    name: string; // 文件类型名称
    color: string; // 颜色（CSS 类名）
  }[];
}

interface TransferStatusProps {
  transfers: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    progress: number;
    status: "pending" | "transferring" | "completed" | "error";
    direction: "upload" | "download";
    peerId: string;
  }>;
  className?: string;
}

export const TransferStatus: React.FC<TransferStatusProps> = ({
  transfers,
  className = "",
}) => {
  if (transfers.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-lg font-medium">文件传输状态</h3>
      <div className="space-y-2">
        {transfers.map((transfer) => (
          <div
            key={transfer.id}
            className="p-3 bg-gray-50 rounded-md shadow-sm"
          >
            <div className="flex justify-between">
              <span
                className="font-medium truncate max-w-[70%]"
                title={transfer.name}
              >
                {transfer.name}
              </span>
              <span className="text-sm text-gray-500">
                {(transfer.size / 1024 / 1024).toFixed(2)} MB
                {" · "}
                {transfer.direction === "upload" ? "发送" : "接收"}
              </span>
            </div>
            <Progress value={transfer.progress} max={100} className="mt-2" />
            <div className="flex justify-between mt-1 text-sm">
              <span>
                {transfer.status === "pending" && "准备中..."}
                {transfer.status === "transferring" && `${transfer.progress}%`}
                {transfer.status === "completed" && "已完成"}
                {transfer.status === "error" && "传输失败"}
              </span>
              <span className="text-gray-500">{transfer.type}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransferStatus;
