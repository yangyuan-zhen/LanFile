import React, { useRef } from "react";
import { useWebRTC } from "../hooks/useWebRTC";
import { Button } from "../components/common/Button/Button";
import { Progress } from "../components/common/Progress/Progress";

export interface FileTransferProps {
  targetDevice: {
    id: string;
    name: string;
    ip: string;
  };
}

export const FileTransfer: React.FC<FileTransferProps> = ({ targetDevice }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isReady, connectToPeer, sendFile, transfers } = useWebRTC();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    try {
      // 确保连接已建立
      await connectToPeer(targetDevice.id);

      // 发送每个选择的文件
      for (let i = 0; i < e.target.files.length; i++) {
        await sendFile(targetDevice.id, e.target.files[i]);
      }

      // 清除选择的文件
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: unknown) {
      console.error("文件传输失败:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      alert(`文件传输失败: ${errorMessage}`);
    }
  };

  // 获取与当前设备相关的传输
  const deviceTransfers = transfers.filter((t) => t.peerId === targetDevice.id);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center space-x-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          className="hidden"
          id="file-input"
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={!isReady}
        >
          选择文件发送
        </Button>
        <span className="text-sm text-gray-500">
          {isReady ? "准备就绪" : "初始化中..."}
        </span>
      </div>

      {deviceTransfers.length > 0 && (
        <div className="mt-4 space-y-2">
          <h3 className="font-medium">文件传输</h3>
          {deviceTransfers.map((transfer) => (
            <div key={transfer.id} className="p-3 bg-gray-50 rounded-md">
              <div className="flex justify-between">
                <span className="font-medium">{transfer.name}</span>
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
                  {transfer.status === "transferring" &&
                    `${transfer.progress}%`}
                  {transfer.status === "completed" && "已完成"}
                  {transfer.status === "error" && "传输失败"}
                </span>
                <span>{transfer.type}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
