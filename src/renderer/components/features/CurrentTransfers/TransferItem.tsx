import React from "react";
import { Text, Progress, Icon, Button, Box, Flex } from "@chakra-ui/react";
import { FaUpload, FaDownload, FaFolder, FaFile } from "react-icons/fa";
import type { FileTransfer } from "../../../hooks/usePeerJS";

interface TransferItemProps {
  transfer: FileTransfer;
  formatSize: (bytes: number) => string;
  formatSpeed: (bytesPerSecond?: number) => string;
  getStatusText: (status: FileTransfer["status"]) => string;
  openFileLocation: (path: string) => void;
  openFile: (path: string) => void;
}

export const TransferItem: React.FC<TransferItemProps> = ({
  transfer,
  formatSize,
  formatSpeed,
  getStatusText,
  openFileLocation,
  openFile,
}) => {
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
            <Text fontWeight="medium">{transfer.name}</Text>
            <Text fontSize="sm" color="gray.500">
              {transfer.direction === "upload" ? "发送至" : "接收自"}:{" "}
              {transfer.peerId}
            </Text>
          </Box>
        </Flex>
        <Box textAlign="right">
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
        </Box>
      </Flex>

      <Box pt={1}>
        <Flex justify="space-between" align="center" mb={1}>
          <Text
            fontSize="xs"
            fontWeight="semibold"
            color={
              transfer.status === "error"
                ? "red.500"
                : transfer.status === "completed"
                ? "green.500"
                : "blue.500"
            }
          >
            {transfer.progress}%
          </Text>
          <Text fontSize="xs" fontWeight="semibold" color="gray.600">
            {formatSize(transfer.size * (transfer.progress / 100))}/
            {formatSize(transfer.size)}
          </Text>
        </Flex>

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
