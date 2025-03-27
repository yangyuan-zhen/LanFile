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

  // 在渲染传输项的部分添加进度条
  const renderTransferItem = (transfer: FileTransfer) => (
    <div className="flex items-center p-2 border-b">
      <div className="flex-1">
        <p className="font-medium">{transfer.name}</p>
        <p className="text-sm text-gray-500">
          {transfer.direction === "upload" ? "发送至" : "接收自"}:{" "}
          {transfer.peerId}
        </p>

        {/* 添加进度条 */}
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
          <div
            className={`h-2.5 rounded-full ${
              transfer.status === "error"
                ? "bg-red-500"
                : transfer.status === "completed"
                ? "bg-green-500"
                : "bg-blue-500"
            }`}
            style={{ width: `${transfer.progress}%` }}
          ></div>
        </div>

        {/* 添加状态和速度信息 */}
        <div className="flex justify-between mt-1 text-xs">
          <span>{getStatusText(transfer.status)}</span>
          <span>
            {formatSize(transfer.size * (transfer.progress / 100))}/
            {formatSize(transfer.size)}
          </span>
          {transfer.speed && <span>{formatSpeed(transfer.speed)}</span>}
        </div>
      </div>
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
                  aria-label="切换显示已完成"
                  icon={<FaCheck />}
                  size="sm"
                  variant="ghost"
                  colorScheme={showCompleted ? "green" : "gray"}
                  mr={1}
                  onClick={() => setShowCompleted(!showCompleted)}
                />
              </Tooltip>
            )}
            {transfers.length > 0 && (
              <IconButton
                aria-label={isExpanded ? "折叠" : "展开"}
                icon={isExpanded ? <FaChevronUp /> : <FaChevronDown />}
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
              filteredTransfers.map((transfer, index) => (
                <Box
                  key={transfer.id}
                  mb={index < filteredTransfers.length - 1 ? 3 : 0}
                  p={3}
                  borderWidth="1px"
                  borderRadius="md"
                  bg={transfer.status === "transferring" ? "blue.50" : "white"}
                >
                  <Flex justify="space-between" align="center" mb={2}>
                    <Flex align="center" maxWidth="240px">
                      <Icon
                        as={
                          transfer.direction === "upload"
                            ? FaUpload
                            : FaDownload
                        }
                        mr={2}
                        color={
                          transfer.direction === "upload"
                            ? "blue.500"
                            : "green.500"
                        }
                      />
                      <Text fontWeight="medium" isTruncated>
                        {transfer.name}
                      </Text>
                    </Flex>
                    <Flex>
                      {transfer.status === "completed" && (
                        <Icon as={FaCheck} color="green.500" />
                      )}
                      {transfer.status === "error" && (
                        <Tooltip label="传输失败">
                          <Icon as={FaExclamationTriangle} color="red.500" />
                        </Tooltip>
                      )}
                    </Flex>
                  </Flex>

                  <Text fontSize="sm" color="gray.600" mb={1}>
                    {formatFileSize(transfer.size)}
                    {transfer.direction === "upload" ? " → " : " ← "}
                    {transfer.peerId}
                  </Text>

                  <Progress
                    size="sm"
                    value={transfer.progress}
                    colorScheme={
                      transfer.status === "error"
                        ? "red"
                        : transfer.status === "completed"
                        ? "green"
                        : "blue"
                    }
                    mt={1}
                    borderRadius="full"
                  />

                  <Flex justify="space-between" mt={1}>
                    <Text fontSize="xs" color="gray.500">
                      {transfer.status === "completed"
                        ? "已完成"
                        : transfer.status === "error"
                        ? "传输失败"
                        : `${transfer.progress}%`}
                    </Text>
                    {transfer.status === "transferring" && (
                      <Flex>
                        {transfer.speed && (
                          <Text fontSize="xs" color="blue.500" mr={2}>
                            {formatSpeed(transfer.speed)}
                          </Text>
                        )}
                        <Text fontSize="xs" color="gray.500">
                          {transfer.direction === "upload"
                            ? "上传中"
                            : "下载中"}
                        </Text>
                      </Flex>
                    )}
                  </Flex>

                  {transfer.status === "completed" &&
                    transfer.direction === "download" &&
                    transfer.savedPath && (
                      <Flex mt={2} justify="flex-end">
                        <Tooltip label="在文件夹中显示">
                          <IconButton
                            aria-label="在文件夹中显示"
                            icon={<FaFolder />}
                            size="sm"
                            mr={2}
                            onClick={() =>
                              openFileLocation(transfer.savedPath as string)
                            }
                          />
                        </Tooltip>
                        <Tooltip label="打开文件">
                          <IconButton
                            aria-label="打开文件"
                            icon={<FaFile />}
                            size="sm"
                            onClick={() =>
                              openFile(transfer.savedPath as string)
                            }
                          />
                        </Tooltip>
                      </Flex>
                    )}
                </Box>
              ))
            )}
          </Box>
        </Collapse>
      </Card>
    </Box>
  );
};

export default CurrentTransfers;
