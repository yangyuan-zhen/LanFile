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
import { useTransferEvents } from "../../../hooks/useTransferEvents";
import { PeerJSProvider } from "../../../contexts/PeerJSContext";

export const CurrentTransfers: React.FC = () => {
  const peerContext = useGlobalPeerJS();

  if (!peerContext) {
    console.log("PeerJS 上下文不可用，请确保组件在 PeerJSProvider 内使用");
    return null;
  }

  const { transfers, setTransfers } = peerContext;
  const [showCompleted, setShowCompleted] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // 使用事件系统获取传输
  const { transfers: eventTransfers } = useTransferEvents();

  // 合并从事件系统获取的传输信息
  useEffect(() => {
    if (eventTransfers && eventTransfers.length > 0) {
      console.log(
        "[CurrentTransfers] 从事件系统接收到传输:",
        eventTransfers.map((t) => `${t.id} (${t.progress}%)`)
      );

      // 将事件系统的传输合并到当前传输列表
      setTransfers((prevTransfers) => {
        // 创建新传输ID Map
        const prevMap = new Map(prevTransfers.map((t) => [t.id, t]));

        // 添加调试日志
        console.log(
          "[CurrentTransfers] 合并前现有传输:",
          [...prevMap.keys()].join(", ") || "无"
        );

        // 遍历事件传输，将新传输添加到列表或更新现有传输
        eventTransfers.forEach((transfer) => {
          console.log(
            `[CurrentTransfers] 处理事件传输: ${transfer.id} (${transfer.progress}%)`
          );

          prevMap.set(transfer.id, {
            ...(prevMap.get(transfer.id) || {}),
            ...transfer,
            // 确保时间戳更新，强制触发重渲染
            lastUpdated: Date.now(),
          });
        });

        const newTransfers = Array.from(prevMap.values());
        console.log("[CurrentTransfers] 合并后传输数量:", newTransfers.length);
        return newTransfers;
      });
    }
  }, [eventTransfers, setTransfers]);

  // 修改刷新频率并简化日志输出
  useEffect(() => {
    const intervalId = setInterval(() => {
      setRefreshKey((prev) => prev + 1);
    }, 1000); // 降低到1秒刷新一次
    return () => clearInterval(intervalId);
  }, []);

  // 减少日志输出，只在传输发生实际变化时记录
  useEffect(() => {
    console.log(`[CurrentTransfers] 当前传输任务: ${transfers.length}项`);

    // 只在有传输时才打印详情，并且降低频率
    if (transfers.length > 0 && refreshKey % 5 === 0) {
      console.log(
        "[CurrentTransfers] 传输项摘要:",
        transfers.map((t) => `${t.id.substring(0, 8)}... (${t.progress}%)`)
      );
    }
  }, [transfers.length, refreshKey]);

  // 添加直接监听DOM事件的备用机制
  useEffect(() => {
    const handleDirectEvent = (event: CustomEvent) => {
      try {
        const { type, transfer } = event.detail;
        if (!transfer || !transfer.id) return;

        console.log(
          `[CurrentTransfers] 直接接收到传输事件: ${type}, ${transfer.id}`
        );

        // 无论事件类型如何，更新传输
        setTransfers((prev) => {
          const exists = prev.some((t) => t.id === transfer.id);
          if (!exists) {
            console.log(`[CurrentTransfers] 添加新传输: ${transfer.id}`);
            return [...prev, transfer];
          } else {
            return prev.map((t) =>
              t.id === transfer.id ? { ...t, ...transfer } : t
            );
          }
        });
      } catch (error) {
        console.error("[CurrentTransfers] 处理事件出错:", error);
      }
    };

    window.addEventListener(
      "transferEvent",
      handleDirectEvent as EventListener
    );
    return () =>
      window.removeEventListener(
        "transferEvent",
        handleDirectEvent as EventListener
      );
  }, [setTransfers]);

  // 添加日志，帮助调试
  useEffect(() => {
    if (transfers && transfers.length > 0) {
      console.log(
        "[CurrentTransfers] 当前传输项详情:",
        transfers.map(
          (t) => `${t.id} (${t.name}: ${t.progress}%, 状态: ${t.status})`
        )
      );
    }
  }, [transfers, refreshKey]);

  // 添加强制更新机制 - 优化逻辑，确保活动传输实时更新
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

        // 强制刷新 - 添加时间戳触发更新
        setTransfers((prev) =>
          prev.map((t) => ({
            ...t,
            _forceUpdate: Date.now(), // 添加强制更新标记
          }))
        );
      }
    }, 150); // 更频繁地刷新活动传输

    return () => clearInterval(intervalId);
  }, [transfers]);

  // 添加清除已完成传输的功能
  const handleClearCompletedTransfer = (transferId: string) => {
    console.log(`[CurrentTransfers] 清除已完成传输: ${transferId}`);
    setTransfers((prev) => prev.filter((t) => t.id !== transferId));
  };

  // 恢复之前的排序和过滤逻辑，同时保留新添加的清除功能
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
          {completedCount > 0 && (
            <Badge ml={2} colorScheme="green" borderRadius="full">
              {completedCount} 已完成
            </Badge>
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
          </Flex>
        ) : (
          filteredTransfers.map((transfer) => (
            <Box
              key={`${transfer.id}-${transfer.progress}-${refreshKey}`}
              mb={3}
            >
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
                onClearTransfer={handleClearCompletedTransfer}
              />
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
};

export default CurrentTransfers;
