import React, { useEffect, useState, useMemo } from "react";
import { Text, Icon, Button, Box, Flex, Tooltip } from "@chakra-ui/react";
import { FaUpload, FaDownload, FaFolder, FaFile } from "react-icons/fa";
import type { FileTransfer } from "../../../hooks/usePeerJS";
import { formatBytes, formatTime } from "../../../utils/formatUtils";

interface TransferItemProps {
  transfer: FileTransfer;
  formatSize: (bytes: number) => string;
  formatSpeed: (bytesPerSecond?: number) => string;
  formatTimeRemaining: (seconds?: number) => string;
  getStatusText: (status: FileTransfer["status"]) => string;
  openFileLocation?: (path: string) => void;
  openFile?: (path: string) => void;
  onOpenFile: (filePath: string) => void;
  onOpenFolder: (filePath: string) => void;
  onTransferComplete: (transferId: string) => void;
}

export const TransferItem: React.FC<TransferItemProps> = ({
  transfer,
  formatSize,
  formatSpeed,
  formatTimeRemaining,
  getStatusText,
  openFileLocation,
  openFile,
  onOpenFile,
  onOpenFolder,
  onTransferComplete,
}) => {
  // 重要：确保进度值是有效的数字
  const progress =
    typeof transfer.progress === "number"
      ? Math.min(100, Math.max(0, transfer.progress))
      : 0;

  useEffect(() => {
    console.log(
      `[TransferItem] 渲染进度条: ID=${transfer.id}, 进度=${progress}%, 状态=${transfer.status}`
    );
  }, [transfer.id, progress, transfer.status]);

  // 添加调试日志
  useEffect(() => {
    console.log("TransferItem render:", {
      id: transfer.id,
      progress: transfer.progress,
      size: transfer.size,
    });
  }, [transfer]);

  // 在状态变为完成时调用 onTransferComplete
  useEffect(() => {
    if (transfer.status === "completed") {
      console.log(`[TransferItem] 传输已完成: ${transfer.id}`);
      onTransferComplete(transfer.id);
    }
  }, [transfer.status, transfer.id, onTransferComplete]);

  // 获取状态显示文本和颜色
  const getStatusInfo = () => {
    switch (transfer.status) {
      case "pending":
        return { text: "准备中", color: "text-yellow-500" };
      case "transferring":
        return { text: "传输中", color: "text-blue-500" };
      case "completed":
        return { text: "已完成", color: "text-green-500" };
      case "error":
        return { text: "错误", color: "text-red-500" };
      default:
        return { text: "未知", color: "text-gray-500" };
    }
  };

  const statusInfo = getStatusInfo();
  const isCompleted = transfer.status === "completed";
  const hasFilePath = Boolean(transfer.savedPath);

  // 格式化速度和剩余时间显示
  const speedText = transfer.speed ? `${formatBytes(transfer.speed)}/s` : "";

  const remainingText =
    transfer.timeRemaining && transfer.timeRemaining > 0
      ? formatTime(transfer.timeRemaining)
      : "";

  // 计算已传输大小
  const transferredSize = useMemo(() => {
    return Math.floor((transfer.size * transfer.progress) / 100);
  }, [transfer.size, transfer.progress]);

  // 根据状态确定颜色
  const statusColor = useMemo(() => {
    switch (transfer.status) {
      case "transferring":
        return transfer.direction === "upload" ? "green.500" : "blue.500";
      case "completed":
        return "green.500";
      case "error":
        return "red.500";
      default:
        return "gray.500";
    }
  }, [transfer.status, transfer.direction]);

  console.log(
    `渲染TransferItem: ${transfer.id}, 进度: ${transfer.progress}%, 状态: ${transfer.status}`
  );

  return (
    <Box
      key={transfer.id} // 确保每个传输项有唯一的 key
      className="transfer-item"
      mb={4}
      p={4}
      borderWidth="1px"
      borderRadius="lg"
      data-testid={`transfer-item-${transfer.id}`}
    >
      <Flex justify="space-between" align="center" mb={2}>
        <Flex align="center">
          <Icon
            as={transfer.direction === "upload" ? FaUpload : FaDownload}
            color={transfer.direction === "upload" ? "green.500" : "blue.500"}
            boxSize={5}
            mr={3}
          />
          <Box>
            <Tooltip label={transfer.name} placement="top" hasArrow>
              <Text fontWeight="medium" noOfLines={1} maxW="180px">
                {transfer.name}
              </Text>
            </Tooltip>
            <Text fontSize="sm" color="gray.500">
              {transfer.direction === "upload" ? "发送至" : "接收自"}:{" "}
              {transfer.deviceName || transfer.peerId.substring(0, 10) + "..."}
            </Text>
          </Box>
        </Flex>
        <Box textAlign="right">
          {transfer.speed && transfer.status === "transferring" && (
            <Text fontSize="sm" fontWeight="semibold" color={statusColor}>
              {formatSpeed(transfer.speed)}
            </Text>
          )}
          <Text fontSize="xs" color="gray.500">
            {transfer.status === "transferring" && transfer.timeRemaining
              ? formatTimeRemaining(transfer.timeRemaining)
              : getStatusText(transfer.status)}
          </Text>
        </Box>
      </Flex>

      {/* 进度条部分 */}
      <div
        className="progress-container"
        style={{
          position: "relative",
          height: "8px",
          borderRadius: "4px",
          backgroundColor: "#E2E8F0",
          overflow: "hidden",
          marginTop: "8px",
          marginBottom: "8px",
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            backgroundColor:
              transfer.direction === "upload" ? "#38A169" : "#3182CE",
            position: "absolute",
            left: 0,
            top: 0,
            borderRadius: "4px",
            transition: "width 0.1s linear",
          }}
        />
        {transfer.status === "transferring" && (
          <div
            className="progress-bar-animated"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: `${progress}%`, // 确保动画覆盖整个进度条
              height: "100%",
            }}
          />
        )}
      </div>

      {/* 进度信息显示 */}
      <Flex justifyContent="space-between" fontSize="sm">
        <Text fontWeight="medium">{progress}%</Text>
        <Text>
          {formatSize(transfer.size * (progress / 100))} /{" "}
          {formatSize(transfer.size)}
        </Text>
      </Flex>

      {transfer.status === "completed" && transfer.savedPath && (
        <Flex mt={3} gap={2}>
          <Button
            size="xs"
            leftIcon={<Icon as={FaFolder} />}
            onClick={() =>
              openFileLocation && openFileLocation(transfer.savedPath!)
            }
          >
            打开文件夹
          </Button>
          <Button
            size="xs"
            leftIcon={<Icon as={FaFile} />}
            onClick={() => openFile && openFile(transfer.savedPath!)}
          >
            打开文件
          </Button>
        </Flex>
      )}
    </Box>
  );
};

export default TransferItem;
