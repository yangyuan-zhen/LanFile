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

interface StorageInfo {
  used: number; // 已使用空间（GB）
  total: number; // 总空间（GB）
  fileTypes: {
    name: string; // 文件类型名称
    color: string; // 颜色（CSS 类名）
  }[];
}

interface TransferStatusProps {
  transfers: TransferItem[];
  storageInfo?: StorageInfo; // 可选的存储信息属性
}

const TransferStatus: React.FC<TransferStatusProps> = ({
  transfers = [],
  storageInfo = {
    used: 13.25,
    total: 15,
    fileTypes: [
      { name: "压缩文件", color: "bg-blue-500" },
      { name: "电子表格", color: "bg-purple-500" },
      { name: "其他", color: "bg-pink-500" },
    ],
  },
}) => {
  // 如果没有传输任务，不显示组件
  if (transfers.length === 0) {
    return null;
  }

  // 计算存储使用百分比
  const storagePercentage = Math.round(
    (storageInfo.used / storageInfo.total) * 100
  );

  return (
    <div className="flex flex-col h-full">
      <div className="overflow-y-auto flex-1">
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

                <div className="overflow-hidden relative mb-1 h-5 bg-gray-100 rounded-full">
                  <div
                    className={`absolute top-0 left-0 h-full rounded-full ${
                      transfer.direction === "download"
                        ? "bg-blue-500 progress-bar-animated"
                        : "bg-green-500 progress-bar-animated"
                    }`}
                    style={{ width: `${transfer.progress}%` }}
                  ></div>
                  <div className="flex absolute top-0 left-0 justify-center items-center w-full h-full">
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

          <div className="flex justify-center pb-4">
            <a
              href="#/transfer-history"
              className="flex items-center text-blue-500 transition-colors hover:text-blue-600"
            >
              <span>查看全部传输历史</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="ml-1 w-4 h-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </a>
          </div>
        </div>

        <div className="p-6 mb-6 bg-white rounded-xl shadow-sm">
          <div className="flex flex-col justify-between mb-4 md:flex-row">
            <div>
              <h3 className="text-xl font-semibold text-gray-800">
                {storageInfo.used.toFixed(2)} GB{" "}
                <span className="font-normal text-gray-500">
                  共 {storageInfo.total} GB
                </span>
              </h3>
            </div>
          </div>

          <div className="mb-4 w-full h-2.5 bg-gray-100 rounded-full">
            <div
              className="h-2.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
              style={{ width: `${storagePercentage}%` }}
            ></div>
          </div>

          <div className="flex flex-wrap gap-4">
            {storageInfo.fileTypes.map((type, index) => (
              <div key={index} className="flex items-center">
                <span
                  className={`mr-2 w-3 h-3 ${type.color} rounded-full`}
                ></span>
                <span className="text-sm text-gray-600">{type.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransferStatus;
