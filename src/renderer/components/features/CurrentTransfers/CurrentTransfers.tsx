import React, { useState, useEffect, useMemo } from "react";
import { useGlobalPeerJS } from "../../../contexts/PeerJSContext";
import {
  Text,
  Flex,
  Box,
  Icon,
  IconButton,
  Tooltip,
  Badge,
} from "@chakra-ui/react";
import { FaCheck, FaInbox } from "react-icons/fa";
import type { FileTransfer } from "../../../hooks/usePeerJS";
import TransferItem from "./TransferItem";

export const CurrentTransfers: React.FC = () => {
  const peerContext = useGlobalPeerJS();
  const { transfers, setTransfers } = peerContext || {
    transfers: [],
    setTransfers: () => {},
  };
  const [showCompleted, setShowCompleted] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // 只使用一种刷新方式，避免多重刷新导致的问题
  useEffect(() => {
    const intervalId = setInterval(() => {
      setRefreshKey((prev) => prev + 1);
    }, 500);
    return () => clearInterval(intervalId);
  }, []);

  // 添加日志，帮助调试
  useEffect(() => {
    console.log(
      "[CurrentTransfers] 当前传输项IDs:",
      transfers.map((t) => `${t.id} (${t.name}: ${t.progress}%)`)
    );
  }, [transfers]);

  // 添加强制更新机制
  useEffect(() => {
    const intervalId = setInterval(() => {
      // 获取当前活动的传输
      const activeTransfers = transfers.filter(
        (t) => t.status === "transferring" || t.status === "pending"
      );

      if (activeTransfers.length > 0) {
        console.log(
          "[CurrentTransfers] 强制刷新活动传输",
          activeTransfers.map((t) => `${t.id}:${t.progress}%`)
        );

        // 强制刷新 - 创建transfers的深拷贝触发更新
        setTransfers((prev) => [...prev.map((t) => ({ ...t }))]);
      }
    }, 200); // 更频繁地刷新

    return () => clearInterval(intervalId);
  }, []);

  // 改进过滤和排序，确保每个文件只显示最新的传输条目
  const filteredTransfers = useMemo(() => {
    // 按文件名和方向分组，保留最新的条目
    const latestTransfers = new Map();

    // 先按时间戳（从ID中提取）排序，确保最新的条目会覆盖旧的
    const sortedTransfers = [...transfers].sort((a, b) => {
      // 从ID中提取时间戳: transfer-TIMESTAMP-xxx
      const getTimestamp = (id: string) => {
        const parts = id.split("-");
        return parts.length > 1 ? Number(parts[1]) : 0;
      };
      return getTimestamp(b.id) - getTimestamp(a.id);
    });

    // 对于每个文件名+方向组合，只保留最新的条目
    for (const transfer of sortedTransfers) {
      const key = `${transfer.name}-${transfer.direction}-${transfer.peerId}`;
      if (
        !latestTransfers.has(key) ||
        (transfer.status === "completed" &&
          latestTransfers.get(key).status !== "completed")
      ) {
        latestTransfers.set(key, transfer);
      }
    }

    // 转换回数组并应用显示筛选
    let result = Array.from(latestTransfers.values());

    // 应用显示/隐藏已完成的选项
    if (!showCompleted) {
      result = result.filter((t) => t.status !== "completed");
    }

    // 最后按状态和时间排序
    return result.sort((a, b) => {
      // 优先显示正在传输的项目
      if (a.status === "transferring" && b.status !== "transferring") return -1;
      if (a.status !== "transferring" && b.status === "transferring") return 1;
      // 其次是等待中的项目
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (a.status !== "pending" && b.status === "pending") return 1;
      // 然后按ID排序（较新的在前）
      return b.id.localeCompare(a.id);
    });
  }, [transfers, showCompleted, refreshKey]);

  // 计算正在传输的数量
  const activeCount = transfers.filter(
    (t) => t.status === "transferring"
  ).length;
  const completedCount = transfers.filter(
    (t) => t.status === "completed"
  ).length;

  // 辅助函数，格式化文件大小
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  // 格式化速度
  const formatSpeed = (bytesPerSecond?: number): string => {
    if (!bytesPerSecond) return "";
    if (bytesPerSecond < 1024) return bytesPerSecond.toFixed(1) + " B/s";
    if (bytesPerSecond < 1024 * 1024)
      return (bytesPerSecond / 1024).toFixed(1) + " KB/s";
    return (bytesPerSecond / (1024 * 1024)).toFixed(1) + " MB/s";
  };

  // 添加转换剩余时间的函数
  const formatTimeRemaining = (seconds?: number): string => {
    if (!seconds) return "";
    if (seconds < 60) return `${Math.ceil(seconds)}秒`;

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.ceil(seconds % 60);

    return `${minutes}分${remainingSeconds}秒`;
  };

  // 获取状态文本
  const getStatusText = (status: FileTransfer["status"]): string => {
    switch (status) {
      case "pending":
        return "准备中";
      case "transferring":
        return "传输中";
      case "completed":
        return "已完成";
      case "error":
        return "失败";
      default:
        return "未知";
    }
  };

  // 检查是否有活动的传输
  const hasActiveTransfers =
    transfers.filter(
      (t) => t.status === "pending" || t.status === "transferring"
    ).length > 0;

  // 添加调试信息
  console.log(`[CurrentTransfers] 当前传输任务:`, transfers);

  // 处理传输完成事件
  const handleTransferComplete = (transferId: string) => {
    console.log(`[CurrentTransfers] 传输完成: ${transferId}`);
  };

  // 处理传输打开文件
  const handleOpenFile = async (filePath: string) => {
    if (!filePath) {
      console.error("文件路径为空，无法打开");
      return;
    }

    try {
      console.log(`[CurrentTransfers] 尝试打开文件: ${filePath}`);
      const result = await window.electron.invoke("file:openFile", filePath);
      if (!result.success) {
        console.error("打开文件失败:", result.error);
      }
    } catch (error) {
      console.error("打开文件错误:", error);
    }
  };

  // 处理打开文件夹
  const handleOpenFolder = async (filePath: string) => {
    if (!filePath) {
      console.error("文件路径为空，无法打开所在文件夹");
      return;
    }

    try {
      console.log(`[CurrentTransfers] 尝试打开文件夹: ${filePath}`);
      const result = await window.electron.invoke("file:openFolder", filePath);
      if (!result.success) {
        console.error("打开文件夹失败:", result.error);
      }
    } catch (error) {
      console.error("打开文件夹错误:", error);
    }
  };

  return (
    <Box
      position="fixed"
      bottom="20px"
      right="20px"
      width="350px"
      zIndex={9999}
      borderRadius="md"
      overflow="hidden"
      boxShadow="0 0 20px rgba(0,0,0,0.3)"
      bg="white"
    >
      {/* 标题栏 */}
      <Flex
        justify="space-between"
        align="center"
        p={3}
        bg="gray.50"
        borderBottom="1px solid"
        borderColor="gray.200"
      >
        <Flex align="center">
          <Text fontWeight="bold">文件传输</Text>
          {activeCount > 0 && (
            <Badge ml={2} colorScheme="blue" borderRadius="full">
              {activeCount} 进行中
            </Badge>
          )}
        </Flex>

        <Flex>
          {completedCount > 0 && (
            <Tooltip label={showCompleted ? "隐藏已完成" : "显示已完成"}>
              <IconButton
                aria-label={showCompleted ? "隐藏已完成" : "显示已完成"}
                icon={<FaCheck />}
                size="sm"
                variant="ghost"
                colorScheme={showCompleted ? "green" : "gray"}
                onClick={() => setShowCompleted((prev) => !prev)}
                mr={1}
              />
            </Tooltip>
          )}
        </Flex>
      </Flex>

      <Box p={3} maxHeight="400px" overflowY="auto">
        {!transfers || filteredTransfers.length === 0 ? (
          <Flex
            direction="column"
            align="center"
            justify="center"
            py={6}
            color="gray.500"
          >
            <Icon as={FaInbox} boxSize={8} mb={3} />
            <Text>暂无传输任务</Text>
            {/* 添加调试信息 */}
            <Text fontSize="xs" color="gray.400" mt={2}>
              总任务数: {transfers?.length || 0}
            </Text>
          </Flex>
        ) : (
          filteredTransfers.map((transfer) => (
            <Box key={`${transfer.id}-${refreshKey}`} mb={3}>
              <TransferItem
                transfer={transfer}
                formatSize={formatSize}
                formatSpeed={formatSpeed}
                formatTimeRemaining={formatTimeRemaining}
                getStatusText={getStatusText}
                openFileLocation={handleOpenFolder}
                openFile={handleOpenFile}
                onOpenFile={handleOpenFile}
                onOpenFolder={handleOpenFolder}
                onTransferComplete={handleTransferComplete}
              />
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
};

export default CurrentTransfers;
