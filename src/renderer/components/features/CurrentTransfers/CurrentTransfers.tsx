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
} from "@chakra-ui/react";
import {
  FaUpload,
  FaDownload,
  FaCheck,
  FaTimes,
  FaExclamationTriangle,
} from "react-icons/fa";

export const CurrentTransfers: React.FC = () => {
  const { transfers } = usePeerJS();

  if (!transfers || transfers.length === 0) {
    return null;
  }

  // 辅助函数，格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024)
      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
  };

  // 显示每个正在进行的文件传输
  return (
    <Box
      position="fixed"
      bottom="20px"
      right="20px"
      width="350px"
      zIndex={1000}
    >
      <Card p={4} boxShadow="lg" bg="white" borderRadius="md">
        <Text fontWeight="bold" mb={3}>
          文件传输
        </Text>
        {transfers.map((transfer) => (
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
              value={transfer.progress}
              size="sm"
              colorScheme={
                transfer.status === "error"
                  ? "red"
                  : transfer.status === "completed"
                  ? "green"
                  : "blue"
              }
              borderRadius="full"
            />

            <Flex justify="space-between" mt={1}>
              <Text fontSize="xs" color="gray.500">
                {transfer.status === "completed"
                  ? "已完成"
                  : transfer.status === "error"
                  ? "出错"
                  : `${transfer.progress}%`}
              </Text>
              <Text fontSize="xs" color="gray.500">
                {transfer.direction === "upload" ? "上传中" : "下载中"}
              </Text>
            </Flex>
          </Box>
        ))}
      </Card>
    </Box>
  );
};

export default CurrentTransfers;
