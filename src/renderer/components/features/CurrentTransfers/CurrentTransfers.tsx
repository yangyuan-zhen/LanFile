import React from "react";
import { usePeerJS } from "../../../hooks/usePeerJS";
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
} from "react-icons/fa";

export const CurrentTransfers: React.FC = () => {
  const { transfers } = usePeerJS();

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

  // 打开文件位置
  const openFileLocation = (path: string) => {
    window.electron.invoke("file:openFolder", path);
  };

  // 打开文件
  const openFile = (path: string) => {
    window.electron.invoke("file:openFile", path);
  };

  // 临时调试用
  return (
    <Box
      position="fixed"
      bottom="50px"
      right="50px"
      width="400px"
      zIndex={9999}
      bg="red.100" // 明显的背景色
      p={4}
      border="2px solid red"
    >
      <Text fontSize="lg" fontWeight="bold">
        文件传输 ({transfers?.length || 0})
      </Text>
      <Card p={4} boxShadow="lg" bg="white" borderRadius="md">
        <Text fontWeight="bold" mb={3}>
          文件传输
        </Text>

        {!transfers || transfers.length === 0 ? (
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
          transfers.map((transfer) => (
            <Box
              key={transfer.id}
              mb={3}
              p={3}
              borderWidth="1px"
              borderRadius="md"
            >
              <Flex justify="space-between" align="center" mb={2}>
                <Flex align="center">
                  <Icon
                    as={transfer.direction === "upload" ? FaUpload : FaDownload}
                    mr={2}
                    color={
                      transfer.direction === "upload" ? "blue.500" : "green.500"
                    }
                  />
                  <Text fontWeight="medium" isTruncated maxWidth="200px">
                    {transfer.name}
                  </Text>
                </Flex>
                <Flex>
                  {transfer.status === "completed" && (
                    <Tooltip label="传输完成">
                      <Icon as={FaCheck} color="green.500" />
                    </Tooltip>
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
                <Text fontSize="xs" color="gray.500">
                  {transfer.direction === "upload" ? "上传中" : "下载中"}
                </Text>
              </Flex>

              {/* 为完成的下载添加文件操作按钮 */}
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
                        onClick={() => openFile(transfer.savedPath as string)}
                      />
                    </Tooltip>
                  </Flex>
                )}
            </Box>
          ))
        )}
      </Card>
    </Box>
  );
};

export default CurrentTransfers;
