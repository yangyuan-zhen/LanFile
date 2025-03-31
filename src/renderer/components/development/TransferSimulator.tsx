import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Flex,
  Select,
  Text,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Input,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from "@chakra-ui/react";
import { useGlobalPeerJS } from "../../contexts/PeerJSContext";
import { v4 as uuidv4 } from "uuid";

/**
 * 传输模拟器组件 - 用于开发过程中测试文件传输UI
 */
const TransferSimulator: React.FC = () => {
  const peerContext = useGlobalPeerJS();
  const [fileName, setFileName] = useState("测试文件.mp4");
  const [fileSize, setFileSize] = useState(1024 * 1024 * 100); // 100MB
  const [manualProgress, setManualProgress] = useState(0);
  const [direction, setDirection] = useState<"upload" | "download">("download");
  const [duration, setDuration] = useState(10); // 传输持续时间（秒）
  const [autoTransfers, setAutoTransfers] = useState<string[]>([]);
  const [speed, setSpeed] = useState(1024 * 1024 * 2); // 2MB/s

  const startManualTransfer = () => {
    const id = `dev-transfer-${uuidv4().slice(0, 8)}`;
    if (peerContext?.setTransfers) {
      peerContext.setTransfers((prev) => [
        ...prev,
        {
          id,
          name: fileName,
          size: fileSize,
          type: fileName.endsWith(".mp4")
            ? "video/mp4"
            : "application/octet-stream",
          progress: manualProgress,
          status: manualProgress >= 100 ? "completed" : "transferring",
          direction,
          peerId: "dev-peer-id",
          deviceName: "测试设备",
          speed: speed,
          timeRemaining: ((100 - manualProgress) / 100) * (fileSize / speed),
        },
      ]);
    }
  };

  const updateManualTransfer = (value: number) => {
    setManualProgress(value);
    if (peerContext?.setTransfers && peerContext.transfers) {
      peerContext.setTransfers((prev) =>
        prev.map((t) => {
          if (t.id.startsWith("dev-transfer-")) {
            return {
              ...t,
              progress: value,
              status: value >= 100 ? "completed" : "transferring",
              timeRemaining: ((100 - value) / 100) * (t.size / speed),
            };
          }
          return t;
        })
      );
    }
  };

  const startAutoTransfer = () => {
    const id = `auto-transfer-${uuidv4().slice(0, 8)}`;
    setAutoTransfers((prev) => [...prev, id]);

    if (peerContext?.setTransfers) {
      peerContext.setTransfers((prev) => [
        ...prev,
        {
          id,
          name: `自动${direction === "upload" ? "上传" : "下载"} - ${fileName}`,
          size: fileSize,
          type: fileName.endsWith(".mp4")
            ? "video/mp4"
            : "application/octet-stream",
          progress: 0,
          status: "transferring",
          direction,
          peerId: "dev-peer-id",
          deviceName: "测试设备",
          speed: speed,
          timeRemaining: fileSize / speed,
        },
      ]);

      // 自动更新进度
      const startTime = Date.now();
      const endTime = startTime + duration * 1000;

      const intervalId = setInterval(() => {
        const now = Date.now();
        const elapsed = now - startTime;
        const totalDuration = duration * 1000;

        // 计算当前进度
        let progress = Math.min(
          100,
          Math.round((elapsed / totalDuration) * 100)
        );

        if (now >= endTime) {
          progress = 100;
          clearInterval(intervalId);
          setAutoTransfers((prev) =>
            prev.filter((transferId) => transferId !== id)
          );
        }

        peerContext.setTransfers((prev) =>
          prev.map((t) => {
            if (t.id === id) {
              return {
                ...t,
                progress,
                status: progress >= 100 ? "completed" : "transferring",
                speed: speed,
                timeRemaining: ((100 - progress) / 100) * (fileSize / speed),
              };
            }
            return t;
          })
        );
      }, 100); // 每100ms更新一次
    }
  };

  const clearAllTransfers = () => {
    if (peerContext?.setTransfers) {
      peerContext.setTransfers([]);
      setAutoTransfers([]);
    }
  };

  // 生成批量测试传输
  const generateBatchTransfers = () => {
    const fileTypes = [
      { ext: ".mp4", type: "video/mp4" },
      { ext: ".jpg", type: "image/jpeg" },
      { ext: ".pdf", type: "application/pdf" },
      {
        ext: ".docx",
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
    ];

    const sizes = [1024 * 1024 * 10, 1024 * 1024 * 50, 1024 * 1024 * 200];

    if (peerContext?.setTransfers) {
      const newTransfers = Array(4)
        .fill(0)
        .map((_, idx) => {
          const fileType = fileTypes[idx % fileTypes.length];
          const size = sizes[idx % sizes.length];
          const direction = idx % 2 === 0 ? "download" : "upload";
          const id = `batch-transfer-${uuidv4().slice(0, 8)}`;

          return {
            id,
            name: `测试文件${idx + 1}${fileType.ext}`,
            size,
            type: fileType.type,
            progress: Math.random() * 100,
            status: "transferring" as const,
            direction: direction as "upload" | "download",
            peerId: `dev-peer-${idx}`,
            deviceName: `测试设备 ${idx + 1}`,
            speed: (1 + Math.random() * 5) * 1024 * 1024, // 1-6MB/s
            timeRemaining: Math.random() * 60, // 0-60s
          };
        });

      peerContext.setTransfers((prev) => [...prev, ...newTransfers]);
    }
  };

  return (
    <Box
      bg="white"
      p={4}
      borderRadius="md"
      boxShadow="md"
      maxW="600px"
      mx="auto"
      mb={10}
    >
      <Text fontWeight="bold" fontSize="lg" mb={4}>
        传输模拟器 (开发测试工具)
      </Text>

      <VStack spacing={4} align="stretch">
        <FormControl>
          <FormLabel>文件名称</FormLabel>
          <Input
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="输入文件名"
          />
        </FormControl>

        <FormControl>
          <FormLabel>文件大小 (MB)</FormLabel>
          <NumberInput
            value={fileSize / (1024 * 1024)}
            onChange={(_, value) => setFileSize(value * 1024 * 1024)}
            min={1}
            max={1000}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </FormControl>

        <FormControl>
          <FormLabel>传输方向</FormLabel>
          <Select
            value={direction}
            onChange={(e) =>
              setDirection(e.target.value as "upload" | "download")
            }
          >
            <option value="download">下载</option>
            <option value="upload">上传</option>
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel>传输速度 (MB/s)</FormLabel>
          <NumberInput
            value={speed / (1024 * 1024)}
            onChange={(_, value) => setSpeed(value * 1024 * 1024)}
            min={0.1}
            max={20}
            step={0.1}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </FormControl>

        <Box>
          <Text mb={2}>手动进度控制 ({manualProgress}%)</Text>
          <Slider
            value={manualProgress}
            onChange={updateManualTransfer}
            min={0}
            max={100}
            step={1}
          >
            <SliderTrack>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb />
          </Slider>
        </Box>

        <Button onClick={startManualTransfer} colorScheme="blue">
          创建手动控制传输
        </Button>

        <FormControl>
          <FormLabel>自动传输持续时间 (秒)</FormLabel>
          <NumberInput
            value={duration}
            onChange={(_, value) => setDuration(value)}
            min={1}
            max={60}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </FormControl>

        <Button onClick={startAutoTransfer} colorScheme="green">
          创建自动传输 ({duration}秒)
        </Button>

        <Button onClick={generateBatchTransfers} colorScheme="purple">
          生成批量测试传输
        </Button>

        <Button onClick={clearAllTransfers} colorScheme="red">
          清除所有传输
        </Button>
      </VStack>
    </Box>
  );
};

export default TransferSimulator;
