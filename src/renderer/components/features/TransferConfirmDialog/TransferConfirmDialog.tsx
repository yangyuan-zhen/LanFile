import React, { useState } from "react";
import { useWebRTC } from "../../../hooks/useWebRTC";
import { Button } from "../../common/Button/Button";

interface Device {
  id: string;
  name: string;
  ip: string;
  type: string;
  status: string;
}

interface TransferConfirmDialogProps {
  device: Device;
  onClose: () => void;
}

export const TransferConfirmDialog: React.FC<TransferConfirmDialogProps> = ({
  device,
  onClose,
}) => {
  const [isSelectingFile, setIsSelectingFile] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { connectToPeer, sendFile } = useWebRTC();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleConfirm = async () => {
    setIsSelectingFile(true);
    // 打开文件选择器
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 100);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      setIsSelectingFile(false);
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      // 连接到设备
      await connectToPeer(device.id);

      // 发送选中的文件
      for (let i = 0; i < e.target.files.length; i++) {
        await sendFile(device.id, e.target.files[i]);
      }

      // 清除选择的文件
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      onClose();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("文件传输失败:", error);
      setErrorMsg(`传输失败: ${errorMessage}`);
      setIsSelectingFile(false);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-50">
      <div className="p-6 w-full max-w-md bg-white rounded-lg shadow-xl">
        <h3 className="mb-4 text-xl font-bold text-gray-800">传输文件</h3>
        <p className="mb-6 text-gray-600">
          是否要向 <span className="font-medium">{device.name}</span> (
          {device.ip}) 传输文件？
        </p>

        <div className="mb-4">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {errorMsg && (
          <div className="p-3 mb-4 text-red-700 bg-red-100 rounded-md">
            <p>{errorMsg}</p>
            <button
              onClick={handleConfirm}
              className="px-3 py-1 mt-2 text-sm bg-red-50 rounded hover:bg-red-200"
            >
              重试
            </button>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <Button onClick={onClose} variant="outline">
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={isSelectingFile}>
            {isSelectingFile ? "选择文件中..." : "选择文件"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TransferConfirmDialog;
