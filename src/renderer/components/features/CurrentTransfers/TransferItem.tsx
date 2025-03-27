import React, { useMemo } from "react";
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

interface TransferItemProps {
  transfer: FileTransfer;
  formatSize: (bytes: number) => string;
  formatSpeed: (bytesPerSecond?: number) => string;
  formatTimeRemaining: (seconds?: number) => string;
  getStatusText: (status: FileTransfer["status"]) => string;
  openFileLocation: (path: string) => void;
  openFile: (path: string) => void;
}

export const TransferItem: React.FC<TransferItemProps> = ({
  transfer,
  formatSize,
  formatSpeed,
  formatTimeRemaining,
  getStatusText,
  openFileLocation,
  openFile,
}) => {
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
        />
      </Box>

      {transfer.status === "completed" && transfer.savedPath && (
        <Flex mt={3} gap={2}>
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
        </Flex>
      )}
    </Box>
  );
};

export default TransferItem;
