import React, { useState, useEffect } from "react";
import { useGlobalPeerJS } from "../../../contexts/PeerJSContext";
import {
  Progress,
  Card,
  Text,
  Flex,
  Box,
  Icon,
  IconButton,
  Tooltip,
  Button,
  Badge,
  Collapse,
  Divider,
} from "@chakra-ui/react";
import {
  FaUpload,
  FaDownload,
  FaCheck,
  FaTimes,
  FaExclamationTriangle,
  FaInbox,
  FaFolder,
  FaFile,
  FaChevronUp,
  FaChevronDown,
  FaTrash,
} from "react-icons/fa";
import type { FileTransfer } from "../../../hooks/usePeerJS";

export const CurrentTransfers: React.FC = () => {
  const peerContext = useGlobalPeerJS();
  const { transfers } = peerContext;
  const [isExpanded, setIsExpanded] = useState(true);
  const [showCompleted, setShowCompleted] = useState(true);

  // 添加调试日志
  useEffect(() => {
    console.log("[CurrentTransfers] 传输状态更新:", transfers);
  }, [transfers]);

  // 过滤和排序传输
  const filteredTransfers = transfers
    .filter((t) => showCompleted || t.status !== "completed")
    .sort((a, b) => {
      // 首先按状态排序: 传输中 > 待处理 > 已完成 > 错误
      const statusOrder = {
        transferring: 0,
        pending: 1,
        completed: 2,
        error: 3,
      };
      return statusOrder[a.status] - statusOrder[b.status];
    });

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

  // 打开文件位置
  const openFileLocation = (path: string) => {
    window.electron.invoke("file:openFolder", path);
  };

  // 打开文件
  const openFile = (path: string) => {
    window.electron.invoke("file:openFile", path);
  };

  // 渲染传输项
  const renderTransferItem = (transfer: FileTransfer) => (
    <div
      key={transfer.id}
      className="p-4 mb-4 rounded-lg border border-gray-200"
    >
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center">
          <Icon
            as={transfer.direction === "upload" ? FaUpload : FaDownload}
            color={transfer.direction === "upload" ? "green.500" : "blue.500"}
            mr={3}
          />
          <div>
            <Text fontWeight="medium">{transfer.name}</Text>
            <Text fontSize="sm" color="gray.500">
              {transfer.direction === "upload" ? "发送至" : "接收自"}:{" "}
              {transfer.peerId}
            </Text>
          </div>
        </div>
        <div className="text-right">
          {transfer.speed && (
            <Text
              fontSize="sm"
              fontWeight="semibold"
              color={transfer.direction === "upload" ? "green.500" : "blue.500"}
            >
              {formatSpeed(transfer.speed)}
            </Text>
          )}
          <Text fontSize="xs" color="gray.500">
            {transfer.status === "transferring"
              ? "传输中"
              : getStatusText(transfer.status)}
          </Text>
        </div>
      </div>

      <div className="relative pt-1">
        <div className="flex justify-between items-center mb-2">
          <span
            className="inline-block text-xs font-semibold"
            color={
              transfer.status === "error"
                ? "red.500"
                : transfer.status === "completed"
                ? "green.500"
                : "blue.500"
            }
          >
            {transfer.progress}%
          </span>
          <span className="inline-block text-xs font-semibold text-gray-600">
            {formatSize(transfer.size * (transfer.progress / 100))}/
            {formatSize(transfer.size)}
          </span>
        </div>

        <Progress
          mt={1}
          size="sm"
          value={transfer.progress}
          colorScheme={
            transfer.status === "error"
              ? "red"
              : transfer.status === "completed"
              ? "green"
              : "blue"
          }
          borderRadius="full"
          hasStripe={transfer.status === "transferring"}
          isAnimated={transfer.status === "transferring"}
        />
      </div>

      {/* 如果传输完成且有保存路径，添加操作按钮 */}
      {transfer.status === "completed" && transfer.savedPath && (
        <div className="flex mt-3 space-x-2">
          <Button
            size="xs"
            leftIcon={<Icon as={FaFolder} />}
            onClick={() => openFileLocation(transfer.savedPath!)}
          >
            打开文件夹
          </Button>
          <Button
            size="xs"
            leftIcon={<Icon as={FaFile} />}
            onClick={() => openFile(transfer.savedPath!)}
          >
            打开文件
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <Box
      position="fixed"
      bottom="20px"
      right="20px"
      width="350px"
      zIndex={9999}
      borderRadius="md"
      overflow="visible"
      boxShadow="0 0 20px rgba(0,0,0,0.3)"
      bg="white"
    >
      <Card p={0} bg="white" borderRadius="md">
        {/* 标题栏 - 更明显的样式 */}
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
                  onClick={() => setShowCompleted(!showCompleted)}
                  mr={1}
                />
              </Tooltip>
            )}
            <Tooltip label={isExpanded ? "收起" : "展开"}>
              <IconButton
                aria-label={isExpanded ? "收起" : "展开"}
                icon={isExpanded ? <FaChevronDown /> : <FaChevronUp />}
                size="sm"
                variant="ghost"
                onClick={() => setIsExpanded(!isExpanded)}
              />
            </Tooltip>
          </Flex>
        </Flex>

        {/* 内容区 */}
        <Collapse in={isExpanded} animateOpacity>
          <Box
            p={transfers.length > 0 ? 2 : 0}
            maxHeight="400px"
            overflowY="auto"
          >
            {!transfers || filteredTransfers.length === 0 ? (
              <Flex
                direction="column"
                align="center"
                justify="center"
                py={4}
                color="gray.500"
              >
                <Icon as={FaInbox} boxSize={8} mb={2} />
                <Text>暂无传输任务</Text>
              </Flex>
            ) : (
              filteredTransfers.map((transfer) => renderTransferItem(transfer))
            )}
          </Box>
        </Collapse>
      </Card>
    </Box>
  );
};

export default CurrentTransfers;
