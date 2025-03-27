import React, { useState } from "react";
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
  const { transfers } = useGlobalPeerJS();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showCompleted, setShowCompleted] = useState(true);

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

  // 添加调试日志
  console.log("CurrentTransfers 渲染:", transfers);

  // 辅助函数，格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024)
      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
  };

  // 添加格式化速度的辅助函数
  const formatSpeed = (bytesPerSecond?: number): string => {
    if (!bytesPerSecond) return "";
    if (bytesPerSecond < 1024) return bytesPerSecond.toFixed(1) + " B/s";
    if (bytesPerSecond < 1024 * 1024)
      return (bytesPerSecond / 1024).toFixed(1) + " KB/s";
    return (bytesPerSecond / (1024 * 1024)).toFixed(1) + " MB/s";
  };

  // 打开文件位置
  const openFileLocation = (path: string) => {
    window.electron.invoke("file:openFolder", path);
  };

  // 打开文件
  const openFile = (path: string) => {
    window.electron.invoke("file:openFile", path);
  };

  // 在渲染传输项的部分，更改为使用 Chakra UI 的 Progress 组件
  const renderTransferItem = (transfer: FileTransfer) => (
    <div className="flex flex-col p-3 border-b">
      <div className="flex justify-between items-center mb-1">
        <p className="font-medium">{transfer.name}</p>
        <Badge
          colorScheme={
            transfer.status === "error"
              ? "red"
              : transfer.status === "completed"
              ? "green"
              : transfer.status === "transferring"
              ? "blue"
              : "gray"
          }
        >
          {getStatusText(transfer.status)}
        </Badge>
      </div>

      <p className="text-sm text-gray-500">
        {transfer.direction === "upload" ? "发送至" : "接收自"}:{" "}
        {transfer.peerId}
      </p>

      {/* 使用 Chakra UI 的 Progress 组件 */}
      <Progress
        mt={2}
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
      />

      <div className="flex justify-between mt-1 text-xs">
        <span>
          {formatSize(transfer.size * (transfer.progress / 100))}/
          {formatSize(transfer.size)}
        </span>
        {transfer.speed && <span>{formatSpeed(transfer.speed)}</span>}
      </div>

      {/* 如果传输完成且有保存路径，添加操作按钮 */}
      {transfer.status === "completed" && transfer.savedPath && (
        <div className="flex mt-2 space-x-2">
          <Button
            size="xs"
            leftIcon={<FaFolder />}
            onClick={() => openFileLocation(transfer.savedPath!)}
          >
            打开文件夹
          </Button>
          <Button
            size="xs"
            leftIcon={<FaFile />}
            onClick={() => openFile(transfer.savedPath!)}
          >
            打开文件
          </Button>
        </div>
      )}
    </div>
  );

  // 添加辅助函数
  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "等待中";
      case "transferring":
        return "传输中";
      case "completed":
        return "已完成";
      case "error":
        return "错误";
      default:
        return status;
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <Box
      position="fixed"
      bottom="20px"
      right="20px"
      width="350px"
      zIndex={1000}
      borderRadius="md"
      overflow="hidden"
      boxShadow="lg"
    >
      <Card p={0} bg="white" borderRadius="md">
        {/* 标题栏 */}
        <Flex
          justify="space-between"
          align="center"
          p={3}
          borderBottom={transfers.length > 0 ? "1px solid" : "none"}
          borderColor="gray.200"
        >
          <Flex align="center">
            <Text fontWeight="bold">文件传输</Text>
            {transfers.length > 0 && (
              <Badge ml={2} colorScheme="blue" borderRadius="full">
                {transfers.length}
              </Badge>
            )}
            {activeCount > 0 && (
              <Badge ml={1} colorScheme="green" borderRadius="full">
                {activeCount} 活动
              </Badge>
            )}
          </Flex>

          <Flex>
            {completedCount > 0 && (
              <Tooltip label={showCompleted ? "隐藏已完成" : "显示已完成"}>
                <IconButton
                  aria-label="Toggle completed"
                  icon={<FaCheck />}
                  size="sm"
                  variant="ghost"
                  colorScheme={showCompleted ? "green" : "gray"}
                  onClick={() => setShowCompleted(!showCompleted)}
                  mr={1}
                />
              </Tooltip>
            )}
            {transfers.length > 0 && (
              <IconButton
                aria-label="Collapse"
                icon={isExpanded ? <FaChevronDown /> : <FaChevronUp />}
                size="sm"
                variant="ghost"
                onClick={() => setIsExpanded(!isExpanded)}
              />
            )}
          </Flex>
        </Flex>

        {/* 内容区 */}
        <Collapse in={isExpanded} animateOpacity>
          <Box
            p={3}
            maxHeight={transfers.length > 4 ? "400px" : "auto"}
            overflowY={transfers.length > 4 ? "auto" : "visible"}
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
