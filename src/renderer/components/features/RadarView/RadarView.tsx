// 在文件顶部添加接口定义
interface Device {
  id: string;
  name: string;
  ip: string;
  type?: string; // 可选字段
  status?: string; // 可选字段
}

// 添加状态管理钩子
import React, { useState, useEffect } from "react";
import { useWebRTC } from "../../../hooks/useWebRTC";

export const RadarView = () => {
  // 添加所需的状态钩子
  const [status, setStatus] = useState<
    "ready" | "connecting" | "connected" | "error"
  >("ready");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { connectToPeer, sendFile } = useWebRTC();

  // 优化文件传输确认处理
  const handleTransferConfirm = async (device: Device) => {
    try {
      setStatus("connecting");
      console.log(
        `正在连接到设备: ${device.name} (${device.id}, ${device.ip})`
      );

      // 加入更多调试日志
      console.log("开始建立 WebRTC 连接...");

      // 确保同时传递设备ID和IP地址
      const connectPromise = connectToPeer(device.id);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("连接超时 - 请检查目标设备是否在线")),
          15000
        )
      );

      // 使用 Promise.race 进行超时控制
      await Promise.race([connectPromise, timeoutPromise]);

      setStatus("connected");
      console.log(`成功连接到设备 ${device.name}`);

      // 此处打开文件选择对话框...
      setShowConfirmDialog(true);
      setSelectedDevice(device);
    } catch (error) {
      console.error("传输失败:", error);
      setStatus("error");

      // 显示友好的错误消息
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setErrorMessage(errorMessage);

      // 5秒后清除错误状态
      setTimeout(() => {
        setStatus("ready");
        setErrorMessage("");
      }, 5000);
    }
  };

  // 发送文件前检查连接是否还存在
  const handleSendFile = async (file: File) => {
    try {
      if (!selectedDevice) {
        throw new Error("未选择设备");
      }

      // 重新确认连接状态
      if (status !== "connected") {
        console.log("连接状态不是 connected，尝试重新连接");
        await handleTransferConfirm(selectedDevice);
      }

      console.log(`开始向 ${selectedDevice.name} 发送文件: ${file.name}`);
      await sendFile(selectedDevice.id, file);
      console.log("文件发送完成");

      // 显示成功消息
      setSuccessMessage(`文件 ${file.name} 发送成功`);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("文件发送失败:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setErrorMessage(`文件发送失败: ${errorMessage}`);
      setStatus("error");
    }
  };

  return (
    <div className="container p-4 mx-auto">
      <h2 className="mb-4 text-2xl font-bold">设备雷达</h2>

      {/* 添加一个重试按钮 - 移到这里 */}
      {status === "error" && (
        <div className="p-4 mt-4 text-center bg-red-100 rounded-md">
          <p className="text-red-700">{errorMessage || "连接失败"}</p>
          <button
            onClick={() =>
              selectedDevice && handleTransferConfirm(selectedDevice)
            }
            className="px-4 py-2 mt-2 text-white bg-red-500 rounded hover:bg-red-600"
          >
            重试连接
          </button>
        </div>
      )}

      {/* 成功消息 */}
      {successMessage && (
        <div className="p-4 mt-4 text-center bg-green-100 rounded-md">
          <p className="text-green-700">{successMessage}</p>
        </div>
      )}

      {/* 其他组件内容... */}
    </div>
  );
};
