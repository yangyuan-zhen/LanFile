import React, { useEffect, useState, useMemo } from "react";
import {
  Text,
  Progress,
  Icon,
  Button,
  Box,
  Flex,
  Tooltip,
} from "@chakra-ui/react";
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

const TransferItem: React.FC<TransferItemProps> = ({
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
  // 添加调试日志
  useEffect(() => {
    console.log(`[TransferItem] 渲染传输项:`, transfer);
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
    return transfer.size * (transfer.progress / 100);
  }, [transfer.size, transfer.progress]);

  // 根据状态确定颜色
  const statusColor = useMemo(() => {
    switch (transfer.status) {
      case "error":
        return "red.500";
      case "completed":
        return "green.500";
      case "transferring":
        return "blue.500";
      default:
        return "gray.500";
    }
  }, [transfer.status]);

  // 进度条颜色方案
  const progressColorScheme = useMemo(() => {
    switch (transfer.status) {
      case "error":
        return "red";
      case "completed":
        return "green";
      default:
        return "blue";
    }
  }, [transfer.status]);

  return (
    <Box p={4} borderWidth="1px" borderRadius="lg" bg="white" boxShadow="sm">
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
              {transfer.peerId}
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

      <Box pt={1}>
        <Flex justify="space-between" align="center" mb={1}>
          <Text fontSize="xs" fontWeight="semibold" color={statusColor}>
            {transfer.progress}%
          </Text>
          <Text fontSize="xs" fontWeight="semibold" color="gray.600">
            {formatSize(transferredSize)}/{formatSize(transfer.size)}
          </Text>
        </Flex>

        <Progress
          value={transfer.progress}
          size="sm"
          colorScheme={progressColorScheme}
          borderRadius="full"
          hasStripe={transfer.status === "transferring"}
          isAnimated={transfer.status === "transferring"}
          transition="width 0.2s ease-in-out"
          sx={{
            "& > div:first-of-type": {
              transition: "width 0.3s ease-in-out",
            },
          }}
        />
      </Box>

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
