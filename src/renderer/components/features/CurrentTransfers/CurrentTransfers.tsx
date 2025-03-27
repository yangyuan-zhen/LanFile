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
  FaInbox,
} from "react-icons/fa";

export const CurrentTransfers: React.FC = () => {
  const { transfers } = usePeerJS();

  // 辅助函数，格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024)
      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
  };

  // 始终显示传输面板，即使没有传输任务
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

              {(transfer.status === "pending" ||
                transfer.status === "transferring") && (
                <Progress
                  size="sm"
                  value={transfer.progress}
                  colorScheme="blue"
                  mt={1}
                  borderRadius="full"
                />
              )}
            </Box>
          ))
        )}
      </Card>
    </Box>
  );
};

export default CurrentTransfers;
