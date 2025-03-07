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

  const handleSend = async () => {
    // TODO: 实现文件发送逻辑
    console.log("Send clicked");
  };

  const handleReceive = async () => {
    // TODO: 实现文件接收逻辑
    console.log("Receive clicked");
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
    <div className="p-4 bg-white rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-900">文件传输</h2>
        <div className="flex space-x-2">
          <button
            onClick={handleSend}
            className="inline-flex items-center px-4 py-2 text-white bg-indigo-600 rounded-md transition-colors hover:bg-indigo-700"
          >
            <ArrowUpTrayIcon className="mr-1 w-4 h-4" />
            发送
          </button>
          <button
            onClick={handleReceive}
            className="inline-flex items-center px-4 py-2 text-gray-700 rounded-md border border-gray-300 transition-colors hover:bg-gray-50"
          >
            <ArrowDownTrayIcon className="mr-1 w-4 h-4" />
            接收
          </button>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200">
        {transfers.length > 0 ? (
          <div className="space-y-3">
            {transfers.map((transfer) => (
              <div
                key={transfer.id}
                className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1 mr-4 min-w-0">
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
          <div className="py-8 text-center text-gray-500">暂无传输任务</div>
        )}
      </div>
    </div>
  );
};
