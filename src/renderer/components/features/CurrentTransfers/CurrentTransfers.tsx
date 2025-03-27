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
  const { transfers } = useGlobalPeerJS();

  // 每次渲染时打印收到的 transfers
  console.log(
    "[CurrentTransfers] Component Rendering. Received transfers:",
    transfers
  );

  // 使用 useEffect 监控 transfers 的变化
  useEffect(() => {
    console.log(
      "[CurrentTransfers] useEffect triggered due to transfers change:",
      transfers
    );
    // 可以保留定时器检查，看看组件内部状态是否最终会更新
    const timer = setInterval(() => {
      console.log(
        "[CurrentTransfers] Interval Check. Current transfers state inside component:",
        transfers
      );
    }, 3000);

    return () => clearInterval(timer);
  }, [transfers]); // 依赖数组包含 transfers

  // --- 临时的简化渲染 ---
  return (
    <Box
      position="fixed"
      bottom="20px"
      right="20px"
      width="350px"
      zIndex={9999}
      borderRadius="md"
      boxShadow="xl"
      bg="white"
      border="1px solid"
      borderColor="gray.200" // 使用灰色边框以便区分
      p={4} // 添加一些内边距
    >
      <Text fontWeight="bold" mb={2}>
        文件传输 (调试模式)
      </Text>
      <Text fontSize="sm" mb={1}>
        从 Context 获取到的 Transfers 数量: {transfers?.length ?? "N/A"}
      </Text>
      <Box
        maxHeight="300px"
        overflowY="auto"
        bg="gray.50"
        p={2}
        borderRadius="sm"
      >
        <pre
          style={{
            fontSize: "10px",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}
        >
          {JSON.stringify(transfers, null, 2)}
        </pre>
      </Box>
    </Box>
  );
  // --- 结束临时渲染 ---

  /*
  // --- 原来的渲染逻辑暂时注释掉 ---

  // const [isExpanded, setIsExpanded] = useState(true);
  // const [showCompleted, setShowCompleted] = useState(true);

  // const filteredTransfers = transfers
  //   .filter((t) => showCompleted || t.status !== "completed")
  //   // ... sort logic ...

  // const activeCount = transfers.filter(t => t.status === 'transferring').length;
  // const completedCount = transfers.filter(t => t.status === 'completed').length;

  // ... helper functions (formatFileSize, formatSpeed, etc.) ...

  // const renderTransferItem = (transfer: FileTransfer) => ( ... );

  // return (
  //   <Box ... >
  //     <Card ... >
  //       <Flex ... > // Header
  //         ...
  //       </Flex>
  //       <Collapse in={isExpanded} animateOpacity>
  //         <Box ... > // Content
  //           {filteredTransfers.length === 0 ? (
  //             <Flex ... >No transfers</Flex>
  //           ) : (
  //             filteredTransfers.map(renderTransferItem)
  //           )}
  //         </Box>
  //       </Collapse>
  //     </Card>
  //   </Box>
  // );

  // --- 结束原来的渲染逻辑 ---
  */
};

export default CurrentTransfers;
