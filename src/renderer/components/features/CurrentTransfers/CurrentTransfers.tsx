import React, { useState } from "react";
import FileTransferCard from "../FileTransferCard/FileTransferCard";

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

interface CurrentTransfersProps {
  transfers: TransferItem[];
}

export const CurrentTransfers: React.FC<CurrentTransfersProps> = ({
  transfers,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferItem | null>(
    null
  );

  const handleTransferClick = (transfer: TransferItem) => {
    setSelectedTransfer(transfer);
    setShowDetails(true);
  };

  const closeDetails = () => {
    setShowDetails(false);
  };

  if (transfers.length === 0) {
    return null;
  }

  return (
    <>
      <div className="p-6 mb-6 bg-white rounded-xl shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-800">当前传输</h3>

        {transfers.map((transfer) => (
          <FileTransferCard
            key={transfer.id}
            {...transfer}
            onClick={() => handleTransferClick(transfer)}
          />
        ))}
      </div>

      {/* 传输详情弹窗 */}
      {showDetails && (
        <div className="fixed right-8 bottom-8 z-30 p-4 w-80 bg-white rounded-lg border border-gray-200 shadow-xl">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold text-gray-800">传输详情</h4>
            <button
              onClick={closeDetails}
              className="text-gray-500 hover:text-gray-700"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="mb-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">文件名称:</span>
              <span className="font-medium">{selectedTransfer?.fileName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">传输速度:</span>
              <span className="font-medium">{selectedTransfer?.speed}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">剩余时间:</span>
              <span className="font-medium">
                {selectedTransfer?.timeRemaining}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">已传输:</span>
              <span className="font-medium">
                {(selectedTransfer?.transferredSize || 0) / (1024 * 1024)} MB /{" "}
                {(selectedTransfer?.fileSize || 0) / (1024 * 1024)} MB
              </span>
            </div>
          </div>

          <div className="pt-3 mb-3 border-t border-gray-200">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">传输类型:</span>
              <span className="font-medium">
                {selectedTransfer?.direction === "download" ? "下载" : "上传"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                {selectedTransfer?.direction === "download" ? "来源:" : "目标:"}
              </span>
              <span className="font-medium">
                {selectedTransfer?.direction === "download"
                  ? selectedTransfer?.sourceDevice
                  : selectedTransfer?.targetDevice}
              </span>
            </div>
          </div>

          <button
            className="flex justify-center items-center py-2 w-full text-white bg-red-500 rounded transition-colors hover:bg-red-600"
            onClick={closeDetails}
          >
            <i className="mr-1 fas fa-times-circle"></i>
            <span>关闭详情</span>
          </button>
        </div>
      )}
    </>
  );
};

export default CurrentTransfers;
