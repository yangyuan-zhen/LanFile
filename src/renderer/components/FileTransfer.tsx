import React, { useRef } from "react";
import { usePeerJS } from "../hooks/usePeerJS";
import { Button } from "../components/common/Button/Button";

export interface FileTransferProps {
  targetDevice:
    | {
        id: string;
        name: string;
        ip: string;
      }
    | string;
}

// 重命名组件以避免与CurrentTransfers冲突
export const FileTransferButton: React.FC<FileTransferProps> = ({
  targetDevice,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isReady, connectToPeer, sendFile } = usePeerJS();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    try {
      // 如果是字符串，转换为对象
      const deviceObj =
        typeof targetDevice === "string"
          ? { id: targetDevice, name: targetDevice, ip: targetDevice }
          : targetDevice;

      // 确保连接已建立
      await connectToPeer(deviceObj.ip);

      // 发送每个选择的文件
      for (let i = 0; i < e.target.files.length; i++) {
        await sendFile(deviceObj.ip, e.target.files[i]);
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
    </div>
  );
};

// 更新导出名称
export default FileTransferButton;
