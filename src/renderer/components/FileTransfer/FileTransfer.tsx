import React, { useState } from "react";
import {
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";

interface FileTransferItem {
  id: string;
  name: string;
  status: "pending" | "transferring" | "completed" | "error";
  progress: number;
}

export const FileTransfer: React.FC = () => {
  const [transfers, setTransfers] = useState<FileTransferItem[]>([]);

  const handleUpload = async () => {
    // TODO: 实现文件上传逻辑
    console.log("Upload clicked");
  };

  const handleDownload = async () => {
    // TODO: 实现文件下载逻辑
    console.log("Download clicked");
  };

  const getStatusColor = (status: FileTransferItem["status"]) => {
    switch (status) {
      case "completed":
        return "text-green-500";
      case "error":
        return "text-red-500";
      case "transferring":
        return "text-blue-500";
      default:
        return "text-gray-500";
    }
  };

  const getStatusText = (status: FileTransferItem["status"]) => {
    switch (status) {
      case "completed":
        return "已完成";
      case "error":
        return "错误";
      case "transferring":
        return "传输中";
      default:
        return "等待中";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-900">文件传输</h2>
        <div className="flex space-x-2">
          <button
            onClick={handleUpload}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            <ArrowUpTrayIcon className="w-4 h-4 mr-1" />
            上传
          </button>
          <button
            onClick={handleDownload}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
            下载
          </button>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4">
        {transfers.length > 0 ? (
          <div className="space-y-3">
            {transfers.map((transfer) => (
              <div
                key={transfer.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {transfer.name}
                    </span>
                    <span
                      className={`text-xs ${getStatusColor(transfer.status)}`}
                    >
                      {getStatusText(transfer.status)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${transfer.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">暂无传输任务</div>
        )}
      </div>
    </div>
  );
};
