import React from "react";

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

interface TransferStatusProps {
  transfers: TransferItem[];
}

const TransferStatus: React.FC<TransferStatusProps> = ({ transfers = [] }) => {
  // 如果没有传输任务，不显示组件
  if (transfers.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 bg-white rounded-xl shadow-sm">
      <div className="p-4 pb-2 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">当前传输</h3>
      </div>

      <div className="p-4">
        {transfers.map((transfer) => (
          <div key={transfer.id} className="mb-5 last:mb-0">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center">
                {transfer.direction === "download" ? (
                  <div className="flex justify-center items-center mr-2 w-8 h-8 bg-blue-100 rounded-full">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-blue-600"
                    >
                      <path
                        d="M12 16L12 8M12 16L9 13M12 16L15 13"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M3 15C3 17.8284 3 19.2426 3.87868 20.1213C4.75736 21 6.17157 21 9 21H15C17.8284 21 19.2426 21 20.1213 20.1213C21 19.2426 21 17.8284 21 15"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                ) : (
                  <div className="flex justify-center items-center mr-2 w-8 h-8 bg-green-100 rounded-full">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-green-600"
                    >
                      <path
                        d="M12 8L12 16M12 8L9 11M12 8L15 11"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M3 15C3 17.8284 3 19.2426 3.87868 20.1213C4.75736 21 6.17157 21 9 21H15C17.8284 21 19.2426 21 20.1213 20.1213C21 19.2426 21 17.8284 21 15"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}
                <div>
                  <div className="font-medium text-gray-800">
                    {transfer.fileName}
                  </div>
                  <div className="text-sm text-gray-500">
                    {transfer.direction === "download"
                      ? `从 ${transfer.sourceDevice} 下载`
                      : `上传至 ${transfer.targetDevice}`}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">
                  {transfer.direction === "download" ? (
                    <span className="text-blue-600">{transfer.speed}</span>
                  ) : (
                    <span className="text-green-600">{transfer.speed}</span>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {transfer.timeRemaining}
                </div>
              </div>
            </div>

            <div className="relative h-5 mb-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`absolute top-0 left-0 h-full rounded-full ${
                  transfer.direction === "download"
                    ? "bg-blue-500 progress-bar-animated"
                    : "bg-green-500 progress-bar-animated"
                }`}
                style={{ width: `${transfer.progress}%` }}
              ></div>
              <div className="absolute top-0 left-0 flex justify-center items-center w-full h-full">
                <span className="text-xs font-semibold text-white">
                  {transfer.progress}%
                </span>
              </div>
            </div>

            <div className="flex justify-between">
              <div className="text-sm text-gray-500">
                {(transfer.transferredSize / (1024 * 1024)).toFixed(1)} MB /{" "}
                {(transfer.fileSize / (1024 * 1024)).toFixed(1)} MB
              </div>
              <div className="text-sm text-gray-500">
                {transfer.direction === "download" ? "下载中" : "上传中"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransferStatus;
