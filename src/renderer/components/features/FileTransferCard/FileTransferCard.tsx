import React from "react";
import { Progress } from "../../common/Progress/Progress";

interface FileTransferCardProps {
  id: string;
  fileName: string;
  fileSize: number;
  transferredSize: number;
  speed: string;
  direction: "download" | "upload";
  sourceDevice?: string;
  targetDevice?: string;
  progress: number;
  timeRemaining: string;
  onClick?: () => void;
}

export const FileTransferCard: React.FC<FileTransferCardProps> = ({
  fileName,
  fileSize,
  transferredSize,
  speed,
  direction,
  sourceDevice,
  targetDevice,
  progress,
  timeRemaining,
  onClick,
}) => {
  const isDownload = direction === "download";
  const deviceInfo = isDownload ? `从：${sourceDevice}` : `至：${targetDevice}`;

  const iconClass = isDownload
    ? "mr-3 text-blue-600 fas fa-download"
    : "mr-3 text-green-600 fas fa-upload";

  const progressColor = isDownload ? "bg-blue-500" : "bg-green-600";
  const progressBgColor = isDownload ? "bg-blue-200" : "bg-green-200";
  const textColor = isDownload ? "text-blue-600" : "text-green-600";

  const formattedTransferredSize = (transferredSize / (1024 * 1024)).toFixed(0);
  const formattedTotalSize = (fileSize / (1024 * 1024)).toFixed(0);

  return (
    <div
      className="p-4 mb-4 rounded-lg border border-gray-200 transition-colors cursor-pointer hover:bg-gray-50"
      onClick={onClick}
    >
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center">
          <i className={iconClass}></i>
          <div>
            <h4 className="font-medium text-md">{fileName}</h4>
            <p className="text-sm text-gray-500">{deviceInfo}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-sm font-semibold ${textColor}`}>{speed}</p>
          <p className="text-xs text-gray-500">{timeRemaining}</p>
        </div>
      </div>

      <div className="relative pt-1">
        <div className="flex justify-between items-center mb-2">
          <div>
            <span className={`inline-block text-xs font-semibold ${textColor}`}>
              {Math.round(progress)}%
            </span>
          </div>
          <div className="text-right">
            <span className={`inline-block text-xs font-semibold ${textColor}`}>
              {formattedTransferredSize} MB / {formattedTotalSize} MB
            </span>
          </div>
        </div>
        <Progress
          value={progress}
          max={100}
          className="mb-4"
          color={progressColor}
        />
      </div>
    </div>
  );
};

export default FileTransferCard;
